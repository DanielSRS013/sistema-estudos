CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"new_per_day" integer DEFAULT 20 NOT NULL,
	"reviews_per_day" integer DEFAULT 200 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 'default')
);
