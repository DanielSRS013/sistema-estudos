-- O prelúdio das colunas geradas da busca: a extensão `unaccent` e o invólucro
-- IMMUTABLE que as colunas `search_vector` de `notes` e `cards` chamam.
--
-- Por que mora num arquivo à parte, e não só na migration 0005: o snapshot do
-- drizzle (drizzle/meta/*.json) guarda tabelas, colunas e índices, e não tem
-- onde guardar extensão nem função. Quem um dia refizer a linha de migrations
-- a partir do schema — um rebaseline — vai gerar o `GENERATED ALWAYS AS
-- (… immutable_unaccent(…))` sem nada que crie `immutable_unaccent`, e a
-- migration falha no meio: parte das tabelas criada, o resto não.
--
-- ENTÃO: num rebaseline, cole este arquivo no topo da primeira migration,
-- antes de qualquer `CREATE TABLE`. `src/db/unaccent.test.ts` confere que
-- alguma migration o contém, e falha se ele sumir.
--
-- As duas formas são idempotentes (`IF NOT EXISTS`, `OR REPLACE`), então colar
-- de novo num banco que já tem não quebra nada.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- `unaccent(text)` é STABLE (resolve o dicionário em tempo de execução), e o
-- Postgres recusa coluna gerada sobre expressão não imutável. A forma de duas
-- entradas, com o dicionário explícito, é IMMUTABLE — este invólucro é o que as
-- colunas geradas e o lado do termo da consulta usam.
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;
