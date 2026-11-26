import { esc } from './util.js';
// Catálogo de espécies. Informação ecológica (species.json) e atropelamentos (records.json) ficam em blocos separados.
const $ = (id) => document.getElementById(id);
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const STATUS = { LC: 'Pouco preocupante', NT: 'Quase ameaçada', VU: 'Vulnerável', EN: 'Em perigo', CR: 'Criticamente em perigo', EW: 'Extinta na natureza', EX: 'Extinta', DD: 'Dados insuficientes', NE: 'Não avaliada' };
const S = { all: [], q: '', group: '', status: '', hasRecords: false, sources: new Map() };

const imgSrc = (im) => (im && /^[\w\-./]+\.(jpe?g|png|webp|avif)$/i.test(im.file || '') && !im.file.includes('..') ? `assets/img/${im.file}` : null);
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? esc(u) : null);
const badge = (cat) => (cat ? `<span class="status-badge st-${esc(cat)}"><b>${esc(cat)}</b> ${esc(STATUS[cat] ?? '')}</span>` : '');
function recordsText(s) {
  if (!S.hasRecords) return 'Sem dados de atropelamento na base';
  if (!s.count) return 'Nenhum registro na base';
  return `${s.count} ${s.count === 1 ? 'atropelamento registrado' : 'atropelamentos registrados'}`;
}
const setState = (html) => { $('cat-state').innerHTML = html; };

export function initCatalog() {
  $('cat-search').addEventListener('input', (e) => { S.q = e.target.value; render(); });
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip[data-kind]');
    if (chip) { S[chip.dataset.kind] = chip.dataset.value; render(); chips(); return; }
    if (e.target.closest('[data-clear]')) { S.q = ''; S.group = ''; S.status = ''; $('cat-search').value = ''; render(); chips(); return; }
    const card = e.target.closest('.species-card');
    if (card) openDetail(card.dataset.id);
    const dlg = $('cat-dialog');
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
}
export function catalogLoading() { $('cat-tools').hidden = true; $('cat-grid').innerHTML = ''; setState('<div class="empty"><span>Carregando espécies…</span></div>'); }
export function catalogError(msg, retry) {
  $('cat-tools').hidden = true; $('cat-grid').innerHTML = '';
  setState(`<div class="alert" role="alert"><strong>Não foi possível carregar o catálogo</strong><span>${esc(msg)}</span><button class="btn btn--ghost" type="button" id="cat-retry">Tentar novamente</button></div>`);
  $('cat-retry').addEventListener('click', retry);
}
export function showCatalog(data, stats) {
  const counts = new Map(stats.bySpecies.map((r) => [r.id, r.count]));
  S.hasRecords = stats.total > 0;
  S.sources = new Map(data.sources.map((x) => [x.id, x]));
  S.all = data.species.map((s) => ({ ...s, count: counts.get(s.id) || 0, cat: s.conservation?.iucn?.category || s.conservation?.icmbio?.category || null }))
    .sort((a, b) => a.commonName.localeCompare(b.commonName, 'pt-BR'));
  S.q = ''; S.group = ''; S.status = ''; $('cat-search').value = '';
  $('cat-tools').hidden = !S.all.length;
  if (S.all.length) chips();
  render();
}
function chips() {
  const mk = (kind, vals, all) => `<button type="button" class="chip" data-kind="${kind}" data-value="" aria-pressed="${!S[kind]}">${all}</button>`
    + vals.map((v) => `<button type="button" class="chip" data-kind="${kind}" data-value="${esc(v)}" aria-pressed="${S[kind] === v}">${esc(v)}</button>`).join('');
  const groups = [...new Set(S.all.map((s) => s.taxonomicGroup).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sts = [...new Set(S.all.map((s) => s.cat).filter(Boolean))];
  $('cat-groups').innerHTML = mk('group', groups, 'Todos os grupos');
  $('cat-status').innerHTML = sts.length ? mk('status', sts, 'Qualquer status') : '';
  $('cat-status').hidden = !sts.length;
}
function filtered() {
  const q = norm(S.q);
  return S.all.filter((s) => (!S.group || s.taxonomicGroup === S.group) && (!S.status || s.cat === S.status)
    && (!q || norm(s.commonName).includes(q) || norm(s.scientificName).includes(q)));
}
function render() {
  const grid = $('cat-grid'), count = $('cat-count');
  if (!S.all.length) {
    grid.innerHTML = ''; count.textContent = '';
    return setState('<div class="empty"><strong>Catálogo em preparação</strong><span>As espécies serão incluídas somente com informações ecológicas de fontes confiáveis.</span></div>');
  }
  const list = filtered();
  count.textContent = `${list.length} de ${S.all.length} ${S.all.length === 1 ? 'espécie' : 'espécies'}`;
  if (!list.length) {
    grid.innerHTML = '';
    return setState('<div class="empty"><strong>Nenhuma espécie encontrada</strong><span>Revise a busca ou os filtros.</span><button class="btn btn--ghost" type="button" data-clear>Limpar busca e filtros</button></div>');
  }
  setState('');
  grid.innerHTML = list.map(card).join('');
}
function photo(s, cls) {
  const src = imgSrc(s.image);
  if (src) return `<div class="${cls}"><img src="${esc(src)}" alt="${esc(s.commonName)}" loading="lazy"><span class="credit">Foto: ${esc(s.image.credit || 'crédito não informado')}</span></div>`;
  return `<div class="${cls} is-placeholder"><span>${esc(s.taxonomicGroup || '')}</span></div>`;
}
const card = (s) => `<li><button type="button" class="species-card" data-id="${esc(s.id)}" aria-label="Ver detalhes de ${esc(s.commonName)}">
  ${photo(s, 'species-card__photo')}
  <span class="species-card__body"><span class="species-card__name">${esc(s.commonName)}</span><span class="sci">${esc(s.scientificName)}</span>${badge(s.cat)}</span>
  <span class="species-card__foot"><span>${esc(s.taxonomicGroup || '')}</span><span>${esc(recordsText(s))}</span></span></button></li>`;

function openDetail(id) {
  const s = S.all.find((x) => x.id === id); if (!s) return;
  const row = (t, v) => (v ? `<div><dt>${t}</dt><dd>${esc(v)}</dd></div>` : '');
  const cons = ['iucn', 'icmbio'].map((k) => {
    const c = s.conservation?.[k]; if (!c?.category) return '';
    const src = S.sources.get(c.sourceId);
    return `<div><dt>${k === 'iucn' ? 'IUCN (Lista Vermelha)' : 'ICMBio'}</dt><dd>${badge(c.category)} ${c.assessedYear || c.year ? `<small>avaliação de ${esc(c.assessedYear || c.year)}</small>` : ''}${src ? ` <small>· ${esc(src.name)}</small>` : ''}</dd></div>`;
  }).join('');
  const srcs = (s.sourceIds || []).map((i) => S.sources.get(i)).filter(Boolean).map((x) => {
    const u = safeUrl(x.url); return `<li>${u ? `<a href="${u}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</li>`;
  }).join('');
  $('cat-dialog').innerHTML = `<div class="species-dialog__inner">
    <button class="species-dialog__close" type="button" data-close aria-label="Fechar detalhes">×</button>
    ${photo(s, 'species-dialog__photo')}
    <div class="species-dialog__text"><p class="eyebrow">${esc(s.taxonomicGroup || 'Espécie')}</p>
    <h3 id="dlg-title">${esc(s.commonName)}</h3><p class="sci species-dialog__sci">${esc(s.scientificName)}</p>
    <section><h4>Sobre a espécie</h4><dl>${row('Características', s.description)}${row('Habitat', s.habitat)}${row('Alimentação', s.diet)}${row('Importância ecológica', s.ecologicalRole)}${cons}</dl>
      ${!(s.description || s.habitat || s.diet || s.ecologicalRole || cons) ? '<p class="note">Informações ecológicas ainda não cadastradas para esta espécie.</p>' : ''}</section>
    <section class="species-dialog__records"><h4>Atropelamentos na base</h4><p><strong>${esc(recordsText(s))}</strong></p>
      <p class="note">Esta contagem vem somente de registros documentados de atropelamento. As informações acima são de biodiversidade e não indicam mortalidade.</p></section>
    ${srcs ? `<section><h4>Fontes das informações</h4><ul class="source-list">${srcs}</ul></section>` : ''}</div></div>`;
  $('cat-dialog').showModal();
}
