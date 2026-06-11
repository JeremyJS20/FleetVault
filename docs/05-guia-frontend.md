# Guía del Desarrollador Frontend y Sistema de Diseño

El frontend de **FleetVault Enterprise** es una aplicación de página única (SPA) de alto rendimiento construida sobre **React 19**, **TypeScript**, **Vite** y **Tailwind CSS v4**. Está diseñada bajo una estética premium, moderna y optimizada para dispositivos móviles y tabletas utilizados en el patio.

---

## 1. Sistema de Diseño: Tema Visual "Liquid Glass"

La interfaz de usuario implementa un estilo visual sofisticado basado en *glassmorphism* mate y contrastes limpios. Todos los estilos están centralizados en `src/index.css`.

### Tokens de Diseño Base
* **Fondo del Sistema (Backdrop):** Slate oscuro (`#0f172a` y `#1e293b`).
* **Paneles y Tarjetas (Glass Panels):** Fondos traslúcidos con bordes delgados de bajo contraste para simular vidrio:
  * Color fondo: `rgba(30, 41, 59, 0.7)` (slate con opacidad).
  * Color de borde: `rgba(255, 255, 255, 0.05)`.
  * Filtro de desenfoque de fondo: `backdrop-filter: blur(24px)`.
* **Tipografía Principal:** Fuente **Satoshi** (o Outfit como alternativa de Google Fonts) para dar un aspecto moderno y técnico.
* **Transiciones y Micro-Animaciones:** Transiciones suaves con curvas de aceleración natural:
  * Curva por defecto: `transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1)`.
* **Accesibilidad (Contraste AA):** Todo texto interactivo cumple con la legibilidad de contraste de la W3C, utilizando blancos puros (`#ffffff`) para encabezados y grises de alta luminancia (`#94a3b8`) para descripciones secundarias.

---

## 2. Gestión de Estados

El frontend divide la gestión de estados en dos categorías diferenciadas para evitar re-renderizados innecesarios y optimizar el rendimiento:

### A. Estado de Servidor (Server State) con TanStack React Query v5
Toda consulta a la base de datos (catálogos, listados de alquileres, reservas) es manejada por React Query. Esto permite:
* Almacenamiento en caché en memoria y actualizaciones automáticas en segundo plano.
* Control explícito de estados de carga (`isLoading`), éxito e intentos fallidos.
* Invalidación del caché tras mutaciones (por ejemplo, al crear un alquiler, se invalida el listado de vehículos disponibles para forzar la actualización inmediata en pantalla).

### B. Estado Local de Autenticación (AuthContext)
Mantiene la sesión del usuario iniciada. Utiliza un token JWT almacenado en memoria segura y un *refresh token* guardado en cookies seguras. Controla el rol del usuario actual y activa redirecciones automáticas si la sesión expira.

---

## 3. Enrutamiento y Protección de Rutas

El enrutamiento está a cargo de **React Router v7** (`BrowserRouter`), estructurado a través de plantillas de diseño (*Layouts*) y guardianes de rol (*Protected Routes*):

* **Rutas Públicas (`/` y `/auth/*`):** Landing page, catálogo de vehículos público y pantallas de login/registro de clientes.
* **Rutas de Cliente (`/profile`, `/my-rentals`):** Vistas exclusivas para clientes autenticados.
* **Portal de Operaciones (`/admin/*`):** Sidebar persistente y módulos avanzados accesibles según el rol del empleado:
  * `ADMINISTRATOR`: Acceso completo a catálogos, configuraciones de tarifas, empleados y reportes de rentabilidad.
  * `AGENT`: Acceso a reservas, clientes y módulo de facturación (creación de alquileres y devoluciones).
  * `INSPECTOR`: Acceso restringido al listado de vehículos e inicio de checklists de inspección física.

> [!CAUTION]
> Si un empleado con rol de `INSPECTOR` intenta acceder por URL directa a `/admin/employees`, el componente `ProtectedRoute` intercepta la solicitud, deniega el acceso y lo redirige automáticamente a la página del panel base `/admin`.

---

## 4. Soporte Fuera de Línea (Offline Support) en Inspecciones

Debido a que el patio de vehículos puede tener problemas de señal Wi-Fi o datos móviles (*dead zones*), el módulo de inspección física incluye un motor de persistencia fuera de línea:

### Flujo de Sincronización Fuera de Línea
1. **Detección de Red:** El componente `NetworkStatusProvider` monitorea el estado del navegador (`navigator.onLine`).
2. **Cola en IndexedDB:** Si la red se cae, el formulario de inspección del patio se valida localmente y se almacena en la base de datos local del navegador `fleetvault-offline-db` dentro de la colección `inspections-queue`.
3. **Banner Informativo:** Aparece una barra flotante en la parte inferior de la pantalla advirtiendo que el dispositivo está trabajando en modo desconectado y mostrando el conteo de inspecciones pendientes de subir.
4. **Sincronización Automática:** En cuanto el dispositivo recupera señal de red, el sistema inicia un proceso en segundo plano que lee la cola de IndexedDB y sube las inspecciones una a una mediante la API `/api/inspections`, eliminándolas de la memoria local tras confirmarse el éxito.

---

## 5. Captura de Licencia de Conducir con Cámara (Camera Snapshot)

El formulario de creación de clientes y el despacho en mostrador integran el componente `<LicensePhotoCapture />` para digitalizar documentos al instante:

* **Acceso de Medios:** Utiliza la API nativa de JavaScript `navigator.mediaDevices.getUserMedia`.
* **Preferencia de Cámara:** Para optimizar el uso desde teléfonos móviles, el componente tiene una preferencia por la cámara trasera:
  ```typescript
  const constraints = { video: { facingMode: { ideal: 'environment' } } };
  ```
  Esto prioriza el lente principal del teléfono móvil, pero si se ejecuta desde una laptop de escritorio sin cámara trasera, cae de forma automática y suave a la cámara frontal sin arrojar errores de restricción de hardware (*OverconstrainedError*).
* **Captura a JPEG:** El frame de video se dibuja en un canvas oculto, se exporta como blob JPEG y se envía al endpoint `/api/uploads` del servidor para su almacenamiento privado.

---

## 6. Carga de Imágenes y Proxy de Seguridad

El sistema almacena las fotografías de daños y documentos de clientes en contenedores privados de **Vercel Blob** para evitar fugas de información.

* **Renderizado con Proxy:** En lugar de renderizar las imágenes utilizando la URL directa del bucket de almacenamiento, todos los componentes del frontend envuelven la URL en la función helper `getImageProxyUrl`:
  ```typescript
  const proxyUrl = getImageProxyUrl(vehicle.imageUrl);
  // Devuelve: /api/uploads/proxy?url=https://blob.vercel.com/imagen.jpg
  ```
* **Protección de Enlaces:** Esto asegura que el navegador del cliente realice la solicitud a través de la API del backend, el cual valida que la sesión del usuario esté activa y tenga los permisos de rol correspondientes antes de hacer streaming del contenido multimedia.
