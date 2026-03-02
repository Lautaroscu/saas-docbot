Para vender un SaaS médico de forma efectiva, la clave no es cobrar por "funcionalidad", sino por capacidad de gestión y control financiero. Si todos los planes tienen el bot (que es tu core), la diferenciación debe estar en la profundidad de los reportes y la cantidad de profesionales.

Acá tenés una propuesta de 3 niveles diseñada para escalar con el crecimiento de la clínica:

1. Plan Essential (El Autónomo / Consultorio Chico)
Ideal para profesionales independientes o consultorios con máximo 2-3 médicos.
Core: 1 Asistente IA (Paola) con 1 número de WhatsApp.
Gestión: Dashboard general de turnos (vista de lista y calendario).
Reportes: Estadísticas básicas (Turnos agendados vs. Cancelados).
Límite: 1 Doctor. Limitado a 1 Asistente.
Propuesta de valor: "Automatizá tu agenda y dejá de perder pacientes por falta de respuesta".

2. Plan Professional (La Clínica en Crecimiento) - El más vendido
Diseñado para centros médicos que necesitan medir el rendimiento individual.
Todo lo de Essential.
Multitenancy Interno: Dashboards individuales por doctor (cada médico ve lo suyo).
Configuración Avanzada: Múltiples asistentes (ej: uno para Turnos y otro para Consultas Administrativas).
Reportes Pro: Análisis de ausentismo por especialidad y horas pico.
Límite: Hasta 5 Doctores.
Propuesta de valor: "Control total sobre la productividad de tu equipo y dashboards específicos para cada especialista".

3. Plan Business & Fintech (Gestión Integral y Billetera)
Este es el plan donde incorporás la sección de Billetera que mencionaste. Es para el dueño de la clínica que no solo gestiona turnos, sino que gestiona un negocio.
Todo lo de Professional.
Sección Billetera (Wallet): Visualización de transacciones de Mercado Pago en tiempo real.
Conciliación: ¿Cuánto generó cada doctor?
Cálculo de comisiones: El sistema calcula automáticamente cuánto le corresponde a la clínica y cuánto al doctor.
Auditoría: Log de cambios en turnos (quién movió qué y cuándo).
Límite: Doctores y Asistentes Ilimitados + Integración de Webhooks externos.
Propuesta de valor: "La solución definitiva para la administración financiera y operativa de tu centro médico".

Análisis sobre la "Sección Billetera"
Me preguntaste si es bueno o no. Técnicamente, es tu mayor diferencial.
Por qué es bueno: Los dueños de clínicas suelen volverse locos a fin de mes tratando de calcular cuánto dinero entró por cada médico para cobrarles el alquiler del consultorio o su comisión. Si tu sistema ya tiene los mp_user_id de los doctores, podés usar la API de Mercado Pago para trackear esos pagos.
Riesgo: Implica mayor responsabilidad legal y de soporte. Si un pago falla en MP, te van a preguntar a vos.
Solución técnica simple: No manejes el dinero. Solo consumí la API de "Search Payments" de MP para visualizar y reportar. Que tu "Billetera" sea una herramienta de auditoría, no una pasarela propia.

Comparativa de Precios (Ejemplo sugerido)
Para que el salto entre planes se sienta lógico:
Característica	Essential	Professional	Business
Precio Sugerido	$35.000 /mes	$65.000 /mes	$110.000 /mes
Doctores	1 Doctor	Hasta 5	Ilimitados
Asistentes	1 Asistente	Múltiples	Ilimitados
Dashboards Indiv.	No	Sí	Sí
Billetera/Pagos	No	Solo Reporte Básico	Auditoría Completa

¿Cómo darle "buena cara"?
Enfocalo en el ROI: "Este sistema se paga solo con 2 turnos que el bot recupere y que antes se perdían por WhatsApp".
White Label (Opcional para el Plan Business): Permitir que el dashboard tenga el logo de la clínica en lugar del tuyo.
Setup Fee: Podés cobrar un pago único inicial por configurar el system_prompt y los calendarios de Google, asegurando que el cliente valore la puesta en marcha.

Nota Técnica sobre Mercado Pago (Suscripciones en Argentina):
Debido a la inflación y los límites de actualización de montos en Mercado Pago, en caso de cambio de precio de la suscripción, la mejor estrategia técnica es cancelar el `preapproval` existente y solicitar al usuario que genere una nueva suscripción con el monto actualizado, en lugar de intentar actualizar el monto del preapproval vigente.