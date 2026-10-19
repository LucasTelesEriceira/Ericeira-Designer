/**
 * notifications.js — Sistema de Notificações Nativas, Alerta Sonoro e PWA
 * Ericeira Designer
 */

let cachedAudioCtx = null;
let isAudioUnlocked = false;

// Registra Service Worker para suporte a PWA e Notificações no Mobile e Desktop
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com escopo:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
    });
  }
}

// Inicializa desbloqueio do AudioContext no primeiro toque/clique do usuário
function setupAudioUnlock() {
  const unlock = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !cachedAudioCtx) {
        cachedAudioCtx = new AudioCtx();
      }
      if (cachedAudioCtx && cachedAudioCtx.state === 'suspended') {
        cachedAudioCtx.resume();
      }
      isAudioUnlocked = true;
    } catch (e) {
      console.warn('Erro ao inicializar AudioContext:', e);
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

/**
 * Toca um aviso sonoro elegante e suave (Two-Tone Bell Chime)
 * Usa Web Audio API nativo — funciona 100% offline e sem arquivos de áudio externos
 */
function playAppointmentChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!cachedAudioCtx) {
      cachedAudioCtx = new AudioCtx();
    }
    if (cachedAudioCtx.state === 'suspended') {
      cachedAudioCtx.resume();
    }

    const ctx = cachedAudioCtx;
    const now = ctx.currentTime;

    // Tom 1: 587.33 Hz (Ré 5 - Brilho inicial)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tom 2: 880 Hz (Lá 5 - Tom harmônico de sino)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    // Vibração háptica no celular (se suportado)
    if (navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }
  } catch (e) {
    console.warn('Não foi possível reproduzir som de notificação:', e);
  }
}

/**
 * Retorna status da permissão de notificação
 * @returns {'granted' | 'denied' | 'default' | 'unsupported'}
 */
function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão ao usuário para exibir notificações
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    if (typeof showToast === 'function') {
      showToast('Notificações não são suportadas neste navegador.', 'warning');
    }
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playAppointmentChime();
      if (typeof showToast === 'function') {
        showToast('Notificações ativadas com sucesso!', 'success');
      }
      showNativeNotification('Notificações Ativas!', {
        body: 'Você receberá avisos quando novos agendamentos forem realizados no link público.',
        icon: 'assets/android-chrome-192x192.png'
      });
      return true;
    } else if (permission === 'denied') {
      if (typeof showToast === 'function') {
        showToast('Permissão de notificação negada nas configurações do navegador.', 'warning');
      }
      return false;
    }
  } catch (err) {
    console.warn('Erro ao solicitar permissão de notificação:', err);
  }
  return false;
}

/**
 * Dispara uma notificação nativa do navegador (tenta Service Worker primeiro, fallback para new Notification)
 */
async function showNativeNotification(title, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const defaultOpts = {
    icon: 'assets/android-chrome-192x192.png',
    badge: 'assets/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: { url: 'agendamentos.html' },
    ...options
  };

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        return await reg.showNotification(title, defaultOpts);
      }
    } catch (e) {
      console.warn('Falha no reg.showNotification, tentando fallback:', e);
    }
  }

  try {
    const notif = new Notification(title, defaultOpts);
    notif.onclick = function() {
      window.focus();
      this.close();
    };
  } catch (e) {
    console.warn('Falha ao instanciar new Notification():', e);
  }
}

/**
 * Dispara o alerta completo para um agendamento novo
 */
function notifyNewAppointment(appt) {
  playAppointmentChime();

  const clientName = appt.name || appt.client_name || 'Novo Cliente';
  const serviceName = appt.service || appt.service_name || 'Procedimento';
  const time = appt.time ? appt.time.substring(0, 5) : '';
  const dateFormatted = typeof formatDate === 'function' && appt.date ? formatDate(appt.date) : appt.date;

  const title = `🔔 Novo Agendamento: ${clientName}`;
  const body = `${serviceName} • ${dateFormatted} às ${time}${appt.professional ? ` com ${appt.professional}` : ''}`;

  showNativeNotification(title, {
    body,
    tag: 'appt-' + (appt.id || Date.now()),
    data: { url: 'agendamentos.html' }
  });

  if (typeof showToast === 'function') {
    showToast(`🔔 ${title} (${serviceName} às ${time})`, 'info');
  }
}

/**
 * Cria um gerenciador de monitoramento de agendamentos em segundo plano
 */
function startAppointmentMonitor({ onSync, getKnownIds, setKnownIds, intervalMs = 25000 }) {
  let isChecking = false;

  const checkForUpdates = async () => {
    if (isChecking) return;
    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    isChecking = true;
    try {
      if (typeof invalidateCache === 'function') {
        invalidateCache('scheduling');
      }

      if (typeof onSync === 'function') {
        await onSync();
      }
    } catch (err) {
      console.warn('Erro ao sincronizar agendamentos em background:', err);
    } finally {
      isChecking = false;
    }
  };

  // Intervalo periódico
  const timer = setInterval(checkForUpdates, intervalMs);

  // Sincronização ao reabrir/desbloquear tela no celular ou alternar abas
  const onVisibilityChange = () => {
    if (!document.hidden) {
      checkForUpdates();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', () => { checkForUpdates(); });

  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

// Suporte para o botão de "Instalar App" PWA
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
  console.log('[PWA] Aplicativo pronto para instalação');
});

async function promptPwaInstall() {
  if (!deferredInstallPrompt) {
    if (typeof showToast === 'function') {
      showToast('Para instalar no celular, clique no menu do navegador e em "Adicionar à Tela de Início".', 'info');
    }
    return;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === 'accepted') {
    console.log('[PWA] Usuário aceitou instalar o aplicativo');
    deferredInstallPrompt = null;
  }
}

// Inicializações automáticas
initServiceWorker();
setupAudioUnlock();
