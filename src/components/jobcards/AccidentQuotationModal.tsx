import React, { useState } from 'react';
import { JobCard, SparePart, PartsQuotation, PartsQuotationItem } from '../../types';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Car, 
  Plus, 
  Trash2, 
  X, 
  Save, 
  Printer, 
  AlertTriangle,
  Building2,
  DollarSign
} from 'lucide-react';

interface AccidentQuotationModalProps {
  jobCard: JobCard;
  availableParts: SparePart[];
  onClose: () => void;
  onSaveQuotation: (quotation: PartsQuotation) => void;
}

const NEPAL_INSURERS = [
  'Shikhar Insurance Co. Ltd.',
  'Siddhartha Premier Insurance',
  'Himalayan Everest Insurance',
  'NLG Insurance Co. Ltd.',
  'Nepal Insurance Co. Ltd.',
  'United Ajod Insurance',
  'Sanima GIC Insurance',
  'IGI Prudential Insurance'
];

export const AccidentQuotationModal: React.FC<AccidentQuotationModalProps> = ({
  jobCard,
  availableParts = [],
  onClose,
  onSaveQuotation
}) => {
  const [insuranceCompany, setInsuranceCompany] = useState(
    jobCard.insuranceCompanyName || NEPAL_INSURERS[0]
  );
  const [claimNumber, setClaimNumber] = useState(
    jobCard.insuranceClaimNumber || `CLM-ACC-${Date.now().toString().slice(-4)}`
  );
  const [surveyorName, setSurveyorName] = useState('Govinda Sharma (Licensed Surveyor)');
  const [validityDays, setValidityDays] = useState(15);
  const [notes, setNotes] = useState('Comprehensive accidental repair and insurance survey estimate. Subject to physical inspection and depreciation clauses.');

  // Initialize with parts from job card or common accident items
  const [quotedParts, setQuotedParts] = useState<PartsQuotationItem[]>(() => {
    const existingParts = (jobCard.partsRequested || jobCard.partsItems || []);
    if (existingParts.length > 0) {
      return existingParts.map(p => ({
        partId: p.partId || `PART-${Date.now()}`,
        partName: p.partName || p.name || 'Body Part',
        sku: p.partNumber || 'OEM-ACC',
        quantity: p.quantity || 1,
        unitPrice: p.unitPrice || 0,
        discount: p.discount || 0,
        vatRate: 13,
        total: (p.quantity || 1) * (p.unitPrice || 0)
      }));
    }
    return [
      {
        partId: 'ACC-01',
        partName: 'Front Bumper Assembly (Unpainted)',
        sku: 'BMP-FR-889',
        quantity: 1,
        unitPrice: 14500,
        discount: 0,
        vatRate: 13,
        total: 14500
      },
      {
        partId: 'ACC-02',
        partName: 'Headlamp RH Assembly (LED Projector)',
        sku: 'HL-RH-772',
        quantity: 1,
        unitPrice: 22000,
        discount: 0,
        vatRate: 13,
        total: 22000
      }
    ];
  });

  // Quoted Labor for Accident & Dent/Paint
  const [quotedLabor, setQuotedLabor] = useState<Array<{ id: string; description: string; hours: number; ratePerHour: number; totalAmount: number }>>([
    {
      id: 'LBR-ACC-1',
      description: 'Front Fender & Apron Alignment / Denting',
      hours: 4.5,
      ratePerHour: 1200,
      totalAmount: 5400
    },
    {
      id: 'LBR-ACC-2',
      description: 'Bumper & RH Fender Paint Booth Oven Bake (2 Panels)',
      hours: 6.0,
      ratePerHour: 1200,
      totalAmount: 7200
    }
  ]);

  // Form input states for adding custom part
  const [newPartName, setNewPartName] = useState('');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartQty, setNewPartQty] = useState(1);
  const [newPartPrice, setNewPartPrice] = useState(2500);

  // Form input states for adding custom labor
  const [newLaborDesc, setNewLaborDesc] = useState('');
  const [newLaborHours, setNewLaborHours] = useState(2);
  const [newLaborRate, setNewLaborRate] = useState(1200);

  // Quick select existing inventory part
  const [selectedStockPartId, setSelectedStockPartId] = useState('');

  const handleAddStockPart = () => {
    const part = availableParts.find(p => p.id === selectedStockPartId);
    if (!part) return;
    const newItem: PartsQuotationItem = {
      partId: part.id,
      partName: part.name,
      sku: part.partNumber || part.sku,
      quantity: 1,
      unitPrice: part.sellingPrice,
      discount: 0,
      vatRate: 13,
      total: part.sellingPrice
    };
    setQuotedParts([...quotedParts, newItem]);
    setSelectedStockPartId('');
  };

  const handleAddManualPart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName) return;
    const newItem: PartsQuotationItem = {
      partId: `CUST-${Date.now().toString().slice(-4)}`,
      partName: newPartName,
      sku: newPartSku || 'ACC-REQ',
      quantity: newPartQty,
      unitPrice: newPartPrice,
      discount: 0,
      vatRate: 13,
      total: newPartQty * newPartPrice
    };
    setQuotedParts([...quotedParts, newItem]);
    setNewPartName('');
    setNewPartSku('');
    setNewPartQty(1);
    setNewPartPrice(2500);
  };

  const handleAddManualLabor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaborDesc) return;
    const newLbr = {
      id: `LBR-${Date.now().toString().slice(-4)}`,
      description: newLaborDesc,
      hours: newLaborHours,
      ratePerHour: newLaborRate,
      totalAmount: newLaborHours * newLaborRate
    };
    setQuotedLabor([...quotedLabor, newLbr]);
    setNewLaborDesc('');
    setNewLaborHours(2);
    setNewLaborRate(1200);
  };

  // Computations
  const partsSubtotal = quotedParts.reduce((acc, p) => acc + p.total, 0);
  const laborSubtotal = quotedLabor.reduce((acc, l) => acc + l.totalAmount, 0);
  const totalTaxable = partsSubtotal + laborSubtotal;
  const vatAmount = Math.round(totalTaxable * 0.13);
  const grandTotal = totalTaxable + vatAmount;

  // Insurance estimate breakdown (typically 80% insurance approved, 20% owner depreciation/salvage)
  const estimatedSalvage = Math.round(partsSubtotal * 0.05); // 5% metal/plastic scrap deduction
  const insuranceLiabilityEstimate = Math.round((grandTotal - estimatedSalvage) * 0.85);
  const customerShareEstimate = grandTotal - insuranceLiabilityEstimate;

  const handleSave = () => {
    const quotationNumber = `QUOT-ACC-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const expiry = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const quotation: PartsQuotation = {
      id: `PQ-${Date.now().toString().slice(-6)}`,
      quotationNumber,
      customerId: jobCard.customerId,
      customerName: jobCard.customerName,
      customerPhone: jobCard.customerPhone,
      date: now.toISOString().slice(0, 10),
      expiryDate: expiry,
      items: quotedParts,
      subtotal: totalTaxable,
      vatAmount,
      grandTotal,
      status: 'Sent',
      jobCardId: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      vehicleReg: jobCard.vehicle.registrationNumber,
      vehicleMake: jobCard.vehicle.brand,
      vehicleModel: jobCard.vehicle.model,
      vinNumber: jobCard.vehicle.vinNumber || jobCard.vehicle.chassisNumber,
      engineNumber: jobCard.vehicle.engineNumber,
      isAccidentInsuranceEstimate: true,
      insuranceCompany,
      claimNumber,
      laborItems: quotedLabor,
      customerShareEstimated: customerShareEstimate,
      insuranceShareEstimated: insuranceLiabilityEstimate,
      estimatedSalvageDeduction: estimatedSalvage,
      notes: `${notes} (Surveyor: ${surveyorName})`
    };

    onSaveQuotation(quotation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Accident Vehicle Insurance & Customer Quotation
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Pre-Approval Estimate
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Linked to Job Card: <strong className="text-white">{jobCard.jobCardNumber}</strong> • {jobCard.vehicle.registrationNumber} ({jobCard.vehicle.brand} {jobCard.vehicle.model})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Insurance & Surveyor Profile Context Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Insurance Company *</label>
              <select
                value={insuranceCompany}
                onChange={e => setInsuranceCompany(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 bg-white font-semibold outline-none"
              >
                {NEPAL_INSURERS.map(ins => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Claim / Survey Docket # *</label>
              <input
                value={claimNumber}
                onChange={e => setClaimNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 bg-white font-mono font-bold outline-none uppercase"
                placeholder="CLM-2081-445"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deputed Surveyor Name</label>
              <input
                value={surveyorName}
                onChange={e => setSurveyorName(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 bg-white outline-none"
                placeholder="Licensed Surveyor"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Validity (Days)</label>
              <input
                type="number"
                value={validityDays}
                onChange={e => setValidityDays(parseInt(e.target.value) || 15)}
                className="w-full border border-slate-300 rounded-xl p-2 bg-white font-mono font-bold outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quotation Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* SECTION 1: SPARE PARTS TO REPLACE */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <span>1. Estimated Replacement Spare Parts</span>
                <span className="text-xs text-slate-500 font-normal">({quotedParts.length} line items)</span>
              </h4>
              <span className="font-mono font-bold text-teal-700">
                Parts Total: रु. {partsSubtotal.toLocaleString()}
              </span>
            </div>

            {/* Quick add from parts master */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Quick-Pick Workshop Stock:</span>
              <select
                value={selectedStockPartId}
                onChange={e => setSelectedStockPartId(e.target.value)}
                className="border border-slate-300 rounded-lg p-1.5 bg-white text-xs flex-1 min-w-[200px]"
              >
                <option value="">-- Choose Stock Part to Add --</option>
                {availableParts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.partNumber}) - रु. {p.sellingPrice.toLocaleString()}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddStockPart}
                disabled={!selectedStockPartId}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-bold"
              >
                + Add Part
              </button>
            </div>

            {/* Quoted parts table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Part Name & Specs</th>
                    <th className="p-2.5">SKU / Code</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate (NPR)</th>
                    <th className="p-2.5 text-right">Total (NPR)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotedParts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-900">{p.partName}</td>
                      <td className="p-2.5 font-mono text-teal-700">{p.sku}</td>
                      <td className="p-2.5 text-center font-mono">{p.quantity}</td>
                      <td className="p-2.5 text-right font-mono">रु. {p.unitPrice.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        रु. {p.total.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setQuotedParts(quotedParts.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Custom Part Add Input Row */}
            <form onSubmit={handleAddManualPart} className="mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="sm:col-span-2">
                <input
                  value={newPartName}
                  onChange={e => setNewPartName(e.target.value)}
                  placeholder="Custom Accident Part Name"
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none bg-white"
                />
              </div>
              <div>
                <input
                  value={newPartSku}
                  onChange={e => setNewPartSku(e.target.value.toUpperCase())}
                  placeholder="OEM Part Code"
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none bg-white font-mono uppercase"
                />
              </div>
              <div className="flex space-x-1">
                <input
                  type="number"
                  min="1"
                  value={newPartQty}
                  onChange={e => setNewPartQty(parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-16 border border-slate-300 rounded-lg p-1.5 outline-none bg-white font-mono"
                />
                <input
                  type="number"
                  value={newPartPrice}
                  onChange={e => setNewPartPrice(parseInt(e.target.value) || 0)}
                  placeholder="Price"
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold"
              >
                + Add Custom Item
              </button>
            </form>
          </div>

          {/* SECTION 2: LABOR & DENT/PAINT */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
              <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <span>2. Estimated Labor, Denting & Paint Oven Bake</span>
                <span className="text-xs text-slate-500 font-normal">({quotedLabor.length} operations)</span>
              </h4>
              <span className="font-mono font-bold text-indigo-700">
                Labor Total: रु. {laborSubtotal.toLocaleString()}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Labor / Panel Repair Description</th>
                    <th className="p-2.5 text-center">Hours</th>
                    <th className="p-2.5 text-right">Hourly Rate</th>
                    <th className="p-2.5 text-right">Amount (NPR)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotedLabor.map((l, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-medium text-slate-900">{l.description}</td>
                      <td className="p-2.5 text-center font-mono">{l.hours} hrs</td>
                      <td className="p-2.5 text-right font-mono">रु. {l.ratePerHour.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        रु. {l.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setQuotedLabor(quotedLabor.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Custom Labor Input Row */}
            <form onSubmit={handleAddManualLabor} className="mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="sm:col-span-3">
                <input
                  value={newLaborDesc}
                  onChange={e => setNewLaborDesc(e.target.value)}
                  placeholder="e.g., Rear Quarter Panel Dent Pulling & Primer"
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none bg-white"
                />
              </div>
              <div className="flex space-x-1">
                <input
                  type="number"
                  step="0.5"
                  value={newLaborHours}
                  onChange={e => setNewLaborHours(parseFloat(e.target.value) || 1)}
                  placeholder="Hours"
                  className="w-20 border border-slate-300 rounded-lg p-1.5 outline-none bg-white font-mono"
                />
                <input
                  type="number"
                  value={newLaborRate}
                  onChange={e => setNewLaborRate(parseInt(e.target.value) || 1200)}
                  placeholder="Rate"
                  className="w-full border border-slate-300 rounded-lg p-1.5 outline-none bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
              >
                + Add Labor Line
              </button>
            </form>
          </div>

          {/* Insurance Share & Depreciation Preview Card */}
          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
            <h5 className="font-bold text-purple-950 flex items-center space-x-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Projected Insurance Settlement vs. Customer Excess / Depreciation Split:</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-purple-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Insurance Share</span>
                <span className="font-mono font-bold text-purple-800 text-sm">
                  रु. {insuranceLiabilityEstimate.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Payable directly via Cashless Insurer</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Liability (Deductible/Compulsory)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  रु. {customerShareEstimate.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Owner depreciation & policy excess</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Scrap / Salvage Deduction</span>
                <span className="font-mono font-bold text-amber-700 text-sm">
                  रु. {estimatedSalvage.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block">Recovered old parts salvage value</span>
              </div>
            </div>
          </div>

          {/* Preliminary Estimate Disclaimer */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-950">
            <span className="font-bold block text-xs mb-0.5">Note:</span>
            The quotation is a preliminary estimate based on the inspection of the vehicle. The final invoice may differ from the quoted amount, as the quotation is an estimated cost and may be subject to change depending on the actual work and parts required.
          </div>
        </div>

        {/* Bottom Total & Dispatch Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-6 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Taxable Subtotal</span>
              <span className="font-mono font-bold text-slate-800">रु. {totalTaxable.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-indigo-500 font-bold uppercase block">Nepal 13% VAT</span>
              <span className="font-mono font-bold text-indigo-700">रु. {vatAmount.toLocaleString()}</span>
            </div>
            <div className="pl-4 border-l border-slate-300">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Gross Quotation Amount</span>
              <span className="font-mono font-black text-lg text-slate-900">
                रु. {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 text-xs hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-900 transition flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save & Publish Accident Quotation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
