import { esc } from '../util.js';
const GROUPS = {
  atropelamentos: ['Registros de atropelamento', 'Única categoria que pode alimentar os gráficos de mortalidade.'],
  conservacao: ['Conservação das espécies', 'Categorias de ameaça exibidas no catálogo, sempre com ano e fonte.'],
  biodiversidade: ['Biodiversidade e ocorrência', 'Contextualizam a fauna regional. Não documentam atropelamentos e não entram na contagem.'],
  publicacao: ['Publicações científicas', 'Listadas somente após conferência da referência completa.'],
};
const fmt = (d) => d.split('-').reverse().join('/');

export function renderSources(sources) {
  const box = document.getElementById('sources-list');
  if (!sources.length) { box.innerHTML = '<div class="empty"><strong>Fontes em levantamento</strong><span>Nenhuma referência é listada antes de ser conferida.</span></div>'; return; }
  box.innerHTML = Object.entries(GROUPS).map(([type, [title, desc]]) => {
    const items = sources.filter((s) => s.type === type);
    if (!items.length) return '';
    return `<section class="source-group reveal is-in"><div><h3>${title}</h3><p>${desc}</p></div><ul>${items.map((s) => {
      const link = /^https?:\/\//i.test(s.url || '') ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name);
      const st = s.status === 'em_uso' ? 'Em uso' : 'Prevista, ainda não utilizada';
      return `<li class="source-item"><strong>${link}</strong><span>${esc(s.usedFor || '')}</span><small>${st}${s.note ? ` · ${esc(s.note)}` : ''} · ${s.accessedAt ? `acessada em ${esc(fmt(s.accessedAt))}` : 'data de acesso não registrada'}</small></li>`;
    }).join('')}</ul></section>`;
  }).join('');
}

export function renderFooter(meta) {
  const c = meta?.credits || {}, parts = [];
  if (c.authors?.length) parts.push(`Autoria: ${c.authors.map(esc).join(', ')}`);
  if (c.advisor) parts.push(`Orientação: ${esc(c.advisor)}`);
  if (c.course) parts.push(esc(c.course));
  if (c.institution) parts.push(esc(c.institution));
  const el = document.getElementById('footer-credits');
  el.innerHTML = parts.map((p) => `<li>${p}</li>`).join('');
  el.hidden = !parts.length;
}
