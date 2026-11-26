import { esc } from '../util.js';
import { barColors, baseOptions } from './theme.js';
import { percent } from '../stats.js';
const charts = new Map();
const MAX_BARS = 15;

function caption(fig, extra) {
  fig.querySelector('figcaption').textContent = `Figura ${fig.dataset.fig}. ${fig.dataset.title} · ${extra}`;
}
function destroy(fig) { charts.get(fig)?.destroy(); charts.delete(fig); }
const ghost = (msg, cls = '') => `<div class="figure__ghost ${cls}"><p>${msg}</p></div>`;

export function showLoading(fig) {
  destroy(fig);
  fig.querySelector('.figure__body').innerHTML = ghost('Carregando dados…', 'is-loading');
  caption(fig, 'carregando');
}
export function showError(fig, message, onRetry) {
  destroy(fig);
  const body = fig.querySelector('.figure__body');
  body.innerHTML = `<div class="alert" role="alert"><strong>Não foi possível carregar este gráfico</strong><span>${esc(message)}</span><button class="btn btn--ghost" type="button">Tentar novamente</button></div>`;
  body.querySelector('button').addEventListener('click', onRetry);
  caption(fig, 'erro de carregamento');
}
export function showEmpty(fig) {
  destroy(fig);
  fig.querySelector('.figure__body').innerHTML = ghost('Os registros ainda estão sendo reunidos. Este gráfico será gerado automaticamente a partir da base documentada. <a href="#metodologia">Ver metodologia</a>');
  caption(fig, 'n = aguardando dados');
}
export function showInsufficient(fig, n, what) {
  destroy(fig);
  fig.querySelector('.figure__body').innerHTML = ghost(`Dados insuficientes para ${what}. Há registros em apenas um período.`);
  caption(fig, `n = ${n} ${n === 1 ? 'registro' : 'registros'}`);
}

// rows: [{label, count}]; kind: 'bar-h' | 'bar-v'
export function showMessage(fig, html, cap) { destroy(fig); fig.querySelector('.figure__body').innerHTML = ghost(html); caption(fig, cap); }
export function showChart(fig, rows, { kind, total, updatedAt, unitLabel, nouns = ['registro', 'registros'] }) {
  destroy(fig);
  if (!window.Chart) return showError(fig, 'A biblioteca de gráficos (Chart.js) não foi carregada.', () => location.reload());
  const horizontal = kind === 'bar-h';
  const shown = horizontal ? rows.slice(0, MAX_BARS) : rows;
  const body = fig.querySelector('.figure__body');
  const h = horizontal ? Math.max(260, shown.length * 38 + 60) : 340;
  body.innerHTML = `<div class="figure__plot" style="height:${h}px"><canvas role="img" aria-label="${esc(fig.dataset.title)}: gráfico de barras"></canvas></div>
    <details><summary>Ver tabela de dados</summary><table><thead><tr><th>${esc(unitLabel)}</th><th>${esc(nouns[1][0].toUpperCase() + nouns[1].slice(1))}</th><th>%</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.count}</td><td>${percent(r.count, total).toFixed(1).replace('.', ',')}</td></tr>`).join('')}</tbody></table></details>`;
  const values = shown.map((r) => r.count);
  charts.set(fig, new window.Chart(body.querySelector('canvas'), {
    type: 'bar',
    data: { labels: shown.map((r) => r.label), datasets: [{ data: values, backgroundColor: barColors(values), borderRadius: 2, maxBarThickness: 28 }] },
    options: baseOptions(total, horizontal, nouns),
  }));
  const cut = horizontal && rows.length > MAX_BARS ? ` · exibindo ${MAX_BARS} de ${rows.length} (tabela completa abaixo)` : '';
  caption(fig, `n = ${total} ${total === 1 ? nouns[0] : nouns[1]} · atualização: ${updatedAt ? updatedAt.split('-').reverse().join('/') : 'não informada'}${cut}`);
}
