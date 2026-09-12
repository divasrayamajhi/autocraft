import React, { useState } from 'react';
import { 
  InsuranceClaim, 
  JobCard, 
  Invoice, 
  Customer 
} from '../../types';
import { 
  ShieldCheck, 
  Calculator, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Percent, 
  Layers, 
  Building2, 
  User, 
  ArrowRight,
  Plus,
  X
} from 'lucide-react';

interface InsuranceBillingProps {
  claims: InsuranceClaim[];
  jobCards: JobCard[];
  invoices: Invoice[];
  customers: Customer[];
  onUpdateClaim: (claim: InsuranceClaim) => void;
  onCreateClaim: (claim: InsuranceClaim) => void;
  onCreateSplitInvoices: (customerInv: Invoice, insurerInv: Invoice) => void;
}

const NEPAL_INSURERS = [
  'Shikhar Insurance Co. Ltd.',
  'Siddhartha Premier Insurance',
  'Himalayan Everest Insurance',
  'NLG Insurance Co. Ltd.',
  'Nepal Insurance Co. Ltd.',
  'United Ajod Insurance'
];

export const InsuranceBilling: React.FC<InsuranceBillingProps> = ({
  claims = [],
  jobCards = [],
  invoices = [],
  customers = [],
  onUpdateClaim,
  onCreateClaim,
  onCreateSplitInvoices
}) => {
  const safeClaims = Array.isArray(claims) ? claims : [];
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];
  const [activeTab, setActiveTab] = useState<'claims' | 'calculator'>('claims');
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(safeClaims[0] || null);

  // Split Billing Calculator State (Nepal Insurance Authority Norms)
  const [calcEstParts, setCalcEstParts] = useState(45000);
  const [calcPlasticPartsShare, setCalcPlasticPartsShare] = useState(15000); // 50% dep on rubber/nylon/plastic
  const [calcGlassPartsShare, setCalcGlassPartsShare] = useState(8000); // 0% dep on glass
  const [calcMetalPartsShare, setCalcMetalPartsShare] = useState(22000); // Age-based dep
  const [calcVehicleAgeYears, setCalcVehicleAgeYears] = useState(3);
  const [calcLaborTotal, setCalcLaborTotal] = useState(20000);
  const [calcCompulsoryExcess, setCalcCompulsoryExcess] = useState(2000);
  const [calcSalvageAmount, setCalcSalvageAmount] = useState(1500);

  // New Claim Modal
  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [newClaimNumber, setNewClaimNumber] = useState(`CLM-2081-${Math.floor(100 + Math.random()*900)}`);
  const [newClaimInsurer, setNewClaimInsurer] = useState(NEPAL_INSURERS[0]);
  const [newClaimJcId, setNewClaimJcId] = useState(safeJobCards[0]?.id || '');
  const [newClaimSurveyor, setNewClaimSurveyor] = useState('Surveyor - Nepal Insurance Board');
  const [newClaimPhone, setNewClaimPhone] = useState('+977-9851000000');

  // Metal depreciation based on Nepal Beema Samiti rules
  const getMetalDepRate = (age: number) => {
    if (age <= 0.5) return 0;
    if (age <= 1) return 5;
    if (age <= 2) return 10;
    if (age <= 3) return 15;
    if (age <= 4) return 25;
    if (age <= 5) return 35;
    if (age <= 10) return 40;
    return 50;
  };

  const metalDepPercent = getMetalDepRate(calcVehicleAgeYears);

  // Depreciation calculation
  const plasticDepAmount = calcPlasticPartsShare * 0.5; // 50%
  const metalDepAmount = calcMetalPartsShare * (metalDepPercent / 100);
  const glassDepAmount = 0; // 0%
  const totalDepreciation = plasticDepAmount + metalDepAmount + glassDepAmount;

  // Customer share vs Insurer share
  const approvedPartsByInsurer = calcEstParts - totalDepreciation - calcSalvageAmount;
  const approvedLaborByInsurer = calcLaborTotal; // 100% labor covered
  const grossInsurerShare = approvedPartsByInsurer + approvedLaborByInsurer - calcCompulsoryExcess;
  const insurerTaxable = Math.max(0, grossInsurerShare);
  const insurerVat = insurerTaxable * 0.13;
  const insurerGrandTotal = insurerTaxable + insurerVat;

  const customerPayableBeforeVat = totalDepreciation + calcCompulsoryExcess + calcSalvageAmount;
  const customerVat = customerPayableBeforeVat * 0.13;
  const customerGrandTotal = customerPayableBeforeVat + customerVat;

  const totalJobGross = (calcEstParts + calcLaborTotal) * 1.13;

  const handleGenerateSplitInvoicesFromCalc = () => {
    const custInv: Invoice = {
      id: `INV-CUST-${Date.now().toString().slice(-4)}`,
      invoiceNumber: `INV-81-C${Math.floor(100 + Math.random()*900)}`,
      jobCardId: jobCards[0]?.id || 'JC-01',
      jobCardNumber: jobCards[0]?.jobCardNumber || 'JC-81-001',
      customerName: 'Customer Liability Share',
      customerPhone: '+977-9841000000',
      vehicleReg: 'BA 02 CHA 8892',
      vehicleBrand: 'Hyundai',
      vehicleModel: 'Creta',
      subTotal: customerPayableBeforeVat,
      taxableAmount: customerPayableBeforeVat,
      discountTotal: 0,
      vatRate: 13,
      vatAmount: Math.round(customerVat),
      grandTotal: Math.round(customerGrandTotal),
      paidAmount: 0,
      balanceDue: Math.round(customerGrandTotal),
      paymentMethod: 'Fonepay',
      status: 'Unpaid',
      createdAt: new Date().toISOString(),
      type: 'Customer Split Bill (Depreciation & Excess)',
      isLocked: false,
      items: [
        {
          id: 'SPLIT-1',
          itemType: 'Part',
          description: `Depreciation on parts (Plastic 50% + Metal ${metalDepPercent}%)`,
          quantity: 1,
          unitPrice: Math.round(totalDepreciation),
          taxableAmount: Math.round(totalDepreciation),
          vatRate: 13,
          vatAmount: Math.round(totalDepreciation * 0.13),
          totalAmount: Math.round(totalDepreciation * 1.13)
        },
        {
          id: 'SPLIT-2',
          itemType: 'Service',
          description: 'Compulsory Policy Excess & Salvage deduction',
          quantity: 1,
          unitPrice: calcCompulsoryExcess + calcSalvageAmount,
          taxableAmount: calcCompulsoryExcess + calcSalvageAmount,
          vatRate: 13,
          vatAmount: Math.round((calcCompulsoryExcess + calcSalvageAmount) * 0.13),
          totalAmount: Math.round((calcCompulsoryExcess + calcSalvageAmount) * 1.13)
        }
      ]
    };

    const insInv: Invoice = {
      id: `INV-INS-${Date.now().toString().slice(-4)}`,
      invoiceNumber: `INV-81-I${Math.floor(100 + Math.random()*900)}`,
      jobCardId: jobCards[0]?.id || 'JC-01',
      jobCardNumber: jobCards[0]?.jobCardNumber || 'JC-81-001',
      customerName: NEPAL_INSURERS[0],
      customerPhone: '+977-1-4412345',
      vehicleReg: 'BA 02 CHA 8892',
      vehicleBrand: 'Hyundai',
      vehicleModel: 'Creta',
      subTotal: insurerTaxable,
      taxableAmount: insurerTaxable,
      discountTotal: 0,
      vatRate: 13,
      vatAmount: Math.round(insurerVat),
      grandTotal: Math.round(insurerGrandTotal),
      paidAmount: 0,
      balanceDue: Math.round(insurerGrandTotal),
      paymentMethod: 'Bank Transfer',
      status: 'Unpaid',
      createdAt: new Date().toISOString(),
      type: 'Insurance Cashless Corporate Bill (IRD 13% VAT)',
      isLocked: false,
      items: [
        {
          id: 'INS-1',
          itemType: 'Part',
          description: 'Surveyor approved spare parts replacement (Net of dep)',
          quantity: 1,
          unitPrice: Math.round(approvedPartsByInsurer),
          taxableAmount: Math.round(approvedPartsByInsurer),
          vatRate: 13,
          vatAmount: Math.round(approvedPartsByInsurer * 0.13),
          totalAmount: Math.round(approvedPartsByInsurer * 1.13)
        },
        {
          id: 'INS-2',
          itemType: 'Labor',
          description: 'Surveyor approved bodyshop & mechanical labor',
          quantity: 1,
          unitPrice: Math.round(approvedLaborByInsurer),
          taxableAmount: Math.round(approvedLaborByInsurer),
          vatRate: 13,
          vatAmount: Math.round(approvedLaborByInsurer * 0.13),
          totalAmount: Math.round(approvedLaborByInsurer * 1.13)
        }
      ]
    };

    onCreateSplitInvoices(custInv, insInv);
    alert('Split Tax Invoices (Customer share & Insurer Cashless) generated successfully with Nepal 13% VAT!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
              activeTab === 'claims'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Cashless Claims Register ({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
              activeTab === 'calculator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Nepal Insurance Split Billing Engine</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500">
            Partnered with all registered Nepal General Insurers
          </span>
        </div>
      </div>

      {/* TAB 1: CLAIMS REGISTER */}
      {activeTab === 'claims' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Active Insurance Dossiers
            </div>

            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {safeClaims.map((cl) => {
                const isSelected = selectedClaim?.id === cl.id;
                return (
                  <div
                    key={cl.id}
                    onClick={() => setSelectedClaim(cl)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-xs font-bold text-indigo-700">{cl.claimNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {cl.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 mt-1">{cl.insuranceCompany}</p>
                    <p className="text-[11px] text-slate-500 font-mono">Job Card: {cl.jobCardNumber}</p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-xs">
                      <span className="text-slate-400">Claim Amount:</span>
                      <span className="font-mono font-bold text-slate-800">
                        रु. {cl.totalClaimAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dossier Detail */}
          <div className="lg:col-span-2">
            {selectedClaim ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Claim #{selectedClaim.claimNumber}
                    </h3>
                    <p className="text-slate-500 font-semibold">{selectedClaim.insuranceCompany}</p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-lg">
                    {selectedClaim.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Surveyor</span>
                    <span className="font-bold text-slate-800">{selectedClaim.surveyorName}</span>
                    <span className="text-slate-500 block font-mono text-[11px]">{selectedClaim.surveyorPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Accident Date</span>
                    <span className="font-mono font-bold text-slate-800">{selectedClaim.accidentDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Total Claim Amount</span>
                    <span className="font-mono font-bold text-slate-800">रु. {selectedClaim.totalClaimAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Approved Cashless</span>
                    <span className="font-mono font-bold text-emerald-700">रु. {selectedClaim.approvedAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Claim Document Verification Checklist:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Driving License of Driver at Accident</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Vehicle Blue Book (Registration & Tax Token)</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Police Accident Report / Traffic Clearance</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 bg-slate-50 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Surveyor Initial & Re-inspection Photos</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-950 block">Customer Liability (Depreciation + Excess):</span>
                    <span className="text-emerald-700 font-mono font-black text-sm">
                      रु. {selectedClaim.customerLiabilityAmount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block">Insurer Cashless Settlement:</span>
                    <span className="text-emerald-700 font-mono font-black text-sm">
                      रु. {selectedClaim.approvedAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">Select a claim to view details</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SPLIT BILLING ENGINE */}
      {activeTab === 'calculator' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6 text-xs">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Nepal Insurance Authority Split Billing & Depreciation Simulator
            </h3>
            <p className="text-slate-500">
              Computes exact customer vs insurer split factoring mandatory 50% rubber/plastic depreciation, age-graded metal depreciation, compulsory excess, and 13% Nepal VAT.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inputs */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800 text-sm">Accident Claim Parameters</h4>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Age (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.5"
                  value={calcVehicleAgeYears}
                  onChange={e => setCalcVehicleAgeYears(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500">Applied Metal Dep Rate: <strong>{metalDepPercent}%</strong></span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plastic / Rubber Parts Total (NPR)</label>
                <input
                  type="number"
                  value={calcPlasticPartsShare}
                  onChange={e => setCalcPlasticPartsShare(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
                <span className="text-[10px] text-rose-600">50% Depreciation applied = रु. {plasticDepAmount.toLocaleString()}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Metal Sheet & Mechanical Parts Total (NPR)</label>
                <input
                  type="number"
                  value={calcMetalPartsShare}
                  onChange={e => setCalcMetalPartsShare(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
                <span className="text-[10px] text-rose-600">{metalDepPercent}% Depreciation applied = रु. {metalDepAmount.toLocaleString()}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Glass & Windshield Parts (NPR)</label>
                <input
                  type="number"
                  value={calcGlassPartsShare}
                  onChange={e => setCalcGlassPartsShare(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
                <span className="text-[10px] text-emerald-600">0% Depreciation (100% Insurer Covered)</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Approved Labor & Tinkering (NPR)</label>
                <input
                  type="number"
                  value={calcLaborTotal}
                  onChange={e => setCalcLaborTotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono"
                />
                <span className="text-[10px] text-emerald-600">100% covered by Insurer</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Compulsory Excess</label>
                  <input
                    type="number"
                    value={calcCompulsoryExcess}
                    onChange={e => setCalcCompulsoryExcess(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Salvage Value</label>
                  <input
                    type="number"
                    value={calcSalvageAmount}
                    onChange={e => setCalcSalvageAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Split Output Card */}
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-emerald-900 uppercase">1. Insurance Company Cashless Share</span>
                <div className="text-xl font-black font-mono text-emerald-700">
                  रु. {Math.round(insurerGrandTotal).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Taxable Approved Amount:</span>
                    <span className="font-mono font-semibold">रु. {Math.round(insurerTaxable).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nepal 13% VAT:</span>
                    <span className="font-mono font-semibold">रु. {Math.round(insurerVat).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase">2. Customer Payable Share (Excess & Dep)</span>
                <div className="text-xl font-black font-mono text-amber-800">
                  रु. {Math.round(customerGrandTotal).toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-800 space-y-1">
                  <div className="flex justify-between">
                    <span>Depreciation + Excess Taxable:</span>
                    <span className="font-mono font-semibold">रु. {Math.round(customerPayableBeforeVat).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nepal 13% VAT:</span>
                    <span className="font-mono font-semibold">रु. {Math.round(customerVat).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl flex justify-between items-center font-bold text-slate-800">
                <span>Total Repair Job Estimate (incl. 13% VAT):</span>
                <span className="font-mono font-black text-sm">
                  रु. {Math.round(totalJobGross).toLocaleString()}
                </span>
              </div>

              <button
                onClick={handleGenerateSplitInvoicesFromCalc}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-900 flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Create Separate Split Invoices Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
