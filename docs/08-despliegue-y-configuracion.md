# Guía de Despliegue, Migración y Configuración del Entorno

Esta sección detalla los pasos técnicos necesarios para configurar, migrar la base de datos de desarrollo a producción y desplegar la aplicación en la plataforma **Vercel**.

---

## 1. Configuración de Variables de Entorno (`.env`)

La aplicación carga variables de entorno en el servidor backend mediante `dotenv` y en el cliente frontend a través del compilador de Vite. Es obligatorio crear un archivo `.env` en el directorio raíz del monorepo (`/rent-car/.env`) con el siguiente contenido:

```bash
# Entorno de Ejecución
NODE_ENV="development"
PORT=3001

# Base de Datos Local (SQLite por defecto para desarrollo)
DATABASE_URL="file:../prisma/dev.db"

# Secretos de Seguridad de Sesión
JWT_SECRET="ClaveSecretaSuperSeguraParaFirmarTokensJWT2026*"
JWT_REFRESH_SECRET="ClaveSeguraParaRefrescoDeTokensCookie2026*"

# Integración con Stripe (Modo Pruebas en Desarrollo)
STRIPE_SECRET_KEY="sk_test_51..."
STRIPE_PUBLISHABLE_KEY="pk_test_51..."

# Almacenamiento Privado de Archivos (Vercel Blob)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

---

## 2. Inicialización de la Base de Datos Local

Para levantar el entorno local por primera vez y contar con registros de prueba funcionales:

1. **Instalación de Dependencias:**
   Ejecute desde la carpeta raíz del monorepo (`/rent-car`):
   ```bash
   npm install
   ```

2. **Generación del Schema de Prisma y Creación de Tablas SQLite:**
   Diríjase al directorio del backend (`/rent-car/apps/backend`) y ejecute la migración para crear el archivo `dev.db`:
   ```bash
   npx prisma migrate dev --name init_rentcar_schema
   ```

3. **Carga de Datos de Semilla (Seeding):**
   Cargue el catálogo por defecto de vehículos, marcas, modelos, políticas, tarifas estacionales, y los perfiles de prueba con el rol de administración:
   ```bash
   npx prisma db seed
   ```

### Cuentas de Acceso por Defecto creadas por el Seeder
* **Administrador del Sistema:**
  * Correo: `admin@fleetvault.com`
  * Contraseña: `password123`
  * Rol: `ADMINISTRATOR`

---

## 3. Transición a Producción: Migración de SQLite a Supabase (PostgreSQL)

Para desplegar FleetVault en producción, se recomienda cambiar la base de datos local SQLite a una instancia cloud de **PostgreSQL** mediante **Supabase**.

### Pasos de Configuración:
1. **Creación del Proyecto:** Cree un nuevo proyecto en la consola de Supabase.
2. **Obtención de URL de Conexión:** Vaya a *Project Settings -> Database* y copie la cadena de conexión de modo transacción (*Transaction Connection String*).
3. **Modificación de Prisma Schema (`schema.prisma`):**
   Edite el archivo `/rent-car/apps/backend/prisma/schema.prisma` para cambiar el proveedor de base de datos de `sqlite` a `postgresql`:
   ```prisma
   // De:
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }

   // A:
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. **Actualización de la Variable de Entorno:**
   Modifique la variable `DATABASE_URL` en el panel de Vercel (o en su archivo `.env` de producción) apuntando a la dirección de conexión de Supabase:
   ```bash
   DATABASE_URL="postgres://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```
5. **Ejecución de Migraciones en Producción:**
   Aplique las estructuras de tablas en la base de datos cloud ejecutando:
   ```bash
   npx prisma migrate deploy
   ```

---

## 4. Despliegue de la Aplicación en Vercel

FleetVault está diseñado para correr como un proyecto unificado en Vercel (monorepo frontend con API endpoints serverless).

### Pasos en la Consola de Vercel:
1. **Importación del Proyecto:** Conecte su repositorio Git a Vercel e importe la carpeta del proyecto.
2. **Directorio Raíz (Root Directory):** Configure `/rent-car` como el directorio raíz del despliegue en Vercel.
3. **Configuración del Proyecto:**
   * **Framework Preset:** Seleccione `Vite` (Vercel configurará las dependencias automáticamente).
   * **Comando de Compilación (Build Command):**
     ```bash
     npm run build
     ```
     *(Este comando compila el frontend estático y genera los tipos del cliente Prisma en la raíz).*
   * **Directorio de Salida (Output Directory):** `apps/frontend/dist`
4. **Variables de Entorno del Proyecto:**
   Configure todas las variables declaradas en la sección 1 directamente en la consola de Vercel (dentro de *Settings -> Environment Variables*).
5. **Despliegue (Deploy):** Haga clic en "Deploy". Vercel compilará la SPA React, generará las rutas lógicas del archivo `vercel.json` y levantará la API serverless.
