const SOFTWARE = {
  koibox: {
    name: 'Koibox',
    status: 'full',
    statusLabel: 'Integración completa',
    text: 'Conexión completa con tu Koibox. El asistente trabaja directamente sobre tu agenda.',
  },
  calendar: {
    name: 'Google Calendar',
    status: 'full',
    statusLabel: 'Integración completa',
    text: 'Creamos, movemos y cancelamos citas directamente en tu calendario. Ya funciona en producción en dos centros. Es gratis y no necesitas nada más.',
  },
  cliniccloud: {
    name: 'ClinicCloud',
    status: 'full',
    statusLabel: 'Tiene API pública',
    text: 'ClinicCloud publica su API. Desarrollamos la conexión a tu agenda al montarlo.',
  },
  timify: {
    name: 'TIMIFY',
    status: 'partial',
    statusLabel: 'Con su plan Premium',
    text: 'Con su plan Premium, TIMIFY sincroniza con Google Calendar en los dos sentidos, y ahí conectamos sin desarrollo extra.',
  },
  booksy: {
    name: 'Booksy',
    status: 'partial',
    statusLabel: 'Atiende y te pasa a tu enlace',
    text: 'El asistente atiende por WhatsApp y deja a tu clienta lista para reservar en tu enlace de Booksy. La conversación nunca se pierde.',
  },
  flowww: {
    name: 'Flowww',
    status: 'partial',
    statusLabel: 'Con su plan más alto',
    text: 'Flowww abre su API en su plan más alto. Si no lo tienes, el asistente atiende, resuelve y avisa a tu equipo con los datos listos para apuntar la cita.',
  },
  bewe: {
    name: 'Bewe',
    status: 'none',
    statusLabel: 'Con aviso a tu equipo',
    text: 'El asistente atiende igual, resuelve dudas y manda tu enlace de reserva. Tu equipo apunta la cita con los datos ya listos.',
  },
  estetical: {
    name: 'Estetical',
    status: 'none',
    statusLabel: 'Con aviso a tu equipo',
    text: 'El asistente atiende por WhatsApp y avisa a tu equipo con los datos listos para apuntar la cita: 10-20 segundos, no un formulario.',
  },
  fresha: {
    name: 'Fresha',
    status: 'none',
    statusLabel: 'Con aviso a tu equipo',
    text: 'El asistente sigue atendiendo el WhatsApp directo del centro y avisa a tu equipo con los datos listos.',
  },
  shortcuts: {
    name: 'Shortcuts Software',
    status: 'partial',
    statusLabel: 'Con acceso a su API',
    text: 'Shortcuts da acceso a su API a cada centro que lo pide. Mientras tanto, el asistente atiende y avisa a tu equipo con los datos listos; si lo pides, miramos la conexión.',
  },
  esteticgest: {
    name: 'EsteticGEST',
    status: 'none',
    statusLabel: 'Con aviso a tu equipo',
    text: 'El asistente atiende y avisa a tu equipo con todo listo para agendar.',
  },
  papel: {
    name: 'Papel o sin software',
    status: 'full',
    statusLabel: 'El caso más simple',
    text: 'Sin agenda digital, el asistente recoge los datos de la clienta y avisa a quien lleve la agenda. Funciona desde el primer día.',
  },
};

const STATUS_META = {
  full: { label: 'Se conecta', dot: 'lime' },
  partial: { label: 'Parcial', dot: 'teal' },
  none: { label: 'Con aviso', dot: 'teal' },
};

export function initSoftwareChecker() {
  const grid = document.getElementById('software-grid');
  const result = document.getElementById('software-result');
  if (!grid || !result) return;

  grid.innerHTML = Object.entries(SOFTWARE).map(([key, s]) => `
    <button class="software-pill" type="button" data-software="${key}">
      <span class="software-pill__dot software-pill__dot--${STATUS_META[s.status].dot}"></span>
      ${s.name}
    </button>
  `).join('');

  function select(key) {
    const s = SOFTWARE[key];
    if (!s) return;
    grid.querySelectorAll('.software-pill').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.software === key);
    });
    const meta = STATUS_META[s.status];
    result.hidden = false;
    // el conector: continuo con pulsos si se conecta, discontinuo si es parcial, cortado si no
    result.innerHTML = `
      <div class="conector conector--${s.status}" aria-hidden="true">
        <span class="conector__nodo conector__nodo--sistema">Asistente</span>
        <span class="conector__linea">${s.status === 'none' ? '' : '<i></i><i></i><i></i>'}</span>
        <span class="conector__nodo">${s.name}</span>
      </div>
      <span class="software-result__status software-result__status--${meta.dot}">
        <span class="software-pill__dot software-pill__dot--${meta.dot}"></span>
        ${s.statusLabel}
      </span>
      <h3>${s.name}</h3>
      <p>${s.text}</p>
    `;
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-software]');
    if (btn) select(btn.dataset.software);
  });

  select('koibox');
}
