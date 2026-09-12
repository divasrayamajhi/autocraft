import React, { useState } from 'react';
import { 
  JobCard, 
  SparePart, 
  Technician, 
  JobCardLaborItem, 
  JobCardPartItem,
  JobCardStatus,
  UserAccount
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
  ShieldAlert, 
  X,
  FileText
} from 'lucide-react';

interface JobCardDetailModalProps {
  jobCard: JobCard;
  availableParts: SparePart[];
  technicians: Technician[];
  currentUser: UserAccount;
  onClose: () => void;
  onUpdateJobCard: (updated: JobCard) => void;
  onConvertToInvoice: (jc: JobCard) => void;
}

export const JobCardDetailModal: React.FC<JobCardDetailModalProps> = ({
  jobCard,
  availableParts = [],
  technicians = [],
  currentUser,
  onClose,
  onUpdateJobCard,
  onConvertToInvoice
}) => {
  const [activeTab, setActiveTab] = useState<'inspection' | 'labor' | 'parts' | 'status'>('inspection');
  const [currentJobCard, setCurrentJobCard] = useState<JobCard>(() => ({
    ...jobCard,
    laborItems: jobCard.laborItems || [],
    partsRequested: jobCard.partsRequested || jobCard.partsItems || []
  }));

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

  const handleStageChange = (newStatus: JobCardStatus) => {
    if (isLocked) return;
    const updated = { ...currentJobCard, status: newStatus };
    setCurrentJobCard(updated);
    onUpdateJobCard(updated);
  };

  const handleLockJobCard = () => {
    if (isLocked) return;
    const confirmLock = window.confirm(
      'MANDATORY LEGAL WARNING:\nAs per Nepal IRD CBMS and Workshop Compliance, once a Job Card is finalized and locked, IT CANNOT BE EDITED OR DELETED BY ANYONE, INCLUDING SYSTEM ADMINISTRATORS.\n\nDo you want to irreversibly seal this Job Card?'
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

        {/* Immutability Seal Banner */}
        {isLocked && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                <strong>Record Locked under Nepal Workshop Governance:</strong> Line items and labor cannot be modified by any user.
              </span>
            </div>
            <div className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Hash: {currentJobCard.lockHash || 'SEALED-2081-NPL'}
            </div>
          </div>
        )}

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

          {!isLocked && (
            <button
              onClick={handleLockJobCard}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
              title="Irreversibly locks this job card so it cannot be edited by anyone, complying with Nepal workshop auditing rules."
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Seal & Lock Job Card</span>
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: INSPECTION */}
          {activeTab === 'inspection' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Customer</span>
                  <span className="font-bold text-slate-800">{currentJobCard.customerName}</span>
                  <span className="text-slate-500 block">{currentJobCard.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Vehicle Details</span>
                  <span className="font-mono font-bold text-slate-800">{currentJobCard.vehicle.registrationNumber}</span>
                  <span className="text-slate-500 block">{currentJobCard.vehicle.brand} {currentJobCard.vehicle.model}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Odometer & Fuel</span>
                  <span className="font-bold text-slate-800">{currentJobCard.vehicle.odometerReading.toLocaleString()} km</span>
                  <span className="text-slate-500 block">Fuel: {currentJobCard.inspection.fuelLevel}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Bay & Technician</span>
                  <span className="font-bold text-indigo-700">{currentJobCard.bayNumber}</span>
                  <span className="text-slate-500 block">{currentJobCard.assignedTechnicianName || 'Unassigned'}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-900 mb-2">Customer Reported Complaints & Scope of Work:</h4>
                <div className="p-3 bg-slate-50 rounded-lg text-slate-700 font-medium leading-relaxed">
                  {currentJobCard.inspection.generalRemarks || 'Standard maintenance service, engine oil replacement, brake inspection, suspension check, washing and interior vacuum.'}
                </div>
              </div>

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
            <button
              onClick={() => onConvertToInvoice(currentJobCard)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-900 transition flex items-center space-x-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Proceed to IRD Tax Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
