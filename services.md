1. Arquitectura de Identificación (Multi-tenancy)El sistema no utiliza un team_id fijo en el bot. La identidad se resuelve dinámicamente en el Gateway de Next.js antes de llegar a n8n.Identificador Clave: wa_phone_number_id (enviado por Meta).Mapeo: El Gateway busca en la tabla assistants cuál es el team_id asociado a ese número de teléfono.Separación de Roles: Teams (Entidad legal/Clínica), Assistants (Instancia de IA/Número de WhatsApp), Doctors (Prestadores de salud).
3. Patrón "Fat Payload" (Contexto Total)n8n debe ser Stateless (sin estado). En cada mensaje, Next.js realiza todas las consultas SQL necesarias y le entrega a n8n un objeto JSON con el contexto completo.El Payload debe incluir:Assistant Config: Prompt, nombre y temperatura.Contact Info: Datos del paciente (nombre, ID) y si es una sesión nueva (ventana de 6 horas).Business Context: Lista de doctores activos y turnos confirmados del paciente.User Message: El texto agrupado (debounced) del usuario.4. Flujo de Ejecución (Gateway Passthrough)Meta Webhook $\rightarrow$ Next.js API: Recibe el mensaje crudo.Identificación: Resuelve team_id mediante wa_phone_number_id.Enriquecimiento: Ejecuta la query getFatPayload (Drizzle).Disparo: POST a n8n con el contexto total.n8n Brain: Procesa con LLM, ejecuta tools (Google Calendar, MP) y responde vía WhatsApp.Persistencia: n8n llama a /api/chat/messages para guardar el log en Next.js.5. Seguridad y EscalabilidadEncriptación AES-256: Los mp_access_token deben encriptarse en la base de datos mediante una clave simétrica en el servidor Next.js.Middleware de API Key: n8n debe autenticarse contra la API de Next.js usando un header x-api-key. El backend filtrará automáticamente por team_id según el dueño de esa key.Evolución a Colas: El diseño actual permite que en el futuro el Gateway de Next.js simplemente agregue el mensaje a BullMQ/Redis sin alterar la lógica de n8n.


API Service Specification: Medical SaaS Multi-Tenant1. Requisitos Globales de ImplementaciónAuth Middleware: Todos los endpoints deben validar un x-api-key en el header. Este key debe mapear al team_id correspondiente en la base de datos para filtrar todas las queries de Drizzle: Ejemplo de modificacionm de middleware.ts :
Instrucción de Optimización para Middleware:
Validación en DB: La búsqueda de la apiKey en PostgreSQL debe realizarse sobre una columna con un índice único (.unique()) para garantizar una respuesta en milisegundos.
Gestión de Cache: Al implementar el cache en memoria (Map), asegurate de manejarlo con precaución:
Establecé un TTL (Time-To-Live) razonable (ej. 10 minutos) para que los cambios en los permisos de las keys se reflejen eventualmente.
Implementá una validación de isActive; si una key es marcada como inactiva en la DB, el cache debe ignorarla o ser invalidado para ese team_id.
Asegurá que el cache no crezca indefinidamente; si es necesario, limitá el tamaño del Map para evitar fugas de memoria en el entorno de Node.js. // Fuera de la función middleware (Cache Global)
const apiKeyCache = new Map<string, { teamId: number; expires: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutos
export async function middleware(request: NextRequest) {
  // ... (lógica previa)
  const apiKey = request.headers.get('x-api-key');
  
  // 1. Check Cache
  const cached = apiKeyCache.get(apiKey);
  if (cached && cached.expires > Date.now()) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-team-id', cached.teamId.toString());
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  // 2. Si no está en cache, ir a DB
  const keyData = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.key, apiKey),
  });

  if (keyData && keyData.isActive) {
    // 3. Guardar en Cache para el próximo mensaje
    apiKeyCache.set(apiKey, { 
      teamId: keyData.teamId, 
      expires: Date.now() + CACHE_TTL 
    });
    
    // ... (inyectar header y retornar)
  }
}.ORM: Drizzle ORM.Estilo: RESTful API en Next.js App Router (/api/[resource]/route.ts).2. Endpoints por Entidad📂 teams (Configuración de Clínica)MétodoEndpointDescripciónDrizzle ActionGET/api/teams/configRetorna config global del bot y clínica.db.query.teams.findFirstPATCH/api/teams/configActualiza saludo inicial, políticas y dirección.db.update(teams)GET/api/internal/resolve-tenant?phone_id=...Identifica team_id mediante el phone_number_id de Meta.db.select().from(teams).where(...)📂 doctors (Recursos Prestadores)MétodoEndpointDescripciónDrizzle ActionGET/api/doctorsLista médicos activos del equipo.db.select().from(doctors).where(eq(teams.id))POST/api/doctorsRegistro de nuevo médico.db.insert(doctors)PATCH/api/doctors/[id]Actualiza google_calendar_id y credenciales MP (encriptadas).db.update(doctors)GET/api/doctors/by-service/[serviceId]Lista doctores que prestan un servicio (M2M).db.select().from(doctorsToServices).join(...)📂 services (Catálogo de Prestaciones)MétodoEndpointDescripciónDrizzle ActionGET/api/servicesLista servicios disponibles.db.select().from(services)POST/api/servicesCrea definición de servicio (precio, duración).db.insert(services)POST/api/services/assignVincula médico a servicio.db.insert(doctorsToServices)📂 appointments (Motor de Reservas)MétodoEndpointDescripciónDrizzle ActionPOST/api/appointmentsCrea turno en estado confirmed o pending_payment.db.insert(appointments)GET/api/appointments/[id]Detalle del turno para confirmación.db.query.appointments.findFirstPATCH/api/appointments/[id]/statusCambia estado (cancelado, asistió, pagado).db.update(appointments)GET/api/appointments/availability?docId=...Verifica colisiones en DB antes de agendar.db.select().from(appointments).where(...)📂 chat (Persistencia de Conversación)MétodoEndpointDescripciónDrizzle ActionPOST/api/chat/messagesGuarda logs de n8n (user/assistant).db.insert(chatMessages)GET/api/chat/history/[contactId]Retorna historial para el dashboard.db.query.chatMessages.findMany📂 webhooks (Gateways)MétodoEndpointDescripciónLógicaPOST/api/webhooks/whatsappGateway Passthrough hacia n8n.Identifica team_id y hace fetch a n8n.POST/api/webhooks/mercadopagoConfirmación de pago.Valida firma, actualiza appointment y gatilla n8n.3. Lógica de Negocio Crítica (Service Layer)A. Encriptación de MP TokensAl guardar en /api/doctors/[id], el servicio debe usar crypto (AES-256-CBC) para encriptar el mp_access_token usando una ENCRYPTION_KEY del entorno.B. Mapeo de Identidad (Meta Identification)El endpoint de WhatsApp debe resolver la relación:$$Meta\_Phone\_ID \rightarrow Team\_ID \rightarrow Assistant\_Config$$Esto evita que n8n tenga que hacer múltiples queries para saber qué prompt usar.C. Junction Table (Many-to-Many)El servicio de asignación debe manejar la tabla doctors_to_services.Query clave: Obtener todos los doctores para un service_id:TypeScriptdb.select()
  .from(doctors)
  .innerJoin(doctorsToServices, eq(doctors.id, doctorsToServices.doctorId))
  .where(eq(doctorsToServices.serviceId, targetServiceId));
4. Estructura de Respuesta EstándarTodos los endpoints deben retornar:JSON{
  "success": boolean,
  "data": object | array | null,
  "error": string | null
}

