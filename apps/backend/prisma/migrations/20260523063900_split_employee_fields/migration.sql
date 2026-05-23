/*
  Warnings:

  - Renamed column `employeeId` to `checkoutEmployeeId`
  - Added column `returnEmployeeId`

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Rental" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkoutEmployeeId" TEXT NOT NULL,
    "returnEmployeeId" TEXT,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "rentalDate" DATETIME NOT NULL,
    "scheduledReturnDate" DATETIME NOT NULL,
    "actualReturnDate" DATETIME,
    "pricePerDay" REAL NOT NULL,
    "checkoutOdometer" REAL NOT NULL,
    "returnOdometer" REAL,
    "checkoutFuelLevel" TEXT NOT NULL,
    "returnFuelLevel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "signatureUrl" TEXT,
    "returnSignatureUrl" TEXT,
    "purchaseOrderNumber" TEXT,
    "stripePaymentIntentId" TEXT,
    "contractPdfUrl" TEXT,
    "totalCost" REAL,
    "commissionAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rental_checkoutEmployeeId_fkey" FOREIGN KEY ("checkoutEmployeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rental_returnEmployeeId_fkey" FOREIGN KEY ("returnEmployeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rental_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Rental" (
    "id", "checkoutEmployeeId", "returnEmployeeId",
    "customerId", "vehicleId",
    "rentalDate", "scheduledReturnDate", "actualReturnDate",
    "pricePerDay", "checkoutOdometer", "returnOdometer",
    "checkoutFuelLevel", "returnFuelLevel",
    "status", "comments", "signatureUrl", "returnSignatureUrl",
    "purchaseOrderNumber", "stripePaymentIntentId", "contractPdfUrl",
    "totalCost", "commissionAmount", "createdAt", "updatedAt"
)
SELECT
    "id", "employeeId", NULL,
    "customerId", "vehicleId",
    "rentalDate", "scheduledReturnDate", "actualReturnDate",
    "pricePerDay", "checkoutOdometer", "returnOdometer",
    "checkoutFuelLevel", "returnFuelLevel",
    "status", "comments", "signatureUrl", "returnSignatureUrl",
    "purchaseOrderNumber", "stripePaymentIntentId", "contractPdfUrl",
    "totalCost", "commissionAmount", "createdAt", "updatedAt"
FROM "Rental";
DROP TABLE "Rental";
ALTER TABLE "new_Rental" RENAME TO "Rental";
CREATE INDEX "Rental_checkoutEmployeeId_idx" ON "Rental" ("checkoutEmployeeId");
CREATE INDEX "Rental_returnEmployeeId_idx" ON "Rental" ("returnEmployeeId");
CREATE INDEX "Rental_customerId_idx" ON "Rental" ("customerId");
CREATE INDEX "Rental_vehicleId_idx" ON "Rental" ("vehicleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
