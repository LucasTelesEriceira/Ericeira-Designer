function agendamentosApp() {
  return {
    loading: true,
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
      professional_id: '',
      professional: '',
      date: '',
      time: '',
      duration: '',
    },
    schedulingTimeOptions: [],
    schedulingClientSearch: '',

    services: [],
    professionals: [],
    clientList: [],

    blockedDates: [],
    blockedDayOfWeek: [],
    blockedTimeRanges: [],

    notificationPermission: typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default',
    canInstallPwa: false,
    showNotificationBanner: false,
    knownAppointmentIds: new Set(),
    isSyncing: false,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await Promise.all([
        this.fetchSchedulingToday(),
        this.fetchSchedulingTomorrow(),
        this.fetchSchedulingOther_days(),
        this.fetchServices(),
        this.fetchProfessionals(),
        this.computeClientList()
      ])
      this.loading = false

      // Inicializa IDs conhecidos para não disparar alerta de agendamentos já existentes
      this.knownAppointmentIds = new Set([
        ...this.schedulingToday.map((a) => a.id),
        ...this.schedulingTomorrow.map((a) => a.id),
        ...this.schedulingOther_days.map((a) => a.id),
      ])

      // Verifica status das notificações
      this.notificationPermission = typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default'
      this.showNotificationBanner = this.notificationPermission === 'default' && !sessionStorage.getItem('dismissedNotificationBanner')

      // Listener para instalação PWA
      window.addEventListener('pwa-installable', () => {
        this.canInstallPwa = true
      })
      if (window.deferredInstallPrompt) {
        this.canInstallPwa = true
      }

      // Inicia monitor em segundo plano (polling 25s + sync ao desbloquear celular ou voltar à aba)
      if (typeof startAppointmentMonitor === 'function') {
        startAppointmentMonitor({
          onSync: () => this.syncAppointments(true),
          intervalMs: 25000,
        })
      }

      this.$watch('formScheduling.service', (serviceName) => {
        const s = this.services.find((s) => (s.name || s.nome) === serviceName)
        if (s) {
          this.formScheduling.duration = s.duration || s.duracao || 60
          this.computeAvailableTimeOptions()
        }
      })
      this.$watch('formScheduling.date', () =>
        this.computeAvailableTimeOptions()
      )
      this.$watch('formScheduling.duration', () =>
        this.computeAvailableTimeOptions()
      )
      this.$watch('formScheduling.professional_id', (profId) => {
        const p = this.professionals.find((p) => p.id === parseInt(profId))
        if (p) {
          this.formScheduling.professional = p.name
          this.computeAvailableTimeOptions()
        }
      })
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

    async fetchProfessionals() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          { headers: getAuthHeaders() }
        )
        const res = await response.json()
        const list = Array.isArray(res) ? res : (res.professionals || [])
        this.professionals = list.filter(p => p.active)
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error)
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
        this.clientList = Array.isArray(result) ? result : (result.clients || [])
      } catch (error) {
        console.error('Erro ao buscar clientes:', error)
      }
    },

    filteredClientList() {
      if (!this.schedulingClientSearch) return []
      const q = this.schedulingClientSearch.toLowerCase()
      return this.clientList.filter((c) => (c.name && c.name.toLowerCase().includes(q)))
    },

    selectSchedulingClient(client) {
      this.formScheduling.name = client.name
      this.formScheduling.whatsapp = client.whatsapp
      this.schedulingClientSearch = client.name
    },

    normalizeSchedulingList(list) {
      if (!Array.isArray(list)) return []
      return list.map(item => ({
        id: item.id,
        name: item.client_name || item.name || 'Cliente',
        whatsapp: item.client_whatsapp || item.whatsapp || '',
        service: item.service_name || item.service || '',
        professional: item.professional_name || item.professional || 'Profissional',
        professional_id: item.professional_id || null,
        date: item.date || '',
        time: item.time || '',
        duration: item.duration || 60,
        status: item.status || 'active',
        delete_token: item.delete_token || ''
      }))
    },

    async fetchSchedulingToday() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling/today',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        this.schedulingToday = this.normalizeSchedulingList(res)
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
        const res = await response.json()
        this.schedulingTomorrow = this.normalizeSchedulingList(res)
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
        const res = await response.json()
        this.schedulingOther_days = this.normalizeSchedulingList(res)
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
          showToast('Agendamento excluído com sucesso', 'success')
          this.schedulingToday = this.schedulingToday.filter((a) => a.id !== id)
          this.schedulingTomorrow = this.schedulingTomorrow.filter((a) => a.id !== id)
          this.schedulingOther_days = this.schedulingOther_days.filter((a) => a.id !== id)
        } else {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao excluir'))
        }
      } catch (error) {
        console.error('Erro ao excluir agendamento:', error)
        showToast('Erro ao excluir agendamento')
      }
    },

    openSchedulingForm(scheduling = null) {
      const defaultProf = this.professionals[0]
      if (scheduling) {
        this.formScheduling = {
          id: scheduling.id || '',
          name: scheduling.name || '',
          whatsapp: scheduling.whatsapp || '',
          service: scheduling.service || '',
          professional_id: scheduling.professional_id || (defaultProf ? defaultProf.id : ''),
          professional: scheduling.professional || (defaultProf ? defaultProf.name : ''),
          date: scheduling.date || '',
          time: scheduling.time || '',
          duration: scheduling.duration || '',
        }
      } else {
        this.formScheduling = {
          id: '',
          name: '',
          whatsapp: '',
          service: '',
          professional_id: defaultProf ? defaultProf.id : '',
          professional: defaultProf ? defaultProf.name : '',
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
          a.date === date && (
            parseInt(a.professional_id) === parseInt(this.formScheduling.professional_id) ||
            a.professional === this.formScheduling.professional
          )
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
            if (!a.time) return false
            const [ah, am] = a.time.split(':').map(Number)
            const existingStart = this.createDateTime(a.date, ah, am)
            const existingEnd = new Date(
              existingStart.getTime() + a.duration * 60000
            )
            return clientStart < existingEnd && clientEnd > existingStart
          })

          if (!hasConflict) options.push(timeStr)
        }
      }

      this.schedulingTimeOptions = options
    },

    async postScheduling() {
      const f = this.formScheduling
      if (!f.name || !f.whatsapp || !f.service || !f.date || !f.time) {
        showToast('Preencha todos os campos obrigatórios', 'warning')
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
              professional_id: f.professional_id ? parseInt(f.professional_id) : undefined,
              professional: f.professional ? f.professional.trim() : undefined,
              date: f.date.trim(),
              time: f.time.trim(),
              duration: f.duration,
            }),
          }
        )

        if (handleAuthError(response)) return

        const result = await response.json()

        if (!response.ok) {
          showToast('Erro: ' + (result.error || 'Falha ao salvar'))
          return
        }

        showToast('Agendamento salvo com sucesso', 'success')
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
          professional_id: '',
          professional: '',
          date: '',
          time: '',
          duration: '',
        }
        this.schedulingClientSearch = ''
      } catch (error) {
        console.error('Erro ao salvar agendamento:', error)
        showToast('Erro ao salvar agendamento')
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

      const number = (item.whatsapp || '').replace(/\D/g, '')
      const dateStr = formatDate(day)
      window.open(
        `https://api.whatsapp.com/send?phone=+55${number}&text=${encodeURIComponent('Agendamento marcado para o dia ' + dateStr + ' às ' + time + '.')}`,
        '_blank'
      )
    },

    async syncAppointments(isBackground = true) {
      if (this.isSyncing) return
      this.isSyncing = true
      try {
        if (typeof invalidateCache === 'function') {
          invalidateCache('scheduling')
        }

        const [todayRes, tomorrowRes, otherRes] = await Promise.all([
          fetch(getUrlBase()[getEnv()] + '/json/api/v1/scheduling/today', { headers: getAuthHeaders() }),
          fetch(getUrlBase()[getEnv()] + '/json/api/v1/scheduling/tomorrow', { headers: getAuthHeaders() }),
          fetch(getUrlBase()[getEnv()] + '/json/api/v1/scheduling/other_days', { headers: getAuthHeaders() }),
        ])

        if (todayRes.ok && tomorrowRes.ok && otherRes.ok) {
          const freshToday = this.normalizeSchedulingList(await todayRes.json())
          const freshTomorrow = this.normalizeSchedulingList(await tomorrowRes.json())
          const freshOther = this.normalizeSchedulingList(await otherRes.json())

          const allFresh = [...freshToday, ...freshTomorrow, ...freshOther]
          const newAppointments = allFresh.filter((a) => a && a.id && !this.knownAppointmentIds.has(a.id))

          if (newAppointments.length > 0) {
            newAppointments.forEach((appt) => {
              this.knownAppointmentIds.add(appt.id)
              if (typeof notifyNewAppointment === 'function') {
                notifyNewAppointment(appt)
              }
            })
          }

          // Atualiza reativamente as listas
          this.schedulingToday = freshToday
          this.schedulingTomorrow = freshTomorrow
          this.schedulingOther_days = freshOther
        }
      } catch (err) {
        console.warn('Falha na sincronização periódica de agendamentos:', err)
      } finally {
        this.isSyncing = false
      }
    },

    async toggleNotificationPermission() {
      if (this.notificationPermission === 'granted') {
        if (typeof playAppointmentChime === 'function') {
          playAppointmentChime()
        }
        if (typeof showToast === 'function') {
          showToast('Notificações ativas! Som de teste reproduzido.', 'success')
        }
        return
      }

      if (typeof requestNotificationPermission === 'function') {
        const granted = await requestNotificationPermission()
        this.notificationPermission = typeof getNotificationPermission === 'function' ? getNotificationPermission() : 'default'
        this.showNotificationBanner = false
      }
    },

    dismissNotificationBanner() {
      this.showNotificationBanner = false
      try {
        sessionStorage.setItem('dismissedNotificationBanner', 'true')
      } catch (e) {}
    },

    installPwa() {
      if (typeof promptPwaInstall === 'function') {
        promptPwaInstall()
      }
    },
  }
}
