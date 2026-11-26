// Importação de dados no navegador (sem backend). Dados importados ficam separados e rotulados.
import { esc } from './util.js';
import { buildDataset } from './data.js';

const KEY = 'safewild:import';
const $ = (id) => document.getElementById(id);
const SYN = {
  date: ['eventdate', 'event_date', 'observed_on', 'date', 'data', 'data_registro', 'datahora', 'data_hora', 'time_observed_at'],
  species: ['scientificname', 'species', 'taxon.name', 'especie', 'espécie', 'nome_cientifico', 'nomecientifico'],
  common: ['vernacularname', 'taxon.preferred_common_name', 'nome_popular', 'nomepopular', 'common_name', 'commonname', 'nome_comum'],
  municipality: ['municipio', 'município', 'municipality', 'county', 'city', 'cidade'],
  locality: ['locality', 'localidade', 'local', 'place_guess', 'trecho', 'rodovia'],
  group: ['class', 'classe', 'grupo', 'group', 'iconic_taxon_name', 'taxon.iconic_taxon_name', 'taxonomicgroup'],
};
const LOOSE = { date: /data|date|quando|dia/, species: /especie|species|cient|animal|taxon/, municipality: /munic|cidade|city|county/, state: /estado|state|^uf$|sigla/, locality: /local|trecho|rodovia|km/, group: /grupo|classe|class/, common: /popular|comum|common|vernac/ };
SYN.state = ['stateprovince', 'state', 'estado', 'uf', 'state_province'];
const FIELDS = {
  records: [['date', 'Data do registro', 1], ['species', 'Espécie', 1], ['municipality', 'Município / localização'], ['state', 'Estado (UF)'], ['locality', 'Trecho ou local (opcional)'], ['group', 'Grupo (opcional)'], ['common', 'Nome popular (opcional)']],
  species: [['species', 'Nome científico'], ['common', 'Nome popular'], ['group', 'Grupo (opcional)']],
};
const UF = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
const vals = (rows, c, n = 30) => rows.map((r) => r[c]).filter((v) => v != null && v !== '' && typeof v !== 'object').slice(0, n).map((v) => String(v).trim());
const share = (a, f) => (a.length ? a.filter(f).length / a.length : 0);
const GUESS = {
  date: (a) => share(a, (v) => normDate(v) && !/^\d{1,3}$/.test(v)) >= 0.8,
  species: (a) => share(a, (v) => /^[A-Z][a-zà-ú]+ [a-z-]{2,}/.test(v)) >= 0.7,
  state: (a) => share(a, (v) => UF.has(v.toUpperCase())) >= 0.8,
};
const BIO_HOSTS = /(^|\.)(gbif\.org|inaturalist\.org)$/i;
let state = { rows: [], cols: [], map: {}, how: {}, full: null, extras: [], extraCands: [] }, current = null, onChange = () => {};

const slug = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const flat = (o, p = '', d = 0) => Object.entries(o || {}).reduce((a, [k, v]) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && d < 2) Object.assign(a, flat(v, `${p}${k}.`, d + 1)); else a[p + k] = v;
  return a;
}, {});

const arraysIn = (o, d = 0) => (Array.isArray(o) ? [o] : o && typeof o === 'object' && d < 4 ? Object.values(o).flatMap((v) => arraysIn(v, d + 1)) : []);
export function findRows(json) {
  let rows = null;
  if (json && Array.isArray(json.features)) rows = json.features.map((f) => f.properties || {});
  else rows = arraysIn(json).filter((a) => a.length && a.every((r) => r && typeof r === 'object' && !Array.isArray(r))).sort((a, b) => b.length - a.length)[0] || null;
  return rows ? rows.map((r) => flat(r)) : null;
}
const IDLIKE = /(^|_)(id|uuid|key|codigo|cod|numero|num|lat|lon|lng|latitude|longitude)$|^id/i;
const extraOf = (r, extras) => { const e = Object.fromEntries(extras.map((c) => [c, r[c]]).filter(([, v]) => v != null && v !== '' && typeof v !== 'object').map(([c, v]) => [c, String(v).trim()])); return Object.keys(e).length ? { extra: e } : {}; };
// Colunas categóricas do banco (poucas categorias) que o site pode transformar em gráficos extras.
export function extraCandidates(rows, cols, map) {
  const used = new Set(Object.entries(map).filter(([f, c]) => c && f !== 'locality').map(([, c]) => c));
  return cols.filter((c) => !used.has(c) && !IDLIKE.test(c)).map((c) => {
    const v = vals(rows, c, 500), n = new Set(v).size, len = v.length ? v.reduce((a, x) => a + x.length, 0) / v.length : 0;
    return { c, n, len, fill: v.length / Math.min(rows.length, 500), date: GUESS.date(v) };
  }).filter((x) => x.n >= 2 && x.n <= 20 && x.n <= rows.length / 2 && x.len <= 30 && x.fill >= 0.5 && !x.date).map((x) => ({ c: x.c, n: x.n }));
}
export const columnsOf = (rows) => [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))];
export function autoMap(cols, mode, rows = []) {
  const lc = new Map(cols.map((c) => [c.toLowerCase(), c])), map = {}, how = {}, used = new Set();
  const pick = (f, c, h) => { map[f] = c; how[f] = h; used.add(c); };
  const fs = FIELDS[mode].map(([f]) => f);
  fs.forEach((f) => { map[f] = ''; const c = SYN[f].map((s) => lc.get(s)).find(Boolean); if (c && !used.has(c)) pick(f, c, 'nome'); });
  fs.filter((f) => !map[f]).forEach((f) => { const c = cols.find((x) => !used.has(x) && LOOSE[f].test(x.toLowerCase())); if (c) pick(f, c, 'nome'); });
  fs.filter((f) => !map[f] && GUESS[f]).forEach((f) => { const c = cols.find((x) => !used.has(x) && GUESS[f](vals(rows, x))); if (c) pick(f, c, 'conteúdo'); });
  return { map, how };
}
export function normDate(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim(); let m, y, mo, d;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) [, y, mo, d] = m;
  else if ((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/))) [, d, mo, y] = m;
  else if ((m = s.match(/^(\d{4})-(\d{2})$/))) return +m[2] >= 1 && +m[2] <= 12 ? { date: s, p: 'mes' } : null;
  else if (/^\d{4}$/.test(s)) return { date: s, p: 'ano' };
  else return null;
  return +mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31 ? { date: `${y}-${mo}-${d}`, p: 'dia' } : null;
}

export function buildImport(mode, rows, map, { name, url = '', confidence = 'media', extras = [] }) {
  const srcId = `imp-${slug(name) || 'fonte'}`;
  const get = (r, f) => { const v = map[f] ? r[map[f]] : null; return v == null || v === '' ? null : String(v).trim(); };
  const sp = new Map(), mu = new Map(), records = [], bad = {}; let noMun = 0;
  const miss = (k) => { bad[k] = (bad[k] || 0) + 1; };
  rows.forEach((r, i) => {
    const sci = get(r, 'species'), com = get(r, 'common'), label = sci || com;
    if (!label) return miss('sem espécie');
    const sid = `sp-${slug(label)}`;
    if (mode === 'records') {
      const d = normDate(get(r, 'date')); if (!d) return miss('data ausente ou inválida');
      const mun = get(r, 'municipality') || 'Não informado', uf = get(r, 'state') || '';
      if (mun === 'Não informado') noMun += 1;
      const mid = `mu-${slug(mun)}${uf ? `-${slug(uf)}` : ''}`;
      if (!mu.has(mid)) mu.set(mid, { id: mid, name: mun, uf });
      records.push({ id: `${srcId}-${i + 1}`, date: d.date, datePrecision: d.p, speciesId: sid, municipalityId: mid, locality: get(r, 'locality'), coordinates: null, sourceId: srcId, notes: null, confidence, ...extraOf(r, extras) });
    }
    if (!sp.has(sid)) sp.set(sid, { id: sid, commonName: com || label, scientificName: sci || '', taxonomicGroup: get(r, 'group') || '', sourceIds: mode === 'species' ? [srcId] : [] });
  });
  const source = { id: srcId, name, type: mode === 'records' ? 'atropelamentos' : 'biodiversidade', url, usedFor: 'Importado neste navegador; não verificado pela equipe.', status: 'em_uso', note: 'Dados importados, fora da base documentada.', accessedAt: new Date().toISOString().slice(0, 10) };
  return { species: [...sp.values()], records, municipalities: [...mu.values()], sources: [source], accepted: mode === 'records' ? records.length : sp.size, total: rows.length, discarded: bad, noMun };
}

const mer = (a, b) => { const ids = new Set(a.map((x) => x.id)); return [...a, ...b.filter((x) => !ids.has(x.id))]; };
export function withImport(base) {
  if (!current) return base;
  return buildDataset({ meta: base.meta, species: mer(base.species, current.species), records: mer(base.records, current.records), municipalities: mer(base.municipalities, current.municipalities), sources: mer(base.sources, current.sources) });
}
export const hasImport = () => !!current;

function banner() {
  const b = $('import-banner'); b.hidden = !current;
  if (current) $('import-banner-text').textContent = `Exibindo dados importados neste navegador (${current.label}): ${current.records.length} registro(s), ${current.species.length} espécie(s). Não fazem parte da base documentada.`;
}
const setMsg = (t, err = false) => { const m = $('imp-msg'); m.textContent = t; m.className = err ? 'imp-msg is-error' : 'imp-msg'; };
const mode = () => $('imp-mode').value;

const labelOf = (f) => (FIELDS[mode()].find((x) => x[0] === f) || [f, f])[1];
const sampleOf = (c) => [...new Set(vals(state.rows, c, 40))].slice(0, 3).map((v) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)).join(', ');
const howText = (f) => (state.how[f] === 'nome' ? '✓ reconhecido pelo nome da coluna' : state.how[f] === 'conteúdo' ? '✓ reconhecido pelo conteúdo' : state.how[f] === 'manual' ? '✓ escolhido por você' : FIELDS[mode()].find((x) => x[0] === f)?.[2] ? '⚠ escolha uma coluna' : 'opcional');
const curBuild = () => buildImport(mode(), state.rows, state.map, { name: $('imp-source').value.trim() || 'fonte', confidence: $('imp-conf').value, extras: mode() === 'records' ? state.extras : [] });

function problems() {
  const p = [];
  if (!$('imp-source').value.trim()) p.push('informe o nome da fonte');
  if (mode() === 'full') { if (!(state.full?.records?.length || state.full?.species?.length)) p.push('o JSON não tem registros nem espécies'); }
  else {
    FIELDS[mode()].filter((x) => x[2] && !state.map[x[0]]).forEach((x) => p.push(`escolha qual coluna é "${x[1]}"`));
    if (mode() === 'species' && !state.map.species && !state.map.common) p.push('escolha o nome científico ou o popular');
    if (!p.length && !curBuild().accepted) p.push('nenhuma linha foi aceita; revise as colunas escolhidas');
  }
  if (mode() !== 'species' && !$('imp-confirm').checked) p.push('marque a confirmação de que as linhas documentam atropelamentos');
  return p;
}
function preview() {
  $('imp-confirm-row').hidden = mode() === 'species';
  const todo = $('imp-todo'), samp = $('imp-sample'); samp.innerHTML = '';
  if (mode() === 'full' && state.full) {
    const f = state.full; $('imp-prev').textContent = `Formato SafeWild: ${f.records.length} registro(s), ${f.species.length} espécie(s), ${f.municipalities.length} município(s), ${f.sources.length} fonte(s).`;
  } else if (state.rows.length) {
    const r = curBuild(), why = Object.entries(r.discarded).map(([k, v]) => `${k}: ${v}`).join('; ');
    $('imp-prev').textContent = `${r.total} linha(s) lidas · ${r.accepted} aceita(s)${why ? ` · descartadas (${why})` : ''}${r.noMun ? ` · ${r.noMun} sem município (agrupadas como "Não informado")` : ''}.`;
    const cols = FIELDS[mode()].filter((x) => state.map[x[0]]);
    samp.innerHTML = `<p class="cat-count">Como as 5 primeiras linhas serão lidas:</p><div class="imp-scroll"><table><thead><tr>${cols.map((x) => `<th>${esc(x[1].replace(' (opcional)', ''))}</th>`).join('')}</tr></thead><tbody>${state.rows.slice(0, 5).map((row) => `<tr>${cols.map(([f]) => { const v = row[state.map[f]]; const shown = f === 'date' ? (normDate(v) ? normDate(v).date : '⚠ inválida') : (v ?? ''); return `<td>${esc(typeof shown === 'object' ? '' : shown)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  } else { $('imp-prev').textContent = ''; todo.innerHTML = ''; return; }
  const p = problems(); todo.innerHTML = p.length ? `<li><strong>Para aplicar, falta:</strong></li>${p.map((x) => `<li>${esc(x)}</li>`).join('')}` : '<li>✓ Tudo pronto. Clique em "Aplicar no site".</li>';
}
function renderMap() {
  const box = $('imp-map');
  if (mode() === 'full' || !state.cols.length) { box.innerHTML = ''; return preview(); }
  box.innerHTML = `<p class="cat-count">Confirme o que cada informação do seu arquivo significa. Mostro exemplos de cada coluna para você não precisar abrir o JSON.</p><div class="imp-fields">${FIELDS[mode()].map(([k, l, req]) => `<label class="imp-field"><span>${l}${req ? ' <em>(obrigatório)</em>' : ''} <b class="imp-how">${howText(k)}</b></span><select data-f="${k}"><option value="">(não usar)</option>${state.cols.map((c) => `<option value="${esc(c)}"${state.map[k] === c ? ' selected' : ''}>${esc(c)} — ex.: ${esc(sampleOf(c))}</option>`).join('')}</select></label>`).join('')}</div><div id="imp-extras"></div>`;
  renderExtras(); preview();
}
function resetView() {
  state = { rows: [], cols: [], map: {}, how: {}, full: null, extras: [], extraCands: [] }; $('imp-apply').disabled = true; $('imp-confirm').checked = false;
  ['imp-map', 'imp-sample', 'imp-todo'].forEach((id) => { $(id).innerHTML = ''; }); $('imp-prev').textContent = '';
}
function renderExtras() {
  const box = $('imp-extras'); if (!box) return;
  if (mode() !== 'records' || !state.extraCands.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<fieldset class="imp-extras"><legend>Outros recortes do seu banco (opcional)</legend><p class="cat-count">Encontrei estas colunas com poucas categorias e já deixei algumas marcadas para virarem gráficos. Desmarque o que não quiser.</p>${state.extraCands.map((x) => `<label class="imp-check"><input type="checkbox" data-x="${esc(x.c)}"${state.extras.includes(x.c) ? ' checked' : ''}> <span>${esc(x.c)} <small>(${x.n} categorias, ex.: ${esc(sampleOf(x.c))})</small></span></label>`).join('')}</fieldset>`;
}
function load(json) {
  resetView();
  if (mode() === 'full') {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return setMsg('No formato SafeWild o JSON deve ser um objeto com species, records, municipalities e sources.', true);
    state.full = { species: [], records: [], municipalities: [], sources: [], ...json };
    $('imp-apply').disabled = false; setMsg('Dados lidos. Confira a prévia e aplique.'); return renderMap();
  }
  const rows = findRows(json);
  if (!rows || !rows.length) return setMsg('Não encontrei uma lista de itens nesse JSON.', true);
  state.rows = rows; state.cols = columnsOf(rows); Object.assign(state, autoMap(state.cols, mode(), rows));
  state.extraCands = extraCandidates(rows, state.cols, state.map); state.extras = [...state.extraCands].sort((a, b) => a.n - b.n).slice(0, 3).map((x) => x.c);
  $('imp-apply').disabled = false;
  setMsg(`${rows.length} linha(s) lidas, ${state.cols.length} colunas encontradas. Confira o que foi reconhecido.`); renderMap();
}
async function fetchUrl() {
  const raw = $('imp-url').value.trim(); let u;
  try { u = new URL(raw); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return setMsg('Informe uma URL válida (http ou https).', true); }
  if (mode() === 'records' && BIO_HOSTS.test(u.hostname)) return setMsg('GBIF e iNaturalist registram ocorrência de espécies, não atropelamentos. Use o tipo "Espécies (catálogo)".', true);
  autoSource(u.hostname);
  setMsg('Buscando…'); const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(u, { signal: ctl.signal }); if (!res.ok) throw new Error(`HTTP ${res.status}`);
    parseAny(await res.text(), u.pathname);
  } catch (e) {
    setMsg(e instanceof SyntaxError ? 'A resposta não é um JSON válido.' : `Não foi possível buscar (${e.message}). O servidor pode bloquear acesso de navegadores (CORS) ou o endereço estar incorreto. Alternativa: abra a URL, copie o JSON e cole na caixa abaixo.`, true);
  } finally { clearTimeout(t); }
}

// ---- CSV e ZIP (somente no navegador, sem bibliotecas) ----
export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const delim = [';', '\t', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x !== ''));
  if (!head || !body.length) return [];
  const keys = head.map((h, i) => h.trim() || `coluna_${i + 1}`);
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}
const decode = (u8) => { try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); } catch { return new TextDecoder('windows-1252').decode(u8); } };
export function listZip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf); let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Arquivo ZIP inválido.');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = [];
  for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
    const flag = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!/\.(json|geojson|csv)$/i.test(name) || /(^|\/)(__MACOSX|\.)/.test(name)) continue;
    if (flag & 1) throw new Error('ZIP protegido por senha não é suportado.');
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    out.push({ name, method, data: u8.subarray(start, start + size) });
  }
  return out;
}
async function unzipEntry(en) {
  if (en.method === 0) return en.data;
  if (en.method !== 8) throw new Error('Tipo de compressão do ZIP não suportado.');
  return new Uint8Array(await new Response(new Blob([en.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
}
function parseAny(text, name = '') {
  let data;
  if (!/\.csv$/i.test(name)) { try { data = JSON.parse(text); } catch { /* tenta CSV */ } }
  if (data === undefined) { const rows = parseCsv(text); if (rows.length && Object.keys(rows[0]).length > 1) data = rows; }
  if (data === undefined) { resetView(); return setMsg('Não consegui ler o conteúdo como JSON nem como CSV.', true); }
  load(data);
}
let zipEntries = [], lastAuto = '';
function autoSource(name) { const el = $('imp-source'); if (!el.value.trim() || el.value === lastAuto) { el.value = name; lastAuto = name; } }
async function openFile(f) {
  const base = f.name.replace(/\.(json|geojson|csv|zip)$/i, '');
  autoSource(base);
  resetView(); zipEntries = []; $('imp-zip-row').hidden = true;
  const buf = await f.arrayBuffer();
  if (/\.zip$/i.test(f.name)) {
    try { zipEntries = listZip(buf); } catch (e) { return setMsg(e.message, true); }
    if (!zipEntries.length) return setMsg('O ZIP não contém arquivos .json, .geojson ou .csv.', true);
    $('imp-zip').innerHTML = zipEntries.map((z, i) => `<option value="${i}">${esc(z.name)}</option>`).join('');
    $('imp-zip-row').hidden = zipEntries.length < 2; return openZipEntry(0);
  }
  parseAny(decode(new Uint8Array(buf)), f.name);
}
async function openZipEntry(i) {
  try { const en = zipEntries[i]; parseAny(decode(await unzipEntry(en)), en.name); }
  catch (e) { setMsg(e instanceof Error && e.message.includes('suportad') ? e.message : 'Não foi possível abrir este arquivo do ZIP (navegador antigo ou arquivo corrompido).', true); }
}

function parseText(text) { autoSource('Texto colado'); parseAny(text); }

function apply() {
  const p = problems(); if (p.length) { setMsg(`Antes de aplicar: ${p.join('; ')}.`, true); $('imp-todo').scrollIntoView({ block: 'center' }); return; }
  const name = $('imp-source').value.trim();
  let r;
  if (mode() === 'full') { const f = state.full; r = { species: f.species, records: f.records, municipalities: f.municipalities, sources: f.sources.length ? f.sources : [{ id: 'imp-sw', name: name || 'Importação', type: 'atropelamentos', status: 'em_uso', note: 'Dados importados, fora da base documentada.' }] }; }
  else r = buildImport(mode(), state.rows, state.map, { name, url: $('imp-url').value.trim(), confidence: $('imp-conf').value, extras: mode() === 'records' ? state.extras : [] });
  current = { species: r.species, records: r.records, municipalities: r.municipalities, sources: r.sources, label: name || r.sources[0].name };
  try { if ($('imp-keep').checked) localStorage.setItem(KEY, JSON.stringify(current)); else localStorage.removeItem(KEY); } catch { /* armazenamento indisponível */ }
  $('import-dialog').close(); banner(); onChange();
}
function clear() { current = null; try { localStorage.removeItem(KEY); } catch { /* ignorar */ } banner(); onChange(); }
function download() {
  const { species, records, municipalities, sources } = current;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify({ species, records, municipalities, sources }, null, 2)], { type: 'application/json' })), download: 'safewild-importacao.json' });
  a.click(); URL.revokeObjectURL(a.href);
}

export function initImporter(cb) {
  onChange = cb;
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && ['species', 'records', 'municipalities', 'sources'].every((k) => Array.isArray(s[k]))) current = s; } catch { /* ignorar */ }
  banner();
  const dlg = $('import-dialog');
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-import]')) { e.preventDefault(); setMsg(''); dlg.showModal(); }
    if (e.target === dlg || e.target.closest('[data-imp-close]')) dlg.close();
  });
  $('imp-fetch').addEventListener('click', fetchUrl);
  $('imp-read').addEventListener('click', () => parseText($('imp-text').value));
  $('imp-file').addEventListener('change', (e) => { if (e.target.files[0]) openFile(e.target.files[0]); });
  $('imp-zip').addEventListener('change', (e) => openZipEntry(+e.target.value));
  $('imp-mode').addEventListener('change', () => { state = { rows: [], cols: [], map: {}, how: {}, full: null, extras: [], extraCands: [] }; $('imp-apply').disabled = true; $('imp-prev').textContent = ''; $('imp-todo').innerHTML = ''; renderMap(); setMsg('Tipo alterado. Leia os dados novamente.'); });
  $('imp-map').addEventListener('change', (e) => {
    if (e.target.dataset.x) { const c = e.target.dataset.x; state.extras = e.target.checked ? [...state.extras, c] : state.extras.filter((x) => x !== c); return preview(); }
    if (e.target.dataset.f) { const f = e.target.dataset.f; state.map[f] = e.target.value; state.how[f] = e.target.value ? 'manual' : ''; e.target.closest('label').querySelector('.imp-how').textContent = howText(f); state.extraCands = extraCandidates(state.rows, state.cols, state.map); state.extras = state.extras.filter((c) => state.extraCands.some((x) => x.c === c)); renderExtras(); preview(); } });
  ['imp-source', 'imp-conf', 'imp-confirm'].forEach((id) => $(id).addEventListener('input', preview));
  $('imp-apply').addEventListener('click', apply);
  $('import-clear').addEventListener('click', clear);
  $('import-download').addEventListener('click', download);
}
