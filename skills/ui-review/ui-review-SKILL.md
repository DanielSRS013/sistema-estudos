---
name: ui-review
description: Tokens visuais do projeto e checklist de autocrítica antes de dar qualquer interface por pronta. Use ao criar ou alterar componentes, páginas, estilos, ou ao revisar o resultado visual de uma fatia.
---

# Revisão de interface

A identidade visual vem do assunto: matemática e Python, lidos todo dia por uma
pessoa. O vocabulário é papel técnico e saída de plot — não dashboard SaaS.

## Tokens

Definidos uma vez em `globals.css`, espelhados no Tailwind. Nunca escreva hex
literal num componente.

```
--paper      #FCFCFA   fundo
--ink        #16202B   texto
--ink-soft   #5A6B7B   texto secundário
--rule       #DDE3E8   filetes, bordas
--accent     #31688E   links, foco, estado ativo
```

Escuro: `--paper #11171D`, `--ink #E8EDF1`, `--ink-soft #93A3B2`,
`--rule #2A353F`, `--accent #6FA4CC` — o accent clareia porque `#31688E` sobre
`#11171D` dá 3,0:1.

Não existe token de cor de erro. Erro se diz por borda, `role="alert"` e texto.

### As quatro cores de avaliação

Paradas do viridis, o colormap padrão do matplotlib — perceptualmente uniforme
e seguro para daltonismo:

```
again  #440154     hard  #31688E     good  #35B779     easy  #FDE725
```

São o único lugar do app com saturação alta, porque são o único lugar onde cor
carrega informação. O amarelo do Easy não passa contraste como cor de fonte:
use como preenchimento com `--ink` por cima. As quatro paradas são idênticas
nos dois temas — foram desenhadas para isso.

## Tipografia

IBM Plex Sans na interface, Serif no corpo das notas e na face dos cards, Mono
só em código, sintaxe de card e editor — metadado e caminho são Sans 13px em
`--ink-soft`, nunca Mono. Escala fechada 13 / 15 / 17 / 21 / 28 / 38px, no
Tailwind `xs sm base lg xl 2xl`, sem degrau nenhum fora dela. Corpo de nota a
17px, `line-height` 1,65, medida máxima 68 caracteres. Entrelinha não se escreve
à mão na classe: 1,65 é o degrau `leading-prose`, 1,45 mora em `.card-face`, 1,6
em `.note-prose pre`.

## Forma

Raio de 2px em tudo. Nenhuma sombra, nenhum gradiente, nenhum ícone decorativo:
▸ ▾ ↑ ↓ » entram como texto.

## Foco

Um idioma só, global, em `globals.css`:

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

Nenhum componente escreve receita de foco própria — nem `focus-visible:ring-*`,
nem `focus-visible:outline-*`, nem `focus-visible:border-*`. Anel de baixa
opacidade fica perto de 1,3:1 e não é foco visível; o filete sólido dá 5,4:1 no
claro e 6,7:1 no escuro. Componente vindo do registry do shadcn chega com o anel
fraco e com `outline-none`: tire os dois, ou o foco global não desenha.

## Layout

Rail à esquerda colapsável, coluna de leitura central, margem direita com os
cards da nota (some abaixo de 1100px). Texto alinhado à esquerda, **nunca
justificado** — fórmulas inline abrem rios em texto justificado.

`/review` é a exceção deliberada: sem rail, sem margem, card centrado, pergunta
em 28px, só os quatro botões. É o único momento ousado da interface. Por isso
todo o resto permanece quieto — não distribua ousadia por outras telas.

## Movimento

Só em resposta a ação do usuário: virar card, expandir módulo, confirmar
gravação. Nada de entrada fade-and-slide por seção, nada de transição em hover
de card. `prefers-reduced-motion` respeitado em tudo.

## Escrita

Português, voz ativa, frase capitalizada. O botão diz o que acontece, e o nome
da ação não muda no meio do fluxo. Tela vazia é convite à ação. Erro diz o que
houve e como resolver, sem pedir desculpa.

## Checklist antes de dar por pronto

Acessibilidade e robustez:
- [ ] funciona a 375px sem rolagem horizontal
- [ ] foco de teclado visível em todo elemento interativo, pelo idioma global
- [ ] nenhum `focus-visible:` fora de `globals.css`
- [ ] contraste ≥ 4.5:1 em todo texto, conferido — não estimado
- [ ] `prefers-reduced-motion` desliga toda animação não essencial
- [ ] a tela funciona nos dois temas

Intenção:
- [ ] nenhum hex literal fora dos tokens
- [ ] nenhum `text-[` nem `leading-[` em `className`: a escala tem seis degraus
- [ ] nenhum rótulo em caixa alta espaçada acima de título
- [ ] nenhum `→` colado no texto de link ou botão
- [ ] nenhuma numeração 01/02/03 em conteúdo que não é sequência
- [ ] nenhum card com sombra cinza padrão só para parecer elevado
- [ ] raio de 2px em tudo, sem segundo degrau inventado no componente
- [ ] hierarquia dita por tamanho, peso e filete — nunca por raio ou sombra
- [ ] estado vazio escrito com direção, não com lamento
- [ ] uma coisa memorável na tela, e o resto quieto em volta dela

Por último, o conselho de Chanel: olhe a tela pronta e remova um elemento.
Quase sempre há um que não serve ao que a pessoa veio fazer.
