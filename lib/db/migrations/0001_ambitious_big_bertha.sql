ALTER TABLE "teams" ADD COLUMN "plan_id" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "mp_plan_id";--> statement-breakpoint
ALTER TABLE "teams" DROP COLUMN "plan_name";