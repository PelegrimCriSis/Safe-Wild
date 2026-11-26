# Esquema dos dados

Todos os arquivos (exceto `meta.json`) são listas JSON. Nenhuma contagem é gravada: totais são calculados de `records.json`.
Para adicionar dados, basta preencher as listas. Nenhum código precisa mudar.

**Ordem recomendada:** `sources` → `municipalities` → `species` → `records`. Um registro cuja espécie, município ou fonte não exista é descartado (e avisado no site e no console).

| Arquivo | Campos obrigatórios | Campos opcionais |
|---|---|---|
| `sources.json` | `id`, `name`, `type` (`atropelamentos`\|`conservacao`\|`biodiversidade`\|`publicacao`) | `usedFor`, `accessedAt`, `status` (`prevista`\|`em_uso`), `note` |
| `municipalities.json` | `id`, `name`, `uf` | `ibgeCode` |
| `species.json` | `id`, `commonName`, `scientificName`, `taxonomicGroup` | `description`, `habitat`, `diet`, `ecologicalRole`, `conservation`, `image`, `sourceIds` (só com fonte) |
| `records.json` | `id`, `date`, `datePrecision`, `speciesId`, `municipalityId`, `sourceId`, `confidence` | `locality`, `coordinates`, `notes` |

- `date` combina com `datePrecision`: `dia` = `AAAA-MM-DD`, `mes` = `AAAA-MM`, `ano` = `AAAA`.
- `confidence`: `alta` \| `media` \| `baixa`.
- Só entram em `records.json` atropelamentos **documentados**. Registros de biodiversidade (GBIF, iNaturalist) sem menção ao atropelamento e estimativas de mortalidade não entram aqui.
- `meta.json`: preencha `updatedAt` (`AAAA-MM-DD`) e `status` (`empty`\|`partial`\|`ready`) ao atualizar a base.

- `sources.json`: `url` é opcional. Fontes com `status: prevista` aparecem como "ainda não utilizada". Troque para `em_uso` e preencha `accessedAt` ao consultar.
- `meta.json` > `credits`: `authors` (lista), `course`, `institution`, `advisor`. O footer só exibe o que estiver preenchido.
