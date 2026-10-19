function horariosApp() {
  return {
    loading: true,
    savingHours: false,
    activeTab: 'working_hours', // 'working_hours' ou 'blocks'
    professionals: [],
    selectedProfessionalId: '',

    workingHours: [],
    blocks: [],
    appointments: [],
    hasSavedHours: false,
    configuringNew: false,

    weekDays: [
      { id: 1, name: 'Segunda-feira' },
      { id: 2, name: 'Terça-feira' },
      { id: 3, name: 'Quarta-feira' },
      { id: 4, name: 'Quinta-feira' },
      { id: 5, name: 'Sexta-feira' },
      { id: 6, name: 'Sábado' },
      { id: 0, name: 'Domingo' },
    ],

    weekSchedule: {
      1: { is_active: true, shifts: [{ start_time: '08:00', end_time: '18:00' }] },
      2: { is_active: true, shifts: [{ start_time: '08:00', end_time: '18:00' }] },
      3: { is_active: true, shifts: [{ start_time: '08:00', end_time: '18:00' }] },
      4: { is_active: true, shifts: [{ start_time: '08:00', end_time: '18:00' }] },
      5: { is_active: true, shifts: [{ start_time: '08:00', end_time: '18:00' }] },
      6: { is_active: false, shifts: [{ start_time: '08:00', end_time: '14:00' }] },
      0: { is_active: false, shifts: [{ start_time: '08:00', end_time: '12:00' }] },
    },

    openFormBlock: false,
    formBlockError: '',
    formBlockSubmitted: false,
    formBlock: {
      id: '',
      professional_id: '',
      start_datetime: '',
      end_datetime: '',
      reason: ''
    },

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchProfessionals()
      await Promise.all([
        this.fetchWorkingHours(),
        this.fetchBlocks(),
        this.fetchAppointments()
      ])
      this.loading = false
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

    hasPermission(roles) {
      return hasPermission(roles)
    },

    logout() {
      logout()
    },

    async fetchProfessionals(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 60000,
            onUpdate: (freshRes) => {
              this.professionals = Array.isArray(freshRes) ? freshRes : (freshRes.professionals || [])
            }
          }
        )
        if (!res) return
        this.professionals = Array.isArray(res) ? res : (res.professionals || [])

        const userRole = this.getUserRole()
        const activeProfId = getProfessionalId()

        if (userRole === 'professional' && activeProfId) {
          this.selectedProfessionalId = parseInt(activeProfId)
        } else if (this.professionals.length > 0 && !this.selectedProfessionalId) {
          this.selectedProfessionalId = this.professionals[0].id
        }
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error)
      }
    },

    onProfessionalChange() {
      this.configuringNew = false
      this.populateWeekSchedule()
    },

    async fetchWorkingHours(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/working-hours',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 30000,
            onUpdate: (freshRes) => {
              this.workingHours = Array.isArray(freshRes) ? freshRes : (freshRes.working_hours || [])
              this.populateWeekSchedule()
            }
          }
        )
        if (!res) return
        this.workingHours = Array.isArray(res) ? res : (res.working_hours || [])
        this.populateWeekSchedule()
      } catch (error) {
        console.error('Erro ao buscar horários:', error)
      }
    },


    populateWeekSchedule() {
      const profId = parseInt(this.selectedProfessionalId)
      if (!profId) return

      const profHours = this.workingHours.filter(wh => parseInt(wh.professional_id) === profId)
      this.hasSavedHours = profHours.length > 0

      if (!this.hasSavedHours && !this.configuringNew) {
        return
      }

      this.weekDays.forEach(day => {
        const dayRows = profHours.filter(wh => parseInt(wh.day_of_week) === day.id)

        if (dayRows.length > 0) {
          const activeShifts = dayRows.filter(wh => Boolean(parseInt(wh.is_active)))
          if (activeShifts.length > 0) {
            this.weekSchedule[day.id] = {
              is_active: true,
              shifts: activeShifts.map(s => ({
                start_time: (s.start_time || '08:00').substring(0, 5),
                end_time: (s.end_time || '18:00').substring(0, 5)
              }))
            }
          } else {
            this.weekSchedule[day.id] = {
              is_active: false,
              shifts: [{ start_time: '08:00', end_time: '18:00' }]
            }
          }
        } else {
          this.weekSchedule[day.id] = {
            is_active: day.id >= 1 && day.id <= 5,
            shifts: [{ start_time: '08:00', end_time: '18:00' }]
          }
        }
      })
    },

    startConfiguring() {
      this.configuringNew = true
      this.populateWeekSchedule()
    },

    addShift(dayId) {
      if (!this.weekSchedule[dayId]) return
      this.weekSchedule[dayId].shifts.push({
        start_time: '14:00',
        end_time: '18:00'
      })
    },

    removeShift(dayId, index) {
      if (!this.weekSchedule[dayId] || !this.weekSchedule[dayId].shifts) return
      this.weekSchedule[dayId].shifts.splice(index, 1)
      if (this.weekSchedule[dayId].shifts.length === 0) {
        this.weekSchedule[dayId].is_active = false
        this.weekSchedule[dayId].shifts.push({ start_time: '08:00', end_time: '18:00' })
      }
    },

    async fetchBlocks(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/calendar-blocks',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 30000,
            onUpdate: (freshRes) => {
              this.blocks = Array.isArray(freshRes) ? freshRes : (freshRes.calendar_blocks || [])
            }
          }
        )
        if (!res) return
        this.blocks = Array.isArray(res) ? res : (res.calendar_blocks || [])
      } catch (error) {
        console.error('Erro ao buscar bloqueios:', error)
      }
    },

    async fetchAppointments(force = false) {
      try {
        const res = await fetchWithCache(
          getUrlBase()[getEnv()] + '/json/api/v1/scheduling',
          { headers: getAuthHeaders() },
          {
            forceRefresh: force,
            ttl: 30000,
            onUpdate: (freshRes) => {
              this.appointments = Array.isArray(freshRes) ? freshRes : []
            }
          }
        )
        if (!res) return
        this.appointments = Array.isArray(res) ? res : []
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error)
      }
    },


    async saveAllWorkingHours() {
      const profId = parseInt(this.selectedProfessionalId)
      if (!profId) {
        showToast('Selecione um profissional', 'warning')
        return
      }

      this.savingHours = true

      const schedules = []
      this.weekDays.forEach(day => {
        const sched = this.weekSchedule[day.id]
        if (sched.is_active && sched.shifts.length > 0) {
          sched.shifts.forEach(shift => {
            if (shift.start_time && shift.end_time) {
              schedules.push({
                day_of_week: day.id,
                start_time: shift.start_time,
                end_time: shift.end_time,
                is_active: 1
              })
            }
          })
        } else {
          schedules.push({
            day_of_week: day.id,
            start_time: '08:00',
            end_time: '18:00',
            is_active: 0
          })
        }
      })

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/working-hours',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              professional_id: profId,
              schedules: schedules
            })
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar horários'))
          return
        }

        showToast('Expediente semanal salvo com sucesso!', 'success')
        invalidateCache('working-hours')
        this.configuringNew = false
        await this.fetchWorkingHours(true)
      } catch (error) {
        console.error('Erro ao salvar expedientes:', error)

        showToast('Erro ao salvar horários de atendimento')
      } finally {
        this.savingHours = false
      }
    },

    openBlockForm() {
      const activeProfId = getProfessionalId()
      const defaultProf = this.professionals.find(p => p.id === parseInt(activeProfId)) || this.professionals[0]

      this.formBlock = {
        id: '',
        professional_id: this.selectedProfessionalId || (defaultProf ? defaultProf.id : ''),
        start_datetime: '',
        end_datetime: '',
        reason: ''
      }
      this.formBlockError = ''
      this.formBlockSubmitted = false
      this.openFormBlock = true
      this.fetchAppointments()
    },

    openNewBlockForm() {
      this.openBlockForm()
    },

    hasDateOrderError() {
      if (!this.formBlock.start_datetime || !this.formBlock.end_datetime) return false
      const start = new Date(this.formBlock.start_datetime).getTime()
      const end = new Date(this.formBlock.end_datetime).getTime()
      return !isNaN(start) && !isNaN(end) && end <= start
    },

    getConflictingAppointments() {
      if (!this.formBlock.start_datetime || !this.formBlock.end_datetime || !this.formBlock.professional_id) {
        return []
      }

      const blockStart = new Date(this.formBlock.start_datetime).getTime()
      const blockEnd = new Date(this.formBlock.end_datetime).getTime()

      if (isNaN(blockStart) || isNaN(blockEnd) || blockStart >= blockEnd) {
        return []
      }

      const profId = parseInt(this.formBlock.professional_id)

      return this.appointments.filter(app => {
        const appProfId = parseInt(app.professional_id)
        if (appProfId !== profId) return false
        if (app.status === 'cancelled' || app.status === 'concluded') return false

        const timeStr = (app.time || '00:00').substring(0, 5)
        const appStart = new Date(`${app.date}T${timeStr}:00`).getTime()
        const durationMin = parseInt(app.duration) || 60
        const appEnd = appStart + (durationMin * 60 * 1000)

        if (isNaN(appStart)) return false

        return blockStart < appEnd && blockEnd > appStart
      })
    },

    formatConflictDateTime(app) {
      if (!app || !app.date) return ''
      const parts = app.date.split('-')
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : app.date
      const formattedTime = (app.time || '').substring(0, 5)
      return `${formattedDate} às ${formattedTime}`
    },

    async postBlock() {
      this.formBlockSubmitted = true
      this.formBlockError = ''

      const f = this.formBlock
      if (!f.professional_id || !f.start_datetime || !f.end_datetime) {
        this.formBlockError = 'Preencha todos os campos obrigatórios (*)'
        return
      }

      const startMs = new Date(f.start_datetime).getTime()
      const endMs = new Date(f.end_datetime).getTime()

      if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
        this.formBlockError = 'A data/hora de término deve ser posterior à data/hora de início'
        return
      }

      const conflicts = this.getConflictingAppointments()
      if (conflicts.length > 0) {
        const confirmMsg =
          `⚠️ ATENÇÃO: Há ${conflicts.length} agendamento(s) com clientes no período selecionado!\n\n` +
          conflicts.map(c => `• ${c.name || 'Cliente'} (${this.formatConflictDateTime(c)} - ${c.service || 'Serviço'})`).join('\n') +
          `\n\nSalvar este bloqueio NÃO cancelará nem remanejará os clientes automaticamente.\n\nDeseja registrar o bloqueio mesmo assim?`

        if (!confirm(confirmMsg)) {
          return
        }
      }

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/calendar-blocks',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              professional_id: parseInt(f.professional_id),
              start_datetime: f.start_datetime.replace('T', ' ') + ':00',
              end_datetime: f.end_datetime.replace('T', ' ') + ':00',
              reason: f.reason ? f.reason.trim() : ''
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar bloqueio'))
          return
        }

        showToast('Bloqueio salvo com sucesso', 'success')
        invalidateCache('calendar-blocks')
        invalidateCache('dashboard')
        this.openFormBlock = false
        this.loading = true
        await this.fetchBlocks(true)
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar bloqueio:', error)
        showToast('Erro ao salvar bloqueio')
      }
    },

    async deleteBlock(blockId) {
      if (!confirm('Deseja realmente remover este bloqueio?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/calendar-blocks?id=' + blockId,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify({ id: blockId })
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao deletar bloqueio'))
          return
        }

        showToast('Bloqueio removido com sucesso', 'success')
        invalidateCache('calendar-blocks')
        invalidateCache('dashboard')
        this.loading = true
        await this.fetchBlocks(true)
        this.loading = false
      } catch (error) {
        console.error('Erro ao excluir bloqueio:', error)
        showToast('Erro ao excluir bloqueio')
      }
    }

  }
}
