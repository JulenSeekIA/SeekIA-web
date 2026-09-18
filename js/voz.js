const VOICE_ENABLED = true;
const VAPI_PUBLIC_KEY = '31e8e192-5f11-4511-9ddb-6239922be976';
const VAPI_ASSISTANT_ID = '03e83fce-6297-4457-8f3c-17f425c0e800';
const MAX_CALL_SECONDS = 60;
const WIDGET_SRC = 'https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js';

const VERTICALES = {
  estetica: {
    nombre_centro: 'Centro Aura',
    nombre_asistente: 'Sara',
    servicios_precios: '- Limpieza facial: 45 euros.\n- Depilación láser (zona): desde 30 euros.\n- Masaje relajante 60 min: 50 euros.\n- Manicura: 25 euros.\n- Valoración inicial: gratuita.',
    horario: 'Lunes a sábado de 10 a 20h.',
  },
  dental: {
    nombre_centro: 'Clínica Dental Nova',
    nombre_asistente: 'Marta',
    servicios_precios: '- Limpieza dental: 40 euros.\n- Blanqueamiento: 150 euros.\n- Revisión y valoración: gratuita.\n- Empastes: desde 60 euros.',
    horario: 'Lunes a viernes de 9 a 20h.',
  },
};

let widgetPromise = null;
let vapi = null;
let timerInterval = null;
let secondsElapsed = 0;
let currentVertical = 'estetica';

function loadWidget() {
  if (widgetPromise) return widgetPromise;
  widgetPromise = new Promise((resolve, reject) => {
    if (window.vapiSDK) return resolve(window.vapiSDK);
    const script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.defer = true;
    script.onload = () => {
      window.vapiSDK.run({ apiKey: VAPI_PUBLIC_KEY, assistant: VAPI_ASSISTANT_ID });
      resolve(window.vapiSDK);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return widgetPromise;
}

function els() {
  return {
    modal: document.getElementById('voz-modal'),
    dialog: document.getElementById('voz-dialog'),
    close: document.getElementById('voz-close'),
    orb: document.getElementById('voz-orb'),
    state: document.getElementById('voz-state'),
    timer: document.getElementById('voz-timer'),
    transcript: document.getElementById('voz-transcript'),
    endBtn: document.getElementById('voz-end'),
    retryBtn: document.getElementById('voz-retry'),
    vertical: document.getElementById('voz-vertical'),
  };
}

function setState(state, label) {
  const { modal, state: stateEl } = els();
  modal.dataset.state = state;
  if (label) stateEl.textContent = label;
}

function startTimer() {
  secondsElapsed = 0;
  const { timer } = els();
  timer.textContent = '00:00';
  timerInterval = window.setInterval(() => {
    secondsElapsed += 1;
    const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    timer.textContent = `${m}:${s}`;
    if (secondsElapsed >= MAX_CALL_SECONDS) endCall();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
}

function addTranscriptLine(role, text) {
  const { transcript } = els();
  const line = document.createElement('p');
  line.className = `voz-transcript__line voz-transcript__line--${role}`;
  line.textContent = text;
  transcript.appendChild(line);
  transcript.scrollTop = transcript.scrollHeight;
}

function wireVapiEvents() {
  vapi.on('call-start', () => {
    setState('active', 'en llamada');
    startTimer();
  });
  vapi.on('call-end', () => {
    stopTimer();
    setState('ended', 'llamada terminada');
  });
  vapi.on('error', (err) => {
    stopTimer();
    setState('error', 'no se pudo conectar');
    console.warn('Vapi error', err);
  });
  vapi.on('speech-start', () => els().orb.classList.add('is-speaking'));
  vapi.on('speech-end', () => els().orb.classList.remove('is-speaking'));
  vapi.on('message', (msg) => {
    if (msg?.type === 'transcript' && msg.transcriptType === 'final') {
      addTranscriptLine(msg.role === 'assistant' ? 'bot' : 'user', msg.transcript);
    }
  });
}

async function beginCall() {
  setState('connecting', 'conectando…');
  const { transcript } = els();
  transcript.innerHTML = '';
  try {
    const sdk = await loadWidget();
    if (!vapi) {
      vapi = sdk.vapi;
      wireVapiEvents();
    }
    const vars = VERTICALES[currentVertical] || VERTICALES.estetica;
    await vapi.start(VAPI_ASSISTANT_ID, { variableValues: { ...vars, now: new Date().toISOString() } });
  } catch (err) {
    setState('error', 'no se pudo conectar');
    console.warn('No se pudo iniciar la llamada de voz', err);
  }
}

function endCall() {
  stopTimer();
  try { vapi?.stop(); } catch (err) { /* no-op */ }
  setState('ended', 'llamada terminada');
}

function openModal(vertical) {
  currentVertical = vertical || 'estetica';
  const { modal, vertical: vLabel } = els();
  modal.hidden = false;
  if (vLabel) {
    vLabel.textContent = currentVertical === 'dental'
      ? VERTICALES.dental.nombre_centro
      : VERTICALES.estetica.nombre_centro;
  }
  requestAnimationFrame(() => modal.classList.add('is-open'));
  beginCall();
}

function closeModal() {
  const { modal } = els();
  if (vapi && modal.dataset.state === 'active') endCall();
  stopTimer();
  modal.classList.remove('is-open');
  window.setTimeout(() => { modal.hidden = true; }, 250);
}

export function initVoz() {
  if (!VOICE_ENABLED) return;
  const { modal, close, endBtn, retryBtn } = els();
  if (!modal) return;

  document.querySelectorAll('[data-voice-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.voiceVertical));
  });

  close.addEventListener('click', closeModal);
  endBtn.addEventListener('click', endCall);
  retryBtn.addEventListener('click', beginCall);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
}
