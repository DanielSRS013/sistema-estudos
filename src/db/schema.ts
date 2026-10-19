// src/db/schema.ts
// Fonte única do schema. Toda alteração aqui exige `pnpm db:generate`,
// revisão do SQL gerado e aplicação num branch do Neon antes da main.

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ────────────────────────────── enums ────────────────────────────── */

export const cardKindEnum = pgEnum("card_kind", ["cloze", "qa"]);

// Espelha ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning
export const cardStateEnum = pgEnum("card_state", [
  "new",
  "learning",
  "review",
  "relearning",
]);

// Espelha ts-fsrs Rating: 1 Again, 2 Hard, 3 Good, 4 Easy
export const ratingEnum = pgEnum("rating", ["again", "hard", "good", "easy"]);

/* ──────────────────────── tipo auxiliar: tsvector ─────────────────── */

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

/* ────────────────────────────── cursos ───────────────────────────── */

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // especialização a que o curso pertence, ex.: "Mathematics for ML"
    track: text("track"),
    provider: text("provider"),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("courses_slug_idx").on(t.slug)],
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("modules_course_idx").on(t.courseId, t.position)],
);

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    // dia em que a aula foi efetivamente estudada
    studiedOn: timestamp("studied_on", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("lessons_module_idx").on(t.moduleId, t.position)],
);

/* ────────────────────────────── notas ────────────────────────────── */

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, ''))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notes_lesson_idx").on(t.lessonId),
    index("notes_search_idx").using("gin", t.searchVector),
  ],
);

/* ─────────────────────────────── cards ───────────────────────────── */

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "restrict" }),

    kind: cardKindEnum("kind").notNull(),
    // chave de reconciliação — ver SPEC §3.4
    anchorKey: text("anchor_key").notNull(),
    // posição ordinal dentro da nota, usada no casamento por similaridade
    ordinal: integer("ordinal").notNull(),

    prompt: text("prompt").notNull(),
    answer: text("answer").notNull(),
    hint: text("hint"),

    /* estado FSRS — nomes alinhados a ts-fsrs */
    due: timestamp("due", { withTimezone: true }).notNull().defaultNow(),
    stability: doublePrecision("stability").notNull().default(0),
    difficulty: doublePrecision("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    state: cardStateEnum("state").notNull().default("new"),
    lastReview: timestamp("last_review", { withTimezone: true }),

    suspended: boolean("suspended").notNull().default(false),
    // soft delete: card some da fila mas o histórico sobrevive.
    // NUNCA apague uma linha desta tabela.
    archivedAt: timestamp("archived_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("cards_note_anchor_idx").on(t.noteId, t.anchorKey),
    // índice da fila: só o que pode ser revisado
    index("cards_queue_idx")
      .on(t.due)
      .where(sql`${t.archivedAt} is null and ${t.suspended} = false`),
    index("cards_note_idx").on(t.noteId, t.ordinal),
  ],
);

/* ───────────────────────────── revisões ──────────────────────────── */
// Append-only. Nenhum caminho do app faz UPDATE ou DELETE aqui.

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "restrict" }),

    rating: ratingEnum("rating").notNull(),
    // estado do card ANTES desta revisão
    stateBefore: cardStateEnum("state_before").notNull(),
    stabilityBefore: doublePrecision("stability_before").notNull(),
    difficultyBefore: doublePrecision("difficulty_before").notNull(),
    // resultado desta revisão
    scheduledDays: integer("scheduled_days").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    dueAfter: timestamp("due_after", { withTimezone: true }).notNull(),
    // milissegundos entre revelar e avaliar
    durationMs: integer("duration_ms"),

    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("reviews_card_idx").on(t.cardId, t.reviewedAt),
    index("reviews_date_idx").on(t.reviewedAt),
  ],
);

/* ─────────────────────────────── tags ────────────────────────────── */

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)],
);

export const noteTags = pgTable(
  "note_tags",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.tagId] }),
    index("note_tags_tag_idx").on(t.tagId),
  ],
);

/* ──────────────────────────── relations ──────────────────────────── */

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  notes: many(notes),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [notes.lessonId],
    references: [lessons.id],
  }),
  cards: many(cards),
  noteTags: many(noteTags),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  note: one(notes, { fields: [cards.noteId], references: [notes.id] }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  card: one(cards, { fields: [reviews.cardId], references: [cards.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  noteTags: many(noteTags),
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, { fields: [noteTags.noteId], references: [notes.id] }),
  tag: one(tags, { fields: [noteTags.tagId], references: [tags.id] }),
}));

/* ─────────────────────────── tipos inferidos ─────────────────────── */

export type Course = typeof courses.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Tag = typeof tags.$inferSelect;

export type NewNote = typeof notes.$inferInsert;
export type NewCard = typeof cards.$inferInsert;
export type NewReview = typeof reviews.$inferInsert;
