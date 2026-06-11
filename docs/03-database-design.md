# Database Design and Entity Model

**FleetVault Enterprise** data persistence is managed through a relational engine (**SQLite** in development and testing environments, and **PostgreSQL** via **Supabase** in production). Access and migrations are controlled through **Prisma ORM**.

---

## 1. Entity-Relationship Diagram (ERD)

Below is the conceptual database model with the actual logical relationships and hierarchies of the project:

```mermaid
erDiagram
    USER ||--o| CUSTOMER : "belongs to"
    USER ||--o| EMPLOYEE : "belongs to"
    VEHICLE_TYPE ||--o{ VEHICLE : "classifies"
    BRAND ||--o{ MODEL : "groups"
    MODEL ||--o{ VEHICLE : "defines"
    FUEL_TYPE ||--o{ VEHICLE : "powers"
    VEHICLE ||--o{ INSPECTION : "receives"
    CUSTOMER ||--o{ INSPECTION : "is inspected by"
    EMPLOYEE ||--o{ INSPECTION : "performs"
    VEHICLE ||--o{ RENTAL : "is rented in"
    CUSTOMER ||--o{ RENTAL : "rents"
    EMPLOYEE ||--o{ RENTAL : "dispatches / receives"
    RENTAL ||--o{ INSPECTION : "associates"
    RENTAL ||--o{ TRANSACTION_LEDGER : "generates"
    VEHICLE ||--o{ GPS_LOG : "transmits"
    INSPECTION ||--o{ INSPECTION_DAMAGE : "details"
    DAMAGE_TYPE ||--o{ INSPECTION_DAMAGE : "classifies"
    DAMAGE_TYPE ||--o| FEE_CONFIG : "has"
    RENTAL_POLICY ||--o| RENTAL_POLICY : "independent"
    COMPANY_INFO ||--o| COMPANY_INFO : "independent"

    USER {
        string id PK
        string email UK
        string passwordHash
        string role
        datetime createdAt
        datetime updatedAt
    }
    VEHICLE_TYPE {
        string id PK
        string name UK
        string description
        float baseDailyRate
        string status
        datetime createdAt
        datetime updatedAt
    }
    BRAND {
        string id PK
        string name UK
        string status
        datetime createdAt
        datetime updatedAt
    }
    MODEL {
        string id PK
        string name
        string brandId FK
        string status
        datetime createdAt
        datetime updatedAt
    }
    FUEL_TYPE {
        string id PK
        string name UK
        string status
        datetime createdAt
        datetime updatedAt
    }
    VEHICLE {
        string id PK
        string description
        string chassisNumber UK
        string engineNumber UK
        string plateNumber UK
        string vehicleTypeId FK
        string brandId FK
        string modelId FK
        string fuelTypeId FK
        float odometer
        float lastMaintenanceOdometer
        string status
        string cleaningStatus
        string imageUrl
        datetime createdAt
        datetime updatedAt
    }
    CUSTOMER {
        string id PK
        string name
        string email
        string phone
        string address
        string nationalId UK
        string creditCardNumber
        float creditLimit
        string type
        string status
        string licenseNumber
        string licenseCountry
        datetime licenseExpDate
        string licensePhotoUrl
        string userId FK
        string stripeCustomerId
        datetime createdAt
        datetime updatedAt
    }
    EMPLOYEE {
        string id PK
        string name
        string nationalId UK
        string phone
        string signatureUrl
        float commissionPercentage
        datetime hireDate
        string shift
        string status
        string userId FK
        datetime createdAt
        datetime updatedAt
    }
    DAMAGE_TYPE {
        string id PK
        string name
        string key UK
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    INSPECTION_DAMAGE {
        string id PK
        string inspectionId FK
        string damageTypeId FK
        string tirePosition
    }
    INSPECTION {
        string id PK
        string rentalId FK
        string type
        string vehicleId FK
        string customerId FK
        string employeeId FK
        string fuelGaugeLevel
        float odometer
        string status
        string photoUrlsJson
        string comments
        datetime inspectionDate
        datetime createdAt
        datetime updatedAt
    }
    RENTAL {
        string id PK
        string checkoutEmployeeId FK
        string returnEmployeeId FK
        string customerId FK
        string vehicleId FK
        datetime rentalDate
        datetime scheduledReturnDate
        datetime actualReturnDate
        float pricePerDay
        float checkoutOdometer
        float returnOdometer
        string checkoutFuelLevel
        string returnFuelLevel
        string status
        string comments
        string signatureUrl
        string returnSignatureUrl
        string purchaseOrderNumber
        string stripePaymentIntentId
        string contractPdfUrl
        string returnReceiptUrl
        string driverName
        string driverLicenseNumber
        string driverLicenseCountry
        datetime driverLicenseExpDate
        string driverLicensePhotoUrl
        float totalCost
        float commissionAmount
        datetime createdAt
        datetime updatedAt
    }
    TRANSACTION_LEDGER {
        string id PK
        string rentalId FK
        float amount
        string type
        string stripePaymentIntentId
        string purchaseOrderNumber
        float stripeFee
        string comments
        datetime createdAt
    }
    GPS_LOG {
        string id PK
        string vehicleId FK
        float latitude
        float longitude
        float speedKmH
        float heading
        datetime timestamp
    }
    GEOFENCE {
        string id PK
        string name
        string coordinatesJson
        string alertEmail
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }
    SEASONAL_RATE {
        string id PK
        string name
        datetime startDate
        datetime endDate
        float multiplier
        string status
        datetime createdAt
        datetime updatedAt
    }
    FEE_CONFIG {
        string id PK
        string key UK
        string label
        float amount
        boolean isActive
        string description
        string damageTypeId FK
        datetime updatedAt
    }
    RENTAL_POLICY {
        string id PK
        string key UK
        string title
        string content
        boolean isActive
        datetime updatedAt
    }
    COMPANY_INFO {
        string id PK
        string companyName
        string rnc
        string address
        string phone
        string email
        string website
        string city
        string logoUrl
        datetime updatedAt
    }
```

---

## 2. Official Prisma Schema (`schema.prisma`)

The physical database model is exactly described in the [schema.prisma](file:///c:/Users/jsjer/OneDrive/Bureaublad/New%20folder/OpenSource%20II/rent-car/apps/backend/prisma/schema.prisma) file:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  role         String    @default("CUSTOMER")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  customer     Customer?
  employee     Employee?
}

model VehicleType {
  id            String    @id @default(uuid())
  name          String    @unique
  description   String?
  baseDailyRate Float     @default(0)
  status        String    @default("ACTIVE")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  vehicles      Vehicle[]
}

model Brand {
  id        String    @id @default(uuid())
  name      String    @unique
  status    String    @default("ACTIVE")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  models    Model[]
  vehicles  Vehicle[]
}

model Model {
  id        String    @id @default(uuid())
  name      String
  brandId   String
  status    String    @default("ACTIVE")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  brand     Brand     @relation(fields: [brandId], references: [id])
  vehicles  Vehicle[]

  @@unique([name, brandId])
}

model FuelType {
  id        String    @id @default(uuid())
  name      String    @unique
  status    String    @default("ACTIVE")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  vehicles  Vehicle[]
}

model Vehicle {
  id                      String       @id @default(uuid())
  description             String?
  chassisNumber           String       @unique
  engineNumber            String       @unique
  plateNumber             String       @unique
  vehicleTypeId           String
  brandId                 String
  modelId                 String
  fuelTypeId              String
  status                  String       @default("AVAILABLE")
  cleaningStatus          String       @default("CLEAN")
  imageUrl                String?
  odometer                Float        @default(0)
  lastMaintenanceOdometer Float        @default(0)
  createdAt               DateTime     @default(now())
  updatedAt               DateTime     @updatedAt
  gpsLogs                 GpsLog[]
  inspections             Inspection[]
  rentals                 Rental[]
  fuelType                FuelType     @relation(fields: [fuelTypeId], references: [id])
  model                   Model        @relation(fields: [modelId], references: [id])
  brand                   Brand        @relation(fields: [brandId], references: [id])
  vehicleType             VehicleType  @relation(fields: [vehicleTypeId], references: [id])
}

model Customer {
  id               String       @id @default(uuid())
  name             String
  email            String?
  phone            String?
  address          String?
  nationalId       String?      @unique
  creditCardNumber String?
  creditLimit      Float        @default(0)
  type             String       @default("INDIVIDUAL")
  status           String       @default("ACTIVE")
  licenseNumber    String?
  licenseCountry   String?
  licenseExpDate   DateTime?
  licensePhotoUrl  String?
  userId           String?      @unique
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  stripeCustomerId String?
  user             User?        @relation(fields: [userId], references: [id])
  inspections      Inspection[]
  rentals          Rental[]
}

model Employee {
  id                   String       @id @default(uuid())
  name                 String
  nationalId           String       @unique
  phone                String?
  signatureUrl         String?
  commissionPercentage Float        @default(0)
  hireDate             DateTime
  shift                String       @default("MORNING")
  status               String       @default("ACTIVE")
  userId               String?      @unique
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  user                 User?        @relation(fields: [userId], references: [id])
  inspections          Inspection[]
  returnRentals        Rental[]     @relation("ReturnEmployee")
  checkoutRentals      Rental[]     @relation("CheckoutEmployee")
}

model DamageType {
  id          String    @id @default(uuid())
  name        String
  key         String    @unique
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  feeConfig   FeeConfig?
  inspections InspectionDamage[]
}

model InspectionDamage {
  id            String     @id @default(uuid())
  inspectionId  String
  damageTypeId  String
  tirePosition  String?
  inspection    Inspection @relation(fields: [inspectionId], references: [id])
  damageType    DamageType @relation(fields: [damageTypeId], references: [id])

  @@unique([inspectionId, damageTypeId, tirePosition])
}

model Inspection {
  id             String             @id @default(uuid())
  rentalId       String
  type           String             @default("PICKUP")
  vehicleId      String
  customerId     String
  employeeId     String
  fuelGaugeLevel String
  odometer       Float
  status         String             @default("PASSED")
  photoUrlsJson  String             @default("[]")
  comments       String?
  inspectionDate DateTime           @default(now())
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  employee       Employee           @relation(fields: [employeeId], references: [id])
  customer       Customer           @relation(fields: [customerId], references: [id])
  vehicle        Vehicle            @relation(fields: [vehicleId], references: [id])
  rental         Rental             @relation(fields: [rentalId], references: [id])
  damages        InspectionDamage[]
}

model Rental {
  id                    String              @id @default(uuid())
  checkoutEmployeeId    String
  returnEmployeeId      String?
  customerId            String
  vehicleId             String
  rentalDate            DateTime
  scheduledReturnDate   DateTime
  actualReturnDate      DateTime?
  pricePerDay           Float
  checkoutOdometer      Float
  returnOdometer        Float?
  checkoutFuelLevel     String
  returnFuelLevel       String?
  status                String              @default("PENDING")
  comments              String?
  signatureUrl          String?
  returnSignatureUrl    String?
  purchaseOrderNumber   String?
  stripePaymentIntentId String?
  contractPdfUrl        String?
  returnReceiptUrl      String?
  driverName            String?
  driverLicenseNumber   String?
  driverLicenseCountry  String?
  driverLicenseExpDate  DateTime?
  driverLicensePhotoUrl String?
  totalCost             Float?
  commissionAmount      Float?
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  inspections           Inspection[]
  vehicle               Vehicle             @relation(fields: [vehicleId], references: [id])
  customer              Customer            @relation(fields: [customerId], references: [id])
  returnEmployee        Employee?           @relation("ReturnEmployee", fields: [returnEmployeeId], references: [id])
  checkoutEmployee      Employee            @relation("CheckoutEmployee", fields: [checkoutEmployeeId], references: [id])
  transactions          TransactionLedger[]

  @@index([vehicleId])
  @@index([customerId])
  @@index([returnEmployeeId])
  @@index([checkoutEmployeeId])
}

model TransactionLedger {
  id                    String   @id @default(uuid())
  rentalId              String
  amount                Float
  type                  String
  stripePaymentIntentId String?
  purchaseOrderNumber   String?
  stripeFee             Float?
  comments              String?
  createdAt             DateTime @default(now())
  rental                Rental   @relation(fields: [rentalId], references: [id])
}

model GpsLog {
  id        String   @id @default(uuid())
  vehicleId String
  latitude  Float
  longitude Float
  speedKmH  Float
  heading   Float
  timestamp DateTime @default(now())
  vehicle   Vehicle  @relation(fields: [vehicleId], references: [id])
}

model Geofence {
  id              String   @id @default(uuid())
  name            String
  coordinatesJson String
  alertEmail      String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model SeasonalRate {
  id         String   @id @default(uuid())
  name       String
  startDate  DateTime
  endDate    DateTime
  multiplier Float
  status     String   @default("ACTIVE")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model FeeConfig {
  id           String      @id @default(uuid())
  key          String?     @unique
  label        String
  amount       Float
  isActive     Boolean     @default(true)
  description  String?
  damageTypeId String?     @unique
  damageType   DamageType? @relation(fields: [damageTypeId], references: [id])
  updatedAt    DateTime    @updatedAt
}

model RentalPolicy {
  id        String   @id @default(uuid())
  key       String   @unique
  title     String
  content   String
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt
}

model CompanyInfo {
  id           String   @id @default(uuid())
  companyName  String
  rnc          String
  address      String
  phone        String
  email        String
  website      String?
  city         String
  logoUrl      String?
  updatedAt    DateTime @updatedAt
}
```
