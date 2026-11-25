import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, QrCode } from 'lucide-react';
import { PartsQuotation, PartsSalesOrder, PartsSalesReturn, WorkshopProfile } from '../../types';
import { printElement } from '../../utils/printDocument';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

interface InventoryDocSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation?: PartsQuotation | null;
  salesOrder?: PartsSalesOrder | null;
  salesReturn?: PartsSalesReturn | null;
  profile?: WorkshopProfile;
}

export const InventoryDocSlipModal: React.FC<InventoryDocSlipModalProps> = ({
  isOpen,
  onClose,
  quotation,
  salesOrder,
  salesReturn,
  profile
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  useEscapeKey(isOpen, onClose);
  if (!isOpen) return null;

  const workshopName = profile?.name || profile?.legalEntityName || 'CONTINENTAL AUTO KRAFT';
  const workshopAddress = profile?.address ? `${profile.address}, ${profile.city || 'Kathmandu'}, Nepal` : 'Ring Road Sukedhara, Kathmandu, Nepal';
  const workshopPan = profile?.panVatNumber || '609812453';
  const workshopPhone = profile?.contactNumber || '+977-1-4370000';

  const docTitle = quotation
    ? `Quotation-${quotation.quotationNumber}`
    : salesOrder
      ? `Sales-Order-${salesOrder.orderNumber}`
      : salesReturn
        ? `Credit-Note-${salesReturn.creditNoteNumber}`
        : 'Inventory-Document';

  const handlePrint = () => {
    printElement(printAreaRef.current, docTitle);
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-lg w-full p-5 border border-[#E2E8F0] text-xs my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="print:hidden flex items-center justify-between pb-3 border-b border-[#E2E8F0] shrink-0">
          <h3 className="text-sm font-bold text-[#0F172A]">
            {quotation && 'Spare Parts Quotation / Pro-Forma Slip'}
            {salesOrder && 'OTC Spares Sales Order & Dispatch Challan'}
            {salesReturn && 'IRD Credit Note / Return Voucher'}
          </h3>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold rounded-lg flex items-center space-x-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button onClick={onClose} className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F1F5F9]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable) */}
        <div ref={printAreaRef} className="a4-sheet overflow-y-auto py-4 space-y-4 font-mono shrink grow text-[#0F172A] bg-[#FFFFFF]">
          {/* Workshop Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-black tracking-tight text-slate-900 font-sans uppercase">
              {workshopName}
            </h2>
            <p className="text-[11px] text-slate-500">{workshopAddress}</p>
            <p className="text-[11px] text-slate-500">PAN / VAT Reg: <span className="font-bold text-slate-800">{workshopPan}</span> | Ph: {workshopPhone}</p>
          </div>

          {/* Quotation View */}
          {quotation && (
            <>
              <div className="flex justify-between text-[11px] py-1">
                <div>
                  <span className="text-slate-400 block">QUOTATION #:</span>
                  <span className="font-bold text-slate-900">{quotation.quotationNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">DATE:</span>
                  <span>{quotation.date}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block">CLIENT / VEHICLE:</span>
                <span className="font-bold text-slate-900 text-xs block">{quotation.customerName}</span>
                {(quotation.vehicleReg || quotation.vehicleModel) && (
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    {quotation.vehicleReg}{quotation.vehicleModel ? ` • ${quotation.vehicleModel}` : ''}
                    {quotation.jobCardNumber ? ` • JC: ${quotation.jobCardNumber}` : ''}
                  </span>
                )}
              </div>

              {quotation.items.length > 0 && (
                <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-1">Part SKU / Description</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotation.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5">
                          <span className="font-bold block">{item.partName}</span>
                          <span className="text-[10px] text-slate-400">{item.sku}</span>
                        </td>
                        <td className="py-1.5 text-center">{item.quantity}</td>
                        <td className="py-1.5 text-right font-mono">NPR {item.unitPrice.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-mono font-bold">NPR {item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {quotation.laborItems && quotation.laborItems.length > 0 && (
                <table className="w-full text-left text-[11px]">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-1">Labor / Bodywork Operation</th>
                      <th className="py-1 text-center">Hrs</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotation.laborItems.map((lab, i) => (
                      <tr key={i}>
                        <td className="py-1.5">
                          <span className="font-bold block">{lab.description}</span>
                          <span className="text-[10px] text-slate-400">{lab.category}</span>
                        </td>
                        <td className="py-1.5 text-center">{lab.hours}</td>
                        <td className="py-1.5 text-right font-mono">NPR {lab.rate.toLocaleString()}</td>
                        <td className="py-1.5 text-right font-mono font-bold">NPR {lab.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="pt-2 border-t border-slate-200 space-y-1 text-right text-[11px]">
                <div>Subtotal: NPR {quotation.subtotal.toLocaleString()}</div>
                <div>Nepal VAT (13%): NPR {quotation.vatAmount.toLocaleString()}</div>
                <div className="font-bold text-sm text-teal-800 pt-1 border-t border-slate-200">
                  Total Estimate: NPR {quotation.grandTotal.toLocaleString()}
                </div>
              </div>

              {/* Preliminary Quotation Disclaimer */}
              <div className="mt-3 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 leading-relaxed font-sans text-left">
                <span className="font-bold block text-amber-950 mb-0.5">ESTIMATE & QUOTATION DISCLAIMER</span>
                Note: The quotation is a preliminary estimate based on the inspection of the vehicle. The final invoice may differ from the quoted amount, as the quotation is an estimated cost and may be subject to change depending on the actual work and parts required.
              </div>
            </>
          )}

          {/* Sales Order View */}
          {salesOrder && (
            <>
              <div className="flex justify-between text-[11px] py-1">
                <div>
                  <span className="text-slate-400 block">ORDER #:</span>
                  <span className="font-bold text-slate-900">{salesOrder.orderNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">DATE:</span>
                  <span>{salesOrder.date}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] block">DISPATCHED TO:</span>
                  <span className="font-bold text-slate-900 text-xs">{salesOrder.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {salesOrder.dispatchStatus}
                  </span>
                </div>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-1">Part Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesOrder.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5">
                        <span className="font-bold block">{item.partName}</span>
                        <span className="text-[10px] text-slate-400">{item.sku}</span>
                      </td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">NPR {item.unitPrice.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-mono font-bold">NPR {item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-slate-200 space-y-1 text-right text-[11px]">
                <div>Subtotal: NPR {salesOrder.subtotal.toLocaleString()}</div>
                <div>Nepal VAT (13%): NPR {salesOrder.vatAmount.toLocaleString()}</div>
                <div className="font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                  Grand Total: NPR {salesOrder.grandTotal.toLocaleString()}
                </div>
              </div>
            </>
          )}

          {/* Sales Return / Credit Note View */}
          {salesReturn && (
            <>
              <div className="flex justify-between text-[11px] py-1 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                <div>
                  <span className="text-rose-500 font-bold block">CREDIT NOTE #:</span>
                  <span className="font-bold text-rose-900 text-sm">{salesReturn.creditNoteNumber}</span>
                  <span className="text-[10px] text-slate-500 block">Return ID: {salesReturn.returnNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">ORIGINAL INV:</span>
                  <span className="font-bold text-slate-900">{salesReturn.originalInvoiceNumber}</span>
                  <span className="text-[10px] text-slate-500 block">{salesReturn.date}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 text-[10px] block">RETURNED BY:</span>
                <span className="font-bold text-slate-900 text-xs">{salesReturn.customerName}</span>
                <div className="mt-1 text-[11px] text-slate-600">
                  <span className="font-semibold">Reason: </span>
                  {salesReturn.reason}
                </div>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-1">Returned Part</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Unit Rate</th>
                    <th className="py-1 text-right">Refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReturn.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-bold">{item.partName}</td>
                      <td className="py-1.5 text-center">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">NPR {item.unitPrice.toLocaleString()}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-rose-700">
                        NPR {item.refundAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-slate-200 space-y-1 text-right text-[11px]">
                <div>Subtotal Reversal: NPR {Math.round(salesReturn.totalRefundAmount / 1.13).toLocaleString()}</div>
                <div className="text-rose-600 font-medium">Nepal VAT (13%) Reversal: NPR {(salesReturn.totalRefundAmount - Math.round(salesReturn.totalRefundAmount / 1.13)).toLocaleString()}</div>
                <div className="font-bold text-sm text-rose-700 pt-1 border-t border-slate-200">
                  Total Credit Amount: NPR {salesReturn.totalRefundAmount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Inventory status: <span className="font-bold text-emerald-700">Restocked to Shelves</span> • IRD CBMS Logged
                </div>
              </div>
            </>
          )}

          {/* IRD Verification Footer */}
          <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center space-x-1">
              <QrCode className="w-7 h-7 text-slate-800" />
              <span>Verified System Document • Inland Revenue Dept Compliance</span>
            </div>
            <span>Authorized Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
};
