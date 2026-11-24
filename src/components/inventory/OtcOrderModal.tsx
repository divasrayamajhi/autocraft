import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  PackageCheck
} from 'lucide-react';
import {
  SparePart,
  Customer,
  PartsSalesOrder,
  PartsQuotationItem,
  NepalPaymentMethod
} from '../../types';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';
import {
  generateUniqueId,
  getNepalFiscalYear,
  getNextSequentialDocNumber,
  round2
} from '../../utils/accountingEngine';

interface OtcOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  customers: Customer[];
  existingOrderNumbers?: string[];
  onCreateSalesOrder?: (order: PartsSalesOrder) => void;
  onNotify: (msg: string) => void;
}

export const OtcOrderModal: React.FC<OtcOrderModalProps> = ({
  isOpen,
  onClose,
  parts,
  customers,
  existingOrderNumbers = [],
  onCreateSalesOrder,
  onNotify
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walkin');
  const [walkinName, setWalkinName] = useState<string>('Walk-in Customer (Kathmandu)');
  const [walkinPhone, setWalkinPhone] = useState<string>('+977-98');
  const [pricingTier, setPricingTier] = useState<'Retail' | 'Fleet' | 'Wholesale'>('Retail');
  const [paymentMethod, setPaymentMethod] = useState<NepalPaymentMethod | 'Credit'>('Cash');

  // Optional Corporate / Company Tax Invoice Billing
  const [billToCompany, setBillToCompany] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyPanVat, setCompanyPanVat] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyPhone, setCompanyPhone] = useState<string>('');

  // Active line item selection
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Cart
  const [cartItems, setCartItems] = useState<PartsQuotationItem[]>([]);

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Discount % based on tier
  const getTierDiscountPercent = (tier: string) => {
    switch (tier) {
      case 'Fleet':
        return 10;
      case 'Wholesale':
        return 15;
      default:
        return 0;
    }
  };

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId !== 'walkin') {
      const cust = customers.find((c) => c.id === custId);
      if (cust?.pricingTier === 'Fleet' || cust?.pricingTier === 'Wholesale' || cust?.pricingTier === 'Retail') {
        setPricingTier(cust.pricingTier);
      }
    }
  };

  const activePart = parts.find((p) => p.id === selectedPartId) || parts[0];
  const discountPercent = getTierDiscountPercent(pricingTier);
  const basePrice = activePart ? activePart.sellingPrice : 0;
  const unitDiscount = (basePrice * discountPercent) / 100;
  const netUnitPrice = Math.max(0, basePrice - unitDiscount);

  // Live stock evaluation for the currently selected spare part
  const inCartQtyForActive = activePart
    ? cartItems.filter((item) => item.partId === activePart.id).reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  const availableStock = activePart ? Math.max(0, activePart.currentStock - inCartQtyForActive) : 0;
  const remainingAfterAdd = availableStock - quantity;
  const minReorder = activePart?.minReorderLevel ?? 5;

  const isOutOfStock = Boolean(activePart && activePart.currentStock <= 0);
  const isInsufficientStock = Boolean(activePart && !isOutOfStock && (availableStock <= 0 || quantity > availableStock));
  const isLowStockWarning = Boolean(
    activePart &&
      !isOutOfStock &&
      !isInsufficientStock &&
      (remainingAfterAdd <= minReorder || activePart.currentStock <= minReorder)
  );
  const canAddSelectedPart = Boolean(activePart && quantity > 0 && !isOutOfStock && !isInsufficientStock);

  // Check if any cart line item violates current warehouse stock
  const cartStockViolations = cartItems.filter((item) => {
    const livePart = parts.find((p) => p.id === item.partId);
    return !livePart || item.quantity > livePart.currentStock;
  });

  const handleAddToCart = () => {
    setFormError(null);
    if (!activePart) {
      setFormError('Please select a valid spare part SKU.');
      return;
    }

    if (quantity <= 0) {
      setFormError('Order quantity must be at least 1.');
      return;
    }

    if (activePart.currentStock <= 0) {
      setFormError(`Out of Stock: ${activePart.name} has 0 ${activePart.unit} available in inventory.`);
      return;
    }

    if (quantity > availableStock) {
      setFormError(
        `Low in Stock: Requested ${quantity} ${activePart.unit} of ${activePart.name}, but only ${availableStock} ${activePart.unit} available in stock.`
      );
      return;
    }

    const itemTotal = netUnitPrice * quantity;
    const existingIndex = cartItems.findIndex((item) => item.partId === activePart.id);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + quantity;
      if (newQty > activePart.currentStock) {
        setFormError(
          `Low in Stock: Total order quantity (${newQty} ${activePart.unit}) exceeds available stock (${activePart.currentStock} ${activePart.unit}).`
        );
        return;
      }
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: updated[existingIndex].unitPrice * newQty
      };
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
    onNotify(`Added ${quantity} × ${activePart.name} to OTC order.`);
  };

  const handleRemoveFromCart = (index: number) => {
    setFormError(null);
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = round2(cartItems.reduce((acc, item) => acc + item.total, 0));
  const vatAmount = round2(subtotal * 0.13);
  const grandTotal = round2(subtotal + vatAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError('Please add at least one spare part item before confirming OTC dispatch.');
      return;
    }

    if (cartStockViolations.length > 0) {
      const first = cartStockViolations[0];
      const livePart = parts.find((p) => p.id === first.partId);
      setFormError(
        `Low in Stock: ${first.partName} requires ${first.quantity} units, but only ${livePart?.currentStock ?? 0} units are available in warehouse.`
      );
      return;
    }

    if (billToCompany) {
      if (!companyName.trim() || !companyPanVat.trim() || !companyAddress.trim() || !companyPhone.trim()) {
        setFormError('Please complete Company Name, VAT/PAN Number, Address, and Phone Number for company billing.');
        return;
      }
    }

    const customerName =
      selectedCustomerId === 'walkin'
        ? walkinName.trim() || 'Walk-in Retail Customer'
        : selectedCustomer?.name || 'Walk-in Customer';
    const customerPhone =
      selectedCustomerId === 'walkin'
        ? walkinPhone.trim()
        : selectedCustomer?.phone || walkinPhone.trim();

    const todayStr = new Date().toISOString().slice(0, 10);
    const fy = getNepalFiscalYear(todayStr);
    const orderNumber = getNextSequentialDocNumber(existingOrderNumbers, 'PSO', fy, 5);
    const isCreditSale = paymentMethod === 'Credit';

    const salesOrder: PartsSalesOrder = {
      id: generateUniqueId('PSO'),
      orderNumber,
      customerId: selectedCustomerId,
      customerName: billToCompany ? companyName.trim() : customerName,
      customerPhone: billToCompany ? companyPhone.trim() : customerPhone,
      pricingTier,
      paymentMethod: isCreditSale ? 'Cash' : paymentMethod,
      paymentStatus: isCreditSale ? 'Unpaid' : 'Paid',
      date: todayStr,
      items: cartItems,
      subtotal,
      vatAmount,
      grandTotal,
      dispatchStatus: 'Fully Dispatched',
      invoiceStatus: 'Invoiced',
      companyBilling: billToCompany
        ? {
            isCompanyBill: true,
            companyName: companyName.trim(),
            panVatNumber: companyPanVat.trim(),
            address: companyAddress.trim(),
            phone: companyPhone.trim()
          }
        : undefined
    };

    if (onCreateSalesOrder) {
      onCreateSalesOrder(salesOrder);
    }
    onNotify(`OTC Order ${salesOrder.orderNumber} dispatched & IRD Tax Invoice generated.`);
    setCartItems([]);
    setQuantity(1);
    setFormError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-[#E2E8F0] text-xs my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#0F3D5E] text-white">
              <ShoppingBag className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                New OTC Spares Sales Order &amp; Dispatch
              </h3>
              <p className="text-[11px] text-[#64748B]">
                Over-the-counter direct spare parts sale with live stock verification, immediate inventory deduction &amp; 13% Nepal VAT.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close OTC Sales Order dialog"
            className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F1F5F9] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="overflow-y-auto pr-1 py-4 space-y-4 shrink grow">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[#DC2626] flex items-start space-x-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Customer & Pricing Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">Customer Selection</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-medium focus:ring-2 focus:ring-[#0EA5E9]"
              >
                <option value="walkin">Walk-in Retail Buyer (Cash / Fonepay)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.pricingTier || 'Retail'} Tier • {c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Pricing Tier / Discount Strategy
              </label>
              <select
                value={pricingTier}
                onChange={(e) => setPricingTier(e.target.value as 'Retail' | 'Fleet' | 'Wholesale')}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9]"
              >
                <option value="Retail">Retail (Standard MRP • 0% Disc)</option>
                <option value="Fleet">Fleet Customer (10% Commercial Disc)</option>
                <option value="Wholesale">Wholesale Workshop Tier (15% Disc)</option>
              </select>
            </div>

            {selectedCustomerId === 'walkin' && (
              <>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Walk-in Customer Name</label>
                  <input
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Customer Mobile #</label>
                  <input
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-mono focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block font-semibold text-[#0F172A] mb-1">
                Tax Invoice Settlement / Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as NepalPaymentMethod | 'Credit')}
                className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9]"
              >
                <option value="Cash">Cash at Counter (Paid Immediately)</option>
                <option value="Fonepay">Fonepay Dynamic QR (Paid Immediately)</option>
                <option value="NepalPay">NepalPay QR / Card (Paid Immediately)</option>
                <option value="eSewa">eSewa Wallet (Paid Immediately)</option>
                <option value="Khalti">Khalti Wallet (Paid Immediately)</option>
                <option value="ConnectIPS">ConnectIPS / Bank Transfer (Paid Immediately)</option>
                <option value="Credit">Corporate / Customer Credit (Invoice as Unpaid)</option>
              </select>
            </div>

            <div className="md:col-span-2 pt-2 border-t border-[#E2E8F0] space-y-2.5">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={billToCompany}
                  onChange={(e) => setBillToCompany(e.target.checked)}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#0EA5E9] focus:ring-[#0EA5E9]"
                />
                <Building2 className="w-4 h-4 text-[#0F3D5E]" />
                <span className="font-bold text-[#0F172A]">
                  Bill Tax Invoice in Company Name (Corporate VAT / PAN Bill)
                </span>
              </label>

              {billToCompany && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-[#FFFFFF] p-3 rounded-lg border border-[#CBD5E1]">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#0F172A] mb-1">Company Name *</label>
                    <input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Himalayan Traders Pvt. Ltd."
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1">VAT / PAN Number *</label>
                    <input
                      value={companyPanVat}
                      onChange={(e) => setCompanyPanVat(e.target.value)}
                      placeholder="e.g. 601234567"
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 font-mono outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#0F172A] mb-1">Company Phone *</label>
                    <input
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+977-1-4220192"
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 font-mono outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#0F172A] mb-1">Company Address *</label>
                    <input
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="e.g. Durbar Marg, Kathmandu"
                      className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Part Section with Real-Time Stock Validation & Stock Notifications */}
          <div className="p-3.5 bg-[#F0F9FF] rounded-xl border border-[#BAE6FD] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0F3D5E]">Select Spares &amp; Add to OTC Dispatch</span>
              {activePart && (
                <span className="text-[11px] font-mono font-semibold text-[#0284C7]">
                  Available: {availableStock} {activePart.unit} (Warehouse: {activePart.currentStock})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-6">
                <label className="block font-semibold text-[#0F172A] mb-1">Select Spare Part SKU</label>
                <select
                  value={selectedPartId}
                  onChange={(e) => {
                    setSelectedPartId(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-mono focus:ring-2 focus:ring-[#0EA5E9]"
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock: {p.currentStock} {p.unit} | NPR {p.sellingPrice})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-[#0F172A] mb-1">Order Qty</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setQuantity(isNaN(parsed) ? 0 : Math.max(0, parsed));
                    setFormError(null);
                  }}
                  className={`w-full font-mono border rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] text-center font-bold focus:ring-2 ${
                    isOutOfStock || isInsufficientStock
                      ? 'border-[#DC2626] text-[#DC2626] focus:ring-[#DC2626]'
                      : isLowStockWarning
                        ? 'border-[#F59E0B] text-[#B45309] focus:ring-[#F59E0B]'
                        : 'border-[#CBD5E1] text-[#0F172A] focus:ring-[#0EA5E9]'
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-[#0F172A] mb-1">Net Price</label>
                <div className="font-mono text-xs font-bold text-[#0F172A] py-2 px-2 bg-[#FFFFFF] rounded-lg border border-[#E2E8F0]">
                  NPR {netUnitPrice.toLocaleString()}
                  {discountPercent > 0 && (
                    <span className="text-[10px] text-[#16A34A] block">(-{discountPercent}%)</span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!canAddSelectedPart}
                  className={`w-full py-2 rounded-lg font-bold flex items-center justify-center space-x-1 transition-colors ${
                    canAddSelectedPart
                      ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                      : 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Live Stock Status Notification Bar */}
            {activePart && (
              <>
                {isOutOfStock ? (
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626] text-[11px] font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Out of Stock — 0 {activePart.unit} available for <strong>{activePart.name}</strong>. Please replenish inventory before OTC dispatch.
                    </span>
                  </div>
                ) : isInsufficientStock ? (
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626] text-[11px] font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Low in Stock — Only <strong>{availableStock} {activePart.unit}</strong> available in stock
                      {inCartQtyForActive > 0 ? ` (${inCartQtyForActive} already in order)` : ''}, cannot fulfill requested order of <strong>{quantity} {activePart.unit}</strong>. Please lower the quantity.
                    </span>
                  </div>
                ) : isLowStockWarning ? (
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[#B45309] text-[11px] font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                    <span>
                      Low Stock Warning — <strong>{availableStock} {activePart.unit}</strong> available; only{' '}
                      <strong>{Math.max(0, remainingAfterAdd)} {activePart.unit}</strong> will remain after this sale (at or below reorder threshold of {minReorder} {activePart.unit}).
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#16A34A] text-[11px] font-semibold">
                    <PackageCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      In Stock — Sufficient stock available (<strong>{availableStock} {activePart.unit}</strong> ready;{' '}
                      <strong>{Math.max(0, remainingAfterAdd)} {activePart.unit}</strong> remaining after this order).
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Cart Items Table */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-[#0F172A]">Order Items ({cartItems.length})</span>
              <span className="text-[#64748B] text-[11px]">Nepal VAT 13% Calculated at Checkout</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-[#E2E8F0] rounded-xl text-[#64748B]">
                No spare parts added to this OTC order yet. Choose a part above and click &ldquo;Add&rdquo;.
              </div>
            ) : (
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#64748B]">
                    <tr>
                      <th className="p-2.5">Item / SKU</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-center">Stock Status</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Line Total</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {cartItems.map((item, idx) => {
                      const livePart = parts.find((p) => p.id === item.partId);
                      const stockAfter = (livePart?.currentStock ?? 0) - item.quantity;
                      const exceeds = !livePart || item.quantity > livePart.currentStock;
                      const hitsReorder = !exceeds && stockAfter <= (livePart?.minReorderLevel ?? 5);

                      return (
                        <tr key={idx} className="hover:bg-[#F8FAFC]">
                          <td className="p-2.5">
                            <span className="font-bold text-[#0F172A] block">{item.partName}</span>
                            <span className="text-[#64748B] font-mono text-[10px]">{item.sku}</span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">{item.quantity}</td>
                          <td className="p-2.5 text-center">
                            {exceeds ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-[#DC2626] border border-red-200">
                                Low in Stock ({livePart?.currentStock ?? 0})
                              </span>
                            ) : hitsReorder ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-[#B45309] border border-amber-200">
                                Low After Sale ({stockAfter} left)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-[#16A34A] border border-emerald-200">
                                In Stock ({stockAfter} left)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono">NPR {item.unitPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#0F172A]">
                            NPR {item.total.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(idx)}
                              className="text-[#64748B] hover:text-[#DC2626] p-1 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pricing Totals */}
          {cartItems.length > 0 && (
            <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5 font-medium">
              <div className="flex justify-between text-[#64748B]">
                <span>Taxable Subtotal:</span>
                <span className="font-mono">NPR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Nepal VAT (13%):</span>
                <span className="font-mono text-[#0284C7] font-semibold">+ NPR {vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#0F172A] font-bold text-sm pt-2 border-t border-[#E2E8F0]">
                <span>Grand Total:</span>
                <span className="font-mono text-[#0F3D5E]">NPR {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cartItems.length === 0 || cartStockViolations.length > 0}
            className={`px-5 py-2 rounded-lg font-bold text-white flex items-center space-x-1.5 transition-all ${
              cartItems.length === 0 || cartStockViolations.length > 0
                ? 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                : 'bg-[#0EA5E9] hover:bg-[#0284C7]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Dispatch &amp; Generate Tax Invoice (NPR {grandTotal.toLocaleString()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
