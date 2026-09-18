export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || targets.length === 0) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  targets.forEach((el) => io.observe(el));
}

export function wrapChars(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.innerHTML = '';
  [...text].forEach((ch) => {
    const wrap = document.createElement('span');
    wrap.className = 'char-wrap';
    const inner = document.createElement('span');
    inner.textContent = ch === ' ' ? ' ' : ch;
    inner.setAttribute('aria-hidden', 'true');
    wrap.appendChild(inner);
    el.appendChild(wrap);
  });
}

export function initCharTitles() {
  document.querySelectorAll('[data-char-reveal]').forEach(wrapChars);
}
