// Entrada de la home v4. Lo de arriba del todo carga ya; cada escenario (chat, voz,
// reactivación) se descarga solo cuando se acerca a la pantalla, para que la portada
// no pague el peso de lo que aún no se ve.
import { initReveal } from './reveal.js?v=14';
import { initControlToggle } from './interactivos.js?v=15';
import { initSoftwareChecker } from './software.js?v=15';
import { initEscenaHero } from './escena-hero.js?v=1';
import { letras, contadores, caso23, tachones, hilo, cierre } from './fx.js?v=1';

letras();
initReveal();
initEscenaHero();
contadores();
caso23();
tachones();
hilo();
cierre();
initControlToggle();
initSoftwareChecker();

// ---------- escenarios bajo demanda ----------
const ESCENARIOS = [
  ['atencion', () => import('./atencion.js?v=1').then((m) => m.initAtencion())],
  ['voz', () => import('./voz-escena.js?v=1').then((m) => m.initVozEscena())],
  ['reactivacion', () => import('./reactivacion.js?v=1').then((m) => m.initReactivacion())],
];
ESCENARIOS.forEach(([id, cargar]) => {
  const el = document.getElementById(id);
  if (!el) return;
  let hecho = false;
  const lanzar = () => {
    if (hecho) return;
    hecho = true;
    cargar().catch((err) => console.warn(`No se pudo cargar el escenario ${id}`, err));
  };
  if (!('IntersectionObserver' in window)) { lanzar(); return; }
  const io = new IntersectionObserver((e) => {
    if (e.some((x) => x.isIntersecting)) { io.disconnect(); lanzar(); }
  }, { rootMargin: '900px 0px' });
  io.observe(el);
});

// ---------- cabecera y menú móvil ----------
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 8);
}, { passive: true });

const navToggle = document.getElementById('nav-toggle');
const mobileNav = document.getElementById('mobile-nav');
navToggle.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(open));
});
mobileNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  mobileNav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}));
