import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GripVertical,
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

const KANBAN_COLUMNS: { id: JobCardStatus; title: string; accent: string; badgeBg: string }[] = [
  { id: 'Vehicle Check-in', title: 'Vehicle Check-in', accent: '#64748B', badgeBg: 'bg-[#F1F5F9] text-[#0F172A]' },
  { id: 'Bay Assigned (In Progress)', title: 'In Bay (Repairs)', accent: '#0EA5E9', badgeBg: 'bg-sky-50 text-[#0284C7]' },
  { id: 'Awaiting Spares', title: 'Awaiting Spares', accent: '#F59E0B', badgeBg: 'bg-amber-50 text-[#B45309]' },
  { id: 'Quality Check', title: 'Quality Check', accent: '#0284C7', badgeBg: 'bg-sky-50 text-[#0F3D5E]' },
  { id: 'Ready for Billing', title: 'Ready for Billing', accent: '#16A34A', badgeBg: 'bg-green-50 text-[#16A34A]' },
  { id: 'Delivered', title: 'Delivered', accent: '#0F3D5E', badgeBg: 'bg-[#F1F5F9] text-[#0F3D5E]' }
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
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<JobCardStatus | null>(null);

  // Enhanced Filter States for Job Cards & Appointments
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | JobCardStatus>('all');
  const [filterTech, setFilterTech] = useState<'all' | string>('all');
  const [filterServiceType, setFilterServiceType] = useState<'all' | string>('all');
  const [aptFilterDate, setAptFilterDate] = useState<'all' | 'today' | 'upcoming' | 'past'>('all');

  // New Job Card Intake Modal State (kept blank by default so unmatched searches never display stale/fake data)
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeReg, setIntakeReg] = useState('');
  const [intakeBrand, setIntakeBrand] = useState('');
  const [intakeModel, setIntakeModel] = useState('');
  const [intakeCustName, setIntakeCustName] = useState('');
  const [intakeCustPhone, setIntakeCustPhone] = useState('');
  const [intakeServiceType, setIntakeServiceType] = useState<JobCard['serviceType']>('Periodic Maintenance Service');
  const [intakeOdo, setIntakeOdo] = useState<number>(0);
  const [intakeFuel, setIntakeFuel] = useState<number>(50);
  const [intakeComplaints, setIntakeComplaints] = useState('');
  const [intakeBay, setIntakeBay] = useState('Bay 1 (Mechanical Lift)');
  const [intakeTechId, setIntakeTechId] = useState(safeTechnicians[0]?.id || '');
  const [intakeCouponNumber, setIntakeCouponNumber] = useState('');

  // Mandatory check-in tracking fields
  const [intakeArrivalDate, setIntakeArrivalDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [intakeEntryTime, setIntakeEntryTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });
  const [intakeVin, setIntakeVin] = useState('');
  const [intakeEngineNo, setIntakeEngineNo] = useState('');

  const normalizeRegNumber = (val?: string) =>
    (val || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Strict exact-match lookup ONLY across Customer Garage vehicles and Job Card history
  const matchedServiceHistory = useMemo(() => {
    const cleanReg = normalizeRegNumber(intakeReg);
    if (!cleanReg) return null;

    // 1. Exact match in Job Card history (sorted latest first)
    const matchingCards = safeJobCards
      .filter((jc) => normalizeRegNumber(jc.vehicle?.registrationNumber) === cleanReg)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 2. Exact match in Customer Garage vehicles
    let matchedCustomer: Customer | undefined;
    let matchedCustomerVeh: any = null;
    for (const c of safeCustomers) {
      const foundVeh = (c.vehicles || []).find((v: any) => {
        const regStr = typeof v === 'string' ? v : v?.registrationNumber || '';
        return normalizeRegNumber(regStr) === cleanReg;
      });
      if (foundVeh) {
        matchedCustomer = c;
        matchedCustomerVeh = foundVeh;
        break;
      }
    }

    if (matchingCards.length === 0 && !matchedCustomer) {
      return null;
    }

    const latestCard = matchingCards[0];
    const vehObj =
      typeof matchedCustomerVeh === 'object' && matchedCustomerVeh !== null
        ? matchedCustomerVeh
        : null;

    const previousKm =
      Math.max(
        latestCard?.vehicle?.odometerReading || 0,
        vehObj?.odometerReading || 0
      );
    const lastServiceDate =
      latestCard?.createdAt?.slice(0, 10) || vehObj?.lastServiceDate || '';
    const lastDateObj = lastServiceDate ? new Date(lastServiceDate) : new Date();
    const nextDueDate = new Date(lastDateObj.getTime() + 120 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const sources: string[] = [];
    if (matchedCustomer) sources.push('Customer Garage');
    if (matchingCards.length > 0) sources.push('Job Card History');

    return {
      source: sources.join(' & '),
      matchReason: 'Exact Registration Match',
      registrationNumber:
        (typeof matchedCustomerVeh === 'string'
          ? matchedCustomerVeh
          : vehObj?.registrationNumber) ||
        latestCard?.vehicle?.registrationNumber ||
        intakeReg.trim().toUpperCase(),
      customerName: matchedCustomer?.name || latestCard?.customerName || '',
      customerPhone: matchedCustomer?.phone || latestCard?.customerPhone || '',
      brand:
        vehObj?.brand ||
        vehObj?.make ||
        latestCard?.vehicle?.brand ||
        latestCard?.vehicle?.make ||
        '',
      model: vehObj?.model || latestCard?.vehicle?.model || '',
      vinNumber:
        latestCard?.vehicle?.vinNumber ||
        latestCard?.vehicle?.chassisNumber ||
        vehObj?.vinNumber ||
        vehObj?.chassisNumber ||
        '',
      engineNumber:
        latestCard?.vehicle?.engineNumber || vehObj?.engineNumber || '',
      couponNumber: latestCard?.couponNumber || '',
      lastOdometer: previousKm,
      lastServiceDate,
      lastServiceType:
        latestCard?.serviceType || vehObj?.lastServiceType || 'Periodic Maintenance Service',
      lastComplaints:
        latestCard?.inspection?.generalRemarks ||
        (latestCard?.inspection?.customerVoiceComplaints || []).join(', ') ||
        '',
      visitCount: Math.max(matchingCards.length, vehObj?.totalServiceCount || 0, 1),
      nextServiceDueKm: previousKm > 0 ? previousKm + 5000 : 5000,
      nextServiceDueDate: nextDueDate,
    };
  }, [intakeReg, safeJobCards, safeCustomers]);

  // Dedicated vehicle registration search state
  const [regSearchResult, setRegSearchResult] = useState<{
    searched: boolean;
    found: boolean;
    source?: string;
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
    errorMsg?: string;
  } | null>(null);

  // Strictly search ONLY Customer Garage vehicles and Job Card history for an EXACT registration match
  const handleSearchRegistration = (targetReg?: string) => {
    const rawQuery = (targetReg !== undefined ? targetReg : intakeReg).trim().toUpperCase();
    const cleanReg = normalizeRegNumber(rawQuery);
    if (!cleanReg) {
      setRegSearchResult({
        searched: true,
        found: false,
        query: rawQuery,
        errorMsg: 'Please enter a full Vehicle Registration Number before searching.'
      });
      return;
    }

    // 1. Search ONLY Customer Garage vehicles for EXACT normalized registration match
    let matchedCustomer: Customer | undefined;
    let matchedCustomerVeh: any = null;
    for (const c of safeCustomers) {
      const exactVeh = (c.vehicles || []).find((v: any) => {
        const regStr = typeof v === 'string' ? v : v?.registrationNumber || '';
        return normalizeRegNumber(regStr) === cleanReg;
      });
      if (exactVeh) {
        matchedCustomer = c;
        matchedCustomerVeh = exactVeh;
        break;
      }
    }

    // 2. Search ONLY Job Card history for EXACT normalized registration match (sorted latest first)
    const matchingJobCards = safeJobCards
      .filter((jc) => normalizeRegNumber(jc.vehicle?.registrationNumber) === cleanReg)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestJobCard = matchingJobCards[0];

    // If matched in Customer Garage and/or Job Card History -> autofill ALL sections
    if (matchedCustomer || latestJobCard) {
      const vehObj =
        typeof matchedCustomerVeh === 'object' && matchedCustomerVeh !== null
          ? matchedCustomerVeh
          : null;

      const canonicalReg =
        (typeof matchedCustomerVeh === 'string'
          ? matchedCustomerVeh
          : vehObj?.registrationNumber) ||
        latestJobCard?.vehicle?.registrationNumber ||
        rawQuery;

      const cName = matchedCustomer?.name || latestJobCard?.customerName || '';
      const cPhone = matchedCustomer?.phone || latestJobCard?.customerPhone || '';
      const cBrand =
        vehObj?.brand ||
        vehObj?.make ||
        latestJobCard?.vehicle?.brand ||
        latestJobCard?.vehicle?.make ||
        '';
      const cModel = vehObj?.model || latestJobCard?.vehicle?.model || '';
      const cVin =
        latestJobCard?.vehicle?.vinNumber ||
        latestJobCard?.vehicle?.chassisNumber ||
        vehObj?.vinNumber ||
        vehObj?.chassisNumber ||
        '';
      const cEngine =
        latestJobCard?.vehicle?.engineNumber || vehObj?.engineNumber || '';
      const cOdo = Math.max(
        latestJobCard?.vehicle?.odometerReading || 0,
        vehObj?.odometerReading || 0
      );
      const cLastDate =
        latestJobCard?.createdAt?.slice(0, 10) || vehObj?.lastServiceDate || '';
      const cVisitCount = Math.max(
        matchingJobCards.length,
        vehObj?.totalServiceCount || 0,
        1
      );
      const cServiceType =
        latestJobCard?.serviceType || 'Periodic Maintenance Service';
      const cComplaints =
        latestJobCard?.inspection?.generalRemarks ||
        (latestJobCard?.inspection?.customerVoiceComplaints || []).join(', ') ||
        '';
      const cCoupon = latestJobCard?.couponNumber || '';

      const sources: string[] = [];
      if (matchedCustomer) sources.push('Customer Garage');
      if (latestJobCard) sources.push('Job Card History');

      // Autofill all sections ONLY because exact registration number matched
      setIntakeReg(canonicalReg);
      setIntakeCustName(cName);
      setIntakeCustPhone(cPhone);
      if (cBrand && cBrand !== 'Generic' && cBrand !== 'Vehicle') setIntakeBrand(cBrand);
      if (cModel && cModel !== 'Model') setIntakeModel(cModel);
      if (cVin) setIntakeVin(cVin);
      if (cEngine) setIntakeEngineNo(cEngine);
      if (cOdo > 0) setIntakeOdo(cOdo);
      if (cServiceType) setIntakeServiceType(cServiceType as JobCard['serviceType']);
      if (cComplaints) setIntakeComplaints(cComplaints);
      if (cCoupon) setIntakeCouponNumber(cCoupon);

      setRegSearchResult({
        searched: true,
        found: true,
        source: sources.join(' + '),
        customerName: cName,
        customerPhone: cPhone,
        brand: cBrand,
        model: cModel,
        vinNumber: cVin,
        engineNumber: cEngine,
        lastOdometer: cOdo,
        lastServiceDate: cLastDate,
        visitCount: cVisitCount,
        query: canonicalReg
      });
    } else {
      // STRICT RULE: NOT MATCHED -> do NOT autofill or modify any other form fields
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

  const resetIntakeForm = () => {
    setIntakeReg('');
    setIntakeBrand('');
    setIntakeModel('');
    setIntakeCustName('');
    setIntakeCustPhone('');
    setIntakeVin('');
    setIntakeEngineNo('');
    setIntakeOdo(0);
    setIntakeFuel(50);
    setIntakeServiceType('Periodic Maintenance Service');
    setIntakeComplaints('');
    setIntakeCouponNumber('');
    setIntakeArrivalDate(new Date().toISOString().slice(0, 10));
    setIntakeEntryTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    setRegSearchResult(null);
  };

  // Convert Appointment to Job Card
  const handleConvertAppointment = (apt: Appointment) => {
    resetIntakeForm();
    setIntakeReg(apt.vehicleReg);
    setIntakeBrand(apt.brand || apt.make || '');
    setIntakeModel(apt.model || '');
    setIntakeCustName(apt.customerName || '');
    setIntakeCustPhone(apt.customerPhone || '');
    setIntakeComplaints(apt.complaintsSummary || '');
    setIsIntakeModalOpen(true);
  };

  // Move Job Card to any target stage (supports drag-and-drop + prev/next buttons)
  const handleMoveToStage = (jc: JobCard, targetStage: JobCardStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (jc.isLocked || jc.status === targetStage) return;
    onUpdateJobCard({ ...jc, status: targetStage });
  };

  // Advance Stage in Kanban
  const handleAdvanceStage = (jc: JobCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (jc.isLocked) return;

    const stages = KANBAN_COLUMNS.map(c => c.id);
    const currentIdx = stages.indexOf(jc.status);
    if (currentIdx < stages.length - 1) {
      onUpdateJobCard({ ...jc, status: stages[currentIdx + 1] });
    }
  };

  const handleRetreatStage = (jc: JobCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (jc.isLocked) return;

    const stages = KANBAN_COLUMNS.map(c => c.id);
    const currentIdx = stages.indexOf(jc.status);
    if (currentIdx > 0) {
      onUpdateJobCard({ ...jc, status: stages[currentIdx - 1] });
    }
  };

  const scrollKanban = (direction: 'left' | 'right') => {
    if (!kanbanScrollRef.current) return;
    kanbanScrollRef.current.scrollBy({
      left: direction === 'left' ? -320 : 320,
      behavior: 'smooth'
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition border ${
              activeSubTab === 'kanban'
                ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#E2E8F0]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Agile Kanban Board</span>
          </button>

          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition border ${
              activeSubTab === 'list'
                ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#E2E8F0]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Job Card Register ({safeJobCards.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition border ${
              activeSubTab === 'appointments'
                ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#E2E8F0]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Appointments ({safeAppointments.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Reg, Job Card, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-7 py-2 text-xs bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#64748B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-[#FFFFFF] w-full sm:w-60 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition ${
              hasActiveFilters || showFilters
                ? 'bg-sky-50 border-[#0EA5E9] text-[#0284C7]'
                : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
            title="Filter by Date, Status, Technician, and Service Type"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]" />
            )}
          </button>

          {activeSubTab === 'appointments' ? (
            <button
              onClick={() => setIsNewAptModalOpen(true)}
              className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          ) : (
            <button
              onClick={() => {
                resetIntakeForm();
                setIsIntakeModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
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
        <div className="space-y-3">
          {/* Board Navigation & Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center space-x-3 text-xs text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">
                {filteredCards.filter(c => c.status !== 'Delivered').length} Active Vehicles
              </span>
              <span>·</span>
              <span>{filteredCards.length} Total Displayed</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">Drag cards between stages or click a card to open details</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => scrollKanban('left')}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition"
                title="Scroll board left"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Left</span>
              </button>
              <button
                type="button"
                onClick={() => scrollKanban('right')}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition"
                title="Scroll board right"
              >
                <span>Right</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Lanes */}
          <div
            ref={kanbanScrollRef}
            className="flex items-stretch gap-4 overflow-x-auto pb-4 scrollbar-clean"
          >
            {KANBAN_COLUMNS.map((col, colIdx) => {
              const columnCards = filteredCards.filter((jc) => jc.status === col.id);
              const columnTotal = columnCards.reduce((sum, jc) => {
                const lSum = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                const pList = jc.partsRequested || jc.partsItems || [];
                const pSum = pList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                return sum + lSum + pSum;
              }, 0);
              const isDropTarget = dragOverColumn === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverColumn !== col.id) setDragOverColumn(col.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverColumn === col.id) setDragOverColumn(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverColumn(null);
                    const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
                    setDraggedCardId(null);
                    if (!cardId) return;
                    const card = safeJobCards.find(c => c.id === cardId);
                    if (card && !card.isLocked) {
                      handleMoveToStage(card, col.id);
                    }
                  }}
                  className={`w-[295px] shrink-0 rounded-xl border flex flex-col max-h-[calc(100vh-270px)] min-h-[500px] overflow-hidden transition-colors ${
                    isDropTarget
                      ? 'bg-sky-50/70 border-[#0EA5E9] ring-2 ring-[#0EA5E9]/20'
                      : 'bg-[#F8FAFC] border-[#E2E8F0]'
                  }`}
                >
                  {/* Stage Top Color Accent Bar */}
                  <div className="h-1 w-full" style={{ backgroundColor: col.accent }} />

                  {/* Column Header */}
                  <div className="px-3.5 py-3 bg-[#FFFFFF] border-b border-[#E2E8F0]">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#0F172A] tracking-tight truncate">
                        {col.title}
                      </h3>
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${col.badgeBg}`}>
                        {columnCards.length}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>Stage Value</span>
                      <span className="font-mono font-semibold text-[#0F3D5E] tabular-nums">
                        Rs. {columnTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Cards Stack */}
                  <div className="p-3 space-y-2.5 overflow-y-auto flex-1 scrollbar-clean">
                    {columnCards.length === 0 ? (
                      <div className="h-28 rounded-lg border border-dashed border-[#CBD5E1] flex flex-col items-center justify-center text-center px-4 text-[#64748B]">
                        <span className="text-[11px] font-medium">No vehicles in stage</span>
                        <span className="text-[10px] mt-0.5 text-[#94A3B8]">Drop a job card here</span>
                      </div>
                    ) : (
                      columnCards.map((jc) => {
                        const totalLabor = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                        const partsList = jc.partsRequested || jc.partsItems || [];
                        const totalParts = partsList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                        const totalEstimate = totalLabor + totalParts;
                        const isDragging = draggedCardId === jc.id;

                        return (
                          <div
                            key={jc.id}
                            draggable={!jc.isLocked}
                            onDragStart={(e) => {
                              if (jc.isLocked) {
                                e.preventDefault();
                                return;
                              }
                              setDraggedCardId(jc.id);
                              e.dataTransfer.setData('text/plain', jc.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedCardId(null);
                              setDragOverColumn(null);
                            }}
                            onClick={() => setSelectedJobCard(jc)}
                            className={`bg-[#FFFFFF] rounded-lg p-3.5 border transition cursor-pointer group ${
                              isDragging
                                ? 'opacity-50 border-[#0EA5E9]'
                                : jc.isLocked
                                  ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                                  : 'border-[#E2E8F0] hover:border-[#0EA5E9]'
                            }`}
                          >
                            {/* Row 1: Job Card # & Lock/Drag */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center space-x-1.5 min-w-0">
                                {!jc.isLocked && (
                                  <GripVertical className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#64748B] flex-shrink-0 cursor-grab" />
                                )}
                                <span className="font-mono text-[11px] font-bold text-[#0F3D5E] truncate">
                                  {jc.jobCardNumber}
                                </span>
                              </div>

                              {jc.isLocked ? (
                                <span className="text-[10px] font-semibold text-[#B45309] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center space-x-1 flex-shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Invoiced</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-[#64748B] truncate max-w-[95px]">
                                  {jc.serviceType.split(' ')[0]}
                                </span>
                              )}
                            </div>

                            {/* Row 2: Vehicle Reg + Make/Model */}
                            <div className="text-sm font-mono font-bold text-[#0F172A] tracking-tight truncate">
                              {jc.vehicle.registrationNumber}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate mt-0.5">
                              {jc.vehicle.brand} {jc.vehicle.model}
                            </div>

                            {/* Row 3: Customer & Tech Metadata */}
                            <div className="mt-2.5 text-[11px] text-[#64748B] truncate flex items-center space-x-1.5">
                              <User className="w-3 h-3 text-[#94A3B8] flex-shrink-0" />
                              <span className="text-[#0F172A] font-medium truncate">{jc.customerName}</span>
                              {jc.assignedTechnicianName && (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{jc.assignedTechnicianName.split(' ')[0]}</span>
                                </>
                              )}
                            </div>

                            {/* Row 4: Bay & Estimate */}
                            <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded text-[10px]">
                                {jc.bayNumber || 'Unassigned'}
                              </span>
                              <span className="font-mono font-bold text-[#0F172A] tabular-nums">
                                Rs. {totalEstimate.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Row 5: Stage Controls */}
                            {!jc.isLocked && (
                              <div className="mt-2.5 pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
                                {colIdx > 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => handleRetreatStage(jc, e)}
                                    className="text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] px-1.5 py-1 rounded inline-flex items-center space-x-1 transition"
                                    title="Move to previous stage"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                    <span>Prev</span>
                                  </button>
                                ) : (
                                  <span />
                                )}

                                {colIdx < KANBAN_COLUMNS.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleAdvanceStage(jc, e)}
                                    className="text-[11px] font-semibold text-[#0EA5E9] hover:text-[#0284C7] hover:bg-sky-50 px-2 py-1 rounded inline-flex items-center space-x-1 transition"
                                    title="Advance to next repair stage"
                                  >
                                    <span>Next Stage</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
                    className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Vehicle</span>
                  </button>
                </div>

                {/* Search Match Result Display */}
                {regSearchResult && regSearchResult.found && (
                  <div className="mt-2 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5 text-[#14532D] font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                        <span>Exact Match Found: {regSearchResult.customerName} ({regSearchResult.customerPhone})</span>
                      </div>
                      {regSearchResult.source && (
                        <span className="text-[10px] font-semibold text-[#16A34A] bg-white px-2 py-0.5 rounded border border-[#BBF7D0] whitespace-nowrap">
                          {regSearchResult.source}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#166534]">
                      Vehicle: <strong>{regSearchResult.brand} {regSearchResult.model}</strong>
                      {regSearchResult.lastOdometer ? ` • Last Odometer: ${regSearchResult.lastOdometer.toLocaleString()} km` : ''}
                      {regSearchResult.lastServiceDate ? ` • Last Service: ${regSearchResult.lastServiceDate}` : ''}
                      {regSearchResult.visitCount ? ` • Visits: ${regSearchResult.visitCount}` : ''}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-[#16A34A] bg-white px-2 py-0.5 rounded border border-[#BBF7D0]">
                      All matching customer &amp; vehicle sections auto-filled
                    </span>
                  </div>
                )}

                {regSearchResult && !regSearchResult.found && (
                  <div className="mt-2 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs space-y-1">
                    <div className="flex items-center space-x-1.5 text-[#92400E] font-bold">
                      <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
                      <span>
                        {regSearchResult.errorMsg || `No Exact Match Found for "${regSearchResult.query}"`}
                      </span>
                    </div>
                    {!regSearchResult.errorMsg && (
                      <p className="text-[11px] text-[#B45309]">
                        Not found in Customer Garage or Job Card History. No fields were auto-filled — enter the details below to register a new customer and vehicle.
                      </p>
                    )}
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
