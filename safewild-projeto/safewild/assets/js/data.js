// Carregamento e validação. buildDataset é pura (testável sem navegador).
const FILES = ['meta', 'species', 'records', 'municipalities', 'sources'];
const DATE_RE = { dia: /^\d{4}-\d{2}-\d{2}$/, mes: /^\d{4}-\d{2}$/, ano: /^\d{4}$/ };
const CONF = ['alta', 'media', 'baixa'];

export async function loadAll(base = 'data/') {
  if (typeof window !== 'undefined' && window.__SW_DATA) return buildDataset({ ...window.__SW_DATA }); // versão de arquivo único
  const out = {};
  await Promise.all(FILES.map(async (name) => {
    let res;
    try { res = await fetch(`${base}${name}.json`, { cache: 'no-cache' }); }
    catch { throw new Error(`Não foi possível acessar ${name}.json (rede ou servidor local ausente).`); }
    if (!res.ok) throw new Error(`${name}.json não encontrado (HTTP ${res.status}).`);
    try { out[name] = await res.json(); }
    catch { throw new Error(`${name}.json contém JSON inválido.`); }
  }));
  return buildDataset(out);
}

export function buildDataset(raw) {
  const lists = ['species', 'records', 'municipalities', 'sources'];
  for (const k of lists) if (!Array.isArray(raw[k])) throw new Error(`${k}.json deve ser uma lista.`);
  for (const k of ['species', 'municipalities', 'sources']) {
    const d = raw[k].map((x) => x.id).filter((id, i, a) => a.indexOf(id) !== i);
    if (d.length) throw new Error(`${k}.json tem ids duplicados: ${[...new Set(d)].join(', ')}.`);
  }
  const ids = (list) => new Set(list.map((x) => x.id));
  const sp = ids(raw.species), mu = ids(raw.municipalities), so = ids(raw.sources);
  const seen = new Set(), records = [], discarded = [];
  for (const r of raw.records) {
    let why = null;
    if (!r || !r.id) why = 'sem id';
    else if (seen.has(r.id)) why = 'id duplicado';
    else if (!DATE_RE[r.datePrecision]?.test(r.date ?? '')) why = 'data inválida ou incompatível com datePrecision';
    else if (!sp.has(r.speciesId)) why = `espécie inexistente (${r.speciesId})`;
    else if (!mu.has(r.municipalityId)) why = `município inexistente (${r.municipalityId})`;
    else if (!so.has(r.sourceId)) why = `fonte inexistente (${r.sourceId})`;
    else if (!CONF.includes(r.confidence)) why = 'confidence inválido';
    if (why) { discarded.push({ id: r?.id ?? null, why }); continue; }
    seen.add(r.id); records.push(r);
  }
  discarded.forEach((d) => console.warn(`[SafeWild] registro descartado ${d.id}: ${d.why}`));
  const groups = new Map();
  for (const r of records) { const k = [r.speciesId, r.municipalityId, r.date, r.locality ?? ''].join('|'); groups.set(k, [...(groups.get(k) ?? []), r.id]); }
  const possibleDuplicates = [...groups.values()].filter((v) => v.length > 1);
  possibleDuplicates.forEach((v) => console.warn(`[SafeWild] possível duplicata: ${v.join(', ')} (mesma espécie, município, data e localidade; mantidos, confira).`));
  return { possibleDuplicates, meta: raw.meta ?? {}, species: raw.species, municipalities: raw.municipalities, sources: raw.sources, records, discarded };
}
