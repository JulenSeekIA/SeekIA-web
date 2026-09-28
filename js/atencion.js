// 01 · Atención — el chat real de Centro Aura con interfaz propia.
// Habla con el MISMO Chat Trigger de n8n que usaba el widget @n8n/chat (1,7 MB),
// replicando su protocolo: POST {action:'sendMessage', sessionId, chatInput} y, si el
// flujo responde por nodos «Chat» (responseNodes), un WebSocket que va trayendo cada
// parte del mensaje. Backend intacto; solo cambia lo que se ve.
import { crearSemana, esConfirmacionReal, horas, dia } from './agenda.js?v=2';

const WEBHOOK = 'https://paneln8n.seekialabs.com/webhook/estetica-aura-demo/chat';
const OFERTA = /\b(tengo|tenemos|hay|quedan?|libres?|disponibles?|huecos?|te\s+va|te\s+viene|te\s+cuadra|prefieres|te\s+reservo|te\s+apunto|puedo\s+darte|te\s+ofrezco|que\s+tal)\b/i;
const ESPERA_MAX = 45000;

function nuevaSesion() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'web-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function escapar(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatear(texto) {
  return escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function horaAhora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function textoDe(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  return data.output ?? data.text ?? data.message ?? '';
}

// ---------- cliente del chat de n8n ----------
class ChatN8n {
  constructor(url, eventos) {
    this.url = url;
    this.ev = eventos;
    this.sessionId = nuevaSesion();
    this.ws = null;
    this.wsPuedeEnviar = false;
  }

  async enviar(texto) {
    this.ev.espera(true);
    if (this.ws && this.wsPuedeEnviar && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ sessionId: this.sessionId, action: 'sendMessage', chatInput: texto, files: [] }));
      this.wsPuedeEnviar = false;
      return;
    }
    let data;
    const res = await fetch(this.url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sendMessage', sessionId: this.sessionId, chatInput: texto }),
    });
    try { data = await res.clone().json(); } catch { data = await res.text(); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (data && data.executionStarted && data.executionId) {
      this.abrirSocket(data.executionId, data.resumeToken);
      return;
    }
    const t = textoDe(data);
    if (t) this.ev.mensaje(t);
    this.ev.espera(false);
  }

  abrirSocket(executionId, token) {
    const origen = new URL(this.url).origin;
    const proto = origen.startsWith('https') ? 'wss' : 'ws';
    let url = `${origen.replace(/^https?/, proto)}/chat?sessionId=${this.sessionId}&executionId=${executionId}&isPublic=true`;
    if (token) url += `&token=${token}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    let formatoViejo; // mismo baile de latidos que el widget oficial
    ws.onmessage = (e) => {
      const t = e.data;
      const viejo = t === 'n8n|heartbeat' || t === 'n8n|continue';
      let tipo;
      if (viejo) tipo = t === 'n8n|heartbeat' ? 'heartbeat' : 'continue';
      else { try { tipo = JSON.parse(t).type; } catch { tipo = undefined; } }
      const valido = viejo ? formatoViejo !== true : formatoViejo !== false;
      if (tipo === 'heartbeat' && valido) {
        formatoViejo = !viejo;
        ws.send(viejo ? 'n8n|heartbeat-ack' : JSON.stringify({ type: 'heartbeat-ack' }));
        return;
      }
      if (tipo === 'continue' && valido) {
        this.wsPuedeEnviar = false;
        this.ev.espera(true);
        return;
      }
      let texto = t;
      try {
        const j = JSON.parse(t);
        if (j.type === 'message' || j.type === 'with-buttons') texto = j.text;
        else if (j.type === 'error') texto = j.message;
      } catch { /* texto plano */ }
      this.wsPuedeEnviar = true;
      if (texto) this.ev.mensaje(String(texto));
    };
    ws.onclose = () => {
      this.ws = null;
      this.wsPuedeEnviar = false;
      this.ev.espera(false);
    };
    ws.onerror = () => { /* onclose se encarga */ };
  }
}

// ---------- la interfaz ----------
export function initAtencion() {
  const msgs = document.getElementById('atencion-msgs');
  const form = document.getElementById('atencion-form');
  const input = document.getElementById('atencion-input');
  const chips = document.getElementById('atencion-chips');
  const estado = document.getElementById('atencion-estado');
  const agendaHost = document.getElementById('atencion-agenda');
  if (!msgs || !form || !input || !agendaHost) return;

  const semana = crearSemana(agendaHost);
  const enviarBtn = form.querySelector('.movil__enviar');

  let indicador = null;
  let esperando = false;
  let temporizador = null;
  let reindicador = null;
  let turno = '';            // todas las partes del bot desde el último mensaje de la clienta
  let citaEnTurno = false;
  let diaContexto = null;    // el último día del que se ha hablado
  let diaOferta = null;

  const bajar = () => { msgs.scrollTop = msgs.scrollHeight; }; // solo el chat, nunca la página

  function ponerEstado(clave, texto) {
    estado.dataset.estado = clave;
    estado.textContent = texto;
  }

  function mostrarIndicador(si) {
    if (si && !indicador) {
      indicador = document.createElement('div');
      indicador.className = 'escribiendo';
      indicador.setAttribute('aria-label', 'Sara está escribiendo');
      indicador.innerHTML = '<i></i><i></i><i></i>';
      msgs.appendChild(indicador);
      bajar();
    } else if (!si && indicador) {
      indicador.remove();
      indicador = null;
    }
  }

  function burbuja(texto, quien, html = false) {
    const el = document.createElement('div');
    el.className = `burbuja burbuja--${quien}`;
    el.innerHTML = (html ? texto : formatear(texto)) + `<span class="burbuja__hora mono">${horaAhora()}</span>`;
    if (indicador && quien === 'bot') msgs.insertBefore(el, indicador); else msgs.appendChild(el);
    bajar();
    return el;
  }

  function chipCita(texto) {
    const el = document.createElement('span');
    el.className = 'cita-chip';
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      escapar(`Cita puesta en la agenda · ${texto}`);
    msgs.appendChild(el);
    bajar();
  }

  function espera(si) {
    esperando = si;
    window.clearTimeout(temporizador);
    window.clearTimeout(reindicador);
    if (si) {
      mostrarIndicador(true);
      ponerEstado('escribiendo', 'escribiendo…');
      temporizador = window.setTimeout(() => {
        mostrarIndicador(false);
        ponerEstado('linea', 'en línea');
        burbuja('La demo está tardando más de lo normal. Vuelve a escribirle en un momento.', 'error');
        esperando = false;
        actualizarEnvio();
      }, ESPERA_MAX);
    } else {
      mostrarIndicador(false);
      if (estado.dataset.estado !== 'cita') ponerEstado('linea', 'en línea');
    }
    actualizarEnvio();
  }

  function alRecibir(texto) {
    window.clearTimeout(temporizador);
    mostrarIndicador(false);
    burbuja(texto, 'bot');
    turno += ' ' + texto;
    diaContexto = dia(texto) || diaContexto;

    if (!citaEnTurno && esConfirmacionReal(turno)) {
      const hs = horas(turno);
      if (hs.length) {
        citaEnTurno = true;
        const fecha = dia(turno) || diaOferta || diaContexto;
        const donde = semana.confirmar(fecha, hs[0], 'cita');
        chipCita(donde);
        ponerEstado('cita', 'cita puesta');
        window.setTimeout(() => { if (!esperando) ponerEstado('linea', 'en línea'); }, 3200);
      }
    } else if (!citaEnTurno && turno.includes('?') && OFERTA.test(turno)) {
      // el flujo parte la respuesta en 2-3 mensajes: la oferta se lee sobre el turno entero
      const hs = horas(turno);
      const fecha = dia(turno) || diaContexto;
      if (fecha && hs.length) {
        semana.limpiarOfertas();
        hs.slice(0, 4).forEach((min) => semana.ofrecer(fecha, min));
        diaOferta = fecha;
      }
    }

    // el flujo manda el mensaje en 2-3 partes: mientras el socket siga abierto, vienen más
    esperando = false;
    if (estado.dataset.estado !== 'cita') ponerEstado('linea', 'en línea');
    reindicador = window.setTimeout(() => {
      if (chat.ws && chat.ws.readyState === WebSocket.OPEN) {
        mostrarIndicador(true);
        temporizador = window.setTimeout(() => mostrarIndicador(false), 9000);
      }
    }, 650);
    actualizarEnvio();
  }

  const chat = new ChatN8n(WEBHOOK, { mensaje: alRecibir, espera });

  function actualizarEnvio() {
    enviarBtn.disabled = esperando || input.value.trim() === '';
  }

  async function mandar(texto) {
    const limpio = texto.trim();
    if (!limpio || esperando) return;
    burbuja(limpio, 'yo');
    turno = '';
    citaEnTurno = false;
    diaContexto = dia(limpio) || diaContexto;
    input.value = '';
    ajustarAlto();
    try {
      await chat.enviar(limpio);
    } catch (err) {
      espera(false);
      burbuja(`No he podido conectar con el asistente. Prueba otra vez o <a href="${WEBHOOK}" target="_blank" rel="noopener">ábrelo en una pestaña nueva</a>.`, 'error', true);
      ponerEstado('error', 'sin conexión');
      console.warn('Atención: error al enviar', err);
    }
  }

  function ajustarAlto() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 104) + 'px';
    actualizarEnvio();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); mandar(input.value); });
  input.addEventListener('input', ajustarAlto);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); mandar(input.value); }
  });
  chips?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prompt]');
    if (!b || esperando) return;
    b.disabled = true;
    mandar(b.dataset.prompt);
  });
  actualizarEnvio();
}
