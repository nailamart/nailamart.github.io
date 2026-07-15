class Database {
  static #supabase = null
  static #useLocalFallback = false
  static #localData = { products: [], transactions: [], transaction_items: [] }

  static async init() {
    if (typeof supabase === 'undefined') {
      this.#useLocalFallback = true
      this.#loadLocalData()
      console.log('Supabase not available, using localStorage fallback')
      return
    }
    try {
      this.#supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
      const { error } = await this.#supabase.from('products').select('id').limit(1)
      if (error) throw error
    } catch (e) {
      this.#useLocalFallback = true
      this.#loadLocalData()
      console.log('Supabase connection failed, using localStorage fallback:', e.message)
    }
  }

  static #loadLocalData() {
    try {
      const p = localStorage.getItem('nm_products')
      const t = localStorage.getItem('nm_transactions')
      const ti = localStorage.getItem('nm_transaction_items')
      if (p) this.#localData.products = JSON.parse(p)
      if (t) this.#localData.transactions = JSON.parse(t)
      if (ti) this.#localData.transaction_items = JSON.parse(ti)
    } catch { /* ignore */ }
  }

  static #saveLocalData() {
    localStorage.setItem('nm_products', JSON.stringify(this.#localData.products))
    localStorage.setItem('nm_transactions', JSON.stringify(this.#localData.transactions))
    localStorage.setItem('nm_transaction_items', JSON.stringify(this.#localData.transaction_items))
  }

  static #getClient() {
    if (this.#useLocalFallback) return null
    return this.#supabase
  }

  // Products
  static async getProducts(search = '') {
    const client = this.#getClient()
    if (!client) {
      let data = this.#localData.products
      if (search) {
        const s = search.toLowerCase()
        data = data.filter(p => p.barcode?.toLowerCase().includes(s) || p.product_name?.toLowerCase().includes(s))
      }
      return { data, error: null }
    }
    let query = client.from('products').select('*').order('created_at', { ascending: false })
    if (search) query = query.or(`barcode.ilike.%${search}%,product_name.ilike.%${search}%`)
    return await query
  }

  static async getProductByBarcode(barcode) {
    const client = this.#getClient()
    if (!client) {
      const data = this.#localData.products.find(p => p.barcode === barcode) || null
      return { data, error: null }
    }
    return await client.from('products').select('*').eq('barcode', barcode).maybeSingle()
  }

  static async upsertProduct(product) {
    const client = this.#getClient()
    if (!client) {
      const idx = this.#localData.products.findIndex(p => p.barcode === product.barcode)
      const now = new Date().toISOString()
      if (idx >= 0) {
        const existing = this.#localData.products[idx]
        this.#localData.products[idx] = {
          ...existing, stock: (existing.stock || 0) + (product.stock || 0),
          purchase_price: product.purchase_price ?? existing.purchase_price,
          selling_price: product.selling_price ?? existing.selling_price,
          updated_at: now,
        }
      } else {
        this.#localData.products.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          barcode: product.barcode, product_name: product.product_name,
          stock: product.stock || 0, purchase_price: product.purchase_price || 0,
          selling_price: product.selling_price || 0,
          created_at: now, updated_at: now,
        })
      }
      this.#saveLocalData()
      return { data: this.#localData.products[idx >= 0 ? idx : this.#localData.products.length - 1], error: null }
    }
    const { barcode, product_name, stock, purchase_price, selling_price } = product
    const { data: existing } = await client.from('products').select('*').eq('barcode', barcode).maybeSingle()
    if (existing) {
      return await client.from('products').update({
        stock: existing.stock + (stock || 0),
        purchase_price: purchase_price ?? existing.purchase_price,
        selling_price: selling_price ?? existing.selling_price,
        updated_at: new Date(),
      }).eq('barcode', barcode).select().single()
    }
    return await client.from('products').insert({
      barcode, product_name, stock: stock || 0,
      purchase_price: purchase_price || 0, selling_price: selling_price || 0,
    }).select().single()
  }

  static async updateProductStock(id, newStock) {
    const client = this.#getClient()
    if (!client) {
      const p = this.#localData.products.find(p => p.id === id)
      if (p) { p.stock = newStock; p.updated_at = new Date().toISOString(); this.#saveLocalData() }
      return { data: p, error: null }
    }
    return await client.from('products').update({ stock: newStock, updated_at: new Date() }).eq('id', id).select().single()
  }

  // Transactions
  static async createTransaction(type, totalAmount, description, items) {
    const client = this.#getClient()
    if (!client) {
      const tx = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        type, total_amount: totalAmount, description: description || '',
        created_at: new Date().toISOString(),
      }
      this.#localData.transactions.push(tx)
      for (const item of items) {
        this.#localData.transaction_items.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          transaction_id: tx.id, product_id: item.product_id,
          quantity: item.quantity, price_per_unit: item.price_per_unit,
          subtotal: item.subtotal,
        })
        if (item.product_id) {
          const prod = this.#localData.products.find(p => p.id === item.product_id)
          if (prod) {
            if (type === 'pemasukan') prod.stock = (prod.stock || 0) - item.quantity
            prod.updated_at = new Date().toISOString()
          }
        }
      }
      this.#saveLocalData()
      return { data: tx, error: null }
    }

    const { data: tx, error: txErr } = await client.from('transactions').insert({
      type, total_amount: totalAmount, description: description || '',
    }).select().single()
    if (txErr) return { data: null, error: txErr }

    for (const item of items) {
      const { error: itemErr } = await client.from('transaction_items').insert({
        transaction_id: tx.id, product_id: item.product_id,
        quantity: item.quantity, price_per_unit: item.price_per_unit,
        subtotal: item.subtotal,
      })
      if (itemErr) return { data: null, error: itemErr }
      if (type === 'pemasukan' && item.product_id) {
        const { data: prod } = await client.from('products').select('stock').eq('id', item.product_id).single()
        if (prod) {
          await client.from('products').update({
            stock: prod.stock - item.quantity, updated_at: new Date(),
          }).eq('id', item.product_id)
        }
      }
    }
    return { data: tx, error: null }
  }

  static async deleteTransaction(id) {
    const client = this.#getClient()
    if (!client) {
      const items = this.#localData.transaction_items.filter(i => i.transaction_id === id)
      for (const item of items) {
        const prod = this.#localData.products.find(p => p.id === item.product_id)
        if (prod) {
          prod.stock = (prod.stock || 0) + item.quantity
          prod.updated_at = new Date().toISOString()
        }
      }
      this.#localData.transaction_items = this.#localData.transaction_items.filter(i => i.transaction_id !== id)
      this.#localData.transactions = this.#localData.transactions.filter(t => t.id !== id)
      this.#saveLocalData()
      return { data: true, error: null }
    }
    const { data: items } = await client.from('transaction_items').select('*').eq('transaction_id', id)
    for (const item of items || []) {
      const { data: prod } = await client.from('products').select('stock').eq('id', item.product_id).single()
      if (prod) {
        await client.from('products').update({
          stock: prod.stock + item.quantity, updated_at: new Date(),
        }).eq('id', item.product_id)
      }
    }
    await client.from('transaction_items').delete().eq('transaction_id', id)
    const { error } = await client.from('transactions').delete().eq('id', id)
    return { data: !error, error }
  }

  static async getTransactions(type = null, startDate = null, endDate = null) {
    const client = this.#getClient()
    if (!client) {
      let data = [...this.#localData.transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      if (type) data = data.filter(t => t.type === type)
      if (startDate) data = data.filter(t => new Date(t.created_at) >= new Date(startDate))
      if (endDate) data = data.filter(t => new Date(t.created_at) <= new Date(endDate + 'T23:59:59'))
      data = data.map(t => ({
        ...t,
        transaction_items: (t.transaction_items || []).map(item => {
          const prod = this.#localData.products.find(p => p.id === item.product_id)
          return { ...item, products: prod || null }
        }),
      }))
      return { data, error: null }
    }
    let query = client.from('transactions').select('*, transaction_items(*, products(*))').order('created_at', { ascending: false })
    if (type) query = query.eq('type', type)
    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate + 'T23:59:59')
    return await query
  }

  static async getTransactionItems(transactionId) {
    const client = this.#getClient()
    if (!client) {
      const items = this.#localData.transaction_items.filter(i => i.transaction_id === transactionId)
      const data = items.map(item => {
        const prod = this.#localData.products.find(p => p.id === item.product_id)
        return { ...item, products: prod || null, product_name: prod?.product_name || null, barcode: prod?.barcode || null }
      })
      return { data, error: null }
    }
    return await client.from('transaction_items').select('*, products(*)').eq('transaction_id', transactionId)
  }

  // Dashboard
  static async getDashboardStats(startDate = null, endDate = null) {
    const { data: txns } = await this.getTransactions(null, startDate, endDate)
    const income = (txns || []).filter(t => t.type === 'pemasukan').reduce((s, t) => s + Number(t.total_amount || 0), 0)
    const expense = (txns || []).filter(t => t.type === 'pengeluaran').reduce((s, t) => s + Number(t.total_amount || 0), 0)

    let hpp = 0
    const saleTxns = (txns || []).filter(t => t.type === 'pemasukan')
    for (const t of saleTxns) {
      const items = t.transaction_items || []
      for (const item of items) {
        const purchasePrice = item.products?.purchase_price || item.purchase_price || 0
        hpp += (item.quantity || 0) * Number(purchasePrice)
      }
      if (!items.length) {
        const { data: fetched } = await this.getTransactionItems(t.id)
        for (const item of fetched || []) {
          const pp = item.products?.purchase_price || item.purchase_price || 0
          hpp += (item.quantity || 0) * Number(pp)
        }
      }
    }

    const { data: products } = await this.getProducts()
    const totalProducts = (products || []).length
    const lowStock = (products || []).filter(p => (p.stock || 0) <= 5).length
    const totalModal = (products || []).reduce((s, p) => s + (Number(p.purchase_price || 0) * Number(p.stock || 0)), 0)
    return {
      income, expense, hpp, totalModal,
      grossProfit: income - hpp,
      netProfit: income - hpp,
      totalProducts, lowStock,
      transactions: txns || [],
    }
  }
}
