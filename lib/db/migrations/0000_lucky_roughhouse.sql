CREATE TYPE "public"."appointment_status" AS ENUM('confirmed', 'reconfirmed', 'cancelled', 'attended');--> statement-breakpoint
CREATE TYPE "public"."patient_type" AS ENUM('primera_vez', 'control');--> statement-breakpoint
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
	"location_id" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"service_type" varchar(50),
	"status" "appointment_status" DEFAULT 'confirmed',
	"google_calendar_event_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"team_id" integer,
	CONSTRAINT "appointments_google_calendar_event_id_unique" UNIQUE("google_calendar_event_id")
);
--> statement-breakpoint
CREATE TABLE "assistants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"team_id" integer,
	"system_prompt" text NOT NULL,
	"temperature" numeric(2, 1) DEFAULT '0.7',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "assistants_team_id_unique" UNIQUE("team_id")
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
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_product_id" text,
	"plan_name" varchar(50),
	"subscription_status" varchar(20),
	CONSTRAINT "teams_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "teams_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
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
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_team_addresses_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."team_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistants" ADD CONSTRAINT "assistants_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_addresses" ADD CONSTRAINT "team_addresses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waiting_list" ADD CONSTRAINT "waiting_list_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_key_lookup" ON "api_keys" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX "idx_appointments_team_time" ON "appointments" USING btree ("team_id","start_time");--> statement-breakpoint
CREATE INDEX "idx_chat_date" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_team_date" ON "chat_messages" USING btree ("team_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_lookup" ON "chat_messages" USING btree ("contact_id","session_id");