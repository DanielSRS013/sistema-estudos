# Suíte de testes de banco e de borda — desenho

Data: 2026-10-25. Estado: aprovado em conversa, aguardando plano de implementação.

## Por que agora

O projeto tem 41 arquivos `.test.ts`, todos de módulos puros: parser e seus
auxiliares, scheduler, reconcile, schemas Zod, slug, markdown-*, highlight,
unaccent, theme, allowlist, reorder, undo, limits. É boa cobertura da lógica
que o `CLAUDE.md` chama de crítica.

Nada abaixo disso é testado. Fica sem rede de proteção:

| Camada | Arquivos | Risco descoberto |
|---|---|---|
| Server Actions | `actions.ts` × 5 | validação Zod na borda, `revalidatePath`, retorno de erro para a UI |
| Queries | `queries.ts` × 6 | todo o SQL do sistema — joins, corte da fila, ordenação |
| Sync | `cards/sync.ts`, `tags/sync.ts` | a ponte parser→banco: onde card órfão nasce ou morre |
| Avulsos puros | `action-state.ts`, `markdown-card-marks.ts`, `rail-item.ts` | — |

Componentes (`*.tsx`) ficam **fora de escopo**, por decisão: a verificação de
interface segue sendo o navegador, e o design system v2-roxo em andamento
reescreveria qualquer teste de render agora.

## Resultado pretendido

Retomar o desenvolvimento das fatias com a camada de dados sob teste
automatizado, rodando contra Postgres de verdade, sem nunca tocar nos dados da
`main` e sem dependência fora do `SPEC.md` §7.

Critério de sucesso, literal: `pnpm check` e `pnpm test:db` passam, e a suíte de
banco cobre cada função exportada de `actions.ts`, `queries.ts` e `sync.ts`
listada na seção "Mapa de cobertura".

## Restrições herdadas

1. **Nenhum acesso aos arquivos de ambiente do projeto**, de nenhum tipo — trava
   em `deny` e em hook `PreToolUse`. A `DATABASE_URL` da suíte vem inline na
   linha de comando, obtida do `neonctl`, nunca de arquivo.
2. **Dependência fora do `SPEC.md` §7 exige pergunta.** Este desenho não
   adiciona nenhuma: só Vitest, que já está lá.
3. **Nada destrutivo sem autorização.** A suíte não tem `DROP`, não tem
   `TRUNCATE`, não apaga linha nenhuma — ver "Ciclo do branch".
4. **Sem `any`, sem `@ts-ignore`, sem `eslint-disable`**, inclusive nos arquivos
   de teste e nos stubs.

## Arquitetura

### Dois projetos no Vitest

`vitest.config.ts` passa a declarar dois projetos. O sufixo do arquivo é o que
separa os mundos, para que o portão não possa pegar um teste de banco por
acidente:

| Projeto | Include | Exclude | Ambiente |
|---|---|---|---|
| `puro` | `src/**/*.test.ts` | `src/**/*.db-test.ts` | node, sem rede |
| `db` | `src/**/*.db-test.ts` | — | node, `DATABASE_URL`, stubs de request |

`pnpm check` roda apenas `puro` — continua offline, rápido e válido na Vercel.
`pnpm test:db` roda apenas `db`.

O projeto `db` roda com `fileParallelism: false`. Vitest paraleliza arquivos por
padrão, e contra um banco único isso embaralha qualquer afirmação de contagem.

### Ciclo do branch

`pnpm test:db` chama `scripts/db-test.mjs`, Node puro, sem dependência:

```
neonctl branches create --name teste-<timestamp> --parent main --schema-only \
  --project-id jolly-paper-96338438 --org-id org-dark-glade-96360087
URI=$(neonctl connection-string teste-<timestamp> ...)
DATABASE_URL=$URI vitest run --project db
finally: neonctl branches delete teste-<timestamp> ...
```

`--schema-only` é a peça central: o branch nasce com o schema da `main` e zero
linhas. Consequências, todas desejadas:

- As notas e o histórico de revisão do usuário **nunca são copiados**.
- Nenhum `TRUNCATE` ou limpeza entre testes existe na suíte.
- Teste pode afirmar contagem absoluta ("a fila tem 3 itens"), porque o banco
  começa vazio.
- Não é preciso rodar `db:migrate` no branch: o schema já é o da `main`. Se
  houver migration gerada e ainda não aplicada na `main`, o script falha com
  mensagem clara em vez de testar contra schema velho.

O `delete` fica em `finally`: teste que falha não deixa branch órfão. O script
resolve o executável por `process.env.NEONCTL` ou pelo PATH, e os dois ids do
projeto Neon ficam no próprio script — o `neonctl` trava pedindo a org
interativamente se `--org-id` não vier.

### Stubs de request

Toda action chama `revalidatePath`, e `createNote` chama `redirect`. Fora de uma
request os dois lançam. O projeto `db` aponta `next/cache`, `next/navigation` e
`next/server` para stubs locais via `resolve.alias` — não `vi.mock`, porque alias é
determinístico e não depende de hoisting:

- `revalidatePath` registra a chamada numa lista inspecionável em vez de lançar.
  Isso vira cobertura real: a suíte passa a afirmar que salvar nota revalida
  `/tags/[tagSlug]`, hoje verificado por ninguém.
- `redirect` lança um sentinela reconhecível, que é o comportamento verdadeiro do
  Next. `createNote` segue testável até o fim.

- `connection()` (de `next/server`) vira no-op, para que o código que a chama
  rode no projeto `db` como numa request.

Nenhum stub toca em código de produção.

### Semeadura

Um construtor em `src/shared/` monta a cadeia `course → module → lesson → note`
e devolve os ids. Sobe para `shared` porque todas as features o usam — é o
critério do `CLAUDE.md`, cumprido de fato, não por conveniência.

## A única mudança em produção

`src/features/review/queries.ts` tem um relógio interno:

```ts
async function agora(): Promise<Date> {
  await connection();
  return new Date();
}
```

`connection()` vem de `next/server` e marca a leitura de tempo para o
`cacheComponents`. No projeto `db` o stub de `next/server` a torna no-op, então
ela não é parede ali; a injeção existe pelo relógio determinístico em teste.
Quatro funções dependem dele:
`fetchQueue`, `fetchAheadQueue`, `fetchTodayLabel`, `fetchPanel`. São as
consultas do corte da fila do dia — a lógica mais perigosa do sistema, e hoje só
o navegador a vê.

Mudança: `agora` passa a ser exportada como `agoraDoRequest()`, idêntica ao que é
hoje, e as quatro funções recebem `agora: Date` como primeiro parâmetro. Quem
chama já está dentro de uma request e repassa:

```ts
const fila = await fetchQueue(await agoraDoRequest(), limites);
```

A semântica de `cacheComponents` fica preservada: a leitura de tempo continua
marcada por `connection()`, só muda de lugar. Call sites a atualizar:
`src/app/page.tsx`, `src/app/review/page.tsx`,
`src/features/courses/components/course-rail.tsx`.

Ganho: o corte da fila ganha relógio fixo em teste — "são 23h50 do dia X, isto
vence e aquilo não".

## Mapa de cobertura

Arquivos novos `.db-test.ts`, um por módulo, ao lado do código que testam:

| Arquivo | Cobre |
|---|---|
| `courses/queries.db-test.ts` | `fetchRail`, `listCourses`, `listCourseIds`, `getCourseBySlug`, `getLessonById` |
| `courses/actions.db-test.ts` | as 13 actions de curso/módulo/aula, incluindo `move*` e `setLessonStudied` |
| `notes/queries.db-test.ts` | `listNotesForLesson`, `listRecentNotes`, `lastCaptureLesson`, `getNoteById`, `listLessonOptions` |
| `notes/actions.db-test.ts` | `createNote` (com o redirect), `moveNote`, `setNoteKind`, `saveNote` |
| `cards/sync.db-test.ts` | `planCards` + `cardWrites` ponta a ponta, com releitura: onde card órfão nasce ou morre |
| `cards/queries.db-test.ts` | `listCardsForNote`, e `setCardSuspended` da action |
| `tags/sync.db-test.ts` | `planTags` + `tagWrites`, mais `getTagBySlug` e `sugerirConceito` |
| `review/queries.db-test.ts` | `fetchLimits`, `fetchQueue`, `fetchAheadQueue`, `fetchPanel`, `fetchTodayLabel`, `fetchUndoTarget` — com relógio injetado |
| `review/actions.db-test.ts` | `rateCard`, `undoLast`, `saveLimits` |
| `search/queries.db-test.ts` | `searchNotesAndCards` |

Arquivos novos `.test.ts`, puros, fechando as lacunas de hoje:
`shared/action-state.test.ts`, `shared/markdown-card-marks.test.ts`,
`shared/rail-item.test.ts`.

`auth/actions.ts` fica de fora: as duas funções são repasse direto para
`signIn`/`signOut` do Auth.js, sem lógica própria.

## Limites conhecidos

- O driver `neon-http` **não tem transação**. A suíte usa `db.batch`, como a
  produção, e não finge atomicidade que o app não tem.
- Cada `pnpm test:db` custa cerca de 30 segundos de criação e remoção de branch,
  e exige rede e `neonctl` autenticado.
- Render de componente não é coberto, por decisão registrada acima.

## Verificação

`pnpm check` e `pnpm test:db`, as duas saídas coladas, antes de **cada** commit —
não só ao fim da fatia.

Regra de conduta durante a implementação: teste que falha na primeira execução é
**achado**, não teste errado. Parar, mostrar a falha e o diagnóstico, e só então
mexer em código de produção — nunca ajustar a expectativa para o verde.
