ALTER TABLE "assistants" DROP CONSTRAINT "assistants_team_id_unique";--> statement-breakpoint
ALTER TABLE "assistants" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assistants" ADD COLUMN "wa_phone_number_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "assistants" ADD COLUMN "wa_verify_token" varchar(255);--> statement-breakpoint
ALTER TABLE "assistants" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
CREATE INDEX "idx_wa_phone_id" ON "assistants" USING btree ("wa_phone_number_id");--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_wa_phone_number_id_unique" UNIQUE("wa_phone_number_id");