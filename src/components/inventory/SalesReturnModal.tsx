import React, { useState, useMemo } from 'react';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  PackageCheck, 
  Plus, 
  Trash2, 
  FileText, 
  Search,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { SparePart, Customer, PartsSalesReturn, PartsSalesOrder, Invoice } from '../../types';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  customers: Customer[];
  salesOrders?: PartsSalesOrder[];
  invoices?: Invoice[];
  onCreateSalesReturn?: (returnData: PartsSalesReturn) => void;
  onNotify: (msg: string) => void;
}

interface ReturnItemEntry {
  partId: string;
  partName: string;
  maxQuantity?: number;
  quantity: number;
  unitPrice: number;
  vatAmount: number;
  refundAmount: number;
  restockBin?: string;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  parts,
  customers,
  salesOrders = [],
  invoices = [],
  onCreateSalesReturn,
  onNotify
}) => {
  const [returnSource, setReturnSource] = useState<'existing_order' | 'manual'>('existing_order');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer (Kathmandu)');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  
  // Return items list
  const [returnItems, setReturnItems] = useState<ReturnItemEntry[]>([
    {
      partId: parts[0]?.id || 'PART-01',
      partName: parts[0]?.name || 'Spare Part',
      quantity: 1,
      unitPrice: parts[0]?.sellingPrice || 1000,
      vatAmount: Math.round((parts[0]?.sellingPrice || 1000) * 0.13),
      refundAmount: Math.round((parts[0]?.sellingPrice || 1000) * 1.13),
      restockBin: parts[0]?.rackLocation || 'Bin-A1'
    }
  ]);

  const [reasonCategory, setReasonCategory] = useState<string>('Wrong SKU purchased / customer exchange');
  const [specificReason, setSpecificReason] = useState<string>('Customer purchased incorrect part specification; seals intact.');
  const [refundPaymentMode, setRefundPaymentMode] = useState<'Cash' | 'Bank Transfer / FonePay' | 'Customer Account Credit'>('Cash');
  const [isRestockVerified, setIsRestockVerified] = useState<boolean>(true);

  // When selecting an existing sales order or invoice
  const handleSelectOrder = (sourceKey: string) => {
    setSelectedOrderId(sourceKey);
    if (!sourceKey) return;

    if (sourceKey.startsWith('PSO-')) {
      const order = salesOrders.find(o => o.id === sourceKey || o.orderNumber === sourceKey);
      if (order) {
        setOriginalInvoiceNumber(order.orderNumber);
        setSelectedCustomerId(order.customerId || 'walkin');
        setCustomerName(order.customerName);
        const matchingCust = customers.find(c => c.id === order.customerId || c.name === order.customerName);
        if (matchingCust) {
          setCustomerPhone(matchingCust.phone);
        }

        // Populate items from the order
        if (order.items && order.items.length > 0) {
          const mappedItems: ReturnItemEntry[] = order.items.map(item => {
            const matchingPart = parts.find(p => p.id === item.partId || p.name === item.name);
            const unitPrice = item.unitPrice || matchingPart?.sellingPrice || 0;
            const qty = 1;
            const taxable = unitPrice * qty;
            const vat = Math.round(taxable * 0.13);
            return {
              partId: item.partId || matchingPart?.id || 'PART-01',
              partName: item.name || matchingPart?.name || 'Spare Part',
              maxQuantity: item.quantity,
              quantity: Math.min(qty, item.quantity),
              unitPrice,
              vatAmount: vat,
              refundAmount: taxable + vat,
              restockBin: matchingPart?.rackLocation || 'Bin-A1'
            };
          });
          setReturnItems(mappedItems);
        }
      }
    } else if (sourceKey.startsWith('INV-') || sourceKey.startsWith('BILL-')) {
      const inv = invoices.find(i => i.id === sourceKey || i.invoiceNumber === sourceKey);
      if (inv) {
        setOriginalInvoiceNumber(inv.invoiceNumber);
        setCustomerName(inv.customerName);
        setCustomerPhone(inv.customerPhone || '');
        const partItems = (inv.items || []).filter(it => it.itemType === 'Part');
        if (partItems.length > 0) {
          const mappedItems: ReturnItemEntry[] = partItems.map(item => {
            const matchingPart = parts.find(p => p.name === item.description || p.partNumber === item.description);
            const unitPrice = item.unitPrice || matchingPart?.sellingPrice || 0;
            const qty = 1;
            const taxable = unitPrice * qty;
            const vat = Math.round(taxable * 0.13);
            return {
              partId: matchingPart?.id || 'PART-01',
              partName: item.description,
              maxQuantity: item.quantity,
              quantity: Math.min(qty, item.quantity),
              unitPrice,
              vatAmount: vat,
              refundAmount: taxable + vat,
              restockBin: matchingPart?.rackLocation || 'Bin-A1'
            };
          });
          setReturnItems(mappedItems);
        }
      }
    }
  };

  const handleItemChange = (index: number, field: keyof ReturnItemEntry, value: any) => {
    const updated = [...returnItems];
    const item = { ...updated[index], [field]: value };

    if (field === 'partId') {
      const part = parts.find(p => p.id === value);
      if (part) {
        item.partName = part.name;
        item.unitPrice = part.sellingPrice;
        item.restockBin = part.rackLocation;
      }
    }

    if (field === 'quantity' && item.maxQuantity && item.quantity > item.maxQuantity) {
      item.quantity = item.maxQuantity;
    }

    const taxable = item.unitPrice * (item.quantity || 0);
    item.vatAmount = Math.round(taxable * 0.13);
    item.refundAmount = taxable + item.vatAmount;
    updated[index] = item;
    setReturnItems(updated);
  };

  const handleAddItem = () => {
    const defaultPart = parts[0];
    const unitPrice = defaultPart?.sellingPrice || 1000;
    const taxable = unitPrice * 1;
    const vat = Math.round(taxable * 0.13);
    setReturnItems([
      ...returnItems,
      {
        partId: defaultPart?.id || 'PART-01',
        partName: defaultPart?.name || 'Spare Part',
        quantity: 1,
        unitPrice,
        vatAmount: vat,
        refundAmount: taxable + vat,
        restockBin: defaultPart?.rackLocation || 'Bin-A1'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (returnItems.length <= 1) {
      onNotify('At least one item must be included in the return');
      return;
    }
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  // Grand totals
  const subtotalRefund = returnItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const totalVatRefund = returnItems.reduce((sum, it) => sum + it.vatAmount, 0);
  const totalRefundAmount = subtotalRefund + totalVatRefund;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (returnItems.length === 0) {
      onNotify('Please specify at least one returned part');
      return;
    }

    for (const it of returnItems) {
      if (!it.quantity || it.quantity <= 0) {
        onNotify(`Quantity for ${it.partName} must be at least 1`);
        return;
      }
      if (it.maxQuantity && it.quantity > it.maxQuantity) {
        onNotify(`Quantity for ${it.partName} cannot exceed original sold amount (${it.maxQuantity})`);
        return;
      }
    }

    const returnNumber = `RET-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const creditNoteNumber = `CN-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullReason = `${reasonCategory}: ${specificReason} | Refund Mode: ${refundPaymentMode}`;

    const returnData: PartsSalesReturn = {
      id: `RET-${Date.now().toString().slice(-4)}`,
      returnNumber,
      originalInvoiceNumber: originalInvoiceNumber.trim() || 'INV-OTC-MANUAL',
      customerId: selectedCustomerId,
      customerName: customerName.trim() || 'Valued Customer',
      date: new Date().toISOString().slice(0, 10),
      reason: fullReason,
      items: returnItems.map(it => ({
        partId: it.partId,
        partName: it.partName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatAmount: it.vatAmount,
        refundAmount: it.refundAmount
      })),
      totalRefundAmount,
      creditNoteNumber,
      status: isRestockVerified ? 'Restocked' : 'Approved'
    };

    if (onCreateSalesReturn) {
      onCreateSalesReturn(returnData);
    }

    const totalQty = returnItems.reduce((s, it) => s + it.quantity, 0);
    onNotify(`Return authorized! IRD Credit Note ${creditNoteNumber} issued, NPR ${totalRefundAmount.toLocaleString()} refunded via ${refundPaymentMode}, and ${totalQty} parts restocked.`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 text-xs my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Process Spare Parts Sales Return</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  IRD Credit Note
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Authorize customer return, reverse 13% VAT, restock physical inventory, and issue official Nepal IRD Credit Note.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 py-3 space-y-4 shrink grow">
          {/* Source Selection Segment */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Reference Invoice / Sales Order</span>
              </span>
              <div className="flex space-x-1 bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setReturnSource('existing_order')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    returnSource === 'existing_order' 
                      ? 'bg-white text-indigo-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Link Existing Order / Bill
                </button>
                <button
                  type="button"
                  onClick={() => setReturnSource('manual')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    returnSource === 'manual' 
                      ? 'bg-white text-indigo-900 shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Manual / Walk-in Receipt
                </button>
              </div>
            </div>

            {returnSource === 'existing_order' ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Select Order or Invoice to Return Against:
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => handleSelectOrder(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                  required
                >
                  <option value="">-- Choose Sales Order or Tax Invoice --</option>
                  <optgroup label="OTC Sales Orders">
                    {salesOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} • {o.customerName} • NPR {o.grandTotal.toLocaleString()} ({o.items?.length || 0} items)
                      </option>
                    ))}
                  </optgroup>
                  {invoices.length > 0 && (
                    <optgroup label="Workshop Tax Invoices">
                      {invoices.filter(i => i.type !== 'Credit Note').map(i => (
                        <option key={i.id} value={i.id}>
                          {i.invoiceNumber} • {i.customerName} ({i.vehicleReg}) • NPR {i.grandTotal.toLocaleString()}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Original Invoice #</label>
                  <input
                    value={originalInvoiceNumber}
                    onChange={(e) => setOriginalInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-81-OTC-1092"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Selection</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedCustomerId(id);
                      if (id !== 'walkin') {
                        const found = customers.find(c => c.id === id);
                        if (found) {
                          setCustomerName(found.name);
                          setCustomerPhone(found.phone);
                        }
                      } else {
                        setCustomerName('Walk-in Customer (Kathmandu)');
                        setCustomerPhone('');
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    <option value="walkin">Walk-in Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Customer Summary Card */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer Name</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="font-bold text-slate-800 bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-400"
                  placeholder="Customer Full Name"
                  required
                />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Phone</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="font-mono text-slate-600 bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-400"
                  placeholder="+977-98..."
                />
              </div>
            </div>
          </div>

          {/* Returned Items Table */}
          <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Items Being Returned for Restock & Refund</span>
                <span className="text-[10px] text-slate-500">
                  Select parts to return, verify quantities, and specify restocking shelf locations.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {returnItems.map((item, index) => (
                <div key={index} className="p-3 bg-white rounded-xl border border-rose-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs">Item #{index + 1}</span>
                    {returnItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Part Catalog</label>
                      <select
                        value={item.partId}
                        onChange={(e) => handleItemChange(index, 'partId', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 outline-none bg-white font-mono text-xs focus:ring-1 focus:ring-rose-500"
                      >
                        {parts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name} (Stock: {p.currentStock} {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        Return Qty {item.maxQuantity ? `(Max ${item.maxQuantity})` : ''}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={item.maxQuantity || 999}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 outline-none text-center font-bold font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Rate (NPR)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 outline-none text-right font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 text-right">
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Total Refund</label>
                      <span className="font-mono font-bold text-rose-700 text-xs block py-1.5">
                        रु. {item.refundAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-1 text-[11px] text-slate-500">
                    <span>Restock Target Shelf:</span>
                    <input
                      value={item.restockBin || ''}
                      onChange={(e) => handleItemChange(index, 'restockBin', e.target.value)}
                      placeholder="e.g. Bin-A1-04"
                      className="border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[10px] w-24 uppercase"
                    />
                    <span className="text-slate-400">• Includes 13% VAT: रु. {item.vatAmount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reason & Refund Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Return Reason Category</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Refund Settlement Mode</label>
              <select
                value={refundPaymentMode}
                onChange={(e) => setRefundPaymentMode(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
              >
                <option value="Cash">Cash Payout from Workshop Till</option>
                <option value="Bank Transfer / FonePay">Bank Transfer / FonePay</option>
                <option value="Customer Account Credit">Customer Account Credit Note Ledger</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Inspection & Quality Assessment Notes</label>
              <textarea
                value={specificReason}
                onChange={(e) => setSpecificReason(e.target.value)}
                rows={2}
                placeholder="Physical condition details, seal status, engineer inspection report..."
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white"
                required
              />
            </div>
          </div>

          {/* Restock Verification Toggle */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="restockCheck"
              checked={isRestockVerified}
              onChange={(e) => setIsRestockVerified(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="restockCheck" className="text-[11px] text-emerald-900 cursor-pointer font-medium">
              <span className="font-bold block">Verified Physical Packaging & Immediate Restocking</span>
              Part packaging is intact, tamper seals verified, and shelf inventory count will be immediately increased by {returnItems.reduce((s, it) => s + it.quantity, 0)} total pcs.
            </label>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-medium">
            <div className="flex justify-between text-slate-600">
              <span>Return Taxable Subtotal:</span>
              <span className="font-mono">रु. {subtotalRefund.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Nepal 13% VAT Reversal:</span>
              <span className="font-mono text-rose-600 font-semibold">+ रु. {totalVatRefund.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
              <span>Total IRD Credit Note Value:</span>
              <span className="font-mono text-rose-700 font-black text-base">रु. {totalRefundAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Authorize Return & Generate Credit Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
