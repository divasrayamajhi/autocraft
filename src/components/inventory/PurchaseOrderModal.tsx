import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Save, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Clock, 
  Building2,
  Calendar,
  Layers,
  ArrowDownCircle
} from 'lucide-react';
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseOrderStatus, 
  SparePart, 
  WorkshopProfile 
} from '../../types';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  existingPO?: PurchaseOrder | null;
  profile?: WorkshopProfile;
  onSavePO: (po: PurchaseOrder) => void;
  onReceivePO?: (po: PurchaseOrder) => void;
  onPrintPO?: (po: PurchaseOrder) => void;
}

const COMMON_SUPPLIERS = [
  { name: 'Sipradi Trading Pvt. Ltd. (Tata Genuine)', pan: '300049211', phone: '+977-1-4240000', address: 'Naikap, Kathmandu' },
  { name: 'Pioneer Moto Corp (Nissan Genuine Parts)', pan: '302849102', phone: '+977-1-4433555', address: 'Thapathali, Kathmandu' },
  { name: 'Dugar Spares & Lubricants (Bajaj / Mahindra)', pan: '301192834', phone: '+977-1-4221144', address: 'Kantipath, Kathmandu' },
  { name: 'Laxmi InterContinental (Hyundai Genuine)', pan: '303492819', phone: '+977-1-5544332', address: 'Kupandole, Lalitpur' },
  { name: 'Continental Spares Center', pan: '301984729', phone: '+977-1-4359988', address: 'Teku, Kathmandu' }
];

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  parts,
  existingPO,
  profile,
  onSavePO,
  onReceivePO,
  onPrintPO
}) => {
  const [poNumber, setPoNumber] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPan, setSupplierPan] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [date, setDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days (Credit)');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus>('Pending');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);

  // Add Part Line Inputs
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [lineQty, setLineQty] = useState<number>(5);
  const [lineUnitCost, setLineUnitCost] = useState<number>(0);

  // Initialize or reset form
  useEffect(() => {
    if (existingPO) {
      setPoNumber(existingPO.poNumber);
      setSupplierName(existingPO.supplierName || existingPO.vendorName || '');
      setSupplierPan(existingPO.supplierPanVat || '');
      setSupplierPhone(existingPO.supplierContact || '');
      setSupplierAddress(existingPO.supplierAddress || '');
      setDate(existingPO.date);
      setExpectedDate(existingPO.expectedDeliveryDate || '');
      setPaymentTerms(existingPO.paymentTerms || 'Net 30 Days (Credit)');
      setNotes(existingPO.notes || '');
      setStatus(existingPO.status || 'Pending');
      setItems(existingPO.items || []);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const delivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setPoNumber(`PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
      const defaultSupplier = COMMON_SUPPLIERS[0];
      setSupplierName(defaultSupplier.name);
      setSupplierPan(defaultSupplier.pan);
      setSupplierPhone(defaultSupplier.phone);
      setSupplierAddress(defaultSupplier.address);
      setDate(today);
      setExpectedDate(delivery);
      setPaymentTerms('Net 30 Days (Credit)');
      setNotes('Standard OEM/OES spares procurement order. Please supply with Nepal IRD VAT bill.');
      setStatus('Pending');

      // Auto-suggest low stock items if creating new PO
      const lowStockParts = (parts || []).filter(p => p.currentStock <= p.minStockLevel);
      if (lowStockParts.length > 0) {
        const initialItems: PurchaseOrderItem[] = lowStockParts.slice(0, 3).map(p => {
          const orderQty = Math.max(5, (p.maxStockLevel || p.reorderPoint || 10) - p.currentStock);
          const cost = p.purchasePrice || p.unitCost || 500;
          const taxable = orderQty * cost;
          const vat = Math.round(taxable * 0.13);
          return {
            partId: p.id,
            partNumber: p.partNumber || p.sku,
            partName: p.name,
            currentStock: p.currentStock,
            orderedQuantity: orderQty,
            unitCost: cost,
            vatRate: 13,
            vatAmount: vat,
            lineTotal: taxable + vat,
            quantity: orderQty,
            unitPrice: cost,
            total: taxable + vat
          };
        });
        setItems(initialItems);
      } else {
        setItems([]);
      }
    }
  }, [existingPO, isOpen, parts]);

  // Set default part line cost when user picks part from dropdown
  const handlePartSelect = (partId: string) => {
    setSelectedPartId(partId);
    const p = parts.find(x => x.id === partId);
    if (p) {
      setLineUnitCost(p.purchasePrice || p.unitCost || 0);
      const suggestedQty = Math.max(1, (p.minStockLevel || 5) * 2 - p.currentStock);
      setLineQty(suggestedQty > 0 ? suggestedQty : 5);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parts.find(x => x.id === selectedPartId);
    if (!p) return;

    // Check if already in items
    const existingIndex = items.findIndex(i => i.partId === p.id);
    const cost = Number(lineUnitCost) || 0;
    const qty = Number(lineQty) || 1;
    const taxable = qty * cost;
    const vat = Math.round(taxable * 0.13);
    const total = taxable + vat;

    if (existingIndex >= 0) {
      const updated = [...items];
      const newQty = updated[existingIndex].orderedQuantity + qty;
      const newTaxable = newQty * cost;
      const newVat = Math.round(newTaxable * 0.13);
      updated[existingIndex] = {
        ...updated[existingIndex],
        orderedQuantity: newQty,
        quantity: newQty,
        unitCost: cost,
        unitPrice: cost,
        vatAmount: newVat,
        lineTotal: newTaxable + newVat,
        total: newTaxable + newVat
      };
      setItems(updated);
    } else {
      const newItem: PurchaseOrderItem = {
        partId: p.id,
        partNumber: p.partNumber || p.sku,
        partName: p.name,
        currentStock: p.currentStock,
        orderedQuantity: qty,
        unitCost: cost,
        vatRate: 13,
        vatAmount: vat,
        lineTotal: total,
        quantity: qty,
        unitPrice: cost,
        total: total
      };
      setItems([...items, newItem]);
    }

    // Reset line picker
    setSelectedPartId('');
    setLineQty(5);
    setLineUnitCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    const item = updated[index];
    const cost = item.unitCost;
    const taxable = newQty * cost;
    const vat = Math.round(taxable * 0.13);
    updated[index] = {
      ...item,
      orderedQuantity: newQty,
      quantity: newQty,
      vatAmount: vat,
      lineTotal: taxable + vat,
      total: taxable + vat
    };
    setItems(updated);
  };

  const handleUpdateItemCost = (index: number, newCost: number) => {
    if (newCost < 0) return;
    const updated = [...items];
    const item = updated[index];
    const qty = item.orderedQuantity;
    const taxable = qty * newCost;
    const vat = Math.round(taxable * 0.13);
    updated[index] = {
      ...item,
      unitCost: newCost,
      unitPrice: newCost,
      vatAmount: vat,
      lineTotal: taxable + vat,
      total: taxable + vat
    };
    setItems(updated);
  };

  // Financial calculations
  const subtotal = items.reduce((acc, i) => acc + (i.orderedQuantity * i.unitCost), 0);
  const vatTotal = items.reduce((acc, i) => acc + (i.vatAmount || 0), 0);
  const totalAmount = subtotal + vatTotal;

  const handleSupplierPreset = (supplier: typeof COMMON_SUPPLIERS[0]) => {
    setSupplierName(supplier.name);
    setSupplierPan(supplier.pan);
    setSupplierPhone(supplier.phone);
    setSupplierAddress(supplier.address);
  };

  const handleSave = (targetStatus?: PurchaseOrderStatus) => {
    if (!supplierName.trim()) {
      alert('Please enter a supplier name.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one spare part item to the Purchase Order.');
      return;
    }

    const currentStatus = targetStatus || status;

    const poRecord: PurchaseOrder = {
      id: existingPO?.id || `PO-${Date.now().toString().slice(-4)}`,
      poNumber: poNumber.trim() || `PO-${Date.now()}`,
      date,
      expectedDeliveryDate: expectedDate,
      supplierName: supplierName.trim(),
      supplierPanVat: supplierPan.trim(),
      supplierContact: supplierPhone.trim(),
      supplierAddress: supplierAddress.trim(),
      paymentTerms,
      notes,
      status: currentStatus,
      items,
      subtotal,
      taxableAmount: subtotal,
      vatTotal,
      totalAmount,
      updatedAt: new Date().toISOString()
    };

    onSavePO(poRecord);
    onClose();
  };

  const handleReceiveClick = () => {
    if (items.length === 0) {
      alert('No items in this Purchase Order to receive.');
      return;
    }

    const confirmed = window.confirm(
      `Confirm receiving Purchase Order ${poNumber}?\n\nThis will increase current inventory stock for ${items.length} spare parts and record stock-in movements.`
    );
    if (!confirmed) return;

    const poRecord: PurchaseOrder = {
      id: existingPO?.id || `PO-${Date.now().toString().slice(-4)}`,
      poNumber: poNumber.trim() || `PO-${Date.now()}`,
      date,
      expectedDeliveryDate: expectedDate,
      supplierName: supplierName.trim(),
      supplierPanVat: supplierPan.trim(),
      supplierContact: supplierPhone.trim(),
      supplierAddress: supplierAddress.trim(),
      paymentTerms,
      notes,
      status: 'Received',
      items,
      subtotal,
      taxableAmount: subtotal,
      vatTotal,
      totalAmount,
      updatedAt: new Date().toISOString()
    };

    if (onReceivePO) {
      onReceivePO(poRecord);
    } else {
      onSavePO(poRecord);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  {existingPO ? `Purchase Order ${existingPO.poNumber}` : 'New Spares Purchase Order'}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  status === 'Received' || status === 'Fully Received'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'Ordered'
                      ? 'bg-blue-100 text-blue-800'
                      : status === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Procure replacement spare parts, fluids, and filters with Nepal IRD 13% VAT
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {existingPO && onPrintPO && (
              <button
                type="button"
                onClick={() => onPrintPO(existingPO)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print PO</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Inventory Safety Notice Banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start space-x-2.5 text-blue-900">
            <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Inventory Stock Accounting Rule:</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Creating or saving a Purchase Order as <strong>Draft</strong>, <strong>Pending</strong>, or <strong>Ordered</strong> does <u>NOT</u> increase stock levels. Inventory stock increases only when spare parts are physically checked and marked as <strong>"Received"</strong>.
              </p>
            </div>
          </div>

          {/* Supplier & PO Particulars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Details */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Supplier / Vendor Info</span>
                </span>
                {/* Preset dropdown */}
                <select
                  onChange={(e) => {
                    const found = COMMON_SUPPLIERS.find(s => s.name === e.target.value);
                    if (found) handleSupplierPreset(found);
                  }}
                  className="text-[10px] bg-white border border-slate-300 rounded px-1.5 py-0.5"
                  defaultValue=""
                >
                  <option value="" disabled>Select Known Supplier...</option>
                  {COMMON_SUPPLIERS.map(s => (
                    <option key={s.name} value={s.name}>{s.name.split(' (')[0]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Sipradi Trading Pvt. Ltd."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier PAN / VAT</label>
                  <input
                    type="text"
                    value={supplierPan}
                    onChange={(e) => setSupplierPan(e.target.value)}
                    placeholder="9-digit PAN"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="+977-98..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier Address</label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>
            </div>

            {/* PO Particulars */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>PO Particulars & Lifecycle</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-bold text-slate-800"
                  >
                    <option value="Draft">Draft (Preliminary)</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Ordered">Ordered (Sent to Supplier)</option>
                    <option value="Received">Received (Stock Updated)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Order Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment & Delivery Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30 Days / Cash on Delivery"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Add Spare Item Row */}
          <form onSubmit={handleAddItem} className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 text-[11px] flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Add Spares to Purchase Order</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-6">
                <select
                  value={selectedPartId}
                  onChange={(e) => handlePartSelect(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-medium"
                >
                  <option value="">-- Choose Spare Part from Catalog --</option>
                  {(parts || []).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.partNumber || p.sku}) • Stock: {p.currentStock} {p.unit || 'pcs'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="1"
                  value={lineQty}
                  onChange={(e) => setLineQty(parseInt(e.target.value) || 1)}
                  placeholder="Qty"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono text-center"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="0"
                  value={lineUnitCost}
                  onChange={(e) => setLineUnitCost(parseFloat(e.target.value) || 0)}
                  placeholder="Unit Cost (NPR)"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none font-mono text-right"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!selectedPartId}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg shadow-xs transition"
                >
                  Add Item
                </button>
              </div>
            </div>
          </form>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className="p-2.5 w-10 text-center">#</th>
                  <th className="p-2.5">Part Name</th>
                  <th className="p-2.5 font-mono">Part No. / SKU</th>
                  <th className="p-2.5 text-center">Current Stock</th>
                  <th className="p-2.5 text-center w-20">Ordered Qty</th>
                  <th className="p-2.5 text-right w-28">Unit Cost (NPR)</th>
                  <th className="p-2.5 text-right w-24">13% VAT</th>
                  <th className="p-2.5 text-right w-28">Line Total</th>
                  <th className="p-2.5 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No spare parts added to this purchase order yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{item.partName}</td>
                      <td className="p-2.5 font-mono text-slate-600">{item.partNumber}</td>
                      <td className="p-2.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (item.currentStock || 0) <= 2 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.currentStock ?? '—'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.orderedQuantity}
                          onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value) || 1)}
                          className="w-16 text-center border border-slate-200 rounded p-1 font-mono font-bold"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                          className="w-24 text-right border border-slate-200 rounded p-1 font-mono"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        रु. {(item.vatAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        रु. {(item.lineTotal || 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes & Procurement Instructions</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Specific instructions for supplier (e.g. delivery bay slot, packaging terms)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Excl. VAT):</span>
                <span className="font-bold">रु. {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Nepal VAT (13%):</span>
                <span>रु. {vatTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-black text-slate-900">
                <span>Grand Total (NPR):</span>
                <span className="text-indigo-700">रु. {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {/* Mark as Received Button (Increases Stock) */}
            {status !== 'Received' && status !== 'Fully Received' && (
              <button
                type="button"
                onClick={handleReceiveClick}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition"
                title="Mark PO as Received and physically increase stock in Inventory"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>Mark Received & Update Stock</span>
              </button>
            )}

            {status === 'Draft' && (
              <button
                type="button"
                onClick={() => handleSave('Ordered')}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-sm transition"
              >
                <span>Approve & Mark Ordered</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Purchase Order</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
