import { db } from "@/lib/db/drizzle";
import {
  users,
  teams,
  teamMembers,
  departments,
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
  apiKeys,
  plans,
  memberDepartments
} from "@/lib/db/schema";

import { hashPassword } from "@/lib/auth/session";
import { addDays } from "date-fns";
import { randomUUID } from "crypto";

async function seed() {
  console.log("🌱 Seeding database...");

  // -------------------------
  // PLANS
  // -------------------------
  const insertedPlans = await db.insert(plans).values([
    {
      slug: 'inicial',
      name: 'Inicial',
      mpPlanId: 'plan_inicial_123',
      price: '15000',
      maxDepartments: 1, // Límite Institucional
    },
    {
      slug: 'especialista',
      name: 'Especialista',
      mpPlanId: 'plan_especialista_123',
      price: '30000',
      maxDepartments: 3, // Límite Especialista
    },
    {
      slug: 'institucional',
      name: 'Institucional',
      mpPlanId: 'plan_institucional_123',
      price: '60000',
      maxDepartments: 10, // Límite Superior
    }
  ]).returning();

  // -------------------------
  // USERS
  // -------------------------
  const [admin] = await db.insert(users).values({
    name: "Admin User",
    email: "admin@test.com",
    passwordHash: await hashPassword("password"),
    role: "SUPER_ADMIN"
  }).returning();

  const [doctorUser] = await db.insert(users).values({
    name: "Dr. Strange",
    email: "doctor@test.com",
    passwordHash: await hashPassword("password"),
    role: "DOCTOR"
  }).returning();

  // -------------------------
  // TEAM
  // -------------------------
  const [team] = await db.insert(teams).values({
    name: "Clínica Demo",
    billingEmail: "billing@demo.com",
    planId: insertedPlans[1].id, // Assuming Especialista is ID 2
    subscriptionStatus: "active"
  }).returning();

  // -------------------------
  // DEPARTMENTS (ÁREAS)
  // -------------------------
  const [deptCardiologia, deptOdontologia] = await db.insert(departments).values([
    { teamId: team.id, name: 'Cardiología' },
    { teamId: team.id, name: 'Odontología' },
  ]).returning();

  // -------------------------
  // TEAM MEMBERS
  // -------------------------
  const insertedMembers = await db.insert(teamMembers).values([
    {
      teamId: team.id,
      userId: admin.id,
      role: "SUPER_ADMIN", // Using Enum Correctly
    },
    {
      teamId: team.id,
      userId: doctorUser.id,
      role: "DOCTOR",
    }
  ]).returning();

  const superAdminMember = insertedMembers[0];
  const doctorMember = insertedMembers[1];

  // -------------------------
  // MEMBER DEPARTMENTS (M:N)
  // -------------------------
  // SUPER_ADMIN tiene acceso a Cardiología y Odontología
  // DOCTOR tiene acceso sólo a Cardiología
  await db.insert(memberDepartments).values([
    { memberId: superAdminMember.id, departmentId: deptCardiologia.id },
    { memberId: superAdminMember.id, departmentId: deptOdontologia.id },
    { memberId: doctorMember.id, departmentId: deptCardiologia.id }
  ]);

  // -------------------------
  // ADDRESS
  // -------------------------
  const [address] = await db.insert(teamAddresses).values({
    teamId: team.id,
    departmentId: deptCardiologia.id,
    name: "Consultorio Centro",
    address: "Av. Siempre Viva 742",
    mapLink: "https://maps.google.com",
    businessHours: {
      monday: ["09:00-18:00"],
      tuesday: ["09:00-18:00"]
    }
  }).returning();

  // -------------------------
  // ASSISTANTS
  // -------------------------
  await db.insert(assistants).values([
    {
      teamId: team.id,
      departmentId: deptCardiologia.id,
      name: "Paola (Cardio)",
      waPhoneNumberId: "1234567890",
      systemPrompt: "Sos una asistente médica de ortopedia que agenda turnos.",
      temperature: "0.7"
    },
    {
      teamId: team.id,
      departmentId: deptOdontologia.id,
      name: "Laura (Odonto)",
      waPhoneNumberId: "0987654321",
      systemPrompt: "Sos una asistente médica dental que agenda turnos.",
      temperature: "0.7"
    }
  ]);

  // -------------------------
  // SERVICES
  // -------------------------
  const [consulta] = await db.insert(services).values({
    teamId: team.id,
    departmentId: deptCardiologia.id,
    name: "Consulta General Cardio",
    description: "Consulta médica general",
    price: "15000.00",
    durationMinutes: 30
  }).returning();

  const [control] = await db.insert(services).values({
    teamId: team.id,
    departmentId: deptOdontologia.id,
    name: "Consulta de Odonto",
    description: "Seguimiento médico",
    price: "10000.00",
    durationMinutes: 20
  }).returning();

  // -------------------------
  // DOCTOR
  // -------------------------
  const [doctor] = await db.insert(doctors).values({
    teamId: team.id,
    departmentId: deptCardiologia.id,
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
    departmentId: deptCardiologia.id,
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
    departmentId: deptCardiologia.id,
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
    departmentId: deptCardiologia.id,
    sessionId: String(session.id),
    patientName: "Pedro Gómez",
    patientType: "primera_vez",
    preferredDate: new Date().toISOString().split('T')[0],
    status: "waiting"
  });

  // -------------------------
  // API KEYS
  // -------------------------
  await db.insert(apiKeys).values([
    {
      teamId: team.id,
      name: "Global Master Key",
      apiKey: "sk_test_global_12345",
      isActive: true,
    },
    {
      teamId: team.id,
      departmentId: deptCardiologia.id,
      name: "Cardiología Bot Key",
      apiKey: "sk_test_cardio_12345",
      isActive: true,
    }
  ]);

  console.log("✅ Seed completed successfully!");
}

seed().then(() => process.exit(0));