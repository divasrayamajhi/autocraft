import React, { useState, useMemo, useEffect } from 'react';
import { 
  JobCard, 
  Appointment, 
  Customer, 
  Vehicle,
  Technician, 
  SparePart, 
  JobCardStatus,
  UserAccount,
  Invoice,
  GatePass,
  PartsQuotation,
  WorkshopProfile
} from '../../types';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  ArrowRight,
  Lock,
  FileText,
  History,
  Sparkles,
  Check,
  RotateCcw,
  Tag,
  Hash,
  X,
  Users,
  Share2,
  Copy,
  MessageSquare
} from 'lucide-react';
import { JobCardDetailModal } from './JobCardDetailModal';
import { ServicePriceItem, WorkshopBay } from '../../types';

interface JobCardManagementProps {
  jobCards: JobCard[];
  appointments: Appointment[];
  customers: Customer[];
  technicians: Technician[];
  availableParts: SparePart[];
  currentUser: UserAccount;
  profile?: WorkshopProfile;
  invoices?: Invoice[];
  gatePasses?: GatePass[];
  bays?: any[];
  servicePrices?: ServicePriceItem[];
  onUpdatePart?: (part: SparePart) => void;
  onUpdateBay?: (bay: any) => void;
  onCreateJobCard: (newJc: JobCard) => void;
  onUpdateJobCard: (updatedJc: JobCard) => void;
  onCreateAppointment: (newApt: Appointment) => void;
  onConvertToInvoice: (jc: JobCard) => void;
  onAddCustomer?: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onCreateQuotation?: (quotation: PartsQuotation) => void;
}

const KANBAN_COLUMNS: { id: JobCardStatus; title: string; color: string }[] = [
  { id: 'Vehicle Check-in', title: 'Vehicle Check-in', color: 'border-slate-400 text-slate-700 bg-slate-50' },
  { id: 'Bay Assigned (In Progress)', title: 'In Bay (Repairs)', color: 'border-indigo-400 text-indigo-700 bg-indigo-50/50' },
  { id: 'Awaiting Spares', title: 'Awaiting Spares', color: 'border-amber-400 text-amber-700 bg-amber-50/50' },
  { id: 'Quality Check', title: 'Quality Check', color: 'border-purple-400 text-purple-700 bg-purple-50/50' },
  { id: 'Ready for Billing', title: 'Ready for Billing', color: 'border-emerald-400 text-emerald-700 bg-emerald-50/50' },
  { id: 'Delivered', title: 'Delivered Vehicles', color: 'border-slate-300 text-slate-500 bg-slate-50' }
];

export const JobCardManagement: React.FC<JobCardManagementProps> = ({
  jobCards = [],
  appointments = [],
  customers = [],
  technicians = [],
  availableParts = [],
  currentUser,
  profile,
  invoices = [],
  gatePasses = [],
  bays = [],
  servicePrices = [],
  onUpdatePart,
  onUpdateBay,
  onCreateJobCard,
  onUpdateJobCard,
  onCreateAppointment,
  onConvertToInvoice,
  onAddCustomer,
  onUpdateCustomer,
  onViewInvoice,
  onCreateQuotation
}) => {
  const safeJobCards = jobCards || [];
  const safeAppointments = appointments || [];
  const safeCustomers = customers || [];
  const safeTechnicians = technicians || [];
  const safeAvailableParts = availableParts || [];

  const [activeSubTab, setActiveSubTab] = useState<'kanban' | 'list' | 'appointments'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);

  // Enhanced Filter States for Job Cards & Appointments
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | JobCardStatus>('all');
  const [filterTech, setFilterTech] = useState<'all' | string>('all');
  const [filterServiceType, setFilterServiceType] = useState<'all' | string>('all');
  const [aptFilterDate, setAptFilterDate] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  // New Job Card Intake Modal State
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeReg, setIntakeReg] = useState('');
  const [intakeBrand, setIntakeBrand] = useState('Hyundai');
  const [intakeModel, setIntakeModel] = useState('Creta SX');
  const [intakeCustName, setIntakeCustName] = useState('');
  const [intakeCustPhone, setIntakeCustPhone] = useState('+977-98');
  const [intakeServiceType, setIntakeServiceType] = useState<JobCard['serviceType']>('Periodic Maintenance Service');
  const [intakeOdo, setIntakeOdo] = useState<number>(38000);
  const [intakeFuel, setIntakeFuel] = useState<number>(60);
  const [intakeComplaints, setIntakeComplaints] = useState('Periodic 40,000 km general service, brake inspection, engine oil replacement.');
  const [intakeBay, setIntakeBay] = useState('Bay 1 (Mechanical Lift)');
  const [intakeTechId, setIntakeTechId] = useState(safeTechnicians[0]?.id || '');
  const [intakeCouponNumber, setIntakeCouponNumber] = useState('');

  // Mandatory check-in tracking fields requested by user
  const [intakeArrivalDate, setIntakeArrivalDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [intakeEntryTime, setIntakeEntryTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [intakeVin, setIntakeVin] = useState('');
  const [intakeEngineNo, setIntakeEngineNo] = useState('');

  // Auto-Detect & Match Existing Service History by Vehicle Registration or Chassis/VIN (especially)
  const matchedServiceHistory = useMemo(() => {
    const cleanReg = intakeReg.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanVin = intakeVin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if ((!cleanReg || cleanReg.length < 3) && (!cleanVin || cleanVin.length < 4)) return null;

    // Search historical job cards for this vehicle by registration OR chassis / VIN
    const matchingCards = safeJobCards.filter(jc => {
      const jcReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const jcVin = (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      const regMatch = cleanReg && cleanReg.length >= 3 && (jcReg === cleanReg || (jcReg.length >= 4 && (jcReg.includes(cleanReg) || cleanReg.includes(jcReg))));
      const vinMatch = cleanVin && cleanVin.length >= 4 && (jcVin === cleanVin || (jcVin.length >= 5 && (jcVin.includes(cleanVin) || cleanVin.includes(jcVin))));
      return regMatch || vinMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (matchingCards.length > 0) {
      const latest = matchingCards[0];
      const previousKm = latest.vehicle?.odometerReading || 0;
      const nextDueKm = previousKm + 5000;
      const latestDate = new Date(latest.createdAt);
      const nextDueDate = new Date(latestDate.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const isVinMatch = cleanVin && (latest.vehicle?.vinNumber || latest.vehicle?.chassisNumber || '').toUpperCase().includes(cleanVin);

      return {
        source: 'Job Cards Archive',
        matchReason: isVinMatch ? 'Chassis/VIN Match' : 'Registration Match',
        customerName: latest.customerName,
        customerPhone: latest.customerPhone,
        brand: latest.vehicle?.brand || latest.vehicle?.make || 'Hyundai',
        model: latest.vehicle?.model || 'Car',
        vinNumber: latest.vehicle?.vinNumber || latest.vehicle?.chassisNumber || '',
        engineNumber: latest.vehicle?.engineNumber || '',
        couponNumber: latest.couponNumber || '',
        lastOdometer: previousKm,
        lastServiceDate: latest.createdAt.slice(0, 10),
        lastServiceType: latest.serviceType,
        lastComplaints: latest.inspection?.generalRemarks || (latest.inspection?.customerVoiceComplaints || []).join(', ') || 'Regular maintenance service',
        visitCount: matchingCards.length,
        nextServiceDueKm: nextDueKm,
        nextServiceDueDate: nextDueDate
      };
    }

    // Secondary check against registered customers in customer directory
    let matchedCustomerVeh: any = null;
    const matchedCustomer = safeCustomers.find(c => {
      const matchingVeh = (c.vehicles || []).find((v: any) => {
        const regStr = typeof v === 'string' ? v : v?.registrationNumber || '';
        const vinStr = typeof v !== 'string' ? (v?.vinNumber || v?.chassisNumber || '') : '';
        const rMatch = cleanReg && cleanReg.length >= 3 && regStr.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(cleanReg);
        const vMatch = cleanVin && cleanVin.length >= 4 && vinStr.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(cleanVin);
        return rMatch || vMatch;
      });
      if (matchingVeh) {
        matchedCustomerVeh = matchingVeh;
        return true;
      }
      const notesMatch = cleanVin && cleanVin.length >= 4 && (c.notes || '').toUpperCase().includes(cleanVin);
      return notesMatch;
    });

    if (matchedCustomer) {
      const vehObj = typeof matchedCustomerVeh === 'object' && matchedCustomerVeh !== null ? matchedCustomerVeh : null;
      return {
        source: 'Customer Master Directory',
        matchReason: 'Customer Directory Match',
        customerName: matchedCustomer.name,
        customerPhone: matchedCustomer.phone,
        brand: vehObj?.brand || vehObj?.make || 'Toyota',
        model: vehObj?.model || 'RAV4',
        vinNumber: cleanVin || vehObj?.vinNumber || vehObj?.chassisNumber || `MAL${cleanReg || '7781'}`,
        engineNumber: vehObj?.engineNumber || `ENG${cleanReg || '02'}`,
        couponNumber: '',
        lastOdometer: vehObj?.odometerReading || 28000,
        lastServiceDate: vehObj?.lastServiceDate || '2025-10-10',
        lastServiceType: vehObj?.lastServiceType || 'Major 30K Service',
        lastComplaints: 'Fluids flush and brake pad check',
        visitCount: vehObj?.totalServiceCount || 1,
        nextServiceDueKm: (vehObj?.odometerReading ? vehObj.odometerReading + 5000 : 33000),
        nextServiceDueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      };
    }

    return null;
  }, [intakeReg, intakeVin, safeJobCards, safeCustomers]);

  // Dedicated vehicle registration search state
  const [regSearchResult, setRegSearchResult] = useState<{
    searched: boolean;
    found: boolean;
    customerName?: string;
    customerPhone?: string;
    brand?: string;
    model?: string;
    vinNumber?: string;
    engineNumber?: string;
    lastOdometer?: number;
    lastServiceDate?: string;
    visitCount?: number;
    query?: string;
  } | null>(null);

  // Search entire customer directory and vehicle records on demand
  const handleSearchRegistration = (targetReg?: string) => {
    const rawQuery = (targetReg !== undefined ? targetReg : intakeReg).trim().toUpperCase();
    const cleanReg = rawQuery.replace(/[^A-Z0-9]/g, '');
    if (!cleanReg || cleanReg.length < 2) {
      alert('Please enter at least 2 characters of vehicle registration to search.');
      return;
    }

    // 1. Search in Customer Directory
    let matchedCustomer: Customer | undefined;
    let matchedCustomerVeh: any = null;

    for (const c of safeCustomers) {
      const match = (c.vehicles || []).find((v: any) => {
        const regStr = (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return regStr === cleanReg || (cleanReg.length >= 4 && (regStr.includes(cleanReg) || cleanReg.includes(regStr)));
      });
      if (match) {
        matchedCustomer = c;
        matchedCustomerVeh = match;
        break;
      }
    }

    // 2. Search in past Job Cards if not found in customer directory
    let pastJobCardMatch: JobCard | undefined;
    if (!matchedCustomer) {
      pastJobCardMatch = safeJobCards.find(jc => {
        const reg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return reg === cleanReg || (cleanReg.length >= 4 && (reg.includes(cleanReg) || cleanReg.includes(reg)));
      });
    }

    // 3. Search in Invoices
    let invoiceMatch: Invoice | undefined;
    if (!matchedCustomer && !pastJobCardMatch) {
      invoiceMatch = (invoices || []).find(inv => {
        const reg = (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return reg === cleanReg || (cleanReg.length >= 4 && (reg.includes(cleanReg) || cleanReg.includes(reg)));
      });
    }

    if (matchedCustomer) {
      const vehObj = typeof matchedCustomerVeh === 'object' && matchedCustomerVeh !== null ? matchedCustomerVeh : null;
      const cName = matchedCustomer.name;
      const cPhone = matchedCustomer.phone;
      const cBrand = vehObj?.brand || vehObj?.make || 'Vehicle';
      const cModel = vehObj?.model || 'Model';
      const cVin = vehObj?.vinNumber || vehObj?.chassisNumber || '';
      const cEngine = vehObj?.engineNumber || '';
      const cOdo = vehObj?.odometerReading || 0;
      const cLastDate = vehObj?.lastServiceDate || '';
      const cCount = (vehObj?.totalServiceCount || 1);

      // Autofill ONLY when matched
      setIntakeCustName(cName);
      setIntakeCustPhone(cPhone);
      if (cBrand && cBrand !== 'Generic' && cBrand !== 'Vehicle') setIntakeBrand(cBrand);
      if (cModel && cModel !== 'Model') setIntakeModel(cModel);
      if (cVin) setIntakeVin(cVin);
      if (cEngine) setIntakeEngineNo(cEngine);
      if (cOdo > 0) setIntakeOdo(cOdo + 2000);

      setRegSearchResult({
        searched: true,
        found: true,
        customerName: cName,
        customerPhone: cPhone,
        brand: cBrand,
        model: cModel,
        vinNumber: cVin,
        engineNumber: cEngine,
        lastOdometer: cOdo,
        lastServiceDate: cLastDate,
        visitCount: cCount,
        query: rawQuery
      });
    } else if (pastJobCardMatch) {
      const cName = pastJobCardMatch.customerName;
      const cPhone = pastJobCardMatch.customerPhone;
      const cBrand = pastJobCardMatch.vehicle?.brand || pastJobCardMatch.vehicle?.make || 'Vehicle';
      const cModel = pastJobCardMatch.vehicle?.model || 'Model';
      const cVin = pastJobCardMatch.vehicle?.vinNumber || pastJobCardMatch.vehicle?.chassisNumber || '';
      const cEngine = pastJobCardMatch.vehicle?.engineNumber || '';
      const cOdo = pastJobCardMatch.vehicle?.odometerReading || 0;
      const cLastDate = pastJobCardMatch.createdAt.slice(0, 10);

      setIntakeCustName(cName);
      setIntakeCustPhone(cPhone);
      if (cBrand && cBrand !== 'Generic' && cBrand !== 'Vehicle') setIntakeBrand(cBrand);
      if (cModel && cModel !== 'Model') setIntakeModel(cModel);
      if (cVin) setIntakeVin(cVin);
      if (cEngine) setIntakeEngineNo(cEngine);
      if (cOdo > 0) setIntakeOdo(cOdo + 2500);

      setRegSearchResult({
        searched: true,
        found: true,
        customerName: cName,
        customerPhone: cPhone,
        brand: cBrand,
        model: cModel,
        vinNumber: cVin,
        engineNumber: cEngine,
        lastOdometer: cOdo,
        lastServiceDate: cLastDate,
        visitCount: 1,
        query: rawQuery
      });
    } else if (invoiceMatch) {
      const cName = invoiceMatch.customerName;
      const cPhone = invoiceMatch.customerPhone;
      const cBrand = invoiceMatch.vehicleBrand || 'Vehicle';
      const cModel = invoiceMatch.vehicleModel || 'Model';

      setIntakeCustName(cName);
      setIntakeCustPhone(cPhone);
      if (cBrand && cBrand !== 'Vehicle') setIntakeBrand(cBrand);
      if (cModel && cModel !== 'Model') setIntakeModel(cModel);

      setRegSearchResult({
        searched: true,
        found: true,
        customerName: cName,
        customerPhone: cPhone,
        brand: cBrand,
        model: cModel,
        visitCount: 1,
        query: rawQuery
      });
    } else {
      // NOT MATCHED: do NOT autofill! Let user create new customer.
      setRegSearchResult({
        searched: true,
        found: false,
        query: rawQuery
      });
    }
  };

  // Appointment Modal State
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const [aptName, setAptName] = useState('');
  const [aptPhone, setAptPhone] = useState('+977-98');
  const [aptReg, setAptReg] = useState('');
  const [aptMake, setAptMake] = useState('Toyota');
  const [aptModel, setAptModel] = useState('RAV4 Hybrid');
  const [aptDate, setAptDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [aptService, setAptService] = useState('Periodic Maintenance Service');
  const [aptComplaints, setAptComplaints] = useState('');

  // Generate official appointment confirmation message for SMS/WhatsApp
  const getAppointmentShareText = (apt: Appointment) => {
    const workshopName = profile?.name || 'Continental Auto Kraft';
    const workshopPhone = profile?.contactNumber || '+977-1-4378920';
    const workshopAddress = profile?.address || 'Kathmandu, Nepal';
    const formattedDate = apt.dateTime ? new Date(apt.dateTime).toLocaleString() : (apt.scheduledDate || 'Scheduled Date');

    return `Namaste ${apt.customerName} ji,\n\nYour service appointment has been confirmed at ${workshopName}.\n\n📅 Date & Time: ${formattedDate}\n🚗 Vehicle: ${apt.brand || apt.make || ''} ${apt.model} (${apt.vehicleReg})\n🔧 Service: ${apt.serviceType}\n📋 Booking Ref: ${apt.appointmentNumber || apt.id}\n📍 Location: ${workshopAddress}\n📞 Workshop Contact: ${workshopPhone}\n\nPlease arrive 10 minutes prior to your time slot. Thank you!`;
  };

  const handleShareAppointmentWhatsApp = (apt: Appointment) => {
    const text = getAppointmentShareText(apt);
    const cleanPhone = (apt.customerPhone || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyAppointmentText = (apt: Appointment) => {
    const text = getAppointmentShareText(apt);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      alert('Appointment details copied to clipboard! You can paste and send via text/SMS to the customer.');
    } else {
      prompt('Copy appointment message:', text);
    }
  };

  const handleCreateAppointmentSubmit = (e?: React.FormEvent, shareMode?: 'whatsapp' | 'copy' | 'save') => {
    if (e) e.preventDefault();
    if (!aptName.trim() || !aptReg.trim() || !aptPhone.trim()) {
      alert('Please fill in Customer Name, Phone Number, and Vehicle Registration.');
      return;
    }

    const newApt: Appointment = {
      id: `APT-${Date.now().toString().slice(-4)}`,
      appointmentNumber: `APT-81-${Math.floor(100 + Math.random() * 900)}`,
      customerName: aptName.trim(),
      customerPhone: aptPhone.trim(),
      vehicleReg: aptReg.trim().toUpperCase(),
      make: aptMake.trim(),
      brand: aptMake.trim(),
      model: aptModel.trim(),
      dateTime: aptDate,
      scheduledDate: aptDate.slice(0, 10),
      serviceType: aptService,
      complaintsSummary: aptComplaints.trim() || 'Scheduled workshop service',
      pickupRequired: false,
      status: 'Scheduled'
    };

    onCreateAppointment(newApt);
    setIsNewAptModalOpen(false);

    if (shareMode === 'whatsapp') {
      handleShareAppointmentWhatsApp(newApt);
    } else if (shareMode === 'copy') {
      handleCopyAppointmentText(newApt);
    }

    // Reset appointment fields
    setAptName('');
    setAptPhone('+977-98');
    setAptReg('');
    setAptComplaints('');
  };

  // Filter job cards with enhanced search & multi-dimensional filters
  const filteredCards = useMemo(() => {
    return safeJobCards.filter((jc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        jc.jobCardNumber.toLowerCase().includes(q) ||
        (jc.vehicle?.registrationNumber || '').toLowerCase().includes(q) ||
        (jc.vehicle?.brand || '').toLowerCase().includes(q) ||
        (jc.vehicle?.model || '').toLowerCase().includes(q) ||
        (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toLowerCase().includes(q) ||
        (jc.vehicle?.engineNumber || '').toLowerCase().includes(q) ||
        jc.customerName.toLowerCase().includes(q) ||
        jc.customerPhone.includes(q) ||
        (jc.couponNumber || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus !== 'all' && jc.status !== filterStatus) return false;

      // Service type filter
      if (filterServiceType !== 'all' && jc.serviceType !== filterServiceType) return false;

      // Technician filter
      if (filterTech !== 'all' && jc.technicianId !== filterTech && jc.assignedTechnicianId !== filterTech) return false;

      // Date filter
      if (filterDate !== 'all') {
        const jcDate = new Date(jc.arrivalDate || jc.createdAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterDate === 'today') {
          const check = new Date(jcDate);
          check.setHours(0, 0, 0, 0);
          if (check.getTime() !== today.getTime()) return false;
        } else if (filterDate === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const check = new Date(jcDate);
          check.setHours(0, 0, 0, 0);
          if (check.getTime() !== yesterday.getTime()) return false;
        } else if (filterDate === 'this_week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (jcDate < weekAgo) return false;
        } else if (filterDate === 'this_month') {
          if (jcDate.getMonth() !== today.getMonth() || jcDate.getFullYear() !== today.getFullYear()) return false;
        } else if (filterDate === 'custom') {
          if (filterStartDate && (jc.arrivalDate || jc.createdAt.slice(0, 10)) < filterStartDate) return false;
          if (filterEndDate && (jc.arrivalDate || jc.createdAt.slice(0, 10)) > filterEndDate) return false;
        }
      }

      return true;
    });
  }, [safeJobCards, searchQuery, filterStatus, filterServiceType, filterTech, filterDate, filterStartDate, filterEndDate]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return safeAppointments.filter((apt) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        apt.id.toLowerCase().includes(q) ||
        apt.customerName.toLowerCase().includes(q) ||
        apt.customerPhone.includes(q) ||
        apt.vehicleReg.toLowerCase().includes(q) ||
        (apt.brand || '').toLowerCase().includes(q) ||
        (apt.model || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (aptFilterDate !== 'all') {
        const aptDate = new Date(apt.scheduledDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (aptFilterDate === 'today') {
          const check = new Date(aptDate);
          check.setHours(0, 0, 0, 0);
          if (check.getTime() !== today.getTime()) return false;
        } else if (aptFilterDate === 'upcoming') {
          if (aptDate < today) return false;
        } else if (aptFilterDate === 'past') {
          if (aptDate >= today) return false;
        }
      }

      return true;
    });
  }, [safeAppointments, searchQuery, aptFilterDate]);

  // Reset all active filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterDate('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('all');
    setFilterTech('all');
    setFilterServiceType('all');
    setAptFilterDate('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterDate !== 'all' || filterStatus !== 'all' || filterTech !== 'all' || filterServiceType !== 'all' || aptFilterDate !== 'all';

  // Handle New Job Card Submit with Mandatory Validations & Auto-Customer Creation
  const handleCreateJobCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory Fields Validation
    if (!intakeArrivalDate?.trim()) {
      alert('Arrival Date is mandatory for vehicle check-in.');
      return;
    }
    if (!intakeEntryTime?.trim()) {
      alert('Entry / Arrival Time is mandatory for vehicle check-in.');
      return;
    }
    if (!intakeReg?.trim()) {
      alert('Vehicle Registration Number is mandatory.');
      return;
    }
    if (!intakeBrand?.trim()) {
      alert('Vehicle Make is mandatory.');
      return;
    }
    if (!intakeModel?.trim()) {
      alert('Vehicle Model is mandatory.');
      return;
    }
    if (!intakeVin?.trim()) {
      alert('VIN / Chassis Number is mandatory.');
      return;
    }
    if (!intakeEngineNo?.trim()) {
      alert('Engine Number is mandatory.');
      return;
    }
    if (!intakeOdo || Number(intakeOdo) <= 0) {
      alert('A valid Odometer Reading (KM) is mandatory.');
      return;
    }
    if (!intakeCustName?.trim()) {
      alert('Customer Full Name is mandatory.');
      return;
    }
    if (!intakeCustPhone?.trim() || intakeCustPhone.trim() === '+977-98') {
      alert('Customer Phone Number is mandatory.');
      return;
    }

    const tech = safeTechnicians.find(t => t.id === intakeTechId);
    const cleanReg = intakeReg.trim().toUpperCase();
    const cleanVin = intakeVin.trim().toUpperCase();
    const cleanEngine = intakeEngineNo.trim().toUpperCase();

    // 2. Automated Customer Directory & Customer Garage Registration / Update
    const cleanPhone = intakeCustPhone.replace(/[^0-9]/g, '');
    const cleanCustName = intakeCustName.trim();
    const existingCustomer = safeCustomers.find(c => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const matchesPhone = cleanPhone && cPhone && (cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone));
      const matchesName = cleanCustName && c.name.trim().toLowerCase() === cleanCustName.toLowerCase();
      const matchesVehicle = (c.vehicles || []).some((v: any) => {
        const regStr = typeof v === 'string' ? v : v.registrationNumber || '';
        const regMatch = regStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanReg.replace(/[^A-Z0-9]/g, '');
        const vinStr = typeof v !== 'string' ? (v.vinNumber || v.chassisNumber || '') : '';
        const vinMatch = cleanVin && vinStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanVin.replace(/[^A-Z0-9]/g, '');
        return regMatch || vinMatch;
      });
      return matchesPhone || matchesName || matchesVehicle;
    });

    const newJcNumber = `JC-81-${Math.floor(100 + Math.random() * 900)}`;

    // Query all past workshop service history / job cards for this vehicle
    const vehiclePastJobCards = safeJobCards.filter(jc => {
      const jcReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const jcVin = (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanR = cleanReg.replace(/[^A-Z0-9]/g, '');
      const cleanV = cleanVin.replace(/[^A-Z0-9]/g, '');
      return (cleanR && jcReg === cleanR) || (cleanV && jcVin === cleanV);
    });

    // Query all past invoices / service bills for this vehicle
    const vehiclePastInvoices = (invoices || []).filter(inv => {
      const invReg = (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanR = cleanReg.replace(/[^A-Z0-9]/g, '');
      const isJcMatch = vehiclePastJobCards.some(jc => jc.id === inv.jobCardId || jc.jobCardNumber === inv.jobCardNumber);
      return (cleanR && invReg === cleanR) || isJcMatch;
    });

    const vehicleTotalBilledAmount = vehiclePastInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const vehicleTotalServiceCount = vehiclePastJobCards.length + 1; // including this intake

    const vehicleRecord: Vehicle = {
      id: `VEH-${Date.now().toString().slice(-4)}`,
      registrationNumber: cleanReg,
      make: intakeBrand.trim(),
      brand: intakeBrand.trim(),
      model: intakeModel.trim(),
      year: new Date().getFullYear(),
      fuelType: 'Petrol',
      color: 'Standard',
      odometerReading: Number(intakeOdo),
      vinNumber: cleanVin,
      chassisNumber: cleanVin,
      engineNumber: cleanEngine,
      customerName: cleanCustName,
      totalServiceCount: vehicleTotalServiceCount,
      totalBilledAmount: vehicleTotalBilledAmount,
      lastServiceDate: intakeArrivalDate || new Date().toISOString().slice(0, 10),
      lastServiceType: intakeServiceType,
      lastJobCardNumber: newJcNumber
    };

    let assignedCustomerId = existingCustomer?.id;

    if (!existingCustomer && onAddCustomer) {
      // Completely new customer and vehicle: automatically register in Customer Directory under their customer garage
      assignedCustomerId = `CUST-${Date.now().toString().slice(-6)}`;
      const newCustomer: Customer = {
        id: assignedCustomerId,
        name: cleanCustName,
        phone: intakeCustPhone.trim(),
        email: `${cleanCustName.toLowerCase().replace(/\s+/g, '.')}@nepalmail.com`,
        address: 'Kathmandu, Nepal',
        customerType: 'Individual',
        createdAt: new Date().toISOString().slice(0, 10),
        lastVisit: intakeArrivalDate || new Date().toISOString().slice(0, 10),
        totalSpent: vehicleTotalBilledAmount,
        outstandingBalance: 0,
        vehicles: [vehicleRecord]
      };
      onAddCustomer(newCustomer);
    } else if (existingCustomer && onUpdateCustomer) {
      // Existing customer brings a vehicle: check if it is a new vehicle or existing garage vehicle
      const existingVehIndex = (existingCustomer.vehicles || []).findIndex((v: any) => {
        const regStr = typeof v === 'string' ? v : v.registrationNumber || '';
        const regMatch = regStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanReg.replace(/[^A-Z0-9]/g, '');
        const vinStr = typeof v !== 'string' ? (v.vinNumber || v.chassisNumber || '') : '';
        const vinMatch = cleanVin && vinStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanVin.replace(/[^A-Z0-9]/g, '');
        return regMatch || vinMatch;
      });

      if (existingVehIndex === -1) {
        // Existing customer brings a NEW vehicle:
        // Update customer garage with all past service history and the bill amount
        const updatedVehicles = [...(existingCustomer.vehicles || []), vehicleRecord];
        const updatedTotalSpent = (existingCustomer.totalSpent || 0) + vehicleTotalBilledAmount;

        onUpdateCustomer({
          ...existingCustomer,
          lastVisit: intakeArrivalDate || new Date().toISOString().slice(0, 10),
          totalSpent: updatedTotalSpent,
          vehicles: updatedVehicles
        });
      } else {
        // Existing vehicle in garage: update garage entry with fresh odometer, service count, service date and synced bill amount
        const currentVeh = existingCustomer.vehicles[existingVehIndex];
        const updatedVeh: Vehicle = {
          ...(typeof currentVeh === 'object' ? currentVeh : {}),
          id: typeof currentVeh === 'object' && currentVeh.id ? currentVeh.id : `VEH-${Date.now().toString().slice(-4)}`,
          registrationNumber: cleanReg,
          make: intakeBrand.trim() || (typeof currentVeh === 'object' ? currentVeh.make : '') || 'Generic',
          brand: intakeBrand.trim() || (typeof currentVeh === 'object' ? currentVeh.brand : '') || 'Generic',
          model: intakeModel.trim() || (typeof currentVeh === 'object' ? currentVeh.model : '') || 'Model',
          year: typeof currentVeh === 'object' && currentVeh.year ? currentVeh.year : new Date().getFullYear(),
          fuelType: typeof currentVeh === 'object' && currentVeh.fuelType ? currentVeh.fuelType : 'Petrol',
          color: typeof currentVeh === 'object' && currentVeh.color ? currentVeh.color : 'Standard',
          odometerReading: Number(intakeOdo),
          vinNumber: cleanVin || (typeof currentVeh === 'object' ? currentVeh.vinNumber || currentVeh.chassisNumber : ''),
          chassisNumber: cleanVin || (typeof currentVeh === 'object' ? currentVeh.chassisNumber || currentVeh.vinNumber : ''),
          engineNumber: cleanEngine || (typeof currentVeh === 'object' ? currentVeh.engineNumber : ''),
          customerName: existingCustomer.name,
          totalServiceCount: ((typeof currentVeh === 'object' && currentVeh.totalServiceCount) || vehiclePastJobCards.length) + 1,
          totalBilledAmount: vehicleTotalBilledAmount,
          lastServiceDate: intakeArrivalDate || new Date().toISOString().slice(0, 10),
          lastServiceType: intakeServiceType,
          lastJobCardNumber: newJcNumber
        };
        const updatedVehicles = [...existingCustomer.vehicles];
        updatedVehicles[existingVehIndex] = updatedVeh;

        onUpdateCustomer({
          ...existingCustomer,
          lastVisit: intakeArrivalDate || new Date().toISOString().slice(0, 10),
          vehicles: updatedVehicles
        });
      }
    }

    // 3. Construct the comprehensive Job Card
    const newJc: JobCard = {
      id: `JC-${Date.now().toString().slice(-6)}`,
      jobCardNumber: newJcNumber,
      customerId: assignedCustomerId || `CUST-${Date.now().toString().slice(-4)}`,
      customerName: intakeCustName.trim(),
      customerPhone: intakeCustPhone.trim(),
      arrivalDate: intakeArrivalDate,
      entryTime: intakeEntryTime,
      couponNumber: intakeCouponNumber.trim() || undefined,
      lastServiceDate: matchedServiceHistory?.lastServiceDate,
      lastServiceKm: matchedServiceHistory?.lastOdometer,
      lastServiceSummary: matchedServiceHistory ? `${matchedServiceHistory.lastServiceType}: ${matchedServiceHistory.lastComplaints}` : undefined,
      nextServiceDueDate: matchedServiceHistory?.nextServiceDueDate || new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      nextServiceDueKm: Number(intakeOdo) + 5000,
      vehicle: {
        id: `VEH-${Date.now().toString().slice(-4)}`,
        registrationNumber: cleanReg,
        make: intakeBrand.trim(),
        brand: intakeBrand.trim(),
        model: intakeModel.trim(),
        fuelType: 'Petrol',
        year: 2022,
        vinNumber: cleanVin,
        chassisNumber: cleanVin,
        engineNumber: cleanEngine,
        odometerReading: Number(intakeOdo),
        color: 'Pearl White'
      },
      serviceType: intakeServiceType,
      assignedTechnicianId: intakeTechId,
      assignedTechnicianName: tech?.name,
      bayNumber: intakeBay,
      status: 'Bay Assigned (In Progress)',
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      isInsuranceClaim: false,
      isWarrantyClaim: false,
      isLocked: false,
      inspection: {
        fuelLevel: Number(intakeFuel),
        odometer: Number(intakeOdo),
        inventoryBelongings: {
          spareWheel: true,
          toolKit: true,
          jack: true,
          mats: true,
          stereo: true,
          penDriveOrCd: false
        },
        damages: [],
        customerVoiceComplaints: intakeComplaints.split('.').filter(s => s.trim().length > 0),
        advisorsObservations: ['Vehicle admitted via express check-in. Standard safety checks initiated.', intakeComplaints]
      },
      laborItems: [
        {
          id: `LBR-${Date.now().toString().slice(-4)}`,
          description: `${intakeServiceType} Standard Labor Check`,
          hours: 2.0,
          hoursEstimated: 2.0,
          ratePerHour: 1000,
          vatRate: 13,
          totalAmount: 2000,
          technicianId: intakeTechId,
          technicianName: tech?.name,
          status: 'In Progress'
        }
      ],
      partsRequested: []
    };

    onCreateJobCard(newJc);
    setIsIntakeModalOpen(false);
    setIntakeCouponNumber('');
  };

  // Convert Appointment to Job Card
  const handleConvertAppointment = (apt: Appointment) => {
    setIntakeReg(apt.vehicleReg);
    setIntakeBrand(apt.brand || apt.make || 'Hyundai');
    setIntakeModel(apt.model);
    setIntakeCustName(apt.customerName);
    setIntakeCustPhone(apt.customerPhone);
    setIntakeComplaints(apt.complaintsSummary);
    setIsIntakeModalOpen(true);
  };

  // Advance Stage in Kanban
  const handleAdvanceStage = (jc: JobCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (jc.isLocked) return;

    const stages: JobCardStatus[] = [
      'Vehicle Check-in',
      'Bay Assigned (In Progress)',
      'Awaiting Spares',
      'Quality Check',
      'Ready for Billing',
      'Delivered'
    ];
    const currentIdx = stages.indexOf(jc.status);
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      const updated = { ...jc, status: nextStage };
      onUpdateJobCard(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'kanban' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Agile Kanban Board</span>
          </button>

          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'list' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Job Card Register ({safeJobCards.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'appointments' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments ({safeAppointments.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Reg, Chassis, Job Card, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border transition ${
              hasActiveFilters || showFilters
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Filter by Date, Status, Technician, and Service Type"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {activeSubTab === 'appointments' ? (
            <button
              onClick={() => setIsNewAptModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          ) : (
            <button
              onClick={() => setIsIntakeModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job Card</span>
            </button>
          )}
        </div>
      </div>

      {/* EXPANDABLE FILTER TOOLBAR */}
      {showFilters && (
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-4 text-xs space-y-3 shadow-sm transition">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Search & Filter Engine</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Showing {activeSubTab === 'appointments' ? filteredAppointments.length : filteredCards.length} matching records
              </span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>

          {activeSubTab === 'appointments' ? (
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Appointment Timing</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: 'Today' },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'past', label: 'Past Bookings' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAptFilterDate(t.id as any)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        aptFilterDate === t.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Date Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Date Created / Arrival</label>
                <select
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">Past 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Date Range</option>
                </select>

                {filterDate === 'custom' && (
                  <div className="flex items-center space-x-1 mt-1.5">
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={e => setFilterStartDate(e.target.value)}
                      className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                      placeholder="Start"
                    />
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={e => setFilterEndDate(e.target.value)}
                      className="w-1/2 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px]"
                      placeholder="End"
                    />
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Repair Stage / Status</label>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="all">All Stages ({safeJobCards.length})</option>
                  {KANBAN_COLUMNS.map(col => (
                    <option key={col.id} value={col.id}>
                      {col.title} ({safeJobCards.filter(c => c.status === col.id).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Technician Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Assigned Technician</label>
                <select
                  value={filterTech}
                  onChange={e => setFilterTech(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="all">All Technicians</option>
                  {safeTechnicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Service Type</label>
                <select
                  value={filterServiceType}
                  onChange={e => setFilterServiceType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="all">All Service Types</option>
                  <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                  <option value="Running Repair">Running Repair</option>
                  <option value="Brake & Suspension Overhaul">Brake & Suspension Overhaul</option>
                  <option value="Engine Diagnostics & Tuning">Engine Diagnostics & Tuning</option>
                  <option value="Accidental Repair">Accidental Repair</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 1: AGILE KANBAN BOARD */}
      {activeSubTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnCards = filteredCards.filter((jc) => jc.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 min-w-[240px] flex flex-col h-[calc(100vh-280px)] min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">{col.title}</span>
                  <span className="text-xs font-mono font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {columnCards.length}
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {columnCards.map((jc) => {
                    const totalLabor = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                    const partsList = jc.partsRequested || jc.partsItems || [];
                    const totalParts = partsList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                    const totalEstimate = totalLabor + totalParts;

                    return (
                      <div
                        key={jc.id}
                        onClick={() => setSelectedJobCard(jc)}
                        className={`bg-white rounded-xl p-3 border shadow-2xs hover:shadow-md transition cursor-pointer relative group ${
                          jc.isLocked ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-bold text-indigo-700">
                            {jc.jobCardNumber}
                          </span>
                          {jc.isLocked ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {jc.serviceType.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-900 truncate">
                          {jc.vehicle.registrationNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {jc.vehicle.brand} {jc.vehicle.model}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600 truncate flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{jc.customerName}</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {jc.bayNumber}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            Rs. {totalEstimate.toLocaleString()}
                          </span>
                        </div>

                        {!jc.isLocked && col.id !== 'Delivered' && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={(e) => handleAdvanceStage(jc, e)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 p-1 rounded hover:bg-indigo-50"
                              title="Advance to next repair stage"
                            >
                              <span>Next Stage</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: LIST VIEW */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Job Card #</th>
                <th className="p-3.5">Vehicle Reg & Model</th>
                <th className="p-3.5">Customer Details</th>
                <th className="p-3.5">Bay & Lead Tech</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Record Lock</th>
                <th className="p-3.5 text-right">Estimate (NPR)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCards.map((jc) => {
                const totalLabor = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                const partsList = jc.partsRequested || jc.partsItems || [];
                const totalParts = partsList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                const totalEstimate = totalLabor + totalParts;

                return (
                  <tr key={jc.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-indigo-700">
                      {jc.jobCardNumber}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{jc.vehicle.registrationNumber}</div>
                      <div className="text-[11px] text-slate-500">{jc.vehicle.brand} {jc.vehicle.model}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{jc.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{jc.customerPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-700">{jc.bayNumber}</div>
                      <div className="text-[11px] text-slate-500">{jc.assignedTechnicianName || 'Unassigned'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {jc.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {jc.isLocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Sealed</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Open</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      Rs. {totalEstimate.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedJobCard(jc)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                      >
                        Inspect & Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB 3: APPOINTMENTS */}
      {activeSubTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Booking ID</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Vehicle Reg & Model</th>
                <th className="p-3.5">Scheduled Date & Time</th>
                <th className="p-3.5">Service Requested</th>
                <th className="p-3.5 text-center">Share & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No appointments matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-bold text-indigo-700">{apt.id}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{apt.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{apt.customerPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-800">{apt.vehicleReg}</div>
                      <div className="text-[11px] text-slate-500">{apt.brand} {apt.model}</div>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {apt.dateTime ? new Date(apt.dateTime).toLocaleString() : (apt.scheduledDate || 'Scheduled')}
                    </td>
                    <td className="p-3.5 text-slate-600">{apt.serviceType}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleShareAppointmentWhatsApp(apt)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg font-bold text-xs flex items-center space-x-1 transition"
                          title="Share appointment details via WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyAppointmentText(apt)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs flex items-center space-x-1 transition"
                          title="Copy SMS / Text appointment message"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>SMS / Text</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConvertAppointment(apt)}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition"
                        >
                          Convert to Job Card
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: DETAIL INSPECTION */}
      {selectedJobCard && (
        <JobCardDetailModal
          jobCard={selectedJobCard}
          allJobCards={safeJobCards}
          invoices={invoices}
          gatePasses={gatePasses}
          availableParts={availableParts}
          technicians={technicians}
          currentUser={currentUser}
          profile={profile}
          servicePrices={servicePrices}
          bays={bays}
          onUpdatePart={onUpdatePart}
          onUpdateBay={onUpdateBay}
          onClose={() => setSelectedJobCard(null)}
          onUpdateJobCard={(upd) => {
            onUpdateJobCard(upd);
            setSelectedJobCard(upd);
          }}
          onConvertToInvoice={(jc) => {
            setSelectedJobCard(null);
            onConvertToInvoice(jc);
          }}
          onViewInvoice={onViewInvoice}
          onCreateQuotation={onCreateQuotation}
        />
      )}

      {/* MODAL: INTAKE JOB CARD */}
      {isIntakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Vehicle Check-in & Job Card Intake
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Record arrival date, entry time, odometer, VIN, engine number & service history.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIntakeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJobCardSubmit} className="mt-4 space-y-3 text-xs">
              {/* Check-in Arrival Date & Entry Time */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Check-in Timing & Timestamps (Mandatory)</span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    All fields editable
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Arrival Date *</label>
                    <input
                      type="date"
                      value={intakeArrivalDate}
                      onChange={e => setIntakeArrivalDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 outline-none bg-white font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Arrival / Entry Time *</label>
                    <input
                      type="text"
                      value={intakeEntryTime}
                      onChange={e => setIntakeEntryTime(e.target.value)}
                      placeholder="e.g. 09:30 AM"
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 outline-none bg-white font-medium font-mono"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Registration with Search Button */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vehicle Registration Number *
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <input
                      value={intakeReg}
                      onChange={e => {
                        setIntakeReg(e.target.value);
                        if (regSearchResult) setRegSearchResult(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchRegistration();
                        }
                      }}
                      placeholder="e.g. BA 02 CHA 8892"
                      className="w-full font-mono font-bold uppercase border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchRegistration()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Directory</span>
                  </button>
                </div>

                {/* Search Match Result Display */}
                {regSearchResult && regSearchResult.found && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-950 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Exact Match Found: {regSearchResult.customerName} ({regSearchResult.customerPhone})</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Vehicle: <strong>{regSearchResult.brand} {regSearchResult.model}</strong>
                      {regSearchResult.lastOdometer ? ` • Last Odometer: ${regSearchResult.lastOdometer.toLocaleString()} km` : ''}
                      {regSearchResult.lastServiceDate ? ` • Last Service: ${regSearchResult.lastServiceDate}` : ''}
                      {regSearchResult.visitCount ? ` • Visits: ${regSearchResult.visitCount}` : ''}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-white/90 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Customer and vehicle details auto-filled into form
                    </span>
                  </div>
                )}

                {regSearchResult && !regSearchResult.found && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-950 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>No Match Found for "{regSearchResult.query}"</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      This vehicle registration was not found in Customer Directory. Please enter the customer and vehicle information below — a new customer and vehicle record will be registered automatically upon creating this Job Card.
                    </p>
                  </div>
                )}
              </div>

              {/* Vehicle Make and Model (Separated and Fully Editable) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Make / Brand *</label>
                  <input
                    value={intakeBrand}
                    onChange={e => setIntakeBrand(e.target.value)}
                    placeholder="e.g. Hyundai, Toyota, Suzuki"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Model *</label>
                  <input
                    value={intakeModel}
                    onChange={e => setIntakeModel(e.target.value)}
                    placeholder="e.g. Creta SX, RAV4, Swift"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium"
                    required
                  />
                </div>
              </div>

              {/* VIN/Chassis and Engine Number (Mandatory & Editable) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">VIN / Chassis Number *</label>
                  <input
                    value={intakeVin}
                    onChange={e => setIntakeVin(e.target.value.toUpperCase())}
                    placeholder="e.g. MALBB51BLMM123456"
                    className="w-full font-mono uppercase border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Engine Number *</label>
                  <input
                    value={intakeEngineNo}
                    onChange={e => setIntakeEngineNo(e.target.value.toUpperCase())}
                    placeholder="e.g. G4LA-KM99812"
                    className="w-full font-mono uppercase border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Odometer & Fuel */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Odometer (KM Reading) *</label>
                  <input
                    type="number"
                    min="1"
                    value={intakeOdo}
                    onChange={e => setIntakeOdo(parseInt(e.target.value) || 0)}
                    className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Intake Fuel Level (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={intakeFuel}
                    onChange={e => setIntakeFuel(parseInt(e.target.value) || 0)}
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Customer Info (Mandatory & Editable) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    value={intakeCustName}
                    onChange={e => setIntakeCustName(e.target.value)}
                    placeholder="e.g. Ram Chandra Shrestha"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    value={intakeCustPhone}
                    onChange={e => setIntakeCustPhone(e.target.value)}
                    placeholder="+977-9841234567"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono font-medium"
                    required
                  />
                </div>
              </div>

              {/* Bay Allocation & Tech */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Workshop Bay</label>
                  <select
                    value={intakeBay}
                    onChange={e => setIntakeBay(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    <option value="Bay 1 (Mechanical Lift)">Bay 1 (Mechanical Lift)</option>
                    <option value="Bay 2 (Express Service)">Bay 2 (Express Service)</option>
                    <option value="Bay 3 (3D Wheel Alignment)">Bay 3 (3D Wheel Alignment)</option>
                    <option value="Bay 4 (Diagnostics)">Bay 4 (Diagnostics)</option>
                    <option value="Bay 5 (Body & Paint)">Bay 5 (Body & Paint)</option>
                    <option value="Bay 6 (Wash & Detailing)">Bay 6 (Wash & Detailing)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Technician</label>
                  <select
                    value={intakeTechId}
                    onChange={e => setIntakeTechId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    {safeTechnicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={intakeServiceType}
                  onChange={e => setIntakeServiceType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                >
                  <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                  <option value="Running Repair">Running Repair</option>
                  <option value="Brake & Suspension Overhaul">Brake & Suspension Overhaul</option>
                  <option value="Engine Diagnostics & Tuning">Engine Diagnostics & Tuning</option>
                  <option value="Accidental Repair">Accidental Repair</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Reported Complaints / Scope</label>
                <textarea
                  value={intakeComplaints}
                  onChange={e => setIntakeComplaints(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              {/* Coupon Number / Voucher Code Textarea in bottom */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                <label className="block font-bold text-amber-900 flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Coupon Number / Promotional Voucher</span>
                </label>
                <textarea
                  value={intakeCouponNumber}
                  onChange={e => setIntakeCouponNumber(e.target.value)}
                  placeholder="Enter promotional coupon number or discount code (e.g., FESTIVE10, DASH-2025-VOUCHER, VIP-SERVICE)"
                  rows={2}
                  className="w-full border border-amber-300 rounded-xl px-3 py-1.5 outline-none font-mono text-xs bg-white focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-700">
                  Coupons entered will be permanently attached to this Job Card and will be applied to the invoice upon billing.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate Job Card</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BOOK APPOINTMENT */}
      {isNewAptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 leading-tight">Book Service Appointment</h3>
                  <p className="text-xs text-slate-500">Schedule customer arrival slot & share booking confirmation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewAptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleCreateAppointmentSubmit(e, 'save')} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    value={aptName}
                    onChange={e => setAptName(e.target.value)}
                    placeholder="e.g. Ramesh Thapa"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    value={aptPhone}
                    onChange={e => setAptPhone(e.target.value)}
                    placeholder="+977-9841234567"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Reg # *</label>
                  <input
                    value={aptReg}
                    onChange={e => setAptReg(e.target.value.toUpperCase())}
                    placeholder="BA 02 CHA 8892"
                    className="w-full font-mono uppercase font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Make / Brand *</label>
                  <input
                    value={aptMake}
                    onChange={e => setAptMake(e.target.value)}
                    placeholder="e.g. Toyota, Hyundai"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Model *</label>
                  <input
                    value={aptModel}
                    onChange={e => setAptModel(e.target.value)}
                    placeholder="e.g. RAV4, Creta"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={aptDate}
                    onChange={e => setAptDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-medium bg-white focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Type *</label>
                  <select
                    value={aptService}
                    onChange={e => setAptService(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                    <option value="Running Repair">Running Repair</option>
                    <option value="Brake & Suspension Overhaul">Brake & Suspension Overhaul</option>
                    <option value="Engine Diagnostics & Tuning">Engine Diagnostics & Tuning</option>
                    <option value="Accidental Repair">Accidental Repair</option>
                    <option value="Wash & Detailing">Wash & Detailing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Reported Complaints / Scope</label>
                <textarea
                  value={aptComplaints}
                  onChange={e => setAptComplaints(e.target.value)}
                  placeholder="e.g. 40,000 km general service, check front suspension rattle, AC cooling inspection..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAptModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-semibold hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => handleCreateAppointmentSubmit(e, 'whatsapp')}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                    title="Save and open prefilled WhatsApp message"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Book & Share WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCreateAppointmentSubmit(e, 'copy')}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                    title="Save and copy SMS message to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Book & Copy Text</span>
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                  >
                    Book Appointment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
