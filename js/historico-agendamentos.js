function historicoApp() {
  return {
    concludedScheduling: [],
    loading: true,
    searchQuery: '',
    serviceFilter: '',
    professionalFilter: '',
    itemsPerPage: 15,
    displayedCount: 15,
    servicesList: [],
    professionalsList: [],

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await Promise.all([
        this.fetchConcluded(),
        this.fetchServices(),
        this.fetchProfessionals()
      ])
      this.loading = false

      this.$watch('searchQuery', () => { this.displayedCount = this.itemsPerPage })
      this.$watch('serviceFilter', () => { this.displayedCount = this.itemsPerPage })
      this.$watch('professionalFilter', () => { this.displayedCount = this.itemsPerPage })
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

    logout() {
      logout()
    },

    formatDate(dateStr) {
      return formatDate(dateStr)
    },

    async fetchServices() {
      try {
        const response = await fetch(getUrlBase()[getEnv()] + '/json/api/v1/services')
        const res = await response.json()
        this.servicesList = Array.isArray(res) ? res : (res.services || [])
      } catch (e) {
        console.error('Erro ao buscar serviços:', e)
      }
    },

    async fetchProfessionals() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          { headers: getAuthHeaders() }
        )
        const res = await response.json()
        this.professionalsList = Array.isArray(res) ? res : (res.professionals || [])
      } catch (e) {
        console.error('Erro ao buscar profissionais:', e)
      }
    },

    async fetchConcluded() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/concluded',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        const raw = Array.isArray(res) ? res : (res.schedulings || [])

        this.concludedScheduling = raw.map(item => ({
          id: item.id,
          name: item.client_name || item.name || 'Cliente',
          whatsapp: item.client_whatsapp || item.whatsapp || '',
          service: item.service_name || item.service || '',
          professional: item.professional_name || item.professional || 'Profissional',
          date: item.date || '',
          time: item.time || '',
          duration: item.duration || 60,
          status: item.status || 'concluded',
          service_order_id: item.service_order_id || null,
          client_id: item.client_id || item.clienteId || null,
          professional_id: item.professional_id || null
        }))
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    },

    get filteredConcluded() {
      return this.concludedScheduling.filter(item => {
        const matchSearch = !this.searchQuery || 
          (item.name && item.name.toLowerCase().includes(this.searchQuery.toLowerCase())) ||
          (item.whatsapp && item.whatsapp.includes(this.searchQuery))
        
        const matchService = !this.serviceFilter || item.service === this.serviceFilter
        const matchProf = !this.professionalFilter || item.professional === this.professionalFilter

        return matchSearch && matchService && matchProf
      })
    },

    get paginatedConcluded() {
      return this.filteredConcluded.slice(0, this.displayedCount)
    },

    get hasMoreConcluded() {
      return this.displayedCount < this.filteredConcluded.length
    },

    loadMoreConcluded() {
      if (this.hasMoreConcluded) {
        this.displayedCount += this.itemsPerPage
      }
    },

    openWhatsapp(item) {
      if (!item.whatsapp) return
      const cleanPhone = item.whatsapp.replace(/\D/g, '')
      if (!cleanPhone) return
      const phone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone
      const text = encodeURIComponent(`Olá ${item.name}! Agradecemos a preferência pelo seu atendimento de ${item.service} no Ericeira Designer. Como foi sua experiência?`)
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
    }
  }
}
