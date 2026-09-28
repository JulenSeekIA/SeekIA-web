// 02 · Voz — la llamada real con VAPI, en línea (sin modal).
// Mismo asistente, misma clave pública y mismo tope de 60 s que js/voz.js (dental sigue usando ese).
// Las barras de marca hacen de onda: se mueven con el volumen REAL de la voz del asistente.
import { esConfirmacionReal, horas, dia, describir } from './agenda.js?v=1';

const VAPI_PUBLIC_KEY = '31e8e192-5f11-4511-9ddb-6239922be976';
const VAPI_ASSISTANT_ID = '03e83fce-6297-4457-8f3c-17f425c0e800';
// SDK oficial (trae una versión de Daily soportada). El widget html-script-tag cargaba
// daily-js 0.85, que Daily ya da por no soportada. Versión fijada: no se actualiza sola.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.7.1/+esm';
const MAX_SEGUNDOS = 60;
const N_BARRAS = 36;

const VARIABLES = {
  nombre_centro: 'Centro Aura',
  nombre_asistente: 'Sara',
  servicios_precios: '- Limpieza facial: 45 euros.\n- Depilación láser (zona): desde 30 euros.\n- Masaje relajante 60 min: 50 euros.\n- Manicura: 25 euros.\n- Valoración inicial: gratuita.',
  horario: 'Lunes a sábado de 10 a 20h.',
};

let sdk = null;

function cargarSdk() {
  if (!sdk) {
    sdk = import(SDK_URL).then((m) => {
      const Vapi = m.default?.default || m.default || m.Vapi;
      return new Vapi(VAPI_PUBLIC_KEY);
    });
    sdk.catch(() => { sdk = null; });
  }
  return sdk;
}

export function initVozEscena() {
  const root = document.getElementById('llamada');
  if (!root) return;
  const onda = document.getElementById('llamada-onda');
  const estadoEl = document.getElementById('llamada-estado');
  const tiempoEl = document.getElementById('llamada-tiempo');
  const boton = document.getElementById('llamada-boton');
  const botonTxt = boton.querySelector('.llamada__boton-txt');
  const trans = document.getElementById('llamada-trans');
  const ticket = document.getElementById('llamada-ticket');
  const ticketCuando = document.getElementById('llamada-ticket-cuando');
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // la onda: N barras con una forma de campana para que parezca voz y no ecualizador
  const barras = [];
  for (let i = 0; i < N_BARRAS; i += 1) {
    const s = document.createElement('span');
    s.style.setProperty('--i', i);
    onda.appendChild(s);
    barras.push(s);
  }
  const forma = barras.map((_, i) => 0.35 + 0.65 * Math.sin(Math.PI * (i + 0.5) / N_BARRAS));

  let vapi = null;
  let estado = 'reposo';
  let segundos = 0;
  let reloj = null;
  let volumen = 0;
  let suave = 0;
  let habla = false;
  let raf = null;
  let turnoBot = '';
  let citaHecha = false;

  function ponerEstado(e, texto) {
    estado = e;
    root.dataset.estado = e;
    if (texto) estadoEl.textContent = texto;
    botonTxt.textContent = e === 'activa' || e === 'conectando' ? 'Colgar' : e === 'terminada' ? 'Volver a llamar' : 'Llamar ahora';
  }

  function pintarOnda(t) {
    suave += (volumen - suave) * 0.25;
    const base = estado === 'activa' ? 0.06 : 0.05;
    for (let i = 0; i < N_BARRAS; i += 1) {
      const ruido = 0.55 + 0.45 * Math.sin(t / 90 + i * 1.7) * Math.sin(t / 150 + i * 0.6);
      const h = base + Math.min(1, suave * 2.2) * forma[i] * ruido;
      barras[i].style.setProperty('--h', h.toFixed(3));
    }
    raf = estado === 'activa' ? requestAnimationFrame(pintarOnda) : null;
  }

  function reposoOnda() {
    barras.forEach((b) => b.style.setProperty('--h', '0.05'));
  }

  function arrancarReloj() {
    segundos = 0;
    tiempoEl.textContent = '00:00';
    reloj = window.setInterval(() => {
      segundos += 1;
      tiempoEl.textContent = `00:${String(segundos).padStart(2, '0')}`.replace('00:60', '01:00');
      if (segundos >= MAX_SEGUNDOS) colgar();
    }, 1000);
  }
  const pararReloj = () => { window.clearInterval(reloj); reloj = null; };

  // VAPI manda la voz frase a frase: se agrupan en una burbuja por turno, con la frase
  // que aún se está diciendo al final, en gris
  function linea(rol, texto, parcial) {
    const vacio = trans.querySelector('.llamada__vacio');
    if (vacio) vacio.remove();
    let el = trans.lastElementChild;
    if (!el || !el.classList.contains('linea-voz') || el.dataset.rol !== rol) {
      el = document.createElement('div');
      el.className = `linea-voz linea-voz--${rol === 'assistant' ? 'bot' : 'yo'}`;
      el.dataset.rol = rol;
      el.innerHTML = `<span class="linea-voz__quien">${rol === 'assistant' ? 'Sara' : 'tú'}</span><p><span class="linea-voz__fijo"></span><span class="linea-voz__vivo"></span></p>`;
      trans.appendChild(el);
    }
    const fijo = el.querySelector('.linea-voz__fijo');
    const vivo = el.querySelector('.linea-voz__vivo');
    const sep = fijo.textContent ? ' ' : '';
    if (parcial) vivo.textContent = sep + texto;
    else { fijo.textContent += sep + texto; vivo.textContent = ''; }
    trans.scrollTop = trans.scrollHeight; // solo la transcripción, nunca la página
  }

  function revisarCita(texto) {
    turnoBot += ' ' + texto;
    if (citaHecha || !esConfirmacionReal(turnoBot)) return;
    const hs = horas(turnoBot);
    if (!hs.length) return;
    citaHecha = true;
    const cuando = describir(dia(turnoBot), hs[0]);
    ticketCuando.textContent = cuando.charAt(0).toUpperCase() + cuando.slice(1);
    ticket.hidden = false;
  }

  function cablear() {
    vapi.on('call-start', () => {
      ponerEstado('activa', 'en llamada · habla con ella');
      arrancarReloj();
      if (!reducido && !raf) raf = requestAnimationFrame(pintarOnda);
    });
    vapi.on('call-end', () => {
      pararReloj();
      volumen = 0;
      ponerEstado('terminada', 'llamada terminada');
      reposoOnda();
    });
    vapi.on('error', (err) => {
      pararReloj();
      ponerEstado('error', 'no se pudo conectar · revisa el permiso del micrófono');
      reposoOnda();
      avisoError();
      console.warn('VAPI', err);
    });
    vapi.on('volume-level', (v) => { volumen = typeof v === 'number' ? v : 0; });
    vapi.on('speech-start', () => { habla = true; root.classList.remove('is-escucha'); estadoEl.textContent = 'Sara está hablando'; });
    vapi.on('speech-end', () => { habla = false; root.classList.add('is-escucha'); estadoEl.textContent = 'te escucha'; });
    vapi.on('message', (msg) => {
      if (msg?.type !== 'transcript' || !msg.transcript) return;
      const parcial = msg.transcriptType !== 'final';
      linea(msg.role === 'assistant' ? 'assistant' : 'user', msg.transcript, parcial);
      if (!parcial) {
        if (msg.role === 'assistant') revisarCita(msg.transcript);
        else turnoBot = '';
      }
    });
  }

  async function llamar() {
    ponerEstado('conectando', 'conectando… acepta el micrófono');
    trans.innerHTML = '';
    ticket.hidden = true;
    turnoBot = '';
    citaHecha = false;
    tiempoEl.textContent = '00:00';
    try {
      if (!vapi) { vapi = await cargarSdk(); cablear(); }
      await vapi.start(VAPI_ASSISTANT_ID, { variableValues: { ...VARIABLES, now: new Date().toISOString() } });
    } catch (err) {
      ponerEstado('error', 'no se pudo conectar · revisa el permiso del micrófono');
      avisoError();
      console.warn('No se pudo iniciar la llamada', err);
    }
  }

  function avisoError() {
    if (trans.children.length) return;
    trans.innerHTML = '<p class="llamada__vacio">No se ha podido conectar. Comprueba que el navegador tiene permiso para usar el micrófono y vuelve a llamar.</p>';
  }

  function colgar() {
    pararReloj();
    try { vapi?.stop(); } catch { /* nada */ }
    volumen = 0;
    ponerEstado('terminada', 'llamada terminada');
    reposoOnda();
  }

  boton.addEventListener('click', () => {
    if (estado === 'activa' || estado === 'conectando') colgar();
    else llamar();
  });

  // si la persona se va de la página con la llamada puesta, se cuelga
  window.addEventListener('pagehide', () => { if (estado === 'activa') colgar(); });

  reposoOnda();
}
