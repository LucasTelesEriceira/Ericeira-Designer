// document.addEventListener('alpine:init', () => {
//   Alpine.data('loginForm', () => ({
//     username: '',
//     password: '',
//     errorMessage: '',
//     async login() {
//       try {
//         const response = await fetch('http://api-agendamento.local/json/jwt-auth/v1/token', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             username: this.username,
//             password: this.password,
//           }),
//         });

//         const data = await response.json();

//         if (data.token) {
//           // Armazena o token no localStorage
//           localStorage.setItem('jwtToken', data.token);
//           // Redireciona para a página user.html
//           window.location.href = 'user.html';
//         } else {
//           this.errorMessage = 'Login falhou. Verifique suas credenciais.';
//         }
//       } catch (error) {
//         this.errorMessage = 'Ocorreu um erro. Tente novamente.';
//       }
//     },
//   }));
// });

function loginForm() {
  return {
    username: '',
    password: '',
    errorMessage: '',
    async login() {
      console.log(this.username);
      try {
        const response = await fetch('http://api-agendamento.local/json/jwt-auth/v1/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        });

        const data = await response.json();

        if (data.token) {
          // Armazena o token no localStorage
          localStorage.setItem('jwtToken', data.token);
          // Redireciona para a página user.html
          window.location.href = 'user.html';
        } else {
          this.errorMessage = 'Login falhou. Verifique suas credenciais.';
        }
      } catch (error) {
        this.errorMessage = 'Ocorreu um erro. Tente novamente.';
      }
    },
  };
}