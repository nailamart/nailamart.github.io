class App {
  static #currentPage = ''
  static #pageTitles = { dashboard: 'Dashboard', 'barang-masuk': 'Barang Masuk', pos: 'POS / Kasir', laporan: 'Laporan', pengguna: 'Pengguna' }
  static #navIcons = { dashboard: 'chart-pie', 'barang-masuk': 'inbox-arrow-down', pos: 'shopping-cart', laporan: 'document-text' }
  static #bottomNavIcons = {
    'chart-pie': '<path d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>',
    'inbox-arrow-down': '<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
    'shopping-cart': '<path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>',
    'document-text': '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    'users': '<path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>',
  }

  static async init() {
    await Database.init()
    Auth.initUsers()
    this.#checkAuth()
    this.#bindGlobalEvents()
    window.addEventListener('hashchange', () => this.#handleRoute())
    window.addEventListener('resize', () => this.#onResize())
  }

  static #onResize() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('sidebar-overlay')
    if (window.innerWidth >= 768 && sidebar) {
      sidebar.classList.remove('open')
      if (overlay) overlay.classList.remove('show')
    }
  }

  static #checkAuth() {
    if (!Auth.isAuthenticated()) {
      window.location.hash = 'login'
      this.#renderLogin()
      return
    }
    this.#handleRoute()
  }

  static #bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const sidebar = document.getElementById('sidebar')
      const overlay = document.getElementById('sidebar-overlay')
      if (e.target.closest('#btn-menu-toggle') || e.target.closest('#btn-mobile-menu')) {
        sidebar?.classList.toggle('open')
        overlay?.classList.toggle('show')
      }
      if (e.target.closest('#sidebar-overlay')) {
        sidebar?.classList.remove('open')
        overlay?.classList.remove('show')
      }
      if (e.target.closest('#btn-logout')) {
        Auth.logout()
      }
    })
  }

  static #handleRoute() {
    const hash = window.location.hash.slice(1) || 'login'
    if (!Auth.isAuthenticated() && hash !== 'login') {
      window.location.hash = 'login'
      this.#renderLogin()
      return
    }
    if (hash === 'login') {
      this.#renderLogin()
      return
    }
    this.#renderAppShell()
    this.#navigate(hash)
  }

  static #renderLogin() {
    const app = document.getElementById('app')
    app.innerHTML = `
      <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4" style="min-height:100dvh">
        <div class="w-full max-w-md">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span class="text-white text-3xl font-bold">NM</span>
            </div>
            <h1 class="text-3xl font-bold text-slate-800">Naila Mart</h1>
            <p class="text-slate-500 mt-2">Sistem Manajemen Toko & POS</p>
          </div>
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 class="text-xl font-semibold text-slate-800 mb-6">Masuk ke Aplikasi</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Nama Pengguna</label>
                <input type="text" id="login-username" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="Masukkan username">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Password</label>
                <input type="password" id="login-password" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" placeholder="••••••••">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-600 mb-1">Masuk Sebagai</label>
                <select id="login-role" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white transition">
                  <option value="admin">Admin Toko</option>
                  <option value="kasir">Kasir</option>
                  <option value="pemilik">Pemilik</option>
                </select>
              </div>
              <button id="btn-login" class="ripple w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition font-semibold text-lg active:scale-[.98]">
                Masuk
              </button>
              <p class="text-xs text-slate-400 text-center mt-2">Masuk dengan akun yang sudah didaftarkan Pemilik</p>
            </div>
          </div>
        </div>
      </div>
    `
    document.getElementById('btn-login')?.addEventListener('click', () => this.#handleLogin())
    document.getElementById('login-password')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.#handleLogin()
    })
  }

  static #handleLogin() {
    const username = document.getElementById('login-username').value.trim()
    const password = document.getElementById('login-password').value.trim()
    const role = document.getElementById('login-role').value
    if (!username) return alert('Masukkan nama pengguna!')
    const result = Auth.login(username, password, role)
    if (result.error) return alert(result.error)
    window.location.hash = '#dashboard'
  }

  static #renderAppShell() {
    if (document.getElementById('app-shell')) return
    const user = Auth.getCurrentUser()
    if (!user) return
    const menuItems = Auth.getMenuByRole(user.role)
    const app = document.getElementById('app')
    app.innerHTML = `
      <div id="app-shell">
        <!-- Sidebar Overlay -->
        <div id="sidebar-overlay" class="sidebar-overlay"></div>

        <!-- Sidebar (Desktop) -->
        <aside id="sidebar" class="sidebar">
          <div class="sidebar-brand flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold text-lg">NM</span>
            </div>
            <div class="min-w-0">
              <h2 class="text-white font-bold truncate">Naila Mart</h2>
              <p class="text-xs text-slate-400 truncate">${Auth.getRoleLabel(user.role)}</p>
            </div>
          </div>
          <nav class="sidebar-nav">
            ${menuItems.map(m => `
              <a href="#${m.page}" data-page="${m.page}" class="nav-link">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  ${this.#getIconPath(m.icon)}
                </svg>
                ${m.label}
              </a>
            `).join('')}
          </nav>
          <div class="p-4 border-t border-slate-700/50 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">${user.username.charAt(0).toUpperCase()}</div>
                <span class="text-sm text-slate-300 truncate">${user.username}</span>
              </div>
              <button id="btn-logout" class="text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-700/50" title="Keluar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </div>
        </aside>

        <!-- Mobile Top Bar -->
        <header class="mobile-top-bar" id="mobile-top-bar">
          <button id="btn-mobile-menu" class="btn-icon" aria-label="Menu">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <span class="page-title" id="page-title">Naila Mart</span>
          <button id="btn-logout-mobile" class="btn-icon" aria-label="Keluar" title="Keluar">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </header>

        <!-- Mobile Bottom Navigation -->
        <nav class="mobile-bottom-nav" id="mobile-bottom-nav">
          <div class="bottom-nav-inner">
            ${menuItems.map(m => `
              <a href="#${m.page}" data-page="${m.page}" class="bottom-nav-item">
                <svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  ${this.#bottomNavIcons[m.icon] || ''}
                </svg>
                <span>${this.#shortLabel(m.label)}</span>
              </a>
            `).join('')}
          </div>
        </nav>

        <!-- Main Content -->
        <main class="main-content" id="main-content-desktop">
          <div id="loading-indicator" class="hidden fixed top-4 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 border border-slate-200">
            <div class="loading-spinner"></div>
            <span class="text-sm text-slate-600">Memproses...</span>
          </div>
          <div id="page-dashboard" class="page-section"></div>
          <div id="page-barang-masuk" class="page-section"></div>
          <div id="page-pos" class="page-section"></div>
          <div id="page-laporan" class="page-section"></div>
          <div id="page-pengguna" class="page-section"></div>
        </main>

        <!-- Mobile Content -->
        <div class="mobile-content" id="mobile-content">
          <div id="loading-indicator-mobile" class="hidden fixed top-16 right-4 z-50 bg-white shadow-lg rounded-lg px-4 py-3 flex items-center gap-3 border border-slate-200">
            <div class="loading-spinner"></div>
            <span class="text-sm text-slate-600">Memproses...</span>
          </div>
          <div class="p-4" id="mobile-page-container"></div>
        </div>
      </div>
    `
    document.getElementById('btn-logout-mobile')?.addEventListener('click', () => Auth.logout())
  }

  static #shortLabel(label) {
    const map = { Dashboard: 'Dashboard', 'Barang Masuk': 'Stok', 'POS / Kasir': 'POS', Laporan: 'Laporan', Pengguna: 'Pengguna' }
    return map[label] || label
  }

  static #getIconPath(icon) {
    const icons = {
      'chart-pie': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>',
      'inbox-arrow-down': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
      'document-text': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
      'shopping-cart': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/>',
      'users': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>',
    }
    return icons[icon] || icons['document-text']
  }

  static #navigate(page) {
    this.#currentPage = page
    const title = this.#pageTitles[page] || 'Naila Mart'
    const titleEl = document.getElementById('page-title')
    if (titleEl) titleEl.textContent = title

    // Desktop pages
    document.querySelectorAll('#main-content-desktop .page-section').forEach(s => s.classList.remove('active'))
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(l => l.classList.remove('active'))

    // Bottom nav items
    document.querySelectorAll('.bottom-nav-item').forEach(l => l.classList.remove('active'))

    const target = document.querySelector(`#main-content-desktop #page-${page}`)
    if (target) target.classList.add('active')

    const activeLink = document.querySelector(`.sidebar-nav .nav-link[data-page="${page}"]`)
    if (activeLink) activeLink.classList.add('active')

    const activeBottom = document.querySelector(`.bottom-nav-item[data-page="${page}"]`)
    if (activeBottom) activeBottom.classList.add('active')

    // Render content into both desktop and mobile containers
    const isMobile = window.innerWidth < 768
    const container = isMobile ? document.getElementById('mobile-page-container') : null

    switch (page) {
      case 'dashboard': this.#loadDashboard(container); break
      case 'barang-masuk': BarangMasuk.init(container); break
      case 'pos': POS.init(container); break
      case 'laporan': Laporan.init(container); break
      case 'pengguna': Pengguna.init(container); break
    }
  }

  static async #loadDashboard(container) {
    const section = container || document.getElementById('page-dashboard')
    section.innerHTML = `
      <div class="mb-4 md:mb-6">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800">Dashboard</h1>
        <p class="text-slate-500 mt-1 text-sm md:text-base">Overview bisnis Naila Mart</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6" id="dash-stats">
        <div class="stat-card animate-pulse"><div class="h-14 md:h-16 bg-slate-200 rounded"></div></div>
        <div class="stat-card animate-pulse"><div class="h-14 md:h-16 bg-slate-200 rounded"></div></div>
        <div class="stat-card animate-pulse"><div class="h-14 md:h-16 bg-slate-200 rounded"></div></div>
        <div class="stat-card animate-pulse"><div class="h-14 md:h-16 bg-slate-200 rounded"></div></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div class="stat-card">
          <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Grafik Pemasukan vs Pengeluaran</h2>
          <canvas id="dash-chart" height="260"></canvas>
        </div>
        <div class="stat-card">
          <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Stok Menipis</h2>
          <div id="low-stock-list"></div>
        </div>
      </div>
    `
    const stats = await Database.getDashboardStats()
    const statsEl = document.getElementById('dash-stats')
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Pendapatan Kotor</p>
          <p class="text-lg md:text-2xl font-bold text-emerald-600">Rp ${this.#formatNumber(stats.income)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">HPP (Modal Terjual)</p>
          <p class="text-lg md:text-2xl font-bold text-amber-600">Rp ${this.#formatNumber(stats.hpp)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Laba Kotor</p>
          <p class="text-lg md:text-2xl font-bold text-slate-800">Rp ${this.#formatNumber(stats.grossProfit)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Total Produk</p>
          <p class="text-lg md:text-2xl font-bold text-slate-800">${stats.totalProducts || 0} <span class="text-xs md:text-sm text-slate-400 font-normal">(${stats.lowStock || 0} menipis)</span></p>
        </div>
      `
    }
    this.#renderDashboardChart(stats)
    this.#renderLowStock(stats)
  }

  static #formatNumber(n) { return (n || 0).toLocaleString() }

  static #renderDashboardChart(stats) {
    const ctx = document.getElementById('dash-chart')
    if (!ctx) return
    const txns = stats.transactions || []
    const grouped = {}
    txns.forEach(t => {
      const d = new Date(t.created_at).toISOString().slice(0, 10)
      if (!grouped[d]) grouped[d] = { income: 0, expense: 0 }
      if (t.type === 'pemasukan') grouped[d].income += Number(t.total_amount || 0)
      else grouped[d].expense += Number(t.total_amount || 0)
    })
    const labels = Object.keys(grouped).sort().slice(-14)
    const incomeData = labels.map(l => grouped[l].income)
    const expenseData = labels.map(l => grouped[l].expense)

    if (typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels.length ? labels : ['Belum ada data'],
          datasets: [
            { label: 'Pemasukan', data: labels.length ? incomeData : [0], borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,.1)', fill: true, tension: 0.3, pointRadius: window.innerWidth < 768 ? 2 : 3 },
            { label: 'Pengeluaran', data: labels.length ? expenseData : [0], borderColor: '#F43F5E', backgroundColor: 'rgba(244,63,94,.1)', fill: true, tension: 0.3, pointRadius: window.innerWidth < 768 ? 2 : 3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: window.innerWidth < 768 ? 11 : 13 } } } },
          scales: { y: { beginAtZero: true, ticks: { callback: v => 'Rp ' + v.toLocaleString(), font: { size: window.innerWidth < 768 ? 10 : 12 } } }, x: { ticks: { font: { size: window.innerWidth < 768 ? 9 : 11 } } } },
        },
      })
    }
  }

  static async #renderLowStock(stats) {
    const el = document.getElementById('low-stock-list')
    if (!el) return
    const { data: products } = await Database.getProducts()
    const lowStock = (products || []).filter(p => (p.stock || 0) <= 5).sort((a, b) => a.stock - b.stock)
    if (lowStock.length === 0) {
      el.innerHTML = '<p class="text-emerald-600 text-center py-6 md:py-8 text-sm">Semua stok barang dalam kondisi aman</p>'
      return
    }
    el.innerHTML = lowStock.map(p => `
      <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
        <div class="min-w-0">
          <p class="font-medium text-slate-700 text-sm">${p.product_name}</p>
          <p class="text-xs text-slate-400 truncate">Barcode: ${p.barcode}</p>
        </div>
        <span class="badge ${p.stock <= 2 ? 'badge-danger' : 'badge-warning'} flex-shrink-0">Stok: ${p.stock}</span>
      </div>
    `).join('')
  }

  static showLoading() {
    const el = document.getElementById('loading-indicator') || document.getElementById('loading-indicator-mobile')
    if (el) el.classList.remove('hidden')
  }

  static hideLoading() {
    const el = document.getElementById('loading-indicator') || document.getElementById('loading-indicator-mobile')
    if (el) el.classList.add('hidden')
  }

  static getContainer() {
    return window.innerWidth < 768 ? document.getElementById('mobile-page-container') : null
  }
}

document.addEventListener('DOMContentLoaded', () => App.init())
