import {
    users,
    teams,
    teamMembers,
    activityLogs,
    invitations,
    teamAddresses,
    assistants,
    apiKeys,
    activeSessions,
    contacts,
    services,
    doctors,
    doctorsToServices,
    appointments,
    chatMessages,
    waitingList,
    appointmentStatusEnum,
    patientTypeEnum,
    waitingListStatusEnum,
    plans,
} from '@/lib/db/schema';

// -----------------------------------------------------------------------------
// Core Enums
// -----------------------------------------------------------------------------
export type AppointmentStatus = typeof appointmentStatusEnum.enumValues[number];
export type PatientType = typeof patientTypeEnum.enumValues[number];
export type WaitingListStatus = typeof waitingListStatusEnum.enumValues[number];

// -----------------------------------------------------------------------------
// Base Entities (Select)
// -----------------------------------------------------------------------------
export interface User extends Omit<typeof users.$inferSelect, never> { }
export interface Team extends Omit<typeof teams.$inferSelect, never> {
    plan?: Plan;
}
export interface TeamMember extends Omit<typeof teamMembers.$inferSelect, never> { }
export interface ActivityLog extends Omit<typeof activityLogs.$inferSelect, never> { }
export interface Invitation extends Omit<typeof invitations.$inferSelect, never> { }

export interface TeamAddress extends Omit<typeof teamAddresses.$inferSelect, never> { }
export interface Assistant extends Omit<typeof assistants.$inferSelect, never> { }
export interface ApiKey extends Omit<typeof apiKeys.$inferSelect, never> { }
export interface ActiveSession extends Omit<typeof activeSessions.$inferSelect, never> { }
export interface Contact extends Omit<typeof contacts.$inferSelect, never> { }
export interface Service extends Omit<typeof services.$inferSelect, never> { }
export interface Doctor extends Omit<typeof doctors.$inferSelect, never> { }
export interface DoctorToService extends Omit<typeof doctorsToServices.$inferSelect, never> { }
export interface Appointment extends Omit<typeof appointments.$inferSelect, never> { }
export interface ChatMessage extends Omit<typeof chatMessages.$inferSelect, never> { }
export interface WaitingList extends Omit<typeof waitingList.$inferSelect, never> { }
export interface Plan extends Omit<typeof plans.$inferSelect, never> { }
// -----------------------------------------------------------------------------
// Insert Interfaces (For object creation)
// -----------------------------------------------------------------------------
export interface NewUser extends Omit<typeof users.$inferInsert, never> { }
export interface NewTeam extends Omit<typeof teams.$inferInsert, never> { }
export interface NewTeamMember extends Omit<typeof teamMembers.$inferInsert, never> { }
export interface NewActivityLog extends Omit<typeof activityLogs.$inferInsert, never> { }
export interface NewInvitation extends Omit<typeof invitations.$inferInsert, never> { }

export interface NewTeamAddress extends Omit<typeof teamAddresses.$inferInsert, never> { }
export interface NewAssistant extends Omit<typeof assistants.$inferInsert, never> { }
export interface NewApiKey extends Omit<typeof apiKeys.$inferInsert, never> { }
export interface NewActiveSession extends Omit<typeof activeSessions.$inferInsert, never> { }
export interface NewContact extends Omit<typeof contacts.$inferInsert, never> { }
export interface NewService extends Omit<typeof services.$inferInsert, never> { }
export interface NewDoctor extends Omit<typeof doctors.$inferInsert, never> { }
export interface NewDoctorToService extends Omit<typeof doctorsToServices.$inferInsert, never> { }
export interface NewAppointment extends Omit<typeof appointments.$inferInsert, never> { }
export interface NewChatMessage extends Omit<typeof chatMessages.$inferInsert, never> { }
export interface NewWaitingList extends Omit<typeof waitingList.$inferInsert, never> { }

// -----------------------------------------------------------------------------
// Complex/Aggregated Types
// -----------------------------------------------------------------------------
export interface TeamDataWithMembers extends Team {
    teamMembers: (TeamMember & {
        user: Pick<User, 'id' | 'name' | 'email'>;
    })[];
}

// -----------------------------------------------------------------------------
// External Service Payloads
// -----------------------------------------------------------------------------

// N8N Fat Payload (Contexto total enviado al orquestador)
export interface FatPayload {
    assistantConfig: {
        assistantId: number;
        teamId: number;
        prompt: string;
        name: string;
        temperature: string | null;
    };
    contactInfo: {
        waId: string;
        contactId: number | null;
        name: string;
        isNewSession: boolean;
    };
    businessContext: {
        activeDoctors: Array<{
            id: number;
            name: string;
            specialty: string | null;
            services: Array<{
                id: number;
                name: string;
                price: string;
                durationMinutes: number | null;
            }>;
        }>;
        patientAppointments: Appointment[];
        teamAddresses: TeamAddress[];
    };
    userMessage: any; // Mensaje crudo de Meta
}
