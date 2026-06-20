function clientesApp() {
  return {
    clientList: [],
    selectedClient: null,
    clientSearch: '',

    editingClient: null,
    openClientForm: false,
    clientFormName: '',
    clientFormWhatsapp: '',
    clientFormNotes: '',

    openHistory: false,
    historyClient: null,
    historySchedulings: [],
    historyFilter: '',

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      await this.fetchClients()
    },

    async fetchClients() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/clients/',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const result = await response.json()
        this.clientList = result.clients || []
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    filteredClients() {
      if (!this.clientSearch) return this.clientList
      const q = this.clientSearch.toLowerCase()
      return this.clientList.filter((c) =>
        c.name.toLowerCase().includes(q) || c.whatsapp.includes(q)
      )
    },

    selectClient(client) {
      this.selectedClient = this.selectedClient?.id === client.id ? null : client
    },

    openNewClientForm() {
      this.editingClient = null
      this.clientFormName = ''
      this.clientFormWhatsapp = ''
      this.clientFormNotes = ''
      this.openClientForm = true
    },

    openEditClientForm(client) {
      this.editingClient = client
      this.clientFormName = client.name
      this.clientFormWhatsapp = client.whatsapp
      this.clientFormNotes = client.notes || ''
      this.openClientForm = true
    },

    async saveClient() {
      const body = {
        name: this.clientFormName,
        whatsapp: this.clientFormWhatsapp,
        notes: this.clientFormNotes,
      }
      if (this.editingClient) {
        body.id = this.editingClient.id
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
            body: JSON.stringify(body),
          }
        )
        if (handleAuthError(response)) return
        const result = await response.json()

        if (!response.ok) {
          alert(result.error || 'Erro ao salvar cliente')
          return
        }

        this.openClientForm = false
        await this.fetchClients()
      } catch (error) {
        console.error('Erro ao salvar cliente:', error)
        alert('Erro ao salvar cliente')
      }
    },

    async openHistoryModal(client) {
      this.historyClient = client
      this.historyFilter = ''
      this.historySchedulings = []
      this.openHistory = true

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/?clienteId=' + client.id,
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.historySchedulings = await response.json()
      } catch (error) {
        console.error('Erro ao buscar histórico:', error)
      }
    },

    get historyServices() {
      const set = new Set()
      for (const a of this.historySchedulings) {
        if (a.service) set.add(a.service)
      }
      return [...set].sort()
    },

    filteredHistory() {
      let list = this.historySchedulings
      if (this.historyFilter) {
        list = list.filter((a) => a.service === this.historyFilter)
      }
      return list
    },
  }
}
