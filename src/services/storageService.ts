import { 
  UserAccount,
  WorkshopProfile,
  ServicePriceItem,
  WorkshopBay,
  Technician,
  Customer,
  SparePart,
  JobCard,
  Appointment,
  Invoice,
  WarrantyRecord,
  WarrantyClaim,
  PartsQuotation,
  PartsSalesOrder,
  PartsSalesReturn,
  GLAccount,
  GLJournalEntry,
  VatLedgerEntry,
  InsuranceClaim,
  PurchaseOrder
} from '../types';

const STORAGE_KEY = 'NEPAL_WORKSHOP_ERP_V2';
const ACTIVE_USER_KEY = 'NEPAL_WORKSHOP_CURRENT_USER';

export interface AppDatabase {
  profile: WorkshopProfile;
  users: UserAccount[];
  currentUser: UserAccount;
  servicePriceBook: ServicePriceItem[];
  servicePriceList?: ServicePriceItem[];
  bays: WorkshopBay[];
  technicians: Technician[];
  customers: Customer[];
  parts: SparePart[];
  partsQuotations: PartsQuotation[];
  partsSalesOrders: PartsSalesOrder[];
  partsSalesReturns: PartsSalesReturn[];
  jobCards: JobCard[];
  appointments: Appointment[];
  invoices: Invoice[];
  warrantyRecords: WarrantyRecord[];
  warrantyClaims: WarrantyClaim[];
  glAccounts: GLAccount[];
  journalEntries: GLJournalEntry[];
  vatLedger: VatLedgerEntry[];
  insuranceClaims: InsuranceClaim[];
  purchaseOrders: PurchaseOrder[];
  lastCloudSync: string;
  isCloudSynced: boolean;
}

const INITIAL_PROFILE: WorkshopProfile = {
  name: 'Sagarmatha Multi-Care Auto Workshop',
  legalEntityName: 'Sagarmatha Automobile Engineering & Repair Pvt. Ltd.',
  panVatNumber: '302849182',
  address: 'Ring Road, Sukedhara-04, Ward No. 4',
  city: 'Kathmandu',
  district: 'Kathmandu',
  province: 'Bagmati Province',
  contactNumber: '+977-1-4378912 / 9851087654',
  email: 'service@sagarmathaauto.com.np',
  website: 'https://sagarmathaauto.com.np',
  fiscalYear: '2081/2082',
  irdCbmsEnabled: true,
  irdApiUrl: 'https://cbms.ird.gov.np/api/v1/realtime-bill',
  irdUsername: 'SAGAR_CBMS_302849182',
  currencySymbol: 'रु.',
  currencyCode: 'NPR',
  defaultVatRate: 13
};

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-01',
    name: 'Suman Sharma (Admin)',
    username: 'admin',
    email: 'suman.admin@sagarmathaauto.com.np',
    phone: '+977-9851011223',
    role: 'Admin',
    isActive: true,
    permissions: {
      canEditMasters: true,
      canCreateJobCard: true,
      canEditJobCard: true,
      canIssueBill: true,
      canManageInventory: true,
      canViewFinancials: true,
      canManageWarranty: true
    }
  },
  {
    id: 'USR-02',
    name: 'Aayush Thapa (Advisor)',
    username: 'aayush.advisor',
    email: 'aayush.thapa@sagarmathaauto.com.np',
    phone: '+977-9841223344',
    role: 'Service Advisor',
    isActive: true,
    permissions: {
      canEditMasters: false,
      canCreateJobCard: true,
      canEditJobCard: true,
      canIssueBill: false,
      canManageInventory: false,
      canViewFinancials: false,
      canManageWarranty: true
    }
  },
  {
    id: 'USR-03',
    name: 'Bikram Tamang (Lead Tech)',
    username: 'bikram.tech',
    email: 'bikram.tamang@sagarmathaauto.com.np',
    phone: '+977-9813445566',
    role: 'Technician',
    isActive: true,
    permissions: {
      canEditMasters: false,
      canCreateJobCard: false,
      canEditJobCard: false,
      canIssueBill: false,
      canManageInventory: false,
      canViewFinancials: false,
      canManageWarranty: false
    }
  },
  {
    id: 'USR-04',
    name: 'Rajan Shrestha (Store)',
    username: 'rajan.store',
    email: 'rajan.store@sagarmathaauto.com.np',
    phone: '+977-9801889900',
    role: 'Inventory Manager',
    isActive: true,
    permissions: {
      canEditMasters: false,
      canCreateJobCard: false,
      canEditJobCard: false,
      canIssueBill: false,
      canManageInventory: true,
      canViewFinancials: false,
      canManageWarranty: true
    }
  },
  {
    id: 'USR-05',
    name: 'Pooja Gurung (Accounts)',
    username: 'pooja.cashier',
    email: 'pooja.accounts@sagarmathaauto.com.np',
    phone: '+977-9849778899',
    role: 'Cashier',
    isActive: true,
    permissions: {
      canEditMasters: false,
      canCreateJobCard: false,
      canEditJobCard: false,
      canIssueBill: true,
      canManageInventory: false,
      canViewFinancials: true,
      canManageWarranty: false
    }
  }
];

const INITIAL_SERVICE_PRICE_BOOK: ServicePriceItem[] = [
  {
    id: 'SRV-01',
    code: 'SRV-GEN-PMS',
    name: 'Periodic Maintenance Service (PMS) - 45-Point Checkup',
    category: 'General Service',
    standardHours: 2.5,
    baseLaborRate: 2500,
    vatRate: 13,
    isTaxable: true,
    description: 'Complete engine oil flushing, air/oil filter inspection, spark plug cleaning, underbody inspection and fluid top-ups.'
  },
  {
    id: 'SRV-02',
    code: 'SRV-BRK-PAD',
    name: 'Front Brake Disc & Pad Replacement Labor',
    category: 'Brake & Suspension',
    standardHours: 1.5,
    baseLaborRate: 1800,
    vatRate: 13,
    isTaxable: true,
    description: 'Caliper pin greasing, rotor turning inspection, pad replacement and hydraulic brake bleeding.'
  },
  {
    id: 'SRV-03',
    code: 'SRV-CLUTCH-OVR',
    name: 'Complete Clutch Plate & Flywheel Overhaul',
    category: 'Engine & Transmission',
    standardHours: 5.0,
    baseLaborRate: 5500,
    vatRate: 13,
    isTaxable: true,
    description: 'Gearbox drop, clutch pressure plate and friction disc alignment, release bearing replacement.'
  },
  {
    id: 'SRV-04',
    code: 'SRV-AC-GAS',
    name: 'Automotive AC Vacuuming, Leak Test & Gas Refill (R134a)',
    category: 'Electrical & AC',
    standardHours: 2.0,
    baseLaborRate: 3200,
    vatRate: 13,
    isTaxable: true,
    description: 'PAG compressor oil refill, nitrogen pressure leak testing, vacuum recovery and pure refrigerant recharge.'
  },
  {
    id: 'SRV-05',
    code: 'SRV-3D-ALIGN',
    name: '3D Computerized Wheel Alignment & High-Speed Balancing',
    category: 'Brake & Suspension',
    standardHours: 1.0,
    baseLaborRate: 1500,
    vatRate: 13,
    isTaxable: true,
    description: 'Laser sensor camber/caster/toe correction and 4-wheel lead balancing weights.'
  },
  {
    id: 'SRV-06',
    code: 'SRV-DENT-PAINT',
    name: 'Body Dent Pulling & Oven Baked PU Paint (Per Panel)',
    category: 'Dent & Paint',
    standardHours: 4.0,
    baseLaborRate: 4000,
    vatRate: 13,
    isTaxable: true,
    description: 'Spot dent repair, 2K epoxy primer, computerized paint matching and clear coat heating in booth.'
  }
];

const INITIAL_BAYS: WorkshopBay[] = [
  {
    id: 'BAY-01',
    bayNumber: 'Bay 1',
    name: 'Mechanical Bay 1 (Heavy Lift)',
    type: '2-Post Electro-Hydraulic Lift',
    status: 'Occupied',
    currentVehicleReg: 'BA 02 CHA 8892',
    currentJobCardId: 'JC-81-0021',
    assignedTechnicianId: 'TECH-01'
  },
  {
    id: 'BAY-02',
    bayNumber: 'Bay 2',
    name: 'Mechanical Bay 2 (General Lift)',
    type: '2-Post Electro-Hydraulic Lift',
    status: 'Occupied',
    currentVehicleReg: '02-031 PA 4455',
    currentJobCardId: 'JC-81-0022',
    assignedTechnicianId: 'TECH-02'
  },
  {
    id: 'BAY-03',
    bayNumber: 'Bay 3',
    name: 'Express PMS Pit',
    type: 'Scissor Express Lift',
    status: 'Available',
    assignedTechnicianId: 'TECH-03'
  },
  {
    id: 'BAY-04',
    bayNumber: 'Bay 4',
    name: '3D Laser Alignment Bay',
    type: '3D Wheel Alignment Bay',
    status: 'Available',
    assignedTechnicianId: 'TECH-01'
  },
  {
    id: 'BAY-05',
    bayNumber: 'Bay 5',
    name: 'Auto Electrical & OBD Diagnostic Lab',
    type: 'Diagnostics & Electrical',
    status: 'Occupied',
    currentVehicleReg: 'BA 18 CHA 1029',
    currentJobCardId: 'JC-81-0023',
    assignedTechnicianId: 'TECH-04'
  },
  {
    id: 'BAY-06',
    bayNumber: 'Bay 6',
    name: 'Infrared Heating Paint Booth & Oven',
    type: 'Paint Booth & Oven',
    status: 'Maintenance'
  }
];

const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'TECH-01',
    name: 'Bikram Tamang',
    phone: '+977-9813445566',
    specialization: 'Engine & Transmission Overhaul',
    experienceYears: 9,
    assignedBayId: 'BAY-01',
    commissionPercentage: 7,
    isActive: true,
    monthlyTargetHours: 160,
    completedHoursThisMonth: 124
  },
  {
    id: 'TECH-02',
    name: 'Deepak Adhikari',
    phone: '+977-9841887766',
    specialization: 'Suspension, Steering & Brakes',
    experienceYears: 6,
    assignedBayId: 'BAY-02',
    commissionPercentage: 6,
    isActive: true,
    monthlyTargetHours: 150,
    completedHoursThisMonth: 110
  },
  {
    id: 'TECH-03',
    name: 'Manoj Chaudhary',
    phone: '+977-9803221199',
    specialization: 'Express PMS & Quick Lube',
    experienceYears: 4,
    assignedBayId: 'BAY-03',
    commissionPercentage: 5,
    isActive: true,
    monthlyTargetHours: 150,
    completedHoursThisMonth: 95
  },
  {
    id: 'TECH-04',
    name: 'Suresh Maharjan',
    phone: '+977-9860123456',
    specialization: 'Auto Electrical, ECU Diagnostics & AC',
    experienceYears: 8,
    assignedBayId: 'BAY-05',
    commissionPercentage: 8,
    isActive: true,
    monthlyTargetHours: 160,
    completedHoursThisMonth: 138
  }
];

const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-01',
    name: 'Dr. Rameshwor Pokharel',
    phone: '+977-9851088776',
    email: 'dr.rameshwor@gmail.com',
    address: 'Baluwatar-04',
    district: 'Kathmandu',
    customerType: 'Individual',
    pricingTier: 'Retail',
    totalSpent: 128500,
    outstandingBalance: 0,
    createdAt: '2024-03-15',
    lastVisit: '2026-09-08',
    vehicles: [
      {
        id: 'VEH-01',
        registrationNumber: 'BA 02 CHA 8892',
        chassisNumber: 'MALC141EALM829104',
        engineNumber: 'G4LA-918231',
        make: 'Hyundai',
        model: 'Creta 1.5 SX',
        year: 2022,
        fuelType: 'Petrol',
        color: 'Polar White',
        odometerReading: 38400,
        customerName: 'Dr. Rameshwor Pokharel',
        insuranceCompany: 'Shikhar Insurance Co. Ltd.',
        insurancePolicyNumber: 'SHK-081-MOT-89211'
      }
    ]
  },
  {
    id: 'CUST-02',
    name: 'Himalayan Adventure Travels Pvt. Ltd.',
    phone: '+977-1-4428901 / 9801234567',
    email: 'fleet@himalayanadventure.com.np',
    address: 'Thamel, Ward 26',
    district: 'Kathmandu',
    panVatNumber: '601928471',
    customerType: 'Corporate',
    pricingTier: 'Fleet',
    totalSpent: 485000,
    outstandingBalance: 24500,
    createdAt: '2023-08-10',
    lastVisit: '2026-09-10',
    vehicles: [
      {
        id: 'VEH-02',
        registrationNumber: '02-031 PA 4455',
        chassisNumber: 'MA1TA2SKLM8392102',
        engineNumber: 'D4EA-778891',
        make: 'Mahindra',
        model: 'Scorpio S11 4WD',
        year: 2021,
        fuelType: 'Diesel',
        color: 'Diamond Black',
        odometerReading: 78200,
        customerName: 'Himalayan Adventure Travels',
        insuranceCompany: 'Sagarmatha Lumbini Insurance',
        insurancePolicyNumber: 'SALICO-81-COM-1092'
      }
    ]
  },
  {
    id: 'CUST-03',
    name: 'Sunita Pradhan',
    phone: '+977-9841998877',
    email: 'sunita.pradhan@yahoo.com',
    address: 'Jawalakhel',
    district: 'Lalitpur',
    customerType: 'Individual',
    pricingTier: 'Retail',
    totalSpent: 64200,
    outstandingBalance: 0,
    createdAt: '2025-01-20',
    lastVisit: '2026-09-02',
    vehicles: [
      {
        id: 'VEH-03',
        registrationNumber: 'BA 18 CHA 1029',
        chassisNumber: 'MBHEC414LL8392019',
        engineNumber: 'K12M-849102',
        make: 'Suzuki',
        model: 'Swift ZXi',
        year: 2023,
        fuelType: 'Petrol',
        color: 'Fire Red',
        odometerReading: 21900,
        customerName: 'Sunita Pradhan',
        insuranceCompany: 'NLG Insurance Company Ltd.',
        insurancePolicyNumber: 'NLG-2081-PVT-4432'
      }
    ]
  }
];

const INITIAL_PARTS: SparePart[] = [
  {
    id: 'PART-01',
    sku: 'SKU-FLTR-OIL-HY01',
    partNumber: '26300-35505',
    oemNumber: '26300-35505-HY',
    name: 'Genuine Engine Oil Filter (Spin-on)',
    category: 'Filters & Fluids',
    compatibleModels: ['Hyundai Creta', 'Kia Seltos', 'Hyundai Venue', 'Hyundai i20'],
    rackLocation: 'Bin-A1-04',
    barcode: '890123400101',
    costPrice: 420,
    sellingPrice: 750,
    vatRate: 13,
    hsnSacCode: '84212300',
    currentStock: 48,
    minReorderLevel: 15,
    maxStockLevel: 90,
    safetyStock: 10,
    monthlyConsumption: 40,
    unit: 'pcs',
    fmsClass: 'Fast',
    abcClass: 'C',
    substitutePartIds: ['PART-05'],
    leadTimeDays: 2,
    lastRestockedDate: '2026-09-01',
    preferredVendor: 'Laxmi Intercontinental (Hyundai Nepal)'
  },
  {
    id: 'PART-02',
    sku: 'SKU-BRK-PAD-FR01',
    partNumber: '58101-M0A00',
    oemNumber: '58101-1RA00',
    name: 'Ceramic Front Brake Pad Set (Low Dust)',
    category: 'Brakes',
    compatibleModels: ['Hyundai Creta 1.5', 'Kia Seltos 1.5'],
    rackLocation: 'Bin-B2-12',
    barcode: '890123400102',
    costPrice: 2800,
    sellingPrice: 4600,
    vatRate: 13,
    hsnSacCode: '87083000',
    currentStock: 14,
    minReorderLevel: 8,
    maxStockLevel: 30,
    safetyStock: 5,
    monthlyConsumption: 18,
    unit: 'sets',
    fmsClass: 'Fast',
    abcClass: 'A',
    substitutePartIds: [],
    leadTimeDays: 3,
    lastRestockedDate: '2026-08-25',
    preferredVendor: 'Brembo / Bosch Nepal Importers'
  },
  {
    id: 'PART-03',
    sku: 'SKU-CLT-PLT-MH01',
    partNumber: '0303BC0191N',
    oemNumber: 'MH-303-CLT',
    name: 'Clutch Disc & Cover Assembly (Heavy Duty)',
    category: 'Transmission',
    compatibleModels: ['Mahindra Scorpio 2.2 mHawk', 'Mahindra Bolero Pickup'],
    rackLocation: 'Bin-C3-08',
    barcode: '890123400103',
    costPrice: 7800,
    sellingPrice: 12500,
    vatRate: 13,
    hsnSacCode: '87089300',
    currentStock: 5,
    minReorderLevel: 4,
    maxStockLevel: 15,
    safetyStock: 2,
    monthlyConsumption: 6,
    unit: 'sets',
    fmsClass: 'Medium',
    abcClass: 'A',
    substitutePartIds: [],
    leadTimeDays: 5,
    lastRestockedDate: '2026-08-18',
    preferredVendor: 'Agni Incorporated (Mahindra Nepal)'
  },
  {
    id: 'PART-04',
    sku: 'SKU-FLTR-AIR-SZ01',
    partNumber: '13780-68P00',
    oemNumber: 'SZ-13780-68',
    name: 'Engine Air Filter High Flow (Dry Paper)',
    category: 'Filters & Fluids',
    compatibleModels: ['Suzuki Swift K12', 'Suzuki Baleno', 'Suzuki Dzire'],
    rackLocation: 'Bin-A2-02',
    barcode: '890123400104',
    costPrice: 380,
    sellingPrice: 680,
    vatRate: 13,
    hsnSacCode: '84213100',
    currentStock: 22,
    minReorderLevel: 10,
    maxStockLevel: 45,
    safetyStock: 6,
    monthlyConsumption: 25,
    unit: 'pcs',
    fmsClass: 'Fast',
    abcClass: 'C',
    substitutePartIds: [],
    leadTimeDays: 2,
    lastRestockedDate: '2026-09-05',
    preferredVendor: 'CG Motocorp (Suzuki Nepal)'
  },
  {
    id: 'PART-05',
    sku: 'SKU-BOSCH-OIL-UNIV',
    partNumber: '0986AF0059',
    oemNumber: 'BOSCH-FLTR-F059',
    name: 'Bosch Premium Synthetic Oil Filter (Interchangeable)',
    category: 'Filters & Fluids',
    compatibleModels: ['Hyundai Creta', 'Suzuki Swift', 'Honda City'],
    rackLocation: 'Bin-A1-06',
    barcode: '890123400105',
    costPrice: 390,
    sellingPrice: 700,
    vatRate: 13,
    hsnSacCode: '84212300',
    currentStock: 30,
    minReorderLevel: 12,
    maxStockLevel: 60,
    safetyStock: 8,
    monthlyConsumption: 20,
    unit: 'pcs',
    fmsClass: 'Fast',
    abcClass: 'C',
    substitutePartIds: ['PART-01'],
    leadTimeDays: 2,
    lastRestockedDate: '2026-08-30',
    preferredVendor: 'Bosch Automotive Nepal'
  }
];

const INITIAL_JOB_CARDS: JobCard[] = [
  {
    id: 'JC-81-0021',
    jobCardNumber: 'JC-81-0021',
    customerId: 'CUST-01',
    customerName: 'Dr. Rameshwor Pokharel',
    customerPhone: '+977-9851088776',
    vehicle: INITIAL_CUSTOMERS[0].vehicles[0],
    serviceType: 'Periodic Maintenance Service',
    assignedTechnicianId: 'TECH-01',
    assignedTechnicianName: 'Bikram Tamang',
    bayNumber: 'Bay 1',
    status: 'Bay In-Progress',
    createdAt: '2026-09-12T08:30:00Z',
    estimatedCompletionTime: '2026-09-12T16:00:00Z',
    isInsuranceClaim: false,
    isWarrantyClaim: false,
    isLocked: false,
    inspection: {
      fuelLevel: 65,
      odometer: 38400,
      inventoryBelongings: {
        spareWheel: true,
        toolKit: true,
        jack: true,
        mats: true,
        stereo: true,
        penDriveOrCd: false
      },
      damages: [
        { location: 'Rear Bumper Left Corner', description: 'Light scratch 4 cm', type: 'Scratch' }
      ],
      customerVoiceComplaints: [
        '30,000 km Scheduled General Service',
        'Slight brake squeak while reversing in morning'
      ],
      advisorsObservations: [
        'Front brake pads at 35% life, recommended replacement',
        'Engine oil dark amber, needs 5W30 full synthetic'
      ]
    },
    laborItems: [
      {
        id: 'LBR-01',
        serviceId: 'SRV-01',
        code: 'SRV-GEN-PMS',
        description: 'Periodic Maintenance Service PMS - 45-Point Checkup',
        hours: 2.5,
        hoursEstimated: 2.5,
        ratePerHour: 1000,
        vatRate: 13,
        totalAmount: 2500,
        technicianId: 'TECH-01',
        technicianName: 'Bikram Tamang',
        status: 'In Progress'
      },
      {
        id: 'LBR-02',
        serviceId: 'SRV-02',
        code: 'SRV-BRK-PAD',
        description: 'Front Brake Disc Cleaning & Pad Replacement Labor',
        hours: 1.5,
        hoursEstimated: 1.5,
        ratePerHour: 1200,
        vatRate: 13,
        totalAmount: 1800,
        technicianId: 'TECH-01',
        technicianName: 'Bikram Tamang',
        status: 'Pending'
      }
    ],
    partsItems: [
      {
        id: 'JCP-01',
        partId: 'PART-01',
        partNumber: '26300-35505',
        name: 'Genuine Engine Oil Filter (Spin-on)',
        partName: 'Genuine Engine Oil Filter (Spin-on)',
        quantity: 1,
        unitPrice: 750,
        totalAmount: 750,
        vatRate: 13,
        discount: 0
      },
      {
        id: 'JCP-02',
        partId: 'PART-02',
        partNumber: '58101-M0A00',
        name: 'Ceramic Front Brake Pad Set (Low Dust)',
        partName: 'Ceramic Front Brake Pad Set (Low Dust)',
        quantity: 1,
        unitPrice: 4600,
        totalAmount: 4400,
        vatRate: 13,
        discount: 200
      }
    ],
    partsRequested: [
      {
        id: 'JCP-01',
        partId: 'PART-01',
        partNumber: '26300-35505',
        name: 'Genuine Engine Oil Filter (Spin-on)',
        partName: 'Genuine Engine Oil Filter (Spin-on)',
        quantity: 1,
        unitPrice: 750,
        totalAmount: 750,
        vatRate: 13,
        discount: 0
      },
      {
        id: 'JCP-02',
        partId: 'PART-02',
        partNumber: '58101-M0A00',
        name: 'Ceramic Front Brake Pad Set (Low Dust)',
        partName: 'Ceramic Front Brake Pad Set (Low Dust)',
        quantity: 1,
        unitPrice: 4600,
        totalAmount: 4400,
        vatRate: 13,
        discount: 200
      }
    ]
  },
  {
    id: 'JC-81-0020',
    jobCardNumber: 'JC-81-0020',
    customerId: 'CUST-03',
    customerName: 'Sunita Pradhan',
    customerPhone: '+977-9841998877',
    vehicle: INITIAL_CUSTOMERS[2].vehicles[0],
    serviceType: 'Running Repair',
    assignedTechnicianId: 'TECH-04',
    assignedTechnicianName: 'Suresh Maharjan',
    bayNumber: 'Bay 5',
    status: 'Billed & Locked',
    createdAt: '2026-09-10T09:15:00Z',
    estimatedCompletionTime: '2026-09-10T14:30:00Z',
    actualDeliveredTime: '2026-09-10T15:10:00Z',
    isInsuranceClaim: false,
    isWarrantyClaim: false,
    isLocked: true,
    lockedAt: '2026-09-10T15:05:00Z',
    lockedBy: 'Pooja Gurung (Accounts)',
    lockHash: 'SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    inspection: {
      fuelLevel: 40,
      odometer: 21900,
      inventoryBelongings: {
        spareWheel: true,
        toolKit: true,
        jack: true,
        mats: true,
        stereo: true,
        penDriveOrCd: true
      },
      damages: [],
      customerVoiceComplaints: ['AC blower cooling insufficient on hot afternoon'],
      advisorsObservations: ['Cabin AC filter choked with dust, low gas pressure in suction line']
    },
    laborItems: [
      {
        id: 'LBR-03',
        serviceId: 'SRV-04',
        code: 'SRV-AC-GAS',
        description: 'AC System Vacuuming, Leak Test & Gas Refill',
        hours: 2.0,
        hoursEstimated: 2.0,
        ratePerHour: 1600,
        vatRate: 13,
        totalAmount: 3200,
        technicianId: 'TECH-04',
        technicianName: 'Suresh Maharjan',
        status: 'Completed'
      }
    ],
    partsItems: [
      {
        id: 'JCP-03',
        partId: 'PART-04',
        partNumber: '13780-68P00',
        name: 'Engine Air Filter High Flow (Dry Paper)',
        partName: 'Engine Air Filter High Flow (Dry Paper)',
        quantity: 1,
        unitPrice: 680,
        totalAmount: 680,
        vatRate: 13,
        discount: 0
      }
    ],
    partsRequested: [
      {
        id: 'JCP-03',
        partId: 'PART-04',
        partNumber: '13780-68P00',
        name: 'Engine Air Filter High Flow (Dry Paper)',
        partName: 'Engine Air Filter High Flow (Dry Paper)',
        quantity: 1,
        unitPrice: 680,
        totalAmount: 680,
        vatRate: 13,
        discount: 0
      }
    ]
  }
];

const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'INV-81-0194',
    invoiceNumber: 'INV-81/82-0194',
    fiscalYear: '2081/2082',
    jobCardId: 'JC-81-0020',
    jobCardNumber: 'JC-81-0020',
    date: '2026-09-10',
    createdAt: '2026-09-10T15:05:00Z',
    bsDate: '2081-05-25',
    customerId: 'CUST-03',
    customerName: 'Sunita Pradhan',
    customerPhone: '+977-9841998877',
    vehicleReg: 'BA 18 CHA 1029',
    vehicleModel: 'Suzuki Swift ZXi',
    type: 'Tax Invoice',
    subTotal: 3880,
    taxableAmount: 3880,
    vatAmount: 504.4,
    partsTaxableAmount: 680,
    partsVatAmount: 88.4,
    laborTaxableAmount: 3200,
    laborVatAmount: 416,
    totalTaxableAmount: 3880,
    totalNonTaxableAmount: 0,
    totalVatAmount: 504.4,
    totalDiscount: 0,
    roundOff: 0.6,
    grandTotal: 4385,
    paidAmount: 4385,
    amountPaid: 4385,
    balanceDue: 0,
    status: 'Paid',
    paymentStatus: 'Paid',
    irdCompliance: {
      isTransmittedToCbms: true,
      cbmsSyncTimestamp: '2026-09-10T15:05:32Z',
      irdAcknowledgementCode: 'CBMS-ACK-81-99201',
      irdQrData: 'https://cbms.ird.gov.np/verify?bill_no=INV-81/82-0194&seller_pan=302849182&amount=4385',
      fiscalYearTag: '2081/2082',
      sellerPan: '302849182'
    },
    isLocked: true,
    lockedAt: '2026-09-10T15:05:00Z',
    lockedBy: 'Pooja Gurung (Accounts)',
    cryptographicSignature: 'HMAC_SHA256:8829a1b9204cdfe9821034ba9821ef34',
    payments: [
      {
        id: 'PAY-01',
        method: 'Fonepay (Dynamic QR)',
        amount: 4385,
        referenceNumber: 'FP-8192039102',
        gatewayTransactionId: 'TXN-FONEPAY-9921',
        date: '2026-09-10T15:04:15Z'
      }
    ]
  }
];

const INITIAL_WARRANTY_RECORDS: WarrantyRecord[] = [
  {
    id: 'WAR-01',
    warrantyCode: 'WAR-2081-089',
    partId: 'PART-02',
    partName: 'Ceramic Front Brake Pad Set',
    sku: 'SKU-BRK-PAD-FR01',
    jobCardNumber: 'JC-81-0020',
    vehicleReg: 'BA 18 CHA 1029',
    customerName: 'Sunita Pradhan',
    customerPhone: '+977-9841998877',
    startDate: '2026-09-10',
    expiryDate: '2027-03-10',
    durationMonths: 6,
    oemManufacturer: 'Bosch Automotive Nepal',
    terms: 'Covers friction pad bonding failure and rotor scoring defect. Excludes natural pad wear-and-tear.',
    status: 'Active'
  },
  {
    id: 'WAR-02',
    warrantyCode: 'WAR-2081-042',
    partId: 'PART-03',
    partName: 'Heavy Duty Starter Motor Unit',
    sku: 'SKU-ELEC-STRT-01',
    jobCardNumber: 'JC-81-0015',
    vehicleReg: '02-031 PA 4455',
    customerName: 'Himalayan Adventure Travels',
    customerPhone: '+977-9801234567',
    startDate: '2026-05-10',
    expiryDate: '2027-05-10',
    durationMonths: 12,
    oemManufacturer: 'Minda Valeo OEM',
    terms: 'Full replacement against solenoid armature winding short-circuit or pinion gear seizure.',
    status: 'Claim Initiated'
  }
];

const INITIAL_WARRANTY_CLAIMS: WarrantyClaim[] = [
  {
    id: 'WCLM-81-012',
    claimNumber: 'WCLM-81-012',
    warrantyRecordId: 'WAR-02',
    jobCardId: 'JC-81-0015',
    jobCardNumber: 'JC-81-0015',
    vehicleReg: '02-031 PA 4455',
    customerName: 'Himalayan Adventure Travels',
    oemManufacturer: 'Minda Valeo OEM',
    defectivePartName: 'Heavy Duty Starter Motor Unit',
    defectivePartSku: 'SKU-ELEC-STRT-01',
    serialNumber: 'MV-STR-2024-99812',
    failureMileage: 71200,
    defectDescription: 'Internal solenoid magnetic pull failure causing intermittent cranking failure during cold starts.',
    symptomType: 'Electrical Short',
    claimLaborAmount: 1800,
    claimPartsAmount: 9400,
    totalClaimAmount: 11200,
    status: 'OEM Inspection / Under Review',
    submissionDate: '2026-09-04',
    customerZeroInvoiceGenerated: true,
    partDisposition: 'Pending Inspection',
    reconciliationNotes: 'Awaiting OEM field surveyor inspection report at Sukedhara workshop.'
  }
];

const INITIAL_GL_ACCOUNTS: GLAccount[] = [
  { accountCode: '1010', accountName: 'Cash in Hand (Cashier Drawer)', category: 'Asset', subCategory: 'Current Assets', currentBalance: 42350 },
  { accountCode: '1020', accountName: 'Nabil Bank Ltd. - Current Account', category: 'Asset', subCategory: 'Bank Accounts', currentBalance: 684200 },
  { accountCode: '1030', accountName: 'Fonepay Settlement Clearing Account', category: 'Asset', subCategory: 'Payment Gateway Clearing', currentBalance: 124500 },
  { accountCode: '1040', accountName: 'NCHL NepalPay / connectIPS Clearing', category: 'Asset', subCategory: 'Payment Gateway Clearing', currentBalance: 48900 },
  { accountCode: '1200', accountName: 'Spare Parts Inventory Asset', category: 'Asset', subCategory: 'Inventory', currentBalance: 342000 },
  { accountCode: '1500', accountName: 'Workshop Equipment (Lifts, Paint Booth)', category: 'Asset', subCategory: 'Fixed Assets', currentBalance: 2450000 },
  { accountCode: '2010', accountName: 'Accounts Payable - Parts Vendors', category: 'Liability', subCategory: 'Current Liabilities', currentBalance: 165000 },
  { accountCode: '2020', accountName: 'Nepal IRD VAT Output Payable (13%)', category: 'Liability', subCategory: 'Duties & Taxes', currentBalance: 48950 },
  { accountCode: '4010', accountName: 'Service Labor Revenue', category: 'Revenue', subCategory: 'Operating Revenue', currentBalance: 382000 },
  { accountCode: '4020', accountName: 'Spare Parts Sales Revenue', category: 'Revenue', subCategory: 'Operating Revenue', currentBalance: 495000 },
  { accountCode: '5010', accountName: 'Cost of Spare Parts Sold (COGS)', category: 'Expense', subCategory: 'Direct Cost', currentBalance: 298000 },
  { accountCode: '5020', accountName: 'Direct Technician Labor Commission', category: 'Expense', subCategory: 'Payroll', currentBalance: 78500 },
  { accountCode: '6010', accountName: 'Workshop Electricity & Rent', category: 'Expense', subCategory: 'Overheads', currentBalance: 85000 }
];

export class StorageService {
  private static instance: StorageService;
  private db: AppDatabase;

  private constructor() {
    this.db = this.loadFromStorage();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private loadFromStorage(): AppDatabase {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return this.normalizeDatabase(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial dataset', e);
    }

    const initialDb = this.getInitialDatabase();
    this.saveToStorage(initialDb);
    return initialDb;
  }

  private getInitialDatabase(): AppDatabase {
    return {
      profile: INITIAL_PROFILE,
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0],
      servicePriceBook: INITIAL_SERVICE_PRICE_BOOK,
      servicePriceList: INITIAL_SERVICE_PRICE_BOOK,
      bays: INITIAL_BAYS,
      technicians: INITIAL_TECHNICIANS,
      customers: INITIAL_CUSTOMERS,
      parts: INITIAL_PARTS,
      partsQuotations: [],
      partsSalesOrders: [],
      partsSalesReturns: [],
      jobCards: INITIAL_JOB_CARDS,
      appointments: [],
      invoices: INITIAL_INVOICES,
      warrantyRecords: INITIAL_WARRANTY_RECORDS,
      warrantyClaims: INITIAL_WARRANTY_CLAIMS,
      glAccounts: INITIAL_GL_ACCOUNTS,
      journalEntries: [],
      vatLedger: [],
      insuranceClaims: [
        {
          id: 'CLM-01',
          claimNumber: 'CLM-2081-081',
          jobCardId: 'JC-81-0021',
          jobCardNumber: 'JC-81-0021',
          insuranceCompany: 'Shikhar Insurance Co. Ltd.',
          surveyorName: 'Er. Ramesh Karki (License #SUR-092)',
          surveyorPhone: '+977-9851023456',
          accidentDate: '2024-05-10',
          totalClaimAmount: 65000,
          approvedAmount: 48500,
          customerLiabilityAmount: 16500,
          status: 'Approval Received'
        }
      ],
      purchaseOrders: [],
      lastCloudSync: new Date().toISOString(),
      isCloudSynced: true
    };
  }

  private normalizeDatabase(parsed: any): AppDatabase {
    const fallback = this.getInitialDatabase();
    if (!parsed || typeof parsed !== 'object') {
      return fallback;
    }

    const users = Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : fallback.users;
    const activeUsername = localStorage.getItem(ACTIVE_USER_KEY) || 'admin';
    const currentUser = users.find((u: UserAccount) => u.username === activeUsername) || users[0] || fallback.currentUser;

    const rawJobCards = Array.isArray(parsed.jobCards) && parsed.jobCards.length > 0 ? parsed.jobCards : fallback.jobCards;
    const jobCards: JobCard[] = rawJobCards.map((jc: any, idx: number) => {
      const parts = Array.isArray(jc.partsRequested) 
        ? jc.partsRequested 
        : (Array.isArray(jc.partsItems) ? jc.partsItems : []);
      
      const normalizedParts = parts.map((p: any, pIdx: number) => ({
        id: p.id || `JCP-${idx}-${pIdx}`,
        partId: p.partId || 'PART-01',
        partNumber: p.partNumber || 'GEN-PART',
        name: p.name || p.partName || 'Spare Part',
        partName: p.partName || p.name || 'Spare Part',
        quantity: Number(p.quantity) || 1,
        unitPrice: Number(p.unitPrice) || 0,
        vatRate: Number(p.vatRate) ?? 13,
        discount: Number(p.discount) || 0,
        totalAmount: Number(p.totalAmount) ?? ((Number(p.quantity) || 1) * (Number(p.unitPrice) || 0) - (Number(p.discount) || 0)),
        isCoveredByInsurance: Boolean(p.isCoveredByInsurance),
        requisitionStatus: p.requisitionStatus || 'Issued'
      }));

      const laborItems = (Array.isArray(jc.laborItems) ? jc.laborItems : []).map((l: any, lIdx: number) => ({
        id: l.id || `LBR-${idx}-${lIdx}`,
        serviceId: l.serviceId || 'SRV-01',
        code: l.code || 'SRV-LBR',
        description: l.description || 'General Labor',
        hours: Number(l.hours ?? l.hoursEstimated ?? 1),
        hoursEstimated: Number(l.hoursEstimated ?? l.hours ?? 1),
        ratePerHour: Number(l.ratePerHour) || 1000,
        vatRate: Number(l.vatRate) ?? 13,
        totalAmount: Number(l.totalAmount) ?? (Number(l.hours ?? l.hoursEstimated ?? 1) * (Number(l.ratePerHour) || 1000)),
        technicianId: l.technicianId || 'TECH-01',
        technicianName: l.technicianName || 'Technician',
        status: l.status || 'In Progress'
      }));

      return {
        ...jc,
        laborItems,
        partsRequested: normalizedParts,
        partsItems: normalizedParts,
        serviceType: jc.serviceType || 'Periodic Maintenance Service',
        status: jc.status || 'Vehicle Intake / Inspection',
        inspection: jc.inspection || {
          fuelLevel: 50,
          odometer: 10000,
          inventoryBelongings: { spareWheel: true, toolKit: true, jack: true, mats: true, stereo: true, penDriveOrCd: false },
          damages: [],
          customerVoiceComplaints: [],
          advisorsObservations: []
        },
        vehicle: jc.vehicle || {
          id: `VEH-${idx}`,
          registrationNumber: jc.vehicleReg || 'BA 01 PA 0001',
          chassisNumber: 'CHASSIS-0000',
          engineNumber: 'ENGINE-0000',
          make: 'Toyota',
          model: 'Corolla',
          year: 2022,
          fuelType: 'Petrol',
          color: 'White',
          odometerReading: 25000,
          customerName: jc.customerName || 'Customer'
        },
        isInsuranceClaim: Boolean(jc.isInsuranceClaim),
        isWarrantyClaim: Boolean(jc.isWarrantyClaim),
        isLocked: Boolean(jc.isLocked)
      };
    });

    const customers = (Array.isArray(parsed.customers) && parsed.customers.length > 0 ? parsed.customers : fallback.customers).map((c: any) => ({
      ...c,
      vehicles: Array.isArray(c.vehicles) ? c.vehicles : []
    }));

    const invoices = (Array.isArray(parsed.invoices) && parsed.invoices.length > 0 ? parsed.invoices : fallback.invoices).map((inv: any) => {
      const createdAt = typeof inv.createdAt === 'string' && inv.createdAt ? inv.createdAt : (typeof inv.date === 'string' && inv.date ? `${inv.date}T00:00:00Z` : new Date().toISOString());
      const date = typeof inv.date === 'string' && inv.date ? inv.date : createdAt.slice(0, 10);
      const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
      const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? Math.round(taxable * 0.13));
      const grandTotal = Number(inv.grandTotal ?? (taxable + vat));
      const status = inv.status || inv.paymentStatus || 'Unpaid';
      const paymentStatus = inv.paymentStatus || inv.status || 'Unpaid';

      return {
        ...inv,
        createdAt,
        date,
        taxableAmount: taxable,
        totalTaxableAmount: taxable,
        subTotal: Number(inv.subTotal ?? taxable),
        vatAmount: vat,
        totalVatAmount: vat,
        grandTotal,
        status,
        paymentStatus,
        paidAmount: Number(inv.paidAmount ?? inv.amountPaid ?? (status === 'Paid' ? grandTotal : 0)),
        amountPaid: Number(inv.amountPaid ?? inv.paidAmount ?? (status === 'Paid' ? grandTotal : 0)),
        balanceDue: Number(inv.balanceDue ?? (status === 'Paid' ? 0 : grandTotal)),
        items: Array.isArray(inv.items) ? inv.items : [],
        payments: Array.isArray(inv.payments) ? inv.payments : []
      };
    });

    const parts = (Array.isArray(parsed.parts) && parsed.parts.length > 0 ? parsed.parts : fallback.parts).map((p: any) => ({
      ...p,
      compatibleModels: Array.isArray(p.compatibleModels) ? p.compatibleModels : [],
      substitutePartIds: Array.isArray(p.substitutePartIds) ? p.substitutePartIds : []
    }));

    return {
      profile: parsed.profile || fallback.profile,
      users,
      currentUser,
      servicePriceBook: Array.isArray(parsed.servicePriceBook) ? parsed.servicePriceBook : fallback.servicePriceBook,
      servicePriceList: Array.isArray(parsed.servicePriceList) ? parsed.servicePriceList : (parsed.servicePriceBook || fallback.servicePriceList),
      bays: Array.isArray(parsed.bays) && parsed.bays.length > 0 ? parsed.bays : fallback.bays,
      technicians: Array.isArray(parsed.technicians) && parsed.technicians.length > 0 ? parsed.technicians : fallback.technicians,
      customers,
      parts,
      partsQuotations: Array.isArray(parsed.partsQuotations) ? parsed.partsQuotations : [],
      partsSalesOrders: Array.isArray(parsed.partsSalesOrders) ? parsed.partsSalesOrders : [],
      partsSalesReturns: Array.isArray(parsed.partsSalesReturns) ? parsed.partsSalesReturns : [],
      jobCards,
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : (fallback.appointments || []),
      invoices,
      warrantyRecords: Array.isArray(parsed.warrantyRecords) && parsed.warrantyRecords.length > 0 ? parsed.warrantyRecords : fallback.warrantyRecords,
      warrantyClaims: Array.isArray(parsed.warrantyClaims) && parsed.warrantyClaims.length > 0 ? parsed.warrantyClaims : fallback.warrantyClaims,
      glAccounts: Array.isArray(parsed.glAccounts) && parsed.glAccounts.length > 0 ? parsed.glAccounts : fallback.glAccounts,
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [],
      vatLedger: Array.isArray(parsed.vatLedger) ? parsed.vatLedger : [],
      insuranceClaims: Array.isArray(parsed.insuranceClaims) && parsed.insuranceClaims.length > 0 ? parsed.insuranceClaims : fallback.insuranceClaims,
      purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
      lastCloudSync: parsed.lastCloudSync || new Date().toISOString(),
      isCloudSynced: typeof parsed.isCloudSynced === 'boolean' ? parsed.isCloudSynced : true
    };
  }

  private saveToStorage(data: AppDatabase): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (data.currentUser) {
        localStorage.setItem(ACTIVE_USER_KEY, data.currentUser.username);
      }
    } catch (e) {
      console.error('Error saving database to localStorage:', e);
    }
  }

  public getDatabase(): AppDatabase {
    this.db = this.normalizeDatabase(this.db);
    return { ...this.db };
  }

  public saveDatabase(updated: Partial<AppDatabase>): void {
    this.db = { ...this.db, ...updated };
    this.saveToStorage(this.db);
  }

  public setCurrentUser(userId: string): UserAccount | null {
    return this.switchUser(userId);
  }

  public switchUser(userId: string): UserAccount | null {
    const user = this.db.users.find(u => u.id === userId);
    if (user) {
      this.db.currentUser = user;
      this.saveToStorage(this.db);
      return user;
    }
    return null;
  }

  public resetToDemo(): AppDatabase {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    this.db = this.loadFromStorage();
    return this.db;
  }

  public syncCloud(): Promise<{ success: boolean; timestamp: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date().toISOString();
        this.db.lastCloudSync = now;
        this.db.isCloudSynced = true;
        this.saveToStorage(this.db);
        resolve({ success: true, timestamp: now });
      }, 600);
    });
  }

  public exportBackupJson(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importBackupJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && parsed.profile && parsed.users && parsed.jobCards) {
        this.db = parsed;
        this.saveToStorage(this.db);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON backup format:', e);
    }
    return false;
  }
}

export const storage = StorageService.getInstance();
