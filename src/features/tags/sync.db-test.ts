import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { noteTags, tags } from "@/db/schema";
import { semearAula, semearNota } from "@/shared/test-seed";

import { planTags, tagWrites } from "./sync";

const sufixo = (): string => randomUUID().slice(0, 8);

// O mesmo caminho da produção: planTags, db.batch(tagWrites) e releitura.
async function gravar(noteId: string, content: string) {
  const plano = await planTags(noteId, content);
  const [primeira, ...resto] = tagWrites(noteId, plano);
  if (primeira) await db.batch([primeira, ...resto]);
  return plano;
}

async function tagsComSlug(slug: string) {
  return db.query.tags.findMany({ where: eq(tags.slug, slug) });
}

async function vinculosDaNota(noteId: string) {
  return db
    .select({ slug: tags.slug, name: tags.name, tagId: tags.id })
    .from(noteTags)
    .innerJoin(tags, eq(noteTags.tagId, tags.id))
    .where(eq(noteTags.noteId, noteId));
}

describe("vínculo de tags", () => {
  it("primeiro #conceito cria a tag e o vínculo", async () => {
    const s = sufixo();
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    await gravar(noteId, `Veja o #conceito-${s} aqui.`);

    const linhas = await tagsComSlug(`conceito-${s}`);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.name).toBe(`conceito-${s}`);

    expect(await vinculosDaNota(noteId)).toEqual([
      { slug: `conceito-${s}`, name: `conceito-${s}`, tagId: linhas[0]?.id },
    ]);
  });

  it("tirar o conceito do texto desfaz o vínculo e mantém a linha em tags", async () => {
    const s = sufixo();
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);

    await gravar(noteId, `Sobre #saida-${s}.`);
    const antes = await tagsComSlug(`saida-${s}`);
    expect(antes).toHaveLength(1);
    expect(await vinculosDaNota(noteId)).toHaveLength(1);

    const plano = await gravar(noteId, "Agora sem conceito nenhum.");
    expect(plano.desvincular).toEqual([antes[0]?.id]);

    // Promessa 1: o vínculo sumiu.
    expect(await vinculosDaNota(noteId)).toEqual([]);
    // Promessa 2, oposta: a linha do conceito continua.
    const depois = await tagsComSlug(`saida-${s}`);
    expect(depois).toHaveLength(1);
    expect(depois[0]?.id).toBe(antes[0]?.id);
    expect(depois[0]?.name).toBe(`saida-${s}`);
  });

  it("conceito que já existe reusa a linha, sem duplicar slug", async () => {
    const s = sufixo();
    const { lessonId } = await semearAula();
    const a = await semearNota(lessonId);
    const b = await semearNota(lessonId);

    await gravar(a.noteId, `Primeira cita #reuso-${s}.`);
    const plano = await gravar(b.noteId, `Segunda cita #reuso-${s}.`);

    // A segunda gravação não planeja criar nada.
    expect(plano.criar).toEqual([]);

    const linhas = await tagsComSlug(`reuso-${s}`);
    expect(linhas).toHaveLength(1);

    const vinculos = await db.query.noteTags.findMany({
      where: eq(noteTags.tagId, linhas[0]?.id ?? ""),
    });
    expect(vinculos.map((v) => v.noteId).sort()).toEqual(
      [a.noteId, b.noteId].sort(),
    );
  });

  it("acento e caixa caem no mesmo slug, e vale a grafia da primeira ocorrência", async () => {
    const s = sufixo();
    const { lessonId } = await semearAula();
    const a = await semearNota(lessonId);
    const b = await semearNota(lessonId);

    // Na mesma nota: a primeira grafia do texto é o nome.
    await gravar(a.noteId, `Primeiro #Projeção-${s} e depois #projecao-${s}.`);

    const linhas = await tagsComSlug(`projecao-${s}`);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.name).toBe(`Projeção-${s}`);

    // Em outra nota, outra grafia reusa a linha e não troca o nome.
    await gravar(b.noteId, `Depois #PROJECAO-${s}.`);

    const depois = await tagsComSlug(`projecao-${s}`);
    expect(depois).toHaveLength(1);
    expect(depois[0]?.name).toBe(`Projeção-${s}`);

    expect(await vinculosDaNota(a.noteId)).toHaveLength(1);
    expect(await vinculosDaNota(b.noteId)).toEqual([
      { slug: `projecao-${s}`, name: `Projeção-${s}`, tagId: linhas[0]?.id },
    ]);
  });
});
