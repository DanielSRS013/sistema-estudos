import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { db } from "@/db";
import { notes, tags } from "@/db/schema";
import { semearAula, semearCard, semearNota } from "@/shared/test-seed";

import { getTagBySlug, sugerirConceito } from "./queries";
import { planTags, tagWrites } from "./sync";

const sufixo = (): string => randomUUID().slice(0, 8);

async function gravar(noteId: string, content: string) {
  const plano = await planTags(noteId, content);
  const [primeira, ...resto] = tagWrites(noteId, plano);
  if (primeira) await db.batch([primeira, ...resto]);
}

describe("leitura por conceito", () => {
  it("getTagBySlug traz as notas que citam o conceito", async () => {
    const s = sufixo();
    const { lessonId, courseSlug } = await semearAula({
      courseTitle: `Curso ${s}`,
      moduleTitle: `Módulo ${s}`,
      lessonTitle: `Aula ${s}`,
    });
    const citada = await semearNota(lessonId, {
      title: `Cita ${s}`,
      kind: "summary",
    });
    const outra = await semearNota(lessonId, { title: `Cita também ${s}` });
    const alheia = await semearNota(lessonId, { title: `Alheia ${s}` });

    await gravar(citada.noteId, `Texto com #detalhe-${s}.`);
    await gravar(outra.noteId, `Também #detalhe-${s}.`);
    await gravar(alheia.noteId, `Sobre #outro-${s}.`);

    // Datas fixadas antes: a mais recente vem primeiro.
    const antiga = new Date("2026-01-01T10:00:00Z");
    const recente = new Date("2026-02-01T10:00:00Z");
    await db
      .update(notes)
      .set({ updatedAt: antiga })
      .where(eq(notes.id, citada.noteId));
    await db
      .update(notes)
      .set({ updatedAt: recente })
      .where(eq(notes.id, outra.noteId));

    const card = await semearCard(citada.noteId, {
      prompt: `P ${s}`,
      answer: `R ${s}`,
    });

    const detalhe = await getTagBySlug(`detalhe-${s}`);
    const path = `Curso ${s} · Módulo ${s} · Aula ${s}`;

    expect(detalhe?.slug).toBe(`detalhe-${s}`);
    expect(detalhe?.name).toBe(`detalhe-${s}`);
    expect(detalhe?.notes).toEqual([
      {
        id: outra.noteId,
        title: `Cita também ${s}`,
        kind: "lesson_note",
        updatedAt: recente,
        lessonId,
        path,
        courseSlug,
      },
      {
        id: citada.noteId,
        title: `Cita ${s}`,
        kind: "summary",
        updatedAt: antiga,
        lessonId,
        path,
        courseSlug,
      },
    ]);
    // O card herda o conceito da nota; a nota alheia não entra.
    expect(detalhe?.cards.map((c) => c.id)).toEqual([card.cardId]);
    expect(detalhe?.cards[0]?.prompt).toBe(`P ${s}`);
    expect(detalhe?.cards[0]?.note).toEqual({
      id: citada.noteId,
      title: `Cita ${s}`,
    });
  });

  it("getTagBySlug devolve null para slug sem tag", async () => {
    expect(await getTagBySlug(`inexistente-${sufixo()}`)).toBeNull();
  });

  it("getTagBySlug devolve tag sem notas com listas vazias", async () => {
    const s = sufixo();
    await db.insert(tags).values({ slug: `orfa-${s}`, name: `Órfã ${s}` });

    expect(await getTagBySlug(`orfa-${s}`)).toEqual({
      slug: `orfa-${s}`,
      name: `Órfã ${s}`,
      notes: [],
      cards: [],
    });
  });

  it("sugerirConceito acha o conceito próximo e devolve null quando não há", async () => {
    const s = sufixo();
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    await gravar(noteId, `Veja #projecao-${s}-vetorial.`);

    // Termo digitado com acento e caixa: o slug do conceito casa.
    expect(await sugerirConceito(`Projeção ${s}`)).toBe(
      `projecao-${s}-vetorial`,
    );
    expect(await sugerirConceito(`zzz${s}`)).toBeNull();
    expect(await sugerirConceito("   ")).toBeNull();

    // Tag sem nota vinculada existe mas não é oferecida.
    await db.insert(tags).values({ slug: `solta-${s}`, name: `solta-${s}` });
    expect(await sugerirConceito(`solta-${s}`)).toBeNull();
  });
});
