-- Recreate Inspection table without fuelGaugePhotoUrl
CREATE TABLE "new_Inspection" (
    "id"                      TEXT    NOT NULL PRIMARY KEY,
    "rentalId"                TEXT    NOT NULL,
    "type"                    TEXT    NOT NULL DEFAULT 'PICKUP',
    "vehicleId"               TEXT    NOT NULL,
    "customerId"              TEXT    NOT NULL,
    "employeeId"              TEXT    NOT NULL,
    "hasScratches"            BOOLEAN NOT NULL DEFAULT false,
    "fuelGaugeLevel"          TEXT    NOT NULL,
    "missingSpareTire"        BOOLEAN NOT NULL DEFAULT false,
    "missingJack"             BOOLEAN NOT NULL DEFAULT false,
    "hasBrokenGlass"          BOOLEAN NOT NULL DEFAULT false,
    "tireConditionFrontLeft"  TEXT    NOT NULL DEFAULT 'GOOD',
    "tireConditionFrontRight" TEXT    NOT NULL DEFAULT 'GOOD',
    "tireConditionRearLeft"   TEXT    NOT NULL DEFAULT 'GOOD',
    "tireConditionRearRight"  TEXT    NOT NULL DEFAULT 'GOOD',
    "odometer"                REAL    NOT NULL,
    "status"                  TEXT    NOT NULL DEFAULT 'PASSED',
    "photoUrlsJson"           TEXT    NOT NULL DEFAULT '[]',
    "comments"                TEXT,
    "inspectionDate"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               DATETIME NOT NULL,
    CONSTRAINT "fk_Inspection_employee" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id"),
    CONSTRAINT "fk_Inspection_customer" FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
    CONSTRAINT "fk_Inspection_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id"),
    CONSTRAINT "fk_Inspection_rental" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id")
);

-- Copy existing data, dropping fuelGaugePhotoUrl
INSERT INTO "new_Inspection" ("id", "rentalId", "type", "vehicleId", "customerId", "employeeId", "hasScratches", "fuelGaugeLevel", "missingSpareTire", "missingJack", "hasBrokenGlass", "tireConditionFrontLeft", "tireConditionFrontRight", "tireConditionRearLeft", "tireConditionRearRight", "odometer", "status", "photoUrlsJson", "comments", "inspectionDate", "createdAt", "updatedAt")
SELECT "id", "rentalId", "type", "vehicleId", "customerId", "employeeId", "hasScratches", "fuelGaugeLevel", "missingSpareTire", "missingJack", "hasBrokenGlass", "tireConditionFrontLeft", "tireConditionFrontRight", "tireConditionRearLeft", "tireConditionRearRight", "odometer", "status", "photoUrlsJson", "comments", "inspectionDate", "createdAt", "updatedAt"
FROM "Inspection";

-- Drop old table
DROP TABLE "Inspection";

-- Rename new table
ALTER TABLE "new_Inspection" RENAME TO "Inspection";

-- Recreate indexes
CREATE INDEX "Inspection_rentalId_idx" ON "Inspection"("rentalId");
CREATE INDEX "Inspection_vehicleId_idx" ON "Inspection"("vehicleId");
CREATE INDEX "Inspection_customerId_idx" ON "Inspection"("customerId");
CREATE INDEX "Inspection_employeeId_idx" ON "Inspection"("employeeId");
