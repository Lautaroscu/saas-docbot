ALTER TABLE "doctors" ADD COLUMN "google_refresh_token" text;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "calendar_status" varchar(20) DEFAULT 'disconnected';