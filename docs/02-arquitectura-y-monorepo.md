# Arquitectura del Sistema y Estructura Monorepo

El proyecto **FleetVault Enterprise** está diseñado bajo una arquitectura de monorepo utilizando **NPM Workspaces**. Esto permite separar de forma clara la lógica de backend, frontend y contratos compartidos en un solo repositorio, facilitando el despliegue integrado y la consistencia de tipos de datos.

---

## 1. Estructura del Monorepo

El monorepo está organizado en el directorio raíz de la siguiente manera:

```
rent-car/
├── package.json             # Define el espacio de trabajo NPM (workspaces: ["apps/*", "packages/*"])
├── tsconfig.json            # Configuración base de TypeScript (ESNext, NodeNext, Strict Mode)
├── vercel.json              # Reglas de enrutamiento y reescritura para el despliegue en Vercel
├── README.md                # Guía de inicio rápido e introducción al proyecto
├── api/                     # Puntos de entrada Serverless para Vercel (e.g., api/health.ts)
├── packages/
│   └── common/              # Contratos de Zod, tipos de TypeScript y enums compartidos (@rent-car/common)
└── apps/
    ├── backend/             # Servidor de API REST basado en Express y Prisma (@rent-car/backend)
    └── frontend/            # Aplicación SPA cliente basada en React, Vite y Tailwind (@rent-car/frontend)
```

---

## 2. Contratos Compartidos: `@rent-car/common`

Este paquete actúa como la fuente única de verdad (*Single Source of Truth*) para la validación de datos y las definiciones de tipos de TypeScript. Tanto el frontend como el backend importan este paquete directamente.

### Contenido del Paquete:
* **`enums.ts`**: Contiene todos los enums representados como arrays inmutables (`as const`) de TypeScript para el control de estados del sistema:
  * `VehicleStatus` (`AVAILABLE`, `RENTED`, `UNDER_INSPECTION`, `MAINTENANCE`, `RETIRED`)
  * `CleaningStatus` (`CLEAN`, `DIRTY`)
  * `CustomerStatus` (`ACTIVE`, `SUSPENDED`, `BLACKLISTED`)
  * `RentalStatus` (`PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`, `NO_SHOW`)
  * `InspectionStatus` (`PASSED`, `FLAGGED`)
  * `FuelLevel` (`EMPTY`, `QUARTER`, `HALF`, `THREE_QUARTERS`, `FULL`)
  * `WorkingShift` (`MORNING`, `AFTERNOON`, `NIGHT`)
  * `CustomerType` (`INDIVIDUAL`, `CORPORATE`)
  * `TransactionType` (`PRE_AUTH_HOLD`, `CHARGE`, `REFUND`, `PO_INVOICE`, `CASH`)
  * `UserRole` (`CUSTOMER`, `INSPECTOR`, `AGENT`, `ADMINISTRATOR`)
  * `EmployeeRole` (`INSPECTOR`, `AGENT`, `ADMINISTRATOR`)
  * `EntityStatus` (`ACTIVE`, `INACTIVE`)
  * `TireCondition` (`GOOD`, `WORN`, `DAMAGED`, `MISSING`)
  * `TirePosition` (`FRONT_LEFT`, `FRONT_RIGHT`, `REAR_LEFT`, `REAR_RIGHT`)
* **`schemas/`**: Esquemas de validación basados en **Zod**. Cada entidad tiene dos esquemas principales:
  * Esquema de creación (e.g., `CreateVehicleSchema` para validación de payloads de entrada).
  * Esquema de entidad (e.g., `VehicleSchema` que incluye el ID único e historial de fechas).

> [!TIP]
> Al compartir los esquemas de Zod, cualquier cambio en la estructura de un formulario en el frontend se valida automáticamente en el backend bajo las mismas reglas físicas, reduciendo a cero los errores por discrepancias de formatos en peticiones HTTP.

---

## 3. Backend: Arquitectura Limpia (Clean Architecture)

El backend de `@rent-car/backend` está estructurado bajo los principios de la **Arquitectura Limpia**, lo que independiza la lógica de negocio de las bases de datos o pasarelas de pago externas.

```
apps/backend/src/
├── Domain/                  # Reglas del dominio y contratos lógicos (sin dependencias externas)
│   ├── entities/            # Modelos e interfaces nativas de datos
│   ├── repositories/        # Interfaces abstractas de repositorios (e.g., IVehicleRepository)
│   └── errors/              # Excepciones personalizadas (NotFoundError, ValidationError, etc.)
│
├── Application/             # Casos de uso y orquestación de servicios
│   ├── services/            # Servicios de negocio (AuthService, BillingService, StripeService)
│   └── middleware/          # Filtros Express (autenticación JWT, verificación de roles, validadores Zod)
│
├── Infrastructure/          # Detalles técnicos y adaptadores de servicios externos
│   ├── repositories/        # Implementaciones de repositorios conectadas a Prisma ORM
│   └── external/            # Controladores para Stripe API, Vercel Blob y PDFKit
│
└── Presentation/            # Punto de entrada e interfaces HTTP
    ├── Controllers/         # Controladores Express (convierten peticiones en llamadas a servicios)
    ├── routes/              # Definiciones de rutas de la API agrupadas por módulos
    └── server.ts            # Entrypoint del servidor Express y configuración global de middlewares
```

### Flujo de Dependencias
Las dependencias fluyen estrictamente desde la capa externa hacia la interna. La capa de **Domain** no conoce nada sobre Express, Prisma o Stripe, haciendo que las reglas de negocio de alquileres sean portables e independientes.

---

## 4. Frontend: Capa de Presentación SPA

El cliente de `@rent-car/frontend` está diseñado para ser altamente interactivo, responsivo (adaptable a tabletas de patio) y soportar fallos de red temporales:

```
apps/frontend/src/
├── main.tsx                 # Entrypoint que inicializa React y monta los proveedores globales
├── index.css                # Configuración de Tailwind CSS v4 y variables del tema visual
├── Infrastructure/          # Adaptadores e integraciones del lado del cliente
│   ├── api-client.ts        # Cliente Axios con interceptores JWT para refresco automático de sesión
│   ├── auth.context.tsx     # Proveedor de autenticación y roles de usuario en toda la app
│   ├── offline-queue.ts     # Controlador IndexedDB para almacenar inspecciones offline
│   └── hooks/               # Hooks de TanStack React Query para persistencia de datos del servidor
│
└── Presentation/            # Componentes visuales y vistas
    ├── components/          # Elementos compartidos (SignaturePad, DataTable, FormModal)
    ├── layouts/             # Plantillas de enrutado (AdminLayout, CustomerLayout, AuthLayout)
    └── pages/               # Vistas de la aplicación (CatalogPage, ReservationsPage, InspectionsPage)
```

---

## 5. Integración y Despliegue Serverless

### Enrutamiento en Vercel (`vercel.json`)
Para que la aplicación funcione en entornos serverless de Vercel como un proyecto unificado, se aplica la siguiente configuración:

* Las solicitudes dirigidas a `/api/*` se reescriben para apuntar a las funciones serverless definidas en el directorio raíz `api/` (que importan los controladores del backend).
* Todas las demás solicitudes se redirigen al archivo index principal del frontend (`/index.html`) para permitir que **React Router** maneje el enrutamiento del lado del cliente.

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Configuración del Proxy en Desarrollo (`vite.config.ts`)
Durante el desarrollo local, Vite levanta el servidor frontend en el puerto `3000` (o `5173`) y Express corre en el puerto `3001`. Para evitar problemas de CORS (*Cross-Origin Resource Sharing*), el archivo de configuración de Vite define un proxy reverso:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```
Esto permite realizar llamadas HTTP en el cliente a rutas relativas `/api/vehicles` sin exponer secretos o requerir headers CORS complejos localmente.
