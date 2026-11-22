import React, { useRef } from 'react';
import { JobCard, PartsQuotation, WorkshopProfile } from '../../types';
import { Printer, X, Share2, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { printElement } from '../../utils/printDocument';

interface PrintQuotationModalProps {
  quotation: PartsQuotation;
  jobCard?: JobCard;
  profile?: WorkshopProfile;
  onClose: () => void;
  onWhatsAppShare?: (quotation: PartsQuotation) => void;
}

export const PrintQuotationModal: React.FC<PrintQuotationModalProps> = ({
  quotation,
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
    printElement(printAreaRef.current, `Quotation-${quotation.quotationNumber}`);
  };

  const handleWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(quotation);
    } else {
      const message = `Namaste ${quotation.customerName}! Here is your Accident Repair Quotation ${quotation.quotationNumber} for vehicle ${quotation.vehicleReg}. Total Estimate: NPR Rs. ${quotation.totalAmount.toLocaleString()}. - ${workshopName}`;
      const cleanPhone = (quotation.customerPhone || '').replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-sky-50 text-[#0F3D5E] border border-sky-200 uppercase tracking-wide flex items-center space-x-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>Repair Quotation</span>
            </span>
            <h2 className="text-sm font-bold text-[#0F172A] font-mono">
              {quotation.quotationNumber}
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
          {/* Workshop Header */}
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
              ACCIDENTAL REPAIR ESTIMATE & QUOTATION 
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Prepared for Insurance Survey & Owner Approval
            </p>
          </div>

          {/* Quotation & Insurance Meta */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 bg-slate-50/70 px-4 rounded-xl mt-3">
            <div>
              <p><strong className="text-slate-500">Quotation No:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{quotation.quotationNumber}</span></p>
              <p><strong className="text-slate-500">Quotation Date:</strong> {quotation.date}</p>
              <p><strong className="text-slate-500">Validity:</strong> 15 Days from date of issue</p>
              <p><strong className="text-slate-500">Job Card Reference:</strong> {quotation.jobCardNumber}</p>
            </div>
            <div>
              <p><strong className="text-slate-500">Insurance Co:</strong> <span className="font-bold text-slate-900">{quotation.insuranceCompany || 'Direct Customer'}</span></p>
              <p><strong className="text-slate-500">Claim Number:</strong> <span className="font-mono font-bold">{quotation.insuranceClaimNumber || 'Pending Claim Registration'}</span></p>
              <p><strong className="text-slate-500">Appointed Surveyor:</strong> {quotation.surveyorName || 'Licensed Insurance Surveyor'}</p>
              <p><strong className="text-slate-500">Survey Date:</strong> {quotation.date}</p>
            </div>
          </div>

          {/* Customer & Vehicle Grid */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-1">
                Customer & Insured Details
              </span>
              <p><strong className="text-slate-500">Insured Name:</strong> <span className="font-bold text-slate-900">{quotation.customerName}</span></p>
              <p><strong className="text-slate-500">Contact Number:</strong> {quotation.customerPhone}</p>
              {quotation.customerPan && <p><strong className="text-slate-500">PAN / VAT:</strong> {quotation.customerPan}</p>}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-1">
                Damaged Vehicle Details
              </span>
              <p><strong className="text-slate-500">Vehicle Reg No:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{quotation.vehicleReg}</span></p>
              <p><strong className="text-slate-500">Brand & Model:</strong> {quotation.vehicleBrand || ''} {quotation.vehicleModel || ''}</p>
              <p><strong className="text-slate-500">VIN / Chassis:</strong> <span className="font-mono text-[11px]">{quotation.vehicleChassis || 'N/A'}</span></p>
            </div>
          </div>

          {/* Quoted Parts & Body Panels */}
          <div className="mt-4">
            <span className="font-bold text-xs text-slate-900 uppercase tracking-wider block mb-2">
              Quoted Replacement Spare Parts & Body Panels
            </span>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5">Part Description & Specifications</th>
                    <th className="p-2.5">OEM / SKU Code</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate (NPR)</th>
                    <th className="p-2.5 text-right">Amount (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotation.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-medium text-slate-900">{item.partName}</td>
                      <td className="p-2.5 font-mono text-teal-700">{item.sku}</td>
                      <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                      <td className="p-2.5 text-right font-mono">Rs. {item.unitPrice.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        Rs. {item.total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals & Split Liabilities */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
              <span className="font-bold text-[11px] text-slate-900 uppercase tracking-wide block border-b border-slate-200 pb-1">
                Insurance Assessment Summary
              </span>
              <div className="flex justify-between text-slate-600">
                <span>Insurer Estimated Share:</span>
                <span className="font-mono font-bold text-indigo-700">
                  Rs. {Math.round(quotation.totalAmount * 0.75).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Customer Deductible & Dep:</span>
                <span className="font-mono font-bold text-slate-800">
                  Rs. {Math.round(quotation.totalAmount * 0.25).toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-2">
                *Final settlement depends on the approved surveyor report and policy clauses.
              </p>
            </div>

            <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount (Excl. VAT):</span>
                <span className="font-mono font-semibold">Rs. {quotation.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold">
                <span>Nepal 13% VAT:</span>
                <span className="font-mono">Rs. {quotation.vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black text-sm border-t-2 border-slate-900 pt-1">
                <span>Gross Quotation Total:</span>
                <span className="font-mono">Rs. {quotation.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Preliminary Estimate Disclaimer */}
          <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[10px] text-amber-950">
            <span className="font-bold block mb-0.5">Disclaimer:</span>
            This quotation is a preliminary estimate based on preliminary vehicle inspection. The final invoice may differ depending on actual hidden damages discovered during dismantling, parts availability, and survey approval.
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 items-end text-center">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs">Vehicle Owner / Insured</p>
              <p className="text-[10px] text-slate-500">{quotation.customerName}</p>
            </div>

            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs">Insurance Surveyor</p>
              <p className="text-[10px] text-slate-500">{quotation.surveyorName || 'Appointed Surveyor'}</p>
            </div>

            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900 text-xs">Authorized Workshop Engineer</p>
              <p className="text-[10px] text-slate-500">For {workshopName}</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
