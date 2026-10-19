function produtosApp() {
  return {
    products: [],
    movements: [],
    loading: true,
    activeTab: 'products', // 'products' ou 'movements'
    
    openFormProduct: false,
    formProduct: {
      id: '',
      name: '',
      sale_price: '',
      cost_price: '',
      stock_quantity: 0,
      minimum_stock: 5,
      description: '',
      active: 1
    },

    openFormMovement: false,
    formMovement: {
      product_id: '',
      type: 'purchase',
      quantity: 1,
      unit_cost: '',
      notes: ''
    },

    errors: {},

    productSearch: '',
    movementSearch: '',
    pageSize: 15,
    displayedProductsCount: 15,
    displayedMovementsCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }

      this.$watch('productSearch', () => {
        this.displayedProductsCount = this.pageSize
      })
      this.$watch('movementSearch', () => {
        this.displayedMovementsCount = this.pageSize
      })
      this.$watch('activeTab', () => {
        this.displayedProductsCount = this.pageSize
        this.displayedMovementsCount = this.pageSize
      })

      this.loading = true
      await Promise.all([
        this.fetchProducts(),
        this.fetchMovements()
      ])
      this.loading = false
    },

    filteredProducts() {
      const q = (this.productSearch || '').toLowerCase().trim()
      if (!q) return this.products
      return this.products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      )
    },

    paginatedProducts() {
      return this.filteredProducts().slice(0, this.displayedProductsCount)
    },

    hasMoreProducts() {
      return this.displayedProductsCount < this.filteredProducts().length
    },

    loadMoreProducts() {
      if (this.hasMoreProducts()) {
        this.displayedProductsCount += this.pageSize
      }
    },

    filteredMovements() {
      const q = (this.movementSearch || '').toLowerCase().trim()
      if (!q) return this.movements
      return this.movements.filter(m =>
        (m.product_name && m.product_name.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      )
    },

    paginatedMovements() {
      return this.filteredMovements().slice(0, this.displayedMovementsCount)
    },

    hasMoreMovements() {
      return this.displayedMovementsCount < this.filteredMovements().length
    },

    loadMoreMovements() {
      if (this.hasMoreMovements()) {
        this.displayedMovementsCount += this.pageSize
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

    async fetchMovements(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/inventory-movements',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 30000,
            onUpdate: (freshRes) => {
              this.movements = Array.isArray(freshRes) ? freshRes : (freshRes.movements || [])
            }
          }
        )
        if (!res) return
        this.movements = Array.isArray(res) ? res : (res.movements || [])
      } catch (error) {
        console.error('Erro ao buscar movimentações:', error)
      }
    },


    openNewProductForm() {
      this.formProduct = {
        id: '',
        name: '',
        sale_price: '',
        cost_price: '',
        stock_quantity: 0,
        minimum_stock: 5,
        description: '',
        active: 1
      }
      this.errors = {}
      this.openFormProduct = true
    },

    openEditProductForm(p) {
      this.formProduct = {
        id: p.id,
        name: p.name || '',
        sale_price: p.sale_price !== undefined ? p.sale_price : '',
        cost_price: p.cost_price !== undefined ? p.cost_price : '',
        stock_quantity: p.stock_quantity !== undefined ? p.stock_quantity : 0,
        minimum_stock: p.minimum_stock !== undefined ? p.minimum_stock : 5,
        description: p.description || '',
        active: p.active !== undefined ? p.active : 1
      }
      this.errors = {}
      this.openFormProduct = true
    },

    validateProductForm() {
      this.errors = {}
      const f = this.formProduct
      if (!f.name || !f.name.trim()) this.errors.name = 'Nome é obrigatório'
      if (f.sale_price === '' || parseFloat(f.sale_price) < 0) this.errors.sale_price = 'Informe um preço de venda válido'
      return Object.keys(this.errors).length === 0
    },

    async postProduct() {
      if (!this.validateProductForm()) return
      try {
        const f = this.formProduct
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/products',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              name: f.name.trim(),
              sale_price: parseFloat(f.sale_price),
              cost_price: f.cost_price ? parseFloat(f.cost_price) : 0,
              stock_quantity: parseInt(f.stock_quantity || 0),
              minimum_stock: parseInt(f.minimum_stock || 5),
              description: f.description || '',
              active: f.active
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar produto'))
          return
        }

        showToast(f.id ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso', 'success')
        invalidateCache('products')
        invalidateCache('dashboard')
        this.openFormProduct = false
        this.loading = true
        await this.fetchProducts(true)
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar produto:', error)
        showToast('Erro ao salvar produto')
      }
    },

    async deleteProduct(id) {
      if (!confirm('Excluir este produto?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/products',
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
          showToast('Erro: ' + (error.error || 'Falha ao excluir produto'))
          return
        }

        showToast('Produto excluído com sucesso', 'success')
        invalidateCache('products')
        invalidateCache('dashboard')
        this.products = this.products.filter((p) => p.id !== id)
      } catch (error) {
        console.error('Erro ao excluir produto:', error)
        showToast('Erro ao excluir produto')
      }
    },

    openNewMovementForm(product = null) {
      this.formMovement = {
        product_id: product ? product.id : (this.products[0]?.id || ''),
        type: 'purchase',
        quantity: 1,
        unit_cost: product ? product.cost_price : '',
        notes: ''
      }
      this.errors = {}
      this.openFormMovement = true
    },

    async postMovement() {
      const f = this.formMovement
      if (!f.product_id || !f.quantity || f.quantity <= 0) {
        showToast('Preencha os campos obrigatórios', 'warning')
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/inventory-movements',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              product_id: parseInt(f.product_id),
              type: f.type,
              quantity: parseInt(f.quantity),
              unit_cost: f.unit_cost ? parseFloat(f.unit_cost) : 0,
              reference_type: 'manual',
              notes: f.notes || ''
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao registrar movimentação'))
          return
        }

        showToast('Movimentação registrada com sucesso', 'success')
        invalidateCache('products')
        invalidateCache('inventory-movements')
        invalidateCache('dashboard')
        this.openFormMovement = false
        this.loading = true
        await Promise.all([
          this.fetchProducts(true),
          this.fetchMovements(true)
        ])
        this.loading = false
      } catch (error) {
        console.error('Erro ao registrar movimentação:', error)
        showToast('Erro ao registrar movimentação')
      }
    }
  }
}
