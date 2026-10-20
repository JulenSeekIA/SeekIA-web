// Sección «Clientes»: bloque de DO (la «o» con la conversación), bloque rosa de Aeternum (palabras que suben, semillas de
// diente de león al fondo) y la cuenta en papel que se imprime línea a línea.
// Sin JS o con «reducir movimiento»: todo se queda en su estado final, quieto.

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const suave = (t) => 1 - Math.pow(1 - t, 3);

function alVer(el, fn, umbral = 0.35) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { threshold: umbral });
  io.observe(el);
}

function contar(el, hasta, dur, retraso, decimales) {
  const pon = (v) => { el.textContent = decimales ? v.toFixed(1).replace('.', ',') : fmt(Math.round(v)); };
  if (reducido()) { pon(hasta); return; }
  pon(0);
  setTimeout(() => {
    const t0 = performance.now();
    const paso = (ahora) => {
      const p = Math.min(1, (ahora - t0) / dur);
      pon(hasta * suave(p));
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }, retraso);
}

function partirEnPalabras(el) {
  const palabras = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  palabras.forEach((p, i) => {
    const s = document.createElement('span');
    s.className = 'c-w';
    s.style.setProperty('--w', i);
    s.textContent = p;
    el.appendChild(s);
    if (i < palabras.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

// ---------- semillas de diente de león (el motivo del logo de Aeternum) ----------
function semillas(tarjeta, lienzo) {
  const cx = lienzo.getContext('2d');
  let W = 0, H = 0, raf = 0, activo = false;
  let ss = [];
  const ajustar = () => {
    const d = Math.min(2, window.devicePixelRatio || 1);
    W = tarjeta.clientWidth; H = tarjeta.clientHeight;
    lienzo.width = W * d; lienzo.height = H * d;
    cx.setTransform(d, 0, 0, d, 0, 0);
  };
  const nueva = (inicio) => ({
    x: Math.random() * W, y: inicio ? Math.random() * H : H + 30,
    r: 1.8 + Math.random() * 2.6, v: 0.18 + Math.random() * 0.35, dx: 0.08 + Math.random() * 0.22,
    ph: Math.random() * 6.28, l: 18 + Math.random() * 26,
  });
  const pinta = (tm) => {
    cx.clearRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(53,35,43,.38)'; cx.fillStyle = 'rgba(53,35,43,.5)'; cx.lineWidth = 1;
    ss.forEach((s) => {
      const o = Math.sin(tm / 1800 + s.ph) * 8;
      cx.beginPath(); cx.moveTo(s.x + o, s.y); cx.quadraticCurveTo(s.x + o * 0.4 - 6, s.y + s.l * 0.5, s.x - 4 + o * 0.2, s.y + s.l); cx.stroke();
      cx.beginPath(); cx.arc(s.x + o, s.y, s.r, 0, 6.28); cx.fill();
    });
  };
  const bucle = (tm) => {
    ss.forEach((s, i) => { s.y -= s.v; s.x += s.dx; if (s.y < -50 || s.x > W + 30) ss[i] = nueva(false); });
    pinta(tm);
    if (activo) raf = requestAnimationFrame(bucle);
  };
  const arrancar = () => {
    ajustar();
    ss = Array.from({ length: 16 }, () => nueva(true));
    if (reducido()) { pinta(0); return; }
    // solo anima mientras la tarjeta se ve y la pestaña está abierta
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        activo = e.isIntersecting && !document.hidden;
        cancelAnimationFrame(raf);
        if (activo) raf = requestAnimationFrame(bucle);
      });
    });
    io.observe(tarjeta);
    document.addEventListener('visibilitychange', () => {
      activo = !document.hidden && tarjeta.getBoundingClientRect().bottom > 0 && tarjeta.getBoundingClientRect().top < window.innerHeight;
      cancelAnimationFrame(raf);
      if (activo) raf = requestAnimationFrame(bucle);
    });
  };
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (W) { ajustar(); if (reducido()) pinta(0); } }).observe(tarjeta);
  arrancar();
}

export function initCasos() {
  const seccion = document.getElementById('casos');
  if (!seccion) return;
  seccion.classList.add('is-js');

  // --- bloque rosa ---
  const aet = document.getElementById('aet');
  if (aet) {
    aet.querySelectorAll('[data-split]').forEach(partirEnPalabras);
    const lienzo = aet.querySelector('.aet__semillas');
    if (lienzo) semillas(aet, lienzo);
    alVer(aet, () => {
      aet.classList.add('go');
    }, 0.3);
  }

  // --- DO Belleza: la «o» con la conversación; los hechos se encienden de uno en uno ---
  const dob = document.getElementById('dob');
  if (dob) {
    const hechos = [...dob.querySelectorAll('.dob__hechos li')];
    dob.classList.add('is-js');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => dob.classList.toggle('is-vis', e.isIntersecting)), { threshold: 0.12 }).observe(dob);
    } else dob.classList.add('is-vis');
    if (reducido()) hechos.forEach((l) => l.classList.add('on'));
    else {
      let i = 0;
      const paso = () => { if (i < hechos.length) { hechos[i++].classList.add('on'); setTimeout(paso, 2300); } };
      alVer(dob, () => setTimeout(paso, 900), 0.3);
    }
  }

  // --- ticket ---
  const ticket = document.getElementById('ticket');
  if (ticket) {
    const cifras = ticket.querySelectorAll('b[data-n]');
    cifras.forEach((n) => { if (!reducido()) n.textContent = n.dataset.dec ? '0,0' : '0'; });
    alVer(ticket, () => {
      ticket.classList.add('go');
      cifras.forEach((n, i) => contar(n, +n.dataset.n, 700, i * 500 + 450, !!n.dataset.dec));
    }, 0.4);
  }
}
