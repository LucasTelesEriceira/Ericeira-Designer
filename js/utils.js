function getUrlBase() {
  return {
    development: 'http://api-agendamento.teste',
    production: 'https://lightslategrey-guanaco-998055.hostingersite.com',
  }
}

function getEnv() {
  return 'development'
}

function getAuthHeaders() {
  return {
    'Authorization': 'Bearer ' + localStorage.getItem('jwtToken'),
  }
}

function handleAuthError(response) {
  if (response.status === 401) {
    localStorage.removeItem('jwtToken')
    window.location.href = 'login.html'
    return true
  }
  return false
}

function logout() {
  localStorage.removeItem('jwtToken')
  window.location.href = 'login.html'
}

function formatDate(date) {
  if (!date) return ''
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function formatCurrency(value) {
  if (!value && value !== 0) return ''
  return 'R$ ' + parseFloat(value).toFixed(2)
}

function getTodayLabel() {
  const now = new Date()
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${dias[now.getDay()]}, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`
}
