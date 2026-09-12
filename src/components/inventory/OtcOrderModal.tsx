import React, { useState } from 'react';
import { X, Plus, Trash2, ShoppingBag, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { SparePart, Customer, PartsQuotation, PartsSalesOrder, PartsQuotationItem } from '../../types';

interface OtcOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  customers: Customer[];
  onCreateQuotation?: (quotation: PartsQuotation) => void;
  onCreateSalesOrder?: (order: PartsSalesOrder) => void;
  onNotify: (msg: string) => void;
}

export const OtcOrderModal: React.FC<OtcOrderModalProps> = ({
  isOpen,
  onClose,
  parts,
  customers,
  onCreateQuotation,
  onCreateSalesOrder,
  onNotify
}) => {
  const [docType, setDocType] = useState<'order' | 'quotation'>('order');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [walkinName, setWalkinName] = useState<string>('Walk-in Customer (Kathmandu)');
  const [walkinPhone, setWalkinPhone] = useState<string>('+977-98');
  const [pricingTier, setPricingTier] = useState<'Retail' | 'Fleet' | 'Insurance' | 'Wholesale'>('Retail');

  // Active line item selection
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);

  // Cart
  const [cartItems, setCartItems] = useState<PartsQuotationItem[]>([]);

  if (!isOpen) return null;

  // Selected customer object
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Discount % based on tier
  const getTierDiscountPercent = (tier: string) => {
    switch (tier) {
      case 'Fleet': return 10;
      case 'Insurance': return 5;
      case 'Wholesale': return 15;
      default: return 0;
    }
  };

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId !== 'walkin') {
      const cust = customers.find(c => c.id === custId);
      if (cust?.pricingTier) {
        setPricingTier(cust.pricingTier);
      }
    }
  };

  const activePart = parts.find(p => p.id === selectedPartId) || parts[0];
  const discountPercent = getTierDiscountPercent(pricingTier);
  const basePrice = activePart ? activePart.sellingPrice : 0;
  const unitDiscount = (basePrice * discountPercent) / 100;
  const netUnitPrice = Math.max(0, basePrice - unitDiscount);

  const handleAddToCart = () => {
    if (!activePart) {
      onNotify('Please select a valid spare part SKU');
      return;
    }

    if (quantity <= 0) {
      onNotify('Quantity must be at least 1');
      return;
    }

    // Check stock if creating direct sales order
    if (docType === 'order' && quantity > activePart.currentStock) {
      onNotify(`Insufficient stock! Available: ${activePart.currentStock} ${activePart.unit}`);
      return;
    }

    const itemTotal = netUnitPrice * quantity;
    const existingIndex = cartItems.findIndex(item => item.partId === activePart.id);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + quantity;
      if (docType === 'order' && newQty > activePart.currentStock) {
        onNotify(`Total quantity (${newQty}) exceeds stock (${activePart.currentStock})`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = updated[existingIndex].unitPrice * newQty;
      setCartItems(updated);
    } else {
      const newItem: PartsQuotationItem = {
        partId: activePart.id,
        partName: activePart.name,
        sku: activePart.sku,
        quantity,
        unitPrice: netUnitPrice,
        discount: unitDiscount * quantity,
        vatRate: 13,
        total: itemTotal
      };
      setCartItems([...cartItems, newItem]);
    }

    setQuantity(1);
    onNotify(`Added ${activePart.name} to order list`);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.total, 0);
  const vatAmount = Math.round(subtotal * 0.13 * 100) / 100;
  const grandTotal = subtotal + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cartItems.length === 0) {
      onNotify('Please add at least one spare part item to proceed');
      return;
    }

    const customerName = selectedCustomerId === 'walkin'
      ? (walkinName.trim() || 'Walk-in Retail Customer')
      : (selectedCustomer?.name || 'Walk-in Customer');

    const todayStr = new Date().toISOString().slice(0, 10);

    if (docType === 'quotation') {
      const expiryDateObj = new Date();
      expiryDateObj.setDate(expiryDateObj.getDate() + 15);

      const quotation: PartsQuotation = {
        id: `QTN-${Date.now().toString().slice(-4)}`,
        quotationNumber: `QTN-81-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: selectedCustomerId,
        customerName,
        date: todayStr,
        expiryDate: expiryDateObj.toISOString().slice(0, 10),
        items: cartItems,
        subtotal,
        vatAmount,
        grandTotal,
        status: 'Draft'
      };

      if (onCreateQuotation) {
        onCreateQuotation(quotation);
      }
      onNotify(`Quotation ${quotation.quotationNumber} generated successfully!`);
    } else {
      const salesOrder: PartsSalesOrder = {
        id: `PSO-${Date.now().toString().slice(-4)}`,
        orderNumber: `PSO-81-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: selectedCustomerId,
        customerName,
        date: todayStr,
        items: cartItems,
        subtotal,
        vatAmount,
        grandTotal,
        dispatchStatus: 'Fully Dispatched',
        invoiceStatus: 'Invoiced'
      };

      if (onCreateSalesOrder) {
        onCreateSalesOrder(salesOrder);
      }
      onNotify(`OTC Sales Order ${salesOrder.orderNumber} dispatched! Spares stock deducted.`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 text-xs my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-xl ${docType === 'order' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
              {docType === 'order' ? <ShoppingBag className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {docType === 'order' ? 'New OTC Spares Sales Order & Dispatch' : 'New Spares Formal Quotation / Estimate'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {docType === 'order'
                  ? 'Over-the-counter spare parts direct sale with immediate inventory reduction & 13% Nepal VAT.'
                  : 'Prepare price estimation with 15-day validity and optional tiered discount.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto pr-1 py-3 space-y-4 shrink grow">
          {/* Doc Type Selector */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDocType('order')}
              className={`py-2 text-center rounded-lg font-bold transition-all ${
                docType === 'order'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Direct OTC Sales Order (Instant Dispatch)
            </button>
            <button
              type="button"
              onClick={() => setDocType('quotation')}
              className={`py-2 text-center rounded-lg font-bold transition-all ${
                docType === 'quotation'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Formal Quotation / Estimate
            </button>
          </div>

          {/* Customer & Pricing Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer Selection</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="walkin">Walk-in Retail Buyer (Cash / Fonepay)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.pricingTier} Tier • {c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pricing Tier / Discount Strategy
              </label>
              <select
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value as any)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                <option value="Retail">Retail (Standard MRP • 0% Disc)</option>
                <option value="Fleet">Fleet Customer (10% Commercial Disc)</option>
                <option value="Insurance">Insurance Surveyor Agreed (5% Disc)</option>
                <option value="Wholesale">Wholesale Workshop Tier (15% Disc)</option>
              </select>
            </div>

            {selectedCustomerId === 'walkin' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Walk-in Customer Name</label>
                  <input
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Mobile #</label>
                  <input
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-mono"
                  />
                </div>
              </>
            )}
          </div>

          {/* Add Part Section */}
          <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200 space-y-3">
            <span className="font-bold text-teal-900 block">Select Spares & Add to Order</span>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-6">
                <label className="block font-semibold text-slate-700 mb-1">Select Spare Part SKU</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-mono focus:ring-2 focus:ring-teal-500"
                >
                  {parts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock: {p.currentStock} {p.unit} | NPR {p.sellingPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={docType === 'order' && activePart ? activePart.currentStock : undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white text-center font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Net Price</label>
                <div className="font-mono text-xs font-bold text-slate-900 py-2 px-2 bg-white rounded-xl border border-slate-200">
                  NPR {netUnitPrice.toLocaleString()}
                  {discountPercent > 0 && (
                    <span className="text-[10px] text-emerald-600 block">(-{discountPercent}%)</span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {activePart && docType === 'order' && activePart.currentStock < 5 && (
              <div className="flex items-center space-x-1.5 text-amber-700 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Notice: Low stock alert ({activePart.currentStock} {activePart.unit} remaining).</span>
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-slate-800">Order Items ({cartItems.length})</span>
              <span className="text-slate-400 text-[11px]">Nepal VAT 13% Calculated at Checkout</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                No spare parts added to this order yet. Choose a part above and click "Add".
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-2.5">Item / SKU</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Line Total</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2.5">
                          <span className="font-bold text-slate-800 block">{item.partName}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{item.sku}</span>
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono">NPR {item.unitPrice.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          NPR {item.total.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          {cartItems.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-mono">NPR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nepal VAT (13%):</span>
                <span className="font-mono text-teal-700 font-semibold">+ NPR {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="font-mono text-teal-800">NPR {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cartItems.length === 0}
            className={`px-5 py-2 rounded-xl font-bold text-white shadow-sm flex items-center space-x-1.5 transition-all ${
              cartItems.length === 0
                ? 'bg-slate-300 cursor-not-allowed'
                : docType === 'order'
                ? 'bg-teal-600 hover:bg-teal-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {docType === 'order'
                ? `Confirm OTC Dispatch (NPR ${grandTotal.toLocaleString()})`
                : `Generate Quotation (NPR ${grandTotal.toLocaleString()})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
