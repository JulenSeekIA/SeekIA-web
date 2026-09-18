const SLOT_START_MIN = 9 * 60;
const SLOT_END_MIN = 20 * 60;
const SLOT_STEP = 30;

function buildSlots() {
  const slots = [];
  for (let m = SLOT_START_MIN; m < SLOT_END_MIN; m += SLOT_STEP) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push({ minutes: m, label: `${h}:${mm}` });
  }
  return slots;
}

function nearestSlot(minutes, slots) {
  return slots.reduce((best, s) =>
    Math.abs(s.minutes - minutes) < Math.abs(best.minutes - minutes) ? s : best
  , slots[0]);
}

function parseSpanishTime(text) {
  const digit = text.match(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b/);
  if (digit) return parseInt(digit[1], 10) * 60 + parseInt(digit[2], 10);
  const hourOnly = text.match(/\ba las (\d{1,2})\b(?!:)/i);
  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10);
    if (h >= 1 && h <= 8) h += 12;
    return h * 60;
  }
  return null;
}

function renderAgenda(container, slots) {
  container.innerHTML = '';
  slots.forEach((slot) => {
    const li = document.createElement('li');
    li.className = 'agenda-slot';
    li.dataset.minutes = String(slot.minutes);
    li.innerHTML = `
      <span class="agenda-slot__time mono">${slot.label}</span>
      <span class="agenda-slot__state mono">libre</span>
    `;
    container.appendChild(li);
  });
}

function occupySlot(container, minutes, slots, label) {
  const target = nearestSlot(minutes, slots);
  const li = container.querySelector(`[data-minutes="${target.minutes}"]`);
  if (!li || li.classList.contains('is-taken')) return;
  li.classList.add('is-taken');
  const state = li.querySelector('.agenda-slot__state');
  state.textContent = label || 'cita';
  li.classList.add('just-landed');
  window.setTimeout(() => li.classList.remove('just-landed'), 900);
}

function setLiveState(root, state) {
  const dot = root.querySelector('[data-probador-status]');
  if (!dot) return;
  dot.dataset.state = state;
  const labels = {
    idle: 'en línea',
    typing: 'escribiendo…',
    booked: 'cita registrada',
  };
  dot.querySelector('.probador-status__label').textContent = labels[state] || labels.idle;
}

export async function initProbador({
  chatTarget,
  agendaTarget,
  rootSelector,
  webhookUrl,
  initialMessages,
  inputPlaceholder,
}) {
  const root = document.querySelector(rootSelector);
  const chatMount = document.querySelector(chatTarget);
  const agendaList = document.querySelector(agendaTarget);
  if (!root || !chatMount || !agendaList) return;

  const slots = buildSlots();
  renderAgenda(agendaList, slots);

  let createChat;
  try {
    ({ createChat } = await import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js'));
  } catch (err) {
    chatMount.innerHTML = '<p class="probador__error">No se pudo cargar el asistente. <a href="' + webhookUrl.replace('/chat', '') + '" target="_blank" rel="noopener">Ábrelo en una pestaña nueva.</a></p>';
    return;
  }

  createChat({
    webhookUrl,
    target: chatTarget,
    mode: 'fullscreen',
    loadPreviousSession: false,
    showWelcomeScreen: false,
    initialMessages: initialMessages || [],
    i18n: {
      en: {
        title: '',
        subtitle: '',
        footer: '',
        getStarted: 'Empezar',
        inputPlaceholder: inputPlaceholder || 'Escríbele como un cliente…',
      },
    },
  });

  const seen = new WeakSet();
  const observer = new MutationObserver(() => {
    const sendBtn = chatMount.querySelector('.chat-input-send-button');
    if (sendBtn && !sendBtn.hasAttribute('aria-label')) sendBtn.setAttribute('aria-label', 'Enviar mensaje');

    const bubbles = chatMount.querySelectorAll('.chat-message-from-bot');
    bubbles.forEach((bubble) => {
      if (seen.has(bubble)) return;
      seen.add(bubble);
      const text = bubble.textContent || '';
      const minutes = parseSpanishTime(text);
      if (minutes !== null) {
        occupySlot(agendaList, minutes, slots, 'cita');
        setLiveState(root, 'booked');
        window.setTimeout(() => setLiveState(root, 'idle'), 2600);
      }
    });
    const typing = chatMount.querySelector('.chat-message-typing');
    setLiveState(root, typing ? 'typing' : (seen.has ? 'idle' : 'idle'));
  });
  observer.observe(chatMount, { childList: true, subtree: true });

  setLiveState(root, 'idle');

  root.querySelectorAll('[data-suggested-prompt]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const message = chip.dataset.suggestedPrompt;
      const sent = sendToChat(chatMount, message);
      if (sent) chip.disabled = true;
    });
  });
}

function sendToChat(chatMount, message) {
  const textarea = chatMount.querySelector('textarea[data-test-id="chat-input"]');
  const sendBtn = chatMount.querySelector('.chat-input-send-button');
  if (!textarea || !sendBtn) {
    console.warn('Probador: no se encontró el input del chat todavía.');
    return false;
  }
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(textarea, message);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  window.setTimeout(() => {
    if (!sendBtn.disabled) sendBtn.click();
  }, 60);
  return true;
}
