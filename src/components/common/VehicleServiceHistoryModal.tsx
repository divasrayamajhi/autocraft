import React, { useState } from 'react';
import { JobCard, Invoice, GatePass } from '../../types';
import { 
  History, 
  Car, 
  User, 
  Calendar, 
  Clock, 
  Wrench, 
  Package, 
  FileText, 
  X, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Tag,
  DollarSign
} from 'lucide-react';

interface VehicleServiceHistoryModalProps {
  vehicleReg: string;
  vehicleChassis?: string;
  customerName?: string;
  customerPhone?: string;
  jobCards: JobCard[];
  invoices?: Invoice[];
  gatePasses?: GatePass[];
  onClose: () => void;
  onSelectJobCard?: (jobCard: JobCard) => void;
}

export const VehicleServiceHistoryModal: React.FC<VehicleServiceHistoryModalProps> = ({
  vehicleReg,
  vehicleChassis,
  customerName,
  customerPhone,
  jobCards = [],
  invoices = [],
  gatePasses = [],
  onClose,
  onSelectJobCard
}) => {
  const [expandedJcId, setExpandedJcId] = useState<string | null>(null);

  // Filter all job cards matching this vehicle (by registration or chassis or customer phone)
  const cleanTargetReg = (vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanTargetChassis = (vehicleChassis || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  const matchedJobCards = jobCards.filter(jc => {
    const jcReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const jcChassis = (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const jcPhone = (jc.customerPhone || '').replace(/[^0-9]/g, '');
    const targetPhone = (customerPhone || '').replace(/[^0-9]/g, '');

    const regMatches = cleanTargetReg && jcReg && (jcReg === cleanTargetReg || jcReg.includes(cleanTargetReg) || cleanTargetReg.includes(jcReg));
    const chassisMatches = cleanTargetChassis && jcChassis && (jcChassis === cleanTargetChassis);
    const phoneMatches = targetPhone.length >= 8 && jcPhone.includes(targetPhone.slice(-8));

    return regMatches || chassisMatches || phoneMatches;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Matched Invoices
  const matchedInvoices = invoices.filter(inv => {
    const invReg = (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cleanTargetReg && invReg && (invReg === cleanTargetReg || invReg.includes(cleanTargetReg) || cleanTargetReg.includes(invReg));
  });

  const totalSpent = matchedInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const latestCard = matchedJobCards[0];
  const primaryVehicle = latestCard?.vehicle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Comprehensive Vehicle Service History
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  {matchedJobCards.length} Workshop Visits
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {vehicleReg} • {primaryVehicle?.brand || 'Multi-Brand'} {primaryVehicle?.model || ''} • Owner: {customerName || latestCard?.customerName || 'Customer'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vehicle Intelligence Snapshot Cards */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Info</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{vehicleReg}</span>
              <span className="text-slate-600 truncate block">
                {primaryVehicle?.brand} {primaryVehicle?.model} ({primaryVehicle?.fuelType || 'Petrol'})
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Chassis / Engine</span>
              <span className="font-mono font-semibold text-slate-800 text-[11px] truncate block">
                VIN: {primaryVehicle?.vinNumber || primaryVehicle?.chassisNumber || vehicleChassis || 'N/A'}
              </span>
              <span className="font-mono text-slate-600 text-[11px] truncate block">
                ENG: {primaryVehicle?.engineNumber || 'N/A'}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Workshop Billed</span>
              <span className="font-mono font-bold text-indigo-700 text-sm block">
                रु. {(totalSpent || 0).toLocaleString()}
              </span>
              <span className="text-slate-500 text-[11px] block">{matchedInvoices.length} Settled Tax Invoices</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Next Target Due</span>
              <span className="font-bold text-emerald-700 text-xs block">
                {latestCard?.nextServiceDueDate || 'Within 4 Months (120 Days)'}
              </span>
              <span className="text-slate-500 font-mono text-[11px] block">
                Target: {latestCard?.nextServiceDueKm ? `${(latestCard.nextServiceDueKm || 0).toLocaleString()} km` : '+5,000 km'}
              </span>
            </div>
          </div>
        </div>

        {/* Service Records List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {matchedJobCards.length === 0 ? (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
              <Car className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Previous Service Job Cards Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This vehicle is being serviced at this workshop for the first time. The current Job Card will establish its initial baseline history.
              </p>
            </div>
          ) : (
            matchedJobCards.map((jc, index) => {
              const isExpanded = expandedJcId === jc.id || (index === 0 && expandedJcId === null);
              const parts = jc.partsRequested || jc.partsItems || [];
              const labor = jc.laborItems || [];
              const partsTotal = parts.reduce((acc, p) => acc + (p.totalAmount || (p.quantity * p.unitPrice)), 0);
              const laborTotal = labor.reduce((acc, l) => acc + (l.totalAmount || ((l.hours || 1) * (l.ratePerHour || 1000))), 0);
              const subtotal = partsTotal + laborTotal;
              const vat = Math.round(subtotal * 0.13);
              const gross = subtotal + vat;
              const matchingInvoice = invoices.find(i => i.jobCardId === jc.id || i.jobCardNumber === jc.jobCardNumber);
              const matchingGatePass = gatePasses.find(gp => gp.jobCardNumber === jc.jobCardNumber || gp.vehicleReg === jc.vehicle?.registrationNumber);

              return (
                <div 
                  key={jc.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition"
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedJcId(isExpanded ? '' : jc.id)}
                    className="p-4 bg-slate-50 hover:bg-indigo-50/40 cursor-pointer flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        #{matchedJobCards.length - index}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-slate-900 text-sm">{jc.jobCardNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            jc.status === 'Delivered' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : jc.status === 'Ready for Billing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {jc.status}
                          </span>
                          {jc.isInsuranceClaim && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                              Insurance: {jc.insuranceCompanyName || 'Cashless'}
                            </span>
                          )}
                          {jc.couponNumber && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center space-x-1">
                              <Tag className="w-2.5 h-2.5" />
                              <span>Coupon: {jc.couponNumber}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{jc.serviceType}</span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-700">
                            {(jc.vehicle?.odometerReading || 0).toLocaleString()} km
                          </span>
                          <span>•</span>
                          <span>Date: {jc.arrivalDate || jc.createdAt.slice(0, 10)} {jc.entryTime ? `at ${jc.entryTime}` : ''}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Billed Gross</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          रु. {(gross || 0).toLocaleString()}
                        </span>
                      </div>
                      {matchingInvoice && (
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-emerald-600 uppercase font-bold block">Tax Bill #</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {matchingInvoice.invoiceNumber}
                          </span>
                        </div>
                      )}
                      <button className="text-slate-400 hover:text-slate-600 p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 text-xs bg-white">
                      {/* Customer complaints & observations */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Reported Customer Voice / Scope:</span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {jc.inspection?.generalRemarks || (jc.inspection?.customerVoiceComplaints || []).join('. ') || 'Standard scheduled service check-up.'}
                        </p>
                        <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap gap-x-4">
                          <span>Assigned Bay: <strong className="text-slate-700">{jc.bayNumber}</strong></span>
                          <span>Technician: <strong className="text-slate-700">{jc.assignedTechnicianName || 'Workshop Staff'}</strong></span>
                          {jc.couponNotes && <span>Voucher Notes: <strong className="text-slate-700">{jc.couponNotes}</strong></span>}
                        </div>
                      </div>

                      {/* Spare parts replaced */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h5 className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <Package className="w-3.5 h-3.5 text-teal-600" />
                            <span>Spare Parts Replaced / Fitted ({parts.length})</span>
                          </h5>
                          <span className="font-mono font-bold text-slate-700">Parts Total: रु. {(partsTotal || 0).toLocaleString()}</span>
                        </div>

                        {parts.length === 0 ? (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 text-center text-[11px]">
                            No spare parts replaced during this visit. Only labor and routine inspection performed.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2">Part # / SKU</th>
                                  <th className="p-2">Description</th>
                                  <th className="p-2 text-center">Qty</th>
                                  <th className="p-2 text-right">Unit Price</th>
                                  <th className="p-2 text-right">Amount (NPR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {parts.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-2 font-mono font-bold text-teal-700">{p.partNumber}</td>
                                    <td className="p-2 text-slate-800 font-medium">{p.partName || p.name}</td>
                                    <td className="p-2 text-center font-mono">{p.quantity}</td>
                                    <td className="p-2 text-right font-mono">रु. {(p.unitPrice || 0).toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                                      रु. {(p.totalAmount || (p.quantity * p.unitPrice) || 0).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Labor & Technical Operations */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h5 className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Labor Operations & Diagnostics ({labor.length})</span>
                          </h5>
                          <span className="font-mono font-bold text-slate-700">Labor Total: रु. {(laborTotal || 0).toLocaleString()}</span>
                        </div>

                        {labor.length === 0 ? (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 text-center text-[11px]">
                            No individual labor operations logged.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2">Labor / Service Name</th>
                                  <th className="p-2 text-center">Hours</th>
                                  <th className="p-2 text-right">Hourly Rate</th>
                                  <th className="p-2 text-right">Amount (NPR)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {labor.map((l, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="p-2 text-slate-800 font-medium">{l.description}</td>
                                    <td className="p-2 text-center font-mono">{l.hours || l.hoursEstimated || 1} hrs</td>
                                    <td className="p-2 text-right font-mono">रु. {(l.ratePerHour || 1000).toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                                      रु. {(l.totalAmount || ((l.hours || 1) * (l.ratePerHour || 1000))).toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Delivery & Clearance */}
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 text-slate-500">
                          {matchingGatePass && (
                            <span className="flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Gate Pass #{matchingGatePass.passNumber} Exit Cleared</span>
                            </span>
                          )}
                          {matchingInvoice && (
                            <span className="font-mono text-indigo-700">
                              Bill #{matchingInvoice.invoiceNumber} ({matchingInvoice.paymentMethod} - {matchingInvoice.status})
                            </span>
                          )}
                        </div>

                        {onSelectJobCard && (
                          <button
                            onClick={() => {
                              onClose();
                              onSelectJobCard(jc);
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center space-x-1 shadow-sm transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Open Full Job Card</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs text-slate-500">
          <span>Workshop Lifetime Intelligence & Nepal IRD Compliant History</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
