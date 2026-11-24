import React, { useState } from 'react';
import { 
  JobCard, 
  SparePart, 
  Technician, 
  JobCardLaborItem, 
  JobCardPartItem,
  JobCardStatus,
  UserAccount,
  Invoice,
  GatePass,
  PartsQuotation,
  WorkshopProfile,
  ServicePriceItem,
  WorkshopBay,
  Customer,
  NepalPaymentMethod
} from '../../types';
import { 
  Wrench, 
  User, 
  Car, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Gauge, 
  Fuel, 
  Printer, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  X, 
  FileText, 
  Edit3, 
  Save, 
  History, 
  RotateCcw, 
  FileSpreadsheet, 
  Tag,
  Package,
  Search,
  Send,
  MessageSquare,
  Phone
} from 'lucide-react';
import { VehicleServiceHistoryModal } from '../common/VehicleServiceHistoryModal';
import { AccidentQuotationModal } from './AccidentQuotationModal';
import { PrintJobCardModal } from './PrintJobCardModal';
import { GenerateTaxInvoiceModal, TaxInvoiceGenerationOptions } from '../billing/GenerateTaxInvoiceModal';
import { DualCalendarPicker } from '../common/DualCalendarPicker';
import { adToBs } from '../../utils/nepaliDate';
import { formatAccountingNPR, isCreditNoteInvoice, isFreeServicePmsLabor, round2 } from '../../utils/accountingEngine';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

interface JobCardDetailModalProps {
  jobCard: JobCard;
  availableParts: SparePart[];
  technicians: Technician[];
  customers?: Customer[];
  currentUser: UserAccount;
  profile?: WorkshopProfile;
  servicePrices?: ServicePriceItem[];
  bays?: WorkshopBay[];
  allJobCards?: JobCard[];
  invoices?: Invoice[];
  gatePasses?: GatePass[];
  onClose: () => void;
  onUpdateJobCard: (updated: JobCard) => void;
  onUpdatePart?: (part: SparePart) => void;
  onUpdateBay?: (bay: WorkshopBay) => void;
  onConvertToInvoice: (jc: JobCard, options?: TaxInvoiceGenerationOptions) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onCreateQuotation?: (quotation: PartsQuotation) => void;
  onCreateCreditNote?: (
    originalInv: Invoice,
    refundTaxable: number,
    reason: string,
    refundMethod: NepalPaymentMethod
  ) => void;
  onTriggerReadyNotification?: (jc: JobCard) => void;
}

export const JobCardDetailModal: React.FC<JobCardDetailModalProps> = ({
  jobCard,
  availableParts = [],
  technicians = [],
  customers = [],
  currentUser,
  profile,
  servicePrices = [],
  bays = [],
  allJobCards = [],
  invoices = [],
  gatePasses = [],
  onClose,
  onUpdateJobCard,
  onUpdatePart,
  onUpdateBay,
  onConvertToInvoice,
  onViewInvoice,
  onCreateQuotation,
  onCreateCreditNote,
  onTriggerReadyNotification
}) => {
  const [activeTab, setActiveTab] = useState<'inspection' | 'labor' | 'parts' | 'status'>('inspection');
  const [isGenerateInvoiceOpen, setIsGenerateInvoiceOpen] = useState(false);
  const [invoiceOnlyUnbilled, setInvoiceOnlyUnbilled] = useState(false);
  const [currentJobCard, setCurrentJobCard] = useState<JobCard>(() => ({
    ...jobCard,
    laborItems: jobCard.laborItems || [],
    partsRequested: jobCard.partsRequested || jobCard.partsItems || []
  }));

  // Service History & Accident Quotation & Print modals
  const [isServiceHistoryOpen, setIsServiceHistoryOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAccidentQuotationOpen, setIsAccidentQuotationOpen] = useState(false);

  // Re-open Job Card state (Admin only)
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('Customer supplementary work / Labor & parts amendment authorized');

  // Inspection Edit State
  const [isEditingInspection, setIsEditingInspection] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState(jobCard.customerName || '');
  const [editCustomerPhone, setEditCustomerPhone] = useState(jobCard.customerPhone || '');
  const [editReg, setEditReg] = useState(jobCard.vehicle.registrationNumber || '');
  const [editBrand, setEditBrand] = useState(jobCard.vehicle.brand || jobCard.vehicle.make || '');
  const [editModel, setEditModel] = useState(jobCard.vehicle.model || '');
  const [editVin, setEditVin] = useState(jobCard.vehicle.vinNumber || jobCard.vehicle.chassisNumber || '');
  const [editEngineNo, setEditEngineNo] = useState(jobCard.vehicle.engineNumber || '');
  const [editOdo, setEditOdo] = useState(jobCard.vehicle.odometerReading || 0);
  const [editFuel, setEditFuel] = useState(jobCard.inspection.fuelLevel || 50);
  const [editArrivalDate, setEditArrivalDate] = useState(jobCard.arrivalDate || jobCard.createdAt.slice(0, 10));
  const [editEntryTime, setEditEntryTime] = useState(jobCard.entryTime || '09:30 AM');
  const [editCouponNumber, setEditCouponNumber] = useState(jobCard.couponNumber || '');
  const [editCouponNotes, setEditCouponNotes] = useState(jobCard.couponNotes || '');
  const [editRemarks, setEditRemarks] = useState(jobCard.inspection.generalRemarks || '');
  const [editServiceBillingType, setEditServiceBillingType] = useState<'Paid Service' | 'Free Service'>(
    jobCard.serviceBillingType || 'Paid Service'
  );

  // Labor Search & Results State (explicit Search input + Search button -> results list below with Add button)
  const [laborSearchInput, setLaborSearchInput] = useState('');
  const [laborSearchTerm, setLaborSearchTerm] = useState('');
  const [hasSearchedLabor, setHasSearchedLabor] = useState(false);
  const [newLaborTechId, setNewLaborTechId] = useState(technicians[0]?.id || '');
  const [showCustomLaborForm, setShowCustomLaborForm] = useState(false);
  const [customLaborCode, setCustomLaborCode] = useState('');
  const [customLaborDesc, setCustomLaborDesc] = useState('');
  const [customLaborRate, setCustomLaborRate] = useState<number>(0);

  // Spare Parts Search & Results State (explicit Search input + Search button -> results list below with Add button)
  const [partSearchInput, setPartSearchInput] = useState('');
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [hasSearchedParts, setHasSearchedParts] = useState(false);
  const [partQtyById, setPartQtyById] = useState<Record<string, number>>({});

  // Vehicle Ready SMS / Owner Notification state
  const [readyBannerMsg, setReadyBannerMsg] = useState<string | null>(null);
  const [businessOwnerPhone, setBusinessOwnerPhone] = useState(profile?.contactNumber || '');
  const [smsSentConfirmation, setSmsSentConfirmation] = useState<string | null>(null);

  // Direct Credit Note Modal state (separate from Purchase Orders)
  const [creditNoteTarget, setCreditNoteTarget] = useState<Invoice | null>(null);
  const [cnTaxable, setCnTaxable] = useState<number>(0);
  const [cnReason, setCnReason] = useState('Customer billing adjustment / returned service or spare part');
  const [cnMethod, setCnMethod] = useState<NepalPaymentMethod>('Cash');
  const [cnSuccessMsg, setCnSuccessMsg] = useState<string | null>(null);

  // ESC closes the topmost modal (LIFO order: nested sub-dialogs close before this modal)
  useEscapeKey(true, onClose);
  useEscapeKey(Boolean(creditNoteTarget), () => setCreditNoteTarget(null));
  useEscapeKey(isReopenModalOpen, () => setIsReopenModalOpen(false));

  const STAGES: JobCardStatus[] = [
    'Vehicle Check-in',
    'Bay Assigned (In Progress)',
    'Awaiting Spares',
    'Quality Check',
    'Ready for Billing',
    'Delivered'
  ];

  const isLocked = currentJobCard.isLocked;
  const isAdmin = currentUser.role === 'Admin';
  const isFreeService = currentJobCard.serviceBillingType === 'Free Service';

  // Linked Invoices (Regular Tax Invoices vs Credit Notes)
  const jcRegularInvoices = (invoices || []).filter(
    (inv) =>
      !isCreditNoteInvoice(inv) &&
      ((inv.jobCardId && inv.jobCardId === currentJobCard.id) ||
        (inv.jobCardNumber && inv.jobCardNumber === currentJobCard.jobCardNumber) ||
        (currentJobCard.invoiceId && inv.id === currentJobCard.invoiceId) ||
        (currentJobCard.invoiceNumber && inv.invoiceNumber === currentJobCard.invoiceNumber))
  );
  const latestInvoice = jcRegularInvoices[0] || null;
  const hasPaidInvoice = jcRegularInvoices.some((inv) => inv.status === 'Paid');

  const billedLaborSet = new Set(currentJobCard.billedLaborIds || []);
  const billedPartSet = new Set(currentJobCard.billedPartIds || []);
  const unbilledLaborItems = (currentJobCard.laborItems || []).filter((l) => !billedLaborSet.has(l.id));
  const unbilledPartItems = (currentJobCard.partsRequested || []).filter((p) => !billedPartSet.has(p.id));
  const hasUnbilledAdditions = unbilledLaborItems.length > 0 || unbilledPartItems.length > 0;

  // Filtered Labor Search Results (shown below Search bar when searched)
  const laborSearchResults = (() => {
    if (!hasSearchedLabor) return [];
    const q = laborSearchTerm.trim().toLowerCase();
    if (!q) return servicePrices || [];
    return (servicePrices || []).filter(
      (s) =>
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  })();

  // Filtered Spare Parts Search Results (shown below Search bar when searched)
  const partSearchResults = (() => {
    if (!hasSearchedParts) return [];
    const q = partSearchTerm.trim().toLowerCase();
    if (!q) return availableParts || [];
    return (availableParts || []).filter(
      (p) =>
        (p.sku || '').toLowerCase().includes(q) ||
        (p.partNumber || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  })();

  // Automatically sync Workshop Bay status with Job Card lifecycle stage
  const syncBayForStatus = (jc: JobCard, status: JobCardStatus) => {
    if (!bays || !onUpdateBay || !jc.bayNumber) return;
    const targetBay = bays.find(
      (b) =>
        b.name === jc.bayNumber ||
        b.bayNumber === jc.bayNumber ||
        (b.name && jc.bayNumber.toLowerCase().includes(b.name.toLowerCase()))
    );
    if (!targetBay) return;

    if (status === 'Ready for Billing' || status === 'Delivered') {
      onUpdateBay({
        ...targetBay,
        status: 'Available',
        currentJobCardId: undefined,
        currentVehicleReg: undefined
      });
    } else if (
      status === 'Bay Assigned (In Progress)' ||
      status === 'Awaiting Spares' ||
      status === 'Quality Check'
    ) {
      onUpdateBay({
        ...targetBay,
        status: 'Occupied',
        currentJobCardId: jc.id,
        currentVehicleReg: jc.vehicle.registrationNumber
      });
    }
  };

  const buildReadyPickupSmsText = (jc: JobCard) => {
    const workshopName = profile?.name || 'Continental Auto Kraft';
    const workshopPhone = profile?.contactNumber || '+977-1-4378920';
    return `Vehicle Ready for Pickup: ${jc.vehicle.registrationNumber} (${jc.vehicle.brand || jc.vehicle.make || ''} ${jc.vehicle.model}) [${jc.jobCardNumber}] is Ready for Billing & Pickup at ${workshopName}. Customer: ${jc.customerName}. Contact: ${workshopPhone}.`;
  };

  const handleStageChange = (newStatus: JobCardStatus) => {
    if (isLocked) return;
    const updated: JobCard = { ...currentJobCard, status: newStatus };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    syncBayForStatus(updated, newStatus);
  };

  // Auto-update workflow stage to Ready for Billing -> release bay -> THEN ONLY send Vehicle Ready SMS -> open Tax Invoice modal
  const handleProceedToTaxInvoice = (onlyUnbilled: boolean) => {
    const targetStatus: JobCardStatus =
      currentJobCard.status === 'Delivered' ? 'Delivered' : 'Ready for Billing';
    const updated: JobCard = {
      ...currentJobCard,
      status: targetStatus,
      readyNotificationSentAt: new Date().toISOString(),
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    syncBayForStatus(updated, targetStatus);
    setReadyBannerMsg(
      `Stage updated to Ready for Billing, ${updated.bayNumber || 'assigned bay'} released, and Vehicle Ready SMS triggered for ${updated.customerName}.`
    );
    onTriggerReadyNotification?.(updated);
    setInvoiceOnlyUnbilled(onlyUnbilled);
    setIsGenerateInvoiceOpen(true);
  };

  const handleToggleServiceBillingType = (newType: 'Paid Service' | 'Free Service') => {
    if (isLocked) return;
    setEditServiceBillingType(newType);
    // Re-price ONLY unbilled Periodic Maintenance Service (PMS) - 45-Point Checkup rows; keep all other labor charges unchanged
    const updatedLaborItems = (currentJobCard.laborItems || []).map((item) => {
      if (billedLaborSet.has(item.id)) return item;
      if (!isFreeServicePmsLabor(item.code, item.description)) return item;
      if (newType === 'Free Service') {
        return { ...item, ratePerHour: 0, totalAmount: 0 };
      }
      const catalogMatch = (servicePrices || []).find(
        (s) => s.code === item.code || isFreeServicePmsLabor(s.code, s.name)
      );
      const standardRate = catalogMatch?.fixedPrice ?? catalogMatch?.baseLaborRate ?? 2500;
      return { ...item, ratePerHour: standardRate, totalAmount: standardRate };
    });

    const updated: JobCard = {
      ...currentJobCard,
      serviceBillingType: newType,
      laborItems: updatedLaborItems,
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleLockJobCard = () => {
    if (isLocked) return;
    const confirmLock = window.confirm(
      'Seal this Job Card?\nOnce sealed, only users with the Administrator (Admin) role can re-open it for adjustments.'
    );
    if (!confirmLock) return;

    const lockHash = `NPL-JC-${currentJobCard.jobCardNumber}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const updated: JobCard = {
      ...currentJobCard,
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: currentUser.name,
      lockHash
    };

    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleAdminReopenJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    // Preserve already-billed labor & part IDs so previously Paid invoices stay untouched
    // and any newly added items after re-opening generate a separate supplementary Tax Invoice
    const existingBilledLaborIds =
      currentJobCard.billedLaborIds && currentJobCard.billedLaborIds.length > 0
        ? currentJobCard.billedLaborIds
        : jcRegularInvoices.length > 0
          ? (currentJobCard.laborItems || []).map((l) => l.id)
          : [];
    const existingBilledPartIds =
      currentJobCard.billedPartIds && currentJobCard.billedPartIds.length > 0
        ? currentJobCard.billedPartIds
        : jcRegularInvoices.length > 0
          ? (currentJobCard.partsRequested || []).map((p) => p.id)
          : [];

    const updated: JobCard = {
      ...currentJobCard,
      isLocked: false,
      reopenedByAdmin: true,
      reopenedBy: currentUser.name,
      reopenedAt: new Date().toISOString(),
      reopenReason: reopenReason.trim() || 'Administrative adjustment authorized',
      status: currentJobCard.status === 'Delivered' ? 'Ready for Billing' : currentJobCard.status,
      billedLaborIds: existingBilledLaborIds,
      billedPartIds: existingBilledPartIds
    };

    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    setIsReopenModalOpen(false);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    const updated: JobCard = {
      ...currentJobCard,
      customerName: editCustomerName.trim() || currentJobCard.customerName,
      customerPhone: editCustomerPhone.trim() || currentJobCard.customerPhone,
      arrivalDate: editArrivalDate,
      entryTime: editEntryTime,
      serviceBillingType: editServiceBillingType,
      couponNumber: editCouponNumber.trim() || undefined,
      couponNotes: editCouponNotes.trim() || undefined,
      vehicle: {
        ...currentJobCard.vehicle,
        registrationNumber: editReg.trim().toUpperCase() || currentJobCard.vehicle.registrationNumber,
        brand: editBrand.trim() || currentJobCard.vehicle.brand,
        make: editBrand.trim() || currentJobCard.vehicle.make,
        model: editModel.trim() || currentJobCard.vehicle.model,
        vinNumber: editVin.trim().toUpperCase(),
        chassisNumber: editVin.trim().toUpperCase(),
        engineNumber: editEngineNo.trim().toUpperCase(),
        odometerReading: editOdo
      },
      inspection: {
        ...currentJobCard.inspection,
        fuelLevel: editFuel,
        odometer: editOdo,
        generalRemarks: editRemarks
      }
    };

    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    setIsEditingInspection(false);
  };

  const handleSearchLabor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLaborSearchTerm(laborSearchInput.trim());
    setHasSearchedLabor(true);
  };

  const handleAddLaborFromResult = (srv: ServicePriceItem) => {
    if (isLocked) return;
    const tech = technicians.find((t) => t.id === newLaborTechId);
    // Free Service waives labor ONLY for Periodic Maintenance Service (PMS) - 45-Point Checkup
    const isWaivedPms = isFreeService && isFreeServicePmsLabor(srv.code, srv.name);
    const charge = isWaivedPms ? 0 : (srv.fixedPrice ?? srv.baseLaborRate);
    const newItem: JobCardLaborItem = {
      id: `LBR-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      code: srv.code,
      description: srv.name,
      hours: 1,
      hoursEstimated: 1,
      ratePerHour: charge,
      vatRate: 13,
      totalAmount: charge,
      technicianId: newLaborTechId,
      technicianName: tech?.name,
      status: 'In Progress'
    };

    const nextStatus: JobCardStatus =
      currentJobCard.status === 'Vehicle Check-in' || currentJobCard.status === 'Appointment / Intake'
        ? 'Bay Assigned (In Progress)'
        : currentJobCard.status;

    const updated: JobCard = {
      ...currentJobCard,
      status: nextStatus,
      laborItems: [...(currentJobCard.laborItems || []), newItem]
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    if (nextStatus !== currentJobCard.status) {
      syncBayForStatus(updated, nextStatus);
    }
  };

  const handleAddCustomLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !customLaborDesc.trim()) return;
    const tech = technicians.find((t) => t.id === newLaborTechId);
    const isWaivedPms = isFreeService && isFreeServicePmsLabor(customLaborCode, customLaborDesc);
    const charge = isWaivedPms ? 0 : Math.max(0, Number(customLaborRate) || 0);
    const newItem: JobCardLaborItem = {
      id: `LBR-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      code: customLaborCode.trim().toUpperCase() || 'SRV-CUS',
      description: customLaborDesc.trim(),
      hours: 1,
      hoursEstimated: 1,
      ratePerHour: charge,
      vatRate: 13,
      totalAmount: charge,
      technicianId: newLaborTechId,
      technicianName: tech?.name,
      status: 'In Progress'
    };

    const nextStatus: JobCardStatus =
      currentJobCard.status === 'Vehicle Check-in' || currentJobCard.status === 'Appointment / Intake'
        ? 'Bay Assigned (In Progress)'
        : currentJobCard.status;

    const updated: JobCard = {
      ...currentJobCard,
      status: nextStatus,
      laborItems: [...(currentJobCard.laborItems || []), newItem]
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    if (nextStatus !== currentJobCard.status) {
      syncBayForStatus(updated, nextStatus);
    }
    setCustomLaborCode('');
    setCustomLaborDesc('');
    setCustomLaborRate(0);
    setShowCustomLaborForm(false);
  };

  const handleRemoveLabor = (id: string) => {
    if (isLocked || billedLaborSet.has(id)) return;
    const updated = {
      ...currentJobCard,
      laborItems: (currentJobCard.laborItems || []).filter((l) => l.id !== id)
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleSearchParts = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPartSearchTerm(partSearchInput.trim());
    setHasSearchedParts(true);
  };

  const handleIssuePartFromResult = (part: SparePart) => {
    if (isLocked) return;
    const qty = Math.max(1, partQtyById[part.id] || 1);
    if (part.currentStock < qty) return;

    // 1. Deduct requested quantity from Spare Parts Master
    const updatedStock = Math.max(0, part.currentStock - qty);
    if (onUpdatePart) {
      onUpdatePart({
        ...part,
        currentStock: updatedStock
      });
    }

    // 2. Add issued part to Job Card
    const newItem: JobCardPartItem = {
      id: `JCP-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      partId: part.id,
      partNumber: part.partNumber,
      name: part.name,
      partName: part.name,
      quantity: qty,
      unitPrice: part.sellingPrice,
      totalAmount: part.sellingPrice * qty,
      vatRate: 13,
      discount: 0,
      isCoveredByInsurance: false,
      requisitionStatus: 'Issued'
    };

    // 3. Advance status smoothly as parts are issued (SMS & Ready for Billing trigger ONLY on Proceed to IRD Tax Invoice)
    const nextStatus: JobCardStatus =
      currentJobCard.status === 'Vehicle Check-in' ||
      currentJobCard.status === 'Appointment / Intake' ||
      currentJobCard.status === 'Awaiting Spares'
        ? 'Quality Check'
        : currentJobCard.status;

    const updated: JobCard = {
      ...currentJobCard,
      status: nextStatus,
      partsRequested: [...(currentJobCard.partsRequested || []), newItem]
    };

    // 4. Sync Workshop Bay status automatically with updated work progress
    syncBayForStatus(updated, nextStatus);

    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    setPartQtyById((prev) => ({ ...prev, [part.id]: 1 }));
  };

  const handleRemovePart = (id: string) => {
    if (isLocked || billedPartSet.has(id)) return;
    const removedItem = (currentJobCard.partsRequested || []).find((p) => p.id === id);
    if (removedItem && onUpdatePart) {
      const partToRestock = availableParts.find(
        (p) => p.id === removedItem.partId || p.partNumber === removedItem.partNumber
      );
      if (partToRestock) {
        onUpdatePart({
          ...partToRestock,
          currentStock: partToRestock.currentStock + removedItem.quantity
        });
      }
    }

    const updated = {
      ...currentJobCard,
      partsRequested: (currentJobCard.partsRequested || []).filter((p) => p.id !== id)
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleOpenCreditNoteModal = (inv: Invoice) => {
    setCreditNoteTarget(inv);
    setCnTaxable(Math.abs(Number(inv.taxableAmount ?? inv.subTotal ?? 0)));
    setCnReason(`Billing adjustment / return against ${inv.invoiceNumber}`);
    setCnMethod('Cash');
  };

  const handleSubmitCreditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteTarget || !onCreateCreditNote) return;
    const maxTaxable = Math.abs(Number(creditNoteTarget.taxableAmount ?? creditNoteTarget.subTotal ?? 0));
    const clean = round2(Math.min(Math.max(0, cnTaxable), maxTaxable));
    if (clean <= 0 || !cnReason.trim()) return;
    onCreateCreditNote(creditNoteTarget, clean, cnReason.trim(), cnMethod);
    setCnSuccessMsg(`Credit Note issued against Invoice ${creditNoteTarget.invoiceNumber} (Taxable Rs. ${formatAccountingNPR(clean)} + 13% VAT).`);
    setCreditNoteTarget(null);
  };

  const totalLabor = (currentJobCard.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
  const totalParts = (currentJobCard.partsRequested || []).reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const subTotal = totalLabor + totalParts;
  const estimatedVat = subTotal * 0.13;
  const grandTotal = subTotal + estimatedVat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Job Card: {currentJobCard.jobCardNumber}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    isFreeService
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                      : 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                  }`}
                >
                  {isFreeService ? 'Free Service' : 'Paid Service'}
                </span>
                {isLocked ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>LOCKED &amp; IMMUTABLE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {currentJobCard.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {currentJobCard.vehicle.registrationNumber} • {currentJobCard.vehicle.brand} {currentJobCard.vehicle.model} • {currentJobCard.customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
              title="Print standard A4 Job Card & Estimate"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Job Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Immutability / Re-open Seal Banner */}
        {isLocked ? (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                <strong>Job Card Closed & Locked:</strong> Line items and inspection are sealed.
                {isAdmin ? ' As Administrator, you have authorization to re-open this card for editing.' : ' Only an Admin can re-open it.'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Hash: {currentJobCard.lockHash || 'SEALED-2081-NPL'}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setIsReopenModalOpen(true)}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-sm transition"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Re-Open Job Card (Admin)</span>
                </button>
              )}
            </div>
          </div>
        ) : currentJobCard.reopenedByAdmin ? (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Re-Opened by Admin ({currentJobCard.reopenedBy} on {currentJobCard.reopenedAt ? new Date(currentJobCard.reopenedAt).toLocaleDateString() : 'Today'}):</strong> {currentJobCard.reopenReason || 'Authorized for modifications.'} Editable mode active.
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
              UNLOCKED BY ADMIN
            </span>
          </div>
        ) : null}

        {/* Sub Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-2 bg-slate-50 text-xs font-bold">
          <div className="flex space-x-2">
            {[
              { id: 'inspection', label: 'Vehicle & Inspection' },
              { id: 'labor', label: `Labor (${(currentJobCard.laborItems || []).length})` },
              { id: 'parts', label: `Parts (${(currentJobCard.partsRequested || []).length})` },
              { id: 'status', label: 'Bay & Status Lifecycle' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {isLocked && isAdmin && (
              <button
                onClick={() => setIsReopenModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Re-Open (Admin)</span>
              </button>
            )}
            {!isLocked && (
              <button
                onClick={handleLockJobCard}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                title="Locks this job card so other users cannot edit it. Admin can re-open if needed."
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Seal & Lock Job Card</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Inline Ready-for-Billing / Owner SMS Dispatch Banner */}
          {readyBannerMsg && (
            <div className="p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5 text-[#14532D]">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs">{readyBannerMsg}</p>
                  <p className="text-[11px] text-[#166534] mt-0.5">
                    Pickup notification logged. Send instant SMS or WhatsApp to the vehicle owner or business owner:
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                <a
                  href={`sms:${(currentJobCard.customerPhone || '').replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                  className="px-2.5 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
                >
                  <Send className="w-3 h-3" />
                  <span>SMS Customer</span>
                </a>
                {businessOwnerPhone && (
                  <a
                    href={`sms:${businessOwnerPhone.replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                    className="px-2.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
                  >
                    <Phone className="w-3 h-3" />
                    <span>SMS Owner</span>
                  </a>
                )}
                <a
                  href={`https://wa.me/${(currentJobCard.customerPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setReadyBannerMsg(null)}
                  className="p-1 text-[#166534] hover:text-[#14532D]"
                  aria-label="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {cnSuccessMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900">
              <span className="font-semibold">{cnSuccessMsg}</span>
              <button type="button" onClick={() => setCnSuccessMsg(null)} className="text-rose-600 hover:text-rose-800">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: INSPECTION */}
          {activeTab === 'inspection' && (
            <div className="space-y-4">
              {/* Workshop Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl shadow-xs">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>Vehicle & Inspection Quick Operations</span>
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    View comprehensive multi-visit repair history or formulate accident repair quotations for customer & insurance surveyor appraisal.
                  </p>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsServiceHistoryOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <History className="w-4 h-4" />
                    <span>Display Service History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAccidentQuotationOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Create Accident Quotation</span>
                  </button>
                </div>
              </div>

              {/* Primary Intake Specs Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Car className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-900 text-sm">Vehicle Check-in & Technical Specs</span>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={() => setIsEditingInspection(!isEditingInspection)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isEditingInspection ? 'Cancel Edit' : 'Edit All Details'}</span>
                    </button>
                  )}
                </div>

                {isEditingInspection && !isLocked ? (
                  <form onSubmit={handleSaveInspection} className="space-y-3 bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Customer Full Name *</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={e => setEditCustomerName(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Customer Phone *</label>
                        <input
                          type="text"
                          value={editCustomerPhone}
                          onChange={e => setEditCustomerPhone(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Registration Number *</label>
                        <input
                          type="text"
                          value={editReg}
                          onChange={e => setEditReg(e.target.value.toUpperCase())}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Make / Brand *</label>
                        <input
                          type="text"
                          value={editBrand}
                          onChange={e => setEditBrand(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Vehicle Model *</label>
                        <input
                          type="text"
                          value={editModel}
                          onChange={e => setEditModel(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <DualCalendarPicker
                          label="Arrival Date (B.S. & A.D. Synced) *"
                          valueAd={editArrivalDate}
                          onChangeAd={(ad) => setEditArrivalDate(ad)}
                          compact
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Service Billing Mode *</label>
                        <select
                          value={editServiceBillingType}
                          onChange={(e) => setEditServiceBillingType(e.target.value as 'Paid Service' | 'Free Service')}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-[#0EA5E9]"
                        >
                          <option value="Paid Service">Paid Service</option>
                          <option value="Free Service">Free Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Entry Time *</label>
                        <input
                          type="text"
                          value={editEntryTime}
                          onChange={e => setEditEntryTime(e.target.value)}
                          placeholder="09:30 AM"
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Odometer Reading (km) *</label>
                        <input
                          type="number"
                          value={editOdo}
                          onChange={e => setEditOdo(parseInt(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">VIN / Chassis Number *</label>
                        <input
                          type="text"
                          value={editVin}
                          onChange={e => setEditVin(e.target.value.toUpperCase())}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Engine Number *</label>
                        <input
                          type="text"
                          value={editEngineNo}
                          onChange={e => setEditEngineNo(e.target.value.toUpperCase())}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Fuel Level (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editFuel}
                          onChange={e => setEditFuel(parseInt(e.target.value) || 0)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Coupon / Promo Code</label>
                        <input
                          type="text"
                          value={editCouponNumber}
                          onChange={e => setEditCouponNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. MONSOON2026, FESTIVE10"
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Coupon Notes / Discount Terms</label>
                        <textarea
                          rows={2}
                          value={editCouponNotes}
                          onChange={e => setEditCouponNotes(e.target.value)}
                          placeholder="Optional terms for applied coupon (e.g. 10% off labor, free wash voucher)"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Customer Reported Complaints / Scope</label>
                        <textarea
                          rows={2}
                          value={editRemarks}
                          onChange={e => setEditRemarks(e.target.value)}
                          placeholder="Specific sounds, symptoms, or diagnostic scopes requested"
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsEditingInspection(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save All Details</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Customer</span>
                      <span className="font-bold text-slate-800">{currentJobCard.customerName}</span>
                      <span className="text-slate-500 block font-mono">{currentJobCard.customerPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Vehicle & Reg</span>
                      <span className="font-mono font-bold text-slate-800">{currentJobCard.vehicle.registrationNumber}</span>
                      <span className="text-slate-500 block">{currentJobCard.vehicle.brand || currentJobCard.vehicle.make} {currentJobCard.vehicle.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Odometer & Fuel</span>
                      <span className="font-bold text-slate-800 font-mono">{(currentJobCard.vehicle?.odometerReading || 0).toLocaleString()} km</span>
                      <span className="text-slate-500 block">Fuel Level: {currentJobCard.inspection?.fuelLevel ?? 50}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Arrival &amp; Entry</span>
                      <span className="font-bold text-slate-800">
                        {currentJobCard.arrivalDate || currentJobCard.createdAt.slice(0, 10)} (AD)
                      </span>
                      <span className="text-[#0284C7] block font-mono text-[10px] font-semibold">
                        B.S. {adToBs(currentJobCard.arrivalDate || currentJobCard.createdAt.slice(0, 10)).formatted} · {currentJobCard.entryTime || '09:30 AM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">VIN / Chassis #</span>
                      <span className="font-mono font-bold text-slate-800">{currentJobCard.vehicle.vinNumber || currentJobCard.vehicle.chassisNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Engine Number</span>
                      <span className="font-mono font-bold text-slate-800">{currentJobCard.vehicle.engineNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Bay &amp; Tech</span>
                      <span className="font-bold text-[#0284C7]">{currentJobCard.bayNumber}</span>
                      <span className="text-slate-500 block">{currentJobCard.assignedTechnicianName || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Service Type &amp; Mode</span>
                      <span className="font-bold text-slate-800 block">{currentJobCard.serviceType}</span>
                      {!isLocked ? (
                        <div className="mt-1 inline-flex rounded border border-[#E2E8F0] overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleToggleServiceBillingType('Paid Service')}
                            className={`px-2 py-0.5 text-[10px] font-bold transition ${
                              !isFreeService ? 'bg-[#0F3D5E] text-white' : 'bg-white text-[#64748B] hover:bg-[#F1F5F9]'
                            }`}
                          >
                            Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleServiceBillingType('Free Service')}
                            className={`px-2 py-0.5 text-[10px] font-bold transition ${
                              isFreeService ? 'bg-[#16A34A] text-white' : 'bg-white text-[#64748B] hover:bg-[#F1F5F9]'
                            }`}
                          >
                            Free
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${isFreeService ? 'bg-emerald-50 text-[#16A34A]' : 'bg-sky-50 text-[#0284C7]'}`}>
                          {currentJobCard.serviceBillingType || 'Paid Service'}
                        </span>
                      )}
                    </div>
                    {currentJobCard.couponNumber && (
                      <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center space-x-1">
                          <Tag className="w-3 h-3 text-amber-600" />
                          <span>Applied Coupon: {currentJobCard.couponNumber}</span>
                        </span>
                        {currentJobCard.couponNotes && (
                          <p className="text-[11px] text-amber-900 mt-0.5">{currentJobCard.couponNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Service History & Next Service Due Card */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <History className="w-4 h-4 text-indigo-700" />
                  <h4 className="font-bold text-indigo-950 text-xs uppercase tracking-wide">Vehicle Service History & Next Due Status</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Service Performed</span>
                    <p className="font-bold text-slate-800">
                      {currentJobCard.lastServiceDate ? `${currentJobCard.lastServiceDate} (${(currentJobCard.lastServiceKm || 0).toLocaleString()} km)` : 'First Recorded Intake at Workshop'}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {currentJobCard.lastServiceSummary || 'Standard initial inspection and baseline service.'}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Next Service Target</span>
                    <p className="font-bold text-indigo-900">
                      {currentJobCard.nextServiceDueDate ? `${currentJobCard.nextServiceDueDate} / ${(currentJobCard.nextServiceDueKm || 0).toLocaleString()} km` : '4 Months (120 Days) / 5,000 km after completion'}
                    </p>
                    <p className="text-emerald-700 text-[11px] font-semibold mt-0.5">
                      Recommended: Scheduled PMS with Synthetic Oil & Brake Inspection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Complaints */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 mb-2">Customer Reported Complaints & Scope of Work:</h4>
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 font-medium leading-relaxed">
                  {currentJobCard.inspection?.generalRemarks || (currentJobCard.inspection?.customerVoiceComplaints || []).join('. ') || 'Standard maintenance service, engine oil replacement, brake inspection, suspension check, washing and interior vacuum.'}
                </div>
              </div>

              {/* Inventory belongings checklist */}
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 mb-2">Vehicle Belongings Checklist on Intake:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Spare Wheel Present</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Tool Kit & Jack</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Boot Mats & Stereo Face</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Blue Book / Registration Docs</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LABOR ITEMS */}
          {activeTab === 'labor' && (
            <div className="space-y-4">
              {!isLocked && (
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#0F172A] flex items-center space-x-1.5">
                      <Wrench className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>Search Labor Tasks &amp; Fixed Price Book</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      {isFreeService && (
                        <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Free Service: Only PMS 45-Point Waived (Other Labor Billable)
                        </span>
                      )}
                      <select
                        value={newLaborTechId}
                        onChange={(e) => setNewLaborTechId(e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-[11px] font-medium text-[#0F172A]"
                        title="Assigned Technician for added labor tasks"
                      >
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            Tech: {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search Input + Explicit Search Button */}
                  <form onSubmit={handleSearchLabor} className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={laborSearchInput}
                        onChange={(e) => setLaborSearchInput(e.target.value)}
                        placeholder="Enter Labor Task Code, Service Name, or Category (e.g. SRV-GEN-01, Brake, AC)..."
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9] outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLaborSearchInput('');
                        setLaborSearchTerm('');
                        setHasSearchedLabor(true);
                      }}
                      className="px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-lg font-semibold text-xs transition"
                    >
                      Show All ({servicePrices.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomLaborForm(!showCustomLaborForm)}
                      className="px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#0F3D5E] border border-[#E2E8F0] rounded-lg font-semibold text-xs transition"
                    >
                      {showCustomLaborForm ? 'Close Custom' : '+ Custom Task'}
                    </button>
                  </form>

                  {/* Optional Custom Labor Task Form */}
                  {showCustomLaborForm && (
                    <form onSubmit={handleAddCustomLabor} className="p-3 bg-white rounded-lg border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={customLaborCode}
                        onChange={(e) => setCustomLaborCode(e.target.value.toUpperCase())}
                        placeholder="Task Code (e.g. SRV-99)"
                        className="border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 font-mono text-xs uppercase outline-none focus:ring-1 focus:ring-[#0EA5E9]"
                      />
                      <input
                        type="text"
                        value={customLaborDesc}
                        onChange={(e) => setCustomLaborDesc(e.target.value)}
                        placeholder="Custom Labor Description *"
                        className="sm:col-span-2 border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#0EA5E9]"
                        required
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={customLaborRate}
                          onChange={(e) => setCustomLaborRate(parseFloat(e.target.value) || 0)}
                          placeholder="NPR"
                          className="w-24 border border-[#E2E8F0] rounded-lg px-2 py-1.5 font-mono font-bold text-xs outline-none"
                        />
                        <button
                          type="submit"
                          className="flex-1 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg font-bold text-xs px-2.5 py-1.5"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Search Results Displayed Below with Add Button */}
                  {hasSearchedLabor && (
                    <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
                      <div className="px-3 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0F172A]">
                          Search Results ({laborSearchResults.length} labor tasks)
                        </span>
                        <button
                          type="button"
                          onClick={() => setHasSearchedLabor(false)}
                          className="text-[#64748B] hover:text-[#0F172A] font-semibold"
                        >
                          Clear Results
                        </button>
                      </div>
                      {laborSearchResults.length === 0 ? (
                        <div className="p-4 text-center text-[#64748B] text-xs">
                          No labor tasks found matching "{laborSearchTerm}". Try another code/name or click "+ Custom Task".
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto divide-y divide-[#E2E8F0]">
                          {laborSearchResults.map((srv) => {
                            const standardPrice = srv.fixedPrice ?? srv.baseLaborRate;
                            const isWaivedPms = isFreeService && isFreeServicePmsLabor(srv.code, srv.name);
                            const effectivePrice = isWaivedPms ? 0 : standardPrice;
                            return (
                              <div
                                key={srv.id}
                                className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-[#F8FAFC] transition"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-sky-50 text-[#0284C7] border border-sky-200">
                                      {srv.code}
                                    </span>
                                    <span className="font-bold text-[#0F172A] text-xs">{srv.name}</span>
                                  </div>
                                  <span className="text-[10px] text-[#64748B]">{srv.category}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-right">
                                    <span className="font-mono font-bold text-[#0F172A] block">
                                      Rs. {effectivePrice.toLocaleString()}
                                    </span>
                                    {isWaivedPms ? (
                                      <span className="text-[9px] text-[#16A34A] font-semibold">
                                        Free PMS Waiver <span className="line-through text-[#64748B]">Rs. {standardPrice.toLocaleString()}</span>
                                      </span>
                                    ) : isFreeService ? (
                                      <span className="text-[9px] text-[#64748B] font-medium">Billable Labor</span>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleAddLaborFromResult(srv)}
                                    className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold text-xs flex items-center space-x-1 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Assigned Labor Table */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-b border-[#E2E8F0]">
                      <th className="p-3">Task Code</th>
                      <th className="p-3">Labor Task Name</th>
                      <th className="p-3">Assigned Tech</th>
                      <th className="p-3 text-right">Fixed Price (NPR)</th>
                      {!isLocked && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {(currentJobCard.laborItems || []).length === 0 ? (
                      <tr>
                        <td colSpan={isLocked ? 4 : 5} className="p-6 text-center text-[#64748B]">
                          No labor tasks added yet. Search and add labor tasks from the price book above.
                        </td>
                      </tr>
                    ) : (
                      (currentJobCard.laborItems || []).map((l) => {
                        const isItemBilled = billedLaborSet.has(l.id);
                        return (
                          <tr key={l.id}>
                            <td className="p-3 font-mono font-bold text-[#0284C7]">{l.code || 'SRV'}</td>
                            <td className="p-3 font-semibold text-[#0F172A]">
                              <span>{l.description}</span>
                              {isItemBilled && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                                  Already Billed
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-[#64748B]">{l.technicianName || 'Workshop Tech'}</td>
                            <td className="p-3 text-right font-mono font-bold text-[#0F172A]">
                              Rs. {(l.totalAmount ?? l.ratePerHour ?? 0).toLocaleString()}
                            </td>
                            {!isLocked && (
                              <td className="p-3 text-center">
                                {isItemBilled ? (
                                  <span className="text-[10px] text-[#64748B] font-semibold">Locked</span>
                                ) : (
                                  <button
                                    onClick={() => handleRemoveLabor(l.id)}
                                    className="text-[#64748B] hover:text-[#DC2626] p-1"
                                    title="Remove unbilled labor task"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SPARE PARTS REQUISITION */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              {!isLocked && (
                <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#0F172A] flex items-center space-x-1.5">
                      <Package className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>Search Spare Parts by SKU, Part Number, or Name</span>
                    </span>
                    <span className="text-[10px] text-[#0284C7] bg-sky-50 font-bold px-2 py-0.5 rounded border border-sky-200">
                      Issuing Parts Auto-Deducts Spare Parts Master Stock
                    </span>
                  </div>

                  {/* Search Area + Explicit Search Button */}
                  <form onSubmit={handleSearchParts} className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={partSearchInput}
                        onChange={(e) => setPartSearchInput(e.target.value)}
                        placeholder="Enter SKU, OEM Part Number, Barcode, or Part Name (e.g. HYU-FLT-01, Brake Pad)..."
                        className="w-full bg-white border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs font-medium text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9] outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPartSearchInput('');
                        setPartSearchTerm('');
                        setHasSearchedParts(true);
                      }}
                      className="px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-lg font-semibold text-xs transition"
                    >
                      Show All ({availableParts.length})
                    </button>
                  </form>

                  {/* Search Results Displayed Below with Qty & Add Button */}
                  {hasSearchedParts && (
                    <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
                      <div className="px-3 py-2 bg-[#F1F5F9] border-b border-[#E2E8F0] flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#0F172A]">
                          Search Results ({partSearchResults.length} spare parts)
                        </span>
                        <button
                          type="button"
                          onClick={() => setHasSearchedParts(false)}
                          className="text-[#64748B] hover:text-[#0F172A] font-semibold"
                        >
                          Clear Results
                        </button>
                      </div>
                      {partSearchResults.length === 0 ? (
                        <div className="p-4 text-center text-[#64748B] text-xs">
                          No spare parts found matching "{partSearchTerm}". Check SKU or Part Number in Spare Parts Master.
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto divide-y divide-[#E2E8F0]">
                          {partSearchResults.map((part) => {
                            const rowQty = partQtyById[part.id] || 1;
                            const outOfStock = part.currentStock <= 0 || part.currentStock < rowQty;
                            return (
                              <div
                                key={part.id}
                                className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 hover:bg-[#F8FAFC] transition"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-[#0284C7] border border-sky-200">
                                      SKU: {part.sku}
                                    </span>
                                    <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#0F172A]">
                                      #{part.partNumber}
                                    </span>
                                    <span className="font-bold text-[#0F172A] text-xs">{part.name}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#64748B]">
                                    <span>Rack: {part.rackLocation}</span>
                                    <span>·</span>
                                    <span
                                      className={`font-bold ${
                                        part.currentStock > 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                      }`}
                                    >
                                      Stock: {part.currentStock} {part.unit}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-[#0F172A] text-xs">
                                    Rs. {part.sellingPrice.toLocaleString()}
                                  </span>
                                  <input
                                    type="number"
                                    min="1"
                                    max={Math.max(1, part.currentStock)}
                                    value={rowQty}
                                    onChange={(e) =>
                                      setPartQtyById((prev) => ({
                                        ...prev,
                                        [part.id]: Math.max(1, parseInt(e.target.value) || 1)
                                      }))
                                    }
                                    className="w-14 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1.5 font-mono font-bold text-xs text-center"
                                    title="Quantity to issue"
                                  />
                                  <button
                                    type="button"
                                    disabled={outOfStock}
                                    onClick={() => handleIssuePartFromResult(part)}
                                    className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center space-x-1 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Issued Parts Table */}
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-b border-[#E2E8F0]">
                      <th className="p-3">SKU / Code</th>
                      <th className="p-3">Part Name</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total (NPR)</th>
                      {!isLocked && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {(currentJobCard.partsRequested || []).length === 0 ? (
                      <tr>
                        <td colSpan={isLocked ? 5 : 6} className="p-6 text-center text-[#64748B]">
                          No spare parts issued yet. Search above and click Add to issue parts &amp; update status to Ready for Billing.
                        </td>
                      </tr>
                    ) : (
                      (currentJobCard.partsRequested || []).map((p) => {
                        const isItemBilled = billedPartSet.has(p.id);
                        return (
                          <tr key={p.id}>
                            <td className="p-3 font-mono font-bold text-[#0284C7]">{p.partNumber}</td>
                            <td className="p-3 font-semibold text-[#0F172A]">
                              <span>{p.partName}</span>
                              {isItemBilled && (
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                                  Already Billed
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-mono">{p.quantity}</td>
                            <td className="p-3 text-right font-mono">Rs. {p.unitPrice.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono font-bold text-[#0F172A]">
                              Rs. {p.totalAmount.toLocaleString()}
                            </td>
                            {!isLocked && (
                              <td className="p-3 text-center">
                                {isItemBilled ? (
                                  <span className="text-[10px] text-[#64748B] font-semibold">Locked</span>
                                ) : (
                                  <button
                                    onClick={() => handleRemovePart(p.id)}
                                    className="text-[#64748B] hover:text-[#DC2626] p-1"
                                    title="Remove unbilled part & restore stock"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BAY & STATUS LIFECYCLE + OWNER READY SMS NOTIFICATION */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-[#0F172A] mb-1">Automatic Bay &amp; Workflow Stage Lifecycle</h4>
                <p className="text-[#64748B] text-xs mb-3">
                  Clicking &ldquo;Proceed to IRD Tax Invoice&rdquo; automatically advances this Job Card to Ready for Billing, releases the assigned workshop bay, and sends the Vehicle Ready SMS to the customer.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAGES.map((st) => {
                    const isCurrent = currentJobCard.status === st;
                    return (
                      <button
                        key={st}
                        disabled={isLocked}
                        onClick={() => handleStageChange(st)}
                        className={`p-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                          isCurrent
                            ? 'bg-[#0F3D5E] text-white border-[#0F3D5E]'
                            : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                        } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <span>{st}</span>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-[#0EA5E9]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#0F172A] block">Current Bay Allocation</span>
                  <p className="text-[#0284C7] font-semibold mt-0.5">{currentJobCard.bayNumber || 'Unassigned'}</p>
                  <p className="text-[#64748B] text-[11px]">
                    Lead Technician: {currentJobCard.assignedTechnicianName || 'Workshop Lead'}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                    currentJobCard.status === 'Ready for Billing' || currentJobCard.status === 'Delivered'
                      ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                      : 'bg-sky-50 text-[#0284C7] border-sky-200'
                  }`}
                >
                  Bay Status:{' '}
                  {currentJobCard.status === 'Ready for Billing' || currentJobCard.status === 'Delivered'
                    ? 'Available (Released)'
                    : 'Occupied (Active Service)'}
                </span>
              </div>

              {/* Vehicle Ready & Pickup SMS / Message Dispatch Panel */}
              <div className="p-4 bg-white border border-[#E2E8F0] rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4 text-[#0EA5E9]" />
                    <h5 className="font-bold text-[#0F172A]">Vehicle Ready &amp; Pickup SMS Notification</h5>
                  </div>
                  {currentJobCard.readyNotificationSentAt && (
                    <span className="text-[10px] font-semibold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Last Notified: {new Date(currentJobCard.readyNotificationSentAt).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Vehicle Owner / Customer Phone
                    </label>
                    <input
                      type="text"
                      value={currentJobCard.customerPhone}
                      readOnly
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 font-mono text-xs text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">
                      Business Owner Number (SMS Alert)
                    </label>
                    <input
                      type="text"
                      value={businessOwnerPhone}
                      onChange={(e) => setBusinessOwnerPhone(e.target.value)}
                      placeholder="+977-98..."
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 font-mono text-xs text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9] outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] text-[#0F172A]">
                  <span className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">SMS Message Preview</span>
                  {buildReadyPickupSmsText(currentJobCard)}
                </div>

                {smsSentConfirmation && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-semibold text-[#16A34A]">
                    {smsSentConfirmation}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerReadyNotification?.(currentJobCard);
                      setSmsSentConfirmation(
                        `Ready-for-pickup notification logged for ${currentJobCard.customerPhone} and Business Owner (${businessOwnerPhone || 'Workshop Main'}).`
                      );
                    }}
                    className="px-3.5 py-2 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Ready Notification</span>
                  </button>
                  <a
                    href={`sms:${(currentJobCard.customerPhone || '').replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                    className="px-3 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Open SMS (Customer)</span>
                  </a>
                  {businessOwnerPhone && (
                    <a
                      href={`sms:${businessOwnerPhone.replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                      className="px-3 py-2 bg-white hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Open SMS (Business Owner)</span>
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${(currentJobCard.customerPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(buildReadyPickupSmsText(currentJobCard))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Owner</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Financial & Action Bar */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <span className="text-[10px] text-[#64748B] font-bold uppercase block">Labor Subtotal</span>
              <span className="font-mono font-bold text-[#0F172A]">Rs. {totalLabor.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] font-bold uppercase block">Spares Subtotal</span>
              <span className="font-mono font-bold text-[#0F172A]">Rs. {totalParts.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#0284C7] font-bold uppercase block">Nepal 13% VAT</span>
              <span className="font-mono font-bold text-[#0284C7]">Rs. {Math.round(estimatedVat).toLocaleString()}</span>
            </div>
            <div className="pl-4 border-l border-[#CBD5E1]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block">Estimated Gross Bill</span>
              <span className="font-mono font-black text-base text-[#0F172A]">
                Rs. {Math.round(grandTotal).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {latestInvoice ? (
              <>
                <div className="text-right hidden sm:block mr-1">
                  <span
                    className={`text-[10px] font-bold uppercase block ${
                      latestInvoice.status === 'Paid' ? 'text-[#16A34A]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {latestInvoice.status === 'Paid' ? 'Paid & Settled Invoice' : `Invoice ${latestInvoice.status}`}
                    {jcRegularInvoices.length > 1 ? ` (${jcRegularInvoices.length} Bills)` : ''}
                  </span>
                  <span className="text-[11px] text-[#64748B] font-mono">
                    #{latestInvoice.invoiceNumber}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onViewInvoice) {
                      onViewInvoice(latestInvoice);
                    }
                  }}
                  className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Invoice ({latestInvoice.invoiceNumber})</span>
                </button>

                {onCreateCreditNote && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreditNoteModal(latestInvoice)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-[#DC2626] border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    title="Issue a Sales Invoice Credit Note (separate from Purchase Orders)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Add Credit Note</span>
                  </button>
                )}

                {hasPaidInvoice && !isLocked && hasUnbilledAdditions && (
                  <button
                    type="button"
                    onClick={() => handleProceedToTaxInvoice(true)}
                    className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    title="Previous paid invoice stays Paid; updates stage to Ready for Billing, sends Ready SMS, and generates a separate new invoice for newly added items"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      Separate Invoice ({unbilledLaborItems.length + unbilledPartItems.length} New Items)
                    </span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleProceedToTaxInvoice(false)}
                className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Proceed to IRD Tax Invoice</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DIRECT SALES INVOICE CREDIT NOTE MODAL (DISTINCT FROM PURCHASE ORDERS) */}
      {creditNoteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-[#E2E8F0] overflow-hidden">
            <div className="bg-[#0F3D5E] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Add Credit Note on Invoice</h4>
                <p className="text-[11px] text-sky-200">
                  Sales Invoice Credit Note (Distinct from Purchase Orders) · Ref #{creditNoteTarget.invoiceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreditNoteTarget(null)}
                className="text-slate-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCreditNote} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between">
                <span className="text-[#64748B]">Original Taxable Value</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  NPR {formatAccountingNPR(Math.abs(Number(creditNoteTarget.taxableAmount ?? creditNoteTarget.subTotal ?? 0)))}
                </span>
              </div>
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Credit Note Taxable Amount (NPR) *</label>
                <input
                  type="number"
                  min="1"
                  max={Math.abs(Number(creditNoteTarget.taxableAmount ?? creditNoteTarget.subTotal ?? 0))}
                  step="0.01"
                  value={cnTaxable}
                  onChange={(e) => setCnTaxable(parseFloat(e.target.value) || 0)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 font-mono font-bold focus:ring-2 focus:ring-[#0EA5E9] outline-none"
                  required
                />
                <p className="text-[10px] text-[#64748B] mt-1">
                  13% VAT Reversal: NPR {formatAccountingNPR(round2(cnTaxable * 0.13))} · Gross Credit: NPR {formatAccountingNPR(round2(cnTaxable * 1.13))}
                </p>
              </div>
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Refund / Adjustment Mode</label>
                <select
                  value={cnMethod}
                  onChange={(e) => setCnMethod(e.target.value as NepalPaymentMethod)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 bg-white outline-none"
                >
                  <option value="Cash">Cash Refund</option>
                  <option value="Fonepay">Fonepay</option>
                  <option value="ConnectIPS">ConnectIPS</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="eSewa">eSewa</option>
                  <option value="Khalti">Khalti</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Reason for Credit Note *</label>
                <textarea
                  rows={2}
                  value={cnReason}
                  onChange={(e) => setCnReason(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setCreditNoteTarget(null)}
                  className="px-3.5 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg font-bold"
                >
                  Issue Sales Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN RE-OPEN MODAL */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Unlock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Re-Open Job Card (Admin Override)</h4>
                <p className="text-[11px] text-slate-500">Authorized Administrator: {currentUser.name}</p>
              </div>
            </div>

            <form onSubmit={handleAdminReopenJobCard} className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                As an <strong>Administrator</strong>, you have the permission to unlock this sealed Job Card. All line items, labor, parts, and inspection notes will become editable.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Re-Opening *</label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={e => setReopenReason(e.target.value)}
                  placeholder="e.g., Customer requested additional brake rotor skim; labor hours revised."
                  className="w-full border border-slate-300 rounded-xl p-2.5 outline-none focus:border-amber-500 font-medium"
                  required
                />
              </div>

              {/* Quick reason suggestions */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Audit Justifications:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Additional labor requested by owner',
                    'Parts price or quantity correction',
                    'Supplementary diagnostic finding',
                    'Billing dispute resolution'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReopenReason(preset)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-full border border-slate-200 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReopenModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Confirm Re-Open</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE SERVICE HISTORY MODAL */}
      {isServiceHistoryOpen && (
        <VehicleServiceHistoryModal
          vehicleReg={currentJobCard.vehicle.registrationNumber}
          vehicleChassis={currentJobCard.vehicle.vinNumber || currentJobCard.vehicle.chassisNumber}
          customerName={currentJobCard.customerName}
          customerPhone={currentJobCard.customerPhone}
          jobCards={allJobCards.length > 0 ? allJobCards : [currentJobCard]}
          invoices={invoices}
          gatePasses={gatePasses}
          onClose={() => setIsServiceHistoryOpen(false)}
          onSelectJobCard={(jc) => {
            setIsServiceHistoryOpen(false);
            setCurrentJobCard(jc);
          }}
        />
      )}

      {/* ACCIDENT QUOTATION MODAL */}
      {isAccidentQuotationOpen && (
        <AccidentQuotationModal
          jobCard={currentJobCard}
          availableParts={availableParts}
          profile={profile}
          onClose={() => setIsAccidentQuotationOpen(false)}
          onSaveQuotation={(quotation) => {
            if (onCreateQuotation) {
              onCreateQuotation(quotation);
            }
            setIsAccidentQuotationOpen(false);
          }}
        />
      )}

      {/* PRINT A4 JOB CARD MODAL */}
      {isPrintModalOpen && (
        <PrintJobCardModal
          jobCard={currentJobCard}
          profile={profile}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* GENERATE IRD TAX INVOICE MODAL (INDIVIDUAL OR COMPANY BILLING) */}
      <GenerateTaxInvoiceModal
        isOpen={isGenerateInvoiceOpen}
        jobCard={currentJobCard}
        customer={customers.find(
          (c) =>
            (currentJobCard.customerId && c.id === currentJobCard.customerId) ||
            c.name.trim().toLowerCase() === (currentJobCard.customerName || '').trim().toLowerCase()
        )}
        onlyUnbilledItems={invoiceOnlyUnbilled}
        previousPaidInvoiceNumber={latestInvoice?.status === 'Paid' ? latestInvoice.invoiceNumber : undefined}
        onClose={() => {
          setIsGenerateInvoiceOpen(false);
          setInvoiceOnlyUnbilled(false);
        }}
        onConfirm={(jc, options) => {
          setIsGenerateInvoiceOpen(false);
          setInvoiceOnlyUnbilled(false);
          onConvertToInvoice(jc, { ...options, onlyUnbilledItems: invoiceOnlyUnbilled });
        }}
      />
    </div>
  );
};
