function clientesApp() {
  return {
    clientList: [],
    loading: true,
    selectedClient: null,
    clientSearch: '',
    errors: {},

    editingClient: null,
    openClientForm: false,
    clientFormName: '',
    clientFormWhatsapp: '',
    clientFormEmail: '',
    clientFormCpf: '',
    clientFormBirthDate: '',
    clientFormNotes: '',

    openHistory: false,
    historyClient: null,
    historySchedulings: [],
    historyServiceFilter: '',
    historyProfessionalFilter: '',
    historyPage: 1,
    historyPerPage: 5,

    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchClients()
      this.loading = false

      this.$watch('clientSearch', () => {
        this.displayedCount = this.pageSize
      })
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

    async fetchClients() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients/',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const result = await response.json()
        this.clientList = Array.isArray(result) ? result : (result.clients || [])
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    filteredClients() {
      if (!this.clientSearch) return this.clientList
      const q = this.clientSearch.toLowerCase().trim()
      return this.clientList.filter(
        (c) => (c.name && c.name.toLowerCase().includes(q)) || (c.whatsapp && c.whatsapp.includes(q))
      )
    },

    paginatedClients() {
      return this.filteredClients().slice(0, this.displayedCount)
    },

    hasMoreClients() {
      return this.displayedCount < this.filteredClients().length
    },

    loadMoreClients() {
      if (this.hasMoreClients()) {
        this.displayedCount += this.pageSize
      }
    },

    openNewClientForm() {
      this.editingClient = null
      this.clientFormName = ''
      this.clientFormWhatsapp = ''
      this.clientFormEmail = ''
      this.clientFormCpf = ''
      this.clientFormBirthDate = ''
      this.clientFormNotes = ''
      this.errors = {}
      this.openClientForm = true
    },

    openEditClientForm(client) {
      this.editingClient = client
      this.clientFormName = client.name || ''
      this.clientFormWhatsapp = client.whatsapp || ''
      this.clientFormEmail = client.email || ''
      this.clientFormCpf = client.cpf || ''
      this.clientFormBirthDate = client.birth_date || ''
      this.clientFormNotes = client.notes || ''
      this.errors = {}
      this.openClientForm = true
    },

    async saveClient() {
      this.errors = {}
      if (!this.clientFormName.trim()) {
        this.errors.name = 'O nome é obrigatório'
      }
      if (!this.clientFormWhatsapp.trim()) {
        this.errors.whatsapp = 'O WhatsApp é obrigatório'
      }
      if (Object.keys(this.errors).length > 0) return

      const payload = {
        name: this.clientFormName.trim(),
        whatsapp: this.clientFormWhatsapp.trim(),
        email: this.clientFormEmail.trim() || null,
        cpf: this.clientFormCpf.trim() || null,
        birth_date: this.clientFormBirthDate || null,
        notes: this.clientFormNotes.trim() || null,
      }

      if (this.editingClient) {
        payload.id = this.editingClient.id
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients/',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify(payload),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const err = await response.json()
          showToast(err.error || 'Erro ao salvar cliente')
          return
        }

        showToast(this.editingClient ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso', 'success')
        this.openClientForm = false
        this.loading = true
        await this.fetchClients()
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar cliente:', error)
        showToast('Erro ao salvar cliente')
      }
    },

    async deleteClient(id) {
      if (!confirm('Deseja realmente excluir este cliente?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients/' + id,
          {
            method: 'DELETE',
            headers: getAuthHeaders(),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const err = await response.json()
          showToast(err.error || 'Erro ao excluir cliente')
          return
        }

        showToast('Cliente excluído com sucesso', 'success')
        this.clientList = this.clientList.filter((c) => c.id !== id)
        if (typeof invalidateCache === 'function') {
          invalidateCache('clients')
          invalidateCache('scheduling')
          invalidateCache('dashboard')
        }
        await this.fetchClients()
      } catch (error) {
        console.error('Erro ao excluir cliente:', error)
        showToast('Erro ao excluir cliente')
      }
    },

    async openClientHistory(client) {
      this.historyClient = client
      this.historyServiceFilter = ''
      this.historyProfessionalFilter = ''
      this.historyPage = 1
      this.historySchedulings = []
      this.openHistory = true

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] +
            '/json/api/v1/scheduling/?clienteId=' +
            client.id,
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        this.historySchedulings = Array.isArray(res) ? res : (res.schedulings || [])
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    },

    get historyServices() {
      const set = new Set()
      for (const a of this.historySchedulings) {
        const sName = a.service_name || a.service
        if (sName) set.add(sName)
      }
      return [...set].sort()
    },

    get historyProfessionals() {
      const set = new Set()
      for (const a of this.historySchedulings) {
        const pName = a.professional_name || a.professional
        if (pName) set.add(pName)
      }
      return [...set].sort()
    },

    filteredHistory() {
      let list = this.historySchedulings

      if (this.historyServiceFilter) {
        list = list.filter((a) => (a.service_name || a.service) === this.historyServiceFilter)
      }

      if (this.historyProfessionalFilter) {
        list = list.filter((a) => (a.professional_name || a.professional) === this.historyProfessionalFilter)
      }

      return list
    },

    paginatedHistory() {
      const list = this.filteredHistory()
      const start = (this.historyPage - 1) * this.historyPerPage
      return list.slice(start, start + this.historyPerPage)
    },

    historyTotalPages() {
      const list = this.filteredHistory()
      return Math.ceil(list.length / this.historyPerPage) || 1
    },

    historyNextPage() {
      if (this.historyPage < this.historyTotalPages()) {
        this.historyPage++
      }
    },

    historyPrevPage() {
      if (this.historyPage > 1) {
        this.historyPage--
      }
    }
  }
}
