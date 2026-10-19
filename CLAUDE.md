# CLAUDE.md

Aplicação pessoal de estudos: notas em Markdown + LaTeX, flashcards derivados das
notas, revisão com FSRS. Um único usuário. Leia `SPEC.md` antes de escrever
código e `PLAN.md` para saber em que fatia estamos.

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm check            # tsc --noEmit && eslint && vitest run  — PORTÃO
pnpm test             # vitest em watch
pnpm db:generate      # gera migration a partir do schema
pnpm db:migrate       # aplica migrations
pnpm db:studio        # inspeciona o banco
```

## Regras invioláveis

1. **Schema muda só por migration versionada.** Edite `src/db/schema.ts`, rode
   `pnpm db:generate`, revise o SQL gerado, commite o arquivo de migration.
   Nunca `drizzle-kit push` contra um banco com dados.
2. **Toda migration roda primeiro num branch do Neon.** Crie o branch, aplique
   lá, confira, só então na `main`. Se não houver branch disponível, pare e
   avise — não aplique direto.
3. **Nada de dado destrutivo sem autorização explícita.** `DROP`, `TRUNCATE` ou
   alteração de coluna que perca dados: pare e pergunte, mesmo que pareça óbvio.
   As notas e o histórico de revisão são insubstituíveis.
4. **Sem `any`, sem `@ts-ignore`, sem `eslint-disable`.** Se o tipo não fecha, o
   desenho está errado — conserte o desenho.
5. **Teste que falha não se conserta mexendo no teste.** Conserte o código. Se o
   teste estiver de fato errado, diga por que antes de alterá-lo.
6. **Não declare pronto sem rodar `pnpm check` e colar a saída.** "Deve
   funcionar" não é verificação.
7. **Uma fatia por vez.** Não comece a fatia seguinte sem o aceite da anterior.
   Não refatore código fora do escopo da fatia atual.

## Limites de escopo

- Não instale dependência que não esteja em `SPEC.md` sem perguntar antes.
- Não adicione autenticação, upload, IA, notificações ou qualquer feature que
  não esteja na fatia corrente. O backlog mora no `PLAN.md`.
- Não crie `src/components/` nem `src/utils/` globais. Código mora na feature
  que o usa (`src/features/<nome>/`). Só sobe para `src/shared/` o que já é
  usado por duas features — e aí sim, mova de verdade.

## Onde a lógica crítica vive

Dois módulos puros, sem acesso a banco, sem React, com teste obrigatório:

- `src/features/cards/parser.ts` — Markdown entra, cards saem.
- `src/features/review/scheduler.ts` — invólucro fino sobre `ts-fsrs`.

Bug silencioso nesses dois corrompe dados do usuário sem aviso. Toda alteração
neles precisa de teste novo no mesmo commit.

## Estilo

- Server Components por padrão. `"use client"` só onde houver estado ou evento.
- Mutações por Server Actions, com validação Zod na entrada. Sempre.
- Erros de validação voltam para a UI como mensagem legível, nunca como throw cru.
- Nomes de domínio em inglês no código (`course`, `lesson`, `card`); texto de
  interface em português.
