import React, { useMemo, useState } from 'react';
import {
  X,
  Plus,
  Search,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  PackageCheck,
  Percent
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
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<NepalPaymentMethod | 'Credit'>('Cash');

  // Optional Corporate / Company Tax Invoice Billing
  const [billToCompany, setBillToCompany] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [companyPanVat, setCompanyPanVat] = useState<string>('');
  const [companyAddress, setCompanyAddress] = useState<string>('');
  const [companyPhone, setCompanyPhone] = useState<string>('');

  // Search-first spares selection by Part Number / SKU
  const [partSearchInput, setPartSearchInput] = useState<string>('');
  const [partSearchTerm, setPartSearchTerm] = useState<string>('');
  const [hasSearchedParts, setHasSearchedParts] = useState<boolean>(false);
  const [rowQtyById, setRowQtyById] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Cart
  const [cartItems, setCartItems] = useState<PartsQuotationItem[]>([]);

  useEscapeKey(isOpen, onClose);

  // Filtered spares search results prioritized by Part Number / SKU match
  const searchResults = useMemo(() => {
    if (!hasSearchedParts) return [];
    const q = partSearchTerm.trim().toLowerCase();
    if (!q) return parts;
    const matched = parts.filter((p) => {
      const partNo = (p.partNumber || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const oem = (p.oemNumber || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      return (
        partNo.includes(q) ||
        sku.includes(q) ||
        oem.includes(q) ||
        barcode.includes(q) ||
        name.includes(q)
      );
    });
    // Prioritize exact / prefix matches on Part Number and SKU
    return matched.sort((a, b) => {
      const aPartNo = (a.partNumber || '').toLowerCase();
      const bPartNo = (b.partNumber || '').toLowerCase();
      const aSku = (a.sku || '').toLowerCase();
      const bSku = (b.sku || '').toLowerCase();
      const aScore =
        aPartNo === q || aSku === q ? 0 : aPartNo.startsWith(q) || aSku.startsWith(q) ? 1 : 2;
      const bScore =
        bPartNo === q || bSku === q ? 0 : bPartNo.startsWith(q) || bSku.startsWith(q) ? 1 : 2;
      return aScore - bScore;
    });
  }, [hasSearchedParts, partSearchTerm, parts]);

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
  };

  const handleSearchParts = () => {
    setFormError(null);
    setPartSearchTerm(partSearchInput.trim());
    setHasSearchedParts(true);
  };

  const handleClearSearch = () => {
    setPartSearchInput('');
    setPartSearchTerm('');
    setHasSearchedParts(false);
    setFormError(null);
  };

  const getInCartQty = (partId: string) =>
    cartItems.filter((item) => item.partId === partId).reduce((sum, item) => sum + item.quantity, 0);

  // Check if any cart line item violates current warehouse stock
  const cartStockViolations = cartItems.filter((item) => {
    const livePart = parts.find((p) => p.id === item.partId);
    return !livePart || item.quantity > livePart.currentStock;
  });

  const handleAddPartToCart = (part: SparePart) => {
    setFormError(null);
    const reqQty = rowQtyById[part.id] ?? 1;
    const inCartQty = getInCartQty(part.id);
    const availableStock = Math.max(0, part.currentStock - inCartQty);

    if (reqQty <= 0) {
      setFormError('Order quantity must be at least 1.');
      return;
    }

    if (part.currentStock <= 0) {
      setFormError(`Out of Stock: ${part.name} (${part.partNumber || part.sku}) has 0 ${part.unit} available in inventory.`);
      return;
    }

    if (reqQty > availableStock) {
      setFormError(
        `Low in Stock: Requested ${reqQty} ${part.unit} of ${part.name} (${part.partNumber || part.sku}), but only ${availableStock} ${part.unit} available in stock.`
      );
      return;
    }

    const unitPrice = round2(part.sellingPrice);
    const itemTotal = round2(unitPrice * reqQty);
    const existingIndex = cartItems.findIndex((item) => item.partId === part.id);

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + reqQty;
      if (newQty > part.currentStock) {
        setFormError(
          `Low in Stock: Total order quantity (${newQty} ${part.unit}) exceeds available stock (${part.currentStock} ${part.unit}).`
        );
        return;
      }
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        total: round2(updated[existingIndex].unitPrice * newQty)
      };
      setCartItems(updated);
    } else {
      const newItem: PartsQuotationItem = {
        partId: part.id,
        partName: part.name,
        sku: part.partNumber || part.sku,
        quantity: reqQty,
        unitPrice,
        discount: 0,
        vatRate: 13,
        total: itemTotal
      };
      setCartItems([...cartItems, newItem]);
    }

    setRowQtyById((prev) => ({ ...prev, [part.id]: 1 }));
    onNotify(`Added ${reqQty} × ${part.name} (${part.partNumber || part.sku}) to OTC order.`);
  };

  const handleRemoveFromCart = (index: number) => {
    setFormError(null);
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculations (Percent % or Amount NPR Discount Basis)
  const grossSubtotal = round2(cartItems.reduce((acc, item) => acc + round2(item.unitPrice * item.quantity), 0));
  const safeDiscountVal = Math.max(0, Number(discountValue) || 0);
  const clampedDiscountVal = discountType === 'percent' ? Math.min(100, safeDiscountVal) : Math.min(grossSubtotal, safeDiscountVal);
  const discountAmount =
    discountType === 'percent'
      ? round2((grossSubtotal * clampedDiscountVal) / 100)
      : round2(clampedDiscountVal);
  const subtotal = round2(Math.max(0, grossSubtotal - discountAmount));
  const vatAmount = round2(subtotal * 0.13);
  const grandTotal = round2(subtotal + vatAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError('Please search and add at least one spare part item before confirming OTC dispatch.');
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
      paymentMethod: isCreditSale ? 'Cash' : paymentMethod,
      paymentStatus: isCreditSale ? 'Unpaid' : 'Paid',
      date: todayStr,
      items: cartItems,
      grossSubtotal,
      discountType,
      discountValue: clampedDiscountVal,
      discountAmount,
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
    setDiscountValue(0);
    setDiscountType('percent');
    setPartSearchInput('');
    setPartSearchTerm('');
    setHasSearchedParts(false);
    setRowQtyById({});
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
                Over-the-counter direct spare parts sale with part-number search, live stock verification, immediate inventory deduction &amp; 13% Nepal VAT.
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

          {/* Customer & Discount Option (% or Amount) */}
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
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1 flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Discount Option (Percent or Amount)</span>
              </label>
              <div className="flex items-stretch space-x-1.5">
                <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-white p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percent');
                      setDiscountValue((v) => Math.min(100, Math.max(0, v)));
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      discountType === 'percent'
                        ? 'bg-[#0F3D5E] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      discountType === 'amount'
                        ? 'bg-[#0F3D5E] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    NPR
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  step="any"
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (isNaN(parsed) || parsed < 0) {
                      setDiscountValue(0);
                    } else {
                      setDiscountValue(discountType === 'percent' ? Math.min(100, parsed) : parsed);
                    }
                  }}
                  placeholder={discountType === 'percent' ? '0% discount' : '0 NPR discount'}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-1.5 outline-none bg-[#FFFFFF] font-mono font-bold text-[#0F172A] focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>
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

          {/* Search-First Spare Part Selection by Part Number / SKU */}
          <div className="p-3.5 bg-[#F0F9FF] rounded-xl border border-[#BAE6FD] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#0F3D5E]">Select Spares &amp; Add to OTC Dispatch</span>
              <span className="text-[11px] text-[#0284C7] font-medium">
                Search by Part Number or SKU, then click Add
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={partSearchInput}
                  onChange={(e) => setPartSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchParts();
                    }
                  }}
                  placeholder="Enter Part Number, SKU, OEM #, or Part Name..."
                  className="w-full border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 outline-none bg-[#FFFFFF] font-mono text-xs text-[#0F172A] placeholder:font-sans focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSearchParts}
                  className="px-4 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
                {hasSearchedParts && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="px-3 py-2 bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded-lg font-semibold transition whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Search Results Displayed Below with Add Button on Right */}
            {!hasSearchedParts ? (
              <div className="p-3 bg-white/80 border border-dashed border-[#BAE6FD] rounded-lg text-[11px] text-[#64748B] text-center">
                Enter a Part Number or SKU above and click <strong>Search</strong> to view matching spares and add them to this OTC dispatch.
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 bg-white border border-amber-200 rounded-lg text-[11px] text-[#B45309] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                <span>
                  No spare parts found matching <strong>&ldquo;{partSearchTerm}&rdquo;</strong>. Verify the Part Number or SKU and try again.
                </span>
              </div>
            ) : (
              <div className="bg-white border border-[#CBD5E1] rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>
                    Showing <strong className="text-[#0F172A]">{searchResults.length}</strong> matching spare part{searchResults.length !== 1 ? 's' : ''}
                    {partSearchTerm ? ` for "${partSearchTerm}"` : ' (all stock)'}
                  </span>
                  {discountAmount > 0 && (
                    <span className="font-semibold text-[#16A34A]">
                      Discount: {discountType === 'percent' ? `${clampedDiscountVal}%` : `NPR ${discountAmount.toLocaleString()}`} at Checkout
                    </span>
                  )}
                </div>
                <div className="divide-y divide-[#E2E8F0] max-h-56 overflow-y-auto scrollbar-clean">
                  {searchResults.map((part) => {
                    const rowQty = rowQtyById[part.id] ?? 1;
                    const inCartQty = getInCartQty(part.id);
                    const availableStock = Math.max(0, part.currentStock - inCartQty);
                    const remainingAfter = availableStock - rowQty;
                    const minReorder = part.minReorderLevel ?? 5;

                    const isOut = part.currentStock <= 0;
                    const isInsufficient = !isOut && (availableStock <= 0 || rowQty > availableStock);
                    const isLowWarn = !isOut && !isInsufficient && (remainingAfter <= minReorder || part.currentStock <= minReorder);
                    const canAdd = rowQty > 0 && !isOut && !isInsufficient;

                    return (
                      <div
                        key={part.id}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#F8FAFC] transition"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-[#0F3D5E] bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[10px]">
                              Part #: {part.partNumber || part.sku}
                            </span>
                            {part.sku && part.sku !== part.partNumber && (
                              <span className="font-mono text-[10px] text-[#64748B]">
                                SKU: {part.sku}
                              </span>
                            )}
                            <span className="font-bold text-[#0F172A] text-xs truncate">
                              {part.name}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-[#0F172A]">
                              NPR {part.sellingPrice.toLocaleString()} / {part.unit}
                            </span>
                            <span>·</span>
                            {isOut ? (
                              <span className="text-[#DC2626] font-bold inline-flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Out of Stock (0 {part.unit})</span>
                              </span>
                            ) : isInsufficient ? (
                              <span className="text-[#DC2626] font-bold inline-flex items-center space-x-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>Low in Stock — Only {availableStock} {part.unit} avail</span>
                              </span>
                            ) : isLowWarn ? (
                              <span className="text-[#B45309] font-semibold inline-flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                                <span>Low Stock ({availableStock} {part.unit} avail · {Math.max(0, remainingAfter)} left)</span>
                              </span>
                            ) : (
                              <span className="text-[#16A34A] font-semibold inline-flex items-center space-x-1">
                                <PackageCheck className="w-3 h-3" />
                                <span>In Stock ({availableStock} {part.unit} avail)</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Quantity + Add Button */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-semibold text-[#64748B]">Qty</span>
                            <input
                              type="number"
                              min={1}
                              value={rowQty}
                              onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                setRowQtyById((prev) => ({
                                  ...prev,
                                  [part.id]: isNaN(parsed) ? 0 : Math.max(0, parsed)
                                }));
                                setFormError(null);
                              }}
                              className={`w-16 font-mono border rounded-lg px-2 py-1.5 outline-none bg-[#FFFFFF] text-center font-bold focus:ring-2 ${
                                isOut || isInsufficient
                                  ? 'border-[#DC2626] text-[#DC2626] focus:ring-[#DC2626]'
                                  : isLowWarn
                                    ? 'border-[#F59E0B] text-[#B45309] focus:ring-[#F59E0B]'
                                    : 'border-[#CBD5E1] text-[#0F172A] focus:ring-[#0EA5E9]'
                              }`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddPartToCart(part)}
                            disabled={!canAdd}
                            className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition whitespace-nowrap ${
                              canAdd
                                ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                                : 'bg-[#CBD5E1] text-[#64748B] cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                No spare parts added to this OTC order yet. Search by Part Number above and click &ldquo;Add&rdquo;.
              </div>
            ) : (
              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-semibold text-[#64748B]">
                    <tr>
                      <th className="p-2.5">Item / Part #</th>
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
                <span>Gross Subtotal:</span>
                <span className="font-mono">NPR {grossSubtotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#DC2626] font-semibold">
                  <span>
                    Less: Discount ({discountType === 'percent' ? `${clampedDiscountVal}%` : 'Fixed Amount'}):
                  </span>
                  <span className="font-mono">- NPR {discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[#64748B]">
                <span>Taxable Subtotal:</span>
                <span className="font-mono text-[#0F172A] font-semibold">NPR {subtotal.toLocaleString()}</span>
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
            className="px-4 py-2 bg-white border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cartItems.length === 0 || cartStockViolations.length > 0}
            className={`px-5 py-2 rounded-lg font-bold text-white flex items-center space-x-1.5 transition-all whitespace-nowrap ${
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
