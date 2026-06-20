function faturasApp() {
  return {
    inputInvoice: [],
    openFormInvoice: false,
    deletingInvoice: false,
    formInputInvoice: { items: [] },
    errors: {},
    services: [],
    paymentMethods: [
      { value: 'credit_card', label: 'Cartão de Crédito' },
      { value: 'debit_card', label: 'Cartão de Débito' },
      { value: 'pix', label: 'PIX' },
      { value: 'bank_transfer', label: 'Transferência' },
      { value: 'cash', label: 'Dinheiro' },
      { value: 'other', label: 'Outro' },
    ],

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      await this.fetchServices()
      await this.fetchInputInvoices()
      this.checkQueryParams()

      this.$watch(
        'formInputInvoice.items',
        () => {
          this.recalculateTotal()
        },
        { deep: true }
      )
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
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            services: this.services,
            timestamp: Date.now(),
          })
        )
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    recalculateTotal() {
      if (!this.formInputInvoice.items) return
      let total = 0
      for (const item of this.formInputInvoice.items) {
        const val = parseFloat(item.value) || 0
        const disc = parseFloat(item.discount) || 0
        total += val - disc
      }
      this.formInputInvoice.valueReceived = total > 0 ? total.toFixed(2) : ''
    },

    checkQueryParams() {
      const params = new URLSearchParams(window.location.search)
      const schedulingId = params.get('schedulingId')
      const name = params.get('name')
      const whatsapp = params.get('whatsapp')
      const date = params.get('date')
      const serviceParam = params.get('service')
      if (schedulingId) {
        let initialValue = ''
        if (serviceParam) {
          const svc = this.services.find((s) => s.nome === serviceParam)
          if (svc) initialValue = svc.preco || ''
        }

        this.formInputInvoice = {
          id: '',
          idScheduling: schedulingId,
          nome: name || '',
          whatsapp: whatsapp || '',
          valueReceived: '',
          transactionDate: date || new Date().toISOString().split('T')[0],
          paymentMethod: 'pix',
          status: 'confirmed',
          notes: '',
          items: [
            { service: serviceParam || '', value: initialValue, discount: '' },
          ],
        }
        this.errors = {}
        this.openFormInvoice = true
        window.history.replaceState({}, '', window.location.pathname)
      }
    },

    async fetchInputInvoices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/inputInvoices',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.inputInvoice = await response.json()
      } catch (error) {
        console.error('Erro ao buscar faturas:', error)
      }
    },

    openInvoiceForm(invoice) {
      if (invoice && invoice.id) {
        this.formInputInvoice = {
          id: invoice.id,
          idScheduling: invoice.idScheduling || '',
          nome: invoice.nome || '',
          whatsapp: invoice.whatsapp || '',
          valueReceived: invoice.valueReceived || '',
          transactionDate:
            invoice.transactionDate || new Date().toISOString().split('T')[0],
          paymentMethod: invoice.paymentMethod || 'pix',
          status: invoice.status || 'confirmed',
          notes: invoice.notes || '',
          items:
            invoice.items && invoice.items.length > 0
              ? invoice.items
              : [
                  {
                    service: '',
                    value: invoice.valueReceived || '',
                    discount: '',
                  },
                ],
        }
      } else {
        this.formInputInvoice = {
          id: '',
          idScheduling: '',
          nome: '',
          whatsapp: '',
          valueReceived: '',
          transactionDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'pix',
          status: 'confirmed',
          notes: '',
          items: [{ service: '', value: '', discount: '' }],
        }
      }
      this.errors = {}
      this.openFormInvoice = true
    },

    validateInvoiceForm() {
      this.errors = {}
      const f = this.formInputInvoice
      if (!f.nome || !f.nome.trim())
        this.errors.nome = 'Informe o nome do cliente'
      if (!f.valueReceived || parseFloat(f.valueReceived) <= 0)
        this.errors.valueReceived = 'O valor total deve ser maior que zero'
      if (!f.transactionDate) this.errors.transactionDate = 'Selecione a data'
      if (!f.paymentMethod)
        this.errors.paymentMethod = 'Selecione o método de pagamento'
      if (!f.status) this.errors.status = 'Selecione o status'
      return Object.keys(this.errors).length === 0
    },

    addItem() {
      this.formInputInvoice.items.push({ service: '', value: '', discount: '' })
    },

    removeItem(index) {
      this.formInputInvoice.items.splice(index, 1)
    },

    onServiceChange(index) {
      const sName = this.formInputInvoice.items[index].service
      const svc = this.services.find((s) => s.nome === sName)
      if (svc) {
        this.formInputInvoice.items[index].value = svc.preco || ''
      }
    },

    clearInvoiceError(field) {
      delete this.errors[field]
    },

    async postInputInvoice() {
      if (!this.validateInvoiceForm()) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/inputInvoices',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify(this.formInputInvoice),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          alert('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        const newInputInvoice = await response.json()
        if (this.formInputInvoice.id) {
          const index = this.inputInvoice.findIndex(
            (inv) => inv.id === this.formInputInvoice.id
          )
          if (index !== -1)
            this.inputInvoice[index] = newInputInvoice.meta_input
        } else {
          this.inputInvoice.push(newInputInvoice.meta_input)
        }
        this.formInputInvoice = {
          id: '',
          idScheduling: '',
          nome: '',
          whatsapp: '',
          valueReceived: '',
          transactionDate: '',
          paymentMethod: '',
          status: '',
          notes: '',
          items: [],
        }
        this.errors = {}
        this.openFormInvoice = false
      } catch (error) {
        console.error('Erro ao registrar fatura:', error)
      }
    },

    async cancelInvoice(invoice) {
      if (this.deletingInvoice) return
      this.deletingInvoice = true
      if (!confirm('Cancelar esta fatura?')) {
        this.deletingInvoice = false
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/inputInvoices',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: invoice.id,
              nome: invoice.nome,
              whatsapp: invoice.whatsapp,
              idScheduling: invoice.idScheduling || 0,
              valueReceived: invoice.valueReceived,
              transactionDate: invoice.transactionDate,
              paymentMethod: invoice.paymentMethod,
              notes: invoice.notes,
              status: 'cancelled',
            }),
          }
        )

        if (handleAuthError(response)) {
          this.deletingInvoice = false
          return
        }

        if (!response.ok) {
          const error = await response.json()
          alert('Erro: ' + (error.error || 'Falha ao cancelar'))
          this.deletingInvoice = false
          return
        }

        const index = this.inputInvoice.findIndex(
          (inv) => inv.id === invoice.id
        )
        if (index !== -1) {
          this.inputInvoice[index].status = 'cancelled'
        }
      } catch (error) {
        console.error('Erro ao cancelar fatura:', error)
      }
      this.deletingInvoice = false
    },
  }
}
