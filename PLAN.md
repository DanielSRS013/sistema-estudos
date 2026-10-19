# PLAN.md — ordem de execução

Cinco fatias. Cada uma termina num estado utilizável e commitável. Não comece a
seguinte sem aceite da anterior. Critério de pronto é literal: se um item não
foi verificado rodando, a fatia não está pronta.

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

## Backlog — fora da v1, não implemente

Registrado para não virar escopo acidental:

- Exercícios e psets, com cada erro apontando para a nota do conceito.
- Geração de cards por LLM dentro do app.
- Grafo de conceitos e backlinks bidirecionais de verdade.
- Importação de `.apkg` do Anki.
- Otimização dos parâmetros do FSRS com o histórico real de `reviews`.
- PWA e revisão offline.
- Registro de tempo de estudo por disciplina.
