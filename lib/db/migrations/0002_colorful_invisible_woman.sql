ALTER TABLE "doctors" ADD COLUMN "mp_access_token" text;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "mp_public_key" varchar(255);--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "mp_user_id" varchar(100);