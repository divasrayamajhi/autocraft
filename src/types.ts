// Nepal Workshop ERP & DMS Types
// Compliant with Nepal Government IRD (Inland Revenue Department) 13% VAT Laws

export type UserRole = 
  | 'Admin' 
  | 'Service Advisor' 
  | 'Technician' 
  | 'Inventory Manager' 
  | 'Cashier';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  password?: string;
  avatarUrl?: string;
  isActive: boolean;
  permissions: {
    canEditMasters: boolean;
    canCreateJobCard: boolean;
    canEditJobCard: boolean;
    canIssueBill: boolean;
    canManageInventory: boolean;
    canViewFinancials: boolean;
    canManageWarranty: boolean;
  };
}

export function getDefaultPermissionsForRole(role: UserRole): UserAccount['permissions'] {
  switch (role) {
    case 'Admin':
      return {
        canEditMasters: true,
        canCreateJobCard: true,
        canEditJobCard: true,
        canIssueBill: true,
        canManageInventory: true,
        canViewFinancials: true,
        canManageWarranty: true
      };
    case 'Service Advisor':
      return {
        canEditMasters: false,
        canCreateJobCard: true,
        canEditJobCard: true,
        canIssueBill: false,
        canManageInventory: false,
        canViewFinancials: false,
        canManageWarranty: true
      };
    case 'Technician':
      return {
        canEditMasters: false,
        canCreateJobCard: false,
        canEditJobCard: false,
        canIssueBill: false,
        canManageInventory: false,
        canViewFinancials: false,
        canManageWarranty: false
      };
    case 'Inventory Manager':
      return {
        canEditMasters: false,
        canCreateJobCard: false,
        canEditJobCard: false,
        canIssueBill: false,
        canManageInventory: true,
        canViewFinancials: false,
        canManageWarranty: true
      };
    case 'Cashier':
      return {
        canEditMasters: false,
        canCreateJobCard: false,
        canEditJobCard: false,
        canIssueBill: true,
        canManageInventory: false,
        canViewFinancials: true,
        canManageWarranty: false
      };
    default:
      return {
        canEditMasters: false,
        canCreateJobCard: false,
        canEditJobCard: false,
        canIssueBill: false,
        canManageInventory: false,
        canViewFinancials: false,
        canManageWarranty: false
      };
  }
}

export interface WorkshopProfile {
  name: string;
  legalEntityName: string;
  panVatNumber: string; // 9-digit Nepal PAN/VAT
  address: string;
  city: string;
  district: string;
  province: string;
  contactNumber: string;
  email: string;
  website: string;
  fiscalYear: string; // e.g. "2081/2082"
  irdCbmsEnabled: boolean;
  irdApiUrl: string;
  irdUsername: string;
  currencySymbol: string; // 'रु.'
  currencyCode: string; // 'NPR'
  defaultVatRate: number; // 13%
}

export type NepalPaymentMethod = 
  | 'Cash'
  | 'Fonepay (Dynamic QR)'
  | 'NCHL NepalPay (Dynamic QR)'
  | 'eSewa Wallet'
  | 'Khalti Wallet'
  | 'connectIPS / Bank Transfer'
  | 'Credit / Cheque'
  | 'Cashless Insurance Settlement';

export interface ServicePriceItem {
  id: string;
  code: string; // e.g., "SRV-GEN-01"
  name: string;
  category: 'General Service' | 'Brake & Suspension' | 'Engine & Transmission' | 'Electrical & AC' | 'Dent & Paint' | 'Detailing';
  standardHours: number;
  baseLaborRate: number; // In NPR
  vatRate: number; // 13%
  isTaxable: boolean;
  description: string;
}

export interface WorkshopBay {
  id: string;
  bayNumber: string;
  name: string;
  type: '2-Post Electro-Hydraulic Lift' | 'Scissor Express Lift' | '3D Wheel Alignment Bay' | 'Diagnostics & Electrical' | 'Paint Booth & Oven' | 'Washing & Detailing Bay';
  currentJobCardId?: string;
  currentVehicleReg?: string;
  assignedTechnicianId?: string;
  status: 'Occupied' | 'Available' | 'Maintenance';
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  specialization: string;
  experienceYears: number;
  assignedBayId?: string;
  commissionPercentage: number;
  isActive: boolean;
  monthlyTargetHours: number;
  completedHoursThisMonth: number;
}

export interface Vehicle {
  id: string;
  registrationNumber: string; // Nepal Format: e.g., "BA 02 CHA 8892" or "02-031 PA 4455"
  chassisNumber?: string; // VIN
  vinNumber?: string;
  engineNumber: string;
  make: string; // e.g., Hyundai, Suzuki, Tata, Toyota, Mahindra, Kia, etc.
  brand?: string; // Alias for make
  model: string; // e.g., Creta, Brezza, Nexon, Scorpio, Hilux
  variant?: string;
  year: number;
  fuelType: 'Petrol' | 'Diesel' | 'EV' | 'Hybrid';
  color: string;
  odometerReading: number;
  customerName?: string;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  district?: string;
  panNumber?: string;
  panVatNumber?: string; // If corporate/fleet buyer in Nepal
  gstNumber?: string;
  customerType: 'Individual' | 'Corporate' | 'Fleet / Taxi' | 'Government / NGO' | 'Fleet / Corporate' | 'Insurance Co. Partner';
  pricingTier?: 'Retail' | 'Fleet' | 'Insurance' | 'Wholesale';
  vehicles: Vehicle[];
  totalSpent: number;
  outstandingBalance?: number;
  createdAt: string;
  lastVisit: string;
}

// End-to-End Spare Parts Lifecycle
export interface SparePart {
  id: string;
  sku: string; // SKU code
  partNumber: string;
  oemNumber: string;
  name: string;
  category: 'Engine' | 'Filters & Fluids' | 'Brakes' | 'Suspension & Steering' | 'Electrical' | 'Transmission' | 'Body & Glass' | 'Accessories';
  compatibleModels: string[]; // e.g. ["Hyundai Creta 1.5", "Kia Seltos"]
  rackLocation: string; // e.g. "Rack-B-04"
  barcode: string;
  costPrice: number; // NPR Purchase cost (excluding VAT)
  sellingPrice: number; // NPR Retail price (excluding VAT)
  vatRate: number; // 13%
  hsnSacCode: string; // Nepal Customs / HS Code
  currentStock: number;
  minReorderLevel: number;
  maxStockLevel: number;
  safetyStock: number;
  monthlyConsumption: number;
  unit: 'pcs' | 'sets' | 'liters' | 'meters' | 'bottles';
  fmsClass: 'Fast' | 'Medium' | 'Slow'; // FMS classification
  abcClass: 'A' | 'B' | 'C'; // ABC valuation classification
  substitutePartIds: string[]; // Cross-reference / substitute parts
  leadTimeDays: number;
  lastRestockedDate: string;
  preferredVendor: string;
}

export interface PartsQuotationItem {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatRate: number;
  total: number;
}

export interface PartsQuotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  expiryDate: string;
  items: PartsQuotationItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  status: 'Draft' | 'Sent' | 'Converted to Order' | 'Expired';
}

export interface PartsSalesOrder {
  id: string;
  orderNumber: string;
  quotationId?: string;
  customerId: string;
  customerName: string;
  date: string;
  items: PartsQuotationItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  dispatchStatus: 'Pending' | 'Partially Dispatched' | 'Fully Dispatched';
  invoiceStatus: 'Not Invoiced' | 'Invoiced';
}

export interface PartsSalesReturn {
  id: string;
  returnNumber: string;
  originalInvoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  reason: string;
  items: {
    partId: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    vatAmount: number;
    refundAmount: number;
  }[];
  totalRefundAmount: number;
  creditNoteNumber: string;
  status: 'Approved' | 'Restocked';
}

export type JobCardStatus = 
  | 'Appointment / Intake'
  | 'Vehicle Check-in'
  | 'Bay In-Progress'
  | 'Bay Assigned (In Progress)'
  | 'Awaiting Spares'
  | 'Quality Check'
  | 'Ready for Billing'
  | 'Billed & Locked'
  | 'Delivered';

export interface JobCardLaborItem {
  id: string;
  serviceId?: string;
  code?: string;
  description: string;
  hoursEstimated?: number;
  hours?: number;
  ratePerHour: number;
  totalAmount?: number;
  vatRate: number; // 13%
  technicianId?: string;
  technicianName?: string;
  status?: 'Pending' | 'In Progress' | 'Completed';
}

export interface JobCardPartItem {
  id: string;
  partId: string;
  partNumber: string;
  name?: string;
  partName?: string;
  quantity: number;
  unitPrice: number;
  totalAmount?: number;
  vatRate: number; // 13%
  discount?: number;
  requisitionStatus?: string;
  isWarrantyCovered?: boolean;
  isInsuranceCovered?: boolean;
  isCoveredByInsurance?: boolean;
}

export interface JobCard {
  id: string;
  jobCardNumber: string; // e.g. "JC-81-0021"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerPan?: string;
  vehicle: Vehicle;
  serviceType: 'Periodic Maintenance Service' | 'Major Mechanical Repair' | 'Running Repair' | 'Accident & Dent Paint' | 'Electrical & AC' | 'Warranty Service' | string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  bayNumber: string;
  status: JobCardStatus;
  createdAt: string;
  estimatedCompletionTime: string;
  actualDeliveredTime?: string;
  isInsuranceClaim: boolean;
  insuranceCompanyName?: string;
  insuranceClaimNumber?: string;
  isWarrantyClaim: boolean;
  warrantyClaimId?: string;
  
  // Immutability Seal & Admin Re-open
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  lockHash?: string; // SHA/Cryptographic stamp
  reopenedByAdmin?: boolean;
  reopenedBy?: string;
  reopenedAt?: string;
  reopenReason?: string;

  // Vehicle Check-in Timestamps & Service History Context
  arrivalDate?: string;
  entryTime?: string;
  lastServiceDate?: string;
  lastServiceKm?: number;
  lastServiceSummary?: string;
  nextServiceDueDate?: string;
  nextServiceDueKm?: number;

  inspection: {
    fuelLevel: number; // 0 - 100%
    odometer: number;
    inventoryBelongings: {
      spareWheel: boolean;
      toolKit: boolean;
      jack: boolean;
      mats: boolean;
      stereo: boolean;
      penDriveOrCd?: boolean;
    };
    damages: {
      location: string;
      description: string;
      type: 'Scratch' | 'Dent' | 'Broken' | 'Paint Chip';
    }[];
    customerVoiceComplaints: string[];
    advisorsObservations: string[];
  };

  laborItems: JobCardLaborItem[];
  partsItems?: JobCardPartItem[];
  partsRequested?: JobCardPartItem[];
}

export interface Appointment {
  id: string;
  appointmentNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleReg: string;
  make: string;
  brand?: string;
  model: string;
  dateTime: string;
  scheduledDate?: string;
  serviceType: string;
  complaintsSummary: string;
  pickupRequired: boolean;
  status: 'Scheduled' | 'Vehicle Arrived' | 'Converted to JobCard' | 'Cancelled';
}

// Nepal IRD E-Billing Compliant Invoice
export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-81/82-0194"
  fiscalYear?: string; // "2081/2082"
  jobCardId: string;
  jobCardNumber: string;
  date?: string; // Gregorian date
  bsDate?: string; // Bikram Sambat Date e.g. "2081-05-28"
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerPan?: string;
  customerPanVat?: string; // Buyer PAN
  vehicleReg: string;
  vehicleBrand?: string;
  vehicleModel: string;
  type: string; // 'Tax Invoice' | 'Cashless Insurance Invoice' | 'Warranty Claim Invoice' | 'Credit Note' | etc.
  
  // Tax Computations per Nepal IRD
  subTotal?: number;
  taxableAmount?: number;
  discountTotal?: number;
  vatRate?: number;
  vatAmount?: number;
  partsTaxableAmount?: number;
  partsVatAmount?: number; // 13%
  laborTaxableAmount?: number;
  laborVatAmount?: number; // 13%
  totalTaxableAmount?: number;
  totalNonTaxableAmount?: number;
  totalVatAmount?: number; // 13%
  totalDiscount?: number;
  roundOff?: number;
  grandTotal: number; // In NPR
  
  paidAmount?: number;
  amountPaid?: number;
  balanceDue: number;
  status?: 'Paid' | 'Partially Paid' | 'Unpaid';
  paymentStatus?: 'Paid' | 'Partially Paid' | 'Unpaid';
  paymentMethod?: string;
  paymentReference?: string;
  createdAt?: string;
  
  // IRD E-Billing Integration Fields
  irdCompliance?: {
    isTransmittedToCbms: boolean;
    cbmsSyncTimestamp?: string;
    irdAcknowledgementCode?: string;
    irdQrData?: string;
    fiscalYearTag: string;
    sellerPan: string; // Workshop PAN
  };
  irdSyncDetails?: {
    isSynced: boolean;
    syncedAt: string;
    cbmsAckNumber: string;
    fiscalYear: string;
  };

  // Immutability lock - Even Admin cannot edit once issued
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  cryptographicSignature?: string;

  payments?: {
    id: string;
    method: NepalPaymentMethod | string;
    amount: number;
    referenceNumber?: string;
    gatewayTransactionId?: string;
    date: string;
  }[];

  items?: {
    id: string;
    itemType: 'Part' | 'Labor' | 'Service';
    description: string;
    hsnSacCode?: string;
    quantity: number;
    unitPrice: number;
    taxableAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  }[];
}

export type BayArea = WorkshopBay;

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled';
  totalAmount: number;
  items: {
    partId: string;
    partName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  jobCardId: string;
  jobCardNumber: string;
  insuranceCompany: string;
  surveyorName: string;
  surveyorPhone: string;
  accidentDate: string;
  totalClaimAmount: number;
  approvedAmount: number;
  customerLiabilityAmount: number;
  status: 'Intimated' | 'Survey Pending' | 'Under Repair' | 'Supplementary Raised' | 'Approval Received' | 'Invoice Submitted' | 'Settled';
  reconciliationNotes?: string;
}

// Warranty Management
export interface WarrantyRecord {
  id: string;
  warrantyCode: string; // e.g. "WAR-2081-089"
  partId?: string;
  partName: string;
  sku?: string;
  jobCardNumber: string;
  vehicleReg: string;
  customerName: string;
  customerPhone: string;
  startDate: string;
  expiryDate: string;
  durationMonths: number;
  oemManufacturer: string; // e.g. "Hyundai Genuine Parts", "Minda", "Bosch", "Exide"
  terms: string;
  status: 'Active' | 'Claim Initiated' | 'Expired' | 'Void';
}

export interface WarrantyClaim {
  id: string;
  claimNumber: string; // e.g. "WCLM-81-012"
  warrantyRecordId: string;
  jobCardId: string;
  jobCardNumber: string;
  vehicleReg: string;
  customerName: string;
  oemManufacturer: string;
  defectivePartName: string;
  defectivePartSku: string;
  serialNumber?: string;
  failureMileage: number;
  defectDescription: string;
  symptomType: 'Mechanical Failure' | 'Electrical Short' | 'Premature Wear' | 'Fluid Leakage' | 'Manufacturing Defect';
  claimLaborAmount: number;
  claimPartsAmount: number;
  totalClaimAmount: number;
  status: 'Draft' | 'Submitted to OEM' | 'OEM Inspection / Under Review' | 'Approved' | 'Rejected' | 'Settled & Reconciled';
  submissionDate: string;
  approvalDate?: string;
  oemApprovedAmount?: number;
  oemCreditNoteNumber?: string;
  customerZeroInvoiceGenerated: boolean;
  partDisposition: 'Pending Inspection' | 'Scrapped with Certificate' | 'Shipped to OEM Depot';
  reconciliationNotes?: string;
}

// Accounting & General Ledger (Business Central Standard)
export interface GLAccount {
  accountCode: string; // e.g. "1010", "4010"
  accountName: string;
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  subCategory: string;
  currentBalance: number;
}

export interface GLJournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  sourceDocument: string; // e.g. Invoice #, Payment #, Purchase Order #
  narration: string;
  lines: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
  totalAmount: number;
}

export interface VatLedgerEntry {
  id: string;
  invoiceNumber: string;
  date: string;
  bsDate: string;
  partyName: string;
  partyPan?: string;
  transactionType: 'Sales' | 'Purchase';
  taxableAmount: number;
  vatAmount: number;
  exemptAmount: number;
}

// Nepal Workshop Vehicle Gate Pass & Security Exit Permit
export interface GatePass {
  id: string;
  passNumber: string; // e.g. "GP-81-0194"
  invoiceId: string;
  invoiceNumber: string;
  jobCardId?: string;
  jobCardNumber?: string;
  vehicleReg: string;
  vehicleMake?: string;
  vehicleModel: string;
  vinNumber?: string;
  engineNumber?: string;
  customerName: string;
  customerPhone: string;
  odometerReading: number;
  arrivalDate?: string;
  entryTime?: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // e.g. "14:35"
  exitDate?: string;
  exitTime?: string;
  status: 'Cleared for Exit' | 'Exited' | 'On Hold';
  securityOfficerName?: string;
  authorizedBy: string;
  remarks?: string;
  itemsDeliveredCount?: number;
  totalInvoiceAmount?: number;
  paymentStatus?: string;
}

