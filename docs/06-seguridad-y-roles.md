# Seguridad, Autenticación y Control de Acceso (RBAC)

La seguridad en **FleetVault Enterprise** está construida sobre dos pilares fundamentales: autenticación basada en tokens web JSON (**JWT**) y autorización mediante control de acceso basado en roles (**RBAC** - *Role-Based Access Control*), aplicados tanto a nivel de API en el servidor como a nivel de rutas e interfaces en el cliente.

---

## 1. Matriz de Roles y Permisos

El sistema define cuatro roles lógicos. A continuación se detalla la matriz de control de acceso que define qué operaciones están permitidas para cada perfil:

| Operación / Acción | Cliente (CUSTOMER) | Inspector (INSPECTOR) | Agente (AGENT) | Administrador (ADMINISTRATOR) |
| :--- | :---: | :---: | :---: | :---: |
| **Buscar Catálogo Público** | ✓ | ✓ | ✓ | ✓ |
| **Ver Reservas Propias** | ✓ | ✗ | ✗ | ✗ |
| **Modificar Perfil Propio** | ✓ | ✗ | ✗ | ✗ |
| **Registrar Cliente Nuevo** | ✗ | ✗ | ✓ | ✓ |
| **Crear Inspección Física** | ✗ | ✓ | ✗ | ✓ |
| **Aprobar Alquiler (Checkout)** | ✗ | ✗ | ✓ | ✓ |
| **Procesar Devolución (Return)** | ✗ | ✗ | ✓ | ✓ |
| **Registrar Orden de Compra (PO)** | ✗ | ✗ | ✓ | ✓ |
| **Editar Catálogos de Flota** | ✗ | ✗ | ✗ | ✓ |
| **Editar Multiplicadores y Tarifas**| ✗ | ✗ | ✗ | ✓ |
| **Ver Reportes de Rentabilidad** | ✗ | ✗ | ✗ | ✓ |
| **Administrar Empleados y Roles** | ✗ | ✗ | ✗ | ✓ |

---

## 2. Ciclo de Autenticación de Sesión (JWT)

El sistema utiliza un mecanismo de autenticación de doble token para mantener la seguridad de las sesiones sin saturar la base de datos con consultas de verificación frecuentes:

1. **Access Token (Token de Acceso):**
   * Token JWT de corta duración (expira en **15 minutos**).
   * Almacenado en la memoria RAM de la aplicación frontend (no expuesto en LocalStorage).
   * Se envía en la cabecera HTTP de cada solicitud protegida:
     `Authorization: Bearer <Token>`
2. **Refresh Token (Token de Refresco):**
   * Token JWT de larga duración (expira en **7 días**).
   * Almacenado en una cookie segura del navegador configurada como `HttpOnly`, `Secure` y `SameSite=Strict`. Esto previene ataques de lectura por scripts maliciosos (XSS).
3. **Flujo de Refresco Automático:**
   * Cuando el token de acceso expira, el cliente intercepta la respuesta HTTP `401 Unauthorized` de la API.
   * Realiza una solicitud automática en segundo plano al endpoint `/api/auth/refresh`, enviando la cookie con el refresh token.
   * La API valida el refresh token y devuelve un nuevo token de acceso.
   * El cliente reintenta la solicitud original que había fallado, haciendo el proceso imperceptible para el usuario.

---

## 3. Middlewares de Seguridad en Backend

La seguridad en la API de Express se garantiza mediante una cadena de middlewares ejecutados antes de los controladores:

### A. Middleware de Autenticación (`authMiddleware.ts`)
* Extrae la cabecera `Authorization` de la solicitud.
* Verifica la firma del JWT utilizando la variable de entorno `JWT_SECRET`.
* Si es válido, extrae el identificador del usuario, su rol y su vinculación de cliente/empleado, adjuntando estos datos al objeto `req.user` para su uso en los controladores.

### B. Guardián de Roles (`requireRole.ts`)
Middleware configurable utilizado para restringir el acceso a endpoints específicos. Se pasa como argumento una lista de roles autorizados:
```typescript
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: "Acceso denegado: rol insuficiente" 
      });
    }
    next();
  };
};
// Uso en ruta: router.post('/vehicles', requireRole('ADMINISTRATOR'), controller.create);
```

### C. Middleware de Validación de Esquemas
Intercepta las solicitudes de creación o modificación de datos y las valida contra los esquemas de Zod del paquete `@rent-car/common`. Si faltan campos o tienen formatos inválidos, responde inmediatamente con un error `400 Bad Request` detallando las inconsistencias de datos, sin tocar la base de datos.

---

## 4. Control de Expiración en Cliente: Rechazo en Cola

Para evitar que la interfaz del frontend se congele en bucles infinitos de carga cuando una sesión ha expirado por inactividad prolongada (por ejemplo, al dejar abierta la tableta del mostrador durante la noche):

* **Interceptor de Sesión (`api-client.ts`):**
  Si el token de acceso expira y la solicitud al endpoint `/api/auth/refresh` falla (indicando que el refresh token de 7 días también ha caducado):
  1. El cliente de API cancela inmediatamente todas las solicitudes HTTP que se encuentren pendientes en la cola de llamadas.
  2. Lanza un evento global de `Session expired` (sesión expirada).
  3. Ejecuta la función de cierre de sesión en el frontend, limpiando la memoria y redirigiendo al usuario a la pantalla de `/auth/login` con un mensaje de alerta localizado.

---

## 5. Localización de Errores de Servidor (Accept-Language)

El backend de FleetVault está diseñado para equipos bilingües. El servicio `TranslationService.ts` traduce las respuestas de error del servidor dinámicamente:

* **Cabecera de Idioma:** El cliente envía el idioma actual del usuario en la cabecera `Accept-Language` (e.g., `es-DO` para español dominicano, o `en-US` para inglés).
* **Traducción en Tiempo Real:** Las excepciones lógicas del sistema (como fallos al validar el crédito corporativo, licencias de conducir vencidas, o vehículos duplicados) se mapean mediante diccionarios locales y se devuelven traducidas según el idioma detectado en la cabecera.
  * *Ejemplo:* Si falla la validación de la licencia y la cabecera pide español, el error responde: `"La fecha de vencimiento de la licencia debe ser posterior a la fecha de devolución."` en lugar de una respuesta en inglés genérica.
