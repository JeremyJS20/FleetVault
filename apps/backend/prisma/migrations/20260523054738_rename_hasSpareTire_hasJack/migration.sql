/*
  Warnings:

  - Renamed column `hasSpareTire` to `missingSpareTire`
  - Renamed column `hasJack` to `missingJack`

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
    "missingSpareTire" BOOLEAN NOT NULL DEFAULT false,
    "missingJack" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Inspection" (
    "id", "rentalId", "type", "vehicleId", "customerId", "employeeId",
    "hasScratches", "fuelGaugeLevel", "fuelGaugePhotoUrl",
    "missingSpareTire", "missingJack", "hasBrokenGlass",
    "tireConditionFrontLeft", "tireConditionFrontRight",
    "tireConditionRearLeft", "tireConditionRearRight",
    "odometer", "status", "photoUrlsJson", "comments",
    "inspectionDate", "createdAt", "updatedAt"
)
SELECT
    "id", "rentalId", "type", "vehicleId", "customerId", "employeeId",
    "hasScratches", "fuelGaugeLevel", "fuelGaugePhotoUrl",
    CASE WHEN "hasSpareTire" = 1 THEN 0 ELSE 1 END AS "missingSpareTire",
    CASE WHEN "hasJack" = 1 THEN 0 ELSE 1 END AS "missingJack",
    "hasBrokenGlass",
    "tireConditionFrontLeft", "tireConditionFrontRight",
    "tireConditionRearLeft", "tireConditionRearRight",
    "odometer", "status", "photoUrlsJson", "comments",
    "inspectionDate", "createdAt", "updatedAt"
FROM "Inspection";
DROP TABLE "Inspection";
ALTER TABLE "new_Inspection" RENAME TO "Inspection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
