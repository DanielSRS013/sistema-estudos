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
aquela camada ou tela. Também não são feature nova. Cada apontamento foi
conferido por grep em 20/10/2026 — se um número não bater mais, confira antes de
executar.

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
ring-accent/30` em cerca de 20 sites (`rail.tsx:30,210,274`, `sign-out.tsx:9`,
`theme-toggle.tsx:106` entre outros) — a 30% de alpha fica perto de 1,3:1.
`globals.css:179` ainda aplica `outline-ring/50`.

- Regra global de foco em `globals.css`; as strings `focus-visible:` saem dos
  componentes.
- Tirar o movimento que o handoff não tem: `transition-all` e
  `active:...translate-y-px` em `shared/ui/button.tsx:6`, e o import de
  `tw-animate-css` em `globals.css:2`, sem uso. `button.tsx` é saída do registry
  do shadcn — anotar no commit que ali é território de terceiro.
- Trocar pelos utilitários da escala os pixels escritos à mão, hoje coincidentes
  mas fora do token: `app/page.tsx:25,68,108`,
  `notes/components/note-forms.tsx:82`, `review/components/limits-form.tsx:105`,
  `review/components/session.tsx:66,239,246,255`.
- Dois estão **fora** da escala e mudam de valor: `shared/ui/button.tsx:25`
  `text-[0.8rem]` (12,8px) e `session.tsx:239` `leading-[1.35]` — a face do card
  é 28/1,45 no handoff.
- `leading-[1.65]` repetido em oito arquivos (`entrar/page.tsx:74`,
  `notes/[noteId]/page.tsx:93`, `tags/[tagSlug]/page.tsx:35`,
  `search/page.tsx:61,87,115`, `lessons/[lessonId]/page.tsx:113`) vira um
  utilitário único em `globals.css`, ao lado de `.note-prose`.
- `globals.test.ts` ganha a regra de foco e uma varredura de `src/app` e
  `src/features` que reprova `text-[`, `leading-[` e hex cru em `className`.
  `src/shared/ui` fica de fora: é saída do registry.

**Pronto quando:** `focus-visible:` só aparece no utilitário global, a varredura
por valor arbitrário não devolve nada, percorrer as nove rotas só de `Tab` mostra
o mesmo anel sólido em todo controle, e o contraste do anel contra `--paper` nos
dois temas está calculado e anotado no commit (≥3:1).

---

## Fatia 14 — A casca do handoff

A maior fatia de base: a casca tem **um** degrau (`md:`, 768px) onde o handoff
tem três, e o rail é outro desenho.

- Breakpoints: `shell.tsx:21,26,34` e `rail.tsx:122,141` trocam `md:` pelos
  900px do handoff — entre 768 e 900 há hoje rail de 256px ao lado da coluna,
  faixa que a §6 não pede. **Decisão antes de executar:** `globals.test.ts:87`
  trava o nome `--breakpoint-editor`, que a casca não usa. Renomear para um nome
  neutro de faixa é melhor que deixar dois nomes para um número, mas mexe em
  teste: a justificativa vai escrita no commit, antes da alteração (regra 5).
- Três degraus de padding de conteúdo, hoje todos errados em `shell.tsx:34`
  (`px-4 py-6 sm:px-8`): 40/56/80 em ≥1100, 32/32/64 em 900–1099, 20/16/56
  abaixo de 900.
- Rail: largura 240px em ≥1100 e 200px em 900–1099, em lugar de `md:w-64`
  (`rail.tsx:141` e o fallback do Suspense em `shell.tsx:26`); recolhido 48px já
  confere, mas o padding vai a 20px 8px; expandido 24px 20px, coluna com gap
  28px.
- Glifos de texto no lugar dos ícones lucide, que o handoff proíbe:
  `PanelLeftOpen` → **»** com `aria-label="Expandir menu"` em botão 32×32 e
  borda 1px `--rule` (`rail.tsx:132`); `PanelLeftClose` → link de texto
  **Recolher** 13px soft (`:169`); `ChevronDown`/`ChevronRight` → **▾**/**▸**
  (`:201,204,245,248`). Some o import de `lucide-react` (`:3-8`).
- Marca **Estudos** (Sans 15/600) no topo do rail — não existe em lugar nenhum.
- Nav: rótulos capitalizados **Painel · Cursos · Revisão · Busca** nessa ordem
  (hoje minúsculos e em outra ordem, `rail.tsx:22-27`), Sans 15px em vez de
  `font-mono text-xs` (`:30`), ativo em `--accent` peso 500 — hoje só muda de cor
  (`:153`). O `aria-current="page"` já está certo.
- Contagem de revisão (13px soft) ao lado de "Revisão": não há caminho hoje,
  `fetchRail()` (`course-rail.tsx:10`) só traz a árvore. Reusar a contagem que o
  painel já lê em `features/review/queries.ts`, sem consulta nova.
- Árvore do curso: hoje lista **todos** os cursos em **todas** as rotas a 15px
  (`rail.tsx:182-296`) → 13px, só nas telas de curso, nota, aula e editor, e só
  do curso atual.
- Rodapé: `margin-top:auto`, sem filete (hoje `border-t`, `rail.tsx:299`), itens
  empilhados (hoje lado a lado, `course-rail.tsx:16`). O tema vira **um** botão
  "Tema escuro"/"Tema claro" 13px soft em lugar dos três botões mono minúsculos
  (`theme-toggle.tsx:93-113`): a opção "sistema" sai da interface e continua
  sendo o estado inicial. "Sair" capitalizado, Sans 13 soft (`sign-out.tsx:9`).
- Abaixo de 900px: marca, tema e sair na primeira linha, nav em linha que quebra
  abaixo (hoje a ordem é inversa e sem marca), `min-height: 44px` em todo item,
  hoje ausente. E corrigir o vazamento do estado recolhido: o `localStorage` é
  global (`rail.tsx:120-136`), então no telefone a barra fica reduzida a um botão
  de ícone — abaixo de 900px é **sempre** a barra no topo.
- Regra nova: no editor, entre 900 e 1099px, o rail inicia recolhido, com a
  preferência do usuário prevalecendo. `rail.tsx:88` tem default fixo `false`,
  sem faixa nem rota.
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

- **O rótulo errado no botão mais importante:** `session.tsx:28` diz "Errei" →
  **De novo**.
- Topo: hoje "N na fila · X avaliados" e link "esc sai" (`session.tsx:221-229`) →
  caminho do card à esquerda ("Álgebra linear · Projeções") e **Restam N** à
  direita; fila concluída diz "Fila concluída". O caminho não é renderizável
  hoje: `QueueCard` (`review/queries.ts:80-87`) traz `noteTitle` e não traz
  curso · aula — a consulta precisa do join.
- Botão de pergunta (`session.tsx:259-268`): largura total, `min-height:72px`,
  fundo `--ink`, texto `--paper`, sem borda; **Mostrar resposta** (17/500) com
  "espaço" 13px **abaixo**, não ao lado.
- Botões de avaliação (`:283`): quatro colunas iguais sempre, gap 8px,
  `min-height:72px` — hoje `grid-cols-2 sm:grid-cols-4` sem altura mínima.
- **Dois comportamentos de resposta, hoje um só.** `:242-251` sempre desenha
  filete e bloco abaixo, qualquer que seja o `kind`. Cloze revelado é resposta
  in-loco, fundo `--rule`, padding 2px 6px; só pergunta/resposta usa filete 1px
  com padding-top 24px. Serif 28/1,45 nos dois — hoje 21/1,5 na resposta e 1,35
  na pergunta.
- Cloze oculto: `cards/parser.ts:31` injeta `[…]` como texto puro e `.card-face`
  (`globals.css:359-384`) não tem a regra — falta borda inferior 2px `--ink` e
  padding 0 8px.
- Rodapé: hoje um **botão** "u desfaz a última avaliação" à esquerda, mais
  "gravando…" (`:301-311`) → texto 13px soft centralizado em `role="status"`:
  "esc sai" no estado pergunta, "u desfaz · esc sai" no estado resposta.
- **"Avaliação desfeita" não existe no código.** Depois de `u`, o aviso aparece
  por 2,5s no mesmo `role=status`.
- `desfazer()` (`:156-179`) faz `setRevelado(false)`; o handoff exige voltar ao
  **estado resposta** do card anterior.
- O listener global (`:181-209`) não ignora teclas quando o foco está em input ou
  textarea — exigência explícita do handoff.
- Sai o que o handoff não tem: `noteTitle` em Mono sob a resposta (`:248-250`), a
  dica acima do botão (`:253-258`) e as variantes de fila vazia "Nada para
  adiantar.", "Nenhum card espera revisão.", "A próxima revisão é ainda hoje."
  (`:49-55,67`) — o handoff fixa "Nada vence hoje." e "Próxima revisão em 2
  dias.". A fila vazia ganha o rodapé "esc volta ao painel"; hoje sobra o rodapé
  do desfazer.
- Medidas: coluna interna 720px (hoje `max-w-[46rem]`, 736px, `:219`), padding
  28px 56px 40px, 16px em móvel, `main` na largura toda.

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
  data não existe no código; saem a sobrancelha "painel" em Mono e o `h1
  text-3xl font-semibold` (`:139-142`).
- **As duas caixas não existem** — hoje é uma grade de cinco números soltos
  (`:47-56`). Duas `section` com borda 1px `--rule`, padding 24, `grid auto-fit
  minmax(300px)`, gap 24, `aria-labelledby`, H2 15/500 soft:
  - **Fila de hoje** — "34 revisões vencem" e "12 cards novos", números 38px com
    `font-variant-numeric: tabular-nums`, que falta (`:25`), rótulos Sans 15px
    soft em lugar de `font-mono text-xs`, e a CTA **Começar revisão** com fundo
    `--ink` — hoje "Revisar N cards" em `bg-accent` (`:60-66`), e o accent é
    reservado a links, foco e item ativo.
  - **Captura** — "Nota nova na aula _Projeções_, aberta direto no editor."
    (17/1,5, aula como link) e botão secundário **Nova nota**, borda 1px `--ink`,
    min-height 44px, que cria na última aula aberta. Hoje é um formulário com
    input de título, `select` de aula e botão "Criar e escrever" com ícone `Plus`
    (`notes/components/note-forms.tsx:92-121`); ícones são proibidos.
- Métricas: `<dl>` separado, filete superior 1px `--ink`, `dt` 13 soft e `dd`
  21px, com os rótulos exatos "Sequência" → "9 dias seguidos" e "Tempo mediano
  por card" → "11 s". Hoje `streak`, avaliados hoje e mediana moram na mesma
  grade de 38px (`:50-55`); "avaliados hoje" não existe no handoff e sai. Os
  dados já estão em `review/queries.ts:258-273,293-328`.
- "Últimas notas" → **Últimas notas editadas** (`:158`). Cada linha com filete,
  padding 12px 0 e `justify-between`: título 17/500, caminho Sans 13 soft **sob**
  o título, tempo à direita. Hoje tudo em uma linha, título 15px, caminho e tempo
  em `font-mono text-xs` (`:115-131`).
- `notes/recent.ts:50-59` devolve "hoje 18:42", "ontem 23:47", "14/10"; o handoff
  usa tempo relativo ("há 2 h", "ontem"). É lógica pura: teste novo em
  `recent.test.ts` no mesmo commit.
- Limites diários: hoje um `<details>` no fluxo (`:164-168`,
  `review/components/limits-form.tsx:42-50`) → canto inferior direito, sempre
  visível, `role="group" aria-label="Limites diários"`, 13px soft; rótulos
  **Novos** e **Revisões** inline, hoje em Mono; inputs 72px por 32px, hoje
  `w-20` sem altura; **salva ao alterar**, sem botão — hoje há "Salvar limites"
  com ícone `Check` (`:84-91`) —; confirmação **Salvo** num `<span role=status>`
  permanente, em lugar de "Limites salvos." aparecendo e desaparecendo. Saem o
  parágrafo explicativo (`:105-108`), o link "Cursos e aulas" (`page.tsx:81-83`),
  porque navegação mora no rail, e o texto de fila vazia no painel (`:67-79`),
  que pertence a `/review`.

**Pronto quando:** o painel inteiro cabe nas duas caixas, nas métricas, na lista
e no canto dos limites; a 375px nada transborda; "Nova nota" leva direto ao
editor na última aula aberta; baixar um limite salva sozinho e mostra "Salvo"; e
o tempo mediano bate com o que está em `reviews`.

---

## Fatia 17 — Editor fiel, com o alerta certo

- **Um container com borda, não duas caixas.** `notes/components/editor.tsx:157`
  usa `grid gap-4 editor:grid-cols-2` com borda em cada painel → container único
  com borda 1px `--rule`, duas colunas iguais sem gap, divisória vertical
  (`border-right` no painel esquerdo) em ≥900px e horizontal abaixo disso.
- Cabeçalhos dos painéis **dentro** deles: "Markdown" e "Pré-visualização", 13px
  soft, padding 8px 16px, `border-bottom`. Hoje minúsculos, em Mono e fora do
  painel (`:159-164,203-205`).
- Textarea: sem borda, padding 16, min-height 720px (420 em móvel), Mono 15/1,65.
  Hoje borda, `rounded-md`, `px-3 py-2`, 384px e `leading-relaxed` (`:181`).
  `spellCheck={false}`, hoje ligado (`:175`). Sai o `placeholder` longo com
  exemplo de LaTeX (`:178-180`).
- **O alerta de erro de sintaxe está no lugar e no texto errados.** Hoje linhas
  `role="alert"` em `text-xs text-destructive` abaixo do textarea (`:183-199`),
  com o texto vindo de `cards/parser.ts:154`. O handoff pede bloco acima do
  editor, borda 2px `--ink`, padding 12px 16px, 15/1,5, título 600 "Card não
  criado: lacuna vazia na linha N" e corpo exato: "A marcação de lacuna vazia não
  tem resposta. Escreva a resposta entre as chaves, ou apague a marcação. O resto
  da nota está salvo." Sem cor de erro. A mensagem muda em `parser.ts` — teste
  novo no mesmo commit.
- No preview, o trecho com lacuna vazia aparece marcado em Mono com borda 2px
  `--ink`; nada faz isso hoje (`:206-214`).
- Preview com max-width 680px, padding 20px 24px 32px, Serif 17/1,65 no
  container. Saem o placeholder "O que você escrever à esquerda aparece aqui."
  (`:207-210`) e o contador "N cards" (`:183-187`).
- Cabeçalho: breadcrumb Sans 13 soft com curso · aula, hoje Mono e incluindo
  módulo (`notes/[noteId]/edit/page.tsx:29-40`); título `h1` 21/500 estático,
  hoje input editável `text-2xl` (`editor.tsx:136-144`); indicador em
  `role="status"`, hoje `aria-live="polite"` (`:145-147`), só com "Salvando…" e
  "Salvo 18:42" — saem "Não salvo" e o erro colorido (`:149-153`) —; e link de
  texto **Ver nota** 13px ao lado dele, em lugar do botão "Ler" com ícone
  `BookOpen` (`edit/page.tsx:41-50`).
- **Conflito SPEC × handoff:** o debounce do autosave é 1,5s no SPEC e em
  `editor.tsx:20`, e ~900ms no handoff. O handoff ganha; o SPEC é corrigido no
  mesmo commit.
- O rail recolhido entre 900 e 1099px no editor fica na Fatia 14, onde a casca
  mora.

**Pronto quando:** o editor é um retângulo com divisória, o alerta de lacuna
vazia aparece acima com o texto exato e o trecho marcado no preview, o autosave
sobrevive a um refresh no meio da digitação com a janela de 900ms, e nenhuma cor
carrega informação de erro.

---

## Fatia 18 — Tipo da nota

Três telas do handoff mostram o tipo da nota e o schema não o tem. Vem antes das
telas que o exibem, para não refazê-las depois.

- `src/db/schema.ts`: enum `note_kind` (`lesson_note` | `summary` | `solution`) e
  coluna `notes.kind` not null com default `lesson_note`, para as notas
  existentes nascerem classificadas sem backfill manual.
- `pnpm db:generate`, revisar o SQL, commitar o arquivo de migration. Regras 1 e
  2: branch do Neon primeiro, conferir, só então a `main`. Nada de `push`.
- Rótulos em português num módulo puro da feature `notes` (Anotação de aula,
  Resumo, Resolução), com teste. Domínio em inglês no código, interface em
  português.
- `listNotesForLesson` (`notes/queries.ts:17-21`) devolve só `id` e `title`:
  passa a trazer `kind`, `updatedAt` e a contagem de cards — é o que as linhas de
  `/lessons/[lessonId]` e o meta da leitura precisam.
- Seletor de tipo no editor, por Server Action com validação Zod.

**Pronto quando:** a migration está aplicada no branch e na `main` com a saída
colada, toda nota existente tem `kind`, e trocar o tipo no editor sobrevive a um
refresh.

---

## Fatia 19 — Leitura da nota e o card da margem

A tela com mais estrutura nova.

- **Grade por bloco.** Hoje é `flex` com uma única `aside` contendo todos os
  cards (`notes/[noteId]/page.tsx:140-152`). O handoff pede
  `grid-template-columns: minmax(0,68ch) 248px`, `column-gap:48px`,
  `align-items:start`, e **cada bloco da nota como linha da grade**, com os cards
  daquele bloco na segunda coluna da mesma linha (padding-top 28px, gap 12px). A
  base existe: `data-line` por bloco em `shared/markdown-lines.ts:26-34` e
  `cards.ordinal` com a linha de origem no parser. Com isso **sai** o
  `opacity-50` dos cards fora do trecho visível (`cards/components/card-list.tsx`
  `:92-101`, `card-item.tsx:51`): a Fatia 11 resolveu o vínculo por opacidade, o
  handoff resolve por posição. Margem 248px, não 256px.
- Cabeçalho com max 680px, hoje 68ch: breadcrumb Sans 13 soft com curso · aula,
  hoje Mono com três níveis (`:65-76`); título Serif 38/500, hoje Sans 28/600
  (`:79-81`); e a linha de meta que não existe — "Anotação de aula · Editada há
  2 h · 4 cards · Editar", com *Editar* como link, hoje botão com ícone `Pencil`
  (`:82-89`). Depende dos dados da Fatia 18.
- **Cloze no corpo.** `shared/markdown.tsx:36-43` entrega a marcação de lacuna
  como texto literal. O handoff pede sublinhado pontilhado 1px `--ink-soft` e
  número sobrescrito Sans 13 linkando `#cN`; o card recebe a âncora `id="cN"`
  (`card-item.tsx:48` é um `<li>` sem `id`).
- **Bloco Pergunta/Resposta** no corpo: não existe. Filetes superior e inferior
  1px `--rule`, padding 12px 0, grade `auto minmax(0,1fr)`, rótulos "Pergunta" e
  "Resposta" Sans 13 soft, com o sobrescrito `#cN` no rótulo "Pergunta".
- Código: `.note-prose pre` perde o fundo `--muted` e ganha borda 1px `--rule`,
  raio 2px, Mono 15/1,6 e padding 16. O realce monocromático vem de um **módulo
  puro próprio** na feature `notes` — comentário, string, palavra-chave e número
  em `--ink` e `--ink-soft` —, com teste. Sem dependência nova: o `SPEC.md` §7
  não muda.
- Display math alinhada à esquerda com recuo de 24px; hoje `.katex-display` só
  tem `overflow-x:auto`.
- Tags em bloco ao fim da nota, Sans 15, filete superior, padding-top 16. Hoje
  `tags/linkify.ts:11-26` as transforma em link onde aparecem no texto.
- Abaixo de 1100px: o `<details>/<summary>` (`cards/components/margin.tsx:69-72`)
  vira `<button aria-expanded>` com glifo ▸/▾, 15/500, min-height 44px sobre
  filete — `<summary>` não emite `aria-expanded`. Grade
  `auto-fill minmax(min(100%,240px),1fr)`, gap 12; hoje coluna única (`:74-82`).
- **Card da margem** reescrito contra `NoteCard.dc.html`: caixa com borda 1px
  `--rule`, raio 2px, padding 12, grid com gap 8 — hoje `<li>` com `border-t`
  (`card-item.tsx:48-52`). Linha 1: "1 · Lacuna" — o `ordinal` existe em
  `cards/queries.ts:11` e é descartado pelo `Omit` em `card-item.tsx:9` — mais o
  badge de estado só de contorno, texto `--ink`, hoje `bg-muted`, Mono, minúsculo
  e com contagem de revisões (`:22-27,54-62`). Uma face Serif 15/1,5 com a lacuna
  oculta, borda inferior 2px `--ink`, **sem revelar a resposta** — hoje mostra
  `prompt` e `answer` (`:65-68`). Linha final nova com o vencimento 13 soft
  ("Vence em 3 dias · 6 revisões", "Ainda não revisado", "Suspenso desde 12
  out."): o tipo `NoteCard` (`queries.ts:8-25`) não tem `due`, a consulta precisa
  trazê-lo. Botão **com texto** "Suspender"/"Retomar", 13px, borda `--rule`,
  min-height 32px, em lugar do botão só-ícone (`suspend-button.tsx:35-46`).
  Suspenso não ganha badge extra, como hoje (`card-item.tsx:57`): a borda do
  badge de estado passa a tracejada e a face vai para `--ink-soft`. Rótulos novo,
  aprendendo, revisão, suspenso; `relearning` (`:15-20`) cai em "aprendendo".
- A margem perde a borda esquerda, o `pl-4` e o título "cards (N)"
  (`margin.tsx:42-46`), e os parágrafos de cards suspensos e arquivados
  (`:12-25`), que o handoff não tem.
- **Desvio consciente:** o bloco "Mover" (`page.tsx:109-120`) não existe em
  nenhuma tela do handoff, mas mover nota entre aulas é capacidade exigida pela
  Fatia 2. Fica onde está, em Sans 13 soft — tirá-lo seria perder função.

**Pronto quando:** numa nota com clozes, bloco Pergunta/Resposta, código Python e
fórmula em display, cada card aparece na linha do seu trecho a 1440px; o
sobrescrito leva ao card; a 375px os cards seguem alcançáveis pela seção
recolhível com `aria-expanded`; e o card da margem é igual ao `NoteCard.dc.html`
nos quatro estados, inclusive suspenso.

---

## Fatia 20 — Cursos, curso e aula

- **`/courses`:** sai a sobrancelha "fatia 1 — casca navegável"
  (`courses/page.tsx:113-115`) — processo de desenvolvimento não é texto de
  interface (§6, Escrita) —, sai o parágrafo descritivo (`:117-120`) e sai o
  formulário sempre visível (`:123-128`), substituído por botão **Novo curso**,
  borda 1px `--ink`, 15/500, 44px, no cabeçalho ao lado do `h1` 28/500. O H2 da
  especialização vira 21/500 com filete inferior 1px `--ink` e "Especialização ·
  N cursos" 13 soft à direita, hoje Mono xs (`:45-47`). Linha de curso 17/500
  (`:67`) e meta "5 módulos · 18 aulas · 14 estudadas" — a contagem de estudadas
  não existe em `courses/queries.ts:54-55,78-79` e precisa do agregado. Saem as
  ações por linha (`:55-57,83-97`): reordenar e arquivar são da tela do curso.
- **`/courses/[courseSlug]`:** breadcrumb Sans 13 "Cursos · Especialização", hoje
  mono minúsculo (`:38-42`); `h1` 28/500 e botão **Novo módulo** no cabeçalho
  (`:50-52,76-84`); meta "5 módulos · 18 aulas · 14 estudadas" em lugar de
  `track · provider` (`:69-73`). **Módulos passam a ser expansíveis**: hoje as
  aulas são sempre listadas (`:102-187`) → `<button aria-expanded>` com ▸/▾,
  44px, "2. Vetores" 17/500 e "2 de 5 estudadas" 13 soft, agregado novo por
  módulo a partir de `lessons.studiedOn`. A numeração "01" em span mono
  (`:103-105`) vira "2. " dentro do próprio botão. Ações como botões de texto
  13px com borda `--rule` e min-height 32px — "Nova aula · Renomear · ↑ · ↓ ·
  Arquivar" no módulo, "Renomear ↑ ↓ Arquivar" na aula —, com ↑ e ↓ como glifos,
  hoje botões-ícone (`:120-134,168-182`); o `disabled` nas pontas já está certo e
  se mantém. A aula ganha checkbox "estudada" (18px, `accent-color`,
  `aria-label`) como primeiro elemento da linha e "3 notas" 13 soft; nenhum dos
  dois existe (`:143-183`). **Renomear inline**
  (`courses/components/forms.tsx:139-192`): hoje Enter salva, mas Esc não cancela
  e blur não salva → input com borda 1px `--accent`, `autoFocus`, Enter salva,
  Esc cancela, blur salva, sem botões auxiliares. **Arquivados (N)** como seção
  ao fim, com botão "Restaurar", em lugar do item com `opacity-60` e badge na
  própria lista (`:115-119,162-166`). Módulo vazio ganha "Módulo sem aulas.
  Criar a primeira aula"; hoje a lista só não renderiza (`:137`). Estrutura em
  `<ol>` com filete superior `--ink` e cada módulo com filete inferior `--rule`,
  hoje `<ul>` com `border-y` por grupo (`:91,138`).
- **`/lessons/[lessonId]`:** breadcrumb Sans 13 soft, hoje Mono (`:53-61`); `h1`
  28/500; saem `MoveButtons` e `ArchiveButton` do cabeçalho (`:78-92`), que o
  handoff não tem nesta tela. O `StudiedButton` (`forms.tsx:299-309`) passa a
  dizer "Marcar como estudada" e "Desmarcar como estudada", sem ícone, borda 1px
  `--ink`, 15/500, 44px, com `aria-pressed`, que falta. Status em
  `<span role="status">` 13 soft, hoje `<p class="font-mono text-xs">` (`:101`).
  H2 "Notas" 21/500 com filete inferior `--ink` e botão primário **Nova nota**,
  fundo `--ink`, na mesma linha, abrindo o editor — hoje H2 15px soft e
  formulário inline (`:110,131`). Cada nota em três linhas: tipo 13 soft, título
  17/500, "4 cards · editada há 2 h", com os dados da Fatia 18; hoje só o título
  a 15px (`:117-128`). Vazio com o texto exato: "Esta aula ainda não tem notas.
  Comece pela anotação da aula: escrever a primeira nota.", com link no fim
  (`:112-115`).

**Pronto quando:** criar curso, módulo e aula pela interface continua funcionando
com os botões novos; expandir e recolher módulo funciona por teclado com
`aria-expanded`; renomear fecha com Enter, Esc e blur; arquivar manda para
"Arquivados (N)" e "Restaurar" traz de volta; o checkbox de estudada muda a
contagem do módulo e do curso; e a 375px nenhuma barra de ações transborda.

---

## Fatia 21 — Busca acento-insensível, sobre notas e cards

O handoff descreve `/search` buscando notas **e** cards, com acentos opcionais.
Hoje a busca só varre `notes` e o vetor não passa por `unaccent`.

- `CREATE EXTENSION IF NOT EXISTS unaccent`, e a coluna gerada de `notes`
  (`schema.ts:111-113`) recriada com `unaccent` por dentro do `to_tsvector`: o
  stemmer português não remove diacríticos. Vetor equivalente em `cards`, sobre
  `prompt` e `answer`, com índice GIN.
- **Regra 3:** recriar coluna gerada é `DROP COLUMN` seguido de `ADD COLUMN`, com
  recriação de índice. Não perde `notes.title` nem `notes.content`, porque a
  coluna é derivada, mas é alteração destrutiva em forma: parar, mostrar o SQL e
  esperar autorização explícita. Regra 2 também vale — branch do Neon primeiro.
- A consulta passa a unir notas e cards num resultado só, com o tipo e o estado
  do card, e com `unaccent` no lado do termo. Hoje `search/queries.ts:54-71` só
  consulta `notes`.

**Pronto quando:** a migration está aplicada no branch e na `main` com a saída
colada, buscar "projecao" encontra "projeção", e um card cujo texto não está em
nenhum título de nota aparece nos resultados.

---

## Fatia 22 — Busca e página do conceito

Fecha o realinhamento.

- **Busca:** container 760px, gap 20, hoje `measure` (`search/page.tsx:138`); só
  `h1` "Busca" 28/500 — saem a sobrancelha "busca" e o título "Buscar nas notas"
  (`:140-144`). `<div role="search">` com label **visível** 13 soft "Buscar em
  notas e cards", input `type=search` 17px, 44px, borda 1px `--ink-soft`, largura
  total, sem botão e sem placeholder; hoje label `sr-only`, input 15px e botão
  "Buscar" (`:36-53`). Contagem em `role="status"`: "N resultados para “termo” em
  notas e cards", hoje "N notas (primeiras 30)" em Mono e sem `role` (`:70-73`).
  O `<mark>` com fundo `--rule`, peso 600, cor herdada e sem raio, hoje
  `bg-accent/15` com `rounded-sm` (`:22`) — o accent é reservado a link, foco e
  item ativo. A montagem do `<mark>` por segmentos React, sem
  `dangerouslySetInnerHTML` (`search/highlight.ts:24-53`), está certa e fica.
  Meta "{tipo} · {caminho}", com o tipo à frente, hoje só o caminho (`:86`).
  `<ol>` com filete superior `--ink`, itens com padding 16px 0 e filete inferior
  `--rule`, trecho Serif 15/1,6 em cor normal, hoje `text-ink-soft` (`:87`).
  Textos exatos do handoff no vazio ("Digite um termo para buscar em todas as
  notas e cards. Acentos são opcionais.") e no sem-resultado ("Nada encontrado
  para “x”. Tente um termo mais curto ou abra o conceito #…", com link para a
  tag); os dois textos atuais saem (`:61-65,115-118`).
- **Conceito:** container 880px, gap 32, hoje `measure`
  (`tags/[tagSlug]/page.tsx:85`); "Conceito" 13 soft em Sans, hoje Mono
  minúsculo (`:25`); `h1` 28/500 (`:26`); "Citado em 3 notas e 5 cards" 15 soft,
  hoje "3 notas · 5 cards" (`:27-31`). Os dois H2 em 21/500 com filete inferior
  `--ink`, o segundo rotulado só "Cards", hoje 15px soft e "Cards do conceito"
  (`:41,63-65`), e **sempre visível**, mesmo vazio, hoje escondido (`:62`). Item
  de nota com "{tipo} · {caminho}" 13 soft **acima** do título 17/500, padding
  14px 0 com filete, hoje título 15px e caminho em Mono abaixo (`:42-57`). O item
  de card deixa de reusar `CardItem` (`:69`) e passa à forma do handoff: face
  Serif 17/1,55 com a lacuna oculta à esquerda, badge de estado de contorno e
  link para a nota de origem à direita. Sai o texto de vazio "A tag continua
  valendo…" (`:34-38`).

**Pronto quando:** buscar "projeção" acha a nota certa e pelo menos um card, o
termo sai destacado em `--rule` nos dois temas, as duas seções do conceito
aparecem mesmo vazias, e a 375px nem a busca nem o conceito rolam na horizontal.

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
