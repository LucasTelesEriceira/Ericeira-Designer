function dashboardApp() {
  return {
    schedulingToday: [],
    schedulingTomorrow: [],
    schedulingOther_days: [],
    servicesCount: 0,
    inputInvoiceCount: 0,
    expensesCount: 0,
    clientCount: 0,
    concludedCount: 0,
    todayLabel: getTodayLabel(),

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      await Promise.all([
        this.fetchSchedulingToday(),
        this.fetchSchedulingTomorrow(),
        this.fetchSchedulingOther_days(),
        this.fetchServices(),
        this.fetchInputInvoices(),
        this.fetchExpenses(),
        this.fetchConcludedCount(),
      ])
    },

    async fetchSchedulingToday() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/today',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingToday = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos de hoje:', error)
      }
    },

    async fetchSchedulingTomorrow() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/tomorrow',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingTomorrow = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos de amanhã:', error)
      }
    },

    async fetchSchedulingOther_days() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/other_days',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingOther_days = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos futuros:', error)
      }
    },

    async fetchServices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services'
        )
        const data = await response.json()
        this.servicesCount = data.length
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    async fetchInputInvoices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/inputInvoices',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const data = await response.json()
        this.inputInvoiceCount = data.length
      } catch (error) {
        console.error('Erro ao buscar faturas:', error)
      }
    },

    async fetchExpenses() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const data = await response.json()
        this.expensesCount = data.length
      } catch (error) {
        console.error('Erro ao buscar despesas:', error)
      }
    },

    async fetchConcludedCount() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/concluded',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const data = await response.json()
        this.concludedCount = data.length
      } catch (error) {
        console.error('Erro ao buscar concluídos:', error)
      }
    },
  }
}
