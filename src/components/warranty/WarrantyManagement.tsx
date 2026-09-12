import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileCheck, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  X,
  FileText,
  Truck,
  RotateCcw,
  BadgeCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { 
  WarrantyRecord, 
  WarrantyClaim, 
  JobCard, 
  Customer, 
  UserRole 
} from '../../types';

interface WarrantyManagementProps {
  warrantyRecords: WarrantyRecord[];
  warrantyClaims: WarrantyClaim[];
  jobCards: JobCard[];
  customers: Customer[];
  userRole: UserRole;
  onAddWarrantyRecord: (record: WarrantyRecord) => void;
  onCreateWarrantyClaim: (claim: WarrantyClaim) => void;
  onUpdateWarrantyClaim: (claim: WarrantyClaim) => void;
}

type WarrantyTab = 'claims' | 'register' | 'oem_settlement';

export const WarrantyManagement: React.FC<WarrantyManagementProps> = ({
  warrantyRecords = [],
  warrantyClaims = [],
  jobCards = [],
  customers = [],
  userRole,
  onAddWarrantyRecord,
  onCreateWarrantyClaim,
  onUpdateWarrantyClaim
}) => {
  const safeWarrantyRecords = warrantyRecords || [];
  const safeWarrantyClaims = warrantyClaims || [];
  const safeJobCards = jobCards || [];
  const safeCustomers = customers || [];

  const [activeTab, setActiveTab] = useState<WarrantyTab>('claims');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);
  const [isNewClaimModal, setIsNewClaimModal] = useState(false);
  const [isNewWarrantyModal, setIsNewWarrantyModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredClaims = safeWarrantyClaims.filter(c => {
    if (!c) return false;
    const matchesSearch = 
      (c.claimNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.vehicleReg || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.oemManufacturer || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdvanceClaimStatus = (claim: WarrantyClaim, nextStatus: WarrantyClaim['status'], notes?: string) => {
    const updated: WarrantyClaim = {
      ...claim,
      status: nextStatus,
      reconciliationNotes: notes || claim.reconciliationNotes
    };

    if (nextStatus === 'Approved') {
      updated.approvalDate = new Date().toISOString().slice(0, 10);
      updated.oemApprovedAmount = claim.totalClaimAmount;
      updated.oemCreditNoteNumber = `OEM-CN-${Date.now().toString().slice(-4)}`;
    } else if (nextStatus === 'Settled & Reconciled') {
      updated.customerZeroInvoiceGenerated = true;
      updated.partDisposition = 'Shipped to OEM Depot';
    }

    onUpdateWarrantyClaim(updated);
    setSelectedClaim(updated);
    notify(`Warranty Claim ${claim.claimNumber} status updated to "${nextStatus}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              OEM & Spares Warranty Engine
            </span>
            <span className="text-xs text-slate-400">Workshop & Manufacturer Reconciliation</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            Warranty Register & OEM Claim Management
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            End-to-end warranty lifecycle: Track active part and service warranties, file claims against OEM distributors (Bosch, Minda, Exide, OEM Genuine), record defective part disposition, and reconcile OEM credit notes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNewWarrantyModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 shadow-sm"
          >
            Register Warranty
          </button>
          <button
            onClick={() => setIsNewClaimModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950"
          >
            <Plus className="w-4 h-4" />
            <span>File OEM Claim</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'claims'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Active OEM Claims ({safeWarrantyClaims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'register'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Warranty Register ({safeWarrantyRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('oem_settlement')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTab === 'oem_settlement'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>OEM Settlement & Reconciliation</span>
          </button>
        </div>

        {activeTab === 'claims' && (
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search claim, reg, OEM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none w-48"
              />
            </div>

            <select
              aria-label="Filter Warranty Claims by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted to OEM">Submitted to OEM</option>
              <option value="OEM Inspection / Under Review">Under OEM Review</option>
              <option value="Approved">Approved</option>
              <option value="Settled & Reconciled">Settled & Reconciled</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: ACTIVE OEM CLAIMS */}
      {activeTab === 'claims' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claims List */}
          <div className="lg:col-span-2 space-y-3">
            {filteredClaims.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
                No warranty claims found matching current filters.
              </div>
            ) : (
              filteredClaims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`bg-white rounded-2xl border p-4.5 cursor-pointer transition shadow-sm hover:shadow-md ${
                    selectedClaim?.id === claim.id ? 'border-indigo-600 ring-2 ring-indigo-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-indigo-700">{claim.claimNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          claim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                          claim.status === 'Settled & Reconciled' ? 'bg-purple-100 text-purple-800' :
                          claim.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                          claim.status === 'OEM Inspection / Under Review' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {claim.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{claim.defectivePartName}</h4>
                      <p className="text-xs text-slate-500 font-mono">SKU: {claim.defectivePartSku}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-extrabold text-slate-900">
                        रु. {claim.totalClaimAmount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400">Total Claimable</span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                    <div>
                      <span className="text-slate-400 block text-[10px]">OEM / Supplier:</span>
                      <span className="font-semibold text-slate-800">{claim.oemManufacturer}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Vehicle Reg:</span>
                      <span className="font-mono font-semibold text-slate-800">{claim.vehicleReg}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Customer:</span>
                      <span className="font-semibold text-slate-800 truncate block">{claim.customerName}</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Filed On: {claim.submissionDate}</span>
                    <span className="text-indigo-600 font-semibold flex items-center space-x-1">
                      <span>View Claim Lifecycle</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Claim Detail & Approval Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {selectedClaim ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Claim Details</span>
                    <h3 className="text-base font-bold text-slate-900">{selectedClaim.claimNumber}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedClaim.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    selectedClaim.status === 'Settled & Reconciled' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedClaim.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <p><span className="font-semibold text-slate-500">Defective Component:</span> {selectedClaim.defectivePartName}</p>
                  <p><span className="font-semibold text-slate-500">OEM / Supplier:</span> {selectedClaim.oemManufacturer}</p>
                  <p><span className="font-semibold text-slate-500">Failure Mileage:</span> {selectedClaim.failureMileage.toLocaleString()} km</p>
                  <p><span className="font-semibold text-slate-500">Failure Symptom:</span> {selectedClaim.symptomType}</p>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
                    <span className="font-semibold block text-[11px] text-slate-500 mb-0.5">Defect Diagnosis:</span>
                    {selectedClaim.defectDescription}
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Parts Replacement Cost:</span>
                    <span className="font-mono font-bold text-slate-800">रु. {selectedClaim.claimPartsAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">OEM Labor Allowance:</span>
                    <span className="font-mono font-bold text-slate-800">रु. {selectedClaim.claimLaborAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-indigo-200 text-indigo-900 font-extrabold text-sm">
                    <span>Total Claimable to OEM:</span>
                    <span>रु. {selectedClaim.totalClaimAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Transitions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Advance Claim Workflow:</p>
                  
                  {selectedClaim.status === 'Draft' && (
                    <button
                      onClick={() => handleAdvanceClaimStatus(selectedClaim, 'Submitted to OEM', 'Dispatched electronic claim dossier to OEM dealer portal')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      Submit Claim to OEM
                    </button>
                  )}

                  {selectedClaim.status === 'Submitted to OEM' && (
                    <button
                      onClick={() => handleAdvanceClaimStatus(selectedClaim, 'OEM Inspection / Under Review', 'Surveyor visited workshop and verified part serial')}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
                    >
                      Mark OEM Surveyor Inspection Underway
                    </button>
                  )}

                  {selectedClaim.status === 'OEM Inspection / Under Review' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAdvanceClaimStatus(selectedClaim, 'Approved', 'OEM approved 100% claim credit')}
                        className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        Approve Claim
                      </button>
                      <button
                        onClick={() => handleAdvanceClaimStatus(selectedClaim, 'Rejected', 'Rejected by OEM due to improper external fluid contamination')}
                        className="py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                      >
                        Reject Claim
                      </button>
                    </div>
                  )}

                  {selectedClaim.status === 'Approved' && (
                    <button
                      onClick={() => handleAdvanceClaimStatus(selectedClaim, 'Settled & Reconciled', 'Credit note matched against vendor payable ledger')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                    >
                      Reconcile & Generate Zero Customer Bill
                    </button>
                  )}
                </div>

                {selectedClaim.reconciliationNotes && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <span className="font-semibold block text-slate-600">Audit Notes:</span>
                    {selectedClaim.reconciliationNotes}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Select a warranty claim from the list to view diagnosis details, OEM communication log, and approval workflow.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WARRANTY REGISTER */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Warranty Code</th>
                <th className="p-3.5">Part / Service Name</th>
                <th className="p-3.5">Vehicle Reg</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">OEM Manufacturer</th>
                <th className="p-3.5">Start Date</th>
                <th className="p-3.5">Expiry Date</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warrantyRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-indigo-700">{rec.warrantyCode}</td>
                  <td className="p-3.5 font-semibold text-slate-900">{rec.partName}</td>
                  <td className="p-3.5 font-mono text-slate-700">{rec.vehicleReg}</td>
                  <td className="p-3.5 text-slate-600">{rec.customerName}</td>
                  <td className="p-3.5 text-slate-700">{rec.oemManufacturer}</td>
                  <td className="p-3.5 text-slate-500">{rec.startDate}</td>
                  <td className="p-3.5 font-mono text-slate-700">{rec.expiryDate}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      rec.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      rec.status === 'Claim Initiated' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: OEM SETTLEMENT & RECONCILIATION */}
      {activeTab === 'oem_settlement' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">OEM Credit Note Reconciliation Register</h3>
            <p className="text-xs text-slate-500 mb-4">
              Reconciles claims approved by parts manufacturers (Bosch, Minda, Laxmi Intercontinental, Agni Inc.) directly into Accounts Payable as vendor credit offsets.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">Total Settled Claims</span>
                <div className="text-xl font-black text-emerald-950 font-mono mt-1">रु. 11,200</div>
                <span className="text-[11px] text-emerald-700">Offset against parts purchases</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">Claims Under Review</span>
                <div className="text-xl font-black text-amber-950 font-mono mt-1">रु. 14,500</div>
                <span className="text-[11px] text-amber-700">Awaiting surveyor verification</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-800">Avg. OEM Settlement Cycle</span>
                <div className="text-xl font-black text-blue-950 font-mono mt-1">8.4 Days</div>
                <span className="text-[11px] text-blue-700">Fast turnaround with digital claim files</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FILE NEW OEM CLAIM */}
      {isNewClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">File Warranty Claim with OEM</h4>
              <button onClick={() => setIsNewClaimModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const getNum = (name: string, fallback = 0) =>
                  parseFloat((form.elements.namedItem(name) as HTMLInputElement)?.value || '') || fallback;
                const getInt = (name: string, fallback = 0) =>
                  parseInt((form.elements.namedItem(name) as HTMLInputElement)?.value || '', 10) || fallback;

                const partsAmt = getNum('partsAmt', 0);
                const laborAmt = getNum('laborAmt', 0);
                const serialVal = getVal('serial');

                const newClaim: WarrantyClaim = {
                  id: `WCLM-${Date.now().toString().slice(-4)}`,
                  claimNumber: `WCLM-81-${Math.floor(100 + Math.random()*900)}`,
                  warrantyRecordId: getVal('recId', 'WAR-MANUAL') || 'WAR-MANUAL',
                  jobCardId: 'JC-81-MANUAL',
                  jobCardNumber: getVal('jcNum', 'JC-81-0021'),
                  vehicleReg: getVal('vehReg', 'BA 02 CHA 8892').toUpperCase(),
                  customerName: getVal('custName', 'Valued Customer'),
                  oemManufacturer: getVal('oem', 'Bosch Automotive Nepal'),
                  defectivePartName: getVal('partName', 'Defective Part'),
                  defectivePartSku: getVal('sku', 'SKU-GEN-01'),
                  serialNumber: serialVal || undefined,
                  failureMileage: getInt('mileage', 30000),
                  defectDescription: getVal('desc', 'Defective part under warranty replacement inspection.'),
                  symptomType: (getVal('symptom', 'Mechanical Failure') as any),
                  claimPartsAmount: partsAmt,
                  claimLaborAmount: laborAmt,
                  totalClaimAmount: partsAmt + laborAmt,
                  status: 'Draft',
                  submissionDate: new Date().toISOString().slice(0, 10),
                  customerZeroInvoiceGenerated: false,
                  partDisposition: 'Pending Inspection'
                };

                onCreateWarrantyClaim(newClaim);
                setIsNewClaimModal(false);
                notify(`Warranty Claim ${newClaim.claimNumber} saved as Draft`);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Registered Warranty (Optional)</label>
                <select name="recId" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white">
                  <option value="">Manual Claim Entry</option>
                  {warrantyRecords.map(r => (
                    <option key={r.id} value={r.id}>{r.warrantyCode} - {r.partName} ({r.vehicleReg})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Card #</label>
                  <input name="jcNum" defaultValue="JC-81-0021" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Registration</label>
                  <input name="vehReg" defaultValue="BA 02 CHA 8892" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                <input name="custName" defaultValue="Dr. Rameshwor Pokharel" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Defective Part Name</label>
                  <input name="partName" placeholder="e.g. Brake Caliper Assembly" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part SKU / Code</label>
                  <input name="sku" placeholder="SKU-BRK-CAL-01" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Serial # (Optional)</label>
                  <input name="serial" placeholder="SN-..." className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OEM / Manufacturer</label>
                  <input name="oem" defaultValue="Bosch Automotive Nepal" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Failure Mileage (km)</label>
                  <input name="mileage" type="number" defaultValue="38400" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Failure Symptom</label>
                <select name="symptom" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white">
                  <option value="Mechanical Failure">Mechanical Failure / Seizure</option>
                  <option value="Electrical Short">Electrical Short / Coil Burn</option>
                  <option value="Premature Wear">Premature Wear & Tear</option>
                  <option value="Fluid Leakage">Fluid / Oil Leakage</option>
                  <option value="Manufacturing Defect">Manufacturing Casting Defect</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Defect Technical Description</label>
                <textarea name="desc" rows={2} placeholder="Explain symptoms, physical inspection findings and diagnostic scan results..." className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parts Amount (NPR)</label>
                  <input name="partsAmt" type="number" defaultValue="4600" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Labor Allowance (NPR)</label>
                  <input name="laborAmt" type="number" defaultValue="1200" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsNewClaimModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">Create Claim Dossier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW WARRANTY RECORD */}
      {isNewWarrantyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Register Part / Service Warranty</h4>
              <button onClick={() => setIsNewWarrantyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const getInt = (name: string, fallback = 0) =>
                  parseInt((form.elements.namedItem(name) as HTMLInputElement)?.value || '', 10) || fallback;

                const months = getInt('duration', 6);
                const startRaw = getVal('start');
                const startDateObj = startRaw ? new Date(startRaw) : new Date();
                const validStart = isNaN(startDateObj.getTime()) ? new Date() : startDateObj;
                const start = validStart.toISOString().slice(0, 10);
                const expiryObj = new Date(validStart);
                expiryObj.setMonth(expiryObj.getMonth() + months);
                const expiryDate = expiryObj.toISOString().slice(0, 10);

                const newRec: WarrantyRecord = {
                  id: `WAR-${Date.now().toString().slice(-4)}`,
                  warrantyCode: `WAR-2081-${Math.floor(100 + Math.random()*900)}`,
                  partName: getVal('partName', 'Automotive Spare Part'),
                  jobCardNumber: getVal('jcNum', 'JC-81-0001'),
                  vehicleReg: getVal('vehReg', 'BA 01 CHA 0001').toUpperCase(),
                  customerName: getVal('custName', 'Valued Customer'),
                  customerPhone: '+977-9800000000',
                  startDate: start,
                  expiryDate,
                  durationMonths: months,
                  oemManufacturer: getVal('oem', 'OEM Nepal'),
                  terms: 'Standard replacement against premature breakdown.',
                  status: 'Active'
                };

                onAddWarrantyRecord(newRec);
                setIsNewWarrantyModal(false);
                notify(`Warranty Record ${newRec.warrantyCode} registered`);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Part / Service Description</label>
                <input name="partName" placeholder="e.g. Exide 12V 45Ah Car Battery" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Reg</label>
                  <input name="vehReg" placeholder="BA 02 CHA 8892" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Card #</label>
                  <input name="jcNum" placeholder="JC-81-0021" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-mono" required />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                <input name="custName" placeholder="Customer Name" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OEM / Manufacturer</label>
                  <input name="oem" defaultValue="Exide Batteries Nepal" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Warranty Duration (Months)</label>
                  <input name="duration" type="number" defaultValue="12" className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input name="start" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsNewWarrantyModal(false)} className="px-4 py-2 border border-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">Register Warranty</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
