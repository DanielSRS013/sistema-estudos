# Estudos

Notas de aula em Markdown com LaTeX, flashcards derivados das próprias notas e
revisão espaçada com FSRS. Aplicação pessoal, de um usuário só.

Os cards não são escritos à parte: eles são extraídos da nota a cada save, e a
reconciliação preserva o histórico de revisão quando o texto muda. O que o
sistema sabe sobre o seu estudo vive em `reviews`, que só cresce.

## Setup local

1. `pnpm install`
2. Crie um Postgres no [Neon](https://neon.tech) e copie a connection string
   **pooled** (o host tem `-pooler`).
3. Registre um OAuth App no GitHub com callback
   `http://localhost:3000/api/auth/callback/github`.
4. Defina as variáveis de ambiente: `DATABASE_URL`, `AUTH_SECRET`
   (`openssl rand -base64 32`), `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` e
   `AUTH_ALLOWED` com o seu login do GitHub.
5. `pnpm db:migrate`
6. `pnpm dev` e abra <http://localhost:3000>

`AUTH_ALLOWED` é a trava de acesso: o provider é o GitHub inteiro, então sem
essa lista qualquer conta entraria. Vazia ou ausente, ninguém entra.

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm check            # tsc && eslint && vitest run && next build  — PORTÃO
pnpm test             # vitest em watch
pnpm db:generate      # gera migration a partir do schema
pnpm db:migrate       # aplica migrations
pnpm db:studio        # inspeciona o banco
```

`pnpm check` é o portão: nada se declara pronto sem ele verde. O `next build`
está incluído porque quebras de prerender não aparecem no `tsc`.

## Onde a lógica crítica vive

Dois módulos puros, sem banco e sem React, com teste obrigatório:

- `src/features/cards/parser.ts` — Markdown entra, cards saem.
- `src/features/review/scheduler.ts` — invólucro fino sobre `ts-fsrs`.

Bug silencioso nesses dois corrompe dados sem aviso. Toda alteração neles
pede teste novo no mesmo commit.

## Estrutura

Código mora na feature que o usa, em `src/features/<nome>/`. Só sobe para
`src/shared/` o que duas features já usam. O schema é fonte única em
`src/db/schema.ts` e muda apenas por migration versionada em `drizzle/`.

## Deploy

Vercel, a partir da `main`. As mesmas variáveis do setup local, mais o
`DATABASE_URL` apontando para a `main` do Neon. O callback do OAuth App de
produção usa o domínio de produção — um OAuth App aceita um callback só, então
localhost e produção precisam de Apps separados.

## Documentos

- [`SPEC.md`](SPEC.md) — o que o sistema é e as regras de domínio.
- [`PLAN.md`](PLAN.md) — as fatias e a ordem de execução.
- [`CLAUDE.md`](CLAUDE.md) — as regras de trabalho no código.
