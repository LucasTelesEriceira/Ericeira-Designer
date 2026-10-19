function agendaApp() {
  return {
    loading: true,
    submitting: false,
    availabilityLoading: false,

    form: {
      name: '',
      whatsapp: '',
      service: null,
      professional: null,
      date: '',
      time: '',
    },

    openServiceDropdown: false,
    services: [],
    professionals: [],
    dates: [],
    availableSlots: [],
    morningSlots: [],
    afternoonSlots: [],
    dayIsOpen: true,
    dayMessage: '',

    clientScheduling: [],
    bookingSuccess: null,
    errorMessage: '',

    async init() {
      this.loading = true
      try {
        await Promise.all([
          this.fetchServices(),
          this.fetchProfessionals()
        ])
        this.generateDates()
        this.fetchClientScheduling()

        // Seleciona o primeiro dia útil com expediente
        if (this.dates.length > 0) {
          this.form.date = this.dates[0].value
          await this.fetchAvailability()
        }
      } catch (e) {
        console.error('Erro na inicialização do agendamento:', e)
      } finally {
        this.loading = false
      }
    },

    async fetchServices() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/services'
        )
        const raw = await response.json()
        const list = Array.isArray(raw) ? raw : (raw.services || [])
        this.services = list
          .filter(s => s.active !== false && s.active !== 0)
          .map(s => ({
            id: s.id,
            name: s.name || s.nome || '',
            price: parseFloat(s.price !== undefined ? s.price : (s.valor || 0)),
            duration: parseInt(s.duration !== undefined ? s.duration : (s.duracao || 60)),
            description: s.description || s.descricao || ''
          }))

        if (this.services.length > 0 && !this.form.service) {
          this.form.service = this.services[0]
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    async fetchProfessionals() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals?active=1&has_schedule=1'
        )
        const raw = await response.json()
        const list = Array.isArray(raw) ? raw : (raw.professionals || [])
        this.professionals = list.map(p => ({
          id: p.id,
          name: p.name,
          specialty: p.specialty || 'Designer & Micropigmentadora'
        }))

        if (this.professionals.length > 0) {
          this.form.professional = this.professionals[0]
        }
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error)
      }
    },

    generateDates() {
      const dates = []
      const today = new Date()
      const weekDaysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      const weekDaysFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

      // Gera os próximos 14 dias
      for (let i = 0; i < 14; i++) {
        const d = new Date(today)
        d.setDate(today.getDate() + i)

        // Pula domingos por padrão do estabelecimento
        if (d.getDay() === 0) continue

        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const value = `${year}-${month}-${day}`

        dates.push({
          value,
          dayNum: day,
          dayName: weekDaysShort[d.getDay()],
          fullWeekday: weekDaysFull[d.getDay()],
          isToday: i === 0,
          isTomorrow: i === 1
        })
      }

      this.dates = dates
    },

    selectDate(dateItem) {
      if (this.form.date === dateItem.value) return
      this.form.date = dateItem.value
      this.form.time = ''
      this.fetchAvailability()
    },

    selectService(svc) {
      this.form.service = svc
      this.openServiceDropdown = false
      this.form.time = ''
      this.fetchAvailability()
    },

    selectProfessional(prof) {
      if (this.form.professional?.id === prof.id) return
      this.form.professional = prof
      this.form.time = ''
      this.fetchAvailability()
    },

    async fetchAvailability() {
      if (!this.form.date || !this.form.professional) return

      this.availabilityLoading = true
      this.errorMessage = ''

      const profId = this.form.professional.id
      const date = this.form.date
      const duration = this.form.service?.duration || 60
      const serviceId = this.form.service?.id || 0

      try {
        const url = `${getUrlBase()[getEnv()]}/json/api/v1/public/availability?professional_id=${profId}&date=${date}&duration=${duration}&service_id=${serviceId}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.is_open === false) {
          this.dayIsOpen = false
          this.dayMessage = data.message || 'Profissional não atende nesta data'
          this.availableSlots = []
          this.morningSlots = []
          this.afternoonSlots = []
        } else {
          this.dayIsOpen = true
          this.dayMessage = ''
          this.availableSlots = data.slots || []

          // Divide em Manhã e Tarde
          this.morningSlots = this.availableSlots.filter(t => {
            const h = parseInt(t.split(':')[0])
            return h < 12
          })
          this.afternoonSlots = this.availableSlots.filter(t => {
            const h = parseInt(t.split(':')[0])
            return h >= 12
          })

          // Se o horário previamente selecionado não estiver mais disponível, desseleciona
          if (this.form.time && !this.availableSlots.includes(this.form.time)) {
            this.form.time = ''
          }
        }
      } catch (error) {
        console.error('Erro ao buscar disponibilidade:', error)
        this.dayIsOpen = false
        this.dayMessage = 'Não foi possível carregar os horários para este dia.'
      } finally {
        this.availabilityLoading = false
      }
    },

    async registrarAgendamento() {
      this.errorMessage = ''

      if (!this.form.name || this.form.name.trim().length < 2) {
        this.errorMessage = 'Por favor, informe seu nome completo.'
        return
      }

      const rawPhone = this.form.whatsapp.replace(/\D/g, '')
      if (rawPhone.length < 10) {
        this.errorMessage = 'Informe um número de WhatsApp válido com DDD.'
        return
      }

      if (!this.form.service) {
        this.errorMessage = 'Selecione um procedimento para o atendimento.'
        return
      }

      if (!this.form.date) {
        this.errorMessage = 'Selecione a data desejada.'
        return
      }

      if (!this.form.time) {
        this.errorMessage = 'Selecione um horário disponível.'
        return
      }

      this.submitting = true
      const deleteToken = this.generateSecureUUID()

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: this.form.name.trim(),
              whatsapp: this.form.whatsapp.trim(),
              service: this.form.service.name,
              service_id: this.form.service.id,
              professional: this.form.professional ? this.form.professional.name : 'Vanusa Ericeira',
              professional_id: this.form.professional ? this.form.professional.id : 1,
              date: this.form.date,
              time: this.form.time,
              duration: this.form.service.duration,
              deleteToken: deleteToken,
            }),
          }
        )

        const result = await response.json()

        if (!response.ok) {
          this.errorMessage = result.error || 'Ocorreu um erro ao registrar. Tente novamente.'
          showToast(this.errorMessage, 'error')
          return
        }

        const newScheduling = result.meta_input || {
          id: result.id,
          name: this.form.name.trim(),
          whatsapp: this.form.whatsapp.trim(),
          service: this.form.service.name,
          professional: this.form.professional?.name || 'Vanusa Ericeira',
          date: this.form.date,
          time: this.form.time,
          duration: this.form.service.duration,
          deleteToken: deleteToken
        }

        // Salva nos agendamentos locais do navegador do cliente
        const stored = JSON.parse(localStorage.getItem('agendamentos') || '[]')
        stored.unshift(newScheduling)
        localStorage.setItem('agendamentos', JSON.stringify(stored))
        this.fetchClientScheduling()

        // Invalida cache do painel
        if (typeof invalidateCache === 'function') {
          invalidateCache('dashboard')
          invalidateCache('scheduling')
        }

        this.bookingSuccess = newScheduling
        showToast('Agendamento confirmado com sucesso!', 'success')

        // Atualiza a disponibilidade para o horário recém-ocupado sumir
        await this.fetchAvailability()
      } catch (error) {
        console.error('Erro ao agendar:', error)
        this.errorMessage = 'Erro ao conectar ao servidor. Verifique sua conexão.'
        showToast(this.errorMessage, 'error')
      } finally {
        this.submitting = false
      }
    },

    newBooking() {
      this.bookingSuccess = null
      this.form.time = ''
      this.fetchAvailability()
    },

    fetchClientScheduling() {
      try {
        const stored = localStorage.getItem('agendamentos')
        this.clientScheduling = stored ? JSON.parse(stored) : []
      } catch (e) {
        this.clientScheduling = []
      }
    },

    async deleteClientScheduling(index) {
      if (!confirm('Deseja realmente cancelar este agendamento?')) return

      const item = this.clientScheduling[index]
      if (!item || !item.id || !item.deleteToken) {
        showToast('Não foi possível identificar o agendamento', 'error')
        return
      }

      try {
        const response = await fetch(
          `${getUrlBase()[getEnv()]}/json/api/v1/scheduling/${item.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Delete-Token': item.deleteToken,
            },
          }
        )

        const result = await response.json()
        if (response.ok && result.success) {
          this.clientScheduling.splice(index, 1)
          localStorage.setItem('agendamentos', JSON.stringify(this.clientScheduling))
          showToast('Agendamento cancelado com sucesso', 'success')
          if (typeof invalidateCache === 'function') {
            invalidateCache('dashboard')
            invalidateCache('scheduling')
          }
          await this.fetchAvailability()
        } else {
          showToast(result.error || 'Falha ao cancelar agendamento', 'error')
        }
      } catch (e) {
        console.error('Erro ao cancelar:', e)
        showToast('Erro ao cancelar agendamento', 'error')
      }
    },

    generateSecureUUID() {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      )
    },

    formatDisplayDate(dateStr) {
      if (!dateStr) return ''
      const parts = dateStr.split('-')
      if (parts.length !== 3) return dateStr
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    },

    addToGoogleCalendar(booking) {
      if (!booking || !booking.date || !booking.time) return
      try {
        const duration = Number(booking.duration) || 60
        const startDate = new Date(booking.date + 'T' + booking.time + ':00')
        const endDate = new Date(startDate.getTime() + duration * 60000)

        const pad = (n) => String(n).padStart(2, '0')
        const formatIso = (d) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

        const startIso = formatIso(startDate)
        const endIso = formatIso(endDate)

        const title = encodeURIComponent(`Atendimento: ${booking.service} — Ericeira Designer`)
        const details = encodeURIComponent(`Agendamento de ${booking.service} com ${booking.professional || 'Ericeira Designer'}.\nCliente: ${booking.name}\nWhatsApp: ${booking.whatsapp}`)
        const location = encodeURIComponent('Ericeira Designer')

        const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`
        window.open(calUrl, '_blank')
      } catch (e) {
        console.warn('Erro ao abrir Google Agenda:', e)
      }
    },

    notifyWhatsApp(booking) {
      if (!booking) return
      try {
        // Envia mensagem direta de confirmação no WhatsApp
        const studioNumber = '98985367006'
        const msg = encodeURIComponent(`Olá! Acabei de realizar meu agendamento pelo site:\n\n✨ *Procedimento:* ${booking.service}\n📅 *Data:* ${this.formatDisplayDate(booking.date)} às ${booking.time}\n👤 *Cliente:* ${booking.name}\n💆‍♀️ *Profissional:* ${booking.professional}`)
        window.open(`https://api.whatsapp.com/send?phone=+55${studioNumber}&text=${msg}`, '_blank')
      } catch (e) {
        console.warn('Erro ao abrir WhatsApp:', e)
      }
    }
  }
}
