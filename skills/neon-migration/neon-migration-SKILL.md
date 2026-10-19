---
name: neon-migration
description: Procedimento obrigatório para qualquer alteração de schema do banco. Use ao editar src/db/schema.ts, ao gerar ou aplicar migrations, ou ao investigar divergência entre schema e banco.
---

# Migration no Neon

O banco guarda notas e histórico de revisão insubstituíveis. Uma migration mal
aplicada custa semanas de estudo. Este procedimento não tem atalho.

## Ordem

### 1. Edite o schema

Altere `src/db/schema.ts`. Nunca escreva SQL de migration à mão — ele é gerado.

### 2. Gere

```bash
pnpm db:generate
```

### 3. Revise o SQL gerado, linha por linha

Abra o arquivo novo em `drizzle/` e leia-o inteiro. Procure especificamente:

- `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`
- `ALTER COLUMN ... TYPE` sem `USING` — perde dados em conversão incompatível
- `SET NOT NULL` numa coluna com linhas existentes e sem default
- qualquer coisa tocando `cards` ou `reviews`
- `DROP CONSTRAINT` em foreign key

**Se encontrar qualquer item acima: pare e pergunte ao usuário antes de
prosseguir.** Mostre o SQL exato e diga o que se perde. Não assuma que foi
intencional só porque veio do schema que você mesmo escreveu.

### 4. Aplique num branch do Neon

```bash
neonctl branches create --name migration-<descrição-curta>
```

Aponte `DATABASE_URL` para a connection string do branch e aplique:

```bash
pnpm db:migrate
```

Se não conseguir criar o branch — CLI ausente, credencial faltando, limite do
plano — **pare e avise**. Não aplique direto na main como alternativa.

### 5. Verifique no branch

- `pnpm db:studio` e confira a estrutura resultante.
- Rode `pnpm check`.
- Se a migration transforma dados existentes, conte as linhas antes e depois e
  compare explicitamente.

### 6. Aplique na main

Só agora. Volte `DATABASE_URL` ao banco principal e rode `pnpm db:migrate`.

### 7. Limpe

```bash
neonctl branches delete migration-<descrição-curta>
```

### 8. Commite

O arquivo de migration e o `schema.ts` vão no **mesmo commit**. Nunca separados
— um schema sem a migration correspondente é um repositório que não reproduz.

## Proibido

- `drizzle-kit push` contra qualquer banco com dados. Serve só para protótipo
  descartável, e este projeto não tem nenhum.
- Editar um arquivo de migration já aplicado. Gere um novo que corrija.
- Apagar linha de `cards` ou `reviews` em migration de dados. Cards saem de
  circulação por `archived_at`; revisões nunca saem.

## Quando o schema e o banco divergem

Não resolva com `push` nem apagando migrations. Gere uma migration de correção
a partir do estado real, revise, e aplique pelo mesmo procedimento acima.
