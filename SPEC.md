# Especificação — Sistema de Estudos

## 1. O que é

Aplicação web pessoal onde notas de aula viram flashcards sem duplicação de
conteúdo, e os flashcards são agendados por repetição espaçada. Um usuário.
Uso diário: capturar a nota do dia, revisar a fila, consultar conceitos.

O que **não** é: um clone de Notion, um gerenciador de projetos, um app
multiusuário, um editor colaborativo.

## 2. Modelo de domínio

```
Course ──< Module ──< Lesson ──< Note ──< Card ──< Review
                                   │
                                   └──< NoteTag >── Tag
```

Hierarquia espelha a estrutura do Coursera: especialização → curso → módulo →
aula. Nesta v1, `Course` representa um curso dentro de uma especialização
(ex.: "Linear Algebra" dentro de "Mathematics for Machine Learning").

Regras:

- Uma `Note` pertence a exatamente uma `Lesson`. Uma `Lesson` pode ter várias
  notas (anotação de aula, resumo de revisão, resolução comentada).
- Um `Card` sempre nasce de uma `Note`. Não existe card avulso na v1.
- Um `Card` nunca é apagado por efeito colateral de edição de nota. Ver §4.
- `Review` é append-only. Nada no app atualiza ou apaga uma linha de `Review`.
- Tags pertencem à nota. Os cards herdam as tags da nota de origem em tempo de
  consulta — não há tabela `card_tags`.

## 3. Sintaxe de card

Os cards são marcados dentro do Markdown da nota. O parser roda no save.

### 3.1 Cloze (oclusão)

Trecho entre chaves duplas vira lacuna. Uma linha com uma ou mais lacunas gera
**um** card por lacuna, cada um ocultando apenas a sua.

```markdown
A projeção escalar de $s$ sobre $r$ é {{$\frac{s \cdot r}{|r|}$}}, e a
vetorial divide por {{$|r|^2$}}.
```

Com dica, após `::` —

```markdown
O determinante de uma matriz singular é {{zero::pense no que acontece com o
volume}}.
```

### 3.2 Pergunta e resposta

Duas linhas consecutivas iniciadas por `Q::` e `A::`. A resposta pode ocupar
várias linhas até a próxima linha em branco.

```markdown
Q:: Por que a projeção escalar pode ser negativa?
A:: Porque o dot product é negativo quando o ângulo entre os vetores passa
de 90°, e o denominador $|r|$ é sempre positivo.
```

### 3.3 Regras do parser

- Conteúdo dentro de bloco de código cercado (``` ```) é ignorado por completo.
  Markdown de exemplo e código Python nunca viram card.
- `\{{` escapa uma chave dupla literal.
- Uma lacuna vazia (`{{}}`) é erro de validação, reportado na UI, não ignorado
  em silêncio.
- LaTeX dentro de lacuna é preservado literalmente e renderizado no card.
- O parser é função pura: `parse(markdown: string): ParsedCard[]`. Sem I/O.

### 3.4 Identidade e reconciliação — o ponto crítico

Ao salvar uma nota, os cards existentes precisam ser reconciliados com os
recém-parseados **sem perder o estado do FSRS**. O algoritmo:

1. Calcule `anchorKey` de cada card parseado: SHA-256 dos primeiros 16 bytes de
   `normalize(prompt + "\u0000" + answer)`, onde `normalize` colapsa espaços e
   remove pontuação de borda.
2. Case por `anchorKey` idêntica → card existente mantido, estado FSRS intacto,
   texto atualizado.
3. Sobras: case por posição ordinal dentro da nota quando a similaridade de
   Levenshtein normalizada do prompt for ≥ 0,8 → trate como edição do mesmo
   card, mantenha o estado, atualize `anchorKey`.
4. Parseados sem par → cards novos, estado FSRS inicial.
5. Existentes sem par → `archivedAt = now()`. **Nunca `DELETE`.** Cards
   arquivados saem da fila de revisão mas preservam histórico, e reaparecem
   automaticamente se o texto voltar numa edição seguinte (passo 2 os reencontra).

Isso significa que nenhuma edição de nota, por mais destrutiva, consegue apagar
semanas de histórico de revisão. É o requisito de segurança mais importante do
sistema.

## 4. Agendamento

`ts-fsrs` com parâmetros padrão. O módulo `scheduler.ts` expõe exatamente duas
funções, ambas puras:

```ts
function schedule(card: CardState, rating: Rating, now: Date): Scheduled
function queueFor(cards: CardState[], now: Date, limits: Limits): CardState[]
```

- Quatro avaliações: Again, Hard, Good, Easy.
- Fila diária: vencidos primeiro (mais antigo primeiro), depois cards novos até
  o limite. Limites configuráveis, padrão 20 novos e 200 revisões por dia.
- Cada avaliação grava uma linha em `reviews` **na mesma transação** que
  atualiza o card. Se uma falhar, nenhuma vale.
- Fuso: todo cálculo de "hoje" usa `America/Sao_Paulo` com corte às 04:00, não
  à meia-noite. Estudar até 01:00 não deve pular o dia.

## 5. Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Painel: fila de hoje, últimas notas, atalho de captura |
| `/courses` | Lista de cursos |
| `/courses/[courseSlug]` | Módulos e aulas do curso |
| `/lessons/[lessonId]` | Aula com suas notas |
| `/notes/[noteId]` | Leitura da nota, cards gerados visíveis na margem |
| `/notes/[noteId]/edit` | Editor Markdown com preview |
| `/review` | Modo foco de revisão |
| `/tags/[tagSlug]` | Notas e cards que citam o conceito |
| `/search` | Busca full-text em notas |

Busca na v1: `to_tsvector` do Postgres com configuração `portuguese`, coluna
gerada e índice GIN. Sem serviço externo.

## 6. Direção visual

O assunto é matemática e Python, lidos todo dia por uma pessoa. O vocabulário
visual vem daí: papel técnico e saída de plot — não "dashboard SaaS".

### Cor

| Token | Hex | Uso |
|---|---|---|
| `--paper` | `#FCFCFA` | fundo |
| `--ink` | `#16202B` | texto |
| `--ink-soft` | `#5A6B7B` | texto secundário |
| `--rule` | `#DDE3E8` | filetes, bordas |
| `--accent` | `#31688E` | links, foco, estado ativo |

Os quatro botões de revisão usam as paradas do **viridis**, o colormap padrão do
matplotlib — perceptualmente uniforme e seguro para daltonismo. É o único lugar
do app onde a cor carrega informação, então é o único com saturação alta:

`Again #440154` · `Hard #31688E` · `Good #35B779` · `Easy #FDE725`

O amarelo do Easy não atinge contraste suficiente para texto sobre branco: use-o
como preenchimento com texto `--ink` por cima, nunca como cor de fonte.

Modo escuro: inverta para `--paper #11171D` e `--ink #E8EDF1`, mantendo as
quatro paradas do viridis inalteradas — elas foram desenhadas para funcionar nos
dois extremos.

### Tipografia

Superfamília IBM Plex, pelas três variantes compartilharem métrica e por
conviverem com notação matemática sem brigar:

- **IBM Plex Sans** — interface, navegação, botões.
- **IBM Plex Serif** — corpo das notas e face dos cards. Convive com KaTeX.
- **IBM Plex Mono** — código, sintaxe de card, nada além disso.

Escala: 13 / 15 / 17 / 21 / 28 / 38 px. Corpo de nota a 17px com `line-height`
1,65 e medida máxima de 68 caracteres. KaTeX herda o tamanho do corpo.

### Layout

```
┌──────────┬──────────────────────────────────┬──────────┐
│  rail    │   coluna de leitura (68ch)       │  cards   │
│  cursos  │                                  │  da nota │
│  módulos │   nota em serif, LaTeX inline    │  na      │
│  aulas   │                                  │  margem  │
└──────────┴──────────────────────────────────┴──────────┘
```

Rail à esquerda colapsável. Coluna central alinhada à esquerda, nunca
justificada — texto justificado com fórmulas inline abre rios. Margem direita
mostra os cards gerados pelo trecho visível; some abaixo de 1100px.

**O modo revisão é a exceção deliberada.** Em `/review` o rail e a margem
desaparecem: um card centrado num campo de papel, pergunta em 28px, nada mais na
tela além dos quatro botões. É o único momento ousado da interface, e por isso
todo o resto permanece quieto.

### Movimento

Só responde a ação do usuário: virar o card, expandir um módulo, confirmar uma
gravação. Nada de entrada em fade-and-slide por seção, nada de transição em
hover de card. `prefers-reduced-motion` respeitado.

### Piso de qualidade

Responsivo até 375px. Foco de teclado sempre visível. A fila de revisão é
inteiramente operável por teclado: `espaço` revela, `1`–`4` avalia, `u` desfaz.
Contraste mínimo 4.5:1 em todo texto.

### Escrita de interface

Português, voz ativa, frase capitalizada. O botão diz o que acontece. Tela vazia
é convite à ação, não lamento: em `/review` sem fila, "Nada vence hoje. Próxima
revisão em 2 dias." — com link para estudar adiantado. Erro diz o que houve e
como resolver, sem pedir desculpa.

## 7. Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js, App Router, TypeScript strict |
| Banco | Postgres no Neon |
| ORM | Drizzle + drizzle-kit + drizzle-zod |
| Estilo | Tailwind + shadcn/ui |
| Markdown | react-markdown + remark-math + rehype-katex + remark-gfm |
| Agendamento | ts-fsrs |
| Teste | Vitest |
| Deploy | Vercel |
| Auth | Auth.js, provider único — **última fatia** |

Dependência fora desta lista exige pergunta antes de instalar.

## 8. Estrutura de pastas

```
src/
  app/                    rotas, layouts, páginas
  db/
    schema.ts             fonte única do schema
    index.ts              cliente Drizzle
  features/
    courses/              { queries, actions, components }
    notes/
    cards/
      parser.ts           puro — testado
      parser.test.ts
      reconcile.ts        puro — testado
      reconcile.test.ts
    review/
      scheduler.ts        puro — testado
      scheduler.test.ts
    tags/
  shared/                 só o que duas features já usam
drizzle/                  migrations versionadas
```
