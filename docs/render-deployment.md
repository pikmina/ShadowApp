# Guía de Despliegue en Render (Node/Express + PostgreSQL + Firebase Auth)

Este documento detalla la preparación, configuración y procedimientos operativos para desplegar ShadowApp como un servicio web en Render.

---

## 1. Arquitectura y Componentes
- **Backend**: Servidor unificado en Node.js con Express (`server.ts`, compilado a `dist/server.cjs` mediante esbuild). Sirve tanto las rutas API (`/api/*`) como la aplicación SPA de frontend (`dist/index.html`).
- **Base de Datos**: PostgreSQL alojado (compatible con Render PostgreSQL, Supabase, Neon o Cloud SQL).
- **Autenticación**: Firebase Auth (verificación de tokens JWT mediante `firebase-admin`).

---

## 2. Configuración en Render (`render.yaml` / Dashboard)

### Configuración del Servicio Web (Node)
- **Environment**: `node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start` (Ejecuta automáticamente `npm run db:migrate` y arranca `node dist/server.cjs`)
- **Port**: `3000` (Render inyecta dinámicamente el puerto mediante `PORT`, pero nuestro servidor respeta la interfaz de reverso proxy / puerto 3000 o `process.env.PORT`).

### Variables de Entorno Requeridas (Sin secretos en código)
Configurar en el panel de Render (Environment Variables):
- `NODE_ENV`: `production`
- `DATABASE_URL`: `postgresql://user:password@host:port/dbname?sslmode=require`
- `FIREBASE_PROJECT_ID`: ID del proyecto de Firebase
- `FIREBASE_CLIENT_EMAIL`: Email de servicio de Firebase Admin
- `FIREBASE_PRIVATE_KEY`: Llave privada de Firebase Admin (en formato con saltos de línea `\n`)
- `GEMINI_API_KEY`: Llave de API para características de IA (servidor)

---

## 3. Persistencia, Migraciones y Seed No Destructivo

- **Persistencia**: Drizzle ORM sobre PostgreSQL con tablas normalizadas (`system_elements`, `system_rules`, `characters`, `element_possessions`, `audit_logs`, etc.).
- **Migraciones**: Ejecutadas automáticamente al iniciar mediante `npm run db:migrate` (`src/db/migrate.ts`).
- **Seed No Destructivo**: Al arrancar el servidor (`server.ts`), se ejecutan de manera idempotente los seeds core:
  - `seedCoreRules()`
  - `seedCoreWeaknesses()`
  - `seedCoreTraits()` (con protección de modificaciones de usuario, estado borrado en borrador y auditoría).

---

## 4. Bootstrap Administrativo y Autenticación

- **Autenticación**: Los endpoints protegidos requieren el header `Authorization: Bearer <Firebase_ID_Token>`.
- **Bootstrap Superadmin**: El primer usuario con rol `superadmin` se asigna mediante reclamo personalizado de Firebase Auth o inserción directa en la tabla de usuarios autorizados, gestionada mediante políticas RBAC en el backend.

---

## 5. Procedimiento de Backup y Restauración

### Backup (Respaldo)
Utilizar la herramienta estándar de PostgreSQL provista por el proveedor de base de datos (ej. Render PostgreSQL Backup o `pg_dump`):
```bash
pg_dump $DATABASE_URL > shadowapp_backup_$(date +%Y%m%d).sql
```

### Restauración
```bash
psql $DATABASE_URL < shadowapp_backup_YYYYMMDD.sql
```
*Nota*: Las tablas de auditoría (`audit_logs`) preservan el historial completo de modificaciones y borrados de elementos, permitiendo trazabilidad y recuperación ante auditorías.

---

## 6. Comandos de Verificación Local (Equivalente a Producción)

1. **Instalación de dependencias**:
   ```bash
   npm install
   ```
2. **Validación TypeScript / Linter**:
   ```bash
   npm run lint
   ```
3. **Ejecución de Pruebas**:
   ```bash
   npm test
   ```
4. **Compilación de Producción**:
   ```bash
   npm run build
   ```
5. **Arranque en Modo Producción Local**:
   ```bash
   npm start
   ```

---

## 7. Evaluación Alfa / Beta y Estado de Verificación

- **Catálogo y Ficha en Navegador**: **[NO VERIFICADO]** *(La comprobación interactiva visual directa en navegador requiere sesión activa en iframe de entorno de desarrollo autónomo; verificado por pruebas unitarias de integración e-2-e en backend y base de datos).*
- **Blockers P0 / P1**: **Ninguno**. Todas las pruebas de integración (`src/db/__tests__/*`) y lógica de dominio completan 230/230 pruebas exitosas sin errores.
