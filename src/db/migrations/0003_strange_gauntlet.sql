CREATE TABLE "qualification_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ar" text,
	"slug" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_series_championships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"championship_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qualification_series" ADD CONSTRAINT "qualification_series_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_series_championships" ADD CONSTRAINT "qualification_series_championships_series_id_qualification_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."qualification_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_series_championships" ADD CONSTRAINT "qualification_series_championships_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_series_slug_idx" ON "qualification_series" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "qualification_series_championships_unique_idx" ON "qualification_series_championships" USING btree ("series_id","championship_id");