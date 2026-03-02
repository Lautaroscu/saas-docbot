CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'reconfirmed', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."billing_strategy" AS ENUM('upfront_full', 'upfront_deposit', 'post_consultation');--> statement-breakpoint
CREATE TYPE "public"."patient_type" AS ENUM('primera_vez', 'control');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'partial', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."waiting_list_status" AS ENUM('waiting', 'notified', 'booked', 'expired');--> statement-breakpoint
CREATE TABLE "active_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"team_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "active_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"api_key" varchar(100) NOT NULL,
	"name" varchar(50),
	"is_active" boolean DEFAULT true,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer,
	"doctor_id" integer,
	"location_id" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"service_id" integer,
	"google_calendar_event_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"team_id" integer,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_link" text,
	CONSTRAINT "appointments_google_calendar_event_id_unique" UNIQUE("google_calendar_event_id")
);
--> statement-breakpoint
CREATE TABLE "assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"wa_phone_number_id" varchar(255) NOT NULL,
	"wa_verify_token" varchar(255),
	"system_prompt" text NOT NULL,
	"temperature" numeric(2, 1) DEFAULT '0.7',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "assistants_wa_phone_number_id_unique" UNIQUE("wa_phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"session_id" varchar(50) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"team_id" integer
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"selected_doctor_id" integer,
	"selected_service_id" integer,
	"selected_slot" timestamp with time zone,
	"status" varchar(50) DEFAULT 'IDLE' NOT NULL,
	"last_intent" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"team_id" integer,
	"phone" varchar(50) NOT NULL,
	"name" varchar(100),
	"last_name" varchar(100),
	"wa_id" text,
	"email" varchar(100),
	"status" varchar(20) DEFAULT 'lead',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"bot_status" varchar(20) DEFAULT 'ACTIVE',
	"pause_until" timestamp with time zone,
	CONSTRAINT "contacts_team_id_phone_key" UNIQUE("team_id","phone")
);
--> statement-breakpoint
CREATE TABLE "doctors" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"specialty" varchar(100),
	"google_calendar_id" varchar(255),
	"is_active" boolean DEFAULT true,
	"mp_access_token" text,
	"mp_public_key" varchar(255),
	"mp_user_id" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"billing_strategy" "billing_strategy" DEFAULT 'post_consultation' NOT NULL,
	"deposit_percentage" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "doctors_to_services" (
	"doctor_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "doctors_to_services_doctor_id_service_id_pk" PRIMARY KEY("doctor_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"invited_by" integer NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"appointment_id" integer,
	"contact_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS',
	"mp_payment_id" varchar(255),
	"mp_status" varchar(50),
	"mp_payment_type" varchar(50),
	"type" varchar(20) DEFAULT 'full',
	"created_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "payments_mp_payment_id_unique" UNIQUE("mp_payment_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"mp_plan_id" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration_minutes" integer DEFAULT 30,
	"is_active" boolean DEFAULT true,
	"requires_fasting" boolean DEFAULT false,
	"category" varchar(50),
	"slot_minutes" integer
);
--> statement-breakpoint
CREATE TABLE "team_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer,
	"name" varchar(100),
	"address" varchar(255) NOT NULL,
	"map_link" text,
	"business_hours" jsonb,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"mp_plan_id" text,
	"mp_preapproval_id" text,
	"billing_email" varchar(255),
	"plan_name" varchar(50),
	"subscription_status" varchar(20),
	"webhook_token" uuid DEFAULT gen_random_uuid(),
	CONSTRAINT "teams_mp_preapproval_id_unique" UNIQUE("mp_preapproval_id"),
	CONSTRAINT "teams_webhook_token_unique" UNIQUE("webhook_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waiting_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(30) NOT NULL,
	"patient_name" varchar(100),
	"patient_type" "patient_type",
	"preferred_date" date NOT NULL,
	"status" "waiting_list_status" DEFAULT 'waiting',
	"created_at" timestamp with time zone DEFAULT now(),
	"team_id" integer,
	"appointment_id" integer,
	"notified_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "active_sessions" ADD CONSTRAINT "active_sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_team_addresses_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."team_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_selected_doctor_id_doctors_id_fk" FOREIGN KEY ("selected_doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_selected_service_id_services_id_fk" FOREIGN KEY ("selected_service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_to_services" ADD CONSTRAINT "doctors_to_services_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctors_to_services" ADD CONSTRAINT "doctors_to_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_addresses" ADD CONSTRAINT "team_addresses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_key_lookup" ON "api_keys" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX "idx_wa_phone_id" ON "assistants" USING btree ("wa_phone_number_id");--> statement-breakpoint
CREATE INDEX "idx_chat_date" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_team_date" ON "chat_messages" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_lookup" ON "chat_messages" USING btree ("contact_id","session_id");--> statement-breakpoint
CREATE INDEX "idx_session_expiration" ON "chat_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_session_contact" ON "chat_sessions" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_dts_doctor" ON "doctors_to_services" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "idx_dts_service" ON "doctors_to_services" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_payments_mp_id" ON "payments" USING btree ("mp_payment_id");--> statement-breakpoint
CREATE INDEX "idx_payments_appointment" ON "payments" USING btree ("appointment_id");