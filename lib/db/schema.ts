import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer, boolean, jsonb, numeric, date, unique, index, pgEnum
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
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
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
export const appointmentStatusEnum = pgEnum('appointment_status', ['confirmed', 'reconfirmed', 'cancelled', 'attended']);
export const patientTypeEnum = pgEnum('patient_type', ['primera_vez', 'control']);
export const waitingListStatusEnum = pgEnum('waiting_list_status', ['waiting', 'notified', 'booked', 'expired']);

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
  name: varchar('name', { length: 255 }).notNull(),
  teamId: integer('team_id').references(() => teams.id).unique(),
  systemPrompt: text('system_prompt').notNull(),
  temperature: numeric('temperature', { precision: 2, scale: 1 }).default('0.7'),
  createdAt: timestamp('created_at').defaultNow(),
});

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

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id),
  locationId: integer('location_id').references(() => teamAddresses.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  serviceType: varchar('service_type', { length: 50 }),
  status: appointmentStatusEnum('status').default('confirmed'),
  googleCalendarEventId: varchar('google_calendar_event_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
  teamId: integer('team_id').references(() => teams.id),
}, (table) => [
  index('idx_appointments_team_time').on(table.teamId, table.startTime)
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
export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

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
