ALTER TABLE "cards" ADD COLUMN "learning_steps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "due_before" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "last_review_before" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "reps_before" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "lapses_before" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "learning_steps_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "elapsed_days_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "scheduled_days_before" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "undoes_review_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_undoes_review_id_reviews_id_fk" FOREIGN KEY ("undoes_review_id") REFERENCES "public"."reviews"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_undoes_idx" ON "reviews" USING btree ("undoes_review_id");