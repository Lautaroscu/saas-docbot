Contexto del Proyecto:
Sistema multi-tenant (clínicas) que evoluciona a un modelo de "venta por área/bot". Un Team (Clínica) posee múltiples Departments (Áreas). Es imperativo controlar la cantidad de departamentos permitidos según el Plan del equipo.

1. Modificaciones del Esquema (Drizzle ORM):

Tabla plans: Agrega la columna maxDepartments (integer, not null, default 1).

Enums: Crea userRoleEnum con los valores: 'SUPER_ADMIN', 'ADMIN', 'DOCTOR'.

Tabla departments: Crea la tabla con id (serial PK), teamId (FK a teams.id, cascade), name (varchar), e isActive (boolean, default true).

Tabla member_departments (Relación M:N): Crea esta tabla con id, memberId (FK a team_members.id, cascade) y departmentId (FK a departments.id, cascade). Incluye un índice único compuesto (memberId, departmentId).

Refactor de team_members: Actualiza la columna role para usar el nuevo userRoleEnum. Elimina cualquier relación directa con departamentos en esta tabla.

2. Inyección de departmentId (Denormalización):

Agrega departmentId (integer, FK a departments.id, onDelete: 'set null') a las siguientes tablas: assistants, doctors, services, appointments, chat_sessions, waiting_list, team_addresses y api_keys.

Restricción Crítica: No elimines teamId de estas tablas. Se requiere mantener ambos IDs para validaciones de seguridad y filtrado por organización.

3. Lógica de Negocio y Validaciones:

Validación de Cuota: Implementa una función de validación previa a la creación de un departamento. Debe consultar el maxDepartments del plan asociado al Team y compararlo con el conteo actual de registros en la tabla departments para ese teamId. Si se alcanza el límite, debe retornar un error de "Plan limit exceeded".

Autorización (Middleware):

SUPER_ADMIN: Acceso total a cualquier recurso donde resource.teamId === user.teamId.

ADMIN / DOCTOR: Acceso permitido solo si existe el vínculo en member_departments para el targetDepartmentId.

Ruteo de Asistente: Al identificar un asistente por waPhoneNumberId, el departmentId asociado debe persistir en el contexto de la sesión para filtrar doctores y servicios en las interacciones de la IA.

4. Requerimientos de UI:

Switcher de Departamento: Implementar un selector global para usuarios SUPER_ADMIN que permita filtrar el dashboard por área.

Gestión de Miembros: El formulario de creación/edición de usuarios debe permitir al SUPER_ADMIN asignar múltiples departamentos (multi-select) para el rol ADMIN y restringir a uno solo para el rol DOCTOR.

PD : la creacion de la tabla "departments" ya esta hecha no hay que crearla.