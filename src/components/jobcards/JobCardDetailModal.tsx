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
  PartsQuotation
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
  Tag
} from 'lucide-react';
import { VehicleServiceHistoryModal } from '../common/VehicleServiceHistoryModal';
import { AccidentQuotationModal } from './AccidentQuotationModal';

interface JobCardDetailModalProps {
  jobCard: JobCard;
  availableParts: SparePart[];
  technicians: Technician[];
  currentUser: UserAccount;
  allJobCards?: JobCard[];
  invoices?: Invoice[];
  gatePasses?: GatePass[];
  onClose: () => void;
  onUpdateJobCard: (updated: JobCard) => void;
  onConvertToInvoice: (jc: JobCard) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onCreateQuotation?: (quotation: PartsQuotation) => void;
}

export const JobCardDetailModal: React.FC<JobCardDetailModalProps> = ({
  jobCard,
  availableParts = [],
  technicians = [],
  currentUser,
  allJobCards = [],
  invoices = [],
  gatePasses = [],
  onClose,
  onUpdateJobCard,
  onConvertToInvoice,
  onViewInvoice,
  onCreateQuotation
}) => {
  const [activeTab, setActiveTab] = useState<'inspection' | 'labor' | 'parts' | 'status'>('inspection');
  const [currentJobCard, setCurrentJobCard] = useState<JobCard>(() => ({
    ...jobCard,
    laborItems: jobCard.laborItems || [],
    partsRequested: jobCard.partsRequested || jobCard.partsItems || []
  }));

  // Service History & Accident Quotation modals
  const [isServiceHistoryOpen, setIsServiceHistoryOpen] = useState(false);
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

  // New Labor Item form state
  const [newLaborDesc, setNewLaborDesc] = useState('');
  const [newLaborHours, setNewLaborHours] = useState(1.5);
  const [newLaborRate, setNewLaborRate] = useState(1000);
  const [newLaborTechId, setNewLaborTechId] = useState(technicians[0]?.id || '');

  // New Part Requisition state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [isCoveredByInsurance, setIsCoveredByInsurance] = useState(false);

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

  const handleStageChange = (newStatus: JobCardStatus) => {
    if (isLocked) return;
    const updated = { ...currentJobCard, status: newStatus };
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
    if (!isAdmin) {
      alert('Access Denied: Only users with the Administrator (Admin) role can re-open a locked/closed Job Card.');
      return;
    }

    const updated: JobCard = {
      ...currentJobCard,
      isLocked: false,
      reopenedByAdmin: true,
      reopenedBy: currentUser.name,
      reopenedAt: new Date().toISOString(),
      reopenReason: reopenReason.trim() || 'Administrative adjustment authorized',
      status: currentJobCard.status === 'Delivered' ? 'Ready for Billing' : currentJobCard.status
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

  const handleAddLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !newLaborDesc) return;

    const tech = technicians.find(t => t.id === newLaborTechId);
    const newItem: JobCardLaborItem = {
      id: `LBR-${Date.now()}`,
      description: newLaborDesc,
      hours: newLaborHours,
      hoursEstimated: newLaborHours,
      ratePerHour: newLaborRate,
      vatRate: 13,
      totalAmount: newLaborHours * newLaborRate,
      technicianId: newLaborTechId,
      technicianName: tech?.name,
      status: 'In Progress'
    };

    const updated = {
      ...currentJobCard,
      laborItems: [...currentJobCard.laborItems, newItem]
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    setNewLaborDesc('');
  };

  const handleRemoveLabor = (id: string) => {
    if (isLocked) return;
    const updated = {
      ...currentJobCard,
      laborItems: currentJobCard.laborItems.filter(l => l.id !== id)
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked || !selectedPartId) return;

    const part = availableParts.find(p => p.id === selectedPartId);
    if (!part) return;

    const newItem: JobCardPartItem = {
      id: `JCP-${Date.now()}`,
      partId: part.id,
      partNumber: part.partNumber,
      name: part.name,
      partName: part.name,
      quantity: partQty,
      unitPrice: part.sellingPrice,
      totalAmount: part.sellingPrice * partQty,
      vatRate: 13,
      discount: 0,
      isCoveredByInsurance,
      requisitionStatus: 'Issued'
    };

    const updated = {
      ...currentJobCard,
      partsRequested: [...(currentJobCard.partsRequested || []), newItem]
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
    setSelectedPartId('');
    setPartQty(1);
  };

  const handleRemovePart = (id: string) => {
    if (isLocked) return;
    const updated = {
      ...currentJobCard,
      partsRequested: (currentJobCard.partsRequested || []).filter(p => p.id !== id)
    };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
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
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Job Card: {currentJobCard.jobCardNumber}
                </h3>
                {isLocked ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>LOCKED & IMMUTABLE</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active Editable Card
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {currentJobCard.vehicle.registrationNumber} • {currentJobCard.vehicle.brand} {currentJobCard.vehicle.model} • {currentJobCard.customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
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
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">Arrival Date *</label>
                        <input
                          type="date"
                          value={editArrivalDate}
                          onChange={e => setEditArrivalDate(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
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
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Arrival & Entry</span>
                      <span className="font-bold text-slate-800">{currentJobCard.arrivalDate || currentJobCard.createdAt.slice(0, 10)}</span>
                      <span className="text-slate-500 block">{currentJobCard.entryTime || '09:30 AM'}</span>
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
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Bay & Tech</span>
                      <span className="font-bold text-indigo-700">{currentJobCard.bayNumber}</span>
                      <span className="text-slate-500 block">{currentJobCard.assignedTechnicianName || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Service Type</span>
                      <span className="font-bold text-slate-800">{currentJobCard.serviceType}</span>
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
                <form onSubmit={handleAddLabor} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Labor / Service Description</label>
                    <input
                      value={newLaborDesc}
                      onChange={e => setNewLaborDesc(e.target.value)}
                      placeholder="e.g. Brake Caliper Overhaul & Fluid Bleed"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Std. Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newLaborHours}
                      onChange={e => setNewLaborHours(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm"
                    >
                      + Add Labor Task
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                      <th className="p-3">Labor Task</th>
                      <th className="p-3">Assigned Tech</th>
                      <th className="p-3 text-center">Hours</th>
                      <th className="p-3 text-right">Rate (NPR)</th>
                      <th className="p-3 text-right">Total (NPR)</th>
                      {!isLocked && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentJobCard.laborItems || []).map(l => (
                      <tr key={l.id}>
                        <td className="p-3 font-semibold text-slate-900">{l.description}</td>
                        <td className="p-3 text-slate-600">{l.technicianName || 'Workshop Tech'}</td>
                        <td className="p-3 text-center font-mono">{l.hours} hrs</td>
                        <td className="p-3 text-right font-mono">रु. {l.ratePerHour.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {l.totalAmount.toLocaleString()}</td>
                        {!isLocked && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveLabor(l.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SPARE PARTS REQUISITION */}
          {activeTab === 'parts' && (
            <div className="space-y-4">
              {!isLocked && (
                <form onSubmit={handleAddPart} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Select Spare Part</label>
                    <select
                      value={selectedPartId}
                      onChange={e => setSelectedPartId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium"
                      required
                    >
                      <option value="">-- Choose Stock Part --</option>
                      {(availableParts || []).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} (Stock: {p.currentStock}) - रु. {p.sellingPrice}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={e => setPartQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm"
                    >
                      + Requisition Part
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                      <th className="p-3">SKU / Code</th>
                      <th className="p-3">Part Name</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Total (NPR)</th>
                      {!isLocked && <th className="p-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentJobCard.partsRequested || []).map(p => (
                      <tr key={p.id}>
                        <td className="p-3 font-mono font-bold text-teal-700">{p.partNumber}</td>
                        <td className="p-3 font-semibold text-slate-900">{p.partName}</td>
                        <td className="p-3 text-center font-mono">{p.quantity}</td>
                        <td className="p-3 text-right font-mono">रु. {p.unitPrice.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">रु. {p.totalAmount.toLocaleString()}</td>
                        {!isLocked && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemovePart(p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BAY & STATUS LIFECYCLE */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">Workflow Stage Advancement:</h4>
                <p className="text-slate-500 text-xs mb-3">
                  Progress vehicle through intake, repair execution, inspection, and readiness for billing.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STAGES.map(st => {
                    const isCurrent = currentJobCard.status === st;
                    return (
                      <button
                        key={st}
                        disabled={isLocked}
                        onClick={() => handleStageChange(st)}
                        className={`p-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <span>{st}</span>
                        {isCurrent && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-bold text-slate-800">Current Bay Allocation:</span>
                <p className="text-slate-600">{currentJobCard.bayNumber}</p>
                <p className="text-slate-400 text-[11px]">Assigned to: {currentJobCard.assignedTechnicianName || 'Lead Tech'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Financial & Action Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Labor Subtotal</span>
              <span className="font-mono font-bold text-slate-800">रु. {totalLabor.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Spares Subtotal</span>
              <span className="font-mono font-bold text-slate-800">रु. {totalParts.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-indigo-500 font-bold uppercase block">Nepal 13% VAT</span>
              <span className="font-mono font-bold text-indigo-700">रु. {Math.round(estimatedVat).toLocaleString()}</span>
            </div>
            <div className="pl-4 border-l border-slate-300">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Estimated Gross Bill</span>
              <span className="font-mono font-black text-base text-slate-900">
                रु. {Math.round(grandTotal).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(() => {
              const existingInvoice = (invoices || []).find(
                inv => (inv.jobCardId && inv.jobCardId === currentJobCard.id) ||
                       (inv.jobCardNumber && inv.jobCardNumber === currentJobCard.jobCardNumber) ||
                       (currentJobCard.invoiceId && inv.id === currentJobCard.invoiceId) ||
                       (currentJobCard.invoiceNumber && inv.invoiceNumber === currentJobCard.invoiceNumber)
              );

              if (existingInvoice) {
                return (
                  <div className="flex items-center space-x-2">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase block">1 JC = 1 Bill Enforced</span>
                      <span className="text-[11px] text-slate-500 font-mono">Invoice #{existingInvoice.invoiceNumber}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (onViewInvoice) {
                          onViewInvoice(existingInvoice);
                        } else {
                          onConvertToInvoice(currentJobCard);
                        }
                      }}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900 transition flex items-center space-x-1.5"
                      title="Tax Invoice already generated for this Job Card. View and print the official bill."
                    >
                      <FileText className="w-4 h-4" />
                      <span>View IRD Tax Invoice ({existingInvoice.invoiceNumber})</span>
                    </button>
                  </div>
                );
              }

              return (
                <button
                  onClick={() => onConvertToInvoice(currentJobCard)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900 transition flex items-center space-x-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Proceed to IRD Tax Invoice</span>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

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
          onClose={() => setIsAccidentQuotationOpen(false)}
          onSaveQuotation={(quotation) => {
            if (onCreateQuotation) {
              onCreateQuotation(quotation);
            }
            setIsAccidentQuotationOpen(false);
          }}
        />
      )}
    </div>
  );
};
