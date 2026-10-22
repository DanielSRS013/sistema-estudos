CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- `unaccent(text)` é STABLE (resolve o dicionário em tempo de execução), e o
-- Postgres recusa coluna gerada sobre expressão não imutável. A forma de duas
-- entradas, com o dicionário explícito, é IMMUTABLE — este invólucro é o que as
-- colunas geradas abaixo e o lado do termo da consulta usam.
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;--> statement-breakpoint
DROP INDEX IF EXISTS "notes_search_idx";--> statement-breakpoint
ALTER TABLE "notes" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', immutable_unaccent(coalesce(title, '') || ' ' || coalesce(content, '')))) STORED;--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "notes" USING gin ("search_vector");--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('portuguese', immutable_unaccent(coalesce(prompt, '') || ' ' || coalesce(answer, '')))) STORED;--> statement-breakpoint
CREATE INDEX "cards_search_idx" ON "cards" USING gin ("search_vector");
