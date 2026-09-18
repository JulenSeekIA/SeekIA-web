export function initCalculadora() {
  const pacientesInput = document.getElementById('calc-pacientes');
  const ticketInput = document.getElementById('calc-ticket');
  if (!pacientesInput || !ticketInput) return;

  const pacientesOut = document.getElementById('calc-pacientes-out');
  const ticketOut = document.getElementById('calc-ticket-out');
  const inactivosOut = document.getElementById('calc-inactivos');
  const citasOut = document.getElementById('calc-citas');
  const revenueOut = document.getElementById('calc-revenue');

  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  function update() {
    const pacientes = parseInt(pacientesInput.value, 10);
    const ticket = parseInt(ticketInput.value, 10);
    const inactivos = Math.round(pacientes * 0.20);
    const citas = Math.max(1, Math.round(inactivos * 0.035));
    const revenue = citas * ticket;

    pacientesOut.textContent = fmt(pacientes);
    ticketOut.textContent = `${ticket}€`;
    inactivosOut.textContent = fmt(inactivos);
    citasOut.textContent = `~${fmt(citas)}`;
    revenueOut.textContent = `${fmt(revenue)}€`;
  }

  pacientesInput.addEventListener('input', update);
  ticketInput.addEventListener('input', update);
  update();
}

export function initControlToggle() {
  const buttons = document.querySelectorAll('.control__switch-btn');
  if (!buttons.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('[data-mode-text]').forEach((el) => {
        el.hidden = el.dataset.modeText !== mode;
      });
    });
  });
}
