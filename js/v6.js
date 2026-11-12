// SeekIA · home v6 (sin publicar). Sin librerías.
// Regla: lo que no está en pantalla no anima; nada lee el layout en cada evento de scroll sin pasar por requestAnimationFrame.
window.__v6 = true;                                                      // el <head> lo mira: si este módulo no carga, quita las entradas ocultas
const html = document.documentElement;
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = matchMedia('(max-width: 900px)');
const acota = (v) => Math.max(0, Math.min(1, v));
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tramo = (a, b, v) => acota((v - a) / (b - a));
const fijo = new URLSearchParams(location.search).get('p');          // ?p=0.6 congela la ventana (para capturas)

/* ---------- cabecera: filete al bajar ---------- */
{
  const cab = document.querySelector('.cab'), tope = document.getElementById('tope');
  if (cab && tope) new IntersectionObserver((e) => cab.classList.toggle('is-bajada', !e[0].isIntersecting)).observe(tope);
}

/* ---------- entradas (una vez) y pausa de lo que queda fuera de pantalla ---------- */
{
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('es-visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  document.querySelectorAll('[data-entra]').forEach((el) => io.observe(el));
  const ioF = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('fuera', !e.isIntersecting)), { rootMargin: '200px 0px' });
  document.querySelectorAll('main > section, .caso, .mas').forEach((el) => ioF.observe(el));
}

/* ---------- cifras que cuentan una vez ---------- */
{
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, fin = +el.dataset.cuenta;
    if (quieto || !fin) return;
    const t0 = performance.now(), dur = 900;
    const paso = (t) => { const u = acota((t - t0) / dur); el.textContent = fmt(fin * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(paso); else el.textContent = fmt(fin); };
    requestAnimationFrame(paso);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-cuenta]').forEach((el) => io.observe(el));
}

/* ---------- escenas de dos fotogramas fundidos con un shader (el cactus de la ventana y el jardín del cierre) ---------- */
// El frente sale de un punto (el capullo) con borde irregular: primero la flor, luego la luz y la tierra mojada.
const VERT = 'attribute vec2 a; varying vec2 vUv; void main(){ vUv = vec2(a.x * .5 + .5, .5 - a.y * .5); gl_Position = vec4(a, 0., 1.); }';
const FRAG = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uA, uB;
  uniform float uP, uAsp, uMov;
  uniform vec2 uC, uOff, uEsc, uSu;
  uniform vec4 uEl;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
  void main(){
    vec2 uv = uOff + vUv * uEsc;
    vec2 p = uv * vec2(uAsp, 1.);
    float d = distance(p, uC * vec2(uAsp, 1.));
    float r = n(p * 6.) * .6 + n(p * 17.) * .4;
    float frente = uP * 2.15 - .14;
    float m = 1. - smoothstep(frente - .32, frente, d + (r - .5) * .26);
    vec3 c = mix(texture2D(uA, uv).rgb, texture2D(uB, uv).rgb, m);
    float fondo = 1. - smoothstep(.82, 1.38, length((uv - uEl.xy) / uEl.zw));
    float suelo = smoothstep(uSu.x, uSu.y, uv.y);
    float a = max(fondo, suelo);
    a *= smoothstep(.0, mix(.34, .12, uMov), vUv.x) * smoothstep(0., .08, vUv.y) * (1. - smoothstep(mix(.9, .82, uMov), 1., vUv.y)) * (1. - smoothstep(.93, 1., vUv.x));
    gl_FragColor = vec4(c * a, a);
  }`;
const ASP = 1920 / 1072;

function escena(caja, cfg) {
  if (!caja) return { pon() {} };
  const lienzo = caja.querySelector('canvas');
  let gl = null, U = {}, listo = false, p = 1, pintado = -1, creada = false, texturas = null;
  const pinta = (forzar) => { if (!listo || (!forzar && Math.abs(p - pintado) < 0.0008)) return; pintado = p; gl.uniform1f(U.uP, p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const medir = () => {
    if (!listo) return;
    const r = caja.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(r.width * dpr), hh = Math.round(r.height * dpr);
    if (lienzo.width !== w || lienzo.height !== hh) { lienzo.width = w; lienzo.height = hh; gl.viewport(0, 0, w, hh); }
    const ca = r.width / r.height;                                       // «cover» centrado en las plantas
    let ex = 1, ey = 1, ox = 0, oy = 0;
    if (ca < ASP) { ex = ca / ASP; ox = Math.max(0, Math.min(1 - ex, cfg.foco - ex / 2)); } else { ey = ASP / ca; oy = Math.max(0, Math.min(1 - ey, cfg.focoY - ey / 2)); }
    gl.uniform2f(U.uOff, ox, oy); gl.uniform2f(U.uEsc, ex, ey);
    gl.uniform1f(U.uMov, movil.matches ? 1 : 0);
    pinta(true);
  };
  const montar = () => {
    const sombra = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sombra(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sombra(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uA', 'uB', 'uP', 'uAsp', 'uMov', 'uC', 'uOff', 'uEsc', 'uSu', 'uEl'].forEach((u) => { U[u] = gl.getUniformLocation(prog, u); });
    gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1); gl.uniform1f(U.uAsp, ASP);
    gl.uniform2f(U.uC, cfg.centro[0], cfg.centro[1]);
    gl.uniform4f(U.uEl, cfg.elipse[0], cfg.elipse[1], cfg.elipse[2], cfg.elipse[3]);
    gl.uniform2f(U.uSu, cfg.suelo[0], cfg.suelo[1]);
    gl.clearColor(0, 0, 0, 0);
    texturas.forEach((img, unidad) => {
      gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    });
    listo = true; caja.classList.add('is-gl'); pintado = -1; medir();
  };
  const crear = () => {
    if (creada) return; creada = true;
    try { // preserveDrawingBuffer: el lienzo solo se pinta cuando cambia algo; sin esto Safari alterna entre sus dos búferes
    // (uno vacío) cada vez que recompone la capa y el cactus parpadea
    gl = lienzo.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true, failIfMajorPerformanceCaveat: true }); } catch (e) { gl = null; }
    if (!gl) { caja.classList.add('sin-gl'); return; }                   // se queda la foto final, fija
    const imagen = (src) => new Promise((ok, mal) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = mal; i.src = src; });
    const cargar = () => {
      const suf = movil.matches ? '-m' : '';
      return Promise.all([imagen(caja.dataset.seco + suf + '.webp'), imagen(caja.dataset.flor + suf + '.webp')]).then((imgs) => {
        texturas = imgs;
        try { montar(); caja.classList.remove('sin-gl'); } catch (e) { caja.classList.add('sin-gl'); console.warn('[v6] escena sin WebGL:', e.message); }
      }).catch(() => caja.classList.add('sin-gl'));
    };
    cargar();
    setTimeout(() => { if (!listo) caja.classList.add('sin-gl'); }, 4000);   // si el lienzo tarda, que se vea la foto
    movil.addEventListener('change', cargar);                                // al girar una tableta cambian de tamaño las texturas
    lienzo.addEventListener('webglcontextlost', (e) => { e.preventDefault(); listo = false; caja.classList.remove('is-gl'); caja.classList.add('sin-gl'); });
    lienzo.addEventListener('webglcontextrestored', () => { try { if (texturas) { montar(); caja.classList.remove('sin-gl'); } } catch (e) { /* se queda la foto */ } });
    addEventListener('resize', medir, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(medir).observe(caja);
  };
  // se crea cuando falta pantalla y media para llegar
  const enRatoLibre = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
  const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); enRatoLibre(crear); } }, { rootMargin: '150% 0px' });
  io.observe(caja);
  // Seguro para Safari: mientras la escena está en pantalla se repinta en cada fotograma. Es un solo rectángulo; cuesta poco y
  // evita depender de que el navegador conserve el último fotograma al recomponer la capa (allí parpadeaba)
  if (/^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent)) {
    let vista = false, rafS = 0;
    const lazo = () => { rafS = 0; if (!vista) return; pinta(true); rafS = requestAnimationFrame(lazo); };
    new IntersectionObserver((es) => { vista = es[0].isIntersecting; if (vista && !rafS) rafS = requestAnimationFrame(lazo); }).observe(caja);
  }
  return { pon(v) { p = v; pinta(); } };
}

/* ---------- la ventana a la noche: el scroll resuelve la conversación y hace florecer el cactus ---------- */
{
  const carril = document.querySelector('.ventana-carril'), ventana = document.querySelector('.ventana');
  if (carril && ventana) {
    const cactus = escena(ventana.querySelector('.ventana__escena'), { centro: [0.71, 0.25], elipse: [0.735, 0.42, 0.21, 0.42], suelo: [0.63, 0.75], foco: 0.735, focoY: 0.5 });
    const charla = ventana.querySelector('.charla');
    const pasos = [...ventana.querySelectorAll('.paso')];
    const hora = ventana.querySelector('.ventana__reloj b'), dia = ventana.querySelector('.ventana__reloj span');
    let meta = 0, p = 0, raf = 0, cerca = false, manana = null, vistos = 0, quiere = 0, reloj = 0;
    const pinta = () => {
      pasos.forEach((el, i) => el.classList.toggle('es-visto', i < vistos));
      charla.classList.toggle('contesta', vistos > 0);
      ventana.classList.toggle('hay-respuesta', vistos > 0);                                // en cuanto contesta, la frase de «sin asistente» se va
    };
    const avanza = () => {                                                                  // hacia delante, de uno en uno; hacia atrás, de golpe
      reloj = 0;
      if (quiere < vistos) vistos = quiere; else if (quiere > vistos) vistos++;
      pinta();
      if (quiere > vistos) reloj = setTimeout(avanza, 380);
    };
    const estado = (v, yaMismo) => {
      quiere = pasos.filter((el) => v >= +el.dataset.desde).length;                         // cada paso dice en el HTML cuándo entra
      if (yaMismo) { clearTimeout(reloj); reloj = 0; vistos = quiere; pinta(); } else if (!reloj && quiere !== vistos) avanza();
      const m = v >= 0.8 && vistos === pasos.length;
      if (m !== manana) {
        manana = m; ventana.classList.toggle('es-manana', m);
        hora.textContent = m ? '09:00' : '23:07';
        dia.textContent = m ? 'martes · abres el centro' : 'lunes · centro cerrado';
      }
      cactus.pon(suave(tramo(0.16, 0.92, v)));
    };
    if (quieto || !html.classList.contains('con-mov')) estado(1, true);
    else if (fijo !== null) estado(acota(parseFloat(fijo) || 0), true);
    else {
      const medir = () => {
        const r = carril.getBoundingClientRect(), tope = parseFloat(getComputedStyle(ventana).top) || 0;
        const recorrido = carril.offsetHeight - ventana.offsetHeight;
        meta = recorrido > 4 ? acota((tope - r.top) / recorrido) : 1;
      };
      const paso = () => {
        raf = 0;
        p += (meta - p) * 0.16;                                           // se acerca con amortiguación: un golpe de dedo no hace saltar la flor
        if (Math.abs(meta - p) < 0.0015) p = meta;
        estado(p);
        if (p !== meta) raf = requestAnimationFrame(paso);
      };
      const alScroll = () => { if (!cerca) return; medir(); if (!raf) raf = requestAnimationFrame(paso); };
      new IntersectionObserver((es) => { cerca = es[0].isIntersecting; if (cerca) alScroll(); }, { rootMargin: '20% 0px' }).observe(carril);
      addEventListener('scroll', alScroll, { passive: true });
      addEventListener('resize', alScroll, { passive: true });
      estado(0, true);
    }
  }
}

/* ---------- el jardín del cierre: florece al llegar ---------- */
{
  const caja = document.querySelector('.cierre__escena');
  if (caja) {
    const jardin = escena(caja, { centro: [0.535, 0.385], elipse: [0.715, 0.46, 0.33, 0.5], suelo: [0.66, 0.78], foco: 0.72, focoY: 0.5 });
    if (quieto || !html.classList.contains('con-mov')) jardin.pon(1);
    else {
      let cerca = false, raf = 0;
      const mide = () => {
        raf = 0;
        const r = caja.getBoundingClientRect(), vh = innerHeight;
        const resta = document.documentElement.scrollHeight - vh - scrollY;      // lo que queda de página por bajar
        jardin.pon(suave(Math.max(acota((vh * 0.96 - r.top) / (vh * 0.75)), 1 - acota(resta / (vh * 0.35)))));
      };
      const alScroll = () => { if (cerca && !raf) raf = requestAnimationFrame(mide); };
      new IntersectionObserver((es) => { cerca = es[0].isIntersecting; alScroll(); }, { rootMargin: '10% 0px' }).observe(caja);
      addEventListener('scroll', alScroll, { passive: true });
      jardin.pon(0);
    }
  }
}

/* ---------- la demo: el chat real (módulo de la home publicada) con una conversación de ejemplo que se reproduce sola ---------- */
{
  const demo = document.getElementById('demo'), msgs = document.getElementById('atencion-msgs'), agenda = document.getElementById('atencion-agenda');
  if (demo && msgs && agenda) {
    let cargado = false, ejemplo = 'pendiente', temporizadores = [];
    const espera = (ms, fn) => temporizadores.push(setTimeout(fn, ms));
    const limpiaEjemplo = () => {
      temporizadores.forEach(clearTimeout); temporizadores = [];
      demo.querySelectorAll('.es-ejemplo').forEach((el) => el.remove());
      ejemplo = 'hecho';
    };
    // la clienta de verdad manda: en cuanto escribe o pulsa una sugerencia, el ejemplo desaparece
    const movilEl = demo.querySelector('.movil');
    movilEl.addEventListener('submit', limpiaEjemplo, true);
    movilEl.addEventListener('click', (e) => { if (e.target.closest('[data-prompt]')) limpiaEjemplo(); }, true);
    movilEl.addEventListener('focusin', (e) => { if (e.target.matches('textarea') && ejemplo === 'corriendo') limpiaEjemplo(); });

    new MutationObserver(() => { if (msgs.querySelector('.burbuja--error')) demo.querySelectorAll('.chip:disabled').forEach((c) => { c.disabled = false; }); }).observe(msgs, { childList: true });
    const globo = (texto, quien) => { const el = document.createElement('div'); el.className = `burbuja burbuja--${quien} es-ejemplo`; el.textContent = texto; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; return el; };
    const escribe = (si) => {
      msgs.querySelector('.escribiendo.es-ejemplo')?.remove();
      if (si) { const el = document.createElement('div'); el.className = 'escribiendo es-ejemplo'; el.innerHTML = '<i></i><i></i><i></i>'; msgs.appendChild(el); msgs.scrollTop = msgs.scrollHeight; }
    };
    const bloque = (min, clase, texto) => {
      const celdas = agenda.querySelector('.semana__col[data-i="1"] .semana__celdas'); if (!celdas) return;
      const el = document.createElement('span'); el.className = `semana__b ${clase} es-ejemplo`;
      el.style.gridRow = `${Math.round((min - 540) / 30) + 1} / span 2`; el.textContent = texto; celdas.appendChild(el);
      const carril = agenda.querySelector('.semana__dias');                  // en móvil se ven tres días: que se vea el de la cita
      const vista = agenda.querySelector('.semana__vista');
      if (vista) vista.scrollTop = Math.max(0, el.offsetTop - vista.clientHeight / 2);
      if (carril && carril.scrollWidth > carril.clientWidth + 2) carril.scrollTo({ left: 0 });
    };
    const reproduce = () => {
      if (ejemplo !== 'pendiente') return;
      ejemplo = 'corriendo';
      // el día de la cita de ejemplo es la segunda columna de la agenda (mañana, o el lunes si mañana es domingo)
      const dias = []; const d = new Date();
      while (dias.length < 2) { if (d.getDay() !== 0) dias.push(new Date(d)); d.setDate(d.getDate() + 1); }
      const manana = new Date(); manana.setDate(manana.getDate() + 1);
      const cuando = dias[1].toDateString() === manana.toDateString() ? 'mañana' : 'el ' + ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dias[1].getDay()];
      if (quieto) {
        globo(`Hola, ¿tenéis hueco ${cuando} por la tarde para una limpieza facial?`, 'yo');
        globo(`Sí. ${cuando.charAt(0).toUpperCase() + cuando.slice(1)} tengo a las 16:30 o a las 18:00. ¿Cuál te va mejor?`, 'bot');
        globo('A las 18:00', 'yo'); globo(`Hecho. Te espero ${cuando} a las 18:00.`, 'bot');
        bloque(1080, 'semana__b--cita', '18:00 · cita'); ejemplo = 'hecho'; return;
      }
      espera(500, () => globo(`Hola, ¿tenéis hueco ${cuando} por la tarde para una limpieza facial?`, 'yo'));
      espera(1300, () => escribe(true));
      espera(2600, () => { escribe(false); globo(`Sí. ${cuando.charAt(0).toUpperCase() + cuando.slice(1)} tengo a las 16:30 o a las 18:00. ¿Cuál te va mejor?`, 'bot'); bloque(990, 'semana__b--ofrecido', '16:30'); bloque(1080, 'semana__b--ofrecido', '18:00'); });
      espera(4700, () => globo('A las 18:00', 'yo'));
      espera(5400, () => escribe(true));
      espera(6500, () => {
        escribe(false); globo(`Hecho. Te espero ${cuando} a las 18:00.`, 'bot');
        agenda.querySelectorAll('.semana__b--ofrecido.es-ejemplo').forEach((el) => el.remove());
        bloque(1080, 'semana__b--cita', '18:00 · cita');
        const chip = document.createElement('span'); chip.className = 'cita-chip es-ejemplo';
        chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        chip.append(`Cita puesta en la agenda · ${cuando} a las 18:00`); msgs.appendChild(chip); msgs.scrollTop = msgs.scrollHeight;
        ejemplo = 'hecho';
      });
    };
    const cargar = () => {
      if (cargado) return; cargado = true;
      import('./atencion.js?v=2').then((m) => {
        m.initAtencion();
        new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); reproduce(); } }, { threshold: 0.45 }).observe(movilEl);
      }).catch((err) => console.warn('[v6] no se pudo cargar el chat', err));
    };
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { io.disconnect(); cargar(); } }, { rootMargin: '900px 0px' }).observe(demo);
  }
}

/* ---------- voz: la llamada real (módulo de la home publicada; el SDK solo se baja al pulsar) ---------- */
{
  const llamada = document.getElementById('llamada');
  if (llamada) new IntersectionObserver((es, io) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    import('./voz-escena.js?v=2').then((m) => m.initVozEscena()).catch((err) => console.warn('[v6] no se pudo cargar la voz', err));
  }, { rootMargin: '700px 0px' }).observe(llamada);
}

/* ---------- reactivación: una cuenta (misma fórmula que la home publicada: 20 % dormidas, 3,5 % de ellas vuelve) ---------- */
{
  const c = document.getElementById('r-clientas'), t = document.getElementById('r-ticket');
  if (c && t) {
    const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');     // 1.500 (toLocaleString no agrupa los miles de cuatro cifras en español)
    const pinta = () => {
      const clientas = +c.value, ticket = +t.value;
      const citas = Math.max(1, Math.round(clientas * 0.20 * 0.035));
      document.getElementById('r-clientas-v').textContent = fmt(clientas);
      document.getElementById('r-ticket-v').textContent = `${fmt(ticket)} €`;
      document.getElementById('r-citas').textContent = fmt(citas);
      document.getElementById('r-euros').textContent = fmt(citas * ticket);
      [c, t].forEach((el) => el.style.setProperty('--p', `${((el.value - el.min) / (el.max - el.min)) * 100}%`));
    };
    c.addEventListener('input', pinta); t.addEventListener('input', pinta); pinta();
  }
}
