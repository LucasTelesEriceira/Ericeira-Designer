function profissionaisApp() {
  return {
    professionals: [],
    loading: true,
    openFormProfessional: false,
    formProfessional: {
      id: '',
      name: '',
      whatsapp: '',
      email: '',
      specialty: '',
      active: 1,
      create_user: false,
      password: '',
      user_role: 'professional',
    },
    errors: {},

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchProfessionals()
      this.loading = false
    },

    async fetchProfessionals() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          { headers: getAuthHeaders() }
        )
        const res = await response.json()
        const raw = Array.isArray(res) ? res : (res.professionals || [])
        this.professionals = raw.map(p => ({
          id: p.id,
          user_id: p.user_id || null,
          name: p.name || '',
          whatsapp: p.whatsapp || '',
          email: p.email || '',
          specialty: p.specialty || '',
          active: p.active !== undefined ? parseInt(p.active) : 1,
        }))
      } catch (error) {
        console.error('Erro ao buscar profissionais:', error)
      }
    },

    openNewProfessionalForm() {
      this.formProfessional = {
        id: '',
        name: '',
        whatsapp: '',
        email: '',
        specialty: '',
        active: 1,
        create_user: false,
        password: '',
        user_role: 'professional',
      }
      this.errors = {}
      this.openFormProfessional = true
    },

    openEditProfessionalForm(p) {
      this.formProfessional = {
        id: p.id,
        name: p.name || '',
        whatsapp: p.whatsapp || '',
        email: p.email || '',
        specialty: p.specialty || '',
        active: p.active !== undefined ? parseInt(p.active) : 1,
        create_user: !!p.user_id,
        password: '',
        user_role: 'professional',
      }
      this.errors = {}
      this.openFormProfessional = true
    },

    validateProfessionalForm() {
      this.errors = {}
      const f = this.formProfessional
      if (!f.name || !f.name.trim()) this.errors.name = 'Nome é obrigatório'
      if (!f.whatsapp || !f.whatsapp.trim()) this.errors.whatsapp = 'WhatsApp é obrigatório'
      if (f.create_user && !f.email) this.errors.email = 'Informe um e-mail válido para a conta'
      if (f.create_user && !f.id && !f.password) this.errors.password = 'Informe uma senha inicial para o usuário'
      return Object.keys(this.errors).length === 0
    },

    async postProfessional() {
      if (!this.validateProfessionalForm()) return
      try {
        const f = this.formProfessional
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/professionals',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              name: f.name.trim(),
              whatsapp: f.whatsapp.trim(),
              email: f.email ? f.email.trim() : '',
              specialty: f.specialty ? f.specialty.trim() : '',
              active: f.active ? 1 : 0,
              create_user: f.create_user,
              password: f.password || undefined,
              user_role: f.user_role || 'professional',
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar profissional'))
          return
        }

        showToast(f.id ? 'Profissional atualizado com sucesso' : 'Profissional e usuário criados com sucesso', 'success')
        this.openFormProfessional = false
        this.loading = true
        await this.fetchProfessionals()
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar profissional:', error)
        showToast('Erro ao salvar profissional')
      }
    },
  }
}
