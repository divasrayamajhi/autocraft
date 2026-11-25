import React, { useMemo, useState } from 'react';
import {
  JobCard,
  SparePart,
  PartsQuotation,
  PartsQuotationItem,
  WorkshopProfile,
  ServicePriceItem
} from '../../types';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  X,
  Save,
  Printer,
  AlertTriangle
} from 'lucide-react';
import { PrintQuotationModal } from './PrintQuotationModal';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';
import { generateUniqueId, round2 } from '../../utils/accountingEngine';

interface AccidentQuotationModalProps {
  jobCard: JobCard;
  availableParts: SparePart[];
  servicePrices?: ServicePriceItem[];
  profile?: WorkshopProfile;
  onClose: () => void;
  onSaveQuotation: (quotation: PartsQuotation) => void;
}

export const AccidentQuotationModal: React.FC<AccidentQuotationModalProps> = ({
  jobCard,
  availableParts = [],
  servicePrices = [],
  profile,
  onClose,
  onSaveQuotation
}) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Start clean with zero autofilled parts or labor costs
  const [quotedParts, setQuotedParts] = useState<PartsQuotationItem[]>([]);
  const [quotedLabor, setQuotedLabor] = useState<
    Array<{ id: string; code?: string; description: string; hours: number; ratePerHour: number; totalAmount: number }>
  >([]);

  // Search-first Quick-Pick Workshop Stock (search first, then Add from results below)
  const [stockSearchInput, setStockSearchInput] = useState('');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [hasSearchedStock, setHasSearchedStock] = useState(false);
  const [stockQtyById, setStockQtyById] = useState<Record<string, number>>({});

  // Search-first Labor Price Book (search labor cost first, then Add from results below)
  const [laborSearchInput, setLaborSearchInput] = useState('');
  const [laborSearchTerm, setLaborSearchTerm] = useState('');
  const [hasSearchedLabor, setHasSearchedLabor] = useState(false);

  // Optional custom part inputs (blank by default — no autofill)
  const [newPartName, setNewPartName] = useState('');
  const [newPartSku, setNewPartSku] = useState('');
  const [newPartQty, setNewPartQty] = useState<string>('1');
  const [newPartPrice, setNewPartPrice] = useState<string>('');

  // Optional custom labor inputs (blank by default — no autofill)
  const [newLaborDesc, setNewLaborDesc] = useState('');
  const [newLaborRate, setNewLaborRate] = useState<string>('');

  useEscapeKey(!isPrintModalOpen, onClose);

  const stockSearchResults = useMemo(() => {
    if (!hasSearchedStock) return [];
    const q = stockSearchTerm.trim().toLowerCase();
    if (!q) return availableParts;
    return availableParts.filter(
      (p) =>
        (p.partNumber || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.oemNumber || '').toLowerCase().includes(q) ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
    );
  }, [hasSearchedStock, stockSearchTerm, availableParts]);

  const laborSearchResults = useMemo(() => {
    if (!hasSearchedLabor) return [];
    const q = laborSearchTerm.trim().toLowerCase();
    if (!q) return servicePrices;
    return servicePrices.filter(
      (s) =>
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
    );
  }, [hasSearchedLabor, laborSearchTerm, servicePrices]);

  const handleSearchStock = () => {
    setStockSearchTerm(stockSearchInput.trim());
    setHasSearchedStock(true);
  };

  const handleSearchLabor = () => {
    setLaborSearchTerm(laborSearchInput.trim());
    setHasSearchedLabor(true);
  };

  const handleAddStockPart = (part: SparePart) => {
    const qty = Math.max(1, stockQtyById[part.id] || 1);
    const existingIdx = quotedParts.findIndex((p) => p.partId === part.id);
    if (existingIdx >= 0) {
      const updated = [...quotedParts];
      const nextQty = updated[existingIdx].quantity + qty;
      updated[existingIdx] = {
        ...updated[existingIdx],
        quantity: nextQty,
        total: round2(nextQty * updated[existingIdx].unitPrice)
      };
      setQuotedParts(updated);
    } else {
      const newItem: PartsQuotationItem = {
        partId: part.id,
        partName: part.name,
        sku: part.partNumber || part.sku,
        quantity: qty,
        unitPrice: part.sellingPrice,
        discount: 0,
        vatRate: 13,
        total: round2(qty * part.sellingPrice)
      };
      setQuotedParts([...quotedParts, newItem]);
    }
    setStockQtyById((prev) => ({ ...prev, [part.id]: 1 }));
  };

  const handleAddManualPart = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newPartName.trim();
    const parsedQty = Math.max(1, parseInt(newPartQty, 10) || 1);
    const parsedPrice = Math.max(0, parseFloat(newPartPrice) || 0);
    if (!trimmedName) return;
    const newItem: PartsQuotationItem = {
      partId: generateUniqueId('CUST'),
      partName: trimmedName,
      sku: newPartSku.trim() || 'CUSTOM',
      quantity: parsedQty,
      unitPrice: parsedPrice,
      discount: 0,
      vatRate: 13,
      total: round2(parsedQty * parsedPrice)
    };
    setQuotedParts([...quotedParts, newItem]);
    setNewPartName('');
    setNewPartSku('');
    setNewPartQty('1');
    setNewPartPrice('');
  };

  const handleAddCatalogLabor = (service: ServicePriceItem) => {
    const fixedRate = round2(service.fixedPrice ?? service.baseLaborRate ?? 0);
    const newLbr = {
      id: generateUniqueId('LBR'),
      code: service.code,
      description: service.code ? `${service.code} — ${service.name}` : service.name,
      hours: 1,
      ratePerHour: fixedRate,
      totalAmount: fixedRate
    };
    setQuotedLabor([...quotedLabor, newLbr]);
  };

  const handleAddManualLabor = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDesc = newLaborDesc.trim();
    const parsedRate = Math.max(0, parseFloat(newLaborRate) || 0);
    if (!trimmedDesc) return;
    const newLbr = {
      id: generateUniqueId('LBR'),
      description: trimmedDesc,
      hours: 1,
      ratePerHour: parsedRate,
      totalAmount: round2(parsedRate)
    };
    setQuotedLabor([...quotedLabor, newLbr]);
    setNewLaborDesc('');
    setNewLaborRate('');
  };

  // Computations
  const partsSubtotal = round2(quotedParts.reduce((acc, p) => acc + p.total, 0));
  const laborSubtotal = round2(quotedLabor.reduce((acc, l) => acc + l.totalAmount, 0));
  const totalTaxable = round2(partsSubtotal + laborSubtotal);
  const vatAmount = round2(totalTaxable * 0.13);
  const grandTotal = round2(totalTaxable + vatAmount);

  const handleSave = () => {
    const quotationNumber = `QUOT-81-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const quotation: PartsQuotation = {
      id: generateUniqueId('PQ'),
      quotationNumber,
      customerId: jobCard.customerId,
      customerName: jobCard.customerName,
      customerPhone: jobCard.customerPhone,
      date: todayStr,
      expiryDate: todayStr,
      items: quotedParts,
      subtotal: totalTaxable,
      vatAmount,
      grandTotal,
      status: 'Sent',
      jobCardId: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      vehicleReg: jobCard.vehicle.registrationNumber,
      vehicleMake: jobCard.vehicle.brand,
      vehicleModel: jobCard.vehicle.model,
      vinNumber: jobCard.vehicle.vinNumber || jobCard.vehicle.chassisNumber,
      engineNumber: jobCard.vehicle.engineNumber,
      laborItems: quotedLabor,
      notes: 'Preliminary vehicle repair quotation based on workshop inspection.'
    };

    onSaveQuotation(quotation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-[#E2E8F0] overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#0F3D5E] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center text-white font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Vehicle Repair &amp; Customer Quotation
                </h3>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-white/15 text-sky-100 border border-white/20">
                  Pre-Approval Estimate
                </span>
              </div>
              <p className="text-xs text-sky-200/85 mt-0.5">
                Linked to Job Card: <strong className="text-white font-mono">{jobCard.jobCardNumber}</strong> • {jobCard.vehicle.registrationNumber} ({jobCard.vehicle.brand} {jobCard.vehicle.model}) • {jobCard.customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close quotation dialog"
            className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quotation Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* SECTION 1: SPARE PARTS TO REPLACE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h4 className="font-bold text-[#0F172A] text-sm flex items-center space-x-1.5">
                <span>1. Estimated Replacement Spare Parts</span>
                <span className="text-xs text-[#64748B] font-normal">({quotedParts.length} line items)</span>
              </h4>
              <span className="font-mono font-bold text-[#0F3D5E]">
                Parts Total: Rs. {partsSubtotal.toLocaleString()}
              </span>
            </div>

            {/* Quick-Pick Workshop Stock: Search First -> Display Results Below -> Add */}
            <div className="bg-[#F0F9FF] p-3 rounded-xl border border-[#BAE6FD] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#0F3D5E]">Quick-Pick Workshop Stock</span>
                <span className="text-[11px] text-[#0284C7]">Search by Part Number, SKU, or Name, then click Add</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stockSearchInput}
                    onChange={(e) => setStockSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchStock();
                      }
                    }}
                    placeholder="Enter Part Number, SKU, or Spare Part Name..."
                    className="w-full border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 bg-white text-xs text-[#0F172A] outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSearchStock}
                    className="px-4 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Stock</span>
                  </button>
                  {hasSearchedStock && (
                    <button
                      type="button"
                      onClick={() => {
                        setStockSearchInput('');
                        setStockSearchTerm('');
                        setHasSearchedStock(false);
                      }}
                      className="px-3 py-2 bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] rounded-lg font-semibold transition whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {hasSearchedStock && (
                stockSearchResults.length === 0 ? (
                  <div className="p-2.5 bg-white border border-amber-200 rounded-lg text-[11px] text-[#B45309] flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                    <span>No workshop stock parts found matching &ldquo;{stockSearchTerm}&rdquo;.</span>
                  </div>
                ) : (
                  <div className="bg-white border border-[#CBD5E1] rounded-lg divide-y divide-[#E2E8F0] max-h-48 overflow-y-auto scrollbar-clean">
                    {stockSearchResults.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#0F3D5E]">
                              {p.partNumber || p.sku}
                            </span>
                            <span className="font-bold text-[#0F172A] truncate">{p.name}</span>
                          </div>
                          <div className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                            Rate: <strong className="text-[#0F172A]">Rs. {p.sellingPrice.toLocaleString()}</strong> · Stock: {p.currentStock} {p.unit}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <input
                            type="number"
                            min={1}
                            value={stockQtyById[p.id] ?? 1}
                            onChange={(e) =>
                              setStockQtyById((prev) => ({
                                ...prev,
                                [p.id]: Math.max(1, parseInt(e.target.value, 10) || 1)
                              }))
                            }
                            className="w-14 border border-[#CBD5E1] rounded-lg px-2 py-1 text-center font-mono font-bold bg-white"
                            aria-label="Quantity"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddStockPart(p)}
                            className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold inline-flex items-center space-x-1 whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Quoted parts table */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-2.5">Part Name &amp; Specs</th>
                    <th className="p-2.5">Part # / SKU</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Unit Rate (NPR)</th>
                    <th className="p-2.5 text-right">Total (NPR)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {quotedParts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-5 text-center text-[#64748B]">
                        No spare parts added yet. Search workshop stock above or enter a custom spare part below.
                      </td>
                    </tr>
                  ) : (
                    quotedParts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-medium text-[#0F172A]">{p.partName}</td>
                        <td className="p-2.5 font-mono text-[#0284C7]">{p.sku}</td>
                        <td className="p-2.5 text-center font-mono">{p.quantity}</td>
                        <td className="p-2.5 text-right font-mono">Rs. {p.unitPrice.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#0F172A]">
                          Rs. {p.total.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setQuotedParts(quotedParts.filter((_, i) => i !== idx))}
                            className="text-[#64748B] hover:text-[#DC2626] p-1"
                            aria-label="Remove part"
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

            {/* Optional Custom Part Add Row */}
            <form onSubmit={handleAddManualPart} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
              <div className="sm:col-span-2">
                <input
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="Custom / External Part Name"
                  className="w-full border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white"
                />
              </div>
              <div>
                <input
                  value={newPartSku}
                  onChange={(e) => setNewPartSku(e.target.value.toUpperCase())}
                  placeholder="Part Number"
                  className="w-full border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white font-mono uppercase"
                />
              </div>
              <div className="flex space-x-1.5">
                <input
                  type="number"
                  min="1"
                  value={newPartQty}
                  onChange={(e) => setNewPartQty(e.target.value)}
                  placeholder="Qty"
                  className="w-16 border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={newPartPrice}
                  onChange={(e) => setNewPartPrice(e.target.value)}
                  placeholder="Price (NPR)"
                  className="w-full border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!newPartName.trim()}
                className="px-3 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg font-bold whitespace-nowrap"
              >
                + Add Custom Part
              </button>
            </form>
          </div>

          {/* SECTION 2: LABOR & DENT/PAINT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <h4 className="font-bold text-[#0F172A] text-sm flex items-center space-x-1.5">
                <span>2. Estimated Labor, Denting &amp; Paint Oven Bake</span>
                <span className="text-xs text-[#64748B] font-normal">({quotedLabor.length} operations)</span>
              </h4>
              <span className="font-mono font-bold text-[#0284C7]">
                Labor Total: Rs. {laborSubtotal.toLocaleString()}
              </span>
            </div>

            {/* Search-First Labor Cost Lookup */}
            <div className="bg-[#F0F9FF] p-3 rounded-xl border border-[#BAE6FD] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#0F3D5E]">Search Workshop Labor Price Book</span>
                <span className="text-[11px] text-[#0284C7]">Search labor code or task name first, then click Add</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={laborSearchInput}
                    onChange={(e) => setLaborSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchLabor();
                      }
                    }}
                    placeholder="Enter Labor Task Code, Service Name, or Dent/Paint..."
                    className="w-full border border-[#CBD5E1] rounded-lg pl-9 pr-3 py-2 bg-white text-xs text-[#0F172A] outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleSearchLabor}
                    className="px-4 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg font-bold flex items-center space-x-1.5 transition whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Labor</span>
                  </button>
                  {hasSearchedLabor && (
                    <button
                      type="button"
                      onClick={() => {
                        setLaborSearchInput('');
                        setLaborSearchTerm('');
                        setHasSearchedLabor(false);
                      }}
                      className="px-3 py-2 bg-white border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] rounded-lg font-semibold transition whitespace-nowrap"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {hasSearchedLabor && (
                laborSearchResults.length === 0 ? (
                  <div className="p-2.5 bg-white border border-amber-200 rounded-lg text-[11px] text-[#B45309] flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
                    <span>No labor tasks found matching &ldquo;{laborSearchTerm}&rdquo;.</span>
                  </div>
                ) : (
                  <div className="bg-white border border-[#CBD5E1] rounded-lg divide-y divide-[#E2E8F0] max-h-48 overflow-y-auto scrollbar-clean">
                    {laborSearchResults.map((srv) => {
                      const fixedRate = round2(srv.fixedPrice ?? srv.baseLaborRate ?? 0);
                      return (
                        <div
                          key={srv.id}
                          className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#F8FAFC]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#0F3D5E]">
                                {srv.code}
                              </span>
                              <span className="font-bold text-[#0F172A] truncate">{srv.name}</span>
                            </div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              {srv.category} · Fixed Cost: <strong className="font-mono text-[#0F172A]">Rs. {fixedRate.toLocaleString()}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddCatalogLabor(srv)}
                            className="px-3 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold inline-flex items-center space-x-1 whitespace-nowrap shrink-0 self-end sm:self-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                  <tr>
                    <th className="p-2.5">Labor / Panel Repair Description</th>
                    <th className="p-2.5 text-right">Labor Cost (NPR)</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {quotedLabor.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-5 text-center text-[#64748B]">
                        No labor operations added yet. Search the workshop labor price book above or add a custom labor cost below.
                      </td>
                    </tr>
                  ) : (
                    quotedLabor.map((l, idx) => (
                      <tr key={l.id || idx} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-medium text-[#0F172A]">{l.description}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#0F172A]">
                          Rs. {l.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setQuotedLabor(quotedLabor.filter((_, i) => i !== idx))}
                            className="text-[#64748B] hover:text-[#DC2626] p-1"
                            aria-label="Remove labor item"
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

            {/* Optional Custom Labor Input Row */}
            <form onSubmit={handleAddManualLabor} className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
              <div className="sm:col-span-3">
                <input
                  value={newLaborDesc}
                  onChange={(e) => setNewLaborDesc(e.target.value)}
                  placeholder="Custom Labor / Denting & Paint Description"
                  className="w-full border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  value={newLaborRate}
                  onChange={(e) => setNewLaborRate(e.target.value)}
                  placeholder="Labor Cost (NPR)"
                  className="w-full border border-[#CBD5E1] rounded-lg p-2 outline-none bg-white font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={!newLaborDesc.trim()}
                className="px-3 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg font-bold whitespace-nowrap"
              >
                + Add Custom Labor
              </button>
            </form>
          </div>

          {/* Preliminary Estimate Disclaimer */}
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-950">
            <span className="font-bold block text-xs mb-0.5">Note:</span>
            The quotation is a preliminary estimate based on the inspection of the vehicle. The final invoice may differ from the quoted amount, as the quotation is an estimated cost and may be subject to change depending on the actual work and parts required.
          </div>
        </div>

        {/* Bottom Total & Dispatch Bar */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-[10px] text-[#64748B] font-bold uppercase block">Taxable Subtotal</span>
              <span className="font-mono font-bold text-[#0F172A]">Rs. {totalTaxable.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#0284C7] font-bold uppercase block">Nepal 13% VAT</span>
              <span className="font-mono font-bold text-[#0284C7]">Rs. {vatAmount.toLocaleString()}</span>
            </div>
            <div className="pl-4 border-l border-[#CBD5E1]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block">Gross Quotation Amount</span>
              <span className="font-mono font-black text-lg text-[#0F3D5E]">
                Rs. {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#CBD5E1] rounded-lg font-semibold text-[#0F172A] text-xs hover:bg-[#F1F5F9] whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={quotedParts.length === 0 && quotedLabor.length === 0}
              className="px-4 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition whitespace-nowrap"
              title="Print standard A4 Repair Quotation"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Quotation</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={quotedParts.length === 0 && quotedLabor.length === 0}
              className="px-5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Publish Quotation</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRINT A4 QUOTATION MODAL */}
      {isPrintModalOpen && (
        <PrintQuotationModal
          quotation={{
            id: generateUniqueId('QUOTE'),
            quotationNumber: `QT-${Date.now().toString().slice(-4)}`,
            customerId: jobCard.customerId,
            jobCardId: jobCard.id,
            jobCardNumber: jobCard.jobCardNumber,
            customerName: jobCard.customerName,
            customerPhone: jobCard.customerPhone,
            vehicleReg: jobCard.vehicle.registrationNumber,
            vehicleMake: jobCard.vehicle.brand,
            vehicleModel: jobCard.vehicle.model,
            vinNumber: jobCard.vehicle.vinNumber || jobCard.vehicle.chassisNumber,
            items: quotedParts,
            laborItems: quotedLabor,
            subtotal: totalTaxable,
            vatAmount,
            grandTotal,
            date: new Date().toISOString().split('T')[0],
            expiryDate: new Date().toISOString().split('T')[0],
            status: 'Sent'
          }}
          jobCard={jobCard}
          profile={profile}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
