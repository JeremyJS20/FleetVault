/*
  Warnings:

  - Made the column `rentalId` on table `Inspection` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rentalId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PICKUP',
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "hasScratches" BOOLEAN NOT NULL DEFAULT false,
    "fuelGaugeLevel" TEXT NOT NULL,
    "fuelGaugePhotoUrl" TEXT NOT NULL,
    "hasSpareTire" BOOLEAN NOT NULL DEFAULT true,
    "hasJack" BOOLEAN NOT NULL DEFAULT true,
    "hasBrokenGlass" BOOLEAN NOT NULL DEFAULT false,
    "tireConditionFrontLeft" TEXT NOT NULL DEFAULT 'GOOD',
    "tireConditionFrontRight" TEXT NOT NULL DEFAULT 'GOOD',
    "tireConditionRearLeft" TEXT NOT NULL DEFAULT 'GOOD',
    "tireConditionRearRight" TEXT NOT NULL DEFAULT 'GOOD',
    "odometer" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PASSED',
    "photoUrlsJson" TEXT NOT NULL DEFAULT '[]',
    "comments" TEXT,
    "inspectionDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inspection_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inspection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Inspection" ("comments", "createdAt", "customerId", "employeeId", "fuelGaugeLevel", "fuelGaugePhotoUrl", "hasBrokenGlass", "hasJack", "hasScratches", "hasSpareTire", "id", "inspectionDate", "odometer", "photoUrlsJson", "rentalId", "status", "tireConditionFrontLeft", "tireConditionFrontRight", "tireConditionRearLeft", "tireConditionRearRight", "updatedAt", "vehicleId") SELECT "comments", "createdAt", "customerId", "employeeId", "fuelGaugeLevel", "fuelGaugePhotoUrl", "hasBrokenGlass", "hasJack", "hasScratches", "hasSpareTire", "id", "inspectionDate", "odometer", "photoUrlsJson", "rentalId", "status", "tireConditionFrontLeft", "tireConditionFrontRight", "tireConditionRearLeft", "tireConditionRearRight", "updatedAt", "vehicleId" FROM "Inspection";
DROP TABLE "Inspection";
ALTER TABLE "new_Inspection" RENAME TO "Inspection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
