"""Gera safewild-standalone.html (arquivo único, abre com duplo clique). Requer Node/npx e Python."""
import json, re, subprocess, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
subprocess.run(['npx', '--yes', 'esbuild', 'assets/js/main.js', '--bundle', '--format=iife', '--minify', '--outfile=/tmp/sw-bundle.js'], cwd=root, check=True)
esc = lambda s: s.replace('</script', '<\\/script')
html = (root / 'index.html').read_text(encoding='utf-8')
css = ''.join((root / f'assets/css/{n}.css').read_text(encoding='utf-8') for n in ['tokens', 'base', 'layout', 'components', 'sections'])
html = re.sub(r'<link rel="stylesheet" href="assets/css/[^"]+">\n?', '', html).replace('</head>', f'<style>{css}</style>\n</head>')
data = {k: json.loads((root / f'data/{k}.json').read_text(encoding='utf-8')) for k in ['meta', 'species', 'records', 'municipalities', 'sources']}
chart = (root / 'assets/vendor/chart.umd.js').read_text(encoding='utf-8')
html = html.replace('<script src="assets/vendor/chart.umd.js" defer></script>', f'<script>{esc(chart)}</script>')
bundle = pathlib.Path('/tmp/sw-bundle.js').read_text(encoding='utf-8')
html = html.replace('<script type="module" src="assets/js/main.js"></script>', f'<script>window.__SW_DATA={esc(json.dumps(data, ensure_ascii=False))};</script>\n<script>{esc(bundle)}</script>')
out = root.parent / 'safewild-standalone.html'
out.write_text(html, encoding='utf-8'); print('gerado', out, round(out.stat().st_size / 1024), 'KB')
