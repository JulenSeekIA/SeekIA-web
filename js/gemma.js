// Tarjeta de Centre de Teràpies (Gemma): el «17» es una vasija con dos líquidos.
// Naranja = 11 conversaciones en català, carbón = 6 en castellano. Sube al entrar en pantalla y chapotea con el ratón.
// El estado final está pintado en el HTML (sin JS, o con «reducir movimiento», todo quieto y completo).
// Solo anima mientras la tarjeta se ve y la pestaña está abierta.

const reducido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const ANCHO = 820, TOP = 95, BOT = 520, FRAC = 11 / 17;
const suave = (u) => 1 - Math.pow(1 - u, 3);
const acota = (v) => Math.max(0, Math.min(1, v));

function onda(el, k, a, ph, y0) {
  let d = 'M -40 ' + y0.toFixed(1);
  for (let x = -40; x <= ANCHO + 40; x += 14) {
    d += ' L ' + x + ' ' + (y0 + Math.sin(x * k + ph) * a + Math.sin(x * k * 2.3 - ph * 1.3) * a * 0.3).toFixed(1);
  }
  el.setAttribute('d', d + ' L ' + (ANCHO + 40) + ' 700 L -40 700 Z');
}

export function initGemma() {
  const tarjeta = document.getElementById('gem');
  const svg = tarjeta && tarjeta.querySelector('.gem__svg');
  if (!svg) return;
  const olas = [...svg.querySelectorAll('[data-w]')].sort((a, b) => a.dataset.w - b.dataset.w); // 0 carbón, 1 carbón claro, 2 cobre, 3 naranja
  const guiaCat = svg.querySelector('[data-g="cat"]'), guiaCas = svg.querySelector('[data-g="cas"]');
  const burbujas = svg.querySelector('.gem__bub');
  const chip = tarjeta.querySelector('.gem__hola i'), saludo = tarjeta.querySelector('.gem__hola b');
  const cifras = [...tarjeta.querySelectorAll('[data-n]')];

  // posiciones de las guías y de los números, según el nivel (0..1) de cada líquido
  const guias = (y0, nCat, nCas, ryCas, opCat, opCas) => {
    guiaCat.querySelectorAll('line').forEach((l) => { l.setAttribute('y1', y0); l.setAttribute('y2', y0); });
    guiaCat.querySelector('circle').setAttribute('cy', y0);
    guiaCat.querySelector('.gem__gn').setAttribute('y', y0 - 4); guiaCat.querySelector('.gem__gl').setAttribute('y', y0 + 18);
    guiaCat.querySelector('.gem__gn').textContent = nCat; guiaCat.setAttribute('opacity', opCat);
    guiaCas.querySelector('line').setAttribute('y1', ryCas - 8); guiaCas.querySelector('line').setAttribute('y2', ryCas - 8);
    guiaCas.querySelector('.gem__gn').setAttribute('y', ryCas); guiaCas.querySelector('.gem__gl').setAttribute('y', ryCas + 22);
    guiaCas.querySelector('.gem__gn').textContent = nCas; guiaCas.setAttribute('opacity', opCas);
  };
  const pintaOlas = (u, u2, fase, a) => {
    const nivel = suave(u) * FRAC, y0 = BOT + 20 - nivel * (BOT + 20 - TOP);
    const nivel2 = suave(u2), yTop = BOT + 20 - nivel2 * (BOT + 20 - TOP + 40);
    onda(olas[1], 0.011, a * 0.9, fase * 0.6 + 2, yTop + 5); onda(olas[0], 0.014, a * 0.8, -fase * 0.7 + 0.4, yTop + 14);
    onda(olas[3], 0.016, a, fase, y0); onda(olas[2], 0.013, a * 1.15, -fase * 0.8 + 1.2, y0 - 6);
    guias(y0, Math.round(nivel * 17), Math.round(nivel2 * 6), (y0 + TOP) / 2 + 10, acota(u * 3), acota((u2 - 0.5) * 3));
  };

  // burbujas que suben por el líquido
  const animBurbujas = [];
  const hacerBurbujas = () => {
    if (!burbujas.children.length) {
      for (let i = 0; i < 16; i++) {
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('cx', 40 + Math.random() * 560); c.setAttribute('cy', 520); c.setAttribute('r', 3 + Math.random() * 6);
        c.setAttribute('fill', '#FFD9AE'); c.setAttribute('opacity', '.55');
        burbujas.appendChild(c);
        animBurbujas.push(c.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 0.6, offset: 0.2 }, { transform: 'translateY(' + -(180 + Math.random() * 260) + 'px)', opacity: 0 }],
          { duration: 2600 + Math.random() * 2600, delay: 1500 + Math.random() * 3500, iterations: Infinity, easing: 'ease-in' }));
      }
    }
  };

  // el saludo se descifra de català a castellano
  const PARES = [['CA', 'Bon dia'], ['ES', 'Buenos días'], ['CA', 'Bona tarda'], ['ES', 'Buenas tardes'], ['CA', 'Bona nit'], ['ES', 'Buenas noches']];
  const LETRAS = 'abcdefghijklmnoprstuvàèéíòóú·';
  let pi = 0, descifra = 0, rota = 0;
  const descifrar = (a) => {
    const de = saludo.textContent, n = Math.max(de.length, a.length); let paso = 0;
    clearInterval(descifra);
    descifra = setInterval(() => {
      paso++; let salida = '';
      for (let i = 0; i < n; i++) { const fin = 4 + i * 1.6; salida += paso >= fin ? (a[i] || '') : (i < a.length || paso < fin ? LETRAS[Math.floor(Math.random() * LETRAS.length)] : ''); }
      saludo.textContent = salida.trimEnd();
      if (paso > 4 + n * 1.6 + 1) { clearInterval(descifra); saludo.textContent = a; }
    }, 38);
  };
  const girar = (on) => {
    clearInterval(rota);
    if (!on) return;
    rota = setInterval(() => { pi = (pi + 1) % PARES.length; const [l, t] = PARES[pi]; chip.textContent = l; chip.classList.toggle('es', l === 'ES'); descifrar(t); }, 2700);
  };

  // ---- estado ----
  const final = () => {                      // todo quieto y completo
    pintaOlas(1, 1, 0, 7); cifras.forEach((c) => { c.textContent = c.dataset.n; });
  };
  const vacio = () => {                      // listo para entrar: vaso vacío, cifras a 0
    pintaOlas(0, 0, 0, 16); cifras.forEach((c) => { c.textContent = '0'; });
  };
  if (reducido()) { final(); return; }
  vacio(); hacerBurbujas();
  animBurbujas.forEach((a) => a.pause());

  let visible = false, empezada = false, t = 0, fase = 0, chapoteo = 0, raf = 0, ultimo = 0, contadas = false;
  const contar = () => {
    if (contadas) return; contadas = true;
    const t0 = performance.now();
    const paso = (ahora) => { const u = acota((ahora - t0) / 1500); cifras.forEach((c) => { c.textContent = Math.round(+c.dataset.n * suave(u)); }); if (u < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  const cuadro = (ahora) => {
    if (!visible) return;
    const dt = Math.min(50, ahora - ultimo); ultimo = ahora; t += dt;
    const u = acota((t - 400) / 3400), u2 = acota((t - 150) / 2200);
    chapoteo *= 0.94; fase += 0.045 + chapoteo * 0.01;
    pintaOlas(u, u2, fase, (u < 1 ? 16 : 7) + Math.min(20, Math.abs(chapoteo)));
    if (t > 3000) contar();
    raf = requestAnimationFrame(cuadro);
  };
  const estado = () => {
    const ver = visible && !document.hidden;
    cancelAnimationFrame(raf); girar(ver);
    animBurbujas.forEach((a) => (ver ? a.play() : a.pause()));
    if (ver) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); }
  };
  // el líquido reacciona al ratón
  let lx = null;
  tarjeta.addEventListener('pointermove', (e) => { if (lx !== null) chapoteo = Math.max(-40, Math.min(40, chapoteo + (e.clientX - lx) * 0.5)); lx = e.clientX; });
  tarjeta.addEventListener('pointerleave', () => { lx = null; });
  document.addEventListener('visibilitychange', estado);
  if (!('IntersectionObserver' in window)) { visible = true; estado(); return; }
  new IntersectionObserver((es) => {
    es.forEach((e) => { visible = e.isIntersecting && (empezada || e.intersectionRatio >= 0.3); if (visible) empezada = true; estado(); });
  }, { threshold: [0, 0.3] }).observe(tarjeta);
}
