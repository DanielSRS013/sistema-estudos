# PLAN.md — ordem de execução

Cada fatia termina num estado utilizável e commitável. Não comece a seguinte
sem aceite da anterior. Critério de pronto é literal: se um item não foi
verificado rodando, a fatia não está pronta.

As fatias 0 a 5 formam a v1 e estão entregues. As fatias 6 a 11 fecham dívida:
cada uma cumpre algo que o `SPEC.md` promete ou dá caminho a uma coluna do
schema que nenhuma interface alcança. Nenhuma delas é feature nova — o que é
feature nova está no Backlog.

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
