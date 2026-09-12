import React, { useState } from 'react';
import { X, RotateCcw, CheckCircle2, ShieldAlert, PackageCheck } from 'lucide-react';
import { SparePart, Customer, PartsSalesReturn, PartsSalesOrder } from '../../types';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  customers: Customer[];
  salesOrders?: PartsSalesOrder[];
  onCreateSalesReturn?: (returnData: PartsSalesReturn) => void;
  onNotify: (msg: string) => void;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  parts,
  customers,
  salesOrders = [],
  onCreateSalesReturn,
  onNotify
}) => {
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string>('INV-81-OTC-1024');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer (Kathmandu)');
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitRefundPrice, setUnitRefundPrice] = useState<number>(parts[0]?.sellingPrice || 1000);
  const [reasonCategory, setReasonCategory] = useState<string>('Wrong SKU purchased / customer exchange');
  const [specificReason, setSpecificReason] = useState<string>('Customer purchased incorrect part specification; seals intact.');
  const [isRestockVerified, setIsRestockVerified] = useState<boolean>(true);

  if (!isOpen) return null;

  const handlePartSelect = (partId: string) => {
    setSelectedPartId(partId);
    const p = parts.find(item => item.id === partId);
    if (p) {
      setUnitRefundPrice(p.sellingPrice);
    }
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId !== 'walkin') {
      const c = customers.find(item => item.id === custId);
      if (c) {
        setCustomerName(c.name);
      }
    } else {
      setCustomerName('Walk-in Customer (Kathmandu)');
    }
  };

  const activePart = parts.find(p => p.id === selectedPartId) || parts[0];

  // Price calculations
  const refundSubtotal = unitRefundPrice * quantity;
  const vatRefund = Math.round(refundSubtotal * 0.13 * 100) / 100;
  const totalRefund = refundSubtotal + vatRefund;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activePart) {
      onNotify('Please select a valid part to return');
      return;
    }

    if (quantity <= 0) {
      onNotify('Return quantity must be at least 1');
      return;
    }

    const returnNumber = `RET-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const creditNoteNumber = `CN-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullReason = `${reasonCategory}: ${specificReason}`;

    const returnData: PartsSalesReturn = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      returnNumber,
      originalInvoiceNumber: originalInvoiceNumber.trim() || 'INV-OTC-MANUAL',
      customerId: selectedCustomerId,
      customerName: customerName.trim() || 'Valued Customer',
      date: new Date().toISOString().slice(0, 10),
      reason: fullReason,
      items: [
        {
          partId: activePart.id,
          partName: activePart.name,
          quantity,
          unitPrice: unitRefundPrice,
          vatAmount: vatRefund,
          refundAmount: totalRefund
        }
      ],
      totalRefundAmount: totalRefund,
      creditNoteNumber,
      status: isRestockVerified ? 'Restocked' : 'Approved'
    };

    if (onCreateSalesReturn) {
      onCreateSalesReturn(returnData);
    }

    onNotify(`Return authorized! Credit Note ${creditNoteNumber} generated and ${quantity} ${activePart.unit} restocked.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 text-xs my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Process Spares Return & IRD Credit Note</h3>
              <p className="text-[11px] text-slate-500">
                Authorize return, automatically restock shelf inventory, and issue an IRD-compliant Credit Note.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 py-3 space-y-3.5 shrink grow">
          {/* Reference Invoice / Sales Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Original Invoice / Order #</label>
              <input
                value={originalInvoiceNumber}
                onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-81-OTC-1042"
                className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
              >
                <option value="walkin">Walk-in Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {selectedCustomerId === 'walkin' && (
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white"
                  required
                />
              </div>
            )}
          </div>

          {/* Part Selection & Return Qty */}
          <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-200 space-y-3">
            <span className="font-bold text-slate-800 block">Item Being Returned</span>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Spare Part</label>
              <select
                value={selectedPartId}
                onChange={(e) => handlePartSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-mono focus:ring-2 focus:ring-rose-500"
              >
                {parts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name} (Current Stock: {p.currentStock} {p.unit} | Unit MRP: NPR {p.sellingPrice})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-center"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Refund Unit Price (NPR)</label>
                <input
                  type="number"
                  min="0"
                  value={unitRefundPrice}
                  onChange={(e) => setUnitRefundPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-right"
                  required
                />
              </div>
            </div>
          </div>

          {/* Return Reason */}
          <div className="space-y-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason Category</label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
              >
                <option value="Wrong SKU purchased / customer exchange">Wrong SKU purchased / customer exchange</option>
                <option value="Customer cancelled repair / change of mind">Customer cancelled repair / change of mind</option>
                <option value="Excess unneeded quantity returned from job">Excess unneeded quantity returned from job</option>
                <option value="Defective on unboxing (supplier claim / RMA)">Defective on unboxing (supplier claim / RMA)</option>
                <option value="Part compatibility mismatch with vehicle">Part compatibility mismatch with vehicle</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Inspection Notes / Details</label>
              <textarea
                value={specificReason}
                onChange={(e) => setSpecificReason(e.target.value)}
                rows={2}
                placeholder="Physical condition details..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white"
                required
              />
            </div>
          </div>

          {/* Restock Condition Verification */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="restockCheck"
              checked={isRestockVerified}
              onChange={(e) => setIsRestockVerified(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="restockCheck" className="text-[11px] text-emerald-900 cursor-pointer font-medium">
              <span className="font-bold block">Verified Physical Seal & Immediate Restocking</span>
              Part packaging is intact, original holographic tamper-evident seal is undamaged, and inventory count will be immediately increased by {quantity} {activePart?.unit || 'pcs'}.
            </label>
          </div>

          {/* Refund Breakdown */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-medium">
            <div className="flex justify-between text-slate-600">
              <span>Return Taxable Subtotal:</span>
              <span className="font-mono">NPR {refundSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT Reversal (13%):</span>
              <span className="font-mono text-rose-600 font-semibold">+ NPR {vatRefund.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
              <span>Total Credit Note Amount:</span>
              <span className="font-mono text-rose-700 font-extrabold">NPR {totalRefund.toLocaleString()}</span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Authorize Return & Issue Credit Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
