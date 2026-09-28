// Agenda semanal de las demos reales + lectura de días y horas en español.
// Regla que no se toca (fix del 18 sept): una cita SOLO se pinta cuando el asistente
// la confirma. Las horas que ofrece se marcan aparte, como «ofrecido», nunca como cita.

// el bot menciona horas en momentos que NO son una reserva: horario de apertura
// ("abrimos de 9:30 a 14:00"), la propuesta ("¿te reservo el sábado a las 10?") y
// pedir el nombre. Solo el mensaje de confirmación real debe encender el hueco.
const CONFIRMACION_REAL = /\blisto!?\b|\bhecho!?\b|te\s+esperamos\b|te\s+espero\b|\bcita\b[^.!?]{0,45}\b(queda|confirmada|confirmado|reservada|reservado|apuntada|apuntado)\b|\b(queda|confirmada|confirmado|reservada|reservado|apuntada|apuntado)\b[^.!?]{0,45}\bcita\b/i;

export function esConfirmacionReal(texto) {
  return CONFIRMACION_REAL.test(texto);
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// los rangos ("de 10:00 a 20:00", "entre las 9 y las 14") son horarios, no ofertas
const RANGOS = /\b(?:de|desde)\s+(?:las\s+)?\d{1,2}(?:[:.h]\d{2})?\s*h?\s*(?:a|hasta)\s+(?:las\s+)?\d{1,2}(?:[:.h]\d{2})?\s*h?\b|\bentre\s+las\s+\d{1,2}(?:[:.h]\d{2})?\s+y\s+las\s+\d{1,2}(?:[:.h]\d{2})?/gi;

// en voz el asistente dice las horas en letra: «a las cinco y media de la tarde»
const NUMEROS = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
const EN_LETRA = /\ba\s+las?\s+(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)(?:\s+y\s+(media|cuarto)|\s+menos\s+(cuarto))?(?:\s+de\s+la\s+(manana|tarde|noche))?\b/g;

function horasEnLetra(texto) {
  const t = sinTildes(texto.toLowerCase()).replace(RANGOS, ' ');
  const out = [];
  let m;
  while ((m = EN_LETRA.exec(t))) {
    let h = NUMEROS[m[1]];
    if (m[4] === 'tarde' || m[4] === 'noche') { if (h < 12) h += 12; }
    else if (m[4] !== 'manana' && h >= 1 && h <= 8) h += 12;
    let min = h * 60 + (m[2] === 'media' ? 30 : m[2] === 'cuarto' ? 15 : 0);
    if (m[3]) min -= 15;
    out.push(min);
  }
  return out;
}

/** Todas las horas concretas del texto, en minutos desde las 00:00, sin repetir. */
export function horas(texto) {
  const limpio = texto.replace(RANGOS, ' ');
  const out = [];
  horasEnLetra(texto).forEach((min) => { if (!out.includes(min)) out.push(min); });
  const re = /\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b|\ba\s+las?\s+(\d{1,2})(?:\s?h)?(?:\s+y\s+(media|cuarto))?\b(?![:.]\d)(?:\s+de\s+la\s+(tarde|noche|mañana|manana))?|\b([01]?\d|2[0-3])\s?h\b/gi;
  let m;
  while ((m = re.exec(limpio))) {
    let min;
    if (m[1] !== undefined) {
      min = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    } else if (m[6] !== undefined) {
      min = parseInt(m[6], 10) * 60; // "18h"
    } else {
      let h = parseInt(m[3], 10);
      if (h > 23) continue;
      const parte = (m[5] || '').toLowerCase();
      if ((parte === 'tarde' || parte === 'noche') && h < 12) h += 12;
      else if (!parte.startsWith('ma') && h >= 1 && h <= 8) h += 12; // "a las 5" en un centro de estética es por la tarde
      min = h * 60 + (m[4] === 'media' ? 30 : m[4] === 'cuarto' ? 15 : 0);
    }
    if (!out.includes(min)) out.push(min);
  }
  return out;
}

/** El día que menciona el texto, o null. Fecha explícita > día de la semana > mañana/hoy. */
export function dia(texto, ahora = new Date()) {
  // «de lunes a sábado» es un horario, no un día
  const t = sinTildes(texto.toLowerCase()).replace(/\bde\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/g, ' ');
  const hoy = inicioDia(ahora);

  let m = t.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/);
  if (m) {
    const mes = m[2] === 'setiembre' ? 8 : MESES.indexOf(m[2]);
    let d = new Date(hoy.getFullYear(), mes, parseInt(m[1], 10));
    if (d < hoy) d = new Date(hoy.getFullYear() + 1, mes, parseInt(m[1], 10));
    return d;
  }
  m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (m) {
    const dd = parseInt(m[1], 10), mm = parseInt(m[2], 10) - 1;
    if (dd >= 1 && dd <= 31 && mm >= 0 && mm <= 11) {
      let d = new Date(hoy.getFullYear(), mm, dd);
      if (d < hoy) d = new Date(hoy.getFullYear() + 1, mm, dd);
      return d;
    }
  }
  if (/\bpasado\s+manana\b/.test(t)) return sumarDias(hoy, 2);

  m = t.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/);
  if (m) {
    const objetivo = DIAS.map(sinTildes).indexOf(m[1]);
    const diff = (objetivo - hoy.getDay() + 7) % 7;
    return sumarDias(hoy, diff);
  }

  // "mañana" = día siguiente, salvo "por la mañana", "de la mañana", "esta mañana"
  const reManana = /(^|[^a-z])(por la |de la |a la |esta |la )?manana\b/g;
  while ((m = reManana.exec(t))) {
    if (!m[2]) return sumarDias(hoy, 1);
    if (m[2] === 'esta ') return hoy;
  }
  if (/\bhoy\b|\besta\s+tarde\b/.test(t)) return hoy;
  return null;
}

const fmtHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function describir(fecha, min) {
  const partes = [];
  if (fecha) partes.push(`${DIAS[fecha.getDay()]} ${fecha.getDate()}`);
  if (min != null) partes.push(`a las ${fmtHora(min)}`);
  return partes.join(' ');
}

/**
 * Pinta una semana real (hoy + días de apertura, sin domingos) en `host`.
 * Devuelve { ofrecer, confirmar, limpiarOfertas }.
 */
export function crearSemana(host, { dias = 6, desde = 9, hasta = 20, titulo = 'Agenda · Centro Aura' } = {}) {
  const ahora = new Date();
  const fechas = [];
  let d = inicioDia(ahora);
  while (fechas.length < dias) {
    if (d.getDay() !== 0) fechas.push(d);
    d = sumarDias(d, 1);
  }
  const filas = (hasta - desde) * 2;
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const filaAhora = Math.max(0, Math.min(filas, Math.ceil((minAhora - desde * 60) / 30)));

  const horasHtml = [];
  for (let h = desde; h < hasta; h += 1) {
    horasHtml.push(`<span style="grid-row:${(h - desde) * 2 + 2}">${h}:00</span>`);
  }

  host.innerHTML = `
    <div class="semana__cab">
      <p class="semana__titulo">${titulo}</p>
      <p class="semana__ley"><span class="ley ley--ofrecido">ofrecido</span><span class="ley ley--cita">cita puesta</span></p>
    </div>
    <div class="semana__vista" style="--filas:${filas}">
      <div class="semana__horas" aria-hidden="true">${horasHtml.join('')}</div>
      <div class="semana__dias">
        ${fechas.map((f, i) => `
          <div class="semana__col${i === 0 ? ' is-hoy' : ''}" data-i="${i}">
            <p class="semana__dia"><b>${i === 0 ? 'hoy' : DIAS_CORTOS[f.getDay()]}</b> ${f.getDate()}</p>
            <div class="semana__celdas">
              ${i === 0 && filaAhora > 0 ? `<span class="semana__pasado" style="grid-row:1 / span ${filaAhora}" aria-hidden="true"></span>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
    <p class="semana__fuera" hidden></p>`;

  const cols = [...host.querySelectorAll('.semana__col')];
  const carril = host.querySelector('.semana__dias');
  const fuera = host.querySelector('.semana__fuera');
  let ofertas = [];

  function columnaDe(fecha, min) {
    if (!fecha) return -1;
    let f = fecha;
    // "el lunes" dicho un lunes con la hora ya pasada es el lunes que viene
    if (mismoDia(f, fechas[0]) && min != null && min < minAhora - 30) f = sumarDias(f, 7);
    return fechas.findIndex((x) => mismoDia(x, f));
  }

  function fila(min) {
    const r = Math.round((min - desde * 60) / 30) + 1;
    return Math.max(1, Math.min(filas - 1, r));
  }

  function mostrarColumna(i) {
    const col = cols[i];
    if (!col || carril.scrollWidth <= carril.clientWidth + 2) return;
    // se mueve SOLO el carril de días, nunca la página
    carril.scrollTo({ left: col.offsetLeft - carril.offsetLeft, behavior: 'smooth' });
  }

  function bloque(i, min, clase, texto) {
    const el = document.createElement('span');
    el.className = `semana__b ${clase}`;
    el.style.gridRow = `${fila(min)} / span 2`;
    el.textContent = texto;
    cols[i].querySelector('.semana__celdas').appendChild(el);
    return el;
  }

  return {
    ofrecer(fecha, min) {
      const i = columnaDe(fecha, min);
      if (i < 0) return false;
      if (min < desde * 60 || min >= hasta * 60) return false;
      ofertas.push(bloque(i, min, 'semana__b--ofrecido', fmtHora(min)));
      mostrarColumna(i);
      return true;
    },
    limpiarOfertas() {
      ofertas.forEach((el) => {
        el.classList.add('semana__b--sale');
        window.setTimeout(() => el.remove(), 320);
      });
      ofertas = [];
    },
    /** Devuelve un texto descriptivo de dónde quedó la cita. */
    confirmar(fecha, min, etiqueta = 'cita') {
      this.limpiarOfertas();
      const i = columnaDe(fecha, min);
      if (i >= 0 && min >= desde * 60 && min < hasta * 60) {
        bloque(i, min, 'semana__b--cita', `${fmtHora(min)} · ${etiqueta}`);
        mostrarColumna(i);
        return describir(fechas[i], min);
      }
      // fuera de la semana visible o sin día claro: se dice, no se inventa un hueco
      fuera.hidden = false;
      fuera.textContent = fecha
        ? `✓ Cita puesta el ${describir(fecha, min)} (fuera de esta vista).`
        : `✓ Cita puesta a las ${fmtHora(min)}.`;
      return fecha ? describir(fecha, min) : `a las ${fmtHora(min)}`;
    },
  };
}
