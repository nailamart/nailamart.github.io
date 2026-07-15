class POS {
  static #container = null
  static #cart = []
  static #scanner = null
  static #scanning = false

  static init(container = null) {
    this.#container = container
    this.#loadCart()
    this.#render()
    this.#bindEvents()
    this.#updateCartDisplay()
  }

  static #render() {
    const section = this.#container || document.getElementById('page-pos')
    const isMobile = window.innerWidth < 768
    section.innerHTML = `
      <div class="mb-4 md:mb-6">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800">POS / Kasir</h1>
        <p class="text-slate-500 mt-1 text-sm md:text-base">Scan barcode produk untuk memulai transaksi penjualan</p>
      </div>
      <div class="pos-grid">
        <div class="space-y-3 md:space-y-4">
          <div class="stat-card">
            <div class="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <button id="toggle-pos-scanner" class="px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-800 text-white whitespace-nowrap">
                ${this.#scanning ? 'Stop' : 'Scan'}
              </button>
              <div class="flex-1 flex gap-2">
                <input type="text" id="pos-barcode-input" class="flex-1 px-3 md:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm" placeholder="Ketik barcode..." autocomplete="off">
                <button id="pos-add-barcode" class="px-3 md:px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-medium">+</button>
              </div>
            </div>
            <div id="pos-scanner-view" class="${this.#scanning ? '' : 'hidden'}">
              <div id="pos-scanner-element" class="bg-black rounded-lg overflow-hidden max-w-sm mx-auto"></div>
            </div>
          </div>
          <div class="stat-card">
            <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-2 md:mb-3">Produk</h2>
            <div id="pos-search-result">
              <p class="text-slate-400 text-center py-4 text-sm">Scan atau cari produk</p>
            </div>
          </div>
        </div>
        <div class="space-y-3 md:space-y-4">
          <div class="stat-card">
            <div class="flex items-center justify-between mb-3 md:mb-4">
              <h2 class="text-base md:text-lg font-semibold text-slate-700">Keranjang</h2>
              <button id="btn-clear-cart" class="text-sm text-rose-500 hover:text-rose-600 font-medium ${this.#cart.length === 0 ? 'hidden' : ''}">Hapus</button>
            </div>
            <div id="cart-items" class="space-y-2 min-h-[120px] md:min-h-[200px]"></div>
            <div class="pos-cart-sticky">
              <div class="flex justify-between text-base md:text-lg font-bold text-slate-800 mb-3">
                <span>Total</span>
                <span id="cart-total">Rp 0</span>
              </div>
              <button id="btn-checkout" class="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition font-semibold text-base md:text-lg active:scale-[.98] ${this.#cart.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${this.#cart.length === 0 ? 'disabled' : ''}>
                Selesaikan Transaksi
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="struk-modal" class="struk-modal">
        <div class="struk-content">
          <div id="struk-print-area"></div>
          <div class="flex gap-3 mt-6">
            <button id="btn-print-struk" class="flex-1 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition font-medium">Cetak Struk</button>
            <button id="btn-close-struk" class="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 transition font-medium">Tutup</button>
          </div>
        </div>
      </div>
    `
  }

  static #loadCart() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.CART)
      this.#cart = saved ? JSON.parse(saved) : []
    } catch { this.#cart = [] }
  }

  static #saveCart() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.CART, JSON.stringify(this.#cart))
  }

  static #bindEvents() {
    document.getElementById('toggle-pos-scanner')?.addEventListener('click', () => this.#toggleScanner())
    document.getElementById('pos-add-barcode')?.addEventListener('click', () => {
      const val = document.getElementById('pos-barcode-input').value.trim()
      if (val) this.addToCart(val)
    })
    document.getElementById('pos-barcode-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = e.target.value.trim()
        if (val) this.addToCart(val)
        document.getElementById('pos-search-result').innerHTML = '<p class="text-slate-400 text-center py-4 text-sm">Scan atau cari produk</p>'
      }
    })
    document.getElementById('pos-barcode-input')?.addEventListener('input', (e) => {
      const val = e.target.value.trim()
      if (val.length >= 1) this.searchProducts(val)
      else document.getElementById('pos-search-result').innerHTML = '<p class="text-slate-400 text-center py-4 text-sm">Ketik nama atau barcode produk</p>'
    })
    document.getElementById('btn-clear-cart')?.addEventListener('click', () => this.#clearCart())
    document.getElementById('btn-checkout')?.addEventListener('click', () => this.#checkout())
    document.getElementById('btn-close-struk')?.addEventListener('click', () => {
      document.getElementById('struk-modal').classList.remove('show')
    })
    document.getElementById('btn-print-struk')?.addEventListener('click', () => window.print())
  }

  static async #toggleScanner() {
    this.#scanning = !this.#scanning
    const btn = document.getElementById('toggle-pos-scanner')
    const view = document.getElementById('pos-scanner-view')
    if (this.#scanning) {
      view.classList.remove('hidden')
      btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-rose-500 text-white active:scale-95'
      btn.textContent = 'Stop'
      try {
        this.#scanner = new Html5Qrcode('pos-scanner-element')
        await this.#scanner.start({ facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            this.addToCart(decodedText)
            document.getElementById('pos-barcode-input').value = decodedText
            this.#stopScanner()
          }
        )
      } catch (err) {
        alert('Tidak dapat mengakses kamera: ' + err.message)
        this.#scanning = false
        btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-800 text-white active:scale-95'
        btn.textContent = 'Scan'
        view.classList.add('hidden')
      }
    } else {
      this.#stopScanner()
      btn.className = 'px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition bg-slate-800 text-white active:scale-95'
      btn.textContent = 'Scan'
      view.classList.add('hidden')
    }
  }

  static async #stopScanner() {
    if (this.#scanner) {
      try { await this.#scanner.stop() } catch {}
      try { this.#scanner.clear() } catch {}
      this.#scanner = null
    }
  }

  static async addToCart(barcode) {
    if (!barcode) return
    App.showLoading()
    const { data: product, error } = await Database.getProductByBarcode(barcode)
    App.hideLoading()
    if (error || !product) {
      alert('Produk dengan barcode ' + barcode + ' tidak ditemukan!')
      return
    }
    if ((product.stock || 0) < 1) {
      alert('Stok ' + product.product_name + ' habis!')
      return
    }
    const existing = this.#cart.find(c => c.barcode === barcode)
    if (existing) {
      if (existing.quantity >= (product.stock || 0)) {
        return alert('Stok tidak mencukupi!')
      }
      existing.quantity++
      existing.subtotal = existing.quantity * existing.price_per_unit
    } else {
      this.#cart.push({
        barcode: product.barcode,
        product_id: product.id,
        product_name: product.product_name,
        price_per_unit: Number(product.selling_price),
        quantity: 1,
        subtotal: Number(product.selling_price),
      })
    }
    this.#saveCart()
    this.#updateCartDisplay()
    document.getElementById('pos-barcode-input').value = ''
    document.getElementById('pos-search-result').innerHTML = `
      <div class="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
        <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
        <div>
          <p class="font-medium text-emerald-800">${product.product_name}</p>
          <p class="text-sm text-emerald-600">Rp ${Number(product.selling_price).toLocaleString()} | Stok: ${product.stock}</p>
        </div>
      </div>
    `
  }

  static async searchProducts(q) {
    const { data: products } = await Database.getProducts(q)
    const container = document.getElementById('pos-search-result')
    if (!products || products.length === 0) {
      container.innerHTML = `<p class="text-slate-400 text-center py-4 text-sm">Produk tidak ditemukan</p>`
      return
    }
    container.innerHTML = products.slice(0, 10).map(p => `
      <div onclick="POS.addToCart('${p.barcode}')" class="flex items-center justify-between p-3 rounded-lg border border-slate-100 mb-2 cursor-pointer active:bg-emerald-50 hover:border-emerald-200 transition">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm text-slate-800 truncate">${p.product_name}</p>
          <p class="text-xs text-slate-400 font-mono">${p.barcode}</p>
        </div>
        <div class="text-right flex-shrink-0 ml-3">
          <p class="font-semibold text-sm text-emerald-600">Rp ${Number(p.selling_price || 0).toLocaleString()}</p>
          <p class="text-xs ${(p.stock || 0) <= 5 ? 'text-rose-500' : 'text-slate-400'}">Stok: ${p.stock || 0}</p>
        </div>
      </div>
    `).join('')
  }

  static #updateCartDisplay() {
    const container = document.getElementById('cart-items')
    const totalEl = document.getElementById('cart-total')
    const checkoutBtn = document.getElementById('btn-checkout')
    const clearBtn = document.getElementById('btn-clear-cart')
    if (!container) return

    if (this.#cart.length === 0) {
      container.innerHTML = '<p class="text-slate-400 text-center py-8">Keranjang masih kosong</p>'
      totalEl.textContent = 'Rp 0'
      checkoutBtn.disabled = true
      checkoutBtn.className = 'w-full py-3 bg-emerald-500 text-white rounded-lg font-semibold text-lg opacity-50 cursor-not-allowed'
      if (clearBtn) clearBtn.classList.add('hidden')
      return
    }

    container.innerHTML = this.#cart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <p class="font-medium text-slate-800">${item.product_name}</p>
          <p class="text-sm text-slate-500">Rp ${Number(item.price_per_unit).toLocaleString()} x ${item.quantity}</p>
        </div>
        <div class="cart-item-actions">
          <span class="font-semibold text-slate-800 min-w-[80px] text-right">Rp ${Number(item.subtotal).toLocaleString()}</span>
          <button onclick="POS.decreaseQty(${idx})" class="w-8 h-8 rounded-full border border-slate-300 hover:bg-slate-100 transition flex items-center justify-center text-slate-600">-</button>
          <span class="w-8 text-center font-medium">${item.quantity}</span>
          <button onclick="POS.increaseQty(${idx})" class="w-8 h-8 rounded-full border border-slate-300 hover:bg-slate-100 transition flex items-center justify-center text-slate-600">+</button>
          <button onclick="POS.removeItem(${idx})" class="w-8 h-8 rounded-full hover:bg-rose-50 transition flex items-center justify-center text-rose-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>
    `).join('')

    const total = this.#cart.reduce((s, i) => s + i.subtotal, 0)
    totalEl.textContent = 'Rp ' + total.toLocaleString()
    checkoutBtn.disabled = false
    checkoutBtn.className = 'w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold text-lg'
    if (clearBtn) clearBtn.classList.remove('hidden')
  }

  static increaseQty(idx) {
    if (idx < 0 || idx >= this.#cart.length) return
    this.#cart[idx].quantity++
    this.#cart[idx].subtotal = this.#cart[idx].quantity * this.#cart[idx].price_per_unit
    this.#saveCart()
    this.#updateCartDisplay()
  }

  static decreaseQty(idx) {
    if (idx < 0 || idx >= this.#cart.length) return
    if (this.#cart[idx].quantity <= 1) return this.removeItem(idx)
    this.#cart[idx].quantity--
    this.#cart[idx].subtotal = this.#cart[idx].quantity * this.#cart[idx].price_per_unit
    this.#saveCart()
    this.#updateCartDisplay()
  }

  static removeItem(idx) {
    if (idx < 0 || idx >= this.#cart.length) return
    this.#cart.splice(idx, 1)
    this.#saveCart()
    this.#updateCartDisplay()
  }

  static #clearCart() {
    if (this.#cart.length === 0) return
    if (!confirm('Hapus semua item dari keranjang?')) return
    this.#cart = []
    this.#saveCart()
    this.#updateCartDisplay()
  }

  static async #checkout() {
    if (this.#cart.length === 0) return

    App.showLoading()
    const total = this.#cart.reduce((s, i) => s + i.subtotal, 0)
    const { data, error } = await Database.createTransaction(
      'pemasukan', total,
      `Penjualan: ${this.#cart.length} item`,
      this.#cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        subtotal: item.subtotal,
      }))
    )
    App.hideLoading()

    if (error) return alert('Gagal menyimpan transaksi: ' + error.message)

    const cartSnapshot = [...this.#cart]
    this.#showStruk(data, cartSnapshot)
    this.#cart = []
    this.#saveCart()
    this.#updateCartDisplay()
  }

  static #showStruk(transaction, cartSnapshot) {
    const area = document.getElementById('struk-print-area')
    const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })
    const items = (cartSnapshot || this.#cart).map(i => ({
      name: i.product_name,
      qty: i.quantity,
      price: i.price_per_unit,
      subtotal: i.subtotal,
    }))
    const total = (cartSnapshot || this.#cart).reduce((s, i) => s + i.subtotal, 0)

    area.innerHTML = `
      <div class="text-center mb-4">
        <h2 class="text-xl font-bold text-slate-800">NAILA MART</h2>
        <p class="text-sm text-slate-500">Struk Belanja</p>
        <p class="text-sm text-slate-500">${now}</p>
        <p class="text-xs text-slate-400 mt-1">No: ${transaction?.id?.slice(0, 8) || '-'}</p>
      </div>
      <hr class="border-dashed border-slate-300 my-3">
      <div class="text-xs text-slate-500 mb-2">${items.length} item</div>
      ${items.map(i => `
        <div class="struk-line">
          <span>${i.name} x${i.qty}</span>
          <span>Rp ${Number(i.subtotal).toLocaleString()}</span>
        </div>
      `).join('')}
      <hr class="border-dashed border-slate-300 my-3">
      <div class="struk-total flex justify-between">
        <span>TOTAL</span>
        <span>Rp ${total.toLocaleString()}</span>
      </div>
      <div class="text-center mt-4 text-xs text-slate-400">
        <p>Terima kasih telah berbelanja</p>
        <p>Barang yang sudah dibeli tidak dapat ditukar</p>
      </div>
    `
    document.getElementById('struk-modal').classList.add('show')
  }
}
