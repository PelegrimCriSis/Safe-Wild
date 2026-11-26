const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
export function barColors(values) {
  const max = Math.max(...values), first = values.indexOf(max);
  return values.map((_, i) => (i === first ? css('--ochre-600') : css('--moss-700')));
}
export function baseOptions(total, horizontal, nouns = ['registro', 'registros']) {
  const grid = css('--sage-200'), ink = css('--ink-600');
  const tick = { color: ink, font: { family: css('--font-body'), size: 12 } };
  const value = { beginAtZero: true, ticks: { ...tick, precision: 0 }, grid: { color: grid }, border: { display: false } };
  const catTicks = horizontal ? { ...tick, autoSkip: false, callback(v) { const l = this.getLabelForValue(v); return l.length > 24 ? `${l.slice(0, 23)}…` : l; } } : tick;
  const cat = { ticks: catTicks, grid: { display: false }, border: { color: css('--line') } };
  return {
    responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? 'y' : 'x',
    scales: horizontal ? { x: value, y: cat } : { x: cat, y: value },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: css('--forest-950'), padding: 10, displayColors: false,
        callbacks: { label: (c) => { const v = c.parsed[horizontal ? 'x' : 'y']; return `${v} ${v === 1 ? nouns[0] : nouns[1]} (${((v / total) * 100).toFixed(1).replace('.', ',')}%)`; } },
      },
    },
  };
}
