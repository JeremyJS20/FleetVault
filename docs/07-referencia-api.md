# Referencia de la API REST

Toda comunicación entre el cliente frontend y el servidor de API se realiza bajo el estándar RESTful utilizando payloads formateados en **JSON**. La API del backend se ejecuta por defecto en el puerto `3001` (`http://localhost:3001`).

---

## 1. Estructura de Respuesta Estándar

Todas las respuestas de la API siguen un esquema unificado para simplificar su manejo en el cliente:

### Respuesta Excitosa (Success)
```json
{
  "success": true,
  "data": { ... }
}
```

### Respuesta Paginada (Paginated)
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

### Respuesta de Error (Error)
```json
{
  "success": false,
  "error": "Mensaje descriptivo del error traducido",
  "details": {
    "field": ["Descripción de la regla rota"]
  }
}
```

---

## 2. Endpoints de Autenticación (`/api/auth`)

### Registro de Usuario General
* **Método:** `POST`
* **Ruta:** `/api/auth/register`
* **Cuerpo (JSON):**
  ```json
  {
    "email": "usuario@correo.com",
    "password": "Password123*",
    "role": "CUSTOMER"
  }
  ```

### Inicio de Sesión (Login)
* **Método:** `POST`
* **Ruta:** `/api/auth/login`
* **Cuerpo:**
  ```json
  {
    "email": "usuario@correo.com",
    "password": "Password123*"
  }
  ```
* **Respuesta:** Devuelve los datos del perfil y genera un `accessToken` en la respuesta, además de establecer el `refreshToken` en una cookie segura HttpOnly.

### Refrescar Token de Acceso
* **Método:** `POST`
* **Ruta:** `/api/auth/refresh`
* **Cuerpo:** Ninguno (lee de las cookies de la petición).
* **Respuesta:** Devuelve un nuevo `accessToken` válido por 15 minutos.

---

## 3. Catálogo Público (`/api/catalog`)
Rutas públicas que no requieren autenticación, optimizadas para el motor de reservas web del cliente.

### Búsqueda de Vehículos Disponibles
* **Método:** `GET`
* **Ruta:** `/api/catalog/vehicles`
* **Parámetros de Consulta (Query):** `?type=SUV&brand=Toyota&dateFrom=2026-06-15&dateTo=2026-06-20`
* **Respuesta:** Devuelve un listado de vehículos disponibles (filtrando aquellos que no tengan alquileres aprobados en esas fechas ni estén bajo mantenimiento).

---

## 4. Gestión de Clientes (`/api/customers`)

### Crear Cliente
* **Método:** `POST`
* **Ruta:** `/api/customers`
* **Autorización:** `AGENT` o `ADMINISTRATOR`
* **Cuerpo:**
  ```json
  {
    "name": "Pedro Martínez",
    "nationalId": "001-1234567-8",
    "creditLimit": 0,
    "type": "INDIVIDUAL",
    "licenseNumber": "N091823",
    "licenseCountry": "República Dominicana",
    "licenseExpDate": "2028-12-31T23:59:59Z",
    "licensePhotoUrl": "https://bucket.vercel.app/licencias/pedro.jpg"
  }
  ```

### Obtener Métodos de Pago Guardados (Wallet)
* **Método:** `GET`
* **Ruta:** `/api/customers/:id/payment-methods`
* **Autorización:** `AGENT` o `ADMINISTRATOR` (o `CUSTOMER` para su propio perfil en `/api/customers/me/payment-methods`)
* **Respuesta:** Retorna el listado de tarjetas tokenizadas asociadas al perfil de Stripe del cliente, ocultando los números y mostrando solo la franquicia (Visa, MasterCard) y los últimos 4 dígitos.

### Desvincular Tarjeta (Detalle de Billetera)
* **Método:** `DELETE`
* **Ruta:** `/api/customers/:id/payment-methods/:paymentMethodId`
* **Respuesta:** Remueve la tarjeta del Wallet de Stripe. Devuelve error si el cliente tiene un alquiler activo.

---

## 5. Inspecciones (`/api/inspections`)

### Crear Inspección (Check-In / Check-Out)
* **Método:** `POST`
* **Ruta:** `/api/inspections`
* **Autorización:** `INSPECTOR` o `ADMINISTRATOR`
* **Cuerpo:**
  ```json
  {
    "rentalId": "rent-998822",
    "type": "PICKUP",
    "vehicleId": "veh-102",
    "customerId": "cust-882",
    "employeeId": "emp-02",
    "hasScratches": true,
    "fuelGaugeLevel": "THREE_QUARTERS",
    "missingSpareTire": false,
    "missingJack": false,
    "hasBrokenGlass": false,
    "tireConditionFrontLeft": "GOOD",
    "tireConditionFrontRight": "GOOD",
    "tireConditionRearLeft": "GOOD",
    "tireConditionRearRight": "DAMAGED",
    "odometer": 15450,
    "photoUrls": [
      "https://bucket.vercel.app/uploads/tablero.jpg",
      "https://bucket.vercel.app/uploads/goma_dada.jpg"
    ]
  }
  ```
* **Respuesta:** Retorna la inspección creada. El estado se calcula automáticamente: si hay fallos o vidrios rotos, se marca como `FLAGGED`, de lo contrario es `PASSED`.

---

## 6. Contratos de Alquiler (`/api/rentals`)

### Ejecutar Alquiler (Checkout Contract)
* **Método:** `POST`
* **Ruta:** `/api/rentals`
* **Autorización:** `AGENT` o `ADMINISTRATOR`
* **Cuerpo:**
  ```json
  {
    "customerId": "cust-882",
    "vehicleId": "veh-102",
    "rentalDate": "2026-06-12T09:00:00Z",
    "scheduledReturnDate": "2026-06-15T18:00:00Z",
    "checkoutEmployeeId": "emp-01",
    "purchaseOrderNumber": null
  }
  ```
* **Respuesta:** Devuelve el contrato generado con costo de alquiler estimado. Si es cliente individual, Stripe ejecuta la retención y se registra en el ledger.

### Registrar Devolución y Cierre (Return & Settlement)
* **Método:** `POST`
* **Ruta:** `/api/rentals/:id/return`
* **Autorización:** `AGENT` o `ADMINISTRATOR`
* **Cuerpo:**
  ```json
  {
    "returnEmployeeId": "emp-01",
    "returnOdometer": 15890,
    "returnFuelLevel": "HALF",
    "actualReturnDate": "2026-06-15T17:30:00Z",
    "hasScratches": true,
    "missingSpareTire": false,
    "missingJack": false,
    "hasBrokenGlass": false,
    "tireConditionFrontLeft": "GOOD",
    "tireConditionFrontRight": "GOOD",
    "tireConditionRearLeft": "GOOD",
    "tireConditionRearRight": "GOOD"
  }
  ```
* **Respuesta:** Cierra el alquiler. Devuelve el desglose de cobros de penalizaciones y costo final calculado:
  ```json
  {
    "success": true,
    "data": {
      "rentalNo": "rc-40092",
      "daysCount": 3,
      "baseCost": 150.00,
      "lateFee": 0.00,
      "refuelingPenalty": 50.00,
      "damagePenalty": 0.00,
      "totalCost": 200.00,
      "status": "COMPLETED"
    }
  }
  ```

### Adjuntar Firmas E-Sign
* **Método:** `POST`
* **Ruta:** `/api/rentals/:id/sign`
* **Cuerpo:**
  ```json
  {
    "type": "CHECKOUT",
    "signatureDataUrl": "data:image/png;base64,iVBORw0KGgo...",
    "ipAddress": "192.168.1.144",
    "userAgent": "Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X)..."
  }
  ```

---

## 7. Carga de Archivos (`/api/uploads`)

### Subir Archivo a Vercel Blob
* **Método:** `POST`
* **Ruta:** `/api/uploads`
* **Tipo de Contenido:** `multipart/form-data`
* **Payload:** Clave `file` con el binario de la foto (límite de 5MB, solo imágenes JPEG/PNG).
* **Respuesta:** Retorna la URL segura donde se almacenó el archivo en el bucket privado.

### Proxy de Visualización de Archivos
* **Método:** `GET`
* **Ruta:** `/api/uploads/proxy`
* **Parámetros de Consulta:** `?url=https://bucket.vercel.app/uploads/archivo.jpg`
* **Respuesta:** Transmite la imagen directamente en formato binario con su Content-Type correspondiente, previa validación de la sesión JWT del solicitante.

---

## 8. Reportes Administrativos (`/api/reports`)
Exclusivos para usuarios con rol `ADMINISTRATOR`.

* `GET /api/reports/utilization?dateFrom=...&dateTo=...`: Genera la tasa de utilización global de vehículos de la flota.
* `GET /api/reports/revenue?dateFrom=...&dateTo=...`: Agrupa las ganancias brutas consolidadas por categorías de vehículos.
* `GET /api/reports/commissions?dateFrom=...&dateTo=...`: Genera el listado de comisiones de ventas a pagar al personal de sucursal.
