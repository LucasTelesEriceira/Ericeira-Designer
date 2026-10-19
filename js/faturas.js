function faturasApp() {
  return {
    inputInvoice: [],
    loading: true,
    openFormInvoice: false,
    deletingInvoice: false,
    formInputInvoice: { items: [] },
    subtotalValue: '0.00',
    totalDiscount: '0.00',
    errors: {},
    invoiceSearch: '',
    services: [],
    clients: [],
    paymentMethods: [
      { value: 'credit_card', label: 'Cartão de Crédito' },
      { value: 'debit_card', label: 'Cartão de Débito' },
      { value: 'pix', label: 'PIX' },
      { value: 'bank_transfer', label: 'Transferência' },
      { value: 'cash', label: 'Dinheiro' },
      { value: 'other', label: 'Outro' },
    ],

    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await Promise.all([
        this.fetchServices(),
        this.fetchClients(),
        this.fetchInputInvoices()
      ])
      this.loading = false
      this.checkQueryParams()

      this.$watch('invoiceSearch', () => {
        this.displayedCount = this.pageSize
      })

      this.$watch(
        'formInputInvoice.items',
        () => {
          this.recalculateTotal()
        },
        { deep: true }
      )
    },

    async fetchServices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services'
        )
        const result = await response.json()
        const rawList = Array.isArray(result) ? result : (result.services || [])

        this.services = rawList.map(s => ({
          id: s.id,
          name: s.name || s.nome || '',
          price: s.price !== undefined ? s.price : (s.valor || 0),
          duration: s.duration !== undefined ? s.duration : (s.duracao || 60),
          description: s.description || s.descricao || '',
          active: s.active !== undefined ? s.active : 1
        }))
        this.services.sort((a, b) => a.name.localeCompare(b.name))
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    async fetchClients() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients',
          { headers: getAuthHeaders() }
        )
        const result = await response.json()
        this.clients = Array.isArray(result) ? result : (result.clients || [])
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    recalculateTotal() {
      if (!this.formInputInvoice.items) return
      let subtotal = 0
      let tDiscount = 0
      for (const item of this.formInputInvoice.items) {
        const val = parseFloat(item.value || item.price) || 0
        const disc = parseFloat(item.discount) || 0
        subtotal += val
        tDiscount += disc
      }
      this.subtotalValue = subtotal > 0 ? subtotal.toFixed(2) : '0.00'
      this.totalDiscount = tDiscount > 0 ? tDiscount.toFixed(2) : '0.00'
      const totalFinal = subtotal - tDiscount
      this.formInputInvoice.valueReceived =
        totalFinal > 0 ? totalFinal.toFixed(2) : ''
    },

    checkQueryParams() {
      const params = new URLSearchParams(window.location.search)
      const schedulingId = params.get('schedulingId') || params.get('appointmentId')
      const serviceOrderId = params.get('serviceOrderId')
      const clientId = params.get('clientId') || params.get('client_id')
      let name = params.get('name')
      const whatsapp = params.get('whatsapp')
      const date = params.get('date')
      const serviceParam = params.get('service')

      if (clientId && !name) {
        const matchedClient = this.clients.find(c => c.id === parseInt(clientId))
        if (matchedClient) {
          name = matchedClient.name
        }
      }

      if (schedulingId || serviceOrderId || name || clientId) {
        let initialValue = ''
        if (serviceParam) {
          const svc = this.services.find((s) => s.name === serviceParam)
          if (svc) initialValue = svc.price || ''
        }

        const itemDescription = serviceParam || (serviceOrderId ? `Ordem de Serviço #${serviceOrderId}` : 'Atendimento')

        this.formInputInvoice = {
          id: '',
          client_id: clientId || '',
          idScheduling: schedulingId || '',
          serviceOrderId: serviceOrderId || '',
          nome: name || '',
          whatsapp: whatsapp || '',
          valueReceived: initialValue,
          transactionDate: date || new Date().toISOString().split('T')[0],
          paymentMethod: 'pix',
          status: 'completed',
          notes: serviceOrderId ? `Lançamento referente à Ordem de Serviço #${serviceOrderId}` : '',
          items: [
            { service: itemDescription, value: initialValue, discount: '' },
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
          getUrlBase()[getEnv()] + '/json/api/v1/payments',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        const raw = Array.isArray(res) ? res : (res.payments || [])
        
        this.inputInvoice = raw.map(p => ({
          id: p.id,
          client_id: p.client_id,
          nome: p.client_name || p.nome || 'Cliente',
          whatsapp: p.client_whatsapp || p.whatsapp || '',
          idScheduling: p.appointment_id || p.idScheduling || '',
          service_order_id: p.service_order_id || p.serviceOrderId || null,
          service_name: p.service_name || '',
          valueReceived: p.amount !== undefined ? p.amount : (p.valueReceived || 0),
          paymentMethod: p.payment_method || p.paymentMethod || 'pix',
          status: p.status === 'completed' ? 'confirmed' : p.status,
          transactionDate: p.paid_at ? p.paid_at.split(' ')[0] : (p.transactionDate || ''),
          created_at: p.created_at || '',
          items: [
            { service: p.service_name || '', value: p.amount || '', discount: '' }
          ]
        }))
      } catch (error) {
        console.error('Erro ao buscar recebimentos:', error)
      }
    },

    filteredInvoices() {
      if (!this.invoiceSearch) return this.inputInvoice
      const q = this.invoiceSearch.toLowerCase().trim()
      return this.inputInvoice.filter((inv) => {
        const nome = (inv.nome || '').toLowerCase()
        const service = (inv.service_name || '').toLowerCase()
        const os = inv.service_order_id ? String(inv.service_order_id) : ''
        const status = (inv.status || '').toLowerCase()
        const whatsapp = (inv.whatsapp || '')
        return nome.includes(q) || service.includes(q) || os.includes(q) || status.includes(q) || whatsapp.includes(q)
      })
    },

    paginatedInvoices() {
      return this.filteredInvoices().slice(0, this.displayedCount)
    },

    hasMoreInvoices() {
      return this.displayedCount < this.filteredInvoices().length
    },

    loadMoreInvoices() {
      if (this.hasMoreInvoices()) {
        this.displayedCount += this.pageSize
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

    openInvoiceForm(invoice) {
      if (invoice && invoice.id) {
        this.formInputInvoice = {
          id: invoice.id,
          client_id: invoice.client_id || '',
          idScheduling: invoice.idScheduling || '',
          serviceOrderId: invoice.service_order_id || '',
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
                    service: invoice.service_name || '',
                    value: invoice.valueReceived || '',
                    discount: '',
                  },
                ],
        }
      } else {
        this.formInputInvoice = {
          id: '',
          client_id: this.clients[0]?.id || '',
          idScheduling: '',
          serviceOrderId: '',
          nome: this.clients[0]?.name || '',
          whatsapp: this.clients[0]?.whatsapp || '',
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
      const svc = this.services.find((s) => s.name === sName)
      if (svc) {
        this.formInputInvoice.items[index].value = svc.price || ''
      }
    },

    onClientChange() {
      const c = this.clients.find((cl) => cl.id == this.formInputInvoice.client_id)
      if (c) {
        this.formInputInvoice.nome = c.name
        this.formInputInvoice.whatsapp = c.whatsapp || ''
      }
      this.clearInvoiceError('nome')
    },

    clearInvoiceError(field) {
      delete this.errors[field]
    },

    async postInputInvoice() {
      if (!this.validateInvoiceForm()) return

      const f = this.formInputInvoice
      let targetClientId = f.client_id ? parseInt(f.client_id) : 0

      if (targetClientId <= 0 && f.nome) {
        const found = this.clients.find(c => c.name.trim().toLowerCase() === f.nome.trim().toLowerCase() || (f.whatsapp && c.whatsapp === f.whatsapp))
        if (found) {
          targetClientId = found.id
        }
      }

      if (targetClientId <= 0 && this.clients.length > 0) {
        targetClientId = this.clients[0].id
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/payments',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              client_id: targetClientId,
              appointment_id: f.idScheduling ? parseInt(f.idScheduling) : null,
              service_order_id: f.serviceOrderId || f.service_order_id ? parseInt(f.serviceOrderId || f.service_order_id) : null,
              amount: parseFloat(f.valueReceived),
              payment_method: f.paymentMethod || 'pix',
              status: f.status === 'confirmed' ? 'completed' : (f.status || 'completed'),
              paid_at: f.transactionDate + ' 12:00:00'
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        showToast(f.id ? 'Recebimento atualizado com sucesso' : 'Recebimento registrado com sucesso', 'success')
        this.openFormInvoice = false
        this.loading = true
        await this.fetchInputInvoices()
        this.loading = false
      } catch (error) {
        console.error('Erro ao registrar recebimento:', error)
        showToast('Erro ao salvar recebimento')
      }
    },

    async cancelInvoice(invoice) {
      if (this.deletingInvoice) return
      this.deletingInvoice = true
      if (!confirm('Cancelar este recebimento?')) {
        this.deletingInvoice = false
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/payments',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: invoice.id,
              status: 'refunded',
            }),
          }
        )

        if (handleAuthError(response)) {
          this.deletingInvoice = false
          return
        }

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao estornar'))
          this.deletingInvoice = false
          return
        }

        showToast('Recebimento estornado com sucesso', 'success')
        const index = this.inputInvoice.findIndex(
          (inv) => inv.id === invoice.id
        )
        if (index !== -1) {
          this.inputInvoice[index].status = 'refunded'
        }
      } catch (error) {
        console.error('Erro ao cancelar recebimento:', error)
        showToast('Erro ao estornar recebimento')
      }
      this.deletingInvoice = false
    },

    async deleteOrCancelInvoice(invoice) {
      if (!confirm('Deseja realmente excluir este lançamento de fatura?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/payments/' + invoice.id,
          {
            method: 'DELETE',
            headers: getAuthHeaders(),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          // Fallback para estorno se o delete direto não puder ser realizado
          await this.cancelInvoice(invoice)
          return
        }

        showToast('Fatura excluída com sucesso', 'success')
        this.inputInvoice = this.inputInvoice.filter((inv) => inv.id !== invoice.id)
        if (typeof invalidateCache === 'function') {
          invalidateCache('payments')
          invalidateCache('dashboard')
        }
      } catch (error) {
        console.error('Erro ao excluir fatura:', error)
        showToast('Erro ao excluir fatura')
      }
    },
  }
}
