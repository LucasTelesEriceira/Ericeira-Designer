function agendaApp() {
  return {
    urlBase: {
      development: 'http://api-agendamento.teste',
      production: 'https://lightslategrey-guanaco-998055.hostingersite.com',
    },
    env: 'development',
    form: {
      name: '',
      whatsapp: '',
      service: [],
      profissional: 'Vanusa Ericeira',
      semana: '',
      horario: '',
      duracao: '',
      deleteToken: '',
    },
    openService: false,
    isExpanded: false,
    services: [],
    professionals: ['Vanusa Ericeira'],
    agendado: [],
    semanas: [],
    horarios: [
      '08:00',
      '08:05',
      '08:10',
      '08:15',
      '08:20',
      '08:25',
      '08:30',
      '08:35',
      '08:40',
      '08:45',
      '08:50',
      '08:55',
      '09:00',
      '09:05',
      '09:10',
      '09:15',
      '09:20',
      '09:25',
      '09:30',
      '09:35',
      '09:40',
      '09:45',
      '09:50',
      '09:55',
      '10:00',
      '10:05',
      '10:10',
      '10:15',
      '10:20',
      '10:25',
      '10:30',
      '10:35',
      '10:40',
      '10:45',
      '10:50',
      '10:55',
      '11:00',
      '11:05',
      '11:10',
      '11:15',
      '11:20',
      '11:25',
      '11:30',
      '11:35',
      '11:40',
      '11:45',
      '11:50',
      '11:55',
      '12:00',
      '14:00',
      '14:05',
      '14:10',
      '14:15',
      '14:20',
      '14:25',
      '14:30',
      '14:35',
      '14:40',
      '14:45',
      '14:50',
      '14:55',
      '15:00',
      '15:05',
      '15:10',
      '15:15',
      '15:20',
      '15:25',
      '15:30',
      '15:35',
      '15:40',
      '15:45',
      '15:50',
      '15:55',
      '16:00',
      '16:05',
      '16:10',
      '16:15',
      '16:20',
      '16:25',
      '16:30',
      '16:35',
      '16:40',
      '16:45',
      '16:50',
      '16:55',
      '17:00',
      '17:05',
      '17:10',
      '17:15',
      '17:20',
      '17:25',
      '17:30',
      '17:35',
      '17:40',
      '17:45',
      '17:50',
      '17:55',
      '18:00',
      '18:05',
      '18:10',
      '18:15',
      '18:20',
      '18:25',
      '18:30',
      '18:35',
      '18:40',
      '18:45',
      '18:50',
      '18:55',
      '19:00',
    ],
    horariosDisponiveis: [],
    clientScheduling: [],
    successMessage: 'Preencha todos os campos',

    async fetchClientScheduling() {
      const storedScheduling = localStorage.getItem('agendamentos')
      if (storedScheduling) {
        this.clientScheduling = JSON.parse(storedScheduling)
      }
    },

    async deleteClientScheduling(index) {
      if (index < 0 || index >= this.clientScheduling.length) {
        console.error('Índice inválido')
        return
      }

      const scheduling = this.clientScheduling[index]

      if (!scheduling.id || !scheduling.deleteToken) {
        console.error('Agendamento sem ID ou deleteToken')
        return
      }

      try {
        const response = await fetch(
          `${this.urlBase[this.env]}/json/api/v1/scheduling/${scheduling.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-Delete-Token': scheduling.deleteToken,
            },
          }
        )

        const result = await response.json()

        if (response.ok && result.success) {
          // Remove do localStorage
          const storedScheduling = JSON.parse(
            localStorage.getItem('agendamentos') || '[]'
          )
          storedScheduling.splice(index, 1)
          localStorage.setItem('agendamentos', JSON.stringify(storedScheduling))

          // Atualiza a lista na tela
          this.fetchClientScheduling()
          this.fetchScheduling()

          console.log('Agendamento removido com sucesso:', result.message)
        } else {
          console.error(
            'Erro ao deletar agendamento:',
            result.error || result.message
          )
          alert(
            `Erro ao cancelar agendamento: ${result.error || 'Tente novamente'}`
          )
        }
      } catch (error) {
        console.error('Erro ao deletar agendamento:', error)
        alert('Erro ao cancelar agendamento. Verifique sua conexão.')
      }
    },

    updateDuracao() {
      const selectedService = this.services.find(
        (s) => s.id === this.form.service.id
      )

      if (selectedService) {
        this.form.duracao = selectedService.duracao
        this.updateAvailableHorarios()
      }
    },

    populateWeeks() {
      const today = new Date()

      for (let i = 0; i <= 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)

        const dia = String(date.getDate()).padStart(2, '0')
        const mes = String(date.getMonth() + 1).padStart(2, '0')
        const ano = date.getFullYear()

        // Verifica se é domingo (0 é domingo no getDay())
        if (date.getDay() === 0) {
          continue // Pula a iteração se for domingo
        }

        const label = date
          .toLocaleDateString('pt-BR', {
            weekday: 'long',
          })
          .replace('-feira', '')
          .replace(/^./, (str) => str.toUpperCase())
        const day = date.getDate()
        this.semanas.push({ value: `${ano}-${mes}-${dia}`, label, day })
      }
    },

    isDisabledHorario(horario) {
      const [hour, minute] = horario.split(':').map(Number)

      // Se não há serviço ou data selecionados, não bloqueia nenhum horário
      if (!this.form.duracao || !this.form.semana) {
        return false
      }

      const currentTime = this.createDateTime(this.form.semana, hour, minute)
      const clientStart = currentTime
      const clientEnd = new Date(
        currentTime.getTime() + this.form.duracao * 60000
      )

      // DEBUG: Log completo
      if (horario === '08:00') {
        console.log('=== DEBUG 08:00 ===')
        console.log('form.semana:', this.form.semana)
        console.log('form.duracao:', this.form.duracao)
        console.log('clientStart:', clientStart)
        console.log('clientEnd:', clientEnd)
        console.log('clientStart ISO:', clientStart.toISOString())
        console.log('clientEnd ISO:', clientEnd.toISOString())
      }

      // Horário de almoço fixo: 12:00 às 14:00
      const lunchStart = this.createDateTime(this.form.semana, 12, 0)
      const lunchEnd = this.createDateTime(this.form.semana, 14, 0)

      // Verifica se o horário selecionado invade o horário de almoço
      // Bloqueia horários que terminariam durante o almoço
      if (clientStart < lunchEnd && clientEnd > lunchStart) {
        if (horario === '08:00') {
          console.log('BLOQUEADO por almoço!')
          console.log('lunchStart:', lunchStart)
          console.log('lunchEnd:', lunchEnd)
        }
        return true // Bloqueia se invadir o horário de almoço
      }

      // Verifica conflito com agendamentos existentes
      const hasConflict = this.agendado.some((a) => {
        if (
          a.professional !== this.form.profissional ||
          a.date !== this.form.semana
        ) {
          return false
        }

        // Converte o horário agendado para objeto Date
        const [hours, minutes] = a.time.split(':').map(Number)
        const scheduledTime = this.createDateTime(a.date, hours, minutes)

        // Calcula o início e fim do agendamento EXISTENTE
        const existingStart = scheduledTime
        const existingEnd = new Date(
          scheduledTime.getTime() + a.duration * 60000
        )

        // Verifica se há sobreposição entre os dois intervalos
        // Há conflito se: clientStart < existingEnd E clientEnd > existingStart
        const conflict = clientStart < existingEnd && clientEnd > existingStart

        if (conflict && horario === '08:00') {
          console.log('BLOQUEADO por conflito com agendamento:')
          console.log('Agendamento existente:', a)
          console.log('existingStart:', existingStart)
          console.log('existingEnd:', existingEnd)
        }

        return conflict
      })

      if (horario === '08:00') {
        console.log('hasConflict:', hasConflict)
        console.log('Resultado final isDisabledHorario:', hasConflict)
        console.log('Total de agendamentos:', this.agendado.length)
      }

      return hasConflict
    },

    createDateTime(date, hours, minutes) {
      const [year, month, day] = date.split('-').map(Number)
      return new Date(year, month - 1, day, hours, minutes)
    },

    updateAvailableHorarios() {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      const isTodaySelected = this.form.semana === this.semanas[0].value

      console.log('=== updateAvailableHorarios ===')
      console.log('Agora:', now)
      console.log('form.semana:', this.form.semana)
      console.log('semanas[0].value:', this.semanas[0]?.value)
      console.log('isTodaySelected:', isTodaySelected)

      this.horariosDisponiveis = this.horarios
        .filter((horario) => {
          const [hour, minute] = horario.split(':').map(Number)

          if (isTodaySelected) {
            if (hour > currentHour) return true
            if (hour === currentHour && minute > currentMinute) return true
            return false
          }

          return true
        })
        .map((horario) => ({ value: horario, label: horario }))

      console.log('Total horariosDisponiveis:', this.horariosDisponiveis.length)
      console.log('Primeiros 3:', this.horariosDisponiveis.slice(0, 3))
    },

    async fetchServices() {
      const cacheKey = 'cached_services';
      const cacheTime = 5 * 60 * 1000;
      const cached = localStorage.getItem(cacheKey);
      const cachedData = cached ? JSON.parse(cached) : null;

      if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
        this.services = cachedData.services;
        return;
      }

      try {
        const response = await fetch(
          this.urlBase[this.env] + '/json/api/v1/services'
        )
        this.services = await response.json()

        localStorage.setItem(cacheKey, JSON.stringify({
          services: this.services,
          timestamp: Date.now(),
        }))
      } catch (error) {
        console.error('Erro ao buscar serviços:', error)
      }
    },

    async fetchScheduling() {
      try {
        const response = await fetch(
          this.urlBase[this.env] + '/json/api/v1/scheduling'
        )
        this.agendado = await response.json()
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error)
      }
    },

    async registrarAgendamento() {
      try {
        const response = await fetch(
          this.urlBase[this.env] + '/json/api/v1/scheduling',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: this.form.name.trim(),
              whatsapp: this.form.whatsapp.trim(),
              service: this.form.service.name,
              professional: this.form.profissional.trim(),
              date: this.form.semana.trim(),
              time: this.form.horario.trim(),
              duration: this.form.duracao,
              deleteToken: this.generateSecureUUID(),
            }),
          }
        )
        const newScheduling = await response.json()
        const schedulingStorage =
          JSON.parse(localStorage.getItem('agendamentos')) || []
        schedulingStorage.push(newScheduling.meta_input)
        localStorage.setItem('agendamentos', JSON.stringify(schedulingStorage))

        if (response.ok) {
          this.successMessage = 'Agendado!'
          setTimeout(() => {
            this.successMessage = '(...)'
            this.successMessage = 'Preencha todos os campos'
          }, 8000)
        }

        this.agendado.push(newScheduling.meta_input)
        this.fetchScheduling()
        this.fetchClientScheduling()
        this.form = {
          name: '',
          whatsapp: '',
          service: { label: 'Escolha seu Procedimento' },
          profissional: 'Vanusa Ericeira',
          semana: '',
          horario: '',
        }
      } catch (error) {
        console.error('Erro ao registrar agendamento:', error)
      }
    },

    checkNotificationPermission() {
      if (!('Notification' in window)) return
      const permission = Notification.requestPermission()
      if (permission === 'denied') return
    },

    async showNotification() {
      // return localStorage.getItem('agendamento').some((a) => {
      //   const horarioAgendamento = new Date(hora);
      //   console.log(horarioAgendamento);
      //   console.log(horarioAgendamento.getTime());
      //   console.log(a.data);
      // });
      //const horarioNotificacao = new Date(horarioAgendamento.getTime() - 5 * 60 * 1000);
      //const tempoRestante = horarioNotificacao - new Date();
      // if (tempoRestante > 0) {
      //   setTimeout(() => this.enviarNotificacao(agendamento.cliente), tempoRestante);
      // }
      // new Notification("Alpine.js Notificação", {
      //   body: "Esta é uma notificação do navegador usando Alpine.js!",
      //   icon: "https://example.com/icon.png", // Opcional: URL para o ícone da notificação
      // });
    },

    async startNotifications(hora) {
      if (!('Notification' in window)) {
        alert('Este navegador não suporta notificações de desktop.')
        return
      }

      // Verifica a permissão do usuário
      if (Notification.permission === 'granted') {
        this.showNotification(hora)
      } else if (Notification.permission !== 'denied') {
        // Solicita permissão ao usuário
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            this.showNotification(hora)
          }
        })
      }
    },

    isDisableButton() {
      if (
        this.form.whatsapp.replace(/\D/g, '').length < 11 ||
        !this.form.service ||
        !this.form.profissional ||
        !this.form.semana ||
        !this.form.horario
      ) {
        this.successMessage = 'Preencha todos os campos'
        return true
      } else {
        this.successMessage = 'Agendar'
        return false
      }
    },

    generateSecureUUID() {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
      )
    },

    init() {
      this.showNotification()
      this.fetchServices()
      this.fetchScheduling()
      this.populateWeeks()
      this.updateAvailableHorarios()
      this.checkNotificationPermission()
      this.fetchClientScheduling()
    },
  }
}
