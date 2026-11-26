// Funções puras: tudo é calculado de records. Nada é gravado nem estimado.
const byLabel = (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR');
export const percent = (v, total) => (total ? (v / total) * 100 : 0);

export function ranking(records, key, labelOf) {
  const m = new Map();
  for (const r of records) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return [...m].map(([id, count]) => ({ id, label: labelOf(id), count })).sort(byLabel);
}

const monthIndex = (ym) => +ym.slice(0, 4) * 12 + (+ym.slice(5, 7) - 1);
export function periodLabel(key) {
  if (key.length === 4) return key;
  const m = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${m[+key.slice(5, 7) - 1]}/${key.slice(0, 4)}`;
}

// Agrupa por mês se todos os registros têm precisão de mês/dia e o intervalo ≤ 24 meses; senão por ano.
export function periodSeries(records) {
  if (!records.length) return { unit: null, series: [], distinct: 0 };
  const months = records.map((r) => r.date.slice(0, 7));
  const canMonth = records.every((r) => r.datePrecision !== 'ano');
  const idx = canMonth ? months.map(monthIndex) : [];
  const useMonth = canMonth && Math.max(...idx) - Math.min(...idx) + 1 <= 24;
  const keyOf = (r) => (useMonth ? r.date.slice(0, 7) : r.date.slice(0, 4));
  const counts = new Map();
  for (const r of records) counts.set(keyOf(r), (counts.get(keyOf(r)) || 0) + 1);
  const keys = [...counts.keys()].sort();
  const series = [];
  if (useMonth) {
    for (let i = monthIndex(keys[0]); i <= monthIndex(keys.at(-1)); i++) {
      const k = `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
      series.push({ key: k, label: periodLabel(k), count: counts.get(k) || 0 });
    }
  } else {
    for (let y = +keys[0]; y <= +keys.at(-1); y++) series.push({ key: String(y), label: String(y), count: counts.get(String(y)) || 0 });
  }
  return { unit: useMonth ? 'mês' : 'ano', series, distinct: keys.length };
}

const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'], WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const humanize = (k) => { const s = String(k).replace(/[_.]+/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
export function seasonal(records) {
  const m = Array(12).fill(0), w = Array(7).fill(0); let monthN = 0, weekdayN = 0;
  for (const r of records) {
    if (r.datePrecision !== 'ano') { m[+r.date.slice(5, 7) - 1] += 1; monthN += 1; }
    if (r.datePrecision === 'dia') { w[new Date(`${r.date}T12:00:00`).getDay()] += 1; weekdayN += 1; }
  }
  return { byMonth: m.map((count, i) => ({ label: MON[i], count })), monthN, byWeekday: w.map((count, i) => ({ label: WD[i], count })), weekdayN };
}
// Colunas extras vindas do banco importado (record.extra). Só categorias realmente informadas.
export function extraDimensions(records) {
  const ex = new Map();
  for (const r of records) for (const [k, v] of Object.entries(r.extra || {})) { if (!ex.has(k)) ex.set(k, new Map()); ex.get(k).set(v, (ex.get(k).get(v) || 0) + 1); }
  return [...ex].map(([key, m]) => ({ key, label: humanize(key), list: [...m].map(([label, count]) => ({ label, count })).sort(byLabel) })).filter((x) => x.list.length >= 2);
}
export function computeStats({ records, species, municipalities }) {
  const nameSp = new Map(species.map((s) => [s.id, s.commonName]));
  const nameMu = new Map(municipalities.map((m) => [m.id, m.name]));
  const bySpecies = ranking(records, 'speciesId', (id) => nameSp.get(id));
  const byMunicipality = ranking(records, 'municipalityId', (id) => nameMu.get(id));
  const years = records.map((r) => r.date.slice(0, 4)).sort();
  return {
    total: records.length,
    speciesCount: bySpecies.length,
    municipalityCount: byMunicipality.length,
    firstYear: years[0] ?? null,
    lastYear: years.at(-1) ?? null,
    bySpecies, byMunicipality,
    period: periodSeries(records),
    ...seasonal(records), extras: extraDimensions(records),
    top: bySpecies[0] ?? null,
    topTied: bySpecies.length > 1 && bySpecies[0].count === bySpecies[1].count,
  };
}
