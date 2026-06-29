function historicoApp() {
  return {
    concludedScheduling: [],
    loading: true,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchConcluded()
      this.loading = false
    },

    async fetchConcluded() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/concluded',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.concludedScheduling = await response.json()
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    },
  }
}
