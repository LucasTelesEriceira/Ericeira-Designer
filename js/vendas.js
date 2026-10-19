function vendasApp() {
  return {
    loading: true,
    sales: [],
    products: [],
    clients: [],
    saleSearch: '',

    openFormSale: false,
    openDetailsSale: false,
    selectedSale: null,

    formSale: {
      id: '',
      client_id: '',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      items: []
    },

    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await Promise.all([
        this.fetchSales(),
        this.fetchProducts(),
        this.fetchClients()
      ])
      this.loading = false

      this.$watch('saleSearch', () => {
        this.displayedCount = this.pageSize
      })
    },

    getUserRole() {
      return typeof getUserRole === 'function' ? getUserRole() : (localStorage.getItem('userRole') || 'admin')
    },

    getUserRoleLabel() {
      return typeof getUserRoleLabel === 'function' ? getUserRoleLabel() : 'Administrador'
    },

    getUserDisplayName() {
      return typeof getUserDisplayName === 'function' ? getUserDisplayName() : (localStorage.getItem('userDisplayName') || 'Usuário')
    },

    logout() {
      if (typeof logout === 'function') {
        logout()
      } else {
        localStorage.clear()
        window.location.href = 'login.html'
      }
    },

    formatDate(date) {
      if (!date) return ''
      return typeof formatDate === 'function' ? formatDate(date) : date
    },

    formatCurrency(val) {
      if (typeof formatCurrency === 'function') {
        return formatCurrency(val)
      }
      return 'R$ ' + parseFloat(val || 0).toFixed(2)
    },

    async fetchSales() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/sales',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        const raw = Array.isArray(res) ? res : (res.sales || [])
        
        this.sales = raw.map(s => ({
          id: s.id,
          client_id: s.client_id,
          client_name: s.client_name || 'Cliente Avulso',
          client_whatsapp: s.client_whatsapp || '',
          total: s.total !== undefined ? parseFloat(s.total) : (parseFloat(s.total_amount) || 0),
          status: s.status || 'completed',
          date: s.date || '',
          created_at: s.created_at || '',
          items: Array.isArray(s.items) ? s.items : []
        }))
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
      }
    },

    async fetchProducts() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/products',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        this.products = Array.isArray(res) ? res : (res.products || [])
      } catch (error) {
        console.error('Erro ao buscar produtos:', error)
      }
    },

    async fetchClients() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        this.clients = Array.isArray(res) ? res : (res.clients || [])
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    filteredSales() {
      if (!this.saleSearch) return this.sales
      const q = this.saleSearch.toLowerCase().trim()
      return this.sales.filter(s => {
        const id = '#' + s.id
        const idNum = String(s.id)
        const client = (s.client_name || '').toLowerCase()
        const whatsapp = s.client_whatsapp || ''
        const status = (s.status || '').toLowerCase()
        const itemMatch = (s.items || []).some(i => (i.product_name || '').toLowerCase().includes(q))
        return id.includes(q) || idNum.includes(q) || client.includes(q) || whatsapp.includes(q) || status.includes(q) || itemMatch
      })
    },

    paginatedSales() {
      return this.filteredSales().slice(0, this.displayedCount)
    },

    hasMoreSales() {
      return this.displayedCount < this.filteredSales().length
    },

    loadMoreSales() {
      if (this.hasMoreSales()) {
        this.displayedCount += this.pageSize
      }
    },

    openNewSaleForm() {
      const defaultProduct = this.products[0]
      this.formSale = {
        id: '',
        client_id: this.clients[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        items: defaultProduct ? [{
          product_id: defaultProduct.id,
          quantity: 1,
          unit_price: defaultProduct.sale_price || 0
        }] : []
      }
      this.openFormSale = true
    },

    openSaleDetails(sale) {
      this.selectedSale = sale
      this.openDetailsSale = true
    },

    addItemToSale() {
      const defaultProduct = this.products[0]
      this.formSale.items.push({
        product_id: defaultProduct ? defaultProduct.id : '',
        quantity: 1,
        unit_price: defaultProduct ? defaultProduct.sale_price : 0
      })
    },

    removeItemFromSale(index) {
      this.formSale.items.splice(index, 1)
    },

    onProductChange(index) {
      const item = this.formSale.items[index]
      const prod = this.products.find(p => p.id === parseInt(item.product_id))
      if (prod) {
        item.unit_price = prod.sale_price || 0
      }
    },

    calculateTotalSale() {
      let total = 0
      for (const item of this.formSale.items) {
        total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0)
      }
      return total
    },

    async postSale() {
      const f = this.formSale
      if (f.items.length === 0) {
        showToast('Adicione ao menos um produto à venda', 'warning')
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/sales',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              client_id: f.client_id ? parseInt(f.client_id) : null,
              date: f.date,
              status: f.status,
              items: f.items.map(i => ({
                product_id: parseInt(i.product_id),
                quantity: parseInt(i.quantity),
                unit_price: parseFloat(i.unit_price || 0)
              }))
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao registrar venda'))
          return
        }

        if (typeof invalidateCache === 'function') {
          invalidateCache('sales')
          invalidateCache('products')
          invalidateCache('dashboard')
        }

        showToast('Venda realizada com sucesso (Estoque atualizado)', 'success')
        this.openFormSale = false
        this.loading = true
        await this.fetchSales()
        await this.fetchProducts()
        this.loading = false
      } catch (error) {
        console.error('Erro ao realizar venda:', error)
        showToast('Erro ao realizar venda')
      }
    },

    async deleteSale(sale) {
      if (!confirm(`Tem certeza que deseja excluir a Venda #${sale.id} (${sale.client_name || 'Cliente Avulso'})?\n\nOs produtos vendidos serão estornados automaticamente de volta ao estoque.`)) {
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + `/json/api/v1/sales/${sale.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ id: sale.id })
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const err = await response.json()
          showToast('Erro: ' + (err.error || 'Falha ao excluir venda'))
          return
        }

        if (typeof invalidateCache === 'function') {
          invalidateCache('sales')
          invalidateCache('products')
          invalidateCache('dashboard')
        }

        showToast('Venda excluída com sucesso e estoque estornado!', 'success')
        this.sales = this.sales.filter(s => s.id !== sale.id)
        if (this.selectedSale && this.selectedSale.id === sale.id) {
          this.openDetailsSale = false
          this.selectedSale = null
        }
      } catch (error) {
        console.error('Erro ao excluir venda:', error)
        showToast('Erro ao excluir venda')
      }
    }
  }
}
