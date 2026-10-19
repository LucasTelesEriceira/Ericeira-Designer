function ordensServicoApp() {
  return {
    loading: true,
    serviceOrders: [],
    products: [],
    clients: [],
    professionals: [],
    services: [],

    openFormOrder: false,
    formOrder: {
      id: '',
      appointment_id: '',
      client_id: '',
      professional_id: '',
      service_id: '',
      status: 'in_progress',
      notes: '',
      items: [],
    },

    orderSearch: '',
    statusFilter: 'all',
    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }

      this.$watch('orderSearch', () => {
        this.displayedCount = this.pageSize
      })
      this.$watch('statusFilter', () => {
        this.displayedCount = this.pageSize
      })

      this.loading = true
      await Promise.all([
        this.fetchServiceOrders(),
        this.fetchProducts(),
        this.fetchClients(),
        this.fetchProfessionals(),
        this.fetchServices()
      ])
      this.loading = false
      this.checkQueryParams()
    },

    filteredOrders() {
      return this.serviceOrders.filter(os => {
        if (this.statusFilter !== 'all' && os.status !== this.statusFilter) return false
        const q = (this.orderSearch || '').toLowerCase().trim()
        if (!q) return true
        return (
          (os.id && String(os.id).includes(q)) ||
          (os.client_name && os.client_name.toLowerCase().includes(q)) ||
          (os.professional_name && os.professional_name.toLowerCase().includes(q)) ||
          (os.service_name && os.service_name.toLowerCase().includes(q)) ||
          (os.notes && os.notes.toLowerCase().includes(q))
        )
      })
    },

    paginatedOrders() {
      return this.filteredOrders().slice(0, this.displayedCount)
    },

    hasMoreOrders() {
      return this.displayedCount < this.filteredOrders().length
    },

    loadMoreOrders() {
      if (this.hasMoreOrders()) {
        this.displayedCount += this.pageSize
      }
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

    checkQueryParams() {
      const params = new URLSearchParams(window.location.search)
      const appointmentId = params.get('appointmentId')
      const clientId = params.get('clientId')
      const professionalId = params.get('professionalId')
      const serviceId = params.get('serviceId')

      if (appointmentId || clientId) {
        this.openNewOrderForm()
        if (appointmentId) this.formOrder.appointment_id = appointmentId
        if (clientId) this.formOrder.client_id = clientId
        if (professionalId) this.formOrder.professional_id = professionalId
        if (serviceId) {
          this.formOrder.service_id = serviceId
          this.loadDefaultServiceItems(serviceId, true)
        }
        window.history.replaceState({}, '', window.location.pathname)
      }
    },

    async fetchServiceOrders(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/service-orders',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 30000,
            onUpdate: (freshRes) => {
              this.serviceOrders = Array.isArray(freshRes) ? freshRes : (freshRes.service_orders || [])
            }
          }
        )
        if (!res) return
        this.serviceOrders = Array.isArray(res) ? res : (res.service_orders || [])
      } catch (error) {
        console.error('Erro ao buscar ordens de serviço:', error)
      }
    },

    async fetchProducts(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/products',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshRes) => {
              this.products = Array.isArray(freshRes) ? freshRes : (freshRes.products || [])
            }
          }
        )
        if (!res) return
        this.products = Array.isArray(res) ? res : (res.products || [])
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
      }
    },

    async fetchClients(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/clients',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshRes) => {
              this.clients = Array.isArray(freshRes) ? freshRes : (freshRes.clients || [])
            }
          }
        )
        if (!res) return
        this.clients = Array.isArray(res) ? res : (res.clients || [])
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    async fetchProfessionals(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshRes) => {
              this.professionals = Array.isArray(freshRes) ? freshRes : (freshRes.professionals || [])
            }
          }
        )
        if (!res) return
        this.professionals = Array.isArray(res) ? res : (res.professionals || [])
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error)
      }
    },

    async fetchServices(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/services',
          {},
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshRes) => {
              this.services = Array.isArray(freshRes) ? freshRes : (freshRes.services || [])
            }
          }
        )
        if (!res) return
        this.services = Array.isArray(res) ? res : (res.services || [])
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },


    loadDefaultServiceItems(serviceId, force = false) {
      const sId = parseInt(serviceId)
      if (!sId) return
      const s = this.services.find(srv => srv.id === sId)
      if (s && Array.isArray(s.default_items) && s.default_items.length > 0) {
        if (force || this.formOrder.items.length === 0) {
          this.formOrder.items = s.default_items.map(di => {
            const prod = this.products.find(p => p.id === parseInt(di.product_id))
            return {
              product_id: di.product_id,
              quantity: di.quantity || 1,
              unit_cost: prod ? (prod.cost_price || 0) : (di.unit_cost || 0)
            }
          })
        }
      }
    },

    onServiceChange() {
      if (this.formOrder.items.length === 0 || confirm('Deseja carregar os insumos padrão configurados para este serviço?')) {
        this.loadDefaultServiceItems(this.formOrder.service_id, true)
      }
    },

    openNewOrderForm() {
      const activeProfId = getProfessionalId()
      const defaultProf = this.professionals.find(p => p.id === parseInt(activeProfId)) || this.professionals[0]
      const defaultService = this.services[0]

      this.formOrder = {
        id: '',
        appointment_id: '',
        client_id: this.clients[0]?.id || '',
        professional_id: defaultProf ? defaultProf.id : '',
        service_id: defaultService ? defaultService.id : '',
        status: 'in_progress',
        notes: '',
        items: [],
      }

      if (defaultService) {
        this.loadDefaultServiceItems(defaultService.id, true)
      }

      this.openFormOrder = true
    },

    openEditOrderForm(order) {
      this.formOrder = {
        id: order.id,
        appointment_id: order.appointment_id || '',
        client_id: order.client_id || '',
        professional_id: order.professional_id || '',
        service_id: order.service_id || (this.services[0]?.id || ''),
        status: order.status || 'in_progress',
        notes: order.notes || '',
        items: Array.isArray(order.items) ? [...order.items] : [],
      }
      this.openFormOrder = true
    },

    addItemToOrder() {
      const defaultProduct = this.products[0]
      this.formOrder.items.push({
        product_id: defaultProduct ? defaultProduct.id : '',
        quantity: 1,
        unit_cost: defaultProduct ? defaultProduct.cost_price || 0 : 0
      })
    },

    removeItemFromOrder(index) {
      this.formOrder.items.splice(index, 1)
    },

    onProductChange(index) {
      const item = this.formOrder.items[index]
      const prod = this.products.find(p => p.id === parseInt(item.product_id))
      if (prod) {
        item.unit_cost = prod.cost_price || 0
      }
    },

    async postServiceOrder() {
      const f = this.formOrder
      if (!f.client_id) {
        showToast('Selecione um cliente para a Ordem de Serviço', 'warning')
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/service-orders',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              appointment_id: f.appointment_id ? parseInt(f.appointment_id) : null,
              client_id: parseInt(f.client_id),
              professional_id: f.professional_id ? parseInt(f.professional_id) : null,
              service_id: f.service_id ? parseInt(f.service_id) : null,
              status: f.status,
              notes: f.notes ? f.notes.trim() : '',
              items: f.items.map(i => ({
                product_id: parseInt(i.product_id),
                quantity: parseInt(i.quantity),
                unit_cost: parseFloat(i.unit_cost || 0)
              }))
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar Ordem de Serviço'))
          return
        }

        showToast('Ordem de Serviço salva com sucesso', 'success')
        invalidateCache('service-orders')
        invalidateCache('products')
        invalidateCache('dashboard')
        this.openFormOrder = false
        this.loading = true
        await this.fetchServiceOrders(true)
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar Ordem de Serviço:', error)

        showToast('Erro ao salvar Ordem de Serviço')
      }
    }
  }
}
