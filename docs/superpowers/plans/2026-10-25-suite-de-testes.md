# Suíte de testes de banco e de borda — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr a camada de dados do app — Server Actions, queries e os dois `sync.ts` — sob teste automatizado contra Postgres de verdade, sem nunca tocar nos dados da `main`.

**Architecture:** Dois projetos no Vitest separados por sufixo de arquivo (`*.test.ts` puro e offline, `*.db-test.ts` com banco). O projeto de banco roda contra um branch efêmero do Neon criado com `--schema-only`, que nasce vazio e é apagado no fim. `next/cache` e `next/navigation` são substituídos por stubs via `resolve.alias`, para que action seja chamável fora de uma request. Uma única mudança em produção: o relógio de `review/queries.ts` passa a ser injetado.

**Tech Stack:** Vitest 3.2, Drizzle (`neon-http`), `neonctl`, Node puro nos scripts. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-10-25-suite-de-testes-design.md`

## Global Constraints

- **Nenhuma dependência nova.** `SPEC.md` §7 lista o que é permitido; nada fora dela entra sem pergunta.
- **Sem `any`, sem `@ts-ignore`, sem `eslint-disable`** — inclusive nos testes, nos stubs e nos scripts.
- **Nenhuma operação destrutiva.** A suíte não tem `DROP`, `TRUNCATE` ou `DELETE` de linha de `cards`/`reviews`. O isolamento vem do branch vazio, não de limpeza.
- **Nenhum acesso aos arquivos de ambiente do projeto.** A `DATABASE_URL` da suíte vem inline na linha de comando, obtida do `neonctl`.
- **Nomes de domínio em inglês, texto de interface em português** — vale para as mensagens afirmadas nos testes.
- **A suíte inteira roda antes de cada commit:** `pnpm check` e `pnpm test:db`, as duas saídas colhidas (`CLAUDE.md` regra 6).
- Ids do projeto Neon: `--project-id jolly-paper-96338438 --org-id org-dark-glade-96360087`. Os dois sempre, ou o `neonctl` trava pedindo a org interativamente.
- Prefixo de PATH obrigatório neste ambiente: `PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd <script>`.

## Review Focus

Cinco modos de falha que o spec implica e que nenhum teste de feature exercita. Cada linha tem um passo próprio na tarefa que é dona do código.

1. **A suíte apontada para o banco de produção.** `src/db/index.ts` lê `process.env.DATABASE_URL` de onde quer que venha. Um `DATABASE_URL` de `main` no ambiente faria a suíte escrever nas notas reais do usuário. Guarda dupla na Tarefa 1: a trava de ambiente e a contagem de sanidade.
2. **Branch órfão.** Processo interrompido (Ctrl+C) ou teste que lança deixa branch pago e vivo no Neon. Tarefa 1: remoção em `finally` e em `SIGINT`/`SIGTERM`.
3. **Schema defasado.** Migration gerada e não aplicada na `main` faz a suíte testar contra schema velho e passar enganando. Tarefa 1: o script compara e para.
4. **Entrada inválida na borda.** Toda action valida com Zod e deve devolver `{ ok: false, message }` legível — nunca lançar. Exercitado nas Tarefas 3, 4 e 8, uma asserção por família de action.
5. **Âncora repetida na mesma nota.** O índice único é `(note_id, anchor_key)`; se `reconcile` deixar passar uma âncora duplicada o batch inteiro falha e a nota não salva. Tarefa 5.

---

### Task 1: Infraestrutura — dois projetos, stubs, script do branch

**Files:**
- Modify: `vitest.config.ts` (arquivo inteiro)
- Modify: `package.json:7-16` (bloco `scripts`)
- Create: `scripts/db-test.mjs`
- Create: `src/db/test-support/next-cache.ts`
- Create: `src/db/test-support/next-navigation.ts`
- Create: `src/db/test-support/setup.ts`
- Create: `src/db/test-support/guard.db-test.ts`
- Modify: `SPEC.md` (§7, linha da tabela de comandos de teste; §8, árvore de pastas)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `pnpm test:db` — roda o projeto `db` contra branch efêmero.
  - `src/db/test-support/next-cache.ts` exporta `revalidatePath(path: string, type?: string): void`, `revalidateTag(tag: string): void` e `revalidacoes: { path: string; type?: string }[]` (lista acumulada) e `limparRevalidacoes(): void`.

    A chave `type` é gravada **só quando o argumento vem**: `revalidatePath("/x")` registra `{ path: "/x" }`, sem `type`. Por isso, teste de chamada com um argumento afirma por caminho (`revalidacoes.map((r) => r.path)`) e não por igualdade de objeto — `toContainEqual` trata chave ausente e `undefined` como diferentes, e isso viraria falha fantasma.
  - `src/db/test-support/next-navigation.ts` exporta `redirect(url: string): never` (lança `ErroDeRedirect`) e `class ErroDeRedirect extends Error { readonly url: string }`.
  - Variável de ambiente `ESTUDOS_TEST_BRANCH`, posta pelo script, lida pela trava.

- [ ] **Step 1: Escrever o teste da trava de ambiente**

`src/db/test-support/guard.db-test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { cards, notes, reviews } from "@/db/schema";

describe("guarda do banco de teste", () => {
  it("roda num branch de teste, nunca na main", () => {
    expect(process.env.ESTUDOS_TEST_BRANCH).toMatch(/^teste-/);
  });

  it("começa sem nenhuma nota, card ou revisão", async () => {
    const [n, c, r] = await Promise.all([
      db.select().from(notes),
      db.select().from(cards),
      db.select().from(reviews),
    ]);

    expect([n.length, c.length, r.length]).toEqual([0, 0, 0]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd test:db`
Expected: FAIL — script `test:db` não existe ainda.

- [ ] **Step 3: Escrever os dois stubs**

`next-cache.ts`: `revalidatePath` e `revalidateTag` empurram para `revalidacoes` e não fazem mais nada. `next-navigation.ts`: `redirect` lança `ErroDeRedirect` com a url, porque é assim que o Next se comporta de verdade.

- [ ] **Step 4: Escrever `src/db/test-support/setup.ts`**

Roda como `setupFiles` do projeto `db`. Recusa a rodada, lançando, quando `process.env.ESTUDOS_TEST_BRANCH` não casa `/^teste-/` ou `DATABASE_URL` está vazia — a mensagem diz para usar `pnpm test:db`. Depois chama `limparRevalidacoes()` em `beforeEach`.

Esta é a guarda 1 do Review Focus: sem ela, um `DATABASE_URL` de produção no ambiente faria a suíte escrever nas notas reais.

- [ ] **Step 5: Reescrever `vitest.config.ts` com os dois projetos**

Mantém o alias `@` que já existe. Projeto `puro`: `include: ["src/**/*.test.ts"]`, `exclude: ["src/**/*.db-test.ts"]`. Projeto `db`: `include: ["src/**/*.db-test.ts"]`, `setupFiles`, `fileParallelism: false`, e `resolve.alias` mapeando `next/cache` → `src/db/test-support/next-cache.ts` e `next/navigation` → `src/db/test-support/next-navigation.ts`, além do `@`.

- [ ] **Step 6: Escrever `scripts/db-test.mjs`**

Node puro, sem dependência. Na ordem:

1. Resolve o executável do `neonctl` por `process.env.NEONCTL`, senão `neonctl` no PATH.
2. **Confere o schema** (Review Focus 3): lista `drizzle/*.sql` e compara com a tabela `__drizzle_migrations` da `main`; se houver migration não aplicada, sai com código 1 e a mensagem "Há migration gerada e não aplicada na main — aplique antes de testar."
3. Cria `teste-<Date.now()>` com `--parent main --schema-only` e os dois ids.
4. Pega a connection string do branch.
5. Roda `vitest run --project db` com `DATABASE_URL` e `ESTUDOS_TEST_BRANCH` no ambiente do filho.
6. Em `finally`, e também em `SIGINT`/`SIGTERM`, apaga o branch (Review Focus 2). Propaga o código de saída do Vitest.

- [ ] **Step 7: Acrescentar o script ao `package.json`**

`"test:db": "node scripts/db-test.mjs"`.

- [ ] **Step 8: Rodar e ver passar**

Run: `PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd test:db`
Expected: PASS, 2 testes. Depois `neonctl branches list` não mostra nenhum `teste-*` — o branch foi apagado.

- [ ] **Step 9: Conferir que o portão não pegou os testes de banco**

Run: `PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd check`
Expected: PASS com `Test Files 42 passed (42)` — o mesmo número de antes, porque `guard.db-test.ts` ficou fora do projeto `puro`.

- [ ] **Step 10: Atualizar o `SPEC.md`**

§7: a linha de teste passa a nomear os dois comandos. §8: a árvore ganha `scripts/db-test.mjs` e `src/db/test-support/`.

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts package.json scripts/db-test.mjs src/db/test-support SPEC.md
git commit -m "test: dois projetos no Vitest e branch efêmero para a suíte de banco"
```

---

### Task 2: Semeadura compartilhada

**Files:**
- Create: `src/shared/test-seed.ts`
- Test: `src/shared/test-seed.db-test.ts`

**Interfaces:**
- Consumes: `db` de `@/db`, tabelas de `@/db/schema`.
- Produces:
  - `semearAula(opcoes?: { courseTitle?: string; moduleTitle?: string; lessonTitle?: string; track?: string }): Promise<{ courseId: string; courseSlug: string; moduleId: string; lessonId: string }>`
  - `semearNota(lessonId: string, opcoes?: { title?: string; content?: string; kind?: "lesson_note" | "summary" | "solution" }): Promise<{ noteId: string }>`
  - `semearCard(noteId: string, opcoes?: { anchorKey?: string; ordinal?: number; kind?: "cloze" | "qa"; prompt?: string; answer?: string; due?: Date; state?: "new" | "learning" | "review" | "relearning"; suspended?: boolean; archivedAt?: Date | null }): Promise<{ cardId: string }>`

  - `semearRevisao(cardId: string, opcoes?: { rating?: "again" | "hard" | "good" | "easy"; reviewedAt?: Date; durationMs?: number | null; undoesReviewId?: string | null; antes?: Partial<{ state: "new" | "learning" | "review" | "relearning"; stability: number; difficulty: number; due: Date; lastReview: Date | null; reps: number; lapses: number; learningSteps: number; elapsedDays: number; scheduledDays: number }> }): Promise<{ reviewId: string }>`

    Preenche as 10 colunas `*Before` de `reviews` (`src/db/schema.ts:214-223`) — todas NOT NULL, exceto `lastReviewBefore`, que é anulável e precisa poder receber `null` — com os valores de `antes` ou, para o que `antes` omitir, com o estado atual do card lido do banco. Sem este semeador, as Tarefas 7 e 8 montariam o mesmo `INSERT` de vinte colunas à mão, em dois arquivos.

  Cada opção omitida ganha um padrão único por chamada (sufixo aleatório no título e no slug), para que duas chamadas no mesmo arquivo não colidam no índice único de `courses.slug`.

- [ ] **Step 1: Escrever o teste**

`src/shared/test-seed.db-test.ts`:

```ts
it("monta a cadeia curso → módulo → aula e devolve os ids", async () => {
  const { courseId, moduleId, lessonId } = await semearAula();

  const aula = await db.query.lessons.findFirst({
    where: (l, { eq }) => eq(l.id, lessonId),
  });

  expect(aula?.moduleId).toBe(moduleId);
  const modulo = await db.query.modules.findFirst({
    where: (m, { eq }) => eq(m.id, moduleId),
  });
  expect(modulo?.courseId).toBe(courseId);
});

it("duas chamadas não colidem no slug do curso", async () => {
  const a = await semearAula();
  const b = await semearAula();

  expect(a.courseSlug).not.toBe(b.courseSlug);
});

it("semeia nota e card ligados à aula", async () => {
  const { lessonId } = await semearAula();
  const { noteId } = await semearNota(lessonId, { content: "O {{teorema}} vale." });
  const { cardId } = await semearCard(noteId, { due: new Date("2026-01-01T00:00:00Z") });

  const card = await db.query.cards.findFirst({ where: (c, { eq }) => eq(c.id, cardId) });
  expect(card?.noteId).toBe(noteId);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test:db` (com o prefixo de PATH)
Expected: FAIL — `semearAula` não existe.

- [ ] **Step 3: Implementar `src/shared/test-seed.ts`**

Insere com `db.insert(...).returning({ id })`, na ordem curso → módulo → aula. Sobe para `shared` porque todas as features a usam, que é o critério do `CLAUDE.md`.

- [ ] **Step 4: Rodar e ver passar**

Expected: PASS, 3 testes novos.

- [ ] **Step 5: Commit**

```bash
git add src/shared/test-seed.ts src/shared/test-seed.db-test.ts
git commit -m "test: construtor de semeadura para a suíte de banco"
```

---

### Task 3: Cursos — queries e actions

**Files:**
- Test: `src/features/courses/queries.db-test.ts`
- Test: `src/features/courses/actions.db-test.ts`

**Interfaces:**
- Consumes: `semearAula` da Tarefa 2; `revalidacoes` e `limparRevalidacoes` da Tarefa 1.
- Produces: nada que outra tarefa use.

Assinaturas sob teste: `fetchRail(): Promise<RailCourse[]>`, `listCourses(): Promise<CourseRow[]>`, `listCourseIds(): Promise<string[]>`, `getCourseBySlug(slug: string)`, `getLessonById(id: string)`. Todas as 13 actions de curso/módulo/aula têm a forma `(_prev: ActionState, formData: FormData) => Promise<ActionState>`.

- [ ] **Step 1: Escrever `queries.db-test.ts`**

Testes, com os nomes:

- `"fetchRail traz curso com módulos e aulas, na ordem de position"` — semeia duas aulas com `position` 1 e 0 e afirma a ordem do resultado.
- `"fetchRail omite curso arquivado"` — grava `archivedAt` e afirma que o id não aparece.
- `"listCourses conta aulas e aulas estudadas"` — duas aulas, uma com `studiedOn` preenchido.
- `"getCourseBySlug devolve null para slug inexistente"` — `expect(await getCourseBySlug("nao-existe")).toBeNull()` (ajuste a expectativa ao retorno real se for `undefined`; o teste trava o contrato que existe).
- `"listCourseIds devolve só os não arquivados"`.
- `"getLessonById traz o caminho curso · aula"`.

- [ ] **Step 2: Rodar e ver falhar ou passar**

Expected: estes testes exercitam código que já existe, então o esperado é **PASS** na primeira execução. Qualquer falha aqui é **achado**: pare, mostre a saída e o diagnóstico, e não ajuste a expectativa para o verde (`CLAUDE.md` regra 5).

- [ ] **Step 3: Escrever `actions.db-test.ts`**

- `"createCourse grava o curso e revalida o layout"` — monta `FormData` com `title`, afirma a linha gravada e `expect(revalidacoes).toContainEqual({ path: "/", type: "layout" })`.
- `"createCourse sem título devolve a mensagem do schema"` — `FormData` vazio; afirma `{ ok: false }` e que `message` não é vazia, e que nada foi gravado. (Review Focus 4.)
- `"createCourse dá slug único quando o título repete"` — dois cursos "Álgebra Linear"; afirma dois slugs distintos.
- `"renameCourse muda o título e mantém o slug"`.
- `"setCourseArchived preenche e limpa archivedAt"` — ida e volta.
- `"moveCourse troca as posições de dois cursos"`.
- `"createModule/renameModule/setModuleArchived/moveModule"` — um teste cada, mesma forma.
- `"createLesson/renameLesson/setLessonArchived/moveLesson"` — um teste cada.
- `"setLessonStudied marca e desmarca studiedOn"`.

- [ ] **Step 4: Rodar as duas suítes**

Run: `pnpm test:db`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira e commitar**

```bash
PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd check
PATH="/c/Program Files/nodejs:$PATH" /c/Users/Daniel/AppData/Roaming/npm/pnpm.cmd test:db
git add src/features/courses
git commit -m "test: queries e actions de cursos contra Postgres"
```

---

### Task 4: Notas — queries e actions

**Files:**
- Test: `src/features/notes/queries.db-test.ts`
- Test: `src/features/notes/actions.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2. `ErroDeRedirect` do stub de navegação.
- Produces: nada.

Assinaturas: `listNotesForLesson`, `listRecentNotes(limite: number)`, `lastCaptureLesson()`, `getNoteById(id)`, `listLessonOptions()`. Actions: `createNote(_prev, formData)`, `moveNote(_prev, formData)`, `setNoteKind(input: unknown)`, `saveNote(input: unknown): Promise<SaveResult>`.

- [ ] **Step 1: Escrever `queries.db-test.ts`**

- `"listNotesForLesson ordena por updatedAt decrescente"`.
- `"listRecentNotes respeita o limite"` — semeia 3, pede 2.
- `"lastCaptureLesson devolve a aula da nota mais recente"`, e `"devolve null sem nota nenhuma"`.
- `"getNoteById traz curso, aula e conteúdo"`.
- `"listLessonOptions omite aula arquivada"`.

- [ ] **Step 2: Rodar — PASS esperado; falha é achado**

- [ ] **Step 3: Escrever `actions.db-test.ts`**

- `"createNote grava a nota e redireciona para o editor"` — afirma que a chamada lança `ErroDeRedirect` com `url` igual a `/notes/<id>/edit`, e que a nota existe. O redirect do Next funciona lançando, e o código de produção o deixa fora do `try` de propósito.
- `"createNote com lessonId inexistente devolve mensagem legível"` — afirma `{ ok: false, message: "Não foi possível salvar agora. Confira a conexão e tente de novo." }`, a frase única de `FALHA_GENERICA`. (Review Focus 4.)
- `"moveNote troca a aula e revalida as duas"` — afirma que `revalidacoes` contém `/lessons/<origem>` e `/lessons/<destino>`.
- `"setNoteKind muda o kind e toca updatedAt"`.
- `"saveNote grava conteúdo, cria os cards do texto e devolve o total"` — conteúdo com uma lacuna `{{...}}` e um par `Q::`/`A::`; afirma `ok: true` e que `cards` tem 2 linhas para a nota.
- `"saveNote revalida a página da tag quando o texto cita um conceito"` — conteúdo com `#norma`; afirma `/tags/[tagSlug]` em `revalidacoes`. É cobertura que hoje ninguém tem.
- `"saveNote com id inexistente devolve ok: false"`.

- [ ] **Step 4: Rodar as duas suítes — PASS**

- [ ] **Step 5: Rodar a suíte inteira e commitar**

```bash
git add src/features/notes
git commit -m "test: queries e actions de notas contra Postgres"
```

---

### Task 5: Cards — a ponte parser→banco

**Files:**
- Test: `src/features/cards/sync.db-test.ts`
- Test: `src/features/cards/queries.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces: nada.

Assinaturas: `planCards(noteId, content): Promise<CardsPlan>` com `CardsPlan = { plan: ReconcilePlan; issues: ParseIssue[]; total: number }`; `cardWrites(noteId, plan, now): BatchItem<"pg">[]`, gravado com `db.batch(...)`; `listCardsForNote`; `setCardSuspended(_prev, formData)`.

Esta é a tarefa mais importante da suíte: é aqui que card órfão nasce ou morre, e o `CLAUDE.md` chama o parser de lógica cuja corrupção é silenciosa.

- [ ] **Step 1: Escrever `sync.db-test.ts`, ponta a ponta com releitura**

Cada teste semeia nota, chama `planCards`, grava com `db.batch(cardWrites(...))` e **relê do banco** — o plano sozinho já é coberto por `reconcile.test.ts`; o que falta é a gravação.

- `"texto novo insere um card por trecho"`.
- `"editar o enunciado atualiza o card e preserva o histórico FSRS"` — grava, mexe no `prompt` do texto, regrava, e afirma que `reps` e `due` do card não zeraram.
- `"trecho removido arquiva o card em vez de apagar a linha"` — afirma `archivedAt` preenchido e que a linha continua lá.
- `"trecho que volta desarquiva o mesmo card, com as revisões intactas"` — o caminho `unarchive`.
- `"âncora repetida na mesma nota não derruba a gravação"` — conteúdo com dois trechos idênticos; afirma que o batch grava, que há um card só e que `issues` traz "trecho repetido". (Review Focus 5: o índice único é `(note_id, anchor_key)` e violá-lo faria a nota inteira não salvar.)
- `"nota sem trecho algum grava zero card e total 0"`.

- [ ] **Step 2: Rodar — PASS esperado; falha é achado**

- [ ] **Step 3: Escrever `queries.db-test.ts`**

- `"listCardsForNote devolve na ordem de ordinal"`.
- `"listCardsForNote omite card arquivado"`.
- `"setCardSuspended suspende e reativa, e revalida o layout"`.

- [ ] **Step 4: Rodar — PASS**

- [ ] **Step 5: Rodar a suíte inteira e commitar**

```bash
git add src/features/cards
git commit -m "test: a ponte parser→banco dos cards, com releitura"
```

---

### Task 6: Tags — vínculo e leitura

**Files:**
- Test: `src/features/tags/sync.db-test.ts`
- Test: `src/features/tags/queries.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces: nada.

Assinaturas: `planTags(noteId, content): Promise<TagsPlan>` com `TagsPlan = { criar; vincular; desvincular; slugs }`; `tagWrites(noteId, plan): BatchItem<"pg">[]`; `getTagBySlug(slug): Promise<TagDetail | null>`; `sugerirConceito(termo): Promise<string | null>`.

- [ ] **Step 1: Escrever `sync.db-test.ts`**

- `"primeiro #conceito cria a tag e o vínculo"`.
- `"tirar o conceito do texto desfaz o vínculo e mantém a linha em tags"` — a diferença essencial em relação a card, dita no próprio módulo.
- `"conceito que já existe reusa a linha, sem duplicar slug"` — duas notas citando `#norma`; afirma uma linha em `tags` e dois vínculos.
- `"acento e caixa caem no mesmo slug"` — `#Norma` e `#norma`.

- [ ] **Step 2: Rodar — PASS esperado; falha é achado**

- [ ] **Step 3: Escrever `queries.db-test.ts`**

- `"getTagBySlug traz as notas que citam o conceito"`.
- `"getTagBySlug devolve null para slug sem tag"`.
- `"sugerirConceito acha o conceito próximo e devolve null quando não há"`.

- [ ] **Step 4: Rodar — PASS**

- [ ] **Step 5: Rodar a suíte inteira e commitar**

```bash
git add src/features/tags
git commit -m "test: vínculo de tags e leitura por conceito contra Postgres"
```

---

### Task 7: Revisão — injetar o relógio e testar o corte da fila

**Files:**
- Modify: `src/features/review/queries.ts` (a função `agora` na linha 170; as assinaturas nas linhas 180, 220, 331, 335)
- Modify: `src/app/page.tsx:94,191`
- Modify: `src/app/review/page.tsx:26-27`
- Modify: `src/features/courses/components/course-rail.tsx:18`
- Test: `src/features/review/queries.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces:
  - `agoraDoRequest(): Promise<Date>` — exportada de `review/queries.ts`, corpo idêntico ao da `agora` privada de hoje (`await connection(); return new Date()`).
  - `fetchQueue(agora: Date, limits?: Limits): Promise<Queue>`
  - `fetchAheadQueue(agora: Date): Promise<Queue>`
  - `fetchTodayLabel(agora: Date): string` — deixa de ser `async`, porque `panelDateLabel` é puro.
  - `fetchPanel(agora: Date, limits?: Limits): Promise<Panel>`

  O `agora` vem primeiro em todas, e `limits` continua com o padrão `DEFAULT_LIMITS`.

Esta é a única alteração em código de produção de todo o plano. A semântica de `cacheComponents` fica preservada: a leitura de tempo continua marcada por `connection()`, só muda de lugar — para quem chama, que já está dentro de uma request.

- [ ] **Step 1: Escrever o teste do corte, com relógio fixo**

`src/features/review/queries.db-test.ts`:

- `"fetchQueue traz o card vencido e deixa o que vence amanhã"` — dois cards, `due` de ontem e de depois de amanhã, relógio fixo em `new Date("2026-03-10T14:00:00Z")`.
- `"fetchQueue não traz card suspenso nem arquivado"`.
- `"fetchQueue respeita o limite de novos por dia"` — 3 cards novos, `newPerDay: 2`.
- `"fetchQueue desconta do limite o que já foi estudado hoje"` — insere uma `reviews` de hoje e afirma que a fila encurta; é a regra que impede reabrir `/review` e ganhar outros 20.
- `"fetchQueue com fila vazia diz em quantos dias vence o próximo"` — afirma `nextDueInDays`.
- `"o corte do dia é às 4h: card de 23h50 conta no dia anterior"` — o relógio em `2026-03-10T02:00:00` no fuso do app, usando `CORTE_HORAS` de `./day`.
- `"fetchAheadQueue oferece os próximos a vencer, até 20, sem mexer nos limites"`.
- `"fetchLimits devolve os padrões do SPEC §4 sem linha em settings"` — `newPerDay: 20`, `reviewsPerDay: 200`.
- `"fetchLimits lê a linha gravada"`.
- `"fetchPanel conta vencidos, novos, streak e mediana"`.
- `"fetchPanel ignora os dois lados de um par desfeito"` — insere avaliação e a reversão que a desfaz; afirma `doneToday: 0`.
- `"fetchUndoTarget devolve a última avaliação efetiva, e null sem histórico"`.
- `"fetchTodayLabel formata a data do painel"`.

- [ ] **Step 2: Rodar e ver falhar**

Expected: FAIL com `connection was called outside a request scope` nos testes de `fetchQueue`, `fetchAheadQueue`, `fetchPanel` e `fetchTodayLabel`. É exatamente a parede que a injeção derruba — e a prova de que ela era real.

- [ ] **Step 3: Injetar o relógio em `review/queries.ts`**

Renomeia `agora` para `agoraDoRequest` e a exporta, sem mudar o corpo. As quatro funções recebem `agora: Date` como primeiro parâmetro e usam `const now = agora;` no lugar da chamada.

- [ ] **Step 4: Atualizar os três call sites**

`src/app/page.tsx`: `fetchLimits().then(...)` passa a repassar o instante, e `fetchTodayLabel` deixa de ser aguardada como promessa. `src/app/review/page.tsx` e `course-rail.tsx`: calculam `const agora = await agoraDoRequest()` e repassam. Todos já estão dentro de uma request.

- [ ] **Step 5: Rodar os testes e o portão**

Run: `pnpm test:db`, depois `pnpm check`
Expected: PASS nos dois. O `next build` é a prova de que `cacheComponents` continua satisfeito — se a marca de tempo de requisição tivesse se perdido, o prerender abortaria.

- [ ] **Step 6: Atualizar o `SPEC.md` se ele documentar a assinatura**

Confira §4 e §8; se alguma delas citar `fetchQueue`, corrija no mesmo commit.

- [ ] **Step 7: Commit**

```bash
git add src/features/review/queries.ts src/features/review/queries.db-test.ts src/app/page.tsx src/app/review/page.tsx src/features/courses/components/course-rail.tsx
git commit -m "test: o corte da fila do dia sai de baixo de connection() e entra em teste"
```

---

### Task 8: Revisão — actions

**Files:**
- Test: `src/features/review/actions.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1, 2 e 7.
- Produces: nada.

Assinaturas: `rateCard(input: unknown): Promise<RateResult>` com `RateResult = { ok: true; dueAt: string } | { ok: false; message: string }`; `undoLast(): Promise<UndoResult>` com `UndoResult = { ok: true; card: QueueCard } | { ok: false; message: string }`; `saveLimits(_prev, formData): Promise<ActionState>`.

- [ ] **Step 1: Escrever o teste**

- `"rateCard grava a revisão, avança o card e devolve dueAt"` — afirma `ok: true`, uma linha nova em `reviews` e que `cards.due` andou para frente.
- `"rateCard guarda o estado anterior completo"` — afirma que `stateBefore`, `stabilityBefore`, `difficultyBefore`, `dueBefore`, `repsBefore`, `lapsesBefore`, `learningStepsBefore` foram gravados com os valores que o card tinha antes. É daqui que o desfazer reconstrói o card, e nada disso é recalculável depois.
- `"rateCard com rating inválido devolve mensagem legível e não grava"`. (Review Focus 4.)
- `"rateCard com cardId inexistente devolve ok: false"`.
- `"undoLast reconstrói o card e insere a linha de reversão"` — afirma que `cards` voltou aos valores de antes, que `reviews` tem 2 linhas e que a segunda tem `undoesReviewId` apontando para a primeira. Desfazer insere, nunca apaga.
- `"undoLast sem histórico devolve ok: false"`.
- `"a mesma avaliação não pode ser desfeita duas vezes"` — o índice único `reviews_undoes_idx`; afirma `ok: false` na segunda chamada.
- `"saveLimits grava a linha única de settings"` — e `"recusa valor fora da faixa com mensagem legível"`.

- [ ] **Step 2: Rodar — PASS esperado; falha é achado**

- [ ] **Step 3: Rodar a suíte inteira e commitar**

```bash
git add src/features/review/actions.db-test.ts
git commit -m "test: avaliar, desfazer e limites contra Postgres"
```

---

### Task 9: Busca

**Files:**
- Test: `src/features/search/queries.db-test.ts`

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces: nada.

Assinatura: `searchNotesAndCards(termo: string): Promise<SearchHit[]>`.

A coluna `search_vector` é gerada pelo banco sobre `immutable_unaccent`, então este é o único lugar onde a busca pode ser verificada de verdade: `unaccent.test.ts` cobre o lado puro, mas o stemmer português e o índice GIN só existem no Postgres.

- [ ] **Step 1: Escrever o teste**

- `"acha a nota pelo título e pelo conteúdo"`.
- `"acha sem acento o que foi escrito com acento"` — nota com "projeção", busca por "projecao". Prova o unaccent da **coluna** `search_vector` (gerada com `immutable_unaccent`, migration 0005), não o da consulta: passaria mesmo sem `immutable_unaccent` na consulta. Quem prova o da consulta é a direção inversa (nota "projecao", busca "projeção"), acrescentada na Tarefa 9.
- `"o stemmer português casa plural com singular"` — "normas" acha "norma".
- `"varre cards também, não só notas"` — semeia card e busca pelo enunciado.
- `"termo vazio devolve lista vazia, sem varrer o banco"`.

- [ ] **Step 2: Rodar — PASS esperado; falha é achado**

- [ ] **Step 3: Rodar a suíte inteira e commitar**

```bash
git add src/features/search
git commit -m "test: busca acento-insensível contra o tsvector do Postgres"
```

---

### Task 10: Fechar as lacunas puras

**Files:**
- Test: `src/shared/action-state.test.ts`
- Test: `src/shared/markdown-card-marks.test.ts`
- Test: `src/shared/rail-item.test.ts`

**Interfaces:**
- Consumes: nada. Estes três entram no projeto `puro` e rodam no `pnpm check`.
- Produces: nada.

- [ ] **Step 1: Escrever os três testes**

`action-state.test.ts`: `idleState` é `{ ok: true }`, e o tipo discrimina — um `ActionState` com `ok: false` carrega `message`. Teste de tipo via `expectTypeOf` ou uma função que estreita a união.

`markdown-card-marks.test.ts`: o plugin `envolverCards()` aplicado a uma árvore hast montada à mão. Use as constantes de `marcasDeCard`, nunca os caracteres literais — eles são da área de uso privado do Unicode e não sobrevivem a copiar e colar. Casos:
- a lacuna vira `span.note-cloze` seguido de `a.note-ref` com `href="#c1"`;
- o par vira `div.note-qa` com quatro células e os rótulos "Pergunta" e "Resposta";
- o trecho que atravessa irmãos (marca de abrir num nó, de fechar em outro, com um elemento entre eles) é envolvido inteiro;
- dois pares no mesmo parágrafo são ambos trocados — o laço de `percorrerLacunas`;
- marca sobrando sem par é limpa do texto **e dos atributos**, inclusive de um `title`, para não virar caractere fantasma na tela;
- o bloco `note-qa` herda a linha do `Q::`, adiantada pelas quebras do que vinha antes — é por essa linha que `by-block.ts` decide a faixa da grade.

`rail-item.test.ts`: `CLASSE_ITEM_RODAPE` tem `min-h-11` (os 44px de alvo abaixo de 900px, SPEC §6) e o reset `rail:min-h-0` para quando o rail é coluna.

- [ ] **Step 2: Rodar e ver falhar, depois passar**

Run: `pnpm check`
Expected: FAIL antes, PASS depois, com a contagem de arquivos subindo de 42 para 45. Se algum caso de `markdown-card-marks` falhar, é achado — pare e mostre.

- [ ] **Step 3: Rodar a suíte inteira e commitar**

```bash
git add src/shared/action-state.test.ts src/shared/markdown-card-marks.test.ts src/shared/rail-item.test.ts
git commit -m "test: fechar as lacunas puras de action-state, marcas de card e item do rail"
```

---

### Task 11: Registrar a suíte no PLAN.md

**Files:**
- Modify: `PLAN.md` (seção de fatias entregues)

- [ ] **Step 1: Acrescentar a entrada**

Uma entrada dizendo o que a suíte cobre, o que ela deliberadamente não cobre (render de componente) e os dois comandos. Sem inventar numeração de fatia nova se a convenção do arquivo não pedir — este trabalho é infraestrutura, não fatia de produto.

- [ ] **Step 2: Rodar a suíte inteira e commitar**

```bash
git add PLAN.md
git commit -m "docs: registrar a suíte de testes no PLAN.md"
```
