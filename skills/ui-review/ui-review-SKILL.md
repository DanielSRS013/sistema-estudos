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

Escuro: `--paper #11171D`, `--ink #E8EDF1`, demais ajustados por contraste.

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
só em código e sintaxe de card. Escala 13 / 15 / 17 / 21 / 28 / 38px. Corpo de
nota a 17px, `line-height` 1,65, medida máxima 68 caracteres.

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
- [ ] foco de teclado visível em todo elemento interativo
- [ ] contraste ≥ 4.5:1 em todo texto, conferido — não estimado
- [ ] `prefers-reduced-motion` desliga toda animação não essencial
- [ ] a tela funciona nos dois temas

Intenção:
- [ ] nenhum hex literal fora dos tokens
- [ ] nenhum rótulo em caixa alta espaçada acima de título
- [ ] nenhum `→` colado no texto de link ou botão
- [ ] nenhuma numeração 01/02/03 em conteúdo que não é sequência
- [ ] nenhum card com sombra cinza padrão só para parecer elevado
- [ ] mesmo `border-radius` em tudo? então a hierarquia não está sendo dita
- [ ] estado vazio escrito com direção, não com lamento
- [ ] uma coisa memorável na tela, e o resto quieto em volta dela

Por último, o conselho de Chanel: olhe a tela pronta e remova um elemento.
Quase sempre há um que não serve ao que a pessoa veio fazer.
