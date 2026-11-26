# SafeWild

Site estático (HTML, CSS e JavaScript). Os módulos ES exigem servidor local:

    python -m http.server 8000   # depois abra http://localhost:8000

Ou use a extensão Live Server do VS Code. No GitHub Pages funciona direto.

Etapa 02: interface principal e placeholders. Fotografia do hero: remova o atributo `hidden` da figura `.hero__photo` em `index.html` quando houver imagem licenciada.

Importar dados: botão no Panorama. Aceita URL de API, arquivo .json/.csv/.zip, texto colado (a URL precisa permitir CORS); aplica no navegador, sem backend. Use "Baixar JSON" e copie para `data/` para tornar permanente.

Etapas 03-04: dados em `data/` (ver `data/SCHEMA.md`), indicadores, gráficos e catálogo (fotos em `assets/img/`, com crédito e licença no JSON). A base está vazia de propósito.
