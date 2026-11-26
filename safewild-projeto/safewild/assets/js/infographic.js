// Painel visual em SVG/HTML (estilo infográfico). Recebe só dados já calculados; não inventa valores.
import { esc } from './util.js';

const nf = (n) => n.toLocaleString('pt-BR');
const pct = (v, t) => (t ? (v / t) * 100 : 0);
const fp = (p) => `${p >= 10 ? Math.round(p) : p.toFixed(1).replace('.', ',')}%`;
const col = (i, other) => `var(--viz-${other ? 6 : Math.min(i, 4) + 1})`;
const sum = (l) => l.reduce((a, r) => a + r.count, 0);
const slices = (list, total, top = 5) => { const head = list.slice(0, top).map((r) => ({ ...r })); const rest = total - sum(head); return rest > 0 ? [...head, { label: 'Outras', count: rest, other: true }] : head; };

function donut(sl, total, noun) {
  const R = 62, C = 2 * Math.PI * R; let off = 0;
  const arcs = sl.map((s, i) => { const len = (s.count / total) * C; const a = `<circle cx="80" cy="80" r="${R}" fill="none" stroke-width="22" style="stroke:${col(i, s.other)}" stroke-dasharray="${Math.max(len - 2, 0.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 80 80)"><title>${esc(s.label)}: ${nf(s.count)} (${fp(pct(s.count, total))})</title></circle>`; off += len; return a; }).join('');
  return `<svg viewBox="0 0 160 160" role="img" aria-label="Participação de cada espécie no total"><circle cx="80" cy="80" r="${R}" fill="none" stroke-width="22" class="viz-track"/>${arcs}<text x="80" y="82" class="viz-num" text-anchor="middle">${nf(total)}</text><text x="80" y="98" class="viz-sub" text-anchor="middle">${esc(noun)}</text></svg>`;
}
const legend = (sl, total) => `<ul class="viz-legend">${sl.map((s, i) => `<li><i style="background:${col(i, s.other)}"></i><span>${esc(s.label)}</span><b>${nf(s.count)} <small>${fp(pct(s.count, total))}</small></b></li>`).join('')}</ul>`;

function rings(items, total) {
  return `<svg viewBox="0 0 160 160" role="img" aria-label="Participação dos principais municípios">${items.map((s, i) => { const r = 66 - i * 14, c = 2 * Math.PI * r; return `<circle cx="80" cy="80" r="${r}" fill="none" stroke-width="9" class="viz-track"/><circle cx="80" cy="80" r="${r}" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * s.count) / total} ${c}" transform="rotate(-90 80 80)" style="stroke:${col(i)}"><title>${esc(s.label)}: ${fp(pct(s.count, total))}</title></circle>`; }).join('')}</svg>`;
}
function waffle(sl, total) {
  const raw = sl.map((s) => pct(s.count, total)), base = raw.map(Math.floor); const left = 100 - sum(base.map((c) => ({ count: c })));
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).slice(0, left).forEach(([, i]) => { base[i] += 1; });
  const cells = sl.flatMap((s, i) => Array.from({ length: base[i] }, () => `<i style="background:${col(i, s.other)}" title="${esc(s.label)}"></i>`));
  return `<div class="viz-waffle" role="img" aria-label="Cada quadrado representa 1% do total">${cells.join('')}</div>`;
}
function bars(list, total, n = 8) {
  const max = list[0].count;
  return `<ol class="viz-bars">${list.slice(0, n).map((r, i) => `<li><span class="viz-bars__l" title="${esc(r.label)}">${esc(r.label)}</span><span class="viz-bars__t"><b style="width:${(r.count / max) * 100}%;background:${i === 0 ? 'var(--viz-accent)' : 'var(--viz-2)'}"></b></span><span class="viz-bars__v">${nf(r.count)} <small>${fp(pct(r.count, total))}</small></span></li>`).join('')}</ol>`;
}
function period(series) {
  const W = 600, H = 210, pad = 20, step = (W - 2 * pad) / series.length, bw = Math.min(36, step * 0.7), max = Math.max(...series.map((s) => s.count));
  const x = (i) => pad + step * i + step / 2, y = (v) => H - 28 - (v / max) * (H - 70), every = Math.ceil(series.length / 12), pk = series.findIndex((s) => s.count === max);
  const rects = series.map((s, i) => `<rect x="${x(i) - bw / 2}" y="${y(s.count)}" width="${bw}" height="${H - 28 - y(s.count)}" rx="2" style="fill:${i === pk ? 'var(--viz-accent)' : 'var(--viz-3)'}"><title>${esc(s.label)}: ${nf(s.count)}</title></rect>`).join('');
  const line = series.length > 1 ? `<polyline fill="none" stroke-width="1.5" class="viz-line" points="${series.map((s, i) => `${x(i)},${y(s.count)}`).join(' ')}"/>` : '';
  const dots = series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.count)}" r="3" class="viz-dot"/>`).join('');
  const vals = series.map((s, i) => (series.length <= 14 || i === pk ? `<text x="${x(i)}" y="${y(s.count) - 8}" class="viz-val" text-anchor="middle">${nf(s.count)}</text>` : '')).join('');
  const labs = series.map((s, i) => (i % every === 0 ? `<text x="${x(i)}" y="${H - 8}" class="viz-sub" text-anchor="middle">${esc(s.label)}</text>` : '')).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Quantidade por período">${rects}${line}${dots}${vals}${labs}</svg>`;
}

const card = (cls, q, body, take = '') => `<section class="viz-card ${cls}"><h4>${q}</h4>${body}${take ? `<p class="viz-take">${take}</p>` : ''}</section>`;

// d: { title, noun:[sing,plur], total, species, groups, municipalities, years, scope, caption }
export function renderInfographic(box, d) {
  const [n1, nP] = d.noun, sT = sum(d.species), top = d.species[0], tie = d.species[1] && d.species[1].count === top.count;
  const muni = (d.municipalities || []).length > 1 ? d.municipalities : [], gT = sum(d.groups || []), mT = sum(muni), parts = [];
  parts.push(card('c3 viz-kpi', 'Total analisado', `<p class="viz-big">${nf(d.total)}</p><p class="viz-sub2">${nP} ${esc(d.scope)}</p>`));
  const sl = slices(d.species, sT);
  parts.push(card('c5', 'Quais espécies aparecem?', `<div class="viz-split">${donut(sl, sT, nP)}${legend(sl, sT)}</div>`,
    tie ? `${esc(top.label)} e ${esc(d.species[1].label)} têm a mesma quantidade (${fp(pct(top.count, sT))} cada).` : `${esc(top.label)} concentra ${fp(pct(top.count, sT))} dos ${nP} ${esc(d.scope)}.`));
  if (gT) { const gs = slices(d.groups, gT); parts.push(card('c4', 'Como se divide por grupo?', `${waffle(gs, gT)}${legend(gs, gT)}`, `Cada quadrado = 1%.${gT < d.total ? ' Considera só itens com grupo informado.' : ''}`)); }
  else parts.push(card('c4', 'Como se divide?', `${waffle(sl, sT)}${legend(sl, sT)}`, 'Cada quadrado = 1% (por espécie).'));
  parts.push(card(mT ? 'c7' : 'c12', 'Ranking de espécies', bars(d.species, sT), `Mostrando ${Math.min(8, d.species.length)} de ${d.species.length} espécie(s).`));
  if (mT) { const ms = muni.slice(0, 4); parts.push(card('c5', 'Onde se concentram?', `<div class="viz-split">${rings(ms, mT)}${legend(ms, mT)}</div>`, `${esc(ms[0].label)} reúne ${fp(pct(ms[0].count, mT))} (${nf(ms[0].count)}).`)); }
  if (d.years && d.years.length > 1) { const pk = d.years.reduce((a, b) => (b.count > a.count ? b : a)); parts.push(card('c12', 'Quando?', period(d.years), `Maior quantidade em ${esc(pk.label)} (${nf(pk.count)}). Barras = quantidade por período; linha = tendência entre eles.`)); }
  else parts.push(card('c12', 'Quando?', '<p class="viz-sub2">Dados insuficientes para uma série temporal: há registros em apenas um período.</p>'));
  const peakOf = (l) => l.reduce((a, b) => (b.count > a.count ? b : a));
  const few = (n) => (n < 30 ? ` Com poucos ${nP}, evite ler isto como padrão sazonal.` : '');
  if (d.months && d.monthN >= 10) parts.push(card('c6', 'Em que época do ano?', period(d.months), `Maior quantidade em ${esc(peakOf(d.months).label)}. Considera ${nf(d.monthN)} ${nP} com mês informado.${few(d.monthN)}`));
  if (d.weekdays && d.weekdayN >= 10) parts.push(card('c6', 'Em que dia da semana?', period(d.weekdays), `Maior quantidade em ${esc(peakOf(d.weekdays).label)}. Considera ${nf(d.weekdayN)} ${nP} com dia informado.${few(d.weekdayN)}`));
  (d.extras || []).forEach((x) => { const t = sum(x.list); parts.push(card('c6', `Por ${esc(x.label.toLowerCase())}`, bars(x.list, t), `"${esc(x.list[0].label)}" é o valor mais frequente (${fp(pct(x.list[0].count, t))}). ${nf(t)} ${nP} com este campo informado.`)); });
  parts.push(`<details class="viz-table c12"><summary>Ver tabela de dados (espécies)</summary><table><thead><tr><th>Espécie</th><th>${esc(nP)}</th><th>%</th></tr></thead><tbody>${d.species.map((r) => `<tr><td>${esc(r.label)}</td><td>${nf(r.count)}</td><td>${fp(pct(r.count, sT))}</td></tr>`).join('')}</tbody></table></details>`);
  box.innerHTML = `<header class="viz-head"><h3>${esc(d.title)}</h3><p>${esc(d.caption || '')}</p></header><div class="viz-grid">${parts.join('')}</div>`;
}

export function fromData(data, stats, updatedAt) {
  const sp = new Map(data.species.map((s) => [s.id, s])), g = new Map();
  for (const r of data.records) { const k = sp.get(r.speciesId)?.taxonomicGroup; if (k) g.set(k, (g.get(k) || 0) + 1); }
  const cnt = new Map(); data.records.forEach((r) => cnt.set(r.sourceId, (cnt.get(r.sourceId) || 0) + 1));
  const srcId = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0], srcName = data.sources.find((s) => s.id === srcId)?.name || 'não informada';
  const when = updatedAt ? updatedAt.split('-').reverse().join('/') : 'não informada';
  return {
    title: 'Registros de atropelamento documentados', noun: ['registro', 'registros'], total: stats.total, scope: 'na base e no recorte analisados',
    species: stats.bySpecies, municipalities: stats.byMunicipality, years: stats.period.distinct > 1 ? stats.period.series : [],
    groups: [...g].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    months: stats.byMonth, monthN: stats.monthN, weekdays: stats.byWeekday, weekdayN: stats.weekdayN, extras: stats.extras,
    caption: `n = ${nf(stats.total)} · fonte: ${srcName} · atualização da base: ${when}`,
  };
}
