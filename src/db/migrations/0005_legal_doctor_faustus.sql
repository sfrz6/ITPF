ALTER TABLE "championships" ADD COLUMN "organizer_logo" "bytea";--> statement-breakpoint
ALTER TABLE "championships" ADD COLUMN "organizer_logo_content_type" text;--> statement-breakpoint
ALTER TABLE "championships" ADD COLUMN "championship_logo" "bytea";--> statement-breakpoint
ALTER TABLE "championships" ADD COLUMN "championship_logo_content_type" text;--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_organizer_logo_check" CHECK (("championships"."organizer_logo" is null) = ("championships"."organizer_logo_content_type" is null));--> statement-breakpoint
ALTER TABLE "championships" ADD CONSTRAINT "championships_championship_logo_check" CHECK (("championships"."championship_logo" is null) = ("championships"."championship_logo_content_type" is null));