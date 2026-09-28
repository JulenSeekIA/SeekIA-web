// Efectos de la home v4: titulares letra a letra, contadores, el 23:07 que nadie
// contesta, los tachados a mano, el hilo de «cómo va» y el mensaje del cierre.
// Todo respeta «reducir movimiento»: en ese caso, cada cosa se queda en su estado final.

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function alVer(el, fn, { umbral = 0.35, margen = '0px 0px -10% 0px' } = {}) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { threshold: umbral, rootMargin: margen });
  io.observe(el);
}

// ---------- titulares letra a letra (el texto real queda para lectores de pantalla) ----------
function partirEnLetras(el) {
  const leer = el.textContent.replace(/\s+/g, ' ').trim();
  let i = 0;
  const clonar = (nodo) => {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      nodo.textContent.split(/(\s+)/).forEach((trozo) => {
        if (!trozo) return;
        if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(' ')); return; }
        const palabra = document.createElement('span');
        palabra.className = 'l-palabra';
        [...trozo].forEach((ch) => {
          const l = document.createElement('span');
          l.className = 'l';
          l.style.setProperty('--i', i++);
          l.textContent = ch;
          palabra.appendChild(l);
        });
        frag.appendChild(palabra);
      });
      return frag;
    }
    const copia = nodo.cloneNode(false);
    nodo.childNodes.forEach((h) => copia.appendChild(clonar(h)));
    return copia;
  };
  const visible = document.createElement('span');
  visible.setAttribute('aria-hidden', 'true');
  el.childNodes.forEach((h) => visible.appendChild(clonar(h)));
  const lector = document.createElement('span');
  lector.className = 'sr-only';
  lector.textContent = leer;
  el.replaceChildren(lector, visible);
}

export function letras() {
  document.querySelectorAll('[data-letras]').forEach((el) => {
    if (reducido()) return;
    partirEnLetras(el);
    alVer(el, () => requestAnimationFrame(() => el.classList.add('is-visible')), { umbral: 0.2, margen: '0px' });
  });
}

// ---------- contadores ----------
export function contadores() {
  document.querySelectorAll('[data-contar]').forEach((el) => {
    const fin = parseInt(el.dataset.contar, 10);
    if (reducido() || !Number.isFinite(fin)) return;
    el.textContent = '0';
    alVer(el, () => {
      const t0 = performance.now(), dur = 1400;
      const paso = (ahora) => {
        const u = Math.min(1, (ahora - t0) / dur);
        el.textContent = String(Math.round(fin * (1 - Math.pow(1 - u, 3))));
        if (u < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  });
}

// ---------- la sequía: el reloj corre hasta las 23:07 y el mensaje se queda sin respuesta ----------
export function caso23() {
  const caso = document.getElementById('caso23');
  if (!caso || reducido()) return;
  const hora = caso.querySelector('.caso23__hora');
  caso.classList.add('is-js');
  hora.textContent = '20:00';
  alVer(caso, () => {
    const t0 = performance.now(), dur = 1500, desde = 20 * 60, hasta = 23 * 60 + 7;
    const paso = (ahora) => {
      const u = Math.min(1, (ahora - t0) / dur);
      const m = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - u, 2)));
      hora.textContent = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
      if (u < 1) requestAnimationFrame(paso);
      else caso.classList.add('is-llega');
    };
    requestAnimationFrame(paso);
  }, { umbral: 0.5 });
}

// ---------- tachados a mano: lo que el sector promete ----------
export function tachones() {
  document.querySelectorAll('.tachable').forEach((el, k) => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('viewBox', '0 0 100 20');
    const path = document.createElementNS(svgNS, 'path');
    // trazo con un poco de pulso humano: sube y baja, y remata con un segundo pase
    const s = (k * 37) % 7;
    path.setAttribute('d', `M1 ${11 + s * 0.2} C 20 ${8 - s * 0.3}, 35 ${13 + s * 0.2}, 55 ${10}, S 85 ${8 + s * 0.3}, 99 ${10.5} M 96 ${12.5} C 70 ${14}, 40 ${11}, 6 ${13.5}`);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(path);
    el.appendChild(svg);
    requestAnimationFrame(() => {
      // si la promesa ocupa dos líneas (móvil), un trazo en medio caería entre líneas:
      // ahí se tacha cada línea con el tachado del propio texto
      const alto = parseFloat(getComputedStyle(el).lineHeight) || 30;
      if (el.getBoundingClientRect().height > alto * 1.5) { svg.remove(); el.classList.add('tachable--lineas'); }
      const largo = Math.ceil(path.getTotalLength() * (el.getBoundingClientRect().width / 100) + 40);
      path.style.setProperty('--largo', largo);
      if (reducido()) { el.classList.add('is-tachado'); return; }
      alVer(el, () => window.setTimeout(() => el.classList.add('is-tachado'), 250), { umbral: 1, margen: '0px 0px -18% 0px' });
    });
  });
}

// ---------- cómo va: el hilo que une los pasos ----------
export function hilo() {
  const grid = document.querySelector('.como-va__grid');
  alVer(grid, () => grid.classList.add('is-visible'), { umbral: 0.4 });
}

// ---------- cierre: las barras se llenan y el mensaje se escribe solo ----------
export function cierre() {
  const barras = document.getElementById('cierre-barras');
  if (barras && !reducido()) {
    const spans = [...barras.querySelectorAll('span')];
    spans.forEach((b, i) => { b.dataset.h = b.style.height; b.style.height = '8%'; b.style.transitionDelay = `${i * 55}ms`; });
    alVer(barras, () => spans.forEach((b) => { b.style.height = b.dataset.h; }), { umbral: 0.6 });
  }
  const texto = document.querySelector('.cierre__texto');
  if (texto && !reducido()) {
    const frase = texto.dataset.texto;
    texto.textContent = '';
    alVer(texto.closest('.cierre__escribe'), () => {
      let i = 0;
      const escribe = () => {
        texto.textContent = frase.slice(0, ++i);
        if (i < frase.length) window.setTimeout(escribe, 28 + Math.random() * 55);
      };
      window.setTimeout(escribe, 500);
    }, { umbral: 0.8 });
  }
}
