import { initNav } from './ui/nav.js';
import { initReveal } from './ui/reveal.js';
import { initToTop } from './ui/totop.js';
import { loadAll } from './data.js';
import { computeStats } from './stats.js';
import { initBiodiversity } from './biodiversity.js';
import { initImporter, withImport } from './importer.js';
import { initCatalog, showCatalog, catalogLoading, catalogError } from './catalog.js';
import { renderSources, renderFooter } from './ui/sources.js';
import { renderPanorama, renderPanoramaEmpty, renderPanoramaError } from './ui/panorama.js';
import { renderInfographic, fromData } from './infographic.js';
import { showLoading, showError, showEmpty } from './charts/figure.js';

document.documentElement.dataset.ready = '1';
initNav(); initReveal(); initToTop(); initCatalog();

const fig = (id) => document.querySelector(`[data-chart="${id}"]`);
const figs = ['species', 'municipality', 'period'].map(fig);
const grid = document.getElementById('base-figs'), viz = document.getElementById('viz-base');
let base = { meta: {}, species: [], records: [], municipalities: [], sources: [], discarded: [], possibleDuplicates: [] };

const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : null);
function fail(err) {
  grid.hidden = false; viz.hidden = true;
  console.error('[SafeWild]', err);
  document.getElementById('sources-list').innerHTML = `<div class="alert" role="alert"><strong>Não foi possível carregar as fontes</strong><span>${err.message.replace(/[<>&]/g, '')}</span></div>`;
  catalogError(err.message, boot); renderPanoramaError(err.message, boot); figs.forEach((f) => showError(f, err.message, boot));
}

function render() {
  try {
    const data = withImport(base), s = computeStats(data), updatedAt = data.meta.updatedAt;
    document.getElementById('base-update').textContent = `Data de atualização da base: ${fmtDate(data.meta?.updatedAt) ?? 'ainda não definida'}.`;
    renderSources(data.sources); renderFooter(data.meta); showCatalog(data, s);
    grid.hidden = false; viz.hidden = true; viz.innerHTML = '';
    if (!s.total) {
      renderPanoramaEmpty(); figs.forEach(showEmpty);
      if (data.discarded.length) document.getElementById('panorama-status').insertAdjacentHTML('beforeend', `<span>${data.discarded.length} registro(s) descartado(s) por inconsistência; veja o console.</span>`);
      return;
    }
    renderPanorama(s, data.discarded, data.possibleDuplicates.length);
    grid.hidden = true; viz.hidden = false; renderInfographic(viz, fromData(data, s, updatedAt));
  } catch (err) { fail(err); }
}

async function boot() {
  grid.hidden = false; viz.hidden = true;
  figs.forEach(showLoading); catalogLoading();
  try { base = await loadAll(); } catch (err) { return fail(err); }
  render();
}
initBiodiversity();
initImporter(render);
boot();
