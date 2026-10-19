function dashboardApp() {
  return {
    loading: true,
    schedulingToday: [],
    schedulingTomorrow: [],
    schedulingOther_days: [],
    servicesCount: 0,
    inputInvoiceCount: 0,
    expensesCount: 0,
    clientCount: 0,
    concludedCount: 0,
    monthRevenue: 0,
    monthExpenses: 0,
    monthProfit: 0,
    monthTicket: 0,
    todayLabel: getTodayLabel(),

    formatCurrency(val) {
      if (typeof formatCurrency === 'function') {
        return formatCurrency(val)
      }
      return 'R$ ' + parseFloat(val || 0).toFixed(2)
    },

    notificationPermission: typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default',
    canInstallPwa: false,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.loadSummary()

      this.notificationPermission = typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default'
      window.addEventListener('pwa-installable', () => {
        this.canInstallPwa = true
      })
      if (window.deferredInstallPrompt) {
        this.canInstallPwa = true
      }

      if (typeof startAppointmentMonitor === 'function') {
        startAppointmentMonitor({
          onSync: () => this.loadSummary(),
          intervalMs: 25000
        })
      }
    },

    async toggleNotificationPermission() {
      if (this.notificationPermission === 'granted') {
        if (typeof playAppointmentChime === 'function') playAppointmentChime()
        if (typeof showToast === 'function') showToast('Notificações ativas! Som de teste reproduzido.', 'success')
        return
      }
      if (typeof requestNotificationPermission === 'function') {
        await requestNotificationPermission()
        this.notificationPermission = typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default'
      }
    },

    installPwa() {
      if (typeof promptPwaInstall === 'function') promptPwaInstall()
    },

    getUserRole() {
      return getUserRole()
    },

    getUserRoleLabel() {
      return getUserRoleLabel()
    },

    getUserDisplayName() {
      return getUserDisplayName()
    },

    hasPermission(roles) {
      return hasPermission(roles)
    },

    applySummary(data) {
      if (!data) return
      // Arrays preenchidos garantem compatibilidade imediata com schedulingToday.length no HTML
      this.schedulingToday = new Array(data.today_count || 0).fill(null)
      this.schedulingTomorrow = new Array(data.tomorrow_count || 0).fill(null)
      this.schedulingOther_days = new Array(data.other_days_count || 0).fill(null)
      this.servicesCount = data.services_count || 0
      this.inputInvoiceCount = data.payments_count || 0
      this.expensesCount = data.expenses_count || 0
      this.clientCount = data.clients_count || 0
      this.concludedCount = data.concluded_count || 0
      this.monthRevenue = data.month_revenue || 0
      this.monthExpenses = data.month_expenses || 0
      this.monthProfit = data.month_profit || 0
      this.monthTicket = data.month_ticket || 0
      this.loading = false
    },

    async loadSummary() {
      const url = getUrlBase()[getEnv()] + '/json/api/v1/dashboard/summary'
      try {
        // Reduz de 8 requisições pesadas para 1 única requisição leve com cache SWR
        const data = await fetchWithCache(
          url,
          { headers: getAuthHeaders() },
          {
            ttl: 20000, // 20s de frescor
            onUpdate: (freshData) => {
              this.applySummary(freshData)
            }
          }
        )
        if (data) {
          this.applySummary(data)
        }
      } catch (error) {
        console.error('Erro ao carregar resumo do painel:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
