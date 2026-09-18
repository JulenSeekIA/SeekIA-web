const SOFTWARE = {
  koibox: {
    name: 'Koibox',
    status: 'full',
    statusLabel: 'Integración completa',
    text: 'Creamos y consultamos citas directamente en tu Koibox (requiere su plan Platinum). Es la integración que ya usamos en producción con un cliente real.',
  },
  calendar: {
    name: 'Google Calendar',
    status: 'full',
    statusLabel: 'Integración completa',
    text: 'Creamos, movemos y cancelamos citas directamente en tu calendario. Es gratis y no necesita nada de tu parte.',
  },
  cliniccloud: {
    name: 'ClinicCloud',
    status: 'full',
    statusLabel: 'Tiene API pública',
    text: 'ClinicCloud publica API. Desarrollamos la conexión a tu agenda cuando llegue el momento de montarlo.',
  },
  timify: {
    name: 'TIMIFY',
    status: 'partial',
    statusLabel: 'Parcial, vía su plan Premium',
    text: 'En su plan Premium (25€/mes) TIMIFY sincroniza con Google Calendar en los dos sentidos, y ahí conectamos sin desarrollo extra. Su API completa solo existe en Enterprise Plus, con precio a consultar.',
  },
  booksy: {
    name: 'Booksy',
    status: 'partial',
    statusLabel: 'Tiene API, no autoservicio',
    text: 'Booksy tiene una API real (96 endpoints) pero solo se abre negociando acceso directo con ellos — hoy no está disponible sin eso. Mientras tanto, el asistente atiende por WhatsApp y deja a tu clienta lista para reservar en tu enlace.',
  },
  flowww: {
    name: 'Flowww',
    status: 'partial',
    statusLabel: 'Solo en su plan más caro',
    text: 'Flowww solo abre API en su plan Ultimate (249€/mes). Si no lo tienes, el asistente atiende, resuelve, y avisa a tu equipo con los datos listos para meter la cita.',
  },
  bewe: {
    name: 'Bewe',
    status: 'none',
    statusLabel: 'Sin API a clientes finales',
    text: 'Bewe no da acceso a su agenda desde fuera — vende su propio asistente dentro de tu cuota. El nuestro atiende igual, resuelve dudas y manda tu enlace de reserva: no factura la cita sola, pero la conversación nunca se pierde.',
  },
  estetical: {
    name: 'Estetical',
    status: 'none',
    statusLabel: 'Sin API pública',
    text: 'Estetical no abre su agenda a terceros. Mismo modelo: el asistente atiende por WhatsApp y avisa a tu equipo con los datos listos para meter la cita a mano — 10-20 segundos, no un formulario.',
  },
  fresha: {
    name: 'Fresha',
    status: 'none',
    statusLabel: 'Marketplace cerrado',
    text: 'Fresha no deja conectar terceros a su agenda. El asistente sigue atendiendo el WhatsApp directo del centro y avisa a tu equipo con los datos listos.',
  },
  shortcuts: {
    name: 'Shortcuts Software',
    status: 'none',
    statusLabel: 'Sin API, confirmado por ellos',
    text: 'Confirmado por escrito por su propio comercial: sin API pública. Mismo modelo de aviso a tu equipo, sin prometer lo que no se puede cumplir.',
  },
  esteticgest: {
    name: 'EsteticGEST',
    status: 'none',
    statusLabel: 'Sin API pública',
    text: 'Sin API disponible hoy. El asistente atiende y avisa a tu equipo con todo listo para agendar.',
  },
  papel: {
    name: 'Papel o sin software',
    status: 'full',
    statusLabel: 'El caso más simple',
    text: 'Sin agenda digital, el asistente recoge los datos del cliente y avisa a quien lleve la agenda. Cero fricción para empezar — funciona desde el primer día.',
  },
};

const STATUS_META = {
  full: { label: 'Se conecta', dot: 'lime' },
  partial: { label: 'Parcial', dot: 'teal' },
  none: { label: 'No se conecta', dot: 'alert' },
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
    result.innerHTML = `
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
