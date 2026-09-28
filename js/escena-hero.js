// La escena de la portada: «un día en la agenda, tres formas de llenarla».
// Es una recreación (lo pone en pantalla). El HTML trae el estado final, quieto:
// sin JS o con movimiento reducido se ve así. Aquí se vacía y se anima en bucle,
// y se pausa cuando no está en pantalla o la pestaña no está visible.

const DURACION = 16800;

export function initEscenaHero() {
  const dia = document.getElementById('escena-dia');
  if (!dia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const $ = (s) => dia.querySelector(s);
  const cuando = $('.dia__cuando');
  const diaTxt = $('.dia__dia');
  const horaTxt = $('.dia__hora');
  const chip = $('.dia__chip');
  const n = $('.dia__n');
  const ev = (i) => dia.querySelector(`.ev[data-paso="${i}"]`);
  const bloque = (i) => dia.querySelector(`.b--cita[data-paso="${i}"]`);
  const barras = [...dia.querySelectorAll('.dia__barras span')];
  barras.forEach((b, i) => { b.dataset.h = b.style.height; b.style.setProperty('--i', i); });

  let citas = 0;

  function reloj(d, h) {
    diaTxt.textContent = d;
    horaTxt.textContent = h;
    cuando.classList.remove('is-cambia');
    void cuando.offsetWidth; // reinicia la animación
    cuando.classList.add('is-cambia');
  }
  function tono(t, texto) { chip.dataset.tono = t; chip.textContent = texto; }
  function entra(i, escribiendo = false) {
    for (let k = 1; k < i; k += 1) ev(k)?.classList.add('is-atras');
    const e = ev(i);
    e.classList.add('is-in');
    e.classList.toggle('is-escribiendo', escribiendo);
  }
  function resuelve(i) {
    const e = ev(i);
    e.classList.remove('is-escribiendo');
    e.classList.add('is-resuelto');
  }
  const ofrece = (i) => bloque(i).classList.add('is-ofrecido');
  function cae(i) {
    const b = bloque(i);
    b.classList.remove('is-ofrecido');
    b.classList.add('is-puesta');
    citas += 1;
    n.textContent = String(citas);
  }
  function llena() {
    barras.forEach((b) => { b.classList.add('on'); b.style.height = b.dataset.h; });
    tono('lima', 'agenda llena');
  }

  function reiniciar() {
    dia.classList.remove('is-sale');
    dia.querySelectorAll('.ev').forEach((e) => e.classList.remove('is-in', 'is-atras', 'is-resuelto', 'is-escribiendo'));
    dia.querySelectorAll('.b--cita').forEach((b) => b.classList.remove('is-ofrecido', 'is-puesta'));
    barras.forEach((b) => { b.classList.remove('on'); b.style.height = '14%'; });
    citas = 0;
    n.textContent = '0';
    diaTxt.textContent = 'lunes';
    horaTxt.textContent = '20:00';
    tono('alerta', 'cerrado');
  }

  const PASOS = [
    [900, () => { reloj('lunes', '23:07'); tono('alerta', 'centro cerrado'); }],
    [1300, () => entra(1, true)],
    [2500, () => { tono('sistema', 'Sara contesta'); ofrece(1); }],
    [3500, () => { resuelve(1); cae(1); tono('lima', 'cita puesta'); }],
    [4900, () => { reloj('martes', '09:00'); tono('neutro', 'revisión'); entra(2); }],
    [5700, () => resuelve(2)],
    [6900, () => { reloj('martes', '11:30'); tono('sistema', 'reactivación'); entra(3, true); }],
    [8100, () => { resuelve(3); cae(3); tono('lima', 'Laura vuelve'); }],
    [9500, () => { reloj('martes', '14:10'); tono('alerta', 'en cabina'); entra(4, true); }],
    [10700, () => { tono('sistema', 'Sara atiende la llamada'); ofrece(4); }],
    [11600, () => { resuelve(4); cae(4); tono('lima', 'cita puesta'); }],
    [12800, llena],
    [16000, () => dia.classList.add('is-sale')],
  ];

  let transcurrido = 0;
  let ultimo = null;
  let paso = 0;
  let enPantalla = false;
  let corriendo = false;

  function tick(ahora) {
    if (!corriendo) return;
    if (ultimo !== null) transcurrido += Math.min(ahora - ultimo, 100);
    ultimo = ahora;
    while (paso < PASOS.length && PASOS[paso][0] <= transcurrido) { PASOS[paso][1](); paso += 1; }
    if (transcurrido >= DURACION) { transcurrido = 0; paso = 0; reiniciar(); }
    requestAnimationFrame(tick);
  }
  function actualizar() {
    const debe = enPantalla && !document.hidden;
    if (debe && !corriendo) { corriendo = true; ultimo = null; requestAnimationFrame(tick); }
    if (!debe) corriendo = false;
  }

  reiniciar();
  dia.classList.add('is-viva');
  new IntersectionObserver((e) => { enPantalla = e.some((x) => x.isIntersecting); actualizar(); }, { threshold: 0.2 }).observe(dia);
  document.addEventListener('visibilitychange', actualizar);
}
