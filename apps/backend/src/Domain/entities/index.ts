export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  nationalId?: string | null;
  creditCardNumber?: string | null;
  creditLimit: number;
  type: string;
  status: string;
  licenseNumber?: string | null;
  licenseCountry?: string | null;
  licenseExpDate?: Date | null;
  licensePhotoUrl?: string | null;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  nationalId: string;
  commissionPercentage: number;
  hireDate: Date;
  shift: string;
  status: string;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  description?: string | null;
  chassisNumber: string;
  engineNumber: string;
  plateNumber: string;
  vehicleTypeId: string;
  brandId: string;
  modelId: string;
  fuelTypeId: string;
  status: string;
  cleaningStatus: string;
  imageUrl?: string | null;
  odometer: number;
  lastMaintenanceOdometer: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleType {
  id: string;
  name: string;
  description?: string | null;
  baseDailyRate: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeConfig {
  id: string;
  key: string | null;
  label: string;
  amount: number;
  isActive: boolean;
  description: string | null;
  damageTypeId: string | null;
  updatedAt: Date;
}

export interface RentalPolicy {
  id: string;
  key: string;
  title: string;
  content: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface Brand {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Model {
  id: string;
  name: string;
  brandId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FuelType {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionDamage {
  id: string;
  inspectionId: string;
  damageTypeId: string;
  tirePosition?: string | null;
}

export interface Inspection {
  id: string;
  rentalId?: string | null;
  vehicleId: string;
  customerId: string;
  employeeId: string;
  fuelGaugeLevel: string;
  odometer: number;
  status: string;
  photoUrlsJson: string;
  comments?: string | null;
  inspectionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  damages?: InspectionDamage[];
}

export interface DamageType {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rental {
  id: string;
  checkoutEmployeeId: string;
  returnEmployeeId?: string | null;
  customerId: string;
  vehicleId: string;
  rentalDate: Date;
  scheduledReturnDate: Date;
  actualReturnDate?: Date | null;
  pricePerDay: number;
  checkoutOdometer: number;
  returnOdometer?: number | null;
  checkoutFuelLevel: string;
  returnFuelLevel?: string | null;
  status: string;
  comments?: string | null;
  signatureUrl?: string | null;
  returnSignatureUrl?: string | null;
  purchaseOrderNumber?: string | null;
  stripePaymentIntentId?: string | null;
  contractPdfUrl?: string | null;
  returnReceiptUrl?: string | null;
  totalCost?: number | null;
  commissionAmount?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionLedger {
  id: string;
  rentalId: string;
  amount: number;
  type: string;
  stripePaymentIntentId?: string | null;
  purchaseOrderNumber?: string | null;
  stripeFee?: number | null;
  comments?: string | null;
  createdAt: Date;
}

export interface GpsLog {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speedKmH: number;
  heading: number;
  timestamp: Date;
}

export interface Geofence {
  id: string;
  name: string;
  coordinatesJson: string;
  alertEmail: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeasonalRate {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  multiplier: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
