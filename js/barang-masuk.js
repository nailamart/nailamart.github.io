class BarangMasuk {
  static #container = null
  static #scanner = null
  static #scanning = false
  static #currentProduct = null
  static #editingTransactionId = null

  static init(container = null) {
    this.#container = container
    this.#render()
    this.#bindEvents()
  }

  static #render() {
    const section = this.#container || document.getElementById('page-barang-masuk')
    section.innerHTML = `
      <div class="mb-4 md:mb-6">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800">Barang Masuk</h1>
        <p class="text-slate-500 mt-1 text-sm md:text-base">Scan barcode untuk mencatat stok barang baru atau restock</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3 md:mb-4">
            <h2 class="text-base md:text-lg font-semibold text-slate-700">Scan Barcode</h2>
            <button id="toggle-scanner" class="px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition active:scale-95 ${
              this.#scanning ? 'bg-rose-500 text-white' : 'bg-slate-800 text-white'
            }">${this.#scanning ? 'Stop' : 'Scan'}</button>
          </div>
          <div id="scanner-container" class="scanner-container ${this.#scanning ? '' : 'hidden'}">
            <div id="scanner-view" class="bg-black rounded-lg overflow-hidden"></div>
          </div>
          <div class="mt-3 md:mt-4">
            <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Atau masukkan barcode manual</label>
            <div class="flex gap-2">
              <input type="text" id="manual-barcode" class="flex-1 px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm" placeholder="Ketik barcode..." autocomplete="off">
              <button id="btn-cari-barcode" class="px-4 md:px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-medium text-sm active:scale-95">Input</button>
            </div>
          </div>
        </div>
        <div id="form-product-card" class="stat-card hidden">
          <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Form Produk</h2>
          <div id="form-product-area"></div>
        </div>
      </div>
      <div class="mt-4 md:mt-6">
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3 md:mb-4">
            <h2 class="text-base md:text-lg font-semibold text-slate-700">Riwayat Barang Masuk</h2>
          </div>
          <div id="riwayat-barang-masuk">
            <div class="mb-3">
              <input type="text" id="riwayat-search" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm" placeholder="Cari barang atau barcode...">
            </div>
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-b border-slate-200 text-slate-500">
                  <th class="text-left py-3 px-2">Waktu</th>
                  <th class="text-left py-3 px-2">Barcode</th>
                  <th class="text-left py-3 px-2">Barang</th>
                  <th class="text-right py-3 px-2">Stok</th>
                  <th class="text-right py-3 px-2">Harga Modal</th>
                  <th class="text-right py-3 px-2">Harga Jual</th>
                  <th class="text-right py-3 px-2">Total</th>
                  <th class="text-center py-3 px-2 w-20">Aksi</th>
                </tr></thead>
                <tbody id="riwayat-table-body"></tbody>
              </table>
            </div>
            <div class="md:hidden space-y-2" id="riwayat-mobile-list"></div>
          </div>
        </div>
      </div>
    `
  }

  static #bindEvents() {
    document.getElementById('toggle-scanner')?.addEventListener('click', () => this.#toggleScanner())
    document.getElementById('btn-cari-barcode')?.addEventListener('click', () => {
      const bc = document.getElementById('manual-barcode').value.trim()
      if (bc) this.#lookupBarcode(bc)
    })
    document.getElementById('manual-barcode')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const bc = e.target.value.trim()
        if (bc) this.#lookupBarcode(bc)
      }
    })
    document.getElementById('riwayat-search')?.addEventListener('input', () => this.#loadRiwayat())
    this.#loadRiwayat()
  }

  static async #toggleScanner() {
    this.#scanning = !this.#scanning
    const btn = document.getElementById('toggle-scanner')
    const container = document.getElementById('scanner-container')
    if (this.#scanning) {
      container.classList.remove('hidden')
      btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-rose-500 text-white active:scale-95'
      btn.textContent = 'Stop'
      try {
        this.#scanner = new Html5Qrcode('scanner-view')
        await this.#scanner.start({ facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            this.#lookupBarcode(decodedText)
            this.#stopScanner()
          }
        )
      } catch (err) {
        alert('Tidak dapat mengakses kamera: ' + err.message)
        this.#scanning = false
        btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-800 text-white active:scale-95'
        btn.textContent = 'Scan'
        container.classList.add('hidden')
      }
    } else {
      this.#stopScanner()
      btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-800 text-white active:scale-95'
      btn.textContent = 'Scan'
      container.classList.add('hidden')
    }
  }

  static async #stopScanner() {
    if (this.#scanner) {
      try { await this.#scanner.stop() } catch {}
      try { this.#scanner.clear() } catch {}
      this.#scanner = null
    }
  }

  static async #lookupBarcode(barcode) {
    App.showLoading()
    const { data: product } = await Database.getProductByBarcode(barcode)
    App.hideLoading()
    this.#currentProduct = { barcode, existing: !!product, data: product || {} }
    this.#renderForm(product, barcode)
  }

  static #stockMode = 'tambah'

  static #renderForm(product, barcode) {
    const card = document.getElementById('form-product-card')
    const area = document.getElementById('form-product-area')
    if (!card || !area) return
    if (!barcode && !product) {
      card.classList.add('hidden')
      area.innerHTML = ''
      return
    }
    card.classList.remove('hidden')
    const isNew = !product
    const currentStock = product?.stock || 0
    this.#stockMode = 'tambah'
    area.innerHTML = `
      <div class="space-y-3 md:space-y-4">
        <div>
          <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Barcode</label>
          <input type="text" id="form-barcode" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 text-sm" value="${barcode}" readonly>
        </div>
        <div>
          <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Nama Barang</label>
          <input type="text" id="form-name" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm ${isNew ? '' : 'bg-slate-50 text-slate-500'}" value="${product?.product_name || ''}" ${isNew ? '' : 'readonly'}>
        </div>
        ${isNew ? `
        <div class="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Stok Awal</label>
            <input type="number" id="form-stock" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="1" value="1">
          </div>
          <div>
            <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Harga Beli (Rp)</label>
            <input type="number" id="form-buy-price" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="0" value="0">
          </div>
        </div>
        <div>
          <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Harga Jual (Rp)</label>
          <input type="number" id="form-sell-price" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="0" value="0">
        </div>
        ` : `
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-2 md:p-3">
          <div class="flex items-center justify-between">
            <span class="text-xs md:text-sm text-slate-600">Stok saat ini: <strong class="text-slate-800">${currentStock}</strong></span>
            <button id="btn-toggle-stock-mode" class="px-3 py-1 text-xs font-medium rounded-lg transition bg-slate-800 text-white active:scale-95">Edit Stok</button>
          </div>
          <div id="stock-mode-tambah" class="mt-2">
            <label class="block text-xs text-slate-500 mb-1">Jumlah tambahan stok</label>
            <input type="number" id="form-stock" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="1" value="1">
          </div>
          <div id="stock-mode-set" class="mt-2 hidden">
            <label class="block text-xs text-slate-500 mb-1">Set stok ke nilai</label>
            <input type="number" id="form-stock-set" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="0" value="${currentStock}">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Harga Modal Satuan (Rp)</label>
            <input type="number" id="form-buy-price" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="0" value="${product.purchase_price || 0}">
          </div>
          <div>
            <label class="block text-xs md:text-sm font-medium text-slate-600 mb-1">Harga Jual Satuan (Rp)</label>
            <input type="number" id="form-sell-price" class="w-full px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm" min="0" value="${product.selling_price || 0}">
          </div>
        </div>
        `}
        <div class="flex gap-3">
          <button id="btn-cancel-product" class="flex-1 py-3 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium text-sm md:text-base active:scale-[.98]">
            Batal
          </button>
          <button id="btn-save-product" class="flex-[2] py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-semibold text-sm md:text-base active:scale-[.98]">
            ${isNew ? 'Simpan Barang Baru' : this.#getSaveButtonLabel()}
          </button>
        </div>
      </div>
    `
    if (!isNew) {
      document.getElementById('btn-toggle-stock-mode')?.addEventListener('click', () => this.#toggleStockMode(currentStock))
    }
    document.getElementById('btn-save-product').addEventListener('click', () => this.#saveProduct())
    document.getElementById('btn-cancel-product')?.addEventListener('click', () => this.#cancelForm())
  }

  static #getSaveButtonLabel() {
    return this.#stockMode === 'tambah' ? 'Simpan Restock' : 'Simpan Set Stok'
  }

  static #toggleStockMode(currentStock) {
    const btn = document.getElementById('btn-toggle-stock-mode')
    const tambahDiv = document.getElementById('stock-mode-tambah')
    const setDiv = document.getElementById('stock-mode-set')
    const saveBtn = document.getElementById('btn-save-product')
    this.#stockMode = this.#stockMode === 'tambah' ? 'set' : 'tambah'
    if (this.#stockMode === 'set') {
      tambahDiv.classList.add('hidden')
      setDiv.classList.remove('hidden')
      btn.textContent = 'Tambah Stok'
      btn.className = 'px-3 py-1 text-xs font-medium rounded-lg transition bg-blue-500 text-white active:scale-95'
    } else {
      tambahDiv.classList.remove('hidden')
      setDiv.classList.add('hidden')
      btn.textContent = 'Edit Stok'
      btn.className = 'px-3 py-1 text-xs font-medium rounded-lg transition bg-slate-800 text-white active:scale-95'
    }
    if (saveBtn) saveBtn.textContent = this.#getSaveButtonLabel()
  }

  static async #saveProduct() {
    const barcode = document.getElementById('form-barcode').value.trim()
    const name = document.getElementById('form-name').value.trim()
    const isNew = !this.#currentProduct?.existing
    const buyPrice = parseFloat(document.getElementById('form-buy-price').value) || 0
    const sellPrice = parseFloat(document.getElementById('form-sell-price').value) || 0

    if (!barcode) return alert('Barcode tidak valid!')
    if (!name) return alert('Nama barang harus diisi!')

    App.showLoading()

    if (this.#editingTransactionId) {
      await Database.deleteTransaction(this.#editingTransactionId)
      this.#editingTransactionId = null
    }

    if (isNew) {
      const stock = parseInt(document.getElementById('form-stock').value) || 0
      if (stock < 1) { App.hideLoading(); return alert('Jumlah stok minimal 1!') }
      const { data, error } = await Database.upsertProduct({
        barcode, product_name: name, stock,
        purchase_price: buyPrice, selling_price: sellPrice,
      })
      if (error) { App.hideLoading(); return alert('Gagal menyimpan: ' + error.message) }
      const totalCost = stock * buyPrice
      await Database.createTransaction('pengeluaran', totalCost,
        `Barang baru: ${name} (${stock} x Rp ${buyPrice.toLocaleString()})`,
        [{ product_id: data.id, quantity: stock, price_per_unit: buyPrice, subtotal: totalCost }])
      App.hideLoading()
      alert(`Barang ${name} berhasil ditambahkan!`)
    } else if (this.#stockMode === 'set') {
      const desiredStock = parseInt(document.getElementById('form-stock-set').value) || 0
      const currentStock = this.#currentProduct?.data?.stock || 0
      const { data, error } = await Database.updateProductStock(this.#currentProduct.data.id, desiredStock)
      if (error) { App.hideLoading(); return alert('Gagal menyimpan: ' + error.message) }
      const selisih = desiredStock - currentStock
      const totalCost = Math.abs(selisih) * buyPrice
      await Database.createTransaction('pengeluaran', totalCost,
        `Set stok: ${name} (${currentStock} → ${desiredStock}, selisih ${selisih > 0 ? '+' : ''}${selisih})`,
        [{ product_id: data?.id || this.#currentProduct.data.id, quantity: Math.abs(selisih), price_per_unit: buyPrice, subtotal: totalCost }])
      App.hideLoading()
      alert(`Stok ${name} diubah dari ${currentStock} menjadi ${desiredStock}`)
    } else {
      const stock = parseInt(document.getElementById('form-stock').value) || 0
      if (stock < 1) { App.hideLoading(); return alert('Jumlah stok minimal 1!') }
      const { data, error } = await Database.upsertProduct({
        barcode, product_name: name, stock,
        purchase_price: buyPrice, selling_price: sellPrice,
      })
      if (error) { App.hideLoading(); return alert('Gagal menyimpan: ' + error.message) }
      const totalCost = stock * buyPrice
      await Database.createTransaction('pengeluaran', totalCost,
        `Restock: ${name} (${stock} x Rp ${buyPrice.toLocaleString()})`,
        [{ product_id: data.id, quantity: stock, price_per_unit: buyPrice, subtotal: totalCost }])
      App.hideLoading()
      alert(`Restock berhasil! Stok ${name} sekarang: ${data.stock}`)
    }

    this.#renderForm(null, '')
    document.getElementById('manual-barcode').value = ''
    this.#loadRiwayat()
  }

  static #cancelForm() {
    this.#currentProduct = null
    this.#editingTransactionId = null
    this.#renderForm(null, '')
    document.getElementById('manual-barcode').value = ''
    const card = document.getElementById('form-product-card')
    if (card) card.classList.add('hidden')
  }

  static async #loadRiwayat() {
    const { data: txns } = await Database.getTransactions('pengeluaran')
    const tbody = document.getElementById('riwayat-table-body')
    const mobileList = document.getElementById('riwayat-mobile-list')
    if (!tbody || !mobileList) return
    const isMobile = window.innerWidth < 768

    if (!txns || txns.length === 0) {
      const msg = '<div class="text-center py-8 text-slate-400 text-sm">Belum ada riwayat</div>'
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400 text-sm">Belum ada riwayat</td></tr>`
      mobileList.innerHTML = msg
      return
    }

    const itemsMap = {}
    for (const t of txns) {
      const { data: items } = await Database.getTransactionItems(t.id)
      itemsMap[t.id] = items || []
    }

    const { data: allProducts } = await Database.getProducts()

    const search = (document.getElementById('riwayat-search')?.value || '').toLowerCase().trim()

    let rows = txns.slice(0, 100)

    if (search) {
      rows = rows.filter(t => {
        const items = itemsMap[t.id] || []
        const firstItem = items[0] || {}
        const prod = firstItem?.products || {}
        const pName = (prod?.product_name || firstItem?.product_name || t.description || '').toLowerCase()
        const pBarcode = (prod?.barcode || firstItem?.barcode || '').toLowerCase()
        return pName.includes(search) || pBarcode.includes(search)
      })
    }

    const rowData = rows.map(t => {
      const items = itemsMap[t.id] || []
      const firstItem = items[0] || {}
      const prod = firstItem?.products || {}

      let productName = prod?.product_name || firstItem?.product_name || ''
      let barcode = prod?.barcode || firstItem?.barcode || ''
      let stock = null

      if (!productName || !barcode) {
        const parsed = this.#parseDesc(t.description || '', allProducts || [])
        if (!productName) productName = parsed.name
        if (!barcode) barcode = parsed.barcode
      }

      const matched = (allProducts || []).find(p => p.barcode === barcode || p.product_name?.toLowerCase() === productName?.toLowerCase())
      stock = matched?.stock ?? '-'
      const hargaModal = matched?.purchase_price ?? null
      const hargaJual = matched?.selling_price ?? null
      const total = (stock !== '-' && hargaJual !== null) ? Number(stock) * Number(hargaJual) : Number(t.total_amount || 0)

      return {
        id: t.id,
        time: new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        barcode: barcode || '-',
        productName: productName || '-',
        stock: stock,
        hargaModal: hargaModal,
        hargaJual: hargaJual,
        total: total,
      }
    })

    tbody.innerHTML = rowData.map(r => `
      <tr class="border-b border-slate-100">
        <td class="py-3 px-2 text-slate-600 text-sm whitespace-nowrap">${r.time}</td>
        <td class="py-3 px-2 text-slate-600 text-sm font-mono truncate max-w-[90px]">${r.barcode}</td>
        <td class="py-3 px-2 font-medium text-sm truncate max-w-[180px]">${r.productName}</td>
        <td class="py-3 px-2 text-right text-sm font-medium">${r.stock}</td>
        <td class="py-3 px-2 text-right text-sm text-slate-600">${r.hargaModal !== null ? 'Rp ' + r.hargaModal.toLocaleString() : '-'}</td>
        <td class="py-3 px-2 text-right text-sm text-slate-600">${r.hargaJual !== null ? 'Rp ' + r.hargaJual.toLocaleString() : '-'}</td>
        <td class="py-3 px-2 text-right font-medium text-sm">Rp ${r.total.toLocaleString()}</td>
        <td class="py-3 px-2 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="BarangMasuk.editRiwayat('${r.id}')" class="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button onclick="BarangMasuk.deleteRiwayat('${r.id}')" class="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition" title="Hapus">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('')

    mobileList.innerHTML = rowData.map(r => `
      <div class="bg-white rounded-xl border border-slate-200 p-3 active:bg-slate-50 transition">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 text-sm truncate">${r.productName}</p>
            <p class="text-xs text-slate-400 font-mono mt-0.5">${r.barcode}</p>
          </div>
          <span class="badge badge-info text-xs whitespace-nowrap flex-shrink-0">Stok: ${r.stock}</span>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
          <span class="text-slate-500">Modal: <span class="text-slate-700 font-medium">${r.hargaModal !== null ? 'Rp ' + r.hargaModal.toLocaleString() : '-'}</span></span>
          <span class="text-slate-500 text-right">Jual: <span class="text-slate-700 font-medium">${r.hargaJual !== null ? 'Rp ' + r.hargaJual.toLocaleString() : '-'}</span></span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-xs text-slate-500">${r.time}</span>
          <span class="font-bold text-slate-800 text-sm">Rp ${r.total.toLocaleString()}</span>
        </div>
        <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 justify-end">
          <button onclick="BarangMasuk.editRiwayat('${r.id}')" class="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium active:bg-blue-100 transition">Edit</button>
          <button onclick="BarangMasuk.deleteRiwayat('${r.id}')" class="flex-1 py-2 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium active:bg-rose-100 transition">Hapus</button>
        </div>
      </div>
    `).join('')
  }

  static #parseDesc(desc, products) {
    const result = { name: '', qty: '', barcode: '' }
    if (!desc) return result
    const nameMatch = desc.match(/:\s*(.+?)\s*\(/)
    if (nameMatch) result.name = nameMatch[1].trim()
    const qtyMatch = desc.match(/\((\d+)\s*x/)
    if (qtyMatch) result.qty = qtyMatch[1]
    if (result.name) {
      const found = products.find(p => p.product_name?.toLowerCase() === result.name.toLowerCase())
      if (found) result.barcode = found.barcode
    }
    return result
  }

  static async editRiwayat(transactionId) {
    const { data: items } = await Database.getTransactionItems(transactionId)
    const item = items?.[0]
    const prod = item?.products
    let barcode = prod?.barcode || item?.barcode || ''

    if (!barcode) {
      const { data: txns } = await Database.getTransactions()
      const tx = (txns || []).find(t => t.id === transactionId)
      if (tx) {
        const { data: allProducts } = await Database.getProducts()
        const parsed = this.#parseDesc(tx.description || '', allProducts || [])
        barcode = parsed.barcode
      }
    }

    if (barcode) {
      const { data: product } = await Database.getProductByBarcode(barcode)
      if (product) {
        this.#editingTransactionId = transactionId
        this.#currentProduct = { barcode: product.barcode, existing: true, data: product }
        this.#renderForm(product, product.barcode)
        if (item?.quantity) {
          const input = document.getElementById('form-stock')
          if (input) input.value = item.quantity
        }
        if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }
    alert('Tidak dapat menemukan data produk')
  }

  static async deleteRiwayat(transactionId) {
    if (!confirm('Hapus riwayat ini? Stok barang akan dikembalikan.')) return
    App.showLoading()
    const { error } = await Database.deleteTransaction(transactionId)
    App.hideLoading()
    if (error) return alert('Gagal menghapus: ' + error.message)
    this.#loadRiwayat()
  }
}
