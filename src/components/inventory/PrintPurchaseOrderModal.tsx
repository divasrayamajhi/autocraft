import React, { useRef } from 'react';
import { PurchaseOrder, WorkshopProfile } from '../../types';
import { Printer, X } from 'lucide-react';
import { printElement } from '../../utils/printDocument';

interface PrintPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  profile?: WorkshopProfile;
}

export const PrintPurchaseOrderModal: React.FC<PrintPurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  profile
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  if (!isOpen || !purchaseOrder) return null;

  const tradingWorkshopName = profile?.name || 'CONTINENTAL AUTO KRAFT';
  const legalEntity = profile?.legalEntityName || tradingWorkshopName;
  const workshopAddress = profile?.address 
    ? `${profile.address}, ${profile.city || 'Kathmandu'}, Nepal`
    : 'Sukedhara-04, Ring Road, Kathmandu, Nepal';
  const workshopPhone = profile?.contactNumber || '+977-1-4378920, 9851099882';
  const workshopPan = profile?.panVatNumber || '609812453';

  const handlePrint = () => {
    printElement(printAreaRef.current, `Purchase-Order-${purchaseOrder.poNumber}`);
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-sky-50 text-[#0F3D5E] border border-sky-200 uppercase tracking-wide">
              Purchase Order
            </span>
            <h2 className="text-sm font-bold text-[#0F172A] font-mono">
              #{purchaseOrder.poNumber}
            </h2>
            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              purchaseOrder.status === 'Received' || purchaseOrder.status === 'Fully Received'
                ? 'bg-green-50 text-[#16A34A]'
                : purchaseOrder.status === 'Ordered'
                  ? 'bg-sky-50 text-[#0284C7]'
                  : 'bg-amber-50 text-[#B45309]'
            }`}>
              {purchaseOrder.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Standard A4 Area */}
        <div className="overflow-y-auto flex-1 bg-[#F1F5F9] p-4 sm:p-6">
          <div ref={printAreaRef} className="a4-sheet p-6 sm:p-8 print:p-0 text-[#0F172A] text-xs bg-[#FFFFFF] border border-[#E2E8F0] print:border-0">
          {/* Centralized Workshop Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">
              {tradingWorkshopName}
            </h1>
            {legalEntity && legalEntity !== tradingWorkshopName && (
              <p className="text-[11px] font-semibold text-slate-600">({legalEntity})</p>
            )}
            <p className="text-xs text-slate-600 mt-0.5">
              {workshopAddress} | Tel: {workshopPhone}
            </p>
            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
              PAN / VAT No.: <span className="text-indigo-800 font-extrabold text-sm">{workshopPan}</span>
            </p>
            <div className="inline-block mt-2 px-5 py-1 border border-slate-800 rounded font-black text-sm uppercase tracking-wider bg-slate-100">
              PURCHASE ORDER 
            </div>
          </div>

          {/* Supplier & PO Meta Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Vendor / Supplier</span>
              <p className="text-sm font-bold text-slate-900">{purchaseOrder.supplierName}</p>
              {purchaseOrder.supplierPanVat && (
                <p><span className="text-slate-500">PAN/VAT:</span> <span className="font-mono font-bold">{purchaseOrder.supplierPanVat}</span></p>
              )}
              {purchaseOrder.supplierContact && (
                <p><span className="text-slate-500">Contact:</span> {purchaseOrder.supplierContact}</p>
              )}
              {purchaseOrder.supplierAddress && (
                <p><span className="text-slate-500">Address:</span> {purchaseOrder.supplierAddress}</p>
              )}
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">PO Particulars</span>
              <p><strong className="text-slate-500">PO Number:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{purchaseOrder.poNumber}</span></p>
              <p><strong className="text-slate-500">Order Date:</strong> {purchaseOrder.date}</p>
              {purchaseOrder.expectedDeliveryDate && (
                <p><strong className="text-slate-500">Expected Delivery:</strong> {purchaseOrder.expectedDeliveryDate}</p>
              )}
              <p><strong className="text-slate-500">Status:</strong> <span className="font-bold">{purchaseOrder.status}</span></p>
              {purchaseOrder.paymentTerms && (
                <p><strong className="text-slate-500">Payment Terms:</strong> {purchaseOrder.paymentTerms}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-4">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-8 text-center">S.N.</th>
                  <th className="p-2 border-r border-slate-300">Part Description</th>
                  <th className="p-2 border-r border-slate-300 font-mono text-center w-28">Part No / SKU</th>
                  <th className="p-2 border-r border-slate-300 text-center w-14">Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right w-24">Rate (NPR)</th>
                  <th className="p-2 border-r border-slate-300 text-right w-24">VAT (13%)</th>
                  <th className="p-2 text-right w-28">Total (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchaseOrder.items.map((item, idx) => {
                  const qty = item.orderedQuantity || item.quantity || 1;
                  const rate = item.unitCost || item.unitPrice || 0;
                  const vat = item.vatAmount || Math.round(qty * rate * 0.13);
                  const total = item.lineTotal || item.total || (qty * rate + vat);

                  return (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{item.partName}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono text-slate-600">{item.partNumber}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">{qty}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">Rs. {rate.toLocaleString()}</td>
                      <td className="p-2 border-r border-slate-200 text-right font-mono">Rs. {vat.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">Rs. {total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="mt-4 flex justify-between items-start pt-2">
            <div className="w-1/2 pr-4">
              {purchaseOrder.notes && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Purchase Instructions & Notes</span>
                  <p className="text-xs text-slate-700 mt-1">{purchaseOrder.notes}</p>
                </div>
              )}
              <div className="mt-2 text-[10px] text-slate-400 italic">
                * All supplied items must match OEM/OES specifications and include original supplier VAT bill.
              </div>
            </div>

            <div className="w-64 space-y-1.5 text-right font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl. VAT):</span>
                <span>Rs. {(purchaseOrder.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nepal VAT (13%):</span>
                <span>Rs. {(purchaseOrder.vatTotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                <span>Grand Total (NPR):</span>
                <span>Rs. {(purchaseOrder.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Standard Signatures & Workshop Stamp Box */}
          <div className="mt-12 pt-6 grid grid-cols-3 gap-8 text-center text-xs border-t border-slate-200">
            <div>
              <div className="border-b border-dashed border-slate-400 pb-8"></div>
              <p className="font-bold text-slate-700 mt-2">Prepared By</p>
              <p className="text-[10px] text-slate-400">Inventory Officer</p>
            </div>
            <div>
              <div className="border-b border-dashed border-slate-400 pb-8"></div>
              <p className="font-bold text-slate-700 mt-2">Verified & Approved By</p>
              <p className="text-[10px] text-slate-400">Workshop Manager</p>
            </div>
            <div>
              <div className="border border-slate-300 rounded-lg p-4 text-[10px] text-slate-400">
                Authorized Workshop Stamp
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};
