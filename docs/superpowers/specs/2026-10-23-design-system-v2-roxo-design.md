# Design system — v2-roxo

Data: 2026-10-23 · Projeto: `projeto-estudos` · Estado: **spec aprovado em
conversa, aguardando revisão escrita**

Este documento define o design system que passa a valer para a aplicação, em
substituição à direção visual da v1 (`design_handoff_estudos/Estudos.dc.html`).
Ele é derivado do fork `Estudos v2.dc.html` — direção mais acolhedora, cartões
sobre papel quente, gráficos, cronômetro, planejamento semanal — com a paleta
reancorada em **roxo** e com as decisões que o fork deixou em aberto fechadas
aqui.

Nada em `src/` muda por este documento. Ele é o insumo do plano de
implementação, que vem depois.

---

## 1. Por que este documento existe

O `README.md` do pacote de design diz que a direção visual da v2 **não está
definida** e que a v1 segue como referência final; o `PLAN.md:28-32` repete isso
e registra que nenhuma fatia 13–26 olha para a v2. Este spec encerra esse estado
provisório: **a v2-roxo passa a ser a referência final.**

Consequências diretas, assumidas:

- `SPEC.md` §6 é reescrito no commit que aplica os tokens.
- `src/app/globals.test.ts` (1.126 linhas, 226 asserções) trava hoje o desenho
  da v1 — raio de 2px sem hierarquia, ausência de sombra, serifada no corpo da
  nota, cada tamanho de cada `h1`. Esse arquivo é **substituído**, não editado.
- As fatias 13–26 do `PLAN.md` existem para alinhar o código à v1. Elas são
  reavaliadas uma a uma contra este spec, não apagadas.

O que a v2 traz de **feature** nova (cronômetro e sessões de estudo, ciclo
semanal, tela de números, meta diária) continua sendo feature nova e **não** faz
parte deste spec. Aqui só se define a linguagem; as telas novas chegam depois,
com o sistema já pronto para elas.

---

## 2. As decisões, e o que cada uma custou

| # | Decisão | Alternativa recusada | Por quê |
|---|---|---|---|
| 1 | A v2-roxo é a referência final | Camada de tokens com telas depois; exploração sem código | Decisão do autor; é o único caminho que de fato muda o app |
| 2 | Roxo é a **marca**; os dados têm paleta própria | Roxo monocromático com rampa de luminosidade por matéria | Cor de dados e cor de interface têm trabalhos diferentes; misturá-las foi o erro central da v2 |
| 3 | Os **dois temas** continuam, desenhados juntos | Tema único claro, como a v2 | A Fatia 7 está entregue, o SPEC exige, e estudar à noite num bege claro cansa |
| 4 | Quatro papéis tipográficos | Duas famílias (v2); uma família variável | Cada família cobre um papel que nenhuma outra cobre — e metade do conteúdo é matemática |
| 5 | Serifada de leitura: **Literata** | Newsreader; Source Serif 4 | Desenhada para leitura longa em tela, e calma ao lado de uma display expressiva |
| 6 | Avaliação em **rampa quente ordenada** própria | Viridis da v1; semáforo da v2 | O `#440154` do viridis colide com uma marca roxa; o semáforo da v2 perde a ordem em P&B |
| 7 | Matiz da marca: **295** | 285 (v2); 305 | É o que se reconhece como roxo sem puxar para o azul nem para o magenta |
| 8 | Escuro em **carvão quase neutro** | Roxo profundo; azul-ardósia da v1 | Assimetria deliberada: de dia o par papel-quente/tinta-roxa, de noite sobriedade |
| 9 | O sistema tem `--ok` e `--alert` | Austeridade da v1 (sem cor de erro); só `--alert` | Salvar nota é dezenas de vezes por sessão; reconhecer "salvou" sem ler é ganho real |
| 10 | Pílula só na **ação** | Pílula em tudo (v2) | A forma passa a dizer "isto é um alvo" contra "isto é um dado" |
| 11 | No telefone, **aba inferior** | Barra no topo (SPEC §6) | Escolha do autor. Contraria o SPEC §6, que é reescrito; Números e Busca passam ao cabeçalho |
| 12 | **Quatro** séries de dados + "Outros" | Cinco frias com escuro facetado; cinco saindo do frio | Imposto pela validação (§7.2). Também escala: o 6º curso não quebra nada |

### 2.1 A assimetria do tema escuro, declarada

No claro, o sistema usa **papel quente com tinta roxa** — é o achado da v2 que
faz o conjunto parecer acolhedor em vez de clínico. No escuro, o matiz do
substrato é abandonado (croma 0.004–0.010).

Isso é intencional e não é descuido: o app tem duas personalidades, uma diurna
acolhedora e uma noturna sóbria. A identidade à noite é carregada pela marca
roxa, que continua presente em ação, foco e estado ativo.

### 2.2 A elevação muda de mecanismo entre os temas

No claro a hierarquia vem de **cartão branco + sombra** sobre papel bege. No
escuro não existe sombra: a hierarquia vem de **degraus de superfície**
(papel → cartão → cartão elevado), medidos em §4.3.

---

## 3. Camada 1 — Primitivas

Valores crus. **Nenhum componente referencia esta camada**; ela só alimenta a
camada 2. É o único lugar do código com cor literal.

### 3.1 Rampa da marca — matiz 295

| Passo | oklch | hex |
|---|---|---|
| 50 | `0.97 0.012 295` | `#f5f4fd` |
| 100 | `0.94 0.030 295` | `#ece8fe` |
| 200 | `0.88 0.060 295` | `#dad0fc` |
| 300 | `0.80 0.100 295` | `#c2b1f8` |
| 400 | `0.68 0.160 295` | `#a181ef` |
| **500** | `0.55 0.210 295` | `#7f4bdc` |
| 600 | `0.47 0.200 295` | `#6833bc` |
| 700 | `0.40 0.170 295` | `#522797` |
| 800 | `0.32 0.130 295` | `#3a1c6c` |
| 900 | `0.25 0.090 295` | `#261547` |

O croma sobe até o meio e cai nas pontas — é o que impede o 900 de virar
preto-violeta sujo e o 50 de virar cinza.

### 3.2 Neutras

Claro — papel quente (matiz 75), tinta roxa (matiz 300):

| Nome | oklch | hex |
|---|---|---|
| palco | `0.930 0.012 75` | `#ede7df` |
| papel | `0.975 0.007 75` | `#faf6f2` |
| superfície | — | `#ffffff` |
| filete | `0.890 0.012 75` | `#dfdad2` |
| filete fraco | `0.940 0.008 75` | `#eeeae5` |
| tinta fraca | `0.520 0.025 300` | `#6b6676` |
| tinta | `0.270 0.035 300` | `#292335` |

Escuro — carvão quase neutro (matiz 295, croma residual):

| Nome | oklch | hex |
|---|---|---|
| papel | `0.170 0.004 295` | `#0f0f11` |
| superfície | `0.250 0.005 295` | `#222124` |
| superfície elevada | `0.310 0.006 295` | `#303033` |
| filete | `0.345 0.010 295` | `#39383e` |
| filete fraco | `0.295 0.008 295` | `#2d2c30` |
| tinta fraca | `0.700 0.012 295` | `#9f9da5` |
| tinta | `0.940 0.006 295` | `#ebeaef` |

### 3.3 Categórica de dados — quatro séries + Outros

Matiz carrega identidade e **é a mesma nos dois temas**; só L e C mudam.

| Slot | Matiz | Claro | Escuro |
|---|---|---|---|
| `data-1` | 310 | `0.75 0.17 310` · `#cf8cfd` | `0.65 0.17 310` · `#af6ddb` |
| `data-2` | 260 | `0.55 0.13 260` · `#4270bd` | `0.49 0.13 260` · `#315ea9` |
| `data-3` | 190 | `0.70 0.11 190` · `#30b4ad` | `0.65 0.11 190` · `#10a49e` |
| `data-4` | 350 | `0.45 0.13 350` · `#87305f` | `0.49 0.19 350` · `#a7186f` |
| `data-other` | — | `0.80 0.010 75` · `#c2bdb7` | `0.42 0.008 295` · `#4d4c51` |

Lavagens, para trilho de barra e fundo de bloco:

| Slot | Claro | Escuro |
|---|---|---|
| `data-wash-1` | `0.95 0.035 310` · `#f6e8ff` | `0.31 0.050 310` · `#382943` |
| `data-wash-2` | `0.94 0.030 260` · `#e0ecff` | `0.30 0.050 260` · `#1f2e47` |
| `data-wash-3` | `0.95 0.030 190` · `#d9f5f3` | `0.30 0.045 190` · `#0b3533` |
| `data-wash-4` | `0.94 0.030 350` · `#fce3ee` | `0.30 0.050 350` · `#412331` |

### 3.4 Sequencial — magnitude, matiz da marca

Uma série só, então não há identidade a confundir com a marca.

| Passo | Claro | Escuro |
|---|---|---|
| 1 (menos) | `0.78 0.113 295` · `#bca9f8` | `0.48 0.181 295` · `#683eb6` |
| 2 | `0.66 0.164 295` · `#9b7aeb` | `0.57 0.202 295` · `#8454df` |
| 3 | `0.54 0.206 295` · `#7b49d6` | `0.66 0.164 295` · `#9b7aeb` |
| 4 | `0.42 0.155 295` · `#563397` | `0.75 0.126 295` · `#b49df5` |
| 5 (mais) | `0.30 0.105 295` · `#331e5c` | `0.84 0.088 295` · `#cec0ff` |

No escuro a rampa inverte o sentido: mais magnitude = mais claro.

### 3.5 Avaliação — rampa quente ordenada

**Idênticas nos dois temas**, e por isso o texto sobre elas também não inverte.

| Botão | oklch | hex | Texto | Contraste |
|---|---|---|---|---|
| De novo (1) | `0.42 0.14 25` | `#892122` | `#ffffff` | 9,11:1 |
| Difícil (2) | `0.58 0.15 45` | `#c0571e` | `#ffffff` | 4,54:1 |
| Bom (3) | `0.74 0.14 70` | `#e29936` | `#292335` | 6,38:1 |
| Fácil (4) | `0.88 0.12 90` | `#f6d476` | `#292335` | 10,53:1 |

O texto é literal e **não muda com o tema**: branco nos dois primeiros, `#292335`
nos dois últimos, inclusive no escuro — o fundo não inverte, então o texto
também não.

Luminosidade crescente: a ordem sobrevive em escala de cinza. **Nada mais no app
usa família quente**, o que torna os quatro botões inconfundíveis.

### 3.6 Feedback

| Slot | Claro | Escuro |
|---|---|---|
| `ok` | `0.70 0.14 155` · `#47b777` | `0.76 0.14 155` · `#5ccb89` |
| `ok-wash` | `0.94 0.045 155` · `#d5f5de` | `0.30 0.05 155` · `#173523` |
| `ok-deep` | `0.40 0.11 155` · `#13582c` | `0.86 0.10 155` · `#9be5b4` |
| `alert` | `0.55 0.18 25` · `#c53637` | `0.70 0.16 25` · `#f2716a` |
| `alert-wash` | `0.94 0.05 25` · `#ffdfda` | `0.30 0.06 25` · `#47211e` |
| `alert-deep` | `0.42 0.15 25` · `#8d1a1e` | `0.88 0.09 25` · `#ffc1ba` |

### 3.7 Não existe par divergente

Nenhum dado desta aplicação tem polaridade. Se aparecer, a decisão volta ao
brainstorm — não se improvisa um par divergente na hora.

---

## 4. Camada 2 — Tokens semânticos

A camada que o código consome. Cada token tem valor claro, valor escuro e uma
regra de uso. Fora desta lista não há cor.

### 4.1 Tabela

| Token | Claro | Escuro | Regra de uso |
|---|---|---|---|
| `--paper` | `#faf6f2` | `#0f0f11` | fundo da janela e do conteúdo |
| `--paper-sunken` | `#ede7df` | `= --paper` | trilho de barra, poço de segmentado, campo inerte |
| `--surface` | `#ffffff` | `#222124` | cartão — o contêiner padrão |
| `--surface-raised` | `#ffffff` + sombra 3 | `#303033` | só o que flutua: card da revisão, popover |
| `--ink` | `#292335` | `#ebeaef` | texto corrente e título |
| `--ink-soft` | `#6b6676` | `#9f9da5` | meta, caminho, rótulo — **nunca** texto longo |
| `--rule` | `#dfdad2` | `#39383e` | borda de controle e divisória |
| `--rule-soft` | `#eeeae5` | `#2d2c30` | filete entre linhas de lista dentro do cartão |
| `--brand` | `#7f4bdc` | `#ad8dfd` | botão primário, anel de foco, item ativo |
| `--brand-ink` | `#ffffff` | `#171226` | texto sobre `--brand` |
| `--brand-wash` | `#f0eaff` | `#302749` | fundo de nav ativa, chip, cabeçalho de curso |
| `--brand-deep` | `#543a8b` | `#d1c4fd` | texto e link sobre `--brand-wash` |
| `--data-1…4`, `--data-other` | §3.3 | §3.3 | **só** em marca de gráfico |
| `--data-wash-1…4` | §3.3 | §3.3 | trilho de barra, fundo de bloco do ciclo |
| `--seq-1…5` | §3.4 | §3.4 | magnitude de série única (heatmap) |
| `--rate-1…4` | §3.5 | idênticas | os 4 botões de `/review`, nada mais |
| `--rate-ink-1…4` | branco ×2, tinta ×2 | idênticas | o fundo não inverte, o texto também não |
| `--ok`, `--ok-wash`, `--ok-deep` | §3.6 | §3.6 | salvo; sessão registrada; progresso concluído |
| `--alert`, `--alert-wash`, `--alert-deep` | §3.6 | §3.6 | erro de sintaxe de card. Só isso |

`--brand` tem dois valores por necessidade, não por capricho: `#7f4bdc` sobre
`#222124` dá ~3:1 — ilegível. No escuro o botão primário **inverte** (fundo
claro, texto escuro); é o único jeito de ele seguir sendo o elemento mais forte
da tela sem brilhar.

### 4.2 Contrastes de texto medidos

Todos acima do piso de 4,5:1.

| Par | Claro | Escuro |
|---|---|---|
| `--ink` sobre `--paper` | 14,09:1 | 15,10:1 |
| `--ink` sobre `--surface` | 15,15:1 | 13,38:1 |
| `--ink-soft` sobre `--surface` | 5,54:1 | 5,98:1 |
| `--ink-soft` sobre `--surface-raised` | — | 4,91:1 |
| `--ink-soft` sobre `--paper-sunken` | 4,51:1 | — |
| `--brand-ink` sobre `--brand` | 5,33:1 | 6,96:1 |
| `--brand-deep` sobre `--brand-wash` | 7,61:1 | 8,61:1 |
| `--brand` sobre `--surface` (link) | 5,33:1 | 6,19:1 |
| `--ok-deep` sobre `--ok-wash` | 7,29:1 | 9,08:1 |
| `--alert-deep` sobre `--alert-wash` | 7,32:1 | 9,03:1 |

### 4.3 Degraus de superfície no escuro

| Par | Contraste |
|---|---|
| `--surface` vs `--paper` | 1,20:1 |
| `--surface-raised` vs `--surface` | 1,22:1 |

Esses dois números são o que substitui a sombra. A primeira tentativa de
substrato ficou em 1,11:1 — degrau invisível — e os valores foram reescalonados
até os atuais. **Se alguém mexer no substrato escuro, estes dois contrastes
precisam ser remedidos.**

---

## 5. Escalas fechadas

A v2 usa 14 tamanhos de texto e 14 raios, o que não é um sistema. Aqui fecha.
**Nenhum valor fora destas listas.**

### 5.1 Texto — 6 degraus

| px | Papel | Família |
|---|---|---|
| 12 | legenda de gráfico, atalho de tecla, rótulo em cartão | Figtree 600 |
| 13 | caminho, "editada há 2 h", ação pequena | Figtree 500 |
| 15 | botão, nav, rótulo de campo, linha de lista | Figtree 500/600 |
| 17 | corpo de nota, face de card, trecho de busca | **Literata 400** |
| 21 | título de cartão | Bricolage 700 |
| 28 | título de nota; `h1` no telefone; pergunta da revisão | Bricolage 700 / Literata 500 |

### 5.2 Display — 3 degraus

| px | Papel |
|---|---|
| 36 | `h1` de página |
| 48 | numeral de destaque ("34 vencem") |
| 60 | relógio do cronômetro no desktop |

Sempre Bricolage Grotesque, e `font-variant-numeric: tabular-nums` quando é
número. Os tamanhos improvisados da v2 — 14, 19, 24, 32, 40 — caem todos: 19→17,
24→21, 32 e 40→36. Nenhuma tela perde hierarquia.

### 5.3 Famílias

| Família | Papel |
|---|---|
| Bricolage Grotesque | display: `h1`, `h2` de cartão, numeral grande |
| Figtree | interface: botão, rótulo, meta, nav, tabela |
| **Literata** | leitura: corpo de nota, face de card, pergunta da revisão |
| JetBrains Mono | código, sintaxe de card, textarea do editor |
| KaTeX | matemática — vem com o conteúdo, não se negocia |

Cinco na prática. A fronteira é simples: **se você está lendo, é Literata; se
está operando, é Figtree.** Carregadas por `next/font` com `display: swap`.

### 5.4 Raio — 6 degraus

| px | Onde |
|---|---|
| 6 | chip pequeno, código inline, `<mark>` |
| 10 | botão retangular, input, badge, ação de linha |
| 14 | bloco dentro de cartão (alerta, bloco do ciclo) |
| 20 | cartão |
| 28 | cartão grande: revisão, nota, cabeçalho de curso |
| 999 | pílula e círculo: botão de ação, anel, ponto |

**A regra importa mais que a lista:** o raio acompanha o *tamanho do contêiner*.
Raio não é ênfase, não é hierarquia, não é estado.

### 5.5 Elevação — 4 degraus

| Nível | Claro | Escuro |
|---|---|---|
| 0 | nenhuma | `--surface` |
| 1 | `0 1px 2px rgba(41,35,53,.07)` | `--surface` |
| 2 | `0 1px 2px rgba(41,35,53,.05), 0 6px 20px rgba(41,35,53,.045)` | `--surface` |
| 3 | `0 2px 6px rgba(41,35,53,.06), 0 14px 36px rgba(41,35,53,.07)` | `--surface-raised` |

A sombra é sempre da tinta, nunca preta. **No escuro não existe sombra alcançável
em nenhum componente** — isso é testado (§8, trava 4).

### 5.6 Espaço — 11 degraus

`2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`

Os quase-pares da v2 (10, 14, 18, 22, 26) saem; padding de cartão a 22px passa a
20 ou 24. A escala padrão do Tailwind cobre tudo o que resta.

---

## 6. Camada 3 — Receitas de componente

Cada receita define anatomia, medidas, os dois temas, foco e desabilitado.

### 6.1 Botão

Três variantes × três tamanhos × quatro estados.

- **Primário** — `--brand` / `--brand-ink`, peso 700, raio 999.
- **Secundário** — `--surface` + 1px `--rule`, peso 600, raio 999.
- **Fantasma** — `--brand-deep`, sem fundo, peso 700.

Tamanhos: **52px** (ação única da tela: "Mostrar resposta", "Pausar" do
cronômetro), **44px** (padrão, e o mínimo de toque), **32px** (só dentro de
linha de lista, e só com rótulo curto).

Desabilitado: opacidade 0,38 e `cursor: not-allowed`. Nenhuma cor nova.

### 6.2 Forma: pílula só na ação

Pílula (999) é reservada ao que **se clica para avançar**: botão e chip de
filtro. Raio 10 para o que é **dado ou entrada**: input, select, badge de estado,
ação de linha (`Arquivar`, `↑`, `↓`). A forma diz "isto é um alvo" contra "isto
é um dado".

Exceção declarada: o campo de busca é pílula a 52px/17px — ele é o alvo
principal da própria tela, não um campo entre outros.

### 6.3 Foco — um idioma, em tudo

```css
:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px }
```

**Nenhum componente define o seu.** O `outline-offset` é o que faz o anel
funcionar igual em pílula e em retângulo. Testado (§8, trava 7).

### 6.4 Chip e badge

- **Chip de matéria** — `--data-wash-N` com texto em tom profundo da mesma
  matiz. É o único lugar da interface onde cor de dados aparece, e aparece porque
  o chip *é* a matéria.
- **Badge de estado do card** — **neutro**: `--paper-sunken` com texto `--ink`.
  Suspenso se distingue por **traço tracejado** em `--ink-soft`, que sobrevive em
  escala de cinza.
- **Filtro segmentado** — poço em `--paper-sunken`, pílula ativa em `--surface`
  com elevação 1.

Correção à v2, deliberada: a v2 colore o badge de estado por matiz (novo=azul,
revisão=verde). Isso gasta a paleta de dados dentro da interface **e** colide com
o filtro da busca, que usa as mesmas cores para "Nota" e "Card".

### 6.5 Campos

Input, select e textarea a 44px, 15px, raio 10, borda 1px `--rule`. Textarea do
editor em JetBrains Mono 15/1.65 sobre `--ink` invertido (painel escuro nos dois
temas), raio 14, `outline-offset: -4px`.

### 6.6 Avaliação

Grade de 4 colunas iguais, `gap: 8`, `min-height: 66`. Rótulo 15/700 e atalho
11/600 abaixo. Cores de §3.5.

Duas regras herdadas da v1 que ficam: **não mostrar intervalos previstos** nos
botões, e o rótulo é **"De novo"**, não "Errei" — ele descreve o que o botão faz
ao agendamento, não um julgamento sobre quem estuda.

### 6.7 Alerta

Raio 14, `--alert-wash` / `--alert-deep`, título 15/700 e corpo 13/400.

O texto é o da v1, palavra por palavra:

> **Linha N: essa lacuna está vazia, então o card não foi criado.**
> Coloque a resposta entre as chaves, como `{{resposta}}`, ou apague a marcação.
> O resto da nota já está salvo.

Diz a linha, mostra a forma certa, e garante que o resto salvou. A v2 reescreveu
e perdeu o "ou apague a marcação".

---

## 7. Gráficos

### 7.1 Procedimento

A forma vem da pergunta do dado; a cor vem depois; a paleta **se valida rodando**
o validador da skill `dataviz`, nunca no olho.

### 7.2 O que a validação impôs

A primeira paleta, escolhida à mão, **falhou**: um tom estourou o teto de
luminosidade, o teal caiu abaixo do piso de croma e virou cinza, e três pares
ficaram abaixo do piso de visão normal — que não se compra com rótulo direto.

A busca subsequente encontrou a restrição real: **cinco séries que passem todos
os pares nos dois temas não existem dentro da família fria.** O gomo frio tem
~170° úteis depois de reservar avaliação (15–100), `--ok` (155) e a marca (295),
e a banda escura só aceita L entre 0,48 e 0,67. Daí a decisão 12.

Resultados finais, todos com `--pairs all`:

| Rampa | Superfície | CVD ΔE | Visão normal ΔE | Veredito |
|---|---|---|---|---|
| Categórica, claro | `#ffffff` | 10,8 (deutan) · tritan 16,1 | 20,5 | passa |
| Categórica, escuro | `#222124` | 9,8 (deutan) · tritan 17,1 | 20,3 | passa |
| Sequencial, claro | `#ffffff` | — | — | passa; ponta clara 2,07:1 |
| Sequencial, escuro | `#222124` | — | — | passa; ponta junto à superfície 2,25:1 |

Em ambas as categóricas o validador emite **relevo de contraste**: duas séries
ficam abaixo de 3:1 contra o cartão (`#cf8cfd` 2,38 e `#30b4ad` 2,54 no claro;
`#315ea9` 2,52 e `#a7186f` 2,29 no escuro). Isso **não é dispensável** — é o que
torna obrigatórios o rótulo direto e a vista em tabela (§7.4).

### 7.3 Marcas

- **Barra empilhada** — gap de 2px entre segmentos (o papel aparece), ponta livre
  arredondada em 4px, base reta e ancorada. Total rotulado direto no topo, nunca
  cada segmento.
- **Barra com linha de meta** — linha 2px tracejada atrás das barras, rotulada na
  ponta. Série única ⇒ **sem legenda**; o título a nomeia. A marca destaca só os
  dias que batem a meta.
- **Barra horizontal de progresso** — trilho em `--data-wash-N`, valor à direita
  em `--ink-soft`, tabular.
- **Anel** — só para **um** valor contra uma meta: meta do dia, % do curso, bloco
  do cronômetro.
- **Numeral de destaque** — quando o dado não merece gráfico. Dois números não
  fazem um gráfico.
- **Heatmap** — sequencial de §3.4. **Dia sem estudo é célula neutra com filete
  de 1px, fora da rampa**: sem isso, "não estudei" e "ainda não aconteceu" viram
  a mesma cor.
- **Distribuição horizontal** — rótulo dentro do segmento quando cabe; abaixo de
  ~34px o valor sai e fica na legenda e no tooltip.
- **Blocos do ciclo** — largura ∝ minutos; feito = cor cheia, a fazer = lavagem,
  em andamento = cheia até o ponto **+ anel de 2px**. O estado não depende só da
  cor.
- **Constância de 7 dias** — estado binário, então não é cor de dados:
  preenchido = feito, anel tracejado = hoje em aberto, e o `✓` carrega o sentido
  sem a cor.

### 7.4 Obrigações

- **Tooltip em todo gráfico.** Alvo de hover cobrindo a coluna/célula inteira,
  não o pixel pintado. Ordem igual à da pilha, total no fim, valores tabulares.
  No telefone, o toque abre o mesmo conteúdo.
- **Vista em tabela em toda tela de gráfico**, pelo alternador "Gráfico ·
  Tabela". É a resposta ao relevo exigido pelo validador, e torna os números
  copiáveis.
- **Legenda sempre presente a partir de 2 séries**, e as até-4 também rotuladas
  direto. Identidade nunca por cor sozinha.
- **Textura** — hachura diagonal a 45°/135°, alternativa à matiz para impressão,
  daltonismo severo e `forced-colors`. Entra como parâmetro do sistema, desenhada
  quando a primeira tela de gráfico for implementada.

### 7.5 Proibições

Pesam tanto quanto as receitas:

1. Nunca dois eixos y no mesmo gráfico. Duas medidas de escala diferente = dois
   gráficos.
2. Nunca pizza ou rosca para composição.
3. Nunca uma 5ª matiz gerada para um 5º curso — ele entra em `--data-other`.
4. Nunca texto na cor da série. Valor, rótulo e legenda usam sempre tinta.
5. Nunca cor de avaliação ou de `--ok`/`--alert` dentro de um gráfico.
6. Nunca cor como pista única.

### 7.6 Atribuição de slot de cor

O slot `data-N` é atribuído ao curso **na criação** e não muda. Não é por ranking
de horas, não é por ordem alfabética, não é recalculado quando um filtro muda a
contagem de séries. Do 5º curso em diante, `--data-other`.

Cor segue a entidade, nunca a posição dela.

---

## 8. Casca

### 8.1 Rail (≥ 900px)

248px em ≥1100, 200px em 900–1099. `--surface` com borda direita 1px
`--rule-soft`. Marca (quadrado `--brand` + "estudos" em Bricolage 19/700), sete
itens de nav, rodapé com **tema** e **sair**.

Item ativo: `--brand-wash` + `--brand-deep` + peso 700 + `aria-current="page"`.
Contagem de revisão em `--brand`.

Recolhível a faixa de 48px pelo botão `»` (`aria-label="Expandir menu"`), e no
editor a 900–1099px ela **inicia** recolhida.

Duas correções à v2:

- A v2 põe um **ponto colorido por item do rail** com as matizes das matérias.
  Removido: quebra a regra de que cor de dados não entra em interface, e dá ao
  menu uma hierarquia falsa — nenhum item *é* uma matéria.
- A v2 **não tem lugar para o tema** (seu rodapé só traz "Você · Sair"). Como os
  dois temas ficam, o rodapé do SPEC volta.

### 8.2 Aba inferior (< 900px)

Cinco destinos: Início · Plano · **Estudar** (botão central elevado, 46px, raio
999, `--brand`, elevação 3) · Revisar · Cursos. Altura mínima 44px por item.

**Consequência assumida:** só cabem 5 dos 7 itens. **Números** e **Busca** passam
ao cabeçalho da tela, como botões-pílula a 32px. Isso contraria o `SPEC.md` §6
("rail vira barra no topo"), que é reescrito.

### 8.3 Faixas de largura

| Faixa | Rail | Padding | Nota |
|---|---|---|---|
| ≥ 1100px | 248px | 40/56/80 | duas colunas com a margem de cards |
| 900–1099px | 200px | 32/32/64 | margem vira seção no fim da nota; editor abre recolhido |
| < 900px | aba inferior | 20/16/56 | uma coluna; alvos ≥ 44px |

A v2 só desenha 1440 e 390; estas três faixas vêm do SPEC §6 e ficam, porque
notebook estreito e tablet existem.

### 8.4 Regras de contenção

`overflow-wrap: anywhere` na raiz; fórmula em display com `overflow-x: auto` no
próprio bloco; **nunca** rolagem horizontal de página. Num app cheio de LaTeX
isso não é detalhe.

### 8.5 Movimento

Movimento só em resposta a ação. Se animar, ≤150ms de opacidade, e respeitar
`prefers-reduced-motion`. Sem transição em hover — hover de link é sublinhado.

---

## 9. Travas

O sistema só é real se o código não puder divergir dele.

`globals.css` em três camadas, espelhando §3–§6: primitivas no `@theme`, tokens
semânticos em `:root` e `.dark`, receitas como utilitários.

`src/app/globals.test.ts` é **substituído**. As 226 asserções atuais travam a v1.
No lugar, oito varreduras da árvore:

1. Nenhum `#hex` nem `oklch()` em `.tsx` — cor só via token.
2. Nenhum tamanho de texto fora dos 9 degraus de §5.1–5.2.
3. Nenhum raio fora dos 6 de §5.4, nenhuma sombra fora dos 4 de §5.5.
4. Nenhuma sombra alcançável no tema escuro.
5. `--data-*` só em componente de gráfico; `--rate-*` só em `/review`; `--ok` e
   `--alert` só nos usos declarados em §4.1.
6. Os ΔE de §7.2 e os contrastes de §4.2–4.3 ficam **fixados como números**. Se
   alguém mexer num token, o teste cai dizendo qual par quebrou.
7. Nenhum componente define `outline` próprio.
8. Toda rota com gráfico expõe o alternador Gráfico · Tabela.

Travas 1–4 e 7 são varredura de texto sobre a árvore, no formato que as Fatias 12
e 13 já usam — Vitest, sem dependência nova (o `PLAN.md` registra no backlog que
plugin de tipografia e regra de ESLint exigiriam dependência, e por isso as
travas são teste).

---

## 10. O que muda em `SPEC.md` e `PLAN.md`

**`SPEC.md` §6** é reescrito no mesmo commit que aplica os tokens, pela regra já
vigente no projeto: onde o handoff dá número e a §6 cala, o handoff manda, e a §6
é atualizada junto. Além dos valores, muda de posição em dois pontos: a navegação
móvel passa a ser aba inferior (§8.2) e o tema escuro ganha mecanismo próprio de
elevação (§4.3).

**`PLAN.md`**: as fatias 13–26 existem para alinhar o código à v1 e são
reavaliadas uma a uma. Leitura preliminar, a confirmar no plano de implementação:

- Fatia 12 (entregue) e 13 sobrevivem, com valores novos.
- Fatias 14–22 mudam de alvo e mantêm a ordem: casca → revisão → painel → editor
  → nota → cursos → busca.
- Fatias 23–26 ficam como estão.

---

## 11. O que este spec não entrega

- **As features novas da v2.** Cronômetro e sessões de estudo, ciclo semanal,
  tela de números e meta diária exigem schema que não existe (sessões, questões e
  acertos, blocos de ciclo). Continuam no backlog.
- **As receitas de gráfico construídas.** Elas ficam especificadas (§7) e não
  implementadas, porque não há dado para alimentá-las. O sistema nasce completo;
  as telas novas chegam com ele pronto.
- **A textura** (§7.4), desenhada na primeira tela de gráfico.
- **O desenho tela a tela.** Este spec define a linguagem; a aplicação dela às 9
  telas existentes é o plano de implementação.

## 12. Riscos conhecidos

1. **Quatro famílias tipográficas, cinco com KaTeX.** É muito. A defesa é que
   cada uma cobre um papel que nenhuma outra cobre. Se o custo de carregamento
   incomodar, a saída honesta é cair para duas famílias — não ficar com quatro
   mal justificadas.
2. **Duas séries de dados abaixo de 3:1 em cada tema.** Mitigado por rótulo
   direto e vista em tabela, que por isso são obrigatórios e testados.
3. **A reescrita de `globals.test.ts`** é o maior item de trabalho não visível do
   projeto. 226 asserções saem; oito varreduras entram. Enquanto isso não fechar,
   o sistema não está travado.
4. **A aba inferior empurra dois destinos para o cabeçalho.** Se na prática
   Números e Busca ficarem difíceis de achar, a decisão 11 merece ser revista
   antes de as telas novas existirem.

## 13. Como revalidar

Os números de §7.2 vêm da skill `dataviz`:

```bash
# categórica, claro e escuro, todos os pares
node scripts/validate_palette.js "#cf8cfd,#4270bd,#30b4ad,#87305f" \
  --mode light --surface "#ffffff" --pairs all
node scripts/validate_palette.js "#af6ddb,#315ea9,#10a49e,#a7186f" \
  --mode dark  --surface "#222124" --pairs all

# sequencial, claro e escuro
node scripts/validate_palette.js "#bca9f8,#9b7aeb,#7b49d6,#563397,#331e5c" \
  --mode light --surface "#ffffff" --ordinal
node scripts/validate_palette.js "#683eb6,#8454df,#9b7aeb,#b49df5,#cec0ff" \
  --mode dark  --surface "#222124" --ordinal
```

Os mockups navegáveis de cada seção ficaram em
`.superpowers/brainstorm/<sessão>/content/` (ignorado pelo git): `primitivas`,
`tokens-semanticos`, `escala`, `componentes-controles`, `componentes-casca`,
`paleta-dados`, `marcas-grafico`.
