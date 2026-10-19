function servicosApp() {
  return {
    errors: {},
    services: [],
    products: [],
    loading: true,
    openFormService: false,
    formService: { id: '', name: '', price: '', duration: '', description: '', default_items: [] },

    serviceSearch: '',
    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }

      this.$watch('serviceSearch', () => {
        this.displayedCount = this.pageSize
      })

      this.loading = true
      await Promise.all([
        this.fetchServices(),
        this.fetchProducts()
      ])
      this.loading = false
    },

    filteredServices() {
      const q = (this.serviceSearch || '').toLowerCase().trim()
      if (!q) return this.services
      return this.services.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
      )
    },

    paginatedServices() {
      return this.filteredServices().slice(0, this.displayedCount)
    },

    hasMoreServices() {
      return this.displayedCount < this.filteredServices().length
    },

    loadMoreServices() {
      if (this.hasMoreServices()) {
        this.displayedCount += this.pageSize
      }
    },

    processServices(result) {
      const rawList = Array.isArray(result) ? result : (result.services || [])
      this.services = rawList.map(s => ({
        id: s.id,
        name: s.name || s.nome || '',
        price: s.price !== undefined ? s.price : (s.valor || 0),
        duration: s.duration !== undefined ? s.duration : (s.duracao || 60),
        description: s.description || s.descricao || '',
        active: s.active !== undefined ? s.active : 1,
        default_items: Array.isArray(s.default_items) ? s.default_items : [],
        estimated_cost: s.estimated_cost !== undefined ? s.estimated_cost : 0
      }))
      this.services.sort((a, b) => a.name.localeCompare(b.name))
    },

    async fetchProducts() {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/products',
          { headers: getAuthHeaders() },
          {
            ttl: 60000,
            onUpdate: (freshRes) => {
              const list = Array.isArray(freshRes) ? freshRes : (freshRes.products || [])
              this.products = list.filter(p => p.active !== false && p.active !== 0)
            }
          }
        )
        if (!res) return
        const list = Array.isArray(res) ? res : (res.products || [])
        this.products = list.filter(p => p.active !== false && p.active !== 0)
      } catch (error) {
        console.error('Erro ao buscar produtos para insumos:', error)
      }
    },

    async fetchServices(force = false) {
      try {
        const result = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/services',
          {},
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshResult) => {
              this.processServices(freshResult)
            }
          }
        )
        if (!result) return
        this.processServices(result)
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },


    openNewServiceForm() {
      this.formService = { id: '', name: '', price: '', duration: 60, description: '', default_items: [] }
      this.errors = {}
      this.openFormService = true
    },

    openEditServiceForm(s) {
      this.formService = {
        id: s.id,
        name: s.name || s.nome || '',
        price: s.price !== undefined ? s.price : (s.valor || ''),
        duration: s.duration !== undefined ? s.duration : (s.duracao || 60),
        description: s.description || '',
        default_items: Array.isArray(s.default_items)
          ? s.default_items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity || 1
            }))
          : []
      }
      this.errors = {}
      this.openFormService = true
    },

    addDefaultItem() {
      const defaultProduct = this.products[0]
      this.formService.default_items.push({
        product_id: defaultProduct ? defaultProduct.id : '',
        quantity: 1
      })
    },

    removeDefaultItem(index) {
      this.formService.default_items.splice(index, 1)
    },

    calculateServiceEstimatedCost() {
      if (!this.formService.default_items || !Array.isArray(this.formService.default_items)) return 0
      return this.formService.default_items.reduce((total, item) => {
        const p = this.products.find(prod => prod.id === parseInt(item.product_id))
        const cost = p ? parseFloat(p.cost_price || 0) : 0
        const qty = parseFloat(item.quantity || 0)
        return total + (cost * qty)
      }, 0)
    },

    validateServiceForm() {
      this.errors = {}
      const f = this.formService
      if (!f.name || !f.name.trim()) this.errors.name = 'Nome é obrigatório'
      if (!f.price) this.errors.price = 'Valor é obrigatório'
      if (!f.duration) this.errors.duration = 'Duração é obrigatória'
      return Object.keys(this.errors).length === 0
    },

    async postService() {
      if (!this.validateServiceForm()) return
      try {
        const validItems = (this.formService.default_items || [])
          .filter(i => parseInt(i.product_id) > 0 && parseFloat(i.quantity) > 0)
          .map(i => ({
            product_id: parseInt(i.product_id),
            quantity: parseFloat(i.quantity)
          }))

        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: this.formService.id || 0,
              name: this.formService.name.trim(),
              price: parseFloat(this.formService.price),
              duration: parseInt(this.formService.duration),
              description: this.formService.description || '',
              default_items: validItems
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        showToast(this.formService.id ? 'Serviço atualizado com sucesso' : 'Serviço criado com sucesso', 'success')
        invalidateCache('services')
        invalidateCache('dashboard')
        this.openFormService = false
        this.loading = true
        await this.fetchServices(true)
        this.loading = false
      } catch (error) {
        console.error('Erro ao registrar serviço:', error)
        showToast('Erro ao salvar serviço')
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

        showToast('Serviço excluído com sucesso', 'success')
        invalidateCache('services')
        invalidateCache('dashboard')
        this.services = this.services.filter((s) => s.id !== id)
      } catch (error) {
        console.error('Erro ao excluir serviço:', error)

        showToast('Erro ao excluir serviço')
      }
    },
  }
}
