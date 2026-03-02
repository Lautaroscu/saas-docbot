import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer, boolean, jsonb, numeric, date, unique, index, pgEnum,
  primaryKey,
  uuid
} from 'drizzle-orm/pg-core';

import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  planId: integer('plan_id').references(() => plans.id),
  mpPreapprovalId: text('mp_preapproval_id').unique(),
  billingEmail: varchar('billing_email', { length: 255 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  webhookToken: uuid('webhook_token').defaultRandom().unique(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});
export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  mpPlanId: text('mp_plan_id').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
});
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

// -----------------------------------------------------------------------------
// ENUMS
// -----------------------------------------------------------------------------
export const patientTypeEnum = pgEnum('patient_type', ['primera_vez', 'control']);
export const waitingListStatusEnum = pgEnum('waiting_list_status', ['waiting', 'notified', 'booked', 'expired']);
// 1. Estados del Turno (Logística)
export const appointmentStatusEnum = pgEnum('appointment_status', [
  'scheduled',   // Turno agendado pero no llegó el día
  'reconfirmed', // El bot le preguntó y el paciente confirmó asistencia
  'cancelled',   // Cancelado por alguna de las partes
  'attended',    // El paciente efectivamente fue a la consulta
  'no_show'      // El paciente faltó (Crítico para métricas de clínicas)
]);

// 2. Estados del Pago (Financiero)
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',     // Todavía no pagó nada
  'partial',     // Pagó una seña (deposit)
  'completed',   // Pagó el total
  'failed',      // El intento de pago falló
  'refunded'     // Se le devolvió el dinero
]);
export const billingStrategyEnum = pgEnum('billing_strategy', [
  'upfront_full',      // Pago 100% para confirmar
  'upfront_deposit',   // Seña (X%) para confirmar
  'post_consultation'  // Paga en el consultorio (o después)
]);

// -----------------------------------------------------------------------------
// TABLAS DE NEGOCIO (Consultorio y Bot)
// -----------------------------------------------------------------------------
export const teamAddresses = pgTable('team_addresses', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  name: varchar('name', { length: 100 }),
  address: varchar('address', { length: 255 }).notNull(),
  mapLink: text('map_link'),
  businessHours: jsonb('business_hours'),
  isActive: boolean('is_active').default(true),
});

export const assistants = pgTable('assistants', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  name: varchar('name', { length: 255 }).notNull(), // Ej: "Paola"
  waPhoneNumberId: varchar('wa_phone_number_id', { length: 255 }).notNull().unique(),
  waVerifyToken: varchar('wa_verify_token', { length: 255 }),

  systemPrompt: text('system_prompt').notNull(),
  temperature: numeric('temperature', { precision: 2, scale: 1 }).default('0.7'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_wa_phone_id').on(table.waPhoneNumberId)
]);

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  apiKey: varchar('api_key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 50 }),
  isActive: boolean('is_active').default(true),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_api_key_lookup').on(table.apiKey)
]);

export const activeSessions = pgTable('active_sessions', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  teamId: integer('team_id').references(() => teams.id),
  phone: varchar('phone', { length: 50 }).notNull(),
  name: varchar('name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  waId: text('wa_id'),
  email: varchar('email', { length: 100 }),
  status: varchar('status', { length: 20 }).default('lead'),
  metadata: jsonb('metadata').default({}),
  botStatus: varchar('bot_status', { length: 20 }).default('ACTIVE'),
  pauseUntil: timestamp('pause_until', { withTimezone: true }),
}, (table) => [
  unique('contacts_team_id_phone_key').on(table.teamId, table.phone)
]);

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer('duration_minutes').default(30),
  isActive: boolean('is_active').default(true),
  requiresFasting: boolean('requires_fasting').default(false),
  category: varchar('category', { length: 50 }),
  slotMinutes: integer('slot_minutes'),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  specialty: varchar('specialty', { length: 100 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  isActive: boolean('is_active').default(true),
  mpAccessToken: text('mp_access_token'),
  mpPublicKey: varchar('mp_public_key', { length: 255 }),
  mpUserId: varchar('mp_user_id', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  billingStrategy: billingStrategyEnum('billing_strategy').notNull().default('post_consultation'),
  depositPercentage: numeric('deposit_percentage', { precision: 5, scale: 2 }).default('0'),
});
export const doctorsToServices = pgTable('doctors_to_services', {
  doctorId: integer('doctor_id')
    .notNull()
    .references(() => doctors.id, { onDelete: 'cascade' }),
  serviceId: integer('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.doctorId, t.serviceId] }), // Clave primaria compuesta
  index('idx_dts_doctor').on(t.doctorId),
  index('idx_dts_service').on(t.serviceId)
]);

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id),
  doctorId: integer('doctor_id').references(() => doctors.id),
  locationId: integer('location_id').references(() => teamAddresses.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  serviceId: integer('service_id').references(() => services.id),
  googleCalendarEventId: varchar('google_calendar_event_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  teamId: integer('team_id').references(() => teams.id),
  status: appointmentStatusEnum('status').notNull().default('scheduled'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
  currentPaymentLink: text('payment_link'),
});
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  appointmentId: integer('appointment_id').references(() => appointments.id, { onDelete: 'cascade' }),
  contactId: integer('contact_id').references(() => contacts.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('ARS'),
  mpPaymentId: varchar('mp_payment_id', { length: 255 }).unique(),
  mpStatus: varchar('mp_status', { length: 50 }),
  mpPaymentType: varchar('mp_payment_type', { length: 50 }),
  type: varchar('type', { length: 20 }).default('full'),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata').default({}),
}, (table) => [
  index('idx_payments_mp_id').on(table.mpPaymentId),
  index('idx_payments_appointment').on(table.appointmentId)
]);
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').notNull().references(() => contacts.id),
  sessionId: varchar('session_id', { length: 50 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  teamId: integer('team_id').references(() => teams.id),
}, (table) => [
  index('idx_chat_date').on(table.createdAt),
  index('idx_chat_team_date').on(table.teamId, table.createdAt),
  index('idx_chat_lookup').on(table.contactId, table.sessionId)
]);


export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  contactId: integer("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  selectedDoctorId: integer("selected_doctor_id")
    .references(() => doctors.id, { onDelete: "set null" }),
  selectedServiceId: integer("selected_service_id")
    .references(() => services.id, { onDelete: "set null" }),
  selectedSlot: timestamp("selected_slot", { withTimezone: true }),
  status: varchar("status", { length: 50 }).notNull().default("IDLE"),
  lastIntent: varchar("last_intent", { length: 100 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index('idx_session_expiration').on(table.expiresAt),
  index('idx_session_contact').on(table.contactId)
]);
export const waitingList = pgTable('waiting_list', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 30 }).notNull(),
  patientName: varchar('patient_name', { length: 100 }),
  patientType: patientTypeEnum('patient_type'),
  preferredDate: date('preferred_date').notNull(),
  status: waitingListStatusEnum('status').default('waiting'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  teamId: integer('team_id').references(() => teams.id, { onDelete: 'cascade' }),
  appointmentId: integer('appointment_id').references(() => appointments.id), // CORRECCIÓN APLICADA: Agregada Foreign Key explícita
  notifiedAt: timestamp('notified_at'),
});
export const teamsRelations = relations(teams, ({ many, one }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  plan: one(plans, {
    fields: [teams.planId],
    references: [plans.id],
  }),
}));
export const plansRelations = relations(plans, ({ many }) => ({
  teams: many(teams),
}));


export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));
// RELACIONES (Drizzle Relations API)
export const doctorsRelations = relations(doctors, ({ many }) => ({
  services: many(doctorsToServices),
}));

export const servicesRelations = relations(services, ({ many }) => ({
  doctors: many(doctorsToServices),
  appointments: many(appointments),
}));

export const doctorsToServicesRelations = relations(doctorsToServices, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorsToServices.doctorId],
    references: [doctors.id],
  }),
  service: one(services, {
    fields: [doctorsToServices.serviceId],
    references: [services.id],
  }),
}));
// Relaciones de Sesiones de Chat
export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  team: one(teams, { fields: [chatSessions.teamId], references: [teams.id] }),
  contact: one(contacts, { fields: [chatSessions.contactId], references: [contacts.id] }),
  doctor: one(doctors, { fields: [chatSessions.selectedDoctorId], references: [doctors.id] }),
  service: one(services, { fields: [chatSessions.selectedServiceId], references: [services.id] }),
}));

// Relaciones de Citas
export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  contact: one(contacts, { fields: [appointments.contactId], references: [contacts.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
  team: one(teams, { fields: [appointments.teamId], references: [teams.id] }),
  location: one(teamAddresses, { fields: [appointments.locationId], references: [teamAddresses.id] }),
  payments: many(payments),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
}));

// Relaciones de Contactos
export const contactsRelations = relations(contacts, ({ many }) => ({
  appointments: many(appointments),
  chatMessages: many(chatMessages),
  chatSessions: many(chatSessions),
  payments: many(payments),
}));
// Relaciones de la tabla Payments
export const paymentsRelations = relations(payments, ({ one }) => ({
  team: one(teams, {
    fields: [payments.teamId],
    references: [teams.id],
  }),
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
  contact: one(contacts, {
    fields: [payments.contactId],
    references: [contacts.id],
  }),
}));

// Types are now exported centrally from @/types

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
