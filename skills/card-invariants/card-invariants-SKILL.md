---
name: card-invariants
description: Garantias que o parser de cards e a reconciliação precisam preservar, com o checklist de teste correspondente. Use ao criar ou alterar parser.ts, reconcile.ts, o save de notas, ou ao investigar card com estado inesperado.
---

# Invariantes de card

Este é o único lugar do sistema onde um bug não faz barulho: tudo compila, tudo
renderiza, e semanas depois a fila de revisão está silenciosamente errada e o
histórico já se perdeu. Toda alteração aqui vem com teste no mesmo commit.

## As quatro garantias

**1. Editar o texto de um card preserva seu estado FSRS.**
Corrigir uma vírgula numa pergunta não pode zerar `reps`, `due`, `stability` ou
`lapses`. A reconciliação casa por `anchorKey` e, na falta, por posição ordinal
com similaridade de Levenshtein normalizada ≥ 0,8.

**2. Nenhuma edição de nota deleta um card.**
Trecho removido da nota → `archivedAt = now()`. Nunca `DELETE`. O card sai da
fila e some da interface, mas a linha e seu histórico permanecem.

**3. Restaurar o trecho reativa o card com histórico intacto.**
Como o card arquivado continua na tabela, o casamento por `anchorKey` o
reencontra. Desfazer um apagamento acidental devolve o estado completo, não um
card novo.

**4. `reviews` é append-only.**
Nenhum caminho do código faz `UPDATE` ou `DELETE` nessa tabela. O desfazer da
revisão grava um evento de reversão novo; a linha original fica.

## Pureza

`parser.ts` e `reconcile.ts` não importam banco, não importam React, não leem
relógio nem variável de ambiente. Assinaturas:

```ts
parse(markdown: string): ParsedCard[]
reconcile(existing: Card[], parsed: ParsedCard[]): ReconcileResult
```

Se precisar de `now`, receba como parâmetro. Isso é o que torna o teste trivial
e determinístico — não abra mão.

## Transação

Parse, reconcile e persistência acontecem numa transação única no save da nota.
Falhou qualquer parte, nada vale. Uma nota salva com cards meio reconciliados é
pior que uma nota não salva.

## Checklist de teste

Nenhuma alteração nestes módulos é aceita sem estes casos verdes.

Parser:
- [ ] cloze simples gera um card
- [ ] três lacunas numa linha geram três cards, cada um ocultando só a sua
- [ ] lacuna com dica após `::` separa resposta e dica corretamente
- [ ] LaTeX dentro da lacuna é preservado literalmente, sem reescape
- [ ] `Q::`/`A::` com resposta de várias linhas até a linha em branco
- [ ] bloco de código cercado contendo `{{...}}` e `Q::` → zero cards
- [ ] `\{{` escapado → zero cards, chaves literais permanecem no texto
- [ ] `{{}}` vazio → erro de validação retornado, não silêncio
- [ ] nota sem marcação alguma → zero cards, sem exceção lançada

Reconciliação:
- [ ] editar o prompt de um card revisado preserva `reps`, `due`, `stability`
- [ ] apagar o trecho marca `archivedAt`, não deleta a linha
- [ ] restaurar o trecho limpa `archivedAt` e devolve o estado anterior
- [ ] reordenar lacunas dentro da nota não embaralha estados entre cards
- [ ] dois cards com texto idêntico na mesma nota não colidem em `anchorKey`
- [ ] card novo em nota existente não toca no estado dos demais

## Verificação manual obrigatória

Testes verdes não bastam nesta área. Antes de dar a fatia por pronta:

1. Crie uma nota com três cards.
2. Revise todos, avaliando diferente em cada um.
3. Edite o texto de um deles e apague outro.
4. Confirme na interface: o editado manteve o contador, o apagado sumiu da fila,
   o terceiro não mudou.
5. Restaure o apagado e confirme que o histórico voltou.

Cole o resultado desse roteiro ao relatar a fatia.
