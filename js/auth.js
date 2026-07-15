class Auth {
  static #USERS_KEY = 'naila_mart_users'

  static #loadUsers() {
    try {
      const data = localStorage.getItem(this.#USERS_KEY)
      return data ? JSON.parse(data) : null
    } catch { return null }
  }

  static #saveUsers(users) {
    localStorage.setItem(this.#USERS_KEY, JSON.stringify(users))
  }

  static initUsers() {
    let users = this.#loadUsers()
    if (!users || users.length === 0) {
      users = [
        { username: 'Pemilik', password: 'pemilik123', role: 'pemilik', createdAt: new Date().toISOString() },
        { username: 'Admin', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() },
        { username: 'Kasir', password: 'kasir123', role: 'kasir', createdAt: new Date().toISOString() },
      ]
      this.#saveUsers(users)
    }
  }

  static getUsers() {
    return this.#loadUsers() || []
  }

  static createUser(username, password, role) {
    const users = this.getUsers()
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { error: 'Username sudah digunakan' }
    }
    if (!username.trim() || !password.trim()) {
      return { error: 'Username dan password harus diisi' }
    }
    users.push({
      username: username.trim(),
      password: password.trim(),
      role,
      createdAt: new Date().toISOString(),
    })
    this.#saveUsers(users)
    return { error: null }
  }

  static deleteUser(username) {
    let users = this.getUsers()
    const current = this.getCurrentUser()
    if (current?.username === username) return { error: 'Tidak bisa menghapus akun sendiri' }
    if (users.filter(u => u.role === 'pemilik').length === 1 && users.find(u => u.username === username)?.role === 'pemilik') {
      return { error: 'Setidaknya harus ada satu pemilik' }
    }
    users = users.filter(u => u.username !== username)
    this.#saveUsers(users)
    return { error: null }
  }

  static updateUser(username, updates) {
    const users = this.getUsers()
    const idx = users.findIndex(u => u.username === username)
    if (idx === -1) return { error: 'User tidak ditemukan' }
    if (updates.password !== undefined) users[idx].password = updates.password
    if (updates.role !== undefined) users[idx].role = updates.role
    this.#saveUsers(users)
    return { error: null }
  }

  static login(username, password, role) {
    this.initUsers()
    const users = this.getUsers()
    const user = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password &&
      u.role === role
    )
    if (!user) return { error: 'Username, password, atau role salah' }
    const session = { username: user.username, role: user.role, loginAt: new Date().toISOString() }
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session))
    return { error: null, user: session }
  }

  static logout() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER)
    localStorage.removeItem(CONFIG.STORAGE_KEYS.CART)
    window.location.hash = '#login'
  }

  static getCurrentUser() {
    try {
      const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER)
      return user ? JSON.parse(user) : null
    } catch { return null }
  }

  static isAuthenticated() {
    return !!this.getCurrentUser()
  }

  static hasRole(...roles) {
    const user = this.getCurrentUser()
    return user && roles.includes(user.role)
  }

  static getRoleLabel(role) {
    const labels = { admin: 'Admin Toko', kasir: 'Kasir', pemilik: 'Pemilik' }
    return labels[role] || role
  }

  static getMenuByRole(role) {
    const menus = {
      admin: [
        { id: 'dashboard', label: 'Dashboard', icon: 'chart-pie', page: 'dashboard' },
        { id: 'barang-masuk', label: 'Barang Masuk', icon: 'inbox-arrow-down', page: 'barang-masuk' },
        { id: 'laporan', label: 'Laporan', icon: 'document-text', page: 'laporan' },
      ],
      kasir: [
        { id: 'pos', label: 'POS / Kasir', icon: 'shopping-cart', page: 'pos' },
        { id: 'laporan', label: 'Laporan', icon: 'document-text', page: 'laporan' },
      ],
      pemilik: [
        { id: 'dashboard', label: 'Dashboard', icon: 'chart-pie', page: 'dashboard' },
        { id: 'pengguna', label: 'Pengguna', icon: 'users', page: 'pengguna' },
        { id: 'laporan', label: 'Laporan', icon: 'document-text', page: 'laporan' },
      ],
    }
    return menus[role] || []
  }
}
