// Gráficos de OCORRÊNCIA de fauna a partir da API pública do GBIF. Não são registros de atropelamento.
import { showError, showLoading, showMessage } from './charts/figure.js';
import { renderInfographic } from './infographic.js';

const API = 'https://api.gbif.org/v1/occurrence/search';
const NOUNS = ['ocorrência', 'ocorrências'];
const CLASS_PT = { Mammalia: 'Mamíferos', Aves: 'Aves', Reptilia: 'Répteis', Amphibia: 'Anfíbios', Actinopterygii: 'Peixes', Insecta: 'Insetos', Arachnida: 'Aracnídeos' };
const $ = (id) => document.getElementById(id);
const figs = () => ['bio-species', 'bio-class', 'bio-year'].map((k) => document.querySelector(`[data-chart="${k}"]`));

const tally = (rows, get, label = (x) => x) => {
  const m = new Map();
  for (const r of rows) { const k = get(r); if (k !== undefined && k !== null && k !== '') m.set(k, (m.get(k) || 0) + 1); }
  return m;
};
const ranked = (m, label = (x) => x) => [...m].map(([k, count]) => ({ label: String(label(k)), count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'));

export function summarize(rows) {
  return {
    species: ranked(tally(rows, (r) => r.species)),
    groups: ranked(tally(rows, (r) => r.class), (c) => CLASS_PT[c] || c),
    months: Array.from({ length: 12 }, (_, i) => ({ label: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][i], count: rows.filter((r) => r.month === i + 1).length })),
    years: [...tally(rows, (r) => r.year)].map(([k, count]) => ({ label: String(k), count })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

async function search(q) {
  const url = (offset) => `${API}?${new URLSearchParams({ country: 'BR', stateProvince: 'Mato Grosso do Sul', taxonKey: '1', limit: '300', offset: String(offset), ...(q ? { q } : {}) })}`;
  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`GBIF respondeu HTTP ${r.status}`); return r.json(); };
  const first = await get(url(0));
  const extra = first.count > 300 ? await Promise.all([300, 600].filter((o) => o < first.count).map((o) => get(url(o)))) : [];
  return { count: first.count, rows: [first, ...extra].flatMap((p) => p.results || []) };
}

async function run() {
  const q = $('bio-q').value.trim(), msg = $('bio-msg'), btn = $('bio-go');
  btn.disabled = true; $('bio-figs').hidden = false; $('viz-bio').hidden = true; figs().forEach(showLoading); msg.textContent = 'Consultando o GBIF…'; msg.className = 'imp-msg';
  try {
    const { count, rows } = await search(q);
    if (!rows.length) { figs().forEach((f) => showMessage(f, 'O GBIF não retornou ocorrências para esta busca.', 'n = 0 ocorrências')); msg.textContent = 'Nenhuma ocorrência encontrada.'; return; }
    const s = summarize(rows); $('bio-figs').hidden = true; $('viz-bio').hidden = false;
    renderInfographic($('viz-bio'), { title: 'Ocorrências de fauna (GBIF)', noun: NOUNS, total: rows.length, scope: 'nesta amostra do GBIF', species: s.species, groups: s.groups, municipalities: [], years: s.years, months: s.months, monthN: s.months.reduce((a, m) => a + m.count, 0),
      caption: `Amostra de ${rows.length} ocorrência(s) · consulta em ${new Date().toLocaleDateString('pt-BR')} · não são atropelamentos` });
    msg.textContent = `GBIF: ${count.toLocaleString('pt-BR')} ocorrências encontradas${q ? ` para "${q}"` : ''}; amostra de ${rows.length} analisada. Os totais de cada gráfico contam só as ocorrências com o campo preenchido.`;
  } catch (e) {
    figs().forEach((f) => showError(f, e instanceof TypeError ? 'Não foi possível acessar o GBIF (sem internet ou acesso bloqueado).' : e.message, run));
    msg.textContent = 'Falha na consulta.'; msg.className = 'imp-msg is-error';
  } finally { btn.disabled = false; }
}

export function initBiodiversity() {
  if (!$('bio-go')) return;
  figs().forEach((f) => showMessage(f, 'Clique em "Buscar no GBIF" para gerar este gráfico com dados da API.', 'n = aguardando busca'));
  $('bio-go').addEventListener('click', run);
  $('bio-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  document.querySelectorAll('[data-bio-q]').forEach((b) => b.addEventListener('click', () => { $('bio-q').value = b.dataset.bioQ; run(); }));
}
