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
    localStorage.removeItem('userRole')
    localStorage.removeItem('userDisplayName')
    localStorage.removeItem('professionalId')
    try { sessionStorage.clear() } catch (e) {}
    window.location.href = 'login.html'
    return true
  }
  if (response.status === 403) {
    showToast('Acesso negado: você não possui permissão para esta ação.', 'error')
    return true
  }
  return false
}

function logout() {
  localStorage.removeItem('jwtToken')
  localStorage.removeItem('userRole')
  localStorage.removeItem('userDisplayName')
  localStorage.removeItem('professionalId')
  try { sessionStorage.clear() } catch (e) {}
  window.location.href = 'login.html'
}


function getUserRole() {
  return localStorage.getItem('userRole') || 'admin'
}

function getUserRoleLabel() {
  const role = getUserRole()
  if (role === 'admin') return 'Administrador'
  if (role === 'receptionist') return 'Recepcionista'
  return 'Profissional'
}

function getUserDisplayName() {
  return localStorage.getItem('userDisplayName') || 'Ericeira Designer'
}

function getProfessionalId() {
  return localStorage.getItem('professionalId') || null
}

function hasPermission(allowedRoles = []) {
  const currentRole = getUserRole()
  if (currentRole === 'admin') return true
  if (typeof allowedRoles === 'string') allowedRoles = [allowedRoles]
  return allowedRoles.includes(currentRole)
}

function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container')
  if (!container) return
  const colors = {
    error: 'bg-red-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  }
  const toast = document.createElement('div')
  toast.className = `${colors[type] || colors.error} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium mb-2 transition-opacity duration-300`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 3500)
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

/**
 * Realiza fetch com estratégia Stale-While-Revalidate (SWR) e cache em sessionStorage
 * Permite renderização imediata (0ms) na transição de telas e revalidação em background.
 *
 * @param {string} url - URL para requisição
 * @param {RequestInit} [options={}] - Opções do fetch (headers, method, etc.)
 * @param {Object} [config={}] - Configurações de cache
 * @param {number} [config.ttl=60000] - Tempo de vida em ms (padrão: 60s)
 * @param {Function} [config.onUpdate=null] - Callback disparado se novos dados divergirem
 * @param {boolean} [config.forceRefresh=false] - Forçar busca na rede ignorando cache
 * @returns {Promise<any>}
 */
async function fetchWithCache(url, options = {}, config = {}) {
  const method = (options.method || 'GET').toUpperCase()
  if (method !== 'GET' || config.forceRefresh) {
    const res = await fetch(url, options)
    if (handleAuthError(res)) return null
    return await res.json()
  }

  const cacheKey = 'swr_' + url
  const ttl = config.ttl !== undefined ? config.ttl : 60000
  let cached = null

  try {
    const raw = sessionStorage.getItem(cacheKey)
    if (raw) {
      cached = JSON.parse(raw)
    }
  } catch (e) {
    console.warn('Erro ao ler do sessionStorage:', e)
  }

  const now = Date.now()
  const isFresh = cached && (now - cached.timestamp < ttl)

  // Se já temos cache disponível
  if (cached && cached.data !== undefined) {
    // Se o dado ainda está estritamente "fresh" e não temos callback para atualizar tela:
    if (isFresh && !config.onUpdate) {
      return cached.data
    }

    // Dispara a revalidação em segundo plano sem travar a renderização inicial
    fetch(url, options)
      .then(async (res) => {
        if (handleAuthError(res)) return
        const freshData = await res.json()
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: freshData
          }))
        } catch (e) {}

        if (typeof config.onUpdate === 'function') {
          try {
            if (JSON.stringify(freshData) !== JSON.stringify(cached.data)) {
              config.onUpdate(freshData)
            }
          } catch (err) {
            config.onUpdate(freshData)
          }
        }
      })
      .catch((err) => {
        console.warn('Revalidação em segundo plano falhou:', url, err)
      })

    // Retorna imediatamente o dado em cache para exibição instantânea
    return cached.data
  }

  // Cold start (sem cache): busca normal
  const res = await fetch(url, options)
  if (handleAuthError(res)) return null
  const data = await res.json()

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      data: data
    }))
  } catch (e) {}

  return data
}

/**
 * Invalida o cache do sessionStorage
 * @param {string} [pattern=''] - Substring para filtrar chaves (ex: 'scheduling', 'services', 'dashboard')
 */
function invalidateCache(pattern = '') {
  try {
    const toRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('swr_')) {
        if (!pattern || key.includes(pattern)) {
          toRemove.push(key)
        }
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k))
  } catch (e) {
    console.warn('Erro ao invalidar cache:', e)
  }
}

/**
 * Cria um observador de rolagem infinita para carregar mais itens ao se aproximar do final
 * @param {HTMLElement} triggerElement - Elemento sentinela no rodapé da lista
 * @param {Function} onIntersect - Callback acionado quando o sentinela entra no viewport
 * @param {number} [marginPx=250] - Margem em pixels antes do final da página para antecipar o carregamento
 * @returns {object} Objeto com método disconnect()
 */
function createInfiniteScrollObserver(triggerElement, onIntersect, marginPx = 250) {
  if (!triggerElement || typeof onIntersect !== 'function') return null

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          onIntersect()
        }
      })
    }, {
      rootMargin: `${marginPx}px 0px`
    })

    observer.observe(triggerElement)
    return observer
  } else {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - marginPx)) {
            onIntersect()
          }
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return {
      disconnect: () => window.removeEventListener('scroll', handleScroll)
    }
  }
}


