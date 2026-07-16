class Auth {
  static async initUsers() {
    const { data: users } = await Database.getUsers()
    if (!users || users.length === 0) {
      const defaults = [
        { username: 'Pemilik', password: 'pemilik123', role: 'pemilik' },
        { username: 'Admin', password: 'admin123', role: 'admin' },
        { username: 'Kasir', password: 'kasir123', role: 'kasir' },
      ]
      for (const u of defaults) {
        await Database.createUser(u.username, u.password, u.role)
      }
    }
  }

  static async getUsers() {
    const { data } = await Database.getUsers()
    return data || []
  }

  static async createUser(username, password, role) {
    const users = await this.getUsers()
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return { error: 'Username sudah digunakan' }
    }
    if (!username.trim() || !password.trim()) {
      return { error: 'Username dan password harus diisi' }
    }
    const { error } = await Database.createUser(username, password, role)
    return { error: error?.message || null }
  }

  static async deleteUser(username) {
    const current = this.getCurrentUser()
    if (current?.username === username) return { error: 'Tidak bisa menghapus akun sendiri' }
    const users = await this.getUsers()
    if (users.filter(u => u.role === 'pemilik').length === 1 && users.find(u => u.username === username)?.role === 'pemilik') {
      return { error: 'Setidaknya harus ada satu pemilik' }
    }
    await Database.deleteUser(username)
    return { error: null }
  }

  static async login(username, password, role) {
    const users = await this.getUsers()
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
