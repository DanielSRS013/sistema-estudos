# PLAN.md — ordem de execução

Cada fatia termina num estado utilizável e commitável. Não comece a seguinte
sem aceite da anterior. Critério de pronto é literal: se um item não foi
verificado rodando, a fatia não está pronta.

As fatias 0 a 5 formam a v1 e estão entregues. As fatias 6 a 11 fecham dívida:
cada uma cumpre algo que o `SPEC.md` promete ou dá caminho a uma coluna do
schema que nenhuma interface alcança. Nenhuma delas é feature nova — o que é
feature nova está no Backlog.

As fatias 12 a 22 realinham o front end ao `design_handoff_estudos/`, uma
referência de design de alta fidelidade das nove telas, feita em HTML e
versionada ao lado do código. Ela não contraria a §6 do SPEC — ela a precisa:
raio, larguras de rail, breakpoints, paddings por faixa, tons exatos do escuro,
um idioma de foco, medidas de cada tela. Onde o handoff dá número e a §6 cala, o
handoff manda, e a §6 é atualizada no mesmo commit que aplica o valor. Estas
fatias absorvem a varredura de front end de 20/10/2026 (as antigas 12 a 17):
nenhum apontamento dela se perdeu, cada um reaparece na fatia que reconstrói
aquela camada ou tela. Também não são feature nova.

A fatia 12 está entregue, e as fatias 13 a 22 foram reconferidas contra o código
em 21/10/2026, depois dela: apontamento já cumprido saiu, linha deslocada foi
corrigida, e a dívida que a própria fatia 12 deixou atrás de si entrou na fatia
que já abre aquele arquivo. Se um número não bater mais, confira antes de
executar.

O pacote de design ganhou um fork `Estudos v2.dc.html` — direção mais acolhedora,
gráficos, sessões de estudo, planejamento semanal, progresso por matéria. O
próprio README do handoff diz que essa direção visual **não está definida** e que
a v1 segue sendo a referência final: nenhuma fatia abaixo olha para a v2, e o que
ela mostra de novo é feature nova, não dívida.

---

## Fatia 0 — Fundação

Preparar o terreno antes de qualquer feature.

- `create-next-app` com TypeScript, Tailwind, App Router, ESLint, pnpm.
- `tsconfig.json` em strict, com `noUncheckedIndexedAccess: true`.
- Drizzle + drizzle-kit configurados contra o Neon; `src/db/schema.ts` com o
  conteúdo de `schema.ts` desta entrega; primeira migration gerada e aplicada.
- shadcn/ui inicializado. Tokens de cor e tipografia de `SPEC.md` §6 escritos
  em `globals.css` como CSS custom properties e espelhados no Tailwind.
- IBM Plex Sans / Serif / Mono via `next/font`, com `font-display: swap`.
- Vitest configurado.
- Script `pnpm check` = `tsc --noEmit && eslint . && vitest run`.
- `.env.example` com `DATABASE_URL`. O `.env` real nunca commitado.

**Pronto quando:** `pnpm check` passa num projeto vazio, `pnpm db:migrate`
aplica sem erro, e a home renderiza um "olá" nas fontes e cores corretas.

---

## Fatia 1 — Casca navegável

CRUD de Curso, Módulo e Aula. Sem notas ainda.

- Rotas `/courses`, `/courses/[courseSlug]`, `/lessons/[lessonId]`.
- Criar, renomear, reordenar e arquivar em cada nível.
- Rail de navegação à esquerda, colapsável, com o estado de expansão
  persistido em `localStorage`.
- Server Actions com validação `drizzle-zod` na entrada.
- Seed opcional com a estrutura real dos três cursos do Coursera.

**Pronto quando:** dá para criar um curso, dois módulos e três aulas pela
interface, navegar entre eles pelo rail, recarregar a página e ver tudo
intacto. Responsivo a 375px.

---

## Fatia 2 — Notas

O editor. Nenhum card ainda — só texto.

- `/notes/[noteId]` para leitura, `/notes/[noteId]/edit` para escrita.
- Editor: textarea com Markdown à esquerda, preview renderizado à direita.
  Empilha em coluna única abaixo de 900px.
- Render: react-markdown + remark-gfm + remark-math + rehype-katex. CSS do
  KaTeX importado uma vez no layout, não por componente.
- Autosave com debounce de 1,5s, com indicador de estado discreto
  ("Salvando…" / "Salvo 18:42"). `updatedAt` atualizado no servidor.
- Criar nota a partir de uma aula; mover nota entre aulas.

**Pronto quando:** uma nota com cabeçalhos, lista, bloco de código Python e
LaTeX inline e em display renderiza corretamente nos dois temas, e o autosave
sobrevive a um refresh no meio da digitação.

---

## Fatia 3 — Parser e reconciliação

A fatia mais delicada. Lógica pura primeiro, integração depois.

- `parser.ts` implementando `SPEC.md` §3.1–§3.3.
- `reconcile.ts` implementando `SPEC.md` §3.4.
- **Testes obrigatórios, escritos antes da integração:**
  - cloze simples; múltiplas lacunas na mesma linha; lacuna com dica
  - LaTeX dentro da lacuna preservado literalmente
  - `Q::`/`A::` com resposta de várias linhas
  - bloco de código cercado contendo `{{...}}` e `Q::` → nenhum card
  - `\{{` escapado → nenhum card, chaves literais no texto
  - `{{}}` vazio → erro de validação, não silêncio
  - **reconciliação: editar o texto de um card preserva `reps` e `due`**
  - **reconciliação: apagar o trecho arquiva o card, não o deleta**
  - **reconciliação: restaurar o trecho reativa o card com histórico intacto**
  - reordenar lacunas dentro da nota não embaralha os estados
- Integração: parse + reconcile rodam numa transação no save da nota.
- Margem direita da nota mostra os cards gerados, com badge de estado.

**Pronto quando:** todos os testes acima passam, e um teste manual confirma
que editar uma nota com cards já revisados não zera nenhum contador. Esta
fatia não é aceita só com `pnpm check` verde — exige a verificação manual.

---

## Fatia 4 — Revisão

O produto fica útil aqui.

- `scheduler.ts` como invólucro fino sobre `ts-fsrs`, com teste cobrindo as
  quatro avaliações e a construção da fila com limites.
- Dia lógico em `America/Sao_Paulo` com corte às 04:00.
- `/review` em modo foco: sem rail, sem margem, card centrado, pergunta em
  28px, quatro botões nas paradas do viridis.
- Teclado: `espaço` revela, `1`–`4` avalia, `u` desfaz a última avaliação,
  `esc` sai. Atalhos visíveis sob cada botão.
- Cada avaliação: `UPDATE cards` + `INSERT reviews` na mesma transação.
- Desfazer: reverte o card ao estado anterior lido de `reviews` e grava a
  reversão como novo evento. **Não apaga a linha original.**
- Painel em `/`: quantos vencem hoje, sequência de dias estudados, cards novos
  disponíveis.
- Tela vazia com texto útil: "Nada vence hoje. Próxima revisão em X dias."

**Pronto quando:** dá para revisar uma fila inteira pelo teclado sem tocar no
mouse, o desfazer funciona, e reabrir o app no dia seguinte mostra a fila certa.

---

## Fatia 5 — Tags, busca e fechamento

- Tags inline na nota (`#projecao-vetorial`), extraídas no save.
- `/tags/[tagSlug]` listando notas e cards do conceito.
- `/search` com `to_tsvector('portuguese')`, coluna gerada e índice GIN,
  trechos com o termo destacado.
- Auth.js com provider único.
- Deploy na Vercel com `DATABASE_URL` do Neon.
- README com setup local em menos de dez linhas.

**Pronto quando:** o app está no ar, protegido por login, e a busca por
"projeção" encontra a nota certa.

---

## Fatia 6 — Painel completo e alcançável

SPEC §5 define `/` como "painel: fila de hoje, últimas notas, atalho de
captura". A Fatia 4 entregou a fila e os números; as outras duas partes não
existem. E de dentro de uma nota não há caminho de volta — o rail só oferece
"cursos" e "busca".

- `listRecentNotes(limite)` em `src/features/notes/queries.ts`, ordenando por
  `notes.updatedAt` e trazendo o caminho curso · aula de cada nota. Não existe
  hoje nenhuma leitura de notas por recência.
- Lista das últimas notas no painel, com link para `/notes/[id]`.
- Atalho de captura: cria a nota e leva direto ao editor, reusando `createNote`
  e `listLessonOptions`. Hoje a nota só nasce dentro de `/lessons/[lessonId]`.
- Rail ganha "painel" e "revisão" ao lado de "cursos" e "busca".

**Pronto quando:** do painel dá para criar uma nota e começar a escrever sem
passar pela árvore de cursos, as últimas notas editadas aparecem com o caminho
delas, e de qualquer nota dá para voltar ao painel e entrar na revisão pelo
rail.

---

## Fatia 7 — Alternância de tema

`globals.css` tem o bloco `.dark` e a guarda `:root:not(.light)`, e nenhum
código do app escreve essas classes — só o `prefers-color-scheme` atua. O
critério de pronto da Fatia 2 ("renderiza corretamente nos dois temas") não é
verificável sem trocar o tema do sistema operacional.

- Controle claro / escuro / sistema, persistido em `localStorage`, aplicando
  `.light` ou `.dark` no `<html>`.
- Script inline no `layout.tsx` antes da pintura, para a página não piscar no
  tema errado na primeira carga.
- Mora no rail, junto do botão de sair. O `/review` não ganha controle nenhum —
  o modo foco continua sem interface.
- `globals.test.ts` já trava as paradas do viridis contra redefinição no
  escuro; a alternância não pode afrouxar isso.

**Pronto quando:** o tema troca pelo controle sem recarregar, sobrevive a um
refresh sem piscar, e os quatro botões de avaliação ficam idênticos nos dois
temas.

---

## Fatia 8 — Limites diários configuráveis

SPEC §4 diz "limites configuráveis, padrão 20 novos e 200 revisões por dia".
Hoje `DEFAULT_LIMITS` é constante em `scheduler.ts` e chega por parâmetro
default a `fetchQueue` e `fetchPanel`, sem nenhum caminho que a mude.

- Migration nova: tabela `settings` de uma linha só (chave fixa, `new_per_day`,
  `reviews_per_day`), com os padrões 20/200. Regras 1 e 2 valem — branch do
  Neon antes da `main`, nada de `push`.
- Leitura dos limites numa query da feature `review`, passada aos pontos que já
  aceitam `Limits`. `scheduler.ts` continua puro, sem acesso a banco.
- Server Action com validação Zod para gravar, e um lugar discreto na interface
  para editar os dois números.
- `DEFAULT_LIMITS` permanece como fallback quando a linha não existe.

**Pronto quando:** baixar o limite de novos para 5 e recarregar o `/review`
oferece no máximo 5 cards novos, o painel reflete o mesmo corte, e o valor
sobrevive a um deploy.

---

## Fatia 9 — Suspender e retomar card

`cards.suspended` existe no schema, o índice da fila a respeita, as consultas
filtram por ela e `rateCard` chega a devolver "Card suspenso." — mas nenhuma
interface consegue suspender nada. O caminho de erro é inalcançável.

- Server Action `setCardSuspended` em `src/features/cards/`, com validação Zod,
  na forma de `setCourseArchived`.
- Controle na margem da nota, por card, com o estado visível no `CardItem` que
  já serve à margem e à página do conceito.
- Suspender nunca escreve em `reviews` nem toca no estado do FSRS: o card sai
  da fila e volta com o histórico intacto.

**Pronto quando:** suspender um card o tira da fila do dia sem alterar `reps`
nem `due`, retomar o devolve, e `rateCard` num card suspenso continua recusando
com mensagem legível.

---

## Fatia 10 — Campos órfãos do schema

Quatro colunas são gravadas ou previstas e nenhuma interface as mostra. Remover
coluna é destrutivo e cai na regra 3, então o padrão aqui é mostrar.

- `reviews.durationMs` — gravado em toda avaliação desde a Fatia 4, nunca lido.
  Já existe histórico acumulado. Mostrar o tempo mediano por card no painel.
- `lessons.studiedOn` — nunca lido nem escrito. Marcar a aula como estudada em
  `/lessons/[lessonId]`, e exibir a data no cabeçalho da aula.
- `courses.track` e `courses.provider` — gravados na criação, invisíveis.
  Mostrar no cabeçalho de `/courses/[courseSlug]` e agrupar `/courses` por
  `track`, que é o que a coluna existe para fazer (especialização → curso,
  SPEC §2).

**Pronto quando:** nenhuma coluna do schema fica sem caminho de leitura na
interface, e o tempo mediano do painel bate com o que está em `reviews`.

---

## Fatia 11 — Margem de cards fiel ao SPEC

SPEC §6 diz "margem direita mostra os cards gerados pelo trecho visível; some
abaixo de 1100px". Hoje `CardMargin` lista todos os cards da nota, e abaixo de
1100px a margem desaparece sem deixar nenhum outro acesso aos cards.

- Margem segue o trecho visível, destacando os cards do que está sob a
  viewport. `cards.ordinal` já guarda a posição dentro da nota e o parser já
  conhece a linha de origem — é daí que sai o vínculo.
- Abaixo de 1100px, acesso aos mesmos cards por uma seção recolhida ao fim da
  nota: a margem some, os cards não.
- Fica por último de propósito: é a única fatia que exige descobrir como ligar
  trecho de texto a card renderizado, e as anteriores entregam valor sem
  depender dela.

**Pronto quando:** rolar uma nota longa muda o destaque na margem, e a 375px os
cards da nota continuam alcançáveis.

---

## Fatia 12 — Tokens exatos e escala sem buraco

Base de tudo. Três tons do escuro estão errados, o raio é três vezes o do
handoff, a escala tipográfica tem um degrau fantasma e há tokens que convidam ao
erro.

- Corrigir os três tons do escuro nos **dois** blocos (`.dark` e
  `@media (prefers-color-scheme: dark)`, duplicados em `globals.css:73-75` e
  `:87-89`): `--ink-soft` `#93a3b1 → #93a3b2`, `--rule` `#263038 → #2a353f`,
  `--accent` `#6fa8ce → #6fa4cc`.
- `--radius: 0.375rem → 0.125rem` (`globals.css:33`) e colapsar
  `--radius-sm/md/lg/xl/2xl` (`:164-168`) em 2px — o handoff tem **um** raio. As
  ~36 ocorrências de `rounded-sm|md|lg` passam a desenhar 2px sem serem tocadas.
- Fechar a escala: definir `--text-xl`, hoje ausente — `text-xl` cai no default
  do Tailwind (20px), tamanho fora da escala disponível por acidente — e alinhar
  os nomes ao handoff (`xs 13 / sm 15 / base 17 / lg 21 / xl 28 / 2xl 38`),
  ajustando os consumidores dos nomes deslocados.
- `overflow-wrap: anywhere` na raiz, ausente de `globals.css` e `layout.tsx`.
- Remover `--chart-1…5` (`globals.css:53-57`), inclusive o `#1f9e89` cru que não
  existe na §6: aliasar as paradas do viridis como paleta decorativa contradiz o
  comentário duas linhas acima, e nenhum gráfico existe no app.
- `--destructive` (`:49`, `:80`, `:94`): o handoff diz que não existe token de
  cor de erro. Remover e deixar o erro falar por marcação — borda 2px `--ink`,
  `role="alert"`, texto —, como o handoff desenha o alerta do editor.
- Tipografia de nota em `globals.css`: `.note-prose pre` 13px/1,55 → **Mono
  15/1,6** (`:304`); `.note-prose h1` Sans 28/600 → **Serif 38/500** e `h2` →
  **Serif 21/600** (`:218-230`).
- `globals.test.ts` trava o que hoje passa livre: os três tons do escuro, o valor
  do raio, os seis degraus da escala e a ausência de tamanho fora deles, ausência
  de `--chart-*`, `overflow-wrap` na raiz.
- Mesmo commit: §6 do SPEC e `skills/ui-review/ui-review-SKILL.md` recebem raio,
  tons exatos do escuro e os nomes da escala. Três cópias dos tokens, uma
  verdade.

**Pronto quando:** `pnpm check` passa com a saída colada, o teste novo falha se
qualquer um dos valores voltar ao anterior, e nenhum `rounded-*` do app desenha
mais de 2px — conferido no navegador com o dev server reiniciado.

---

## Fatia 13 — Um idioma de foco e nenhum valor arbitrário

O handoff fixa **um** foco global:
`:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`.
Hoje há dois idiomas e o majoritário é fraco: `focus-visible:ring-3
ring-accent/30` em 24 linhas de 14 arquivos, 80 utilitários somados — a 30% de
alpha fica perto de 1,3:1. O outro, `outline-2 outline-offset-2 outline-accent`,
aparece em três linhas (`app/page.tsx:62`, `session.tsx:262`, `:290`).
`globals.css:177` ainda aplica `outline-ring/50`.

- Regra global de foco em `globals.css`; as strings `focus-visible:` saem dos
  componentes. Três das 24 linhas já são constante de módulo (`rail.tsx:29-30`,
  `limits-form.tsx:15-16`, `note-forms.tsx:18-19`), então são oito receitas a
  apagar, não 24.
- Tirar o movimento que o handoff não tem: `transition-all` e
  `active:not-aria-[haspopup]:translate-y-px` em `shared/ui/button.tsx:6`, e o
  import de `tw-animate-css` em `globals.css:2` — zero classes `animate-*` em
  `src`. `button.tsx` é saída do registry do shadcn: anotar no commit que ali é
  território de terceiro.
- **Dívida que a Fatia 12 deixou, no mesmo arquivo.** `button.tsx:6` e `:17-18`
  ainda consomem `destructive` (`aria-invalid:border-destructive`,
  `ring-destructive/20`, `bg-destructive/10`, `text-destructive` e quatro
  variantes `dark:`), e `--destructive` foi removido — `globals.test.ts:74-75`
  trava a ausência. Não quebra build nem lint (utilitário desconhecido no
  Tailwind v4 é descartado em silêncio fora de `@apply`, a variante nunca é
  usada, nada seta `aria-invalid`), mas é CSS morto apontando para token que não
  existe. Remover a variante `destructive` e as cadeias `aria-invalid:` de cor. O
  erro fala por marcação — borda 2px `--ink`, `role="alert"`, texto —, como o
  handoff desenha o alerta do editor.
- Trocar pelos utilitários da escala os pixels escritos à mão. Desde a Fatia 12
  os seis degraus têm nome, então é substituição mecânica: `app/page.tsx:25`
  (38), `:68`, `:108` (17), `note-forms.tsx:82` (17), `limits-form.tsx:105` (15),
  `session.tsx:66,239` (28), `:246` (21), `:255`, `:69` (17).
- Dois mudam de valor, não de notação: `button.tsx:25` `text-[0.8rem]` (12,8px,
  o único tamanho realmente fora da escala) e `session.tsx:239` `leading-[1.35]`
  — a face do card é 28/1,45 no handoff e na §6.
- `leading-[1.65]` está em doze arquivos (`app/page.tsx:68,108`,
  `entrar/page.tsx:74`, `search/page.tsx:61,87,115`,
  `lessons/[lessonId]/page.tsx:113`, `notes/[noteId]/page.tsx:93`,
  `tags/[tagSlug]/page.tsx:35`, `note-forms.tsx:82`, `limits-form.tsx:105`,
  `session.tsx:69`) e onze delas são o mesmo parágrafo serif em `--ink-soft`:
  vira um utilitário em `globals.css`, ao lado de `measure` (`:171-173`). O nome
  não pode começar por `--text-`: `globals.test.ts:123-128` fecha esse conjunto
  nos seis degraus.
- `globals.test.ts` ganha a regra de foco e uma varredura de `src/app` e
  `src/features` que reprova `text-[`, `leading-[` e hex cru em `className`.
  `src/shared/ui` fica de fora: é saída do registry. A varredura **não** proíbe
  valor arbitrário em geral — as Fatias 19 e 22 precisam de medidas do handoff
  fora da escala do Tailwind (248, 680, 760, 880px), e o lugar delas é
  `globals.css`. Hoje não há nenhum hex cru em `className` nem nenhum
  `p-[`/`m-[`/`gap-[`/`w-[`/`h-[` em `src/app` e `src/features`: essa parte da
  trava é preventiva.
- Ficam para depois, de propósito, as três únicas dimensões arbitrárias:
  `max-w-[46rem]` (`session.tsx:219`) é a coluna de revisão, que a Fatia 15 leva
  a 720px, e `min-h-[24rem]` (`editor.tsx:181,206`) é o textarea, que a Fatia 17
  leva a 720/420px. Consertar aqui seria consertar duas vezes.

**Pronto quando:** `focus-visible:` só aparece no utilitário global, a varredura
por `text-[`, `leading-[` e hex em `className` não devolve nada, `destructive`
não aparece mais em `src/shared/ui/button.tsx`, percorrer as nove rotas só de
`Tab` mostra o mesmo anel sólido em todo controle, e o contraste do anel contra
`--paper` nos dois temas está calculado e anotado no commit (≥3:1).

---

## Fatia 14 — A casca do handoff

A maior fatia de base: a casca tem **um** degrau (`md:`, 768px) onde o handoff
tem três, e o rail é outro desenho.

- Breakpoints: `shell.tsx:21,26,34` e `rail.tsx:122,141` trocam `md:` pelos
  900px do handoff — entre 768 e 900 há hoje rail de 256px ao lado da coluna,
  faixa que a §6 não pede. O `sm:px-8` de `shell.tsx:34` é padding, não layout.
- **Decisão antes de executar:** os 900px já existem como `--breakpoint-editor`
  (`globals.css:115`), travado por `globals.test.ts:175`, e **com três
  consumidores** — `editor.tsx:157,181,206`. O nome está certo para o editor e
  errado para a casca, que passa a usar o mesmo número. Renomear para um nome
  neutro de faixa (`--breakpoint-rail` diz o que 900px significa no handoff: rail
  ao lado) custa quatro edições, uma delas em teste: a justificativa vai escrita
  no commit, antes da alteração (regra 5).
- Três degraus de padding de conteúdo, hoje todos errados em `shell.tsx:34`
  (`px-4 py-6 sm:px-8`): 40/56/80 em ≥1100, 32/32/64 em 900–1099, 20/16/56
  abaixo de 900.
- Rail: largura 240px em ≥1100 e 200px em 900–1099, em lugar de `md:w-64`, que
  está literal em dois lugares sem constante compartilhada (`rail.tsx:141` e o
  fallback do Suspense em `shell.tsx:26`); recolhido 48px já confere
  (`rail.tsx:122`), mas o padding vai a 20px 8px; expandido 24px 20px, coluna com
  gap 28px.
- Glifos de texto no lugar dos ícones lucide, que o handoff proíbe:
  `PanelLeftOpen` → **»** com `aria-label="Expandir menu"` em botão 32×32 e
  borda 1px `--rule` (`rail.tsx:132`); `PanelLeftClose` → link de texto
  **Recolher** 13px soft (`:169`); `ChevronDown`/`ChevronRight` → **▾**/**▸**
  (`:201,203,245,247`). Some o import de `lucide-react` (`:3-8`).
- Marca **Estudos** (Sans 15/600) no topo do rail — não existe em lugar nenhum;
  "Estudos" só aparece no metadata (`layout.tsx:35`).
- Nav: rótulos capitalizados **Painel · Cursos · Revisão · Busca** nessa ordem
  (hoje minúsculos e em outra ordem, `rail.tsx:22-27`), Sans 15px em vez de
  `font-mono text-xs` (`:29-30` — o tamanho já é 13px desde a Fatia 12, o que
  muda é família e peso), ativo em `--accent` peso 500 — hoje só muda de cor
  (`:153`). O `aria-current="page"` já está certo (`:152,208,270-272`).
  **De brinde:** o teste de ativo é igualdade exata (`:146`), então
  `/courses/<slug>` não acende "Cursos". Decidir no commit se a árvore do curso
  compensa ou se o teste passa a ser por prefixo.
- Contagem de revisão (13px soft) ao lado de "Revisão": não há caminho hoje,
  `fetchRail()` (`courses/queries.ts:15-43`) só traz a árvore. Reusar a contagem
  que o painel já lê em `features/review/queries.ts` (`fetchPanel`, `:293-328`,
  com `countToday` em `:275-291`), sem consulta nova.
- Árvore do curso: hoje lista **todos** os cursos em **todas** as rotas, a 15px
  herdados do `<nav>` (`rail.tsx:141,173-297`) → 13px, só nas telas de curso,
  nota, aula e editor, e só do curso atual.
- Rodapé: `margin-top:auto`, sem filete (hoje `mt-3 border-t pt-2`,
  `rail.tsx:299`), itens empilhados (hoje lado a lado,
  `course-rail.tsx:16-19`). O tema vira **um** botão "Tema escuro"/"Tema claro"
  13px soft em lugar dos três botões mono minúsculos (`theme-toggle.tsx:90-115`):
  a opção "sistema" sai da interface e continua sendo o estado inicial. "Sair"
  capitalizado, Sans 13 soft (`sign-out.tsx:6-13`, cuja classe duplica
  `CLASSE_ATALHO` sem compartilhar a constante).
- Abaixo de 900px: marca, tema e sair na primeira linha, nav em linha que quebra
  abaixo (hoje a ordem é inversa e sem marca), `min-height: 44px` em todo item,
  hoje ausente. E corrigir o vazamento do estado recolhido: o `localStorage` é
  global (chaves em `rail.tsx:32-33`, leitura em `:85-91`, escrita em `:93-102`),
  então no telefone a barra fica reduzida a um botão de ícone — abaixo de 900px é
  **sempre** a barra no topo.
- Regra nova: no editor, entre 900 e 1099px, o rail inicia recolhido, com a
  preferência do usuário prevalecendo. Hoje o default é fixo `false` (`:79`,
  `:88`) e nada no arquivo lê rota nem viewport.
- `shell.tsx`, `rail.tsx` e `course-rail.tsx` não têm teste nenhum. A fatia deixa
  pelo menos a trava das larguras e dos três degraus de padding em
  `globals.test.ts`, no estilo das travas que já existem.

**Pronto quando:** a 899px o rail está acima da coluna e a 901px ao lado, nas
duas direções do resize; nenhum `md:` resta decidindo layout; nenhum ícone lucide
resta no rail; a 375px todo item do rail tem 44px de alvo; a árvore mostra só o
curso atual e só nas telas que o handoff lista; e a contagem de revisão bate com
a do painel.

---

## Fatia 15 — `/review` como o handoff desenha

A tela mais ousada do app, e a que mais se afastou.

- **O rótulo errado no botão mais importante:** `session.tsx:26` diz "Errei" →
  **De novo** (os quatro em `:18-38`).
- Topo: hoje "N na fila · X avaliados" e link "esc sai" (`session.tsx:220-230`) →
  caminho do card à esquerda ("Álgebra linear · Projeções") e **Restam N** à
  direita. O caminho não é renderizável hoje: `QueueCard`
  (`review/queries.ts:80-87`) traz `noteTitle` e não traz curso · aula, e o join
  falta em três lugares — `candidatos()` (`:96-130`, join na `:118`),
  `fetchAheadQueue()` (`:187-228`, `:211`) e `fetchUndoTarget()` (`:342-413`,
  `:381-382`). A forma do join já existe em `listRecentNotes`
  (`notes/queries.ts:56-59`): copiar de lá.
- Botão de pergunta (`session.tsx:259-268`): largura total, `min-height:72px`,
  fundo `--ink`, texto `--paper`, sem borda; **Mostrar resposta** (17/500) — hoje
  diz "Revelar resposta" — com "espaço" 13px **abaixo**, não ao lado.
- Botões de avaliação (`:283-297`): quatro colunas iguais sempre, gap 8px,
  `min-height:72px` — hoje `grid-cols-2 sm:grid-cols-4` sem altura mínima.
- **Dois comportamentos de resposta, hoje um só.** `atual.kind` nunca é lido no
  arquivo: `:242-251` sempre desenha filete e bloco abaixo. Cloze revelado é
  resposta in-loco, fundo `--rule`, padding 2px 6px; só pergunta/resposta usa
  filete 1px com padding-top 24px. Serif 28/1,45 nos dois — hoje 21/1,5 na
  resposta (`:246`) e 1,35 na pergunta (`:239`).
- Cloze oculto: `cards/parser.ts:31` define `[…]` e `:169` o injeta como **texto
  puro dentro do Markdown**, sem elemento nem classe que o CSS alcance; e
  `.card-face` (`globals.css:364-394`) não tem regra para ele. A borda inferior
  2px `--ink` com padding 0 8px exige envolver a marca na saída do parser — é o
  item mais estrutural da fatia, e mexe em módulo com teste obrigatório.
- Rodapé: hoje um **botão** "u desfaz a última avaliação" à esquerda, mais
  "gravando…" sem `aria-live` (`:301-311`) → texto 13px soft centralizado em
  `role="status"`: "esc sai" no estado pergunta, "u desfaz · esc sai" no estado
  resposta.
- **"Avaliação desfeita" não existe no código** (zero ocorrências em `src`).
  Depois de `u`, o aviso aparece por 2,5s no mesmo `role=status`.
- `desfazer()` (`:156-179`) faz `setRevelado(false)` (`:176`); o handoff exige
  voltar ao **estado resposta** do card anterior.
- O listener global (`:181-214`) nunca olha `evento.target`, então não ignora
  teclas quando o foco está em input ou textarea — exigência explícita do
  handoff. Hoje é latente: não há campo em `/review`.
- Sai o que o handoff não tem: `noteTitle` em Mono sob a resposta (`:248`), a
  dica acima do botão (`:253-258`) e as variantes de fila vazia "Nada para
  adiantar.", "Nenhum card espera revisão.", "A próxima revisão é ainda hoje."
  (`:49-55,67`) — o handoff fixa "Nada vence hoje." e "Próxima revisão em 2
  dias.". A fila vazia ganha o rodapé "esc volta ao painel"; hoje sobra o rodapé
  do desfazer.
- Medidas: coluna interna 720px, padding 28px 56px 40px, 16px em móvel, `main` na
  largura toda. Hoje são **duas** medidas erradas no mesmo arquivo —
  `max-w-[46rem]` (736px) no `main` (`:219`) e `measure` (68ch) no vazio
  (`:65`) —, e o fallback de Suspense da rota (`app/review/page.tsx:45-50`) não
  tem largura nenhuma, então a troca pisca. Os três vão aos 720px.

**Pronto quando:** revisar uma fila inteira só pelo teclado continua funcionando;
`u` volta ao card anterior com a resposta visível e mostra "Avaliação desfeita"
por 2,5s; digitar num input não dispara atalho; um cloze revela in-loco e um
pergunta/resposta revela abaixo do filete; e as quatro paradas do viridis seguem
idênticas nos dois temas, sem afrouxar a trava de `globals.test.ts`.

---

## Fatia 16 — Painel com as duas caixas

- Container único: max-width 880px, grid, gap 40px. Hoje `app/page.tsx:138` não
  tem largura máxima e cada seção usa `measure`, 68ch.
- Cabeçalho: **Hoje** 28/500 e a data em 15px soft à direita, na mesma linha. A
  data não existe no código; saem a sobrancelha "painel" em Mono (`:140`) e o
  `h1 text-2xl font-semibold` (`:141`) — que depois da renomeação da escala é
  **38px**, o mesmo tamanho dos números grandes, de modo que hoje cabeçalho e
  número competem.
- **As duas caixas não existem** — hoje é uma grade de cinco números soltos
  (`:47-56`, com `Numero` em `:16-31`). Duas `section` com borda 1px `--rule`,
  padding 24, `grid auto-fit minmax(300px)`, gap 24, `aria-labelledby`, H2
  15/500 soft:
  - **Fila de hoje** — "34 revisões vencem" e "12 cards novos", números 38px com
    `font-variant-numeric: tabular-nums`, que falta (`:25`), rótulos Sans 15px
    soft em lugar de `font-mono text-xs` (`:28`), e a CTA **Começar revisão** com
    fundo `--ink` — hoje "Revisar N cards" em `bg-accent` (`:60-66`), link feito
    à mão que não passa por `buttonVariants`, diferente de todo botão do app; e o
    accent é reservado a links, foco e item ativo.
  - **Captura** — "Nota nova na aula _Projeções_, aberta direto no editor."
    (17/1,5, aula como link) e botão secundário **Nova nota**, borda 1px `--ink`,
    min-height 44px, que cria na última aula aberta. Hoje é um formulário com
    input de título, `select` de aula e botão "Criar e escrever" com ícone `Plus`
    (`notes/components/note-forms.tsx:71-125`); ícones são proibidos. O irmão
    `CreateNoteForm` (`:32-64`) serve à tela da aula e é a Fatia 20 que o mexe.
- Métricas: `<dl>` separado, filete superior 1px `--ink`, `dt` 13 soft e `dd`
  21px, com os rótulos exatos "Sequência" → "9 dias seguidos" e "Tempo mediano
  por card" → "11 s". Hoje `streak`, avaliados hoje e mediana moram na mesma
  grade de 38px (`:50-55`); "avaliados hoje" não existe no handoff e sai. Os
  dados já estão em `review/queries.ts` (`medianDuration` `:258-273`,
  `countToday` `:275-291`).
- "Últimas notas" → **Últimas notas editadas** (`:157-162`). Cada linha com
  filete, padding 12px 0 e `justify-between`: título 17/500, caminho Sans 13 soft
  **sob** o título, tempo à direita. Hoje tudo em uma linha, título 15px, caminho
  e tempo em `font-mono text-xs` (`Recentes`, `:103-134`).
- `notes/recent.ts:50-60` devolve "hoje 18:42", "ontem 23:47", "14/10"; o handoff
  usa tempo relativo ("há 2 h", "ontem"). Não existe nenhum
  `Intl.RelativeTimeFormat` no repositório: é lógica pura nova, com teste em
  `recent.test.ts` no mesmo commit.
- Limites diários: hoje um `<details>` no fluxo (`page.tsx:97-101,164-168`,
  `review/components/limits-form.tsx:42-50`) → canto inferior direito, sempre
  visível, `role="group" aria-label="Limites diários"`, 13px soft; rótulos
  **Novos** e **Revisões** inline, hoje em Mono (`:55-57,70-72`); inputs 72px por
  32px, hoje `w-20` sem altura (`:15-16`); **salva ao alterar**, sem botão — hoje
  há "Salvar limites" com ícone `Check` (`:84-91`) —; confirmação **Salvo** num
  `<span role=status>` permanente. O texto atual, "Limites salvos." (`:99-103`),
  já nunca se apaga por causa do latch da `:31-39`, mas só aparece depois de um
  envio. Saem o parágrafo explicativo (`:105-108`), o link "Cursos e aulas"
  (`page.tsx:81-83`), porque navegação mora no rail, e o texto de fila vazia no
  painel (`:68-78`), que pertence a `/review`.

**Pronto quando:** o painel inteiro cabe nas duas caixas, nas métricas, na lista
e no canto dos limites; a 375px nada transborda; "Nova nota" leva direto ao
editor na última aula aberta; baixar um limite salva sozinho e mostra "Salvo"; e
o tempo mediano bate com o que está em `reviews`.

---

## Fatia 17 — Editor fiel, com o alerta certo

- **Um container com borda, não duas caixas.** `notes/components/editor.tsx:157`
  usa `grid gap-4 editor:grid-cols-2` e as bordas estão nos elementos internos —
  textarea (`:181`) e caixa do preview (`:206`) —, não no container. Vira
  container único com borda 1px `--rule`, duas colunas iguais sem gap, divisória
  vertical (`border-right` no painel esquerdo) em ≥900px e horizontal abaixo
  disso.
- Cabeçalhos dos painéis **dentro** deles: "Markdown" e "Pré-visualização", 13px
  soft, padding 8px 16px, `border-bottom`. Hoje minúsculos, em Mono e fora do
  painel (`:159-164,203-205`).
- Textarea: sem borda, padding 16, min-height 720px (420 em móvel), Mono 15/1,65.
  Hoje borda, `rounded-md`, `px-3 py-2`, `min-h-[24rem]` com
  `editor:min-h-[60vh]` e `leading-relaxed` (`:181`). `spellCheck={false}`, hoje
  ligado (`:175`). Sai o `placeholder` longo com exemplo de LaTeX (`:178-180`).
- **O alerta de erro de sintaxe está no lugar e no texto errados** — mas não mais
  na cor errada: a Fatia 12 levou `--destructive` embora e hoje são linhas
  `role="alert" className="text-xs"` abaixo do textarea (`:183-199`), com o texto
  vindo de `cards/parser.ts:154`. O handoff pede bloco acima do editor, borda 2px
  `--ink`, padding 12px 16px, 15/1,5, título 600 "Card não criado: lacuna vazia
  na linha N" e corpo exato: "A marcação de lacuna vazia não tem resposta.
  Escreva a resposta entre as chaves, ou apague a marcação. O resto da nota está
  salvo." A contagem "N cards" (`:185-187`) sai.
- A mensagem muda em `parser.ts:154` (as outras três estão em `:144-145`, `:199`
  e `:214`). `parser.test.ts` não fixa a frase inteira: assere as substrings
  `"vazia"` (`:144`), `"fecha"` (`:164`) e `"resposta"` (`:95`). A redação nova
  preserva essas palavras, ou o teste muda no mesmo commit com a justificativa
  escrita antes (regra 5). Teste novo da mensagem, de todo modo.
- No preview, o trecho com lacuna vazia aparece marcado em Mono com borda 2px
  `--ink`; nada faz isso hoje (`:206-214`).
- Preview com max-width 680px, padding 20px 24px 32px, Serif 17/1,65 no
  container. E o render (`:212`) **não aplica `note-prose`**: "renderização
  idêntica à leitura" exige a classe, sem ela nenhuma medida bate. Saem o
  placeholder "O que você escrever à esquerda aparece aqui." (`:207-210`) e o
  contador de cards.
- Cabeçalho: breadcrumb Sans 13 soft com curso · aula, hoje Mono e incluindo
  módulo (`notes/[noteId]/edit/page.tsx:29-40`); título `h1` 21/500 estático,
  hoje input editável com `text-xl` (`editor.tsx:136-144`), que depois da
  renomeação é 28px; indicador em `role="status"`, hoje `aria-live="polite"`
  (`:145-154`), só com "Salvando…" e "Salvo 18:42" — saem "Não salvo" e o erro
  —; e link de texto **Ver nota** 13px ao lado dele, em lugar do botão "Ler" com
  ícone `BookOpen` (`edit/page.tsx:41-50`).
- **Conflito SPEC × handoff:** o debounce do autosave é 1,5s no SPEC e em
  `editor.tsx:19`, usado na `:97`, e ~900ms no handoff. O handoff ganha; o SPEC é
  corrigido no mesmo commit. O save imediato no blur (`:114-116`) e o Ctrl/Cmd+S
  (`:118-125`) ficam.
- O rail recolhido entre 900 e 1099px no editor fica na Fatia 14, onde a casca
  mora.

**Pronto quando:** o editor é um retângulo com divisória, o preview usa a mesma
tipografia da leitura, o alerta de lacuna vazia aparece acima com o texto exato e
o trecho marcado no preview, o autosave sobrevive a um refresh no meio da
digitação com a janela de 900ms, e nenhuma cor carrega informação de erro.

---

## Fatia 18 — Tipo da nota

Três telas do handoff mostram o tipo da nota e o schema não o tem. Vem antes das
telas que o exibem, para não refazê-las depois.

- `src/db/schema.ts`: enum `note_kind` (`lesson_note` | `summary` | `solution`)
  ao lado dos três que já existem (`:25-36`), e coluna `notes.kind` not null com
  default `lesson_note`, para as notas existentes nascerem classificadas sem
  backfill manual. A tabela `notes` está em `:102-125`.
- `pnpm db:generate`, revisar o SQL, commitar o arquivo de migration. É a
  `0004` — as existentes são `0000_rainy_paladin`, `0001_typical_tana_nile`,
  `0002_gifted_venom` e `0003_true_solo`. Regras 1 e 2: branch do Neon primeiro,
  conferir, só então a `main`. Nada de `push`.
- Rótulos em português num módulo puro da feature `notes` (Anotação de aula,
  Resumo, Resolução), com teste. Domínio em inglês no código, interface em
  português.
- `listNotesForLesson` (`notes/queries.ts:14-22`) devolve só `id` e `title`
  (tipo na `:11`, `columns` na `:20`): passa a trazer `kind`, `updatedAt` e a
  contagem de cards — é o que as linhas de `/lessons/[lessonId]` e o meta da
  leitura precisam.
- Seletor de tipo no editor, por Server Action com validação Zod.
- **Nenhuma coluna além dessa.** O handoff escreve "Suspenso desde 12 out." no
  card da margem e não existe `cards.suspendedAt` — `cards.suspended` é booleano
  (`schema.ts:161`) e a Fatia 9 fixou que suspender não grava nada. A data cai; o
  desvio está escrito na Fatia 19.

**Pronto quando:** a migration está aplicada no branch e na `main` com a saída
colada, toda nota existente tem `kind`, e trocar o tipo no editor sobrevive a um
refresh.

---

## Fatia 19 — Leitura da nota e o card da margem

A tela com mais estrutura nova.

- **Grade por bloco.** Hoje é `flex` com uma única `aside` contendo todos os
  cards (`notes/[noteId]/page.tsx:140,147`, margem em `w-64`). O handoff pede
  `grid-template-columns: minmax(0,68ch) 248px`, `column-gap:48px`,
  `align-items:start`, e **cada bloco da nota como linha da grade**, com os cards
  daquele bloco na segunda coluna da mesma linha (padding-top 28px, gap 12px). A
  base existe: `data-line` por bloco em `shared/markdown-lines.ts:24-34`, ligado
  em `shared/markdown.tsx:12,21-39`, e `cards.ordinal` com a linha de origem no
  parser. Com isso **sai** o `opacity-50` dos cards fora do trecho visível
  (`cards/components/card-list.tsx:92-93,101`, `card-item.tsx:49-52`): a Fatia 11
  resolveu o vínculo por opacidade, o handoff resolve por posição. Margem 248px,
  não 256px. `blocoDe` e `cardsNoTrecho` (`cards/lines.ts:55-88`) seguem
  servindo — é deles que sai a linha da grade —, mas `destaqueDoTrecho`
  (`:98-106`) e os testes dele perdem a razão de ser: a justificativa vai escrita
  no commit antes de apagar teste (regra 5).
- Cabeçalho com max 680px, hoje 68ch (`page.tsx:64`): breadcrumb Sans 13 soft com
  curso · aula, hoje Mono com três níveis e o módulo sem link (`:65-75`); título
  Serif 38/500, hoje `text-xl font-semibold`, que depois da renomeação já é 28px
  (`:79`); e a linha de meta que não existe — "Anotação de aula · Editada há
  2 h · 4 cards · Editar", com *Editar* como link de texto, hoje `Link` com ícone
  `Pencil` (`:82-88`). `getNoteById` já lê `updatedAt` (`notes/queries.ts:84`) e
  a página nunca usa. Depende dos dados da Fatia 18.
- **Cloze no corpo.** `shared/markdown.tsx` tem 45 linhas e nenhum tratamento de
  `{{…}}` nem de `Q::`/`A::`: a marcação sai como texto literal. O handoff pede
  sublinhado pontilhado 1px `--ink-soft` e número sobrescrito Sans 13 linkando
  `#cN`; o card recebe a âncora `id="cN"` (`card-item.tsx:48` é um `<li>` sem
  `id`).
- **Bloco Pergunta/Resposta** no corpo: não existe. Filetes superior e inferior
  1px `--rule`, padding 12px 0, grade `auto minmax(0,1fr)`, rótulos "Pergunta" e
  "Resposta" Sans 13 soft, com o sobrescrito `#cN` no rótulo "Pergunta".
- Código: `.note-prose pre` já é fundo transparente, borda 1px `--rule`, raio
  2px, Mono 15/1,6 e padding 16 desde a Fatia 12 (`globals.css:307-315`). Resta o
  realce monocromático, que vem de um **módulo puro próprio** na feature `notes`
  — comentário, string, palavra-chave e número em `--ink` e `--ink-soft` —, com
  teste. Sem dependência nova: o `SPEC.md` §7 não muda. `.note-prose code` segue
  com fundo `--muted` (`:298-303`): o handoff não fala de código inline, então
  fica, e isso vai anotado para não parecer esquecimento.
- Display math alinhada à esquerda com recuo de 24px; hoje `.katex-display` só
  tem `overflow-x:auto` (`globals.css:353-357`).
- Tags em bloco ao fim da nota, Sans 15, filete superior, padding-top 16. Hoje
  `tags/linkify.ts:11-26` as transforma em link onde aparecem no texto, e não há
  bloco nenhum.
- Abaixo de 1100px: a variante `cards:` já existe e é usada (`page.tsx:140,147`,
  `margin.tsx:69`), mas o `<details>/<summary>` (`margin.tsx:69-72`) vira
  `<button aria-expanded>` com glifo ▸/▾, 15/500, min-height 44px sobre filete —
  `<summary>` não emite `aria-expanded`. Grade
  `auto-fill minmax(min(100%,240px),1fr)`, gap 12; hoje coluna única.
- **Card da margem** reescrito contra `NoteCard.dc.html`: caixa com borda 1px
  `--rule`, raio 2px, padding 12, grid com gap 8 — hoje `<li>` com `border-t`
  (`card-item.tsx:48-52`). Linha 1: "1 · Lacuna" — o `ordinal` existe em
  `cards/queries.ts:11` e é descartado pelo `Omit` em `card-item.tsx:9` — mais o
  badge de estado só de contorno, texto `--ink`, hoje `bg-muted`, Mono e
  minúsculo (`:22-28`), com a contagem de revisões em span separado (`:58-62`).
  Uma face Serif 15/1,5 com a lacuna oculta, borda inferior 2px `--ink`, **sem
  revelar a resposta** — hoje mostra `prompt` e `answer` (`:65-68`). Linha final
  nova com o vencimento 13 soft ("Vence em 3 dias · 6 revisões", "Ainda não
  revisado", "Suspenso"): o tipo `NoteCard` (`queries.ts:8-25`) não tem `due`, a
  consulta precisa trazê-lo (colunas em `:51-63`). Botão **com texto**
  "Suspender"/"Retomar", 13px, borda `--rule`, min-height 32px, em lugar do botão
  só-ícone (`suspend-button.tsx:35-46`). Suspenso não ganha badge extra, como
  hoje (`card-item.tsx:57`): a borda do badge de estado passa a tracejada e a
  face vai para `--ink-soft`. Rótulos novo, aprendendo, revisão, suspenso;
  `relearning` (`:15-20`) cai em "aprendendo".
- A margem perde a borda esquerda, o `pl-4` e o título "cards (N)"
  (`margin.tsx:40-46`), e os parágrafos de cards suspensos e arquivados
  (`:7-28`), que o handoff não tem.
- **Desvios conscientes.** O bloco "Mover" (`page.tsx:109-120`) não existe em
  nenhuma tela do handoff, mas mover nota entre aulas é capacidade exigida pela
  Fatia 2: fica onde está, em Sans 13 soft — tirá-lo seria perder função. E o
  card suspenso mostra só "Suspenso", sem data, porque não existe `suspendedAt` e
  a Fatia 9 fixou que suspender não escreve nada.

**Pronto quando:** numa nota com clozes, bloco Pergunta/Resposta, código Python e
fórmula em display, cada card aparece na linha do seu trecho a 1440px; o
sobrescrito leva ao card; a 375px os cards seguem alcançáveis pela seção
recolhível com `aria-expanded`; e o card da margem é igual ao `NoteCard.dc.html`
nos quatro estados, inclusive suspenso.

---

## Fatia 20 — Cursos, curso e aula

Nas três telas o `h1` usa `text-xl font-semibold`, que depois da renomeação da
escala **já é 28px**: o que muda é o peso, para 500.

- **`/courses`:** sai a sobrancelha "fatia 1 — casca navegável"
  (`courses/page.tsx:113-115`) — processo de desenvolvimento não é texto de
  interface (§6, Escrita) —, sai o parágrafo descritivo (`:117-120`) e sai o
  formulário sempre visível (`:123-128`), substituído por botão **Novo curso**,
  borda 1px `--ink`, 15/500, 44px, no cabeçalho ao lado do `h1` (`:116`). O H2 da
  especialização vira 21/500 com filete inferior 1px `--ink` e "Especialização ·
  N cursos" 13 soft à direita, hoje Mono xs (`:45-47`). Linha de curso 17/500
  (`:65-70`) e meta "5 módulos · 18 aulas · 14 estudadas" (`:79-81`) — a contagem
  de estudadas não existe em `courses/queries.ts` (`CourseRow` `:47-56`,
  `listCourses` `:59-81`, que já agrega em JS) e sai de uma coluna a mais no
  `columns` das aulas (`:67-71`), reusando o módulo puro `courses/studied.ts`,
  que já tem teste. Saem as ações por linha (`:83-97`): reordenar e arquivar são
  da tela do curso.
- **`/courses/[courseSlug]`:** breadcrumb Sans 13 "Cursos · Especialização", hoje
  um nível só, mono e minúsculo (`:38-42`); `h1` 28/500 e botão **Novo módulo**
  no cabeçalho, hoje seção com H2 e formulário sempre visível (`:50-52,76-84`);
  meta "5 módulos · 18 aulas · 14 estudadas" em lugar de `track · provider`
  (`:69-73`). **Módulos passam a ser expansíveis**: hoje as aulas são sempre
  listadas (`:137-187`) → `<button aria-expanded>` com ▸/▾, 44px, "2. Vetores"
  17/500 e "2 de 5 estudadas" 13 soft. O agregado por módulo sai em JS sem
  consulta nova: `getCourseBySlug` (`queries.ts:89-111`) já traz as aulas
  inteiras, com `studiedOn`. A numeração "01" em span mono (`:103-105`) vira
  "2. " dentro do próprio botão. Ações como botões de texto 13px com borda
  `--rule` e min-height 32px — "Nova aula · Renomear · ↑ · ↓ · Arquivar" no
  módulo, "Renomear ↑ ↓ Arquivar" na aula —, com ↑ e ↓ como glifos, hoje
  botões-ícone (`:120-134,168-182`); o `disabled` nas pontas já está certo e se
  mantém. A aula ganha checkbox "estudada" (18px, `accent-color`, `aria-label`)
  como primeiro elemento da linha e "3 notas" 13 soft; nenhum dos dois existe
  (`:143-183`). **Renomear inline** (`courses/components/forms.tsx:116-192`):
  hoje Enter salva, e não há `onKeyDown` nem `onBlur` em todo o arquivo → input
  com borda 1px `--accent`, `autoFocus`, Enter salva, Esc cancela, blur salva,
  sem os botões `Check`/`X` (`:169-187`). **Arquivados (N)** como seção ao fim,
  com botão "Restaurar", em lugar do item com `opacity-60` e badge na própria
  lista (`:96-101,143-148`) — `getCourseBySlug` não filtra arquivados, então a
  separação é no render, sem consulta nova. Módulo vazio ganha "Módulo sem aulas.
  Criar a primeira aula"; hoje a lista só não renderiza (`:187`). Estrutura em
  `<ol>` com filete superior `--ink` e cada módulo com filete inferior `--rule`,
  hoje `<ul>` em `:91` e `:138`.
- **`/lessons/[lessonId]`:** breadcrumb Sans 13 soft, hoje Mono (`:53-61`); `h1`
  28/500 (`:69-71`); saem `MoveButtons` e `ArchiveButton` do cabeçalho
  (`:78-92`), que o handoff não tem nesta tela. O `StudiedButton`
  (`forms.tsx:285-313`) passa a dizer "Marcar como estudada" e "Desmarcar como
  estudada" — hoje diz só "Desmarcar" —, sem ícone, borda 1px `--ink`, 15/500,
  44px, com `aria-pressed`, que falta. Status em `<span role="status">` 13 soft,
  hoje `<p class="font-mono text-xs">` (`:101-105`). H2 "Notas" 21/500 com filete
  inferior `--ink` e botão primário **Nova nota**, fundo `--ink`, na mesma linha,
  abrindo o editor — hoje H2 15px soft e formulário inline no fim da seção
  (`:110,131`). Cada nota em três linhas: tipo 13 soft, título 17/500, "4 cards ·
  editada há 2 h", com os dados da Fatia 18; hoje só o título a 15px
  (`:117-128`). Vazio com o texto exato: "Esta aula ainda não tem notas. Comece
  pela anotação da aula: escrever a primeira nota.", com link no fim (`:112-115`).
- Depois desta fatia, `lucide-react` não tem mais nenhum consumidor em `src` — as
  Fatias 14, 16, 17 e 19 tiram os outros. Conferir se a dependência ainda se
  justifica e, se não, tirá-la do `package.json` e do `SPEC.md` §7 no mesmo
  commit.

**Pronto quando:** criar curso, módulo e aula pela interface continua funcionando
com os botões novos; expandir e recolher módulo funciona por teclado com
`aria-expanded`; renomear fecha com Enter, Esc e blur; arquivar manda para
"Arquivados (N)" e "Restaurar" traz de volta; o checkbox de estudada muda a
contagem do módulo e do curso; e a 375px nenhuma barra de ações transborda.

---

## Fatia 21 — Busca acento-insensível, sobre notas e cards

O handoff descreve `/search` buscando notas **e** cards, com acentos opcionais.
Hoje a busca só varre `notes` e o vetor não passa por `unaccent` — a palavra não
aparece em nenhuma migration nem em `src`.

- `CREATE EXTENSION IF NOT EXISTS unaccent`, e a coluna gerada de `notes`
  (`schema.ts:111-113`) recriada com `unaccent` por dentro do `to_tsvector`: o
  stemmer português não remove diacríticos. Vetor equivalente em `cards`, sobre
  `prompt` e `answer`, com índice GIN — os índices de `cards` hoje são só
  `:171-176`, nenhum de texto.
- **Regra 3:** recriar coluna gerada é `DROP COLUMN` seguido de `ADD COLUMN`, com
  recriação de índice. Não perde `notes.title` nem `notes.content`, porque a
  coluna é derivada, mas é alteração destrutiva em forma: parar, mostrar o SQL e
  esperar autorização explícita. Regra 2 também vale — branch do Neon primeiro.
- A consulta passa a unir notas e cards num resultado só, com o tipo e o estado
  do card, e com `unaccent` no lado do termo. Hoje `search/queries.ts:49-81` só
  consulta `notes` (`SearchHit` `:8-16`, limite 30 na `:18`, opções de
  `ts_headline` em `:24-38`).

**Pronto quando:** a migration está aplicada no branch e na `main` com a saída
colada, buscar "projecao" encontra "projeção", e um card cujo texto não está em
nenhum título de nota aparece nos resultados.

---

## Fatia 22 — Busca e página do conceito

Fecha o realinhamento.

- **Busca:** container 760px, gap 20, hoje `measure` (`search/page.tsx:138`); só
  `h1` "Busca" 28/500 — saem a sobrancelha "busca" (`:140`) e o título "Buscar
  nas notas" (`:141-143`). `<div role="search">`, que não existe (`:36` é um
  `<form>` puro), com label **visível** 13 soft "Buscar em notas e cards", input
  `type=search` 17px, 44px, borda 1px `--ink-soft`, largura total, sem botão e
  sem placeholder; hoje label `sr-only` (`:37-39`), input 15px com placeholder de
  exemplo (`:40-48`) e botão "Buscar" (`:49-51`). Contagem em `role="status"`:
  "N resultados para “termo” em notas e cards", hoje "N notas (primeiras 30)" em
  Mono e sem `role` (`:70-73`). O `<mark>` com fundo `--rule`, peso 600, cor
  herdada e sem raio, hoje `bg-accent/15` com `rounded-sm` (`:21-23`) — o accent
  é reservado a link, foco e item ativo. A montagem do `<mark>` por segmentos
  React, sem `dangerouslySetInnerHTML` (`search/highlight.ts:24-53`), está certa
  e fica. Meta "{tipo} · {caminho}", com o tipo à frente, hoje só o caminho em
  Mono (`:86`). `<ol>` com filete superior `--ink`, itens com padding 16px 0 e
  filete inferior `--rule`, trecho Serif 15/1,6 em cor normal, hoje
  `text-ink-soft` (`:87-89`). Textos exatos do handoff no vazio ("Digite um termo
  para buscar em todas as notas e cards. Acentos são opcionais.") e no
  sem-resultado ("Nada encontrado para “x”. Tente um termo mais curto ou abra o
  conceito #…", com link para a tag); os dois textos atuais saem (`:115-118`,
  `:61-65`).
- **Conceito:** container 880px, gap 32, hoje `measure`
  (`tags/[tagSlug]/page.tsx:85`); "Conceito" 13 soft em Sans, hoje Mono minúsculo
  (`:25`); `h1` 28/500 (`:26`); "Citado em 3 notas e 5 cards" 15 soft, hoje
  "3 notas · 5 cards" (`:27-31`). Os dois H2 em 21/500 com filete inferior
  `--ink`, o segundo rotulado só "Cards", hoje 15px soft e "Cards do conceito"
  (`:41,63-65`), e **sempre visível**, mesmo vazio, hoje escondido (`:61`). Item
  de nota com "{tipo} · {caminho}" 13 soft **acima** do título 17/500, padding
  14px 0 com filete, hoje título 15px e caminho em Mono abaixo (`:43-56`). O item
  de card deixa de reusar `CardItem` (`:69`) e passa à forma do handoff: face
  Serif 17/1,55 com a lacuna oculta à esquerda, badge de estado de contorno e
  link para a nota de origem à direita (`TagCard` em `tags/queries.ts:16-27`,
  colunas em `:88-98`). Sai o texto de vazio "A tag continua valendo…"
  (`:34-38`), que ainda por cima imprime o slug onde o usuário escreveu outra
  coisa.

**Pronto quando:** buscar "projeção" acha a nota certa e pelo menos um card, o
termo sai destacado em `--rule` nos dois temas, as duas seções do conceito
aparecem mesmo vazias, e a 375px nem a busca nem o conceito rolam na horizontal.

---

## Fatia 23 — Travas que travam

Cinco travas do `pnpm check` prendem identificador em vez de uso: passam com o
código que deviam reprovar. Vêm primeiro porque são a rede das três fatias
seguintes. Nenhuma linha de produção muda nesta fatia — só teste.

- **`<form>` dentro de `<p>`** (`globals.test.ts:789-796`): a trava fatia o
  texto e olha `antes.slice(antes.lastIndexOf("<"))`, isto é, só a tag
  imediatamente anterior ao convite. Um `<p>` aberto com um `<span>` dentro
  passa. Precisa varrer as aberturas não fechadas até o texto e reprovar se `p`
  estiver entre elas.
- **`h1` 28/500** (`globals.test.ts:661`): `toContain("text-xl font-medium")`
  casa as duas classes em qualquer lugar do arquivo, inclusive separadas e fora
  do `h1`. A irmã da Fatia 22 (`:849`) já está na forma certa,
  `/<h1 className="text-xl font-medium"/` — alinhar a de cima com ela.
- **`unaccent` direto na coluna gerada** (`unaccent.test.ts:46`):
  `/[^_]unaccent\(/` exige um caractere antes, então uma expressão que *começa*
  por `unaccent(` passa — e é exatamente a que o Postgres recusa com
  "generation expression is not immutable". Âncora de início de string ou
  `(?<!_)` fecha.
- **Duas colunas geradas** (`unaccent.test.ts:32-34`): `toHaveLength(2)` não diz
  de quais tabelas; duas em `notes` e nenhuma em `cards` passam. A trava precisa
  casar `notes` e `cards`, uma cada.
- **Três travas de identificador** (`globals.test.ts`): `role="search"` não está
  ancorada no `<form>` (a Fatia 22 decidiu que o marco é o próprio formulário, e
  a trava aceita o atributo em qualquer elemento); `sugerirConceito` não está
  ancorada no `href`, então chamar a função e jogar o resultado fora passa; e
  `not.toContain("card.answer")` passa com `const { answer } = card`, que é a
  grafia que um refactor naturalmente produz.

**Pronto quando:** para cada uma das cinco, o commit mostra o estado que devia
reprovar — a mutação escrita à mão no arquivo de produção — fazendo a trava
falhar antes do conserto, e `pnpm check` limpo depois, sem nenhuma linha de
produção alterada no diff.

---

## Fatia 24 — O que o parser deixa passar

`src/features/cards/parser.ts` é um dos dois módulos que o `CLAUDE.md` marca
como "bug silencioso corrompe dados do usuário sem aviso". Quatro entradas
legítimas de Markdown saem erradas, e nenhuma reclama. Toda alteração aqui pede
teste novo no mesmo commit.

- **Lacuna no destino de um link:** `[texto]({{url}})` esvazia o `href` — o
  parser recorta a lacuna e o link renderiza apontando para nada. Mesma família
  da marca injetada onde o Markdown não trata texto. Lacuna em destino de link
  não é card: ou vira reclamação (`ParseIssue`), ou o `{{…}}` fica literal.
- **Bloco de código indentado por quatro espaços:** `shared/markdown-blocks.ts`
  só reconhece cerca, então o bloco indentado vira parágrafo, gera card, e as
  marcas da lacuna renderizam dentro do `<pre>`. O bloco indentado precisa
  entrar na varredura, ao lado da cerca.
- **`Q::` em item de lista ou citação:** não vira card e não vira reclamação.
  `parse` e `posicoesDeCards` concordam entre si, então a tela não mostra
  inconsistência — o usuário escreve a pergunta, salva, e ela simplesmente não
  existe. Precisa de `ParseIssue` dizendo que `Q::` tem de abrir o bloco.
- **Continuação da resposta que interrompe o parágrafo:** lista ou citação depois
  do `A::` sai fora dos filetes do bloco na leitura da nota. O `A::` lê até a
  linha em branco (SPEC §3.2); a continuação que troca de tipo de bloco rompe o
  recorte.

**Pronto quando:** cada um dos quatro tem teste em `parser.test.ts` (ou
`by-block.test.ts`, para o filete) que falha antes do conserto, as quatro
entradas salvam sem card errado e sem silêncio, e nenhum teste existente do
parser muda de expectativa — se mudar, a razão entra no commit.

---

## Fatia 25 — O que a tela perdeu

Oito itens de interface que a série de realinhamento (Fatias 14–22) deixou
atrás. O primeiro é perda de função, os quatro seguintes são leitor de tela, os
três últimos são o handoff cobrando o que ficou pela metade.

- **Aula arquivada perde as notas** (`courses/[courseSlug]/page.tsx:202`): o
  item da seção "Arquivados" é um `<span className="min-w-0 truncate">`. Antes
  da fatia que criou a seção era link com `opacity-60`. Hoje, arquivar uma aula
  torna as notas dela inalcançáveis por navegação — só a busca as acha. Volta a
  ser link para a aula, com o recuo de cor que a seção já tem.
- **Quatro `<nav>` anônimos** (`courses/[courseSlug]/page.tsx:88`,
  `lessons/[lessonId]/page.tsx:40`, `notes/[noteId]/page.tsx:96`,
  `notes/components/editor.tsx:253`): o rail já é
  `<nav aria-label="Navegação">` (`rail.tsx:231`), então o leitor de tela lista
  dois ou mais marcos de navegação e nomeia um. O fio de migalhas precisa de
  rótulo próprio.
- **`aside` repetido e seção sem `aria-controls`:** cada `aside` da margem
  repete `aria-label="Cards do trecho"` — fiel ao handoff, mas numa nota com dez
  blocos o leitor anuncia dez marcos idênticos; e a seção recolhível não diz o
  que controla.
- **Seção vazia do conceito** (`tags/[tagSlug]/page.tsx:34`):
  `<ul>{children}</ul>` imprime lista sem item quando a seção está vazia —
  "lista, 0 itens" no leitor de tela, e visualmente lê como falha de
  carregamento. Uma linha neutra atende os dois sem voltar ao texto que a
  Fatia 22 mandou tirar ("A tag continua valendo…").
- **`autoFocus` na busca** (`search/page.tsx:60`): o foco pula o `h1` a cada
  carregamento, então quem chega em `/search` nunca ouve de que página se trata.
  Pré-existente a todas as fatias de busca.
- **Campo de renomear com um tamanho só:** o handoff pede 17px/44px no módulo e
  15px/36px na aula; hoje é uma classe de 15px sem `min-height`, e a linha
  "pula" quando entra em edição.
- **Formulário revelado dividindo a linha:** no cabeçalho da tela do curso o
  formulário revelado divide a linha com ↑ ↓ Arquivar. O comentário do
  `display: contents` descreve só o call site de `/courses`, não este.
- **Grade abaixo de 1100px:** `min-width:0` e `grid-column:1` só existem acima
  de 1100px, então uma tabela larga numa nota pode esticar a grade na faixa de
  baixo. A conferência da Fatia 25 não reproduziu o estiramento: `.note-prose
  table`, `pre` e `.katex-display` já são contêineres de rolagem, e o tamanho
  mínimo automático de um contêiner de rolagem é zero. As duas declarações
  saíram da media query assim mesmo — abaixo de 1100px a grade é de uma coluna
  só, e a regra passa a dizer isso explicitamente em vez de depender da
  propriedade de rolagem de cada bloco.

**Pronto quando:** a aula arquivada volta a levar às notas dela; cada marco de
navegação tem nome próprio; a seção vazia do conceito não imprime lista vazia; o
foco em `/search` começa no documento, não no campo; o campo de renomear não
muda a altura da linha ao abrir; e uma nota com tabela larga não rola na
horizontal a 900px nem a 375px, conferido no navegador nos dois temas.

---

## Fatia 26 — Tipos, ordem e a migration

O resto da dívida: três itens de tipo e coerência, três de ordem e cosmético, e
um que só morde no futuro.

- **`SearchHit.estado` solto do `origem`** (`search/hits.ts:85-86`):
  `string | null` sem amarrar ao `origem`, e a tela interpola confiando numa
  invariante que o tipo não expressa — nota nunca tem estado, card sempre tem.
  União discriminada sobre `origem` resolve sem `any`.
- **`.tag-card-face` sem a irmã `.suspensa`** (`globals.css:535`,
  `tags/components/tag-card.tsx:32`): o comentário diz "como na margem", e na
  margem o card suspenso recua a face para `--ink-soft`
  (`.note-card-face.suspensa`, `globals.css:542`). Ou a regra entra, ou o
  comentário sai — hoje o código promete o que não faz.
- **`sugerirConceito` casa numa direção só** (`tags/queries.ts:152`): o termo tem
  de estar *dentro* do slug, então "limites" nunca acha a tag `limite` e a frase
  de sem-resultado não sugere nada. Casar nas duas direções.
- **Empate na ordem das notas da aula:** `listNotesForLesson` ordena por
  `createdAt` sem desempate, então duas notas criadas no mesmo instante trocam de
  lugar entre carregamentos. Um `asc(notes.id)` fecha. Pré-existente.
- **Classe do seletor duplicada à mão:** a classe do seletor de tipo da nota
  repete a constante `campo` de `note-forms.tsx` em vez de usá-la.
- **"Salvo 18:42" paralisado:** não se mexe quando `setNoteKind` bumpa
  `updatedAt`. Cosmético, mas mente sobre quando a nota mudou.
- **Extensão e função fora do snapshot do drizzle:** `create extension unaccent`
  e `immutable_unaccent(text)` vivem só no SQL da migration, não no snapshot. Um
  rebaseline futuro recria as colunas geradas sem a função e falha no meio — e
  falha num comando que não dá para repetir à mão sem entender por quê.

**Pronto quando:** `pnpm check` limpo; a união discriminada não deixa a tela
interpolar estado de nota; o card suspenso do conceito recua como o da margem;
buscar "limites" sem resultado oferece a tag `limite`; e a ordem das notas de uma
aula não muda entre dois carregamentos da mesma tela.

---

## A suíte de testes — infraestrutura, não fatia

Não é fatia de produto, então não leva número. Registra o que a suíte garante
hoje e, com a mesma ênfase, o que ela não garante.

- **Dois comandos, dois projetos do vitest.** `pnpm check` é o portão offline:
  `tsc`, `eslint`, o projeto `puro` (`*.test.ts`, sem I/O — 45 arquivos, 604
  testes) e `next build`. `pnpm test:db` roda o projeto `db` (`*.db-test.ts` —
  13 arquivos, 110 testes) contra um branch efêmero do Neon, Postgres de
  verdade, nunca mock de driver (`scripts/db-test.mjs`).
- **O que cobre:** queries e actions de cursos, notas, cards, tags, revisão e
  busca contra o banco real; a ponte parser→banco dos cards; o corte do dia da
  fila de revisão; a busca acento-insensível sobre o `tsvector`; e três lacunas
  puras (o tipo `ActionState`, o plugin hast das marcas de card, a classe do item
  do rail).
- **O que deliberadamente não cobre:** render de componente. Nada na suíte monta
  um componente React; o `next build` dá só o que dá: a tela compila e o
  prerender não aborta; não diz que ela renderiza o certo.
- **Isolamento sem limpeza.** Os arquivos `db` compartilham **um** branch e
  rodam em série (`--no-file-parallelism`). O isolamento vem do branch efêmero e
  de asserções escopadas por id; não há `DROP`, `TRUNCATE` nem `DELETE` de linha
  de `cards`/`reviews` na suíte. `testTimeout` de 20s vale só para o projeto
  `db` (`vitest.config.ts`): cada teste faz dezenas de idas e voltas HTTP ao
  Neon.
- **Única mudança de produção:** o relógio injetado em
  `src/features/review/queries.ts`. `agoraDoRequest()` é exportada e
  `fetchQueue`, `fetchAheadQueue`, `fetchTodayLabel` e `fetchPanel` recebem
  `agora: Date` como primeiro parâmetro, para o corte do dia sair de baixo de
  `connection()` e entrar em teste. Efeito colateral: `fetchPanel` e `fetchQueue`
  passaram a compartilhar um só instante — antes, perto do corte das 04:00,
  cada uma lia o relógio por conta própria e podiam cair em dias lógicos
  diferentes.

**Pronto quando:** `pnpm check` passa limpo com 45 arquivos / 604 testes no
projeto `puro`; `pnpm test:db` passa limpo com 13 arquivos / 110 testes contra o
branch efêmero; e a fronteira da cobertura é a descrita acima — render de
componente fica de fora.

---

## Backlog — fora da v1, não implemente

Registrado para não virar escopo acidental:

- Exercícios e psets, com cada erro apontando para a nota do conceito.
- Geração de cards por LLM dentro do app.
- Grafo de conceitos e backlinks bidirecionais de verdade.
- Importação de `.apkg` do Anki.
- Otimização dos parâmetros do FSRS com o histórico real de `reviews`.
- PWA e revisão offline.
- Registro de tempo de estudo por disciplina.
- Índice `/tags` listando todos os conceitos. SPEC §5 define só
  `/tags/[tagSlug]`; hoje uma tag só é alcançável clicando nela dentro de uma
  nota. Rota nova, não dívida.
- Marcação de lacuna na pré-visualização do editor e contagem de cards antes de
  gravar. A contagem chega na resposta do save, o que cumpre a Fatia 3. Ver o
  card antes de salvar é conforto, não promessa.
- Seed com a estrutura real dos três cursos do Coursera. A Fatia 1 marca como
  opcional e nunca existiu script; com os cursos cadastrados à mão, perdeu a
  razão de ser.
- Histórico de revisões como calendário ou gráfico. Os dados existem em
  `reviews`, mas nem SPEC nem PLAN pedem visualização.
- Mover o bloco "Mover" do fim da coluna de leitura da nota. É gosto, não
  dívida.
- Rail em gaveta sobreposta no telefone. SPEC §6 pede rail colapsável, não
  drawer.
- Controle de tema em `/review`. A §6 e a Fatia 7 proíbem interface no modo
  foco.
- Página ou rota de configurações. SPEC §5 não a tem — por isso os limites
  diários moram num canto discreto do painel.
- Rota de showcase, design system navegável ou Storybook.
- Plugin de tipografia do Tailwind, ou regra de ESLint que trave classe
  arbitrária. As duas exigem dependência nova; por isso as travas das Fatias 12
  e 13 são teste de Vitest varrendo a árvore.
- Troca da família de ícones ou do registry de componentes.
