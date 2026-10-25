// Construtor de semeadura da suíte de banco. Escreve direto com Drizzle, sem
// passar por action. Não limpa nada: o isolamento vem do branch efêmero, que
// nasce vazio. Todo padrão omitido ganha sufixo aleatório, para que duas
// chamadas no mesmo arquivo não colidam nos índices únicos.

import { randomUUID } from "node:crypto";

import { db } from "@/db";
import { cards, courses, lessons, modules, notes, reviews } from "@/db/schema";

type CardState = "new" | "learning" | "review" | "relearning";

const sufixo = (): string => randomUUID().slice(0, 8);

export type OpcoesAula = {
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  track?: string;
};

export async function semearAula(opcoes: OpcoesAula = {}): Promise<{
  courseId: string;
  courseSlug: string;
  moduleId: string;
  lessonId: string;
}> {
  const s = sufixo();
  const courseSlug = `curso-${s}`;

  const [curso] = await db
    .insert(courses)
    .values({
      slug: courseSlug,
      title: opcoes.courseTitle ?? `Curso ${s}`,
      track: opcoes.track ?? null,
    })
    .returning({ id: courses.id });
  if (!curso) throw new Error("semearAula: o curso não foi criado.");

  const [modulo] = await db
    .insert(modules)
    .values({ courseId: curso.id, title: opcoes.moduleTitle ?? `Módulo ${s}` })
    .returning({ id: modules.id });
  if (!modulo) throw new Error("semearAula: o módulo não foi criado.");

  const [aula] = await db
    .insert(lessons)
    .values({ moduleId: modulo.id, title: opcoes.lessonTitle ?? `Aula ${s}` })
    .returning({ id: lessons.id });
  if (!aula) throw new Error("semearAula: a aula não foi criada.");

  return {
    courseId: curso.id,
    courseSlug,
    moduleId: modulo.id,
    lessonId: aula.id,
  };
}

export type OpcoesNota = {
  title?: string;
  content?: string;
  kind?: "lesson_note" | "summary" | "solution";
};

export async function semearNota(
  lessonId: string,
  opcoes: OpcoesNota = {},
): Promise<{ noteId: string }> {
  const [nota] = await db
    .insert(notes)
    .values({
      lessonId,
      title: opcoes.title ?? `Nota ${sufixo()}`,
      content: opcoes.content ?? "",
      kind: opcoes.kind ?? "lesson_note",
    })
    .returning({ id: notes.id });
  if (!nota) throw new Error("semearNota: a nota não foi criada.");
  return { noteId: nota.id };
}

export type OpcoesCard = {
  anchorKey?: string;
  ordinal?: number;
  kind?: "cloze" | "qa";
  prompt?: string;
  answer?: string;
  due?: Date;
  state?: CardState;
  suspended?: boolean;
  archivedAt?: Date | null;
  // O semeador não deriva estado FSRS a partir de `state`: isso seria
  // reimplementar o ts-fsrs aqui. Quem precisa de um card coerente diz o que
  // quer; o que omitir fica no padrão do schema (zero / null).
  fsrs?: Partial<{
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    learningSteps: number;
    elapsedDays: number;
    scheduledDays: number;
    lastReview: Date | null;
  }>;
};

export async function semearCard(
  noteId: string,
  opcoes: OpcoesCard = {},
): Promise<{ cardId: string }> {
  const s = sufixo();
  const fsrs = opcoes.fsrs ?? {};
  const [card] = await db
    .insert(cards)
    .values({
      ...fsrs,
      noteId,
      kind: opcoes.kind ?? "qa",
      anchorKey: opcoes.anchorKey ?? `ancora-${s}`,
      ordinal: opcoes.ordinal ?? 0,
      prompt: opcoes.prompt ?? `Pergunta ${s}`,
      answer: opcoes.answer ?? `Resposta ${s}`,
      due: opcoes.due,
      state: opcoes.state,
      suspended: opcoes.suspended,
      archivedAt: opcoes.archivedAt,
    })
    .returning({ id: cards.id });
  if (!card) throw new Error("semearCard: o card não foi criado.");
  return { cardId: card.id };
}

export type EstadoAntes = Partial<{
  state: CardState;
  stability: number;
  difficulty: number;
  due: Date;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  learningSteps: number;
  elapsedDays: number;
  scheduledDays: number;
}>;

export type OpcoesRevisao = {
  rating?: "again" | "hard" | "good" | "easy";
  reviewedAt?: Date;
  durationMs?: number | null;
  undoesReviewId?: string | null;
  // Descreve o estado gravado nas colunas `*Before` da linha de `reviews`. Não
  // atualiza o card, e a incoerência entre os dois é permitida de propósito: o
  // desfazer lê só as colunas `*Before`, e um teste precisa poder montar o par.
  antes?: EstadoAntes;
  // Resultado da revisão. `reviews` é append-only, então não há como corrigir
  // depois; o padrão (0, 0, dueBefore) é uma revisão que não reagenda nada.
  depois?: Partial<{
    scheduledDays: number;
    elapsedDays: number;
    dueAfter: Date;
  }>;
};

export async function semearRevisao(
  cardId: string,
  opcoes: OpcoesRevisao = {},
): Promise<{ reviewId: string }> {
  const card = await db.query.cards.findFirst({
    where: (c, { eq }) => eq(c.id, cardId),
  });
  if (!card) throw new Error(`semearRevisao: card ${cardId} não existe.`);

  const antes = opcoes.antes ?? {};
  const dueBefore = antes.due ?? card.due;

  const [revisao] = await db
    .insert(reviews)
    .values({
      cardId,
      rating: opcoes.rating ?? "good",
      stateBefore: antes.state ?? card.state,
      stabilityBefore: antes.stability ?? card.stability,
      difficultyBefore: antes.difficulty ?? card.difficulty,
      dueBefore,
      // `in` e não `??`: `lastReview: null` explícito é um valor, não omissão.
      lastReviewBefore:
        "lastReview" in antes ? (antes.lastReview ?? null) : card.lastReview,
      repsBefore: antes.reps ?? card.reps,
      lapsesBefore: antes.lapses ?? card.lapses,
      learningStepsBefore: antes.learningSteps ?? card.learningSteps,
      elapsedDaysBefore: antes.elapsedDays ?? card.elapsedDays,
      scheduledDaysBefore: antes.scheduledDays ?? card.scheduledDays,
      scheduledDays: opcoes.depois?.scheduledDays ?? 0,
      elapsedDays: opcoes.depois?.elapsedDays ?? 0,
      dueAfter: opcoes.depois?.dueAfter ?? dueBefore,
      durationMs: opcoes.durationMs ?? null,
      undoesReviewId: opcoes.undoesReviewId ?? null,
      reviewedAt: opcoes.reviewedAt,
    })
    .returning({ id: reviews.id });
  if (!revisao) throw new Error("semearRevisao: a revisão não foi criada.");
  return { reviewId: revisao.id };
}
