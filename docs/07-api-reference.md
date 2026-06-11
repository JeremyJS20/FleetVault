# REST API Reference

All communication between the frontend client and the API server follows the RESTful standard using **JSON** formatted payloads. The backend API runs by default on port `3001` (`http://localhost:3001`).

---

## 1. Standard Response Structure

All API responses follow a unified schema to simplify client-side handling:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response
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

### Error Response
```json
{
  "success": false,
  "error": "Descriptive translated error message",
  "details": {
    "field": ["Description of the broken rule"]
  }
}
```

---

## 2. Authentication Endpoints (`/api/auth`)

### General User Registration
* **Method:** `POST`
* **Path:** `/api/auth/register`
* **Body (JSON):**
  ```json
  {
    "email": "user@email.com",
    "password": "Password123*",
    "role": "CUSTOMER"
  }
  ```

### Login
* **Method:** `POST`
* **Path:** `/api/auth/login`
* **Body:**
  ```json
  {
    "email": "user@email.com",
    "password": "Password123*"
  }
  ```
* **Response:** Returns profile data and generates an `accessToken` in the response, in addition to setting the `refreshToken` in a secure HttpOnly cookie.

### Refresh Access Token
* **Method:** `POST`
* **Path:** `/api/auth/refresh`
* **Body:** None (reads from request cookies).
* **Response:** Returns a new `accessToken` valid for 15 minutes.

---

## 3. Public Catalog (`/api/catalog`)
Public routes that do not require authentication, optimized for the web customer reservation engine.

### Search Available Vehicles
* **Method:** `GET`
* **Path:** `/api/catalog/vehicles`
* **Query Parameters:** `?type=SUV&brand=Toyota&dateFrom=2026-06-15&dateTo=2026-06-20`
* **Response:** Returns a list of available vehicles (filtering out those with approved rentals during those dates or under maintenance).

---

## 4. Customer Management (`/api/customers`)

### Create Customer
* **Method:** `POST`
* **Path:** `/api/customers`
* **Authorization:** `AGENT` or `ADMINISTRATOR`
* **Body:**
  ```json
  {
    "name": "John Martinez",
    "nationalId": "001-1234567-8",
    "creditLimit": 0,
    "type": "INDIVIDUAL",
    "licenseNumber": "N091823",
    "licenseCountry": "Dominican Republic",
    "licenseExpDate": "2028-12-31T23:59:59Z",
    "licensePhotoUrl": "https://bucket.vercel.app/licenses/john.jpg"
  }
  ```

### Get Saved Payment Methods (Wallet)
* **Method:** `GET`
* **Path:** `/api/customers/:id/payment-methods`
* **Authorization:** `AGENT` or `ADMINISTRATOR` (or `CUSTOMER` for their own profile at `/api/customers/me/payment-methods`)
* **Response:** Returns the list of tokenized cards associated with the customer's Stripe profile, hiding numbers and showing only the brand (Visa, MasterCard) and last 4 digits.

### Unlink Card (Wallet Detail)
* **Method:** `DELETE`
* **Path:** `/api/customers/:id/payment-methods/:paymentMethodId`
* **Response:** Removes the card from the Stripe Wallet. Returns error if the customer has an active rental.

---

## 5. Inspections (`/api/inspections`)

### Create Inspection (Check-In / Check-Out)
* **Method:** `POST`
* **Path:** `/api/inspections`
* **Authorization:** `INSPECTOR` or `ADMINISTRATOR`
* **Body:**
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
      "https://bucket.vercel.app/uploads/dashboard.jpg",
      "https://bucket.vercel.app/uploads/damaged_tire.jpg"
    ]
  }
  ```
* **Response:** Returns the created inspection. The status is calculated automatically: if there are failures or broken glass, it is marked as `FLAGGED`, otherwise it is `PASSED`.

---

## 6. Rental Contracts (`/api/rentals`)

### Execute Rental (Checkout Contract)
* **Method:** `POST`
* **Path:** `/api/rentals`
* **Authorization:** `AGENT` or `ADMINISTRATOR`
* **Body:**
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
* **Response:** Returns the generated contract with estimated rental cost. If individual customer, Stripe executes the hold and it is recorded in the ledger.

### Register Return and Settlement
* **Method:** `POST`
* **Path:** `/api/rentals/:id/return`
* **Authorization:** `AGENT` or `ADMINISTRATOR`
* **Body:**
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
* **Response:** Closes the rental. Returns the penalty charge breakdown and calculated final cost:
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

### Attach E-Signatures
* **Method:** `POST`
* **Path:** `/api/rentals/:id/sign`
* **Body:**
  ```json
  {
    "type": "CHECKOUT",
    "signatureDataUrl": "data:image/png;base64,iVBORw0KGgo...",
    "ipAddress": "192.168.1.144",
    "userAgent": "Mozilla/5.0 (iPad; CPU OS 15_4 like Mac OS X)..."
  }
  ```

---

## 7. File Upload (`/api/uploads`)

### Upload File to Vercel Blob
* **Method:** `POST`
* **Path:** `/api/uploads`
* **Content Type:** `multipart/form-data`
* **Payload:** `file` key with the photo binary (5MB limit, JPEG/PNG images only).
* **Response:** Returns the secure URL where the file was stored in the private bucket.

### File Display Proxy
* **Method:** `GET`
* **Path:** `/api/uploads/proxy`
* **Query Parameters:** `?url=https://bucket.vercel.app/uploads/file.jpg`
* **Response:** Streams the image directly in binary format with its corresponding Content-Type, after validating the requester's JWT session.

---

## 8. Administrative Reports (`/api/reports`)
Exclusive for users with `ADMINISTRATOR` role.

* `GET /api/reports/utilization?dateFrom=...&dateTo=...`: Generates the global fleet vehicle utilization rate.
* `GET /api/reports/revenue?dateFrom=...&dateTo=...`: Groups consolidated gross earnings by vehicle categories.
* `GET /api/reports/commissions?dateFrom=...&dateTo=...`: Generates the list of sales commissions payable to branch staff.
