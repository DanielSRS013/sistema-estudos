CREATE TYPE "public"."note_kind" AS ENUM('lesson_note', 'summary', 'solution');--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "kind" "note_kind" DEFAULT 'lesson_note' NOT NULL;