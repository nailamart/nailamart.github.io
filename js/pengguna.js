class Pengguna {
  static #container = null
  static #editingUsername = null

  static async init(container = null) {
    if (!Auth.hasRole('pemilik')) {
      alert('Hanya Pemilik yang dapat mengakses halaman ini')
      window.location.hash = '#dashboard'
      return
    }
    this.#container = container
    await this.#render()
    this.#bindEvents()
  }

  static async #render() {
    const section = this.#container || document.getElementById('page-pengguna')
    const users = await Auth.getUsers()
    const currentUser = Auth.getCurrentUser()

    section.innerHTML = `
      <div class="mb-4 md:mb-6">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800">Kelola Pengguna</h1>
        <p class="text-slate-500 mt-1 text-sm md:text-base">Tambah atau hapus akun pengguna Naila Mart</p>
      </div>

      <div class="stat-card mb-4 md:mb-6">
        <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3">${this.#editingUsername ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input id="pg-username" type="text" placeholder="Username" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" ${this.#editingUsername ? 'readonly' : ''} value="${this.#editingUsername || ''}">
          <input id="pg-password" type="password" placeholder="${this.#editingUsername ? 'Kosongkan jika tidak ganti' : 'Password'}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
          <select id="pg-role" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
            <option value="admin">Admin Toko</option>
            <option value="kasir">Kasir</option>
            <option value="pemilik">Pemilik</option>
          </select>
          <div class="flex gap-2">
            <button id="btn-add-user" class="flex-1 px-4 py-2 ${this.#editingUsername ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white rounded-lg transition text-sm font-medium">${this.#editingUsername ? 'Simpan' : 'Tambah'}</button>
            ${this.#editingUsername ? '<button id="btn-cancel-edit" class="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition text-sm font-medium">Batal</button>' : ''}
          </div>
        </div>
      </div>

      <div class="stat-card">
        <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3">Daftar Pengguna</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-xs md:text-sm">
            <thead><tr class="border-b border-slate-200 text-slate-500">
              <th class="text-left py-2 px-2">Username</th>
              <th class="text-left py-2 px-2">Role</th>
              <th class="text-left py-2 px-2 hidden md:table-cell">Dibuat</th>
              <th class="text-right py-2 px-2">Aksi</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `
                <tr class="border-b border-slate-100">
                  <td class="py-2 px-2 text-slate-700 font-medium">${u.username}${u.username === currentUser?.username ? ' <span class="text-xs text-emerald-500 font-normal">(Anda)</span>' : ''}</td>
                  <td class="py-2 px-2"><span class="badge ${u.role === 'pemilik' ? 'badge-danger' : u.role === 'admin' ? 'badge-warning' : 'badge-success'}">${Auth.getRoleLabel(u.role)}</span></td>
                  <td class="py-2 px-2 text-slate-500 hidden md:table-cell">${new Date(u.createdAt).toLocaleString('id-ID')}</td>
                  <td class="py-2 px-2 text-right">
                    ${u.username !== currentUser?.username ? `
                      <button data-edit="${u.username}" class="px-3 py-1 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition text-xs font-medium mr-1">Edit</button>
                      <button data-delete="${u.username}" class="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition text-xs font-medium">Hapus</button>
                    ` : '<span class="text-xs text-slate-400">-</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `

    if (this.#editingUsername) {
      const user = users.find(u => u.username === this.#editingUsername)
      if (user) document.getElementById('pg-role').value = user.role
    }
  }

  static #bindEvents() {
    document.getElementById('btn-add-user')?.addEventListener('click', () => this.#handleSave())
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this.#cancelEdit())
    document.getElementById('pg-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') this.#handleSave() })
    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => this.#handleDelete(btn.dataset.delete))
    })
    document.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.#handleEdit(btn.dataset.edit))
    })
  }

  static async #cancelEdit() {
    this.#editingUsername = null
    await this.#render()
    this.#bindEvents()
  }

  static async #handleEdit(username) {
    this.#editingUsername = username
    await this.#render()
    this.#bindEvents()
  }

  static async #handleSave() {
    const username = document.getElementById('pg-username').value.trim()
    const password = document.getElementById('pg-password').value.trim()
    const role = document.getElementById('pg-role').value

    App.showLoading()

    if (this.#editingUsername) {
      const result = await Auth.updateUser(this.#editingUsername, password, role)
      App.hideLoading()
      if (result.error) return alert(result.error)
      this.#editingUsername = null
    } else {
      if (!username) { App.hideLoading(); return alert('Username harus diisi!') }
      if (!password) { App.hideLoading(); return alert('Password harus diisi!') }
      const result = await Auth.createUser(username, password, role)
      App.hideLoading()
      if (result.error) return alert(result.error)
    }

    document.getElementById('pg-username').value = ''
    document.getElementById('pg-password').value = ''
    await this.#render()
    this.#bindEvents()
  }

  static async #handleDelete(username) {
    if (!confirm(`Hapus pengguna "${username}"?`)) return
    App.showLoading()
    const result = await Auth.deleteUser(username)
    App.hideLoading()
    if (result.error) return alert(result.error)
    if (this.#editingUsername === username) this.#editingUsername = null
    await this.#render()
    this.#bindEvents()
  }
}
