-- AlterTable
ALTER TABLE "Rental" ADD COLUMN "driverName" TEXT;
ALTER TABLE "Rental" ADD COLUMN "driverLicenseNumber" TEXT;
ALTER TABLE "Rental" ADD COLUMN "driverLicenseCountry" TEXT;
ALTER TABLE "Rental" ADD COLUMN "driverLicenseExpDate" DATETIME;
ALTER TABLE "Rental" ADD COLUMN "driverLicensePhotoUrl" TEXT;
