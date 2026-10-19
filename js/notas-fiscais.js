function notasFiscaisApp() {
  return {
    loading: true,
    invoices: [],
    openFormInvoice: false,
    formInvoice: {
      id: '',
      appointment_id: '',
      invoice_number: '',
      verification_code: '',
      access_key: '',
      total: '',
      status: 'issued',
      issued_at: new Date().toISOString().split('T')[0] + ' 12:00:00',
      items: []
    },

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchInvoices()
      this.loading = false
    },

    async fetchInvoices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/invoices',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        this.invoices = Array.isArray(res) ? res : (res.invoices || [])
      } catch (error) {
        console.error('Erro ao buscar notas fiscais:', error)
      }
    },

    openNewInvoiceForm() {
      this.formInvoice = {
        id: '',
        appointment_id: '',
        invoice_number: 'NF-' + String(Math.floor(100000 + Math.random() * 900000)),
        verification_code: '',
        access_key: '',
        total: '',
        status: 'issued',
        issued_at: new Date().toISOString().split('T')[0] + ' 12:00:00',
        items: [{
          item_type: 'service',
          description: 'Prestação de Serviço de Beleza',
          quantity: 1,
          unit_price: ''
        }]
      }
      this.openFormInvoice = true
    },

    addItemToInvoice() {
      this.formInvoice.items.push({
        item_type: 'service',
        description: '',
        quantity: 1,
        unit_price: ''
      })
    },

    removeItemFromInvoice(index) {
      this.formInvoice.items.splice(index, 1)
    },

    calculateTotalInvoice() {
      let total = 0
      for (const item of this.formInvoice.items) {
        total += (parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0)
      }
      return total
    },

    async postInvoice() {
      const f = this.formInvoice
      if (!f.invoice_number) {
        showToast('Informe o número da nota fiscal', 'warning')
        return
      }

      const calculatedTotal = this.calculateTotalInvoice()

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/invoices',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              appointment_id: f.appointment_id ? parseInt(f.appointment_id) : null,
              invoice_number: f.invoice_number.trim(),
              verification_code: f.verification_code ? f.verification_code.trim() : '',
              access_key: f.access_key ? f.access_key.trim() : '',
              total: calculatedTotal > 0 ? calculatedTotal : parseFloat(f.total || 0),
              status: f.status,
              issued_at: f.issued_at,
              items: f.items.map(i => ({
                item_type: i.item_type || 'service',
                description: i.description || 'Item da Nota',
                quantity: parseFloat(i.quantity || 1),
                unit_price: parseFloat(i.unit_price || 0)
              }))
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao registrar nota fiscal'))
          return
        }

        showToast('Nota Fiscal registrada com sucesso', 'success')
        this.openFormInvoice = false
        this.loading = true
        await this.fetchInvoices()
        this.loading = false
      } catch (error) {
        console.error('Erro ao registrar Nota Fiscal:', error)
        showToast('Erro ao registrar Nota Fiscal')
      }
    }
  }
}
