import { describe, expect, it } from "vitest";

import { db } from "@/db";

import {
  semearAula,
  semearCard,
  semearNota,
  semearRevisao,
} from "./test-seed";

describe("semeadura", () => {
  it("monta a cadeia curso → módulo → aula e devolve os ids", async () => {
    const { courseId, moduleId, lessonId } = await semearAula();

    const aula = await db.query.lessons.findFirst({
      where: (l, { eq }) => eq(l.id, lessonId),
    });

    expect(aula?.moduleId).toBe(moduleId);
    const modulo = await db.query.modules.findFirst({
      where: (m, { eq }) => eq(m.id, moduleId),
    });
    expect(modulo?.courseId).toBe(courseId);
  });

  it("duas chamadas não colidem no slug do curso", async () => {
    const a = await semearAula();
    const b = await semearAula();

    expect(a.courseSlug).not.toBe(b.courseSlug);
  });

  it("semeia nota e card ligados à aula", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId, {
      content: "O {{teorema}} vale.",
    });
    const { cardId } = await semearCard(noteId, {
      due: new Date("2026-01-01T00:00:00Z"),
    });

    const card = await db.query.cards.findFirst({
      where: (c, { eq }) => eq(c.id, cardId),
    });
    expect(card?.noteId).toBe(noteId);
  });

  it("dois cards da mesma nota não colidem na âncora", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const a = await semearCard(noteId);
    const b = await semearCard(noteId);

    expect(a.cardId).not.toBe(b.cardId);
  });

  it("a revisão herda o estado atual do card e aceita sobrescritas", async () => {
    const { lessonId } = await semearAula();
    const { noteId } = await semearNota(lessonId);
    const due = new Date("2026-03-01T00:00:00Z");
    const { cardId } = await semearCard(noteId, { state: "review", due });

    const herdada = await semearRevisao(cardId);
    const r1 = await db.query.reviews.findFirst({
      where: (r, { eq }) => eq(r.id, herdada.reviewId),
    });
    expect(r1?.cardId).toBe(cardId);
    expect(r1?.stateBefore).toBe("review");
    expect(r1?.dueBefore.getTime()).toBe(due.getTime());
    expect(r1?.lastReviewBefore).toBeNull();

    const ultima = new Date("2026-02-01T00:00:00Z");
    const { reviewId } = await semearRevisao(cardId, {
      rating: "again",
      antes: { state: "learning", reps: 4, lastReview: ultima },
    });
    const r2 = await db.query.reviews.findFirst({
      where: (r, { eq }) => eq(r.id, reviewId),
    });
    expect(r2?.rating).toBe("again");
    expect(r2?.stateBefore).toBe("learning");
    expect(r2?.repsBefore).toBe(4);
    expect(r2?.lastReviewBefore?.getTime()).toBe(ultima.getTime());
    expect(r2?.dueBefore.getTime()).toBe(due.getTime());
  });
});
