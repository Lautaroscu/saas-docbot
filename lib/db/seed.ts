import { db } from "@/lib/db/drizzle";
import {
  users,
  teams,
  teamMembers,
  assistants,
  services,
  doctors,
  doctorsToServices,
  contacts,
  appointments,
  payments,
  chatMessages,
  chatSessions,
  teamAddresses,
  waitingList,
  plans
} from "@/lib/db/schema";

import { addDays } from "date-fns";
import { randomUUID } from "crypto";

async function seed() {
  console.log("🌱 Seeding database...");

  // -------------------------
  // PLANS
  // -------------------------
  await db.insert(plans).values([
    {
      slug: 'inicial',
      name: 'Inicial',
      mpPlanId: 'preapproval_plan_id_1', // To be updated
      price: '35000.00',
      isActive: true,
    },
    {
      slug: 'especialista',
      name: 'Especialista',
      mpPlanId: 'preapproval_plan_id_2', // To be updated
      price: '65000.00',
      isActive: true,
    },
    {
      slug: 'institucional',
      name: 'Institucional',
      mpPlanId: 'preapproval_plan_id_3', // To be updated
      price: '110000.00',
      isActive: true,
    }
  ]);

  // -------------------------
  // USERS
  // -------------------------
  const [admin] = await db.insert(users).values({
    name: "Admin User",
    email: "admin@test.com",
    passwordHash: "hashed_password",
    role: "admin"
  }).returning();

  const [doctorUser] = await db.insert(users).values({
    name: "Dr. Strange",
    email: "doctor@test.com",
    passwordHash: "hashed_password",
    role: "doctor"
  }).returning();

  // -------------------------
  // TEAM
  // -------------------------
  const [team] = await db.insert(teams).values({
    name: "Clínica Demo",
    billingEmail: "billing@demo.com",
    planId: 2, // Assuming Especialista is ID 2
    subscriptionStatus: "active"
  }).returning();

  await db.insert(teamMembers).values([
    { teamId: team.id, userId: admin.id, role: "owner" },
    { teamId: team.id, userId: doctorUser.id, role: "doctor" }
  ]);

  // -------------------------
  // ADDRESS
  // -------------------------
  const [address] = await db.insert(teamAddresses).values({
    teamId: team.id,
    name: "Consultorio Centro",
    address: "Av. Siempre Viva 742",
    mapLink: "https://maps.google.com",
    businessHours: {
      monday: ["09:00-18:00"],
      tuesday: ["09:00-18:00"]
    }
  }).returning();

  // -------------------------
  // ASSISTANT
  // -------------------------
  await db.insert(assistants).values({
    teamId: team.id,
    name: "Paola",
    waPhoneNumberId: "1234567890",
    systemPrompt: "Sos una asistente médica que agenda turnos.",
    temperature: "0.7"
  });

  // -------------------------
  // SERVICES
  // -------------------------
  const [consulta] = await db.insert(services).values({
    teamId: team.id,
    name: "Consulta General",
    description: "Consulta médica general",
    price: "15000.00",
    durationMinutes: 30
  }).returning();

  const [control] = await db.insert(services).values({
    teamId: team.id,
    name: "Consulta de Control",
    description: "Seguimiento médico",
    price: "10000.00",
    durationMinutes: 20
  }).returning();

  // -------------------------
  // DOCTOR
  // -------------------------
  const [doctor] = await db.insert(doctors).values({
    teamId: team.id,
    userId: doctorUser.id,
    name: "Dr. Stephen Strange",
    specialty: "Cardiología",
    billingStrategy: "upfront_deposit",
    depositPercentage: "30.00"
  }).returning();

  await db.insert(doctorsToServices).values([
    { doctorId: doctor.id, serviceId: consulta.id },
    { doctorId: doctor.id, serviceId: control.id }
  ]);

  // -------------------------
  // CONTACT
  // -------------------------
  const [contact] = await db.insert(contacts).values({
    teamId: team.id,
    phone: "+5491122334455",
    name: "Juan",
    lastName: "Pérez",
    waId: "5491122334455",
    email: "juan@test.com"
  }).returning();

  // -------------------------
  // CHAT SESSION
  // -------------------------
  const [session] = await db.insert(chatSessions).values({
    teamId: team.id,
    contactId: contact.id,
    selectedDoctorId: doctor.id,
    selectedServiceId: consulta.id,
    status: "BOOKING",
    expiresAt: addDays(new Date(), 1)
  }).returning();

  await db.insert(chatMessages).values([
    {
      teamId: team.id,
      contactId: contact.id,
      sessionId: String(session.id),
      role: "user",
      content: "Hola, quiero un turno"
    },
    {
      teamId: team.id,
      contactId: contact.id,
      sessionId: String(session.id),
      role: "assistant",
      content: "Perfecto, ¿para qué día?"
    }
  ]);

  // -------------------------
  // APPOINTMENT
  // -------------------------
  const start = addDays(new Date(), 2);
  const end = new Date(start.getTime() + 30 * 60000);

  const [appointment] = await db.insert(appointments).values({
    teamId: team.id,
    contactId: contact.id,
    doctorId: doctor.id,
    locationId: address.id,
    serviceId: consulta.id,
    startTime: start,
    endTime: end,
    status: "scheduled",
    paymentStatus: "pending"
  }).returning();

  // -------------------------
  // PAYMENT
  // -------------------------
  await db.insert(payments).values({
    teamId: team.id,
    appointmentId: appointment.id,
    contactId: contact.id,
    amount: "4500.00",
    currency: "ARS",
    mpPaymentId: randomUUID(),
    mpStatus: "approved",
    mpPaymentType: "credit_card",
    type: "deposit"
  });

  // -------------------------
  // WAITING LIST
  // -------------------------
  await db.insert(waitingList).values({
    teamId: team.id,
    sessionId: String(session.id),
    patientName: "Pedro Gómez",
    patientType: "primera_vez",
    preferredDate: new Date().toISOString().split('T')[0],
    status: "waiting"
  });

  console.log("✅ Seed completed successfully!");
}

seed().then(() => process.exit(0));