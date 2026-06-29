function agendamentosApp() {
  return {
    schedulingToday: [],
    schedulingTomorrow: [],
    schedulingOther_days: [],
    selectedAccordionItem: 'one',

    openFormScheduling: false,
    openServiceModal: false,
    openTimeModal: false,
    formScheduling: {
      id: '',
      name: '',
      whatsapp: '',
      service: '',
      professional: 'Vanusa Ericeira',
      date: '',
      time: '',
      duration: '',
    },
    schedulingTimeOptions: [],
    schedulingClientSearch: '',

    services: [],
    clientList: [],

    // Futuro: bloqueios manuais
    blockedDates: [],
    blockedDayOfWeek: [],
    blockedTimeRanges: [],

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      await Promise.all([
        this.fetchSchedulingToday(),
        this.fetchSchedulingTomorrow(),
        this.fetchSchedulingOther_days(),
      ])
      this.computeClientList()
      await this.fetchServices()
      this.$watch('formScheduling.service', (serviceName) => {
        const s = this.services.find((s) => s.nome === serviceName)
        if (s) {
          this.formScheduling.duration = s.duracao
          this.computeAvailableTimeOptions()
        }
      })
      this.$watch('formScheduling.date', () =>
        this.computeAvailableTimeOptions()
      )
      this.$watch('formScheduling.duration', () =>
        this.computeAvailableTimeOptions()
      )
      this.checkQueryParams()
    },

    checkQueryParams() {
      const params = new URLSearchParams(window.location.search)
      const clientName = params.get('clientName')
      const whatsapp = params.get('whatsapp')
      if (clientName || whatsapp) {
        this.openSchedulingForm()
        this.formScheduling.name = clientName || ''
        this.formScheduling.whatsapp = whatsapp || ''
        this.schedulingClientSearch = clientName || ''
        window.history.replaceState({}, '', window.location.pathname)
      }
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

    async computeClientList() {
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

    filteredClientList() {
      if (!this.schedulingClientSearch) return []
      const q = this.schedulingClientSearch.toLowerCase()
      return this.clientList.filter((c) => c.name.toLowerCase().includes(q))
    },

    selectSchedulingClient(client) {
      this.formScheduling.name = client.name
      this.formScheduling.whatsapp = client.whatsapp
      this.schedulingClientSearch = client.name
    },

    async fetchSchedulingToday() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/today',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingToday = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos de hoje:', error)
      }
    },

    async fetchSchedulingTomorrow() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/tomorrow',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingTomorrow = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos de amanhã:', error)
      }
    },

    async fetchSchedulingOther_days() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/other_days',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.schedulingOther_days = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos futuros:', error)
      }
    },

    async deleteScheduling(id) {
      if (!confirm('Excluir este agendamento?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/' + id,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
          }
        )

        if (handleAuthError(response)) return

        if (response.ok) {
          this.schedulingToday = this.schedulingToday.filter((a) => a.id !== id)
          this.schedulingTomorrow = this.schedulingTomorrow.filter(
            (a) => a.id !== id
          )
          this.schedulingOther_days = this.schedulingOther_days.filter(
            (a) => a.id !== id
          )
        } else {
          const error = await response.json()
          alert('Erro: ' + (error.error || 'Falha ao excluir'))
        }
      } catch (error) {
        console.error('Erro ao excluir agendamento:', error)
      }
    },

    openSchedulingForm(scheduling = null) {
      if (scheduling) {
        this.formScheduling = {
          id: scheduling.id || '',
          name: scheduling.name || '',
          whatsapp: scheduling.whatsapp || '',
          service: scheduling.service || '',
          professional: scheduling.professional || 'Vanusa Ericeira',
          date: scheduling.date || '',
          time: scheduling.time || '',
          duration: scheduling.duration || '',
        }
      } else if (!this.formScheduling.id) {
        this.formScheduling = {
          id: '',
          name: '',
          whatsapp: '',
          service: '',
          professional: 'Vanusa Ericeira',
          date: '',
          time: '',
          duration: '',
        }
      }
      this.computeAvailableTimeOptions()
      this.openFormScheduling = true
    },

    createDateTime(date, hours, minutes) {
      const [year, month, day] = date.split('-').map(Number)
      return new Date(year, month - 1, day, hours, minutes)
    },

    getSchedulingForDate(date) {
      return [
        ...this.schedulingToday,
        ...this.schedulingTomorrow,
        ...this.schedulingOther_days,
      ].filter(
        (a) =>
          a.date === date && a.professional === this.formScheduling.professional
      )
    },

    isTimeBlockedByDate(dayOfWeek, date) {
      if (dayOfWeek === 0) return true
      if (this.blockedDayOfWeek.includes(dayOfWeek)) return true
      if (this.blockedDates.includes(date)) return true
      return false
    },

    computeAvailableTimeOptions() {
      const date = this.formScheduling.date
      const duration = this.formScheduling.duration

      if (!date) {
        this.schedulingTimeOptions = []
        return
      }

      const now = new Date()
      const [cYear, cMonth, cDay] = date.split('-').map(Number)
      const isToday =
        cYear === now.getFullYear() &&
        cMonth === now.getMonth() + 1 &&
        cDay === now.getDate()

      const dayOfWeek = new Date(cYear, cMonth - 1, cDay).getDay()
      if (this.isTimeBlockedByDate(dayOfWeek, date)) {
        this.schedulingTimeOptions = []
        return
      }

      const existing = this.getSchedulingForDate(date)
      const options = []

      for (let h = 8; h <= 19; h++) {
        for (let m = 0; m < 60; m += 5) {
          if (h === 12 || (h === 13 && m < 60)) continue

          const timeStr =
            String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')

          if (isToday) {
            if (
              h < now.getHours() ||
              (h === now.getHours() && m <= now.getMinutes())
            )
              continue
          }

          if (!duration) {
            options.push(timeStr)
            continue
          }

          const clientStart = this.createDateTime(date, h, m)
          const clientEnd = new Date(clientStart.getTime() + duration * 60000)

          const lunchStart = this.createDateTime(date, 12, 0)
          const lunchEnd = this.createDateTime(date, 14, 0)
          if (clientStart < lunchEnd && clientEnd > lunchStart) continue

          const hasConflict = existing.some((a) => {
            const [ah, am] = a.time.split(':').map(Number)
            const existingStart = this.createDateTime(a.date, ah, am)
            const existingEnd = new Date(
              existingStart.getTime() + a.duration * 60000
            )
            return clientStart < existingEnd && clientEnd > existingStart
          })

          if (!hasConflict) options.push(timeStr)

          // Futuro: verificar blockedTimeRanges
        }
      }

      this.schedulingTimeOptions = options
    },

    async postScheduling() {
      const f = this.formScheduling
      if (!f.name || !f.whatsapp || !f.service || !f.date || !f.time) {
        alert('Preencha todos os campos obrigatórios')
        return
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || undefined,
              name: f.name.trim(),
              whatsapp: f.whatsapp.trim(),
              service: f.service,
              professional: f.professional.trim(),
              date: f.date.trim(),
              time: f.time.trim(),
              duration: f.duration,
            }),
          }
        )

        if (handleAuthError(response)) return

        const result = await response.json()

        if (!response.ok) {
          alert('Erro: ' + (result.error || 'Falha ao salvar'))
          return
        }

        await Promise.all([
          this.fetchSchedulingToday(),
          this.fetchSchedulingTomorrow(),
          this.fetchSchedulingOther_days(),
        ])
        this.computeClientList()
        this.openFormScheduling = false
        this.formScheduling = {
          id: '',
          name: '',
          whatsapp: '',
          service: '',
          professional: 'Vanusa Ericeira',
          date: '',
          time: '',
          duration: '',
        }
        this.schedulingClientSearch = ''
      } catch (error) {
        console.error('Erro ao salvar agendamento:', error)
        alert('Erro ao salvar agendamento')
      }
    },

    openWatsapp(day, time) {
      const all = [
        ...this.schedulingToday,
        ...this.schedulingTomorrow,
        ...this.schedulingOther_days,
      ]
      const item = all.find((a) => a.date === day && a.time === time)
      if (!item) return

      const number = item.whatsapp.replace(/\D/g, '')
      const dateStr = formatDate(day)
      window.open(
        `https://api.whatsapp.com/send?phone=+55${number}&text=${encodeURIComponent('Agendamento marcado para o dia ' + dateStr + ' às ' + time + '.')}`,
        '_blank'
      )
    },
  }
}
