import React, { useRef } from 'react';
import { JobCard, PartsQuotation, WorkshopProfile } from '../../types';
import { Printer, X, Share2, FileSpreadsheet } from 'lucide-react';
import { printElement } from '../../utils/printDocument';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

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
  useEscapeKey(true, onClose);

  const workshopName = profile?.name || 'AutoCraft Pro Workshop';
  const legalEntity = profile?.legalEntityName || workshopName;
  const workshopAddress = profile?.address
    ? `${profile.address}, ${profile.city || ''}, Nepal`
    : 'Kathmandu, Nepal';
  const workshopPhone = profile?.contactNumber || '+977-1-4378920';
  const workshopPan = profile?.panVatNumber || '609812453';

  const grandTotal = quotation.grandTotal ?? (quotation as any).totalAmount ?? 0;
  const laborItems = quotation.laborItems || [];
  const vehicleBrand = quotation.vehicleMake || (quotation as any).vehicleBrand || jobCard?.vehicle?.brand || '';
  const vehicleModel = quotation.vehicleModel || jobCard?.vehicle?.model || '';
  const vehicleChassis = quotation.vinNumber || (quotation as any).vehicleChassis || jobCard?.vehicle?.vinNumber || jobCard?.vehicle?.chassisNumber || 'N/A';

  const handlePrint = () => {
    printElement(printAreaRef.current, `Quotation-${quotation.quotationNumber}`);
  };

  const handleWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(quotation);
    } else {
      const message = `Namaste ${quotation.customerName}! Here is your Repair Quotation ${quotation.quotationNumber} for vehicle ${quotation.vehicleReg || ''}. Total Estimate: NPR Rs. ${grandTotal.toLocaleString()}. - ${workshopName}`;
      const cleanPhone = (quotation.customerPhone || '').replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
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
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
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
            <div className="text-center pb-4 border-b-2 border-[#0F3D5E]">
              <h1 className="text-xl font-black text-[#0F172A] tracking-wide uppercase">
                {legalEntity}
              </h1>
              {profile?.name && profile.name !== legalEntity && (
                <p className="text-xs font-bold text-[#334155] tracking-wider uppercase">
                  Trading as: {profile.name}
                </p>
              )}
              <p className="text-xs text-[#64748B] mt-0.5">
                {workshopAddress} | Phone: {workshopPhone}
              </p>
              <p className="text-xs font-mono font-bold text-[#0F172A] mt-0.5">
                PAN / VAT Registration No.: <span className="text-[#0F3D5E] font-extrabold text-sm">{workshopPan}</span>
              </p>
              <div className="inline-block mt-3 px-6 py-1.5 border-2 border-[#0F3D5E] rounded font-black text-sm uppercase tracking-wider bg-[#F1F5F9] text-[#0F3D5E]">
                VEHICLE REPAIR ESTIMATE &amp; QUOTATION
              </div>
              <p className="text-[10px] text-[#64748B] mt-1">
                Preliminary Workshop Estimate for Customer Approval
              </p>
            </div>

            {/* Quotation Meta */}
            <div className="grid grid-cols-2 gap-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 rounded-xl mt-3">
              <div>
                <p><strong className="text-[#64748B]">Quotation No:</strong> <span className="font-mono font-bold text-[#0F172A] text-sm">{quotation.quotationNumber}</span></p>
                <p><strong className="text-[#64748B]">Quotation Date:</strong> <span className="font-mono">{quotation.date}</span></p>
              </div>
              <div className="text-right">
                <p><strong className="text-[#64748B]">Job Card Reference:</strong> <span className="font-mono font-bold text-[#0F3D5E]">{quotation.jobCardNumber || 'N/A'}</span></p>
                <p><strong className="text-[#64748B]">Status:</strong> <span className="font-semibold text-[#0F172A]">{quotation.status}</span></p>
              </div>
            </div>

            {/* Customer & Vehicle Grid */}
            <div className="grid grid-cols-2 gap-4 py-3 border-b border-[#E2E8F0]">
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[11px] text-[#0F172A] uppercase tracking-wide block border-b border-[#E2E8F0] pb-1">
                  Customer Details
                </span>
                <p><strong className="text-[#64748B]">Customer Name:</strong> <span className="font-bold text-[#0F172A]">{quotation.customerName}</span></p>
                <p><strong className="text-[#64748B]">Contact Number:</strong> <span className="font-mono">{quotation.customerPhone || 'N/A'}</span></p>
              </div>

              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1">
                <span className="font-bold text-[11px] text-[#0F172A] uppercase tracking-wide block border-b border-[#E2E8F0] pb-1">
                  Vehicle Details
                </span>
                <p><strong className="text-[#64748B]">Vehicle Reg No:</strong> <span className="font-mono font-bold text-[#0F172A] text-sm">{quotation.vehicleReg || 'N/A'}</span></p>
                <p><strong className="text-[#64748B]">Brand &amp; Model:</strong> {vehicleBrand} {vehicleModel}</p>
                <p><strong className="text-[#64748B]">VIN / Chassis:</strong> <span className="font-mono text-[11px]">{vehicleChassis}</span></p>
              </div>
            </div>

            {/* Quoted Parts */}
            {quotation.items.length > 0 && (
              <div className="mt-4">
                <span className="font-bold text-xs text-[#0F172A] uppercase tracking-wider block mb-2">
                  1. Quoted Replacement Spare Parts
                </span>
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[#334155] font-bold">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Part Description &amp; Specifications</th>
                        <th className="p-2.5">Part # / SKU</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Rate (NPR)</th>
                        <th className="p-2.5 text-right">Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {quotation.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 text-center font-mono text-[#64748B]">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-[#0F172A]">{item.partName}</td>
                          <td className="p-2.5 font-mono text-[#0284C7]">{item.sku}</td>
                          <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">Rs. {item.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#0F172A]">
                            Rs. {item.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quoted Labor */}
            {laborItems.length > 0 && (
              <div className="mt-4">
                <span className="font-bold text-xs text-[#0F172A] uppercase tracking-wider block mb-2">
                  {quotation.items.length > 0 ? '2.' : '1.'} Estimated Labor, Denting &amp; Paint Operations
                </span>
                <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F1F5F9] border-b border-[#E2E8F0] text-[#334155] font-bold">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5">Labor / Repair Operation</th>
                        <th className="p-2.5 text-right">Amount (NPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {laborItems.map((l, idx) => (
                        <tr key={l.id || idx}>
                          <td className="p-2.5 text-center font-mono text-[#64748B]">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-[#0F172A]">{l.description}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#0F172A]">
                            Rs. {l.totalAmount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Financial Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-full sm:w-80 border border-[#CBD5E1] rounded-xl p-3.5 bg-[#F8FAFC] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#64748B]">
                  <span>Taxable Amount (Excl. VAT):</span>
                  <span className="font-mono font-semibold text-[#0F172A]">Rs. {quotation.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#0284C7] font-bold">
                  <span>Nepal 13% VAT:</span>
                  <span className="font-mono">Rs. {quotation.vatAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#0F172A] font-black text-sm border-t-2 border-[#0F3D5E] pt-1.5">
                  <span>Gross Quotation Total:</span>
                  <span className="font-mono text-[#0F3D5E]">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Preliminary Estimate Disclaimer */}
            <div className="mt-4 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[10px] text-amber-950">
              <span className="font-bold block mb-0.5">Note:</span>
              This quotation is a preliminary estimate based on the inspection of the vehicle. The final invoice may differ from the quoted amount depending on actual hidden damages discovered during work and parts required.
            </div>

            {/* Signatures */}
            <div className="mt-8 pt-4 border-t border-[#CBD5E1] grid grid-cols-2 gap-8 items-end text-center signature-block">
              <div>
                <div className="h-12 border-b border-dashed border-[#94A3B8] mb-2"></div>
                <p className="font-bold text-[#0F172A] text-xs">Vehicle Owner / Customer</p>
                <p className="text-[10px] text-[#64748B]">{quotation.customerName}</p>
              </div>

              <div>
                <div className="h-12 border-b border-dashed border-[#94A3B8] mb-2"></div>
                <p className="font-bold text-[#0F172A] text-xs">Authorized Workshop Engineer</p>
                <p className="text-[10px] text-[#64748B]">For {workshopName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
