# Handoff: Estudos — app pessoal de notas + repetição espaçada

## Overview
Interface de uma aplicação web pessoal (um usuário) em que notas de aula em Markdown + LaTeX geram flashcards marcados no próprio texto, agendados por FSRS. Telas: revisão em modo foco, leitura de nota, painel, editor, cursos/curso/aula, busca e página de tag (conceito). Stack alvo: **Next.js App Router + Tailwind + shadcn/ui**.

## About the design files
Os arquivos deste pacote são **referências de design feitas em HTML** — protótipos que mostram aparência e comportamento, não código de produção. A tarefa é **recriar estas telas no codebase Next.js existente**, com seus padrões (App Router, Tailwind, shadcn/ui). Os dados no protótipo são fictícios; ligue-os aos modelos reais (Curso → Módulo → Aula → Nota → Card → Revisão, Tag).

Abra `Estudos.dc.html` num navegador (servido por HTTP local, ex.: `npx serve .`). A barra cinza no topo **não faz parte do app**: troca tela, estado, tema (claro/escuro) e largura (1440 / 900 / 375px). A aba "Decisões" resume escolhas de design.

## Fidelity
**Alta fidelidade.** Cores, tipografia, espaçamentos, textos e interações são finais. Recrie fielmente.

## Design tokens

### Cores
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--paper` | `#FCFCFA` | `#11171D` | fundo |
| `--ink` | `#16202B` | `#E8EDF1` | texto |
| `--ink-soft` | `#5A6B7B` | `#93A3B2` | texto secundário (no protótipo: `--soft`) |
| `--rule` | `#DDE3E8` | `#2A353F` | filetes, bordas, fundo de destaque |
| `--accent` | `#31688E` | `#6FA4CC` | links, foco, item ativo — nada mais |

Avaliação (viridis, **iguais nos dois temas**, texto fixo):
| Botão | Fundo | Texto |
|---|---|---|
| De novo (1) | `#440154` | `#FFFFFF` |
| Difícil (2) | `#31688E` | `#FFFFFF` |
| Bom (3) | `#35B779` | `#16202B` |
| Fácil (4) | `#FDE725` | `#16202B` |
Nunca reutilizar estas cores fora dos botões de avaliação.

O accent escuro foi clareado porque `#31688E` sobre `#11171D` dá só 3,0:1.

### Tipografia
IBM Plex (Google Fonts): **Sans** 400/500/600 (interface), **Serif** 400/500/600 (corpo de nota, face de card), **Mono** 400/500 (código, sintaxe de card, editor).
Escala fechada: **13 / 15 / 17 / 21 / 28 / 38px** → sugestão Tailwind `xs 13, sm 15, base 17, lg 21, xl 28, 2xl 38`. Nenhum tamanho fora disso.
- Corpo de nota: Serif 17px, line-height 1.65, max-width 68ch, alinhado à esquerda (nunca justificado).
- Pergunta do card na revisão: Serif 28px, line-height 1.45.
- H1 de página: Sans 28px/500 (título de nota: Serif 38px/500). H2 em nota: Serif 21px/600. H2 de seção: Sans 21px/500 ou 15px/500 em `--ink-soft`.
- Metadados/caminhos: Sans 13px `--ink-soft`.

### Outros
- Raio: `2px` em tudo (botões, inputs, cards, badges).
- Sombras: nenhuma. Gradientes: nenhum. Ícones decorativos: nenhum (apenas glifos ▸ ▾ ↑ ↓ » como texto).
- Foco: um único idioma global — `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`.
- `overflow-wrap: anywhere` na raiz; fórmulas em display com `overflow-x: auto` no próprio bloco. Nunca rolagem horizontal da página.
- Alvos de toque ≥ 44px na largura móvel.
- Espaçamentos usados: 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56px (escala Tailwind padrão cobre).

Snippet de tokens:
```css
:root{--paper:#FCFCFA;--ink:#16202B;--ink-soft:#5A6B7B;--rule:#DDE3E8;--accent:#31688E;
--rate-again:#440154;--rate-hard:#31688E;--rate-good:#35B779;--rate-easy:#FDE725}
.dark{--paper:#11171D;--ink:#E8EDF1;--ink-soft:#93A3B2;--rule:#2A353F;--accent:#6FA4CC}
```

## Layout / casca
- **≥ 900px:** rail à esquerda (240px em ≥1100, 200px entre 900–1099), borda direita 1px `--rule`, padding 24px 20px. Recolhível para faixa de 48px com botão "»" (aria-label "Expandir menu"). Conteúdo: marca "Estudos" (15/600) + "Recolher"; nav Painel · Cursos · Revisão (contagem 13px) · Busca (15px, ativo em `--accent` 500, `aria-current="page"`); em telas de curso/nota/aula/editor, árvore do curso (13px; módulos expansíveis; aula ativa em accent); no rodapé "Tema escuro/claro" e "Sair" (13px soft).
- **< 900px:** rail vira barra no topo (borda inferior), marca + tema + sair na 1ª linha, nav em linha que quebra; itens com min-height 44px. Sem gaveta sobreposta.
- Padding do conteúdo: 40/56/80 (≥1100), 32/32/64 (900–1099), 20/16/56 (<900).
- No editor a 900–1099px o rail inicia recolhido (preferência do usuário prevalece).

## Telas

### 1. `/review` — modo foco
Sem rail, sem margem. Coluna central max-width 720px; padding 28px 56px 40px (16px em móvel).
- Topo (13px soft): caminho do card ("Álgebra linear · Projeções") à esquerda, "Restam N" à direita.
- Face: Serif 28px, centralizada verticalmente. Cloze oculto: `[…]` com borda inferior 2px `--ink`. Cloze revelado: resposta in-loco com fundo `--rule`, padding 2px 6px. Pergunta/resposta: resposta abaixo de filete 1px `--rule`, padding-top 24px, também Serif 28.
- Estado pergunta: botão largura total, min-height 72px, fundo `--ink`, texto `--paper`: "Mostrar resposta" (17/500) + "espaço" (13).
- Estado resposta: grade 4 colunas iguais, gap 8px, min-height 72px: label 17/500 + atalho 13px abaixo (1–4), cores acima.
- Rodapé 13px soft centralizado: "esc sai" / "u desfaz · esc sai"; após desfazer mostra "Avaliação desfeita" por 2,5s (role=status).
- Fila vazia: "Nada vence hoje." (Serif 28/500), "Próxima revisão em 2 dias." (17 soft), links "Estudar adiantado" e "Voltar ao painel"; rodapé "esc volta ao painel".
- Teclado: `espaço` revela; `1`–`4` avaliam (só com resposta visível); `u` desfaz a última avaliação (volta ao estado resposta do card anterior); `esc` vai ao painel. Ignorar teclas quando o foco está em input/textarea.
- Não mostrar intervalos previstos nos botões.

### 2. `/notes/[id]` — leitura
- Cabeçalho (max 680px): breadcrumb curso · aula (13px, links), título Serif 38/500, meta 13px soft "Anotação de aula · Editada há 2 h · 4 cards · Editar".
- ≥1100px: grade `minmax(0,68ch) 248px`, column-gap 48px. **Cada bloco da nota é uma linha da grade**; os cards gerados por ele ficam na 2ª coluna da mesma linha (padding-top 28px, gap 12px).
- Clozes no texto: sublinhado pontilhado 1px `--ink-soft` + número sobrescrito (Sans 13px, link `#cN` para o card).
- Pergunta/resposta no texto: bloco com filetes superior/inferior, grade `auto 1fr`, rótulos "Pergunta"/"Resposta" Sans 13 soft.
- Código Python: `pre` Mono 15/1.6, borda 1px `--rule`, padding 16, overflow-x auto; realce monocromático (comentários em `--ink-soft`).
- Display math alinhada à esquerda com recuo de 24px.
- Tags ao fim: links Sans 15 (`#projecao-vetorial` → `/tags/[slug]`).
- < 1100px: margem some; seção ao fim "Cards desta nota (4)" com botão expansível (aria-expanded, ▸/▾), cards em grade `auto-fill minmax(240px,1fr)`.
- **Card na margem** (`NoteCard.dc.html`): borda 1px `--rule`, padding 12, gap 8. Linha 1 (13 soft): "1 · Lacuna" + badge do estado (texto `--ink`, borda 1px `--ink-soft`, padding 0 6px). Face Serif 15/1.5 com lacuna `[…]`. Linha final: vencimento (13 soft) + botão "Suspender"/"Retomar" (13px, borda `--rule`, min-height 32px). Suspenso: badge tracejado, face em `--ink-soft`. Estados exibidos: novo, aprendendo, revisão, suspenso (arquivados não aparecem).

### 3. `/` — painel (max-width 880px, gap 40px)
- "Hoje" (28/500) + data (15 soft).
- Duas caixas (borda `--rule`, padding 24; grid auto-fit minmax(300px)): **Fila de hoje** — números 38px tabular ("34 revisões vencem", "12 cards novos") + botão primário "Começar revisão" (fundo `--ink`). **Captura** — "Nota nova na aula Projeções, aberta direto no editor." + botão secundário "Nova nota" (borda 1px `--ink`) → cria nota na última aula aberta e abre o editor.
- Métricas (dl, filete superior 1px `--ink`): "Sequência — 9 dias seguidos", "Tempo mediano por card — 11 s" (21px).
- "Últimas notas editadas": lista com título (17/500 link), caminho curso · aula (13 soft), tempo relativo à direita.
- Canto inferior direito, 13px soft: "Limites diários · Novos [20] · Revisões [200]" (inputs number 72px); salva ao alterar e mostra "Salvo". Não existe página de configurações.

### 4. `/notes/[id]/edit` — editor
- Cabeçalho: breadcrumb, título 21/500; à direita indicador `role=status` 13 soft "Salvando…" / "Salvo 18:42" + link "Ver nota". Autosave com debounce ~900ms.
- Container com borda `--rule`: ≥900px duas colunas iguais (divisória vertical); <900px coluna única (divisória horizontal). Cada painel com cabeçalho 13 soft ("Markdown" / "Pré-visualização").
- Textarea: Mono 15/1.65, sem borda, padding 16, min-height 720px (420 em móvel), resize vertical.
- Preview: renderização Serif idêntica à leitura (sem margem de cards).
- **Erro de sintaxe de card** (ex.: lacuna vazia `{{}}`): alerta acima do editor, borda 2px `--ink`, título 600 "Card não criado: lacuna vazia na linha N", texto: "A marcação {{}} não tem resposta. Escreva a resposta entre as chaves, como {{resposta}}, ou apague a marcação. O resto da nota está salvo." No preview, o trecho aparece como `{{}} lacuna vazia` em Mono com borda 2px `--ink`. Sem cor de erro (não existe token).

### 5. `/courses`, `/courses/[slug]`, `/lessons/[id]`
- **Cursos:** "Cursos" + botão "Novo curso". Por especialização: H2 21/500 com filete inferior 1px `--ink` e "Especialização · N cursos"; linhas de curso (17/500 link) com meta "5 módulos · 18 aulas · 14 estudadas".
- **Curso:** breadcrumb, título, botão "Novo módulo", meta. Lista ordenada de módulos (filete superior `--ink`): botão expansível (▸/▾, "2. Vetores", "2 de 5 estudadas") + ações "Nova aula · Renomear · ↑ · ↓ · Arquivar" (13px, borda `--rule`; ↑/↓ desabilitados nas pontas). Aulas: checkbox "estudada" (accent-color), título link, "3 notas", ações "Renomear ↑ ↓ Arquivar". Renomear = input inline (Enter salva, Esc cancela, blur salva). "Arquivados (N)" ao fim com "Restaurar". Módulo vazio: "Módulo sem aulas. Criar a primeira aula".
- **Aula:** breadcrumb curso · módulo, título, botão "Marcar como estudada"/"Desmarcar como estudada" (aria-pressed) + status 13 soft. Seção "Notas" com botão primário "Nova nota"; linhas tipo (Anotação de aula / Resumo / Resolução), título, "4 cards · editada há 2 h". Vazio: "Esta aula ainda não tem notas. Comece pela anotação da aula: escrever a primeira nota."

### 6. `/search` e `/tags/[slug]`
- **Busca:** campo `type=search` 17px, label "Buscar em notas e cards"; status "N resultados para “termo” em notas e cards"; resultados: "Nota · curso · aula" ou "Card · estado · de <nota>" (13 soft), título 17/500, trecho Serif 15/1.6. Termo destacado com `<mark>`: fundo `--rule`, peso 600, cor herdada. Busca insensível a acentos. Vazio: "Digite um termo…"; sem resultados: "Nada encontrado para “x”. Tente um termo mais curto ou abra o conceito #…".
- **Tag:** "Conceito" (13 soft), "#projecao-vetorial" 28/500, "Citado em 3 notas e 5 cards"; seções Notas e Cards (face Serif 17 + badge de estado + link para a nota de origem).

## Interações & movimento
- Movimento só em resposta a ação (virar card, expandir módulo, confirmar gravação). O protótipo usa trocas instantâneas; se animar, ≤150ms de opacidade e respeitar `prefers-reduced-motion`. Sem transições em hover (hover de link = sublinhado).
- Tema: alternável no rail; persistir preferência.

## Estado (sugestão)
- Revisão: card atual, `revealed`, pilha de desfazer (última avaliação), contagem restante; endpoint de avaliação recebe rating 1–4 e permite desfazer.
- Editor: conteúdo, status de autosave (`saving` | `savedAt`), erros de parse de card com número de linha.
- Cards: estado (new/learning/review/suspended/archived) com toggle suspender/retomar.
- Curso: CRUD/reordenação/arquivamento de módulos e aulas; `studied` por aula.
- Limites diários (novos, revisões) persistidos.
Interface 100% em português; nomes de domínio em inglês só no código.

## Matemática
O protótipo usa **KaTeX 0.16** (`tex.js` define um `<k-tex tex="…" display>`). Em Next.js use `katex` (ou rehype-katex no pipeline Markdown). Fontes KaTeX são a única família fora do Plex.

## Assets
Nenhuma imagem ou ícone. Fontes: Google Fonts (IBM Plex Sans/Serif/Mono) e KaTeX via CDN.

## Files
- `Estudos.dc.html` — todas as telas, lógica de protótipo e dados de exemplo (conteúdo realista da nota de projeção vetorial, cards, cursos).
- `NoteCard.dc.html` — card da margem.
- `tex.js` — renderização de LaTeX com KaTeX.
- `support.js` — runtime do protótipo (só para abrir os HTML; não portar).
