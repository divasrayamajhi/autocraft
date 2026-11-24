import React, { useRef } from 'react';
import { JobCard, WorkshopProfile } from '../../types';
import { Printer, X, Share2, Wrench, Car, User, Calendar, Clock, CheckCircle2, Shield } from 'lucide-react';
import { printElement } from '../../utils/printDocument';
import { useEscapeKey, usePrintShortcut } from '../../hooks/useKeyboardShortcuts';

interface PrintJobCardModalProps {
  jobCard: JobCard;
  profile?: WorkshopProfile;
  onClose: () => void;
  onWhatsAppShare?: (jobCard: JobCard) => void;
}

export const PrintJobCardModal: React.FC<PrintJobCardModalProps> = ({
  jobCard,
  profile,
  onClose,
  onWhatsAppShare
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const workshopName = profile?.name || 'CONTINENTAL AUTO KRAFT';
  const legalEntity = profile?.legalEntityName || workshopName;
  const workshopAddress = profile?.address 
    ? `${profile.address}, ${profile.city || ''}, Nepal`
    : 'Sukedhara-04, Ring Road, Kathmandu, Nepal';
  const workshopPhone = profile?.contactNumber || '+977-1-4378920, 9851099882';
  const workshopPan = profile?.panVatNumber || '609812453';

  const handlePrint = () => {
    printElement(printAreaRef.current, `Job-Card-${jobCard.jobCardNumber}`);
  };

  useEscapeKey(true, onClose);
  usePrintShortcut(true, handlePrint);

  const handleWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(jobCard);
    } else {
      const message = `Namaste ${jobCard.customerName}! Your vehicle ${jobCard.vehicleReg} has been checked in for service. Job Card: ${jobCard.jobCardNumber}. Service Advisor: ${jobCard.serviceAdvisor || 'Advisor'}. Estimated delivery: ${jobCard.estimatedCompletion || 'As discussed'}. - ${workshopName}`;
      const cleanPhone = (jobCard.customerPhone || '').replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // Calculate financials for estimation
  const partsList = jobCard.partsRequested || jobCard.partsItems || [];
  const partsTotal = partsList.reduce((acc, p) => acc + ((p.quantity || 1) * (p.unitPrice || 0)), 0);
  
  const laborList = jobCard.servicesRequested || jobCard.laborItems || [];
  const laborTotal = laborList.reduce((acc, l) => acc + (l.price || l.cost || 0), 0);
  
  const subtotal = partsTotal + laborTotal;
  const vat = Math.round(subtotal * 0.13);
  const grandTotal = subtotal + vat;

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-sky-50 text-[#0F3D5E] border border-sky-200 uppercase tracking-wide flex items-center space-x-1">
              <Wrench className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Workshop Job Card</span>
            </span>
            <h2 className="text-sm font-bold text-[#0F172A] font-mono">
              {jobCard.jobCardNumber}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area (A4 layout) */}
        <div className="overflow-y-auto flex-1 bg-[#F1F5F9] p-4 sm:p-6">
          <div ref={printAreaRef} className="a4-sheet p-6 sm:p-8 print:p-0 text-[#0F172A] text-xs bg-[#FFFFFF] border border-[#E2E8F0] print:border-0">
          {/* Workshop Header from Settings Profile */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">
              {legalEntity}
            </h1>
            {profile?.name && profile.name !== legalEntity && (
              <p className="text-xs font-bold text-slate-700 tracking-wider uppercase">
                Trading as: {profile.name}
              </p>
            )}
            <p className="text-xs text-slate-600 mt-0.5">
              {workshopAddress} | Phone: {workshopPhone}
            </p>
            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
              PAN / VAT Registration No.: <span className="text-indigo-800 font-extrabold text-sm">{workshopPan}</span>
            </p>
            <div className="inline-block mt-3 px-6 py-1.5 border-2 border-slate-900 rounded font-black text-sm uppercase tracking-wider bg-slate-100">
              WORKSHOP REPAIR JOB CARD & ESTIMATE 
            </div>
          </div>

          {/* Job Card Meta & Dates */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 bg-slate-50/70 px-4 rounded-xl mt-3">
            <div>
              <p><strong className="text-slate-500">Job Card No:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{jobCard.jobCardNumber}</span></p>
              <p><strong className="text-slate-500">Arrival Date & Time:</strong> {jobCard.arrivalDate || jobCard.createdAt.slice(0, 10)} {jobCard.arrivalTime || ''}</p>
              <p><strong className="text-slate-500">Service Advisor:</strong> {jobCard.serviceAdvisor || 'Chief Service Engineer'}</p>
              <p><strong className="text-slate-500">Assigned Bay:</strong> {jobCard.assignedBay || jobCard.bayNumber || 'Bay 01'}</p>
            </div>
            <div>
              <p><strong className="text-slate-500">Status:</strong> <span className="font-bold uppercase text-slate-900">{jobCard.status}</span></p>
              <p><strong className="text-slate-500">Service Category:</strong> {jobCard.serviceType || 'Periodic Maintenance'}</p>
              <p><strong className="text-slate-500">Est. Delivery:</strong> {jobCard.estimatedCompletion || 'Standard Schedule'}</p>
              <p><strong className="text-slate-500">Lead Technician:</strong> {jobCard.assignedTechnician || jobCard.technicianName || 'Master Tech'}</p>
            </div>
          </div>

          {/* Customer & Vehicle Intelligence Grid */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-1">
                Customer Details 
              </span>
              <p><strong className="text-slate-500">Name:</strong> <span className="font-bold text-slate-900">{jobCard.customerName}</span></p>
              <p><strong className="text-slate-500">Mobile Phone:</strong> {jobCard.customerPhone}</p>
              {jobCard.customerPan && <p><strong className="text-slate-500">PAN / VAT:</strong> {jobCard.customerPan}</p>}
              <p><strong className="text-slate-500">Address:</strong> {jobCard.customerAddress || 'Kathmandu Valley, Nepal'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-1">
                Vehicle Details 
              </span>
              <p><strong className="text-slate-500">Registration No:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{jobCard.vehicleReg}</span></p>
              <p><strong className="text-slate-500">Make & Model:</strong> {jobCard.vehicleBrand || ''} {jobCard.vehicleModel || ''}</p>
              <p><strong className="text-slate-500">Chassis / VIN:</strong> <span className="font-mono text-[11px]">{jobCard.vehicleChassis || jobCard.vinNumber || 'N/A'}</span></p>
              <div className="flex justify-between text-[11px] pt-1">
                <span><strong className="text-slate-500">Odometer:</strong> {jobCard.odometerIn?.toLocaleString() || jobCard.currentOdometer?.toLocaleString() || 'N/A'} km</span>
                <span><strong className="text-slate-500">Fuel Level:</strong> {jobCard.fuelLevel || '1/2 Tank'}</span>
              </div>
            </div>
          </div>

          {/* Reported Complaints / Customer Voice */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block mb-1.5">
              Customer Reported Complaints & Demanded Jobs 
            </span>
            {Array.isArray(jobCard.demandedJobs || jobCard.complaints) && (jobCard.demandedJobs || jobCard.complaints).length > 0 ? (
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {(jobCard.demandedJobs || jobCard.complaints).map((c: any, i: number) => (
                  <li key={i}>{typeof c === 'string' ? c : c.description || c.complaint}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-600 italic">
                {jobCard.customerInstructions || jobCard.notes || 'Routine general inspection, lubricant service, safety brake overhaul, and road test.'}
              </p>
            )}
          </div>

          {/* Vehicle Inventory & Check-in Inspection */}
          <div className="mt-3 p-3 border border-slate-200 rounded-xl bg-white">
            <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block mb-1.5">
              Receiving Inspection & Vehicle Inventory Check
            </span>
            <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-700">
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-flex items-center justify-center font-bold text-[9px]">✓</span>
                <span>Spare Tyre Present</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-flex items-center justify-center font-bold text-[9px]">✓</span>
                <span>Jack & Tool Kit</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-flex items-center justify-center font-bold text-[9px]">✓</span>
                <span>Vehicle Bluebook </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-sm inline-flex items-center justify-center font-bold text-[9px]">✓</span>
                <span>Floor Mats / Audio</span>
              </div>
            </div>
            {jobCard.scratchNotes && (
              <p className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                <strong>Pre-existing Scratch/Dent Marks Noted:</strong> {jobCard.scratchNotes}
              </p>
            )}
          </div>

          {/* Estimated Parts & Labor Tables */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parts Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 flex justify-between">
                <span>Spare Parts & Consumables</span>
                <span className="font-mono">Rs. {partsTotal.toLocaleString()}</span>
              </div>
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2">Part Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                        Subject to inspection disassembly
                      </td>
                    </tr>
                  ) : (
                    partsList.map((p, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{p.partName || p.name}</td>
                        <td className="p-2 text-center font-mono">{p.quantity || 1}</td>
                        <td className="p-2 text-right font-mono">Rs. {(p.unitPrice || 0).toLocaleString()}</td>
                        <td className="p-2 text-right font-mono font-bold">
                          Rs. {((p.quantity || 1) * (p.unitPrice || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Labor Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 flex justify-between">
                <span>Labor & Mechanical Services</span>
                <span className="font-mono">Rs. {laborTotal.toLocaleString()}</span>
              </div>
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-2">Operation Description</th>
                    <th className="p-2 text-right">Estimated Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {laborList.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-3 text-center text-slate-400 italic">
                        Standard diagnostics & service operation
                      </td>
                    </tr>
                  ) : (
                    laborList.map((l, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-medium">{l.description || l.name || l.serviceName}</td>
                        <td className="p-2 text-right font-mono font-bold">
                          Rs. {(l.price || l.cost || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Estimate Summary */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Parts & Materials:</span>
                <span className="font-mono font-semibold">Rs. {partsTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Labor Operations:</span>
                <span className="font-mono font-semibold">Rs. {laborTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200 pt-1">
                <span>Taxable Amount:</span>
                <span className="font-mono">Rs. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold">
                <span>Nepal 13% VAT:</span>
                <span className="font-mono">Rs. {vat.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm border-t-2 border-slate-900 pt-1">
                <span>Est. Grand Total:</span>
                <span className="font-mono">Rs. {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Workshop Terms & Customer Declaration */}
          <div className="mt-4 p-3 border border-slate-200 rounded-xl bg-slate-50/70 text-[10px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 uppercase tracking-wider">
              Terms of Service & Customer Authorization :
            </p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>I hereby authorize the above repair work along with necessary materials. Permission is granted to drive the vehicle on streets for testing and inspection.</li>
              <li>The workshop is not liable for loss or damage to the vehicle in case of fire, theft, or unforeseen damages beyond reasonable control.</li>
              <li>Any additional defects discovered during disassembly will be quoted separately before proceeding.</li>
              <li>Vehicles must be collected within 7 days of completion notice, otherwise demurrage storage charges may apply.</li>
            </ol>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 items-end">
            <div className="text-center">
              <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs">Customer Signature & Approval</p>
              <p className="text-[10px] text-slate-500">Name: {jobCard.customerName}</p>
            </div>

            <div className="text-center">
              <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs">Authorized Service Advisor / Manager</p>
              <p className="text-[10px] text-slate-500">For {workshopName}</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
