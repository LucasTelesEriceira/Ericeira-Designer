function servicosApp() {
  return {
    services: [],
    loading: true,
    openFormService: false,
    formService: { id: '', nome: '', valor: '', duracao: '' },

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchServices()
      this.loading = false
    },

    async fetchServices() {
      const cacheKey = 'cached_services'
      const cacheTime = 5 * 60 * 1000
      const cached = localStorage.getItem(cacheKey)
      const cachedData = cached ? JSON.parse(cached) : null

      if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
        this.services = cachedData.services
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services'
        )
        this.services = await response.json()
        this.services.sort((a, b) => a.nome.localeCompare(b.nome))

        localStorage.setItem(cacheKey, JSON.stringify({
          services: this.services,
          timestamp: Date.now(),
        }))
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    invalidateServicesCache() {
      localStorage.removeItem('cached_services')
    },

    async postService() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: this.formService.id,
              name: this.formService.nome.trim(),
              price: this.formService.valor,
              duration: this.formService.duracao,
              empresas_id: 1,
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        const newService = await response.json()
        this.invalidateServicesCache()
        this.services.push(newService.meta_input)
        this.services.sort((a, b) => a.nome.localeCompare(b.nome))
        this.formService = { id: '', nome: '', valor: '', duracao: '' }
        this.openFormService = false
      } catch (error) {
        console.error('Erro ao registrar serviço:', error)
      }
    },

    async deleteService(id) {
      if (!confirm('Tem certeza que deseja excluir este serviço?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services',
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ id }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao excluir'))
          return
        }

        this.invalidateServicesCache()
        this.services = this.services.filter((s) => s.id !== id)
      } catch (error) {
        console.error('Erro ao excluir serviço:', error)
      }
    },
  }
}
