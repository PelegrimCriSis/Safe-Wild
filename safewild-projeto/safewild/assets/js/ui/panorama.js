import { esc } from '../util.js';
const setKpi = (key, value, note) => {
  const el = document.querySelector(`[data-kpi="${key}"]`);
  el.querySelector('.kpi__value').textContent = value;
  el.querySelector('.kpi__note').textContent = note;
};
const EMPTY = '<strong>Os registros ainda estão sendo reunidos</strong><span>Nenhum número é exibido até que existam dados documentados com fonte.</span>';

export function renderPanoramaEmpty() {
  setKpi('records', '—', 'aguardando dados'); setKpi('species', '—', 'aguardando dados');
  setKpi('municipalities', '—', 'aguardando dados'); setKpi('period', '—', 'aguardando dados');
  const box = document.getElementById('panorama-status');
  box.className = 'empty'; box.innerHTML = EMPTY;
}
export function renderPanoramaError(message, onRetry) {
  renderPanoramaEmpty();
  const box = document.getElementById('panorama-status');
  box.className = 'alert'; box.setAttribute('role', 'alert');
  box.innerHTML = `<strong>Não foi possível carregar os dados</strong><span>${esc(message)}</span><button class="btn btn--ghost" type="button">Tentar novamente</button>`;
  box.querySelector('button').addEventListener('click', onRetry);
}
export function renderPanorama(stats, discarded, dupes = 0) {
  clearAlertRole();
  setKpi('records', String(stats.total), 'registros documentados');
  setKpi('species', String(stats.speciesCount), 'com ao menos 1 registro');
  setKpi('municipalities', String(stats.municipalityCount), 'com ao menos 1 registro');
  setKpi('period', stats.firstYear === stats.lastYear ? stats.firstYear : `${stats.firstYear}–${stats.lastYear}`, 'pela data do registro');
  const t = stats.top, box = document.getElementById('panorama-status');
  const lead = stats.topTied ? 'Maior quantidade de atropelamentos registrados (empate entre espécies)' : 'Maior quantidade de atropelamentos registrados';
  box.className = 'note';
  box.innerHTML = `${lead} na base e no recorte analisados: <strong>${esc(t.label)}</strong> (${t.count}). Isso descreve os registros disponíveis, não a mortalidade total.`
    + (discarded.length ? ` ${discarded.length} registro(s) foram descartados por inconsistência; veja o console.` : '')
    + (dupes ? ` ${dupes} possível(is) duplicata(s) sinalizada(s) no console.` : '');
}
function clearAlertRole() { const b = document.getElementById('panorama-status'); b.removeAttribute('role'); }
