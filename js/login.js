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
          // Armazena o token no localStorage
          localStorage.setItem('jwtToken', data.token)
          // Redireciona para a página dashboard.html
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
