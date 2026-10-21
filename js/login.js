function loginForm() {
  return {
    username: localStorage.getItem('savedUsername') || '',
    password: '',
    rememberMe: !!localStorage.getItem('savedUsername'),
    showPassword: false,
    loading: false,
    errorMessage: '',
    capsLockOn: false,

    // Rate Limiting no cliente contra brute force
    failedAttempts: parseInt(sessionStorage.getItem('login_failed_attempts') || '0', 10),
    lockoutUntil: parseInt(sessionStorage.getItem('login_lockout_until') || '0', 10),
    lockoutTimer: 0,
    lockoutInterval: null,

    init() {
      // 1. Redireciona caso já tenha sessão ativa válida
      if (localStorage.getItem('jwtToken')) {
        window.location.href = 'dashboard.html'
        return
      }

      // 2. Verifica se há bloqueio temporário ativo
      this.checkLockoutStatus()

      // 3. Limpa mensagens de erro ao digitar
      this.$watch('username', () => {
        if (this.errorMessage && !this.lockoutTimer) this.errorMessage = ''
      })
      this.$watch('password', () => {
        if (this.errorMessage && !this.lockoutTimer) this.errorMessage = ''
      })
    },

    checkLockoutStatus() {
      const now = Date.now()
      if (this.lockoutUntil > now) {
        this.startLockoutCountdown(Math.ceil((this.lockoutUntil - now) / 1000))
      } else {
        this.clearLockout()
      }
    },

    startLockoutCountdown(seconds) {
      this.lockoutTimer = seconds
      if (this.lockoutInterval) clearInterval(this.lockoutInterval)
      this.errorMessage = `Muitas tentativas incorretas. Aguarde ${this.lockoutTimer}s para tentar novamente.`

      this.lockoutInterval = setInterval(() => {
        this.lockoutTimer--
        if (this.lockoutTimer <= 0) {
          this.clearLockout()
        } else {
          this.errorMessage = `Muitas tentativas incorretas. Aguarde ${this.lockoutTimer}s para tentar novamente.`
        }
      }, 1000)
    },

    clearLockout() {
      if (this.lockoutInterval) clearInterval(this.lockoutInterval)
      this.lockoutInterval = null
      this.lockoutTimer = 0
      this.lockoutUntil = 0
      sessionStorage.removeItem('login_lockout_until')
      if (this.errorMessage && this.errorMessage.includes('Muitas tentativas')) {
        this.errorMessage = ''
      }
    },

    handleKeydown(event) {
      if (event && event.getModifierState) {
        this.capsLockOn = event.getModifierState('CapsLock')
      }
    },

    handleKeyup(event) {
      if (event && event.getModifierState) {
        this.capsLockOn = event.getModifierState('CapsLock')
      }
    },

    async login() {
      if (this.lockoutTimer > 0 || this.loading) return

      const cleanUsername = (this.username || '').trim()
      const cleanPassword = this.password || ''

      if (!cleanUsername || !cleanPassword) {
        this.errorMessage = 'Por favor, preencha o usuário e a senha.'
        return
      }

      this.loading = true
      this.errorMessage = ''

      // Timeout com AbortController de 12 segundos para não travar
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      try {
        const baseUrl = getUrlBase()[getEnv()]
        const response = await fetch(`${baseUrl}/json/jwt-auth/v1/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: cleanUsername,
            password: cleanPassword,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        let data = {}
        try {
          data = await response.json()
        } catch (jsonErr) {
          throw new Error('Falha ao interpretar resposta do servidor.')
        }

        if (response.ok && data.token) {
          // Sucesso: zera tentativas de erro
          this.failedAttempts = 0
          sessionStorage.removeItem('login_failed_attempts')
          sessionStorage.removeItem('login_lockout_until')

          // Lembrar usuário se selecionado
          if (this.rememberMe) {
            localStorage.setItem('savedUsername', cleanUsername)
          } else {
            localStorage.removeItem('savedUsername')
          }

          // Armazenamento seguro de sessão
          localStorage.setItem('jwtToken', data.token)
          localStorage.setItem('userRole', data.user_role || 'admin')
          localStorage.setItem('userDisplayName', data.user_display_name || cleanUsername)

          if (data.professional_id) {
            localStorage.setItem('professionalId', data.professional_id)
          } else {
            localStorage.removeItem('professionalId')
          }

          // Redireciona para o painel principal
          window.location.href = 'dashboard.html'
        } else {
          // Falha nas credenciais
          this.failedAttempts++
          sessionStorage.setItem('login_failed_attempts', String(this.failedAttempts))

          if (this.failedAttempts >= 5) {
            const lockoutDuration = 30 * 1000 // 30 segundos
            this.lockoutUntil = Date.now() + lockoutDuration
            sessionStorage.setItem('login_lockout_until', String(this.lockoutUntil))
            this.startLockoutCountdown(30)
          } else {
            const remaining = 5 - this.failedAttempts
            const rawMsg = data.message ? data.message.replace(/<[^>]*>?/gm, '').trim() : ''
            this.errorMessage = rawMsg || 'Usuário ou senha incorretos. Tente novamente.'
            if (this.failedAttempts >= 3) {
              this.errorMessage += ` (${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`
            }
          }
        }
      } catch (error) {
        clearTimeout(timeoutId)
        if (error.name === 'AbortError') {
          this.errorMessage = 'Tempo de resposta esgotado. Verifique sua conexão com a internet.'
        } else {
          this.errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão de rede.'
        }
      } finally {
        this.loading = false
      }
    },
  }
}
