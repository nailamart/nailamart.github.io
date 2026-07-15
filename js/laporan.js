class Laporan {
  static #container = null
  static #chart = null
  static #filterType = 'bulanan'
  static #startDate = null
  static #endDate = null

  static init(container = null) {
    this.#container = container
    this.#render()
    this.#bindEvents()
    this.#loadData()
  }

  static #render() {
    const section = this.#container || document.getElementById('page-laporan')
    section.innerHTML = `
      <div class="mb-4 md:mb-6">
        <h1 class="text-xl md:text-2xl font-bold text-slate-800">Laporan Keuangan</h1>
        <p class="text-slate-500 mt-1 text-sm md:text-base">Rekap pemasukan, pengeluaran, dan laba bersih Naila Mart</p>
      </div>
      <div class="flex flex-wrap gap-2 md:gap-3 mb-4 md:mb-6 items-center">
        <div class="flex rounded-lg border border-slate-300 overflow-hidden">
          <button data-filter="harian" class="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition ${this.#filterType === 'harian' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}">Harian</button>
          <button data-filter="mingguan" class="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition ${this.#filterType === 'mingguan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}">Mingguan</button>
          <button data-filter="bulanan" class="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition ${this.#filterType === 'bulanan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}">Bulanan</button>
          <button data-filter="tahunan" class="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition ${this.#filterType === 'tahunan' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}">Tahunan</button>
        </div>
        <input type="date" id="filter-start" class="px-2 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg text-xs md:text-sm">
        <span class="text-slate-400 text-sm">s/d</span>
        <input type="date" id="filter-end" class="px-2 md:px-3 py-1.5 md:py-2 border border-slate-300 rounded-lg text-xs md:text-sm">
        <button id="btn-filter-apply" class="px-3 md:px-4 py-1.5 md:py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-xs md:text-sm font-medium">Terapkan</button>
      </div>
      <div class="flex gap-2 md:gap-3 mb-4 md:mb-6">
        <button id="btn-export-excel" class="flex-1 px-4 md:px-5 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Excel
        </button>
        <button id="btn-export-pdf" class="flex-1 px-4 md:px-5 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
          PDF
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Total Pemasukan</p>
          <p id="stat-income" class="text-lg md:text-2xl font-bold text-emerald-600">Rp 0</p>
        </div>
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Keuntungan</p>
          <p id="stat-profit" class="text-lg md:text-2xl font-bold text-slate-800">Rp 0</p>
        </div>
        <div class="stat-card">
          <p class="text-xs md:text-sm text-slate-500 mb-1">Total Modal</p>
          <p id="stat-expense" class="text-lg md:text-2xl font-bold text-rose-500">Rp 0</p>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <div class="stat-card">
          <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Grafik Keuangan</h2>
          <canvas id="finance-chart" height="260"></canvas>
        </div>
        <div class="stat-card">
          <h2 class="text-base md:text-lg font-semibold text-slate-700 mb-3 md:mb-4">Riwayat Transaksi</h2>
          <div class="overflow-x-auto max-h-[320px] md:max-h-[400px] overflow-y-auto">
            <table class="w-full text-xs md:text-sm">
              <thead><tr class="border-b border-slate-200 text-slate-500">
                <th class="text-left py-2 px-1 md:px-2">Tanggal</th>
                <th class="text-left py-2 px-1 md:px-2">Tipe</th>
                <th class="text-left py-2 px-1 md:px-2 hidden md:table-cell">Keterangan</th>
                <th class="text-right py-2 px-1 md:px-2">Jumlah</th>
              </tr></thead>
              <tbody id="tx-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  static #bindEvents() {
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.#filterType = btn.dataset.filter
        document.querySelectorAll('[data-filter]').forEach(b => {
          b.className = `px-4 py-2 text-sm font-medium transition ${b.dataset.filter === this.#filterType ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`
        })
        this.#loadData()
      })
    })
    document.getElementById('btn-filter-apply')?.addEventListener('click', () => {
      this.#startDate = document.getElementById('filter-start').value || null
      this.#endDate = document.getElementById('filter-end').value || null
      this.#loadData()
    })
    document.getElementById('btn-export-excel')?.addEventListener('click', () => this.#exportExcel())
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => this.#exportPDF())
  }

  static async #loadData() {
    App.showLoading()
    let startDate = this.#startDate
    let endDate = this.#endDate
    const now = new Date()

    if (!startDate && !endDate) {
      switch (this.#filterType) {
        case 'harian':
          startDate = now.toISOString().slice(0, 10)
          endDate = startDate
          break
        case 'mingguan': {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          startDate = weekAgo.toISOString().slice(0, 10)
          endDate = now.toISOString().slice(0, 10)
          break
        }
        case 'bulanan':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
          endDate = now.toISOString().slice(0, 10)
          break
        case 'tahunan':
          startDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
          endDate = now.toISOString().slice(0, 10)
          break
      }
    }

    const stats = await Database.getDashboardStats(startDate, endDate)
    App.hideLoading()

    document.getElementById('stat-income').textContent = 'Rp ' + (stats.income || 0).toLocaleString()
    document.getElementById('stat-profit').textContent = 'Rp ' + (stats.grossProfit || 0).toLocaleString()
    document.getElementById('stat-expense').textContent = 'Rp ' + (stats.totalModal || 0).toLocaleString()

    this.#renderChart(stats)
    this.#renderTable(stats.transactions)
  }

  static #renderChart(stats) {
    if (this.#chart) { this.#chart.destroy(); this.#chart = null }

    const ctx = document.getElementById('finance-chart')
    if (!ctx) return

    const txns = stats.transactions || []
    const grouped = {}
    txns.forEach(t => {
      const date = new Date(t.created_at).toISOString().slice(0, 10)
      if (!grouped[date]) grouped[date] = { income: 0, expense: 0 }
      if (t.type === 'pemasukan') grouped[date].income += Number(t.total_amount || 0)
      else grouped[date].expense += Number(t.total_amount || 0)
    })

    const labels = Object.keys(grouped).sort()
    const incomeData = labels.map(l => grouped[l].income)
    const expenseData = labels.map(l => grouped[l].expense)

    if (typeof Chart !== 'undefined') {
      this.#chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['Tidak ada data'],
          datasets: [
            { label: 'Pemasukan', data: labels.length ? incomeData : [0], backgroundColor: '#10B981', borderRadius: 6 },
            { label: 'Pengeluaran', data: labels.length ? expenseData : [0], backgroundColor: '#F43F5E', borderRadius: 6 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => 'Rp ' + v.toLocaleString() } },
            x: { grid: { display: false } },
          },
        },
      })
    }
  }

  static #renderTable(transactions) {
    const tbody = document.getElementById('tx-table-body')
    if (!tbody) return
    const isMobile = window.innerWidth < 768

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${isMobile ? 3 : 4}" class="text-center py-6 md:py-8 text-slate-400 text-sm">Tidak ada transaksi</td></tr>`
      return
    }

    tbody.innerHTML = transactions.map(t => `
      <tr class="border-b border-slate-100">
        <td class="py-2 px-1 md:px-2 text-slate-600 whitespace-nowrap text-xs md:text-sm">${new Date(t.created_at).toLocaleString('id-ID', isMobile ? { hour: undefined, minute: undefined } : {})}</td>
        <td class="py-2 px-1 md:px-2"><span class="badge text-xs ${t.type === 'pemasukan' ? 'badge-success' : 'badge-danger'}">${t.type === 'pemasukan' ? 'Masuk' : 'Keluar'}</span></td>
        <td class="py-2 px-1 md:px-2 text-slate-600 text-xs md:text-sm hidden md:table-cell">${t.description || '-'}</td>
        <td class="py-2 px-1 md:px-2 text-right font-medium text-xs md:text-sm ${t.type === 'pemasukan' ? 'text-emerald-600' : 'text-rose-500'}">${t.type === 'pemasukan' ? '+' : '-'} Rp ${Number(t.total_amount || 0).toLocaleString()}</td>
      </tr>
    `).join('')
  }

  static async #exportExcel() {
    App.showLoading()
    const stats = await Database.getDashboardStats(this.#startDate, this.#endDate)
    App.hideLoading()

    if (typeof XLSX === 'undefined') return alert('Pustaka XLSX belum tersedia. Muat ulang halaman.')

    const fmt = v => v ? 'Rp ' + Number(v).toLocaleString('id-ID') : ''
    const rows = []
    let no = 0
    for (const t of stats.transactions || []) {
      no++
      let pemasukan = 0, keuntungan = 0, modal = 0
      if (t.type === 'pemasukan') {
        pemasukan = Number(t.total_amount || 0)
        let hpp = 0
        const items = t.transaction_items || []
        for (const item of items) {
          const pp = item.products?.purchase_price || item.purchase_price || 0
          hpp += (item.quantity || 0) * Number(pp)
        }
        keuntungan = pemasukan - hpp
      } else {
        modal = Number(t.total_amount || 0)
      }
      rows.push({ No: no, Tanggal: new Date(t.created_at).toLocaleString('id-ID'), Tipe: t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran', Pemasukan: fmt(pemasukan), Keuntungan: fmt(keuntungan), Modal: fmt(modal) })
    }

    rows.push({ No: '', Tanggal: '', Tipe: 'TOTAL PEMASUKAN', Pemasukan: fmt(stats.income), Keuntungan: '', Modal: '' })
    rows.push({ No: '', Tanggal: '', Tipe: 'KEUNTUNGAN', Pemasukan: '', Keuntungan: fmt(stats.grossProfit), Modal: '' })
    rows.push({ No: '', Tanggal: '', Tipe: 'TOTAL MODAL', Pemasukan: '', Keuntungan: '', Modal: fmt(stats.totalModal) })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan')
    XLSX.writeFile(wb, `Laporan_Keuangan_NailaMart_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  static async #exportPDF() {
    App.showLoading()
    const stats = await Database.getDashboardStats(this.#startDate, this.#endDate)
    App.hideLoading()

    if (typeof jspdf === 'undefined' || typeof window.jspdf === 'undefined')
      return alert('Pustaka jsPDF belum tersedia. Muat ulang halaman.')

    const { jsPDF } = window.jspdf
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('NAILA MART', 105, 20, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text('Laporan Keuangan', 105, 28, { align: 'center' })
    doc.text(`Periode: ${this.#startDate || '-'} s/d ${this.#endDate || '-'}`, 105, 35, { align: 'center' })

    doc.setFontSize(10)
    doc.text(`Total Pemasukan: Rp ${(stats.income || 0).toLocaleString()}`, 14, 48)
    doc.setFont('helvetica', 'bold')
    doc.text(`Keuntungan: Rp ${(stats.grossProfit || 0).toLocaleString()}`, 14, 56)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Modal: Rp ${(stats.totalModal || 0).toLocaleString()}`, 14, 64)

    const rows = (stats.transactions || []).map(t => [
      new Date(t.created_at).toLocaleString('id-ID'),
      t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
      t.description || '-',
      'Rp ' + Number(t.total_amount || 0).toLocaleString(),
    ])

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        startY: 68,
        head: [['Tanggal', 'Tipe', 'Keterangan', 'Jumlah']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
      })
    }

    doc.save(`Laporan_NailaMart_${new Date().toISOString().slice(0, 10)}.pdf`)
  }
}
