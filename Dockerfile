# -------------------------
# 1️⃣ Base image
# -------------------------
FROM node:20-alpine AS base
WORKDIR /app
# Se instalan dependencias del sistema necesarias para compilar ciertos paquetes de Node
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# -------------------------
# 2️⃣ Dependencies
# -------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# -------------------------
# 3️⃣ Build stage
# -------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Capturar el argumento de Docker Compose
ARG POSTGRES_URL
ENV POSTGRES_URL=$POSTGRES_URL
# Convertirlo en variable de entorno para que Next.js lo vea durante el build
ENV NODE_ENV=production
# Deshabilitar telemetría en tiempo de build
ENV NEXT_TELEMETRY_DISABLED=1 
RUN pnpm build

# -------------------------
# 4️⃣ Production runner
# -------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Seguridad: Crear grupo y usuario sin privilegios de root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar carpeta public (necesaria para assets estáticos)
COPY --from=builder /app/public ./public

# Crear directorio .next y ajustar permisos antes de copiar
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copiar el build standalone y los estáticos generados
# El modo standalone genera la carpeta completa dentro de .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Cambiar al usuario seguro
USER nextjs

EXPOSE 3000
ENV PORT=3000
# Escuchar en todas las interfaces de red del contenedor
ENV HOSTNAME="0.0.0.0" 

# Ejecutar el servidor compilado, sin usar pnpm
CMD ["node", "server.js"]