function loginForm() {
  return {
    username: '',
    password: '',
    errorMessage: '',
    async login() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/jwt-auth/v1/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: this.username,
              password: this.password,
            }),
          }
        )

        const data = await response.json()

        if (data.token) {
          localStorage.setItem('jwtToken', data.token)
          localStorage.setItem('userRole', data.user_role || 'admin')
          localStorage.setItem('userDisplayName', data.user_display_name || this.username)
          if (data.professional_id) {
            localStorage.setItem('professionalId', data.professional_id)
          } else {
            localStorage.removeItem('professionalId')
          }
          window.location.href = 'dashboard.html'
        } else {
          this.errorMessage = 'Login falhou. Verifique suas credenciais.'
        }
      } catch (error) {
        this.errorMessage = 'Ocorreu um erro. Tente novamente.'
      }
    },
  }
}
