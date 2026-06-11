# Security, Authentication, and Access Control (RBAC)

Security in **FleetVault Enterprise** is built on two fundamental pillars: JSON Web Token (**JWT**) authentication and Role-Based Access Control (**RBAC**), applied both at the API level on the server and at the route and interface level on the client.

---

## 1. Role and Permission Matrix

The system defines four logical roles. Below is the access control matrix detailing which operations are allowed for each profile:

| Operation / Action | Customer (CUSTOMER) | Inspector (INSPECTOR) | Agent (AGENT) | Administrator (ADMINISTRATOR) |
| :--- | :---: | :---: | :---: | :---: |
| **Search Public Catalog** | ✓ | ✓ | ✓ | ✓ |
| **View Own Reservations** | ✓ | ✗ | ✗ | ✗ |
| **Modify Own Profile** | ✓ | ✗ | ✗ | ✗ |
| **Register New Customer** | ✗ | ✗ | ✓ | ✓ |
| **Create Physical Inspection** | ✗ | ✓ | ✗ | ✓ |
| **Approve Rental (Checkout)** | ✗ | ✗ | ✓ | ✓ |
| **Process Return** | ✗ | ✗ | ✓ | ✓ |
| **Register Purchase Order (PO)** | ✗ | ✗ | ✓ | ✓ |
| **Edit Fleet Catalogs** | ✗ | ✗ | ✗ | ✓ |
| **Edit Multipliers and Rates** | ✗ | ✗ | ✗ | ✓ |
| **View Profitability Reports** | ✗ | ✗ | ✗ | ✓ |
| **Manage Employees and Roles** | ✗ | ✗ | ✗ | ✓ |

---

## 2. Session Authentication Cycle (JWT)

The system uses a dual-token authentication mechanism to maintain session security without saturating the database with frequent verification queries:

1. **Access Token:**
   * Short-lived JWT token (expires in **15 minutes**).
   * Stored in the frontend application's RAM (not exposed in LocalStorage).
   * Sent in the HTTP header of each protected request:
     `Authorization: Bearer <Token>`
2. **Refresh Token:**
   * Long-lived JWT token (expires in **7 days**).
   * Stored in a secure browser cookie configured as `HttpOnly`, `Secure`, and `SameSite=Strict`. This prevents XSS script reading attacks.
3. **Automatic Refresh Flow:**
   * When the access token expires, the client intercepts the `401 Unauthorized` HTTP response from the API.
   * It makes an automatic background request to the `/api/auth/refresh` endpoint, sending the refresh token cookie.
   * The API validates the refresh token and returns a new access token.
   * The client retries the original failed request, making the process imperceptible to the user.

---

## 3. Backend Security Middleware

Security on the Express API is ensured through a chain of middleware executed before the controllers:

### A. Authentication Middleware (`authMiddleware.ts`)
* Extracts the `Authorization` header from the request.
* Verifies the JWT signature using the `JWT_SECRET` environment variable.
* If valid, extracts the user ID, role, and associated customer/employee linkage, attaching this data to the `req.user` object for use in controllers.

### B. Role Guard (`requireRole.ts`)
Configurable middleware used to restrict access to specific endpoints. A list of authorized roles is passed as an argument:
```typescript
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: "Access denied: insufficient role" 
      });
    }
    next();
  };
};
// Route usage: router.post('/vehicles', requireRole('ADMINISTRATOR'), controller.create);
```

### C. Schema Validation Middleware
Intercepts data creation or modification requests and validates them against the Zod schemas from the `@rent-car/common` package. If fields are missing or have invalid formats, it immediately responds with a `400 Bad Request` error detailing the data inconsistencies, without touching the database.

---

## 4. Client-Side Expiration Control: Queued Rejection

To prevent the frontend interface from freezing in infinite loading loops when a session has expired due to prolonged inactivity (e.g., leaving the counter tablet open overnight):

* **Session Interceptor (`api-client.ts`):**
  If the access token expires and the request to the `/api/auth/refresh` endpoint fails (indicating the 7-day refresh token has also expired):
  1. The API client immediately cancels all pending HTTP requests in the call queue.
  2. Fires a global `Session expired` event.
  3. Executes the logout function on the frontend, clearing memory and redirecting the user to the `/auth/login` screen with a localized alert message.

---

## 5. Server Error Localization (Accept-Language)

The FleetVault backend is designed for bilingual teams. The `TranslationService.ts` dynamically translates server error responses:

* **Language Header:** The client sends the current user language in the `Accept-Language` header (e.g., `es-DO` for Dominican Spanish, or `en-US` for English).
* **Real-Time Translation:** Logical system exceptions (such as corporate credit validation failures, expired driver licenses, or duplicate vehicles) are mapped through local dictionaries and returned translated according to the language detected in the header.
  * *Example:* If license validation fails and the header requests Spanish, the error responds: `"La fecha de vencimiento de la licencia debe ser posterior a la fecha de devolución."` instead of a generic English response.
