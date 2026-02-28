CREATE TABLE "doctors" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"specialty" varchar(100),
	"google_calendar_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "doctors_to_services" (
	"doctor_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "doctors_to_services_doctor_id_service_id_pk" PRIMARY KEY("doctor_id","service_id")
);
--> statement-breakpoint
DROP INDEX "idx_appointments_team_time";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "doctor_id" integer;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_to_services" ADD CONSTRAINT "doctors_to_services_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_to_services" ADD CONSTRAINT "doctors_to_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dts_doctor" ON "doctors_to_services" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_dts_service" ON "doctors_to_services" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;