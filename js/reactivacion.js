// 03 · Reactivación — tus clientas como puntos. Simulación, y lo dice.
// Las cuentas son EXACTAMENTE las de la calculadora anterior (js/interactivos.js):
//   dormidas = 20% · responden y reagendan = 5% de las dormidas · se presentan = 70% (3,5% de las dormidas)
// Nada se infla para que la animación quede mejor.

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const suavizar = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const salir = (u) => 1 - Math.pow(1 - u, 3);
const tramo = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

export function initReactivacion() {
  const canvas = document.getElementById('reactivar-canvas');
  const inClientas = document.getElementById('r-clientas');
  const inTicket = document.getElementById('r-ticket');
  if (!canvas || !inClientas || !inTicket) return;

  const out = {
    clientas: document.getElementById('r-clientas-out'),
    ticket: document.getElementById('r-ticket-out'),
    dormidas: document.getElementById('r-dormidas'),
    responden: document.getElementById('r-responden'),
    citas: document.getElementById('r-citas'),
    euros: document.getElementById('r-euros'),
    unidad: document.getElementById('r-unidad'),
  };
  const boton = document.getElementById('reactivar-boton');
  const ctx = canvas.getContext('2d');
  const rico = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_PUNTOS = rico ? 2400 : 900;

  const css = getComputedStyle(document.documentElement);
  const color = (v) => css.getPropertyValue(v).trim();
  const C = {
    activa: color('--ink-3'), dormida: color('--alert'), teal: color('--teal'), lima: color('--lime'),
    tinta: color('--ink-4'), blanco: color('--white'), fondo: color('--ink-2'), linea: color('--ink-3'),
  };
  const mono = `500 11px ${color('--font-mono') || 'monospace'}`;

  let W = 0, H = 0, dpr = 1;
  let puntos = [];
  let cuenta = {};
  let huecos = [];
  let fase = 'reposo';
  let t0 = 0;
  let raf = null;
  let origen = { x: 0, y: 0 };
  let agendaX = 0;

  function calcular() {
    const pacientes = parseInt(inClientas.value, 10);
    const ticket = parseInt(inTicket.value, 10);
    const dormidas = Math.round(pacientes * 0.20);
    const responden = Math.round(dormidas * 0.05);
    const citas = Math.max(1, Math.round(dormidas * 0.035));
    const unidad = Math.max(1, Math.ceil(pacientes / MAX_PUNTOS));
    cuenta = {
      pacientes, ticket, dormidas, responden, citas, euros: citas * ticket, unidad,
      nPuntos: Math.round(pacientes / unidad),
      nDormidas: Math.round(dormidas / unidad),
      nResp: Math.max(1, Math.round(responden / unidad)),
      nCitas: Math.max(1, Math.round(citas / unidad)),
    };
    cuenta.nCitas = Math.min(cuenta.nCitas, cuenta.nResp);
  }

  function escribirCuentas(p = 1) {
    const c = cuenta;
    out.clientas.textContent = fmt(c.pacientes);
    out.ticket.textContent = `${c.ticket}€`;
    out.dormidas.textContent = fmt(c.dormidas);
    out.responden.textContent = fmt(Math.round(c.responden * p));
    out.citas.textContent = `~${fmt(Math.max(p > 0 ? 1 : 0, Math.round(c.citas * p)))}`;
    out.euros.textContent = `${fmt(Math.round(c.euros * p))}€`;
    out.unidad.textContent = c.unidad === 1 ? '1 punto = 1 clienta' : `1 punto = ${c.unidad} clientas`;
  }

  function colocar() {
    const r = azar(7 + cuenta.nPuntos);
    const pad = 14;
    const agendaW = Math.min(150, Math.max(96, W * 0.22));
    agendaX = W - agendaW;
    const x0 = 46, x1 = agendaX - 26, y0 = pad + 18, y1 = H - pad;
    const fw = x1 - x0, fh = y1 - y0;
    const n = cuenta.nPuntos;
    const cols = Math.max(1, Math.round(Math.sqrt(n * fw / fh)));
    const filas = Math.ceil(n / cols);
    const cw = fw / cols, ch = fh / filas;
    origen = { x: 18, y: H / 2 };
    puntos = [];
    for (let i = 0; i < n; i += 1) {
      const cx = x0 + (i % cols + 0.5) * cw + (r() - 0.5) * cw * 0.7;
      const cy = y0 + (Math.floor(i / cols) + 0.5) * ch + (r() - 0.5) * ch * 0.7;
      puntos.push({ x: cx, y: cy, tipo: 0, resp: false, vuelve: false, retardo: 0, hueco: -1 });
    }
    // elegir dormidas, las que responden y las que vuelven (subconjuntos, siempre coherentes)
    const idx = puntos.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    const dormidas = idx.slice(0, cuenta.nDormidas);
    dormidas.forEach((i) => { puntos[i].tipo = 1; });
    dormidas.slice(0, cuenta.nResp).forEach((i) => { puntos[i].resp = true; });
    dormidas.slice(0, cuenta.nCitas).forEach((i, k) => { puntos[i].vuelve = true; puntos[i].hueco = k; });
    const maxD = Math.hypot(W, H);
    puntos.forEach((p) => { p.retardo = (Math.hypot(p.x - origen.x, p.y - origen.y) / maxD) * 900; });

    const visibles = Math.min(cuenta.nCitas, 12);
    const top = y0 + 8;
    const alto = Math.min(24, (y1 - top - 24) / Math.max(visibles, 1));
    huecos = [];
    for (let k = 0; k < visibles; k += 1) huecos.push({ x: agendaX + 12, y: top + k * alto, w: agendaW - 24, h: alto - 5, lleno: 0 });
  }

  function medir() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function dibujar(t) {
    ctx.clearRect(0, 0, W, H);
    const enviado = fase === 'fin' ? 1e9 : t;
    const pResp = fase === 'reposo' ? 0 : tramo(enviado, 1500, 2300);
    const pVuelta = fase === 'reposo' ? 0 : tramo(enviado, 2400, 3900);

    // columna de agenda
    ctx.fillStyle = C.fondo;
    ctx.fillRect(agendaX, 0, W - agendaX, H);
    ctx.fillStyle = C.tinta;
    ctx.font = mono;
    ctx.fillText('AGENDA', agendaX + 12, 22);
    huecos.forEach((h, k) => {
      const lleno = fase === 'reposo' ? 0 : tramo(enviado, 2400 + k * 90 + 700, 2400 + k * 90 + 900);
      ctx.strokeStyle = C.linea;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(h.x, h.y, h.w, h.h, 5); ctx.stroke();
      if (lleno > 0) {
        ctx.globalAlpha = lleno;
        ctx.fillStyle = C.lima;
        ctx.beginPath(); ctx.roundRect(h.x, h.y, h.w, h.h, 5); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    if (cuenta.nCitas > huecos.length && pVuelta > 0.95) {
      ctx.fillStyle = C.lima;
      ctx.fillText(`+${cuenta.nCitas - huecos.length} más`, agendaX + 12, H - 14);
    }

    // origen: tu WhatsApp
    ctx.fillStyle = C.teal;
    ctx.beginPath(); ctx.arc(origen.x, origen.y, 5, 0, Math.PI * 2); ctx.fill();

    // puntos, por lotes
    const radio = cuenta.nPuntos > 1500 ? 1.6 : cuenta.nPuntos > 700 ? 2 : 2.6;
    ctx.fillStyle = C.activa;
    ctx.beginPath();
    puntos.forEach((p) => { if (p.tipo === 0) { ctx.moveTo(p.x + radio, p.y); ctx.arc(p.x, p.y, radio, 0, Math.PI * 2); } });
    ctx.fill();

    ctx.lineWidth = 1.2;
    ctx.strokeStyle = C.dormida;
    ctx.beginPath();
    puntos.forEach((p) => {
      if (p.tipo !== 1) return;
      if ((p.resp && pResp > 0) || (p.vuelve && pVuelta > 0)) return;
      ctx.moveTo(p.x + radio + 0.6, p.y); ctx.arc(p.x, p.y, radio + 0.6, 0, Math.PI * 2);
    });
    ctx.stroke();

    if (fase !== 'reposo') {
      // mensajes saliendo: un punto teal viaja del origen a cada dormida
      ctx.fillStyle = C.teal;
      ctx.beginPath();
      puntos.forEach((p) => {
        if (p.tipo !== 1) return;
        const u = tramo(enviado, p.retardo, p.retardo + 520);
        if (u <= 0 || u >= 1) return;
        const e = salir(u);
        const x = origen.x + (p.x - origen.x) * e, y = origen.y + (p.y - origen.y) * e;
        ctx.moveTo(x + 1.6, y); ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      });
      ctx.fill();

      // las que responden se encienden en teal
      if (pResp > 0) {
        ctx.fillStyle = C.teal;
        ctx.beginPath();
        puntos.forEach((p) => {
          if (!p.resp || (p.vuelve && pVuelta > 0)) return;
          const rr = (radio + 1.2) * (0.6 + 0.4 * salir(pResp));
          ctx.moveTo(p.x + rr, p.y); ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        });
        ctx.fill();
      }

      // las que vuelven vuelan a su hueco de la agenda
      if (pVuelta > 0) {
        puntos.forEach((p) => {
          if (!p.vuelve) return;
          const k = p.hueco;
          const h = huecos[Math.min(k, huecos.length - 1)];
          const u = tramo(enviado, 2400 + k * 90, 2400 + k * 90 + 800);
          if (u >= 1) return;
          const e = suavizar(u);
          const tx = h.x + h.w / 2, ty = h.y + h.h / 2;
          const cx = (p.x + tx) / 2, cy = Math.min(p.y, ty) - 60;
          const x = (1 - e) * (1 - e) * p.x + 2 * (1 - e) * e * cx + e * e * tx;
          const y = (1 - e) * (1 - e) * p.y + 2 * (1 - e) * e * cy + e * e * ty;
          ctx.fillStyle = C.lima;
          ctx.beginPath(); ctx.arc(x, y, radio + 1.6, 0, Math.PI * 2); ctx.fill();
        });
      }
    }
  }

  function bucle(ahora) {
    const t = ahora - t0;
    dibujar(t);
    escribirCuentas(tramo(t, 1500, 3900));
    if (t < 4200) raf = requestAnimationFrame(bucle);
    else { fase = 'fin'; dibujar(0); escribirCuentas(1); boton.disabled = false; boton.textContent = 'Volver a enviar'; raf = null; }
  }

  function enviar() {
    if (raf) cancelAnimationFrame(raf);
    if (reducido) { fase = 'fin'; dibujar(0); escribirCuentas(1); return; }
    fase = 'anim';
    boton.disabled = true;
    t0 = performance.now();
    raf = requestAnimationFrame(bucle);
  }

  function rehacer() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    fase = 'reposo';
    boton.disabled = false;
    boton.textContent = 'Enviar la reactivación';
    calcular();
    escribirCuentas(1);
    colocar();
    dibujar(0);
  }

  inClientas.addEventListener('input', rehacer);
  inTicket.addEventListener('input', () => { calcular(); escribirCuentas(1); });
  boton.addEventListener('click', enviar);

  let ancho = 0, alto = 0;
  new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    if (Math.abs(r.width - ancho) < 1 && Math.abs(r.height - alto) < 1) return;
    ancho = r.width; alto = r.height;
    medir();
    colocar();
    dibujar(0);
  }).observe(canvas);

  calcular();
  escribirCuentas(1);
  medir();
  colocar();
  dibujar(0);

  // la primera vez que se ve entera, se envía sola una vez
  if (!reducido) {
    const io = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { io.disconnect(); window.setTimeout(enviar, 350); }
    }, { threshold: 0.55 });
    io.observe(canvas);
  }
}
