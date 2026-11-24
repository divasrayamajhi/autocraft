import React, { useState, useRef } from 'react';
import { printElement } from '../../utils/printDocument';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  QrCode, 
  Barcode, 
  RotateCcw, 
  ArrowRight, 
  Truck, 
  FileText, 
  DollarSign, 
  Tag, 
  Edit3, 
  X, 
  Printer, 
  Layers, 
  Filter,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Eye,
  ShoppingBag,
  ShoppingCart,
  ArrowDownCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { DraggableTabBar } from '../common/DraggableTabBar';
import { PaginationBar } from '../common/PaginationBar';
import {
  generateUniqueId,
  getNepalFiscalYear,
  getNextSequentialDocNumber,
  round2,
} from '../../utils/accountingEngine';
import { 
  SparePart, 
  PartsQuotation, 
  PartsSalesOrder, 
  PartsSalesReturn, 
  Customer,
  PurchaseOrder,
  UserRole,
  WorkshopProfile,
  Invoice
} from '../../types';
import { OtcOrderModal } from './OtcOrderModal';
import { SalesReturnModal } from './SalesReturnModal';
import { InventoryDocSlipModal } from './InventoryDocSlipModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { PrintPurchaseOrderModal } from './PrintPurchaseOrderModal';

interface InventoryManagementProps {
  parts: SparePart[];
  customers?: Customer[];
  quotations?: PartsQuotation[];
  salesOrders?: PartsSalesOrder[];
  salesReturns?: PartsSalesReturn[];
  purchaseOrders?: PurchaseOrder[];
  invoices?: Invoice[];
  profile?: WorkshopProfile;
  userRole: UserRole;
  onAddPart: (part: SparePart) => void;
  onUpdatePart: (part: SparePart) => void;
  onCreatePurchaseOrder?: (po: PurchaseOrder) => void;
  onUpdatePurchaseOrder?: (po: PurchaseOrder) => void;
  onReceivePurchaseOrder?: (po: PurchaseOrder) => void;
  onCreateQuotation?: (quotation: PartsQuotation) => void;
  onCreateSalesOrder?: (order: PartsSalesOrder) => void;
  onDispatchOrder?: (orderId: string, isPartial: boolean) => void;
  onCreateSalesReturn?: (returnData: PartsSalesReturn) => void;
  onViewJobCard?: (jcNumber: string) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onGenerateOtcInvoice?: (order: PartsSalesOrder) => void;
}

type InventorySubTab = 'master' | 'purchase_orders' | 'replenishment' | 'fms_abc' | 'otc_sales' | 'quotations' | 'substitutes' | 'returns';

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  parts = [],
  customers = [],
  quotations = [],
  salesOrders = [],
  salesReturns = [],
  purchaseOrders = [],
  invoices = [],
  profile,
  userRole,
  onAddPart,
  onUpdatePart,
  onCreatePurchaseOrder,
  onUpdatePurchaseOrder,
  onReceivePurchaseOrder,
  onCreateQuotation,
  onCreateSalesOrder,
  onDispatchOrder,
  onCreateSalesReturn,
  onViewJobCard,
  onViewInvoice,
  onGenerateOtcInvoice
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [fmsFilter, setFmsFilter] = useState('All');
  const [abcFilter, setAbcFilter] = useState('All');

  // Purchase Order State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPrintPOOpen, setIsPrintPOOpen] = useState(false);
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('All');
  const [poPage, setPoPage] = useState(1);
  const [poPageSize, setPoPageSize] = useState(25);
  const [otcPage, setOtcPage] = useState(1);
  const [otcPageSize, setOtcPageSize] = useState(25);
  const [quotPage, setQuotPage] = useState(1);
  const [quotPageSize, setQuotPageSize] = useState(25);

  // Barcode / QR inspection modal
  const [barcodeModalPart, setBarcodeModalPart] = useState<SparePart | null>(null);
  const barcodePrintRef = useRef<HTMLDivElement>(null);

  // Edit / Add part modal
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  // Over the Counter Sale & Return Modals
  const [isNewOrderModal, setIsNewOrderModal] = useState(false);
  const [isNewReturnModal, setIsNewReturnModal] = useState(false);

  // Document Slip Preview Modals
  const [viewQuotation, setViewQuotation] = useState<PartsQuotation | null>(null);
  const [viewSalesOrder, setViewSalesOrder] = useState<PartsSalesOrder | null>(null);
  const [viewSalesReturn, setViewSalesReturn] = useState<PartsSalesReturn | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSavePO = (po: PurchaseOrder) => {
    const exists = (purchaseOrders || []).some(p => p.id === po.id);
    if (exists && onUpdatePurchaseOrder) {
      onUpdatePurchaseOrder(po);
      notify(`Purchase Order ${po.poNumber} updated successfully.`);
    } else if (onCreatePurchaseOrder) {
      onCreatePurchaseOrder(po);
      notify(`Purchase Order ${po.poNumber} saved. Stock remains unchanged until received.`);
    }
  };

  const handleReceivePO = (po: PurchaseOrder) => {
    if (onReceivePurchaseOrder) {
      onReceivePurchaseOrder(po);
      notify(`Purchase Order ${po.poNumber} marked as Received. Inventory stock updated successfully!`);
    } else if (onUpdatePurchaseOrder) {
      onUpdatePurchaseOrder({ ...po, status: 'Received' });
      notify(`Purchase Order ${po.poNumber} marked as Received.`);
    }
  };

  const handlePrintPOModal = (po: PurchaseOrder) => {
    setPrintPO(po);
    setIsPrintPOOpen(true);
  };

  const filteredParts = (parts || []).filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.oemNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.compatibleModels || []).some(m => m.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesFms = fmsFilter === 'All' || p.fmsClass === fmsFilter;
    const matchesAbc = abcFilter === 'All' || p.abcClass === abcFilter;

    return matchesSearch && matchesCat && matchesFms && matchesAbc;
  });

  const lowStockParts = parts.filter(p => p.currentStock <= p.minReorderLevel);

  // Purchase Orders & Filtering
  const safePOs = purchaseOrders || [];
  const pendingPOsCount = safePOs.filter(po => po.status === 'Pending' || po.status === 'Pending Approval' || po.status === 'Ordered').length;

  const filteredPOs = safePOs.filter(po => {
    const q = poSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (po.poNumber && po.poNumber.toLowerCase().includes(q)) ||
      (po.supplierName && po.supplierName.toLowerCase().includes(q)) ||
      (po.supplierPanVat && po.supplierPanVat.toLowerCase().includes(q)) ||
      (po.items && po.items.some(item => 
        (item.partName && item.partName.toLowerCase().includes(q)) ||
        (item.partNumber && item.partNumber.toLowerCase().includes(q))
      ))
    );

    const matchesStatus = poStatusFilter === 'All' || (
      poStatusFilter === 'Received' ? (po.status === 'Received' || po.status === 'Fully Received') :
      poStatusFilter === 'Pending' ? (po.status === 'Pending' || po.status === 'Pending Approval') :
      po.status === poStatusFilter
    );

    return matchesQuery && matchesStatus;
  });

  // Total inventory valuation (NPR)
  const totalValuationCost = round2(parts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0));
  const totalValuationSelling = round2(parts.reduce((acc, p) => acc + (p.currentStock * p.sellingPrice), 0));
  const paginatedPOs = filteredPOs.slice((poPage - 1) * poPageSize, poPage * poPageSize);
  const paginatedSalesOrders = salesOrders.slice((otcPage - 1) * otcPageSize, otcPage * otcPageSize);
  const paginatedQuotations = quotations.slice((quotPage - 1) * quotPageSize, quotPage * quotPageSize);

  // Fast lookup linking each OTC Sales Order to its IRD Tax Invoice
  const findLinkedOtcInvoice = (order: PartsSalesOrder): Invoice | undefined => {
    return (invoices || []).find(
      (inv) =>
        (order.invoiceId && inv.id === order.invoiceId) ||
        (order.invoiceNumber && inv.invoiceNumber === order.invoiceNumber) ||
        inv.salesOrderId === order.id ||
        inv.salesOrderNumber === order.orderNumber ||
        inv.jobCardNumber === order.orderNumber ||
        inv.paymentReference === order.orderNumber
    );
  };

  return (
    <div className="space-y-6">
      {/* Clean Minimal Header */}
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0284C7]">
            Spares Master · FMS &amp; ABC · OTC Sales
          </p>
          <h2 className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">
            Spare Parts Master &amp; Warehouse Logistics
          </h2>
          <p className="text-xs text-[#64748B] max-w-2xl mt-1">
            SKU-level barcode tracking, dynamic reorder triggers, FMS/ABC classification, and complete quotation, order, dispatch, and return workflows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsNewOrderModal(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg text-xs font-semibold transition text-center"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>Over the Counter Sale</span>
          </button>
          <button
            onClick={() => {
              setEditingPart(null);
              setIsAddPartModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Master SKU</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#16A34A] px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block truncate">
            Total SKUs in Master
          </span>
          <div className="text-base sm:text-xl font-bold text-[#0F172A] font-mono tabular-nums mt-0.5 truncate">
            {parts.length} Items
          </div>
          <span className="text-[11px] text-[#0284C7] font-medium block truncate">Active Catalog</span>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block truncate">
            Stock Valuation (Cost)
          </span>
          <div className="text-base sm:text-xl font-bold text-[#0F172A] font-mono tabular-nums mt-0.5 truncate">
            Rs. {totalValuationCost.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#64748B] block truncate">
            Retail: Rs. {totalValuationSelling.toLocaleString()}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block truncate">
            Reorder Alerts
          </span>
          <div className="text-base sm:text-xl font-bold text-[#F59E0B] font-mono tabular-nums mt-0.5 truncate">
            {lowStockParts.length} SKUs
          </div>
          <span className="text-[11px] text-[#64748B] block truncate">At or below min level</span>
        </div>

        <div className="bg-[#FFFFFF] p-3.5 sm:p-4 rounded-xl border border-[#E2E8F0] min-w-0">
          <span className="text-[10px] sm:text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block truncate">
            Nepal IRD VAT Rate
          </span>
          <div className="text-base sm:text-xl font-bold text-[#0284C7] font-mono tabular-nums mt-0.5 truncate">
            13% Standard
          </div>
          <span className="text-[11px] text-[#64748B] block truncate">Auto-applied on billing</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs with Draggable & Click Scrolling */}
      <DraggableTabBar className="mb-2">
        {[
          { id: 'master', label: 'Parts Master & Barcodes', icon: Package },
          { id: 'purchase_orders', label: 'Purchase Orders (PO)', icon: ShoppingBag, badge: pendingPOsCount },
          { id: 'replenishment', label: 'Replenishment & Alerts', icon: AlertTriangle, badge: lowStockParts.length },
          { id: 'fms_abc', label: 'FMS & ABC Classification', icon: Layers },
          { id: 'otc_sales', label: 'OTC Spares Sales', icon: ShoppingCart, badge: salesOrders.length },
          { id: 'quotations', label: 'Quotations', icon: FileText, badge: quotations.length },
          { id: 'substitutes', label: 'Cross-References & Substitutes', icon: Sparkles },
          { id: 'returns', label: 'Sales Returns (Credit Notes)', icon: RotateCcw }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as InventorySubTab)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#E2E8F0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isActive ? 'bg-[#0284C7] text-white' : 'bg-[#F59E0B] text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </DraggableTabBar>

      {/* SUBTAB 1: PARTS MASTER & BARCODE TRACKING */}
      {activeSubTab === 'master' && (
        <div className="space-y-4">
          {/* Search & Filter Strip (Stacks cleanly on mobile without overflow) */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="relative w-full lg:flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, OEM #, Part Name, or Vehicle Model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder:text-[#64748B] focus:bg-[#FFFFFF] focus:ring-2 focus:ring-[#0EA5E9] outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A]"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2 w-full lg:w-auto">
              <select
                aria-label="Filter Parts by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full lg:w-auto bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-xs text-[#0F172A] outline-none font-medium"
              >
                <option value="All">All Categories</option>
                <option value="Filters & Fluids">Filters &amp; Fluids</option>
                <option value="Brakes">Brakes</option>
                <option value="Transmission">Transmission</option>
                <option value="Engine">Engine</option>
                <option value="Suspension & Steering">Suspension &amp; Steering</option>
                <option value="Electrical">Electrical</option>
              </select>

              <select
                aria-label="Filter Parts by FMS Class"
                value={fmsFilter}
                onChange={(e) => setFmsFilter(e.target.value)}
                className="w-full lg:w-auto bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-xs text-[#0F172A] outline-none font-medium"
              >
                <option value="All">All FMS</option>
                <option value="Fast">Fast Moving</option>
                <option value="Medium">Medium Moving</option>
                <option value="Slow">Slow Moving</option>
              </select>

              <select
                aria-label="Filter Parts by ABC Class"
                value={abcFilter}
                onChange={(e) => setAbcFilter(e.target.value)}
                className="w-full lg:w-auto bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg px-2.5 py-2 text-xs text-[#0F172A] outline-none font-medium"
              >
                <option value="All">All ABC</option>
                <option value="A">Class A (High Value)</option>
                <option value="B">Class B (Medium)</option>
                <option value="C">Class C (Bulk)</option>
              </select>
            </div>
          </div>

          {/* Mobile & Tablet Card View (< lg) — zero clipping, clear Barcode & Edit actions */}
          <div className="block lg:hidden space-y-3">
            {filteredParts.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B]">
                No spare parts match your current search or filter criteria.
              </div>
            ) : (
              filteredParts.map((part) => {
                const isLow = part.currentStock <= part.minReorderLevel;
                return (
                  <div
                    key={part.id}
                    className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 space-y-3"
                  >
                    {/* Card Header: Part Name, SKU & Stock Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-[#0F172A] leading-snug break-words">
                          {part.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] font-mono">
                          <span className="font-bold text-[#0284C7]">{part.sku}</span>
                          <span className="text-[#CBD5E1]">•</span>
                          <span className="text-[#64748B]">{part.partNumber}</span>
                        </div>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                          isLow
                            ? 'bg-red-50 text-[#DC2626] border-red-200'
                            : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                        }`}
                      >
                        {part.currentStock} {part.unit}
                      </span>
                    </div>

                    {/* Metadata Grid: OEM, Bin, FMS/ABC, Category */}
                    <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] text-[11px]">
                      <div className="min-w-0">
                        <span className="text-[#64748B] block text-[10px]">OEM Number</span>
                        <span className="font-mono font-semibold text-[#0F172A] block truncate">
                          {part.oemNumber || '—'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[#64748B] block text-[10px]">Bin / Rack Location</span>
                        <span className="font-mono font-semibold text-[#0F3D5E] block truncate">
                          {part.rackLocation}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[#64748B] block text-[10px]">Barcode / EAN</span>
                        <span className="font-mono text-[#0F172A] block truncate">
                          {part.barcode || '—'}
                        </span>
                      </div>
                      <div className="flex items-end space-x-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            part.fmsClass === 'Fast'
                              ? 'bg-emerald-100 text-[#16A34A]'
                              : part.fmsClass === 'Medium'
                              ? 'bg-sky-100 text-[#0284C7]'
                              : 'bg-[#E2E8F0] text-[#64748B]'
                          }`}
                        >
                          FMS: {part.fmsClass}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#0F3D5E] border border-[#E2E8F0]">
                          ABC: {part.abcClass}
                        </span>
                      </div>
                    </div>

                    {/* Compatible Models */}
                    {(part.compatibleModels || []).length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold text-[#64748B] mr-1">Fits:</span>
                        {(part.compatibleModels || []).map((m, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pricing & Actions Footer */}
                    <div className="pt-2.5 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-4 text-xs">
                        <div>
                          <span className="text-[10px] text-[#64748B] block">Cost (NPR)</span>
                          <span className="font-mono tabular-nums font-semibold text-[#64748B]">
                            Rs. {part.costPrice.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#64748B] block">Selling (NPR)</span>
                          <span className="font-mono tabular-nums font-bold text-[#0F172A]">
                            Rs. {part.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <button
                          onClick={() => setBarcodeModalPart(part)}
                          className="px-3 py-2 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Barcode className="w-3.5 h-3.5" />
                          <span>Barcode</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingPart(part);
                            setIsAddPartModalOpen(true);
                          }}
                          className="px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0] rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit SKU</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Parts Master Table (>= lg) */}
          <div className="hidden lg:block bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#E2E8F0]">
                    <th className="p-3.5">SKU &amp; Part #</th>
                    <th className="p-3.5">Description &amp; OEM #</th>
                    <th className="p-3.5">Bin Location</th>
                    <th className="p-3.5">Compatible Models</th>
                    <th className="p-3.5 text-center">FMS / ABC</th>
                    <th className="p-3.5 text-center">Stock</th>
                    <th className="p-3.5 text-right">Cost (NPR)</th>
                    <th className="p-3.5 text-right">Selling (NPR)</th>
                    <th className="p-3.5 text-center">Barcode</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[#64748B]">
                        No spare parts match your current search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => {
                      const isLow = part.currentStock <= part.minReorderLevel;
                      return (
                        <tr key={part.id} className="hover:bg-[#F8FAFC] transition">
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#0284C7]">{part.sku}</div>
                            <div className="text-[10px] text-[#64748B] font-mono">{part.partNumber}</div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-[#0F172A]">{part.name}</div>
                            <div className="text-[10px] text-[#64748B] font-mono">OEM: {part.oemNumber}</div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-[#F1F5F9] text-[#0F3D5E] border border-[#E2E8F0]">
                              {part.rackLocation}
                            </span>
                          </td>

                          <td className="p-3.5 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {(part.compatibleModels || []).map((m, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-[#F1F5F9] text-[#0F172A] font-medium">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  part.fmsClass === 'Fast'
                                    ? 'bg-emerald-100 text-[#16A34A]'
                                    : part.fmsClass === 'Medium'
                                    ? 'bg-sky-100 text-[#0284C7]'
                                    : 'bg-[#E2E8F0] text-[#64748B]'
                                }`}
                              >
                                {part.fmsClass}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#0F3D5E] border border-[#E2E8F0]">
                                {part.abcClass}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs border ${
                                isLow
                                  ? 'bg-red-50 text-[#DC2626] border-red-200'
                                  : 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                              }`}
                            >
                              {part.currentStock} {part.unit}
                            </span>
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums text-[#64748B] whitespace-nowrap">
                            Rs. {part.costPrice.toLocaleString()}
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums font-bold text-[#0F172A] whitespace-nowrap">
                            Rs. {part.sellingPrice.toLocaleString()}
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setBarcodeModalPart(part)}
                              className="p-1.5 text-[#0F3D5E] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#E2E8F0] transition"
                              title="Print / Scan Barcode"
                            >
                              <Barcode className="w-4 h-4" />
                            </button>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => {
                                setEditingPart(part);
                                setIsAddPartModalOpen(true);
                              }}
                              className="p-1.5 text-[#0284C7] hover:bg-sky-50 rounded-lg transition"
                              title="Edit Part Master"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB: PURCHASE ORDERS (PO) */}
      {activeSubTab === 'purchase_orders' && (
        <div className="space-y-4">
          {/* Header Strip & Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900">Spares Purchase Orders </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                    Nepal IRD 13% VAT & Stock Accounting
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage vendor procurement orders with complete lifecycle: Draft → Pending → Ordered → Received. 
                  <strong className="text-blue-900 ml-1">Creating a PO does not increase stock; stock updates only upon receipt verification.</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedPO(null);
                  setIsPOModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Total Purchase Orders</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{safePOs.length}</span>
                <span className="text-[10px] text-slate-400 block font-semibold">Registered in System</span>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[11px] text-amber-800 block font-semibold">Pending / Ordered</span>
                <span className="text-base font-extrabold text-amber-900 font-mono">{pendingPOsCount}</span>
                <span className="text-[10px] text-amber-700 block font-semibold">Awaiting Delivery</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[11px] text-emerald-800 block font-semibold">Received & Verified</span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">
                  {safePOs.filter(po => po.status === 'Received' || po.status === 'Fully Received').length}
                </span>
                <span className="text-[10px] text-emerald-700 block font-semibold">Stock In Hand Updated</span>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="text-[11px] text-indigo-800 block font-semibold">Procurement Value</span>
                <span className="text-base font-extrabold text-indigo-900 font-mono">
                  Rs. {safePOs.reduce((acc, po) => acc + (po.totalAmount || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-600 block font-semibold">Incl. 13% Nepal VAT</span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by PO number, supplier name, PAN, or part description..."
                  value={poSearchQuery}
                  onChange={(e) => {
                    setPoSearchQuery(e.target.value);
                    setPoPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={poStatusFilter}
                  onChange={(e) => {
                    setPoStatusFilter(e.target.value);
                    setPoPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received (Stock Added)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-xs">
                    <th className="p-3.5">PO Number</th>
                    <th className="p-3.5">Supplier / Vendor</th>
                    <th className="p-3.5">Order Date</th>
                    <th className="p-3.5">Expected Delivery</th>
                    <th className="p-3.5 text-center">Items</th>
                    <th className="p-3.5 text-right">Total (NPR)</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No purchase orders matching your search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedPOs.map((po) => {
                      const isReceived = po.status === 'Received' || po.status === 'Fully Received';
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <span className="font-mono font-bold text-indigo-700 block">{po.poNumber}</span>
                            <span className="text-[10px] text-slate-400">{po.paymentTerms || 'Standard Terms'}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-slate-900 block">{po.supplierName || po.vendorName}</span>
                            {po.supplierPanVat && (
                              <span className="text-[11px] font-mono text-slate-500">PAN: {po.supplierPanVat}</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600">{po.date}</td>
                          <td className="p-3.5 text-slate-600">{po.expectedDeliveryDate || '—'}</td>
                          <td className="p-3.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {po.items?.length || 0} Spares
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                            Rs. {(po.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isReceived
                                ? 'bg-emerald-100 text-emerald-800'
                                : po.status === 'Ordered'
                                  ? 'bg-blue-100 text-blue-800'
                                  : po.status === 'Cancelled'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isReceived && <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-0.5 inline" />}
                              <span>{po.status}</span>
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Receive Stock Button (Only if not already received) */}
                              {!isReceived && po.status !== 'Cancelled' && (
                                <button
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      `Mark PO ${po.poNumber} as Received?\n\nThis will increase current inventory stock for ${po.items?.length || 0} spare parts.`
                                    );
                                    if (confirmed) {
                                      handleReceivePO(po);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition shadow-2xs"
                                  title="Receive parts and update stock in inventory"
                                >
                                  <ArrowDownCircle className="w-3 h-3" />
                                  <span>Receive</span>
                                </button>
                              )}

                              {/* View / Edit PO */}
                              <button
                                onClick={() => {
                                  setSelectedPO(po);
                                  setIsPOModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="View & Edit Purchase Order"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Print A4 PO */}
                              <button
                                onClick={() => handlePrintPOModal(po)}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                title="Print Standard A4 Purchase Order"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              totalItems={filteredPOs.length}
              currentPage={poPage}
              pageSize={poPageSize}
              onPageChange={setPoPage}
              onPageSizeChange={(size) => {
                setPoPageSize(size);
                setPoPage(1);
              }}
              itemLabel="purchase orders"
            />
          </div>
        </div>
      )}

      {/* SUBTAB 2: REPLENISHMENT PLANNING & ALERTS */}
      {activeSubTab === 'replenishment' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Automated Stock Replenishment Planning</h3>
            <p className="text-xs text-slate-500 mb-4">
              Alerts generated when current stock hits Safety Stock or Minimum Reorder point based on lead time and monthly consumption in Nepal.
            </p>

            <div className="divide-y divide-slate-100">
              {lowStockParts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  All spare parts are currently above minimum safety reorder thresholds.
                </div>
              ) : (
                lowStockParts.map((part) => (
                  <div key={part.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-teal-700">{part.sku}</span>
                        <span className="text-xs font-bold text-slate-900">{part.name}</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Critical Replenishment
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Current: <strong className="text-rose-700">{part.currentStock}</strong> | Min Level: {part.minReorderLevel} | Safety Stock: {part.safetyStock} | Monthly Consumption: {part.monthlyConsumption} {part.unit}
                      </p>
                      <p className="text-[11px] text-slate-400">Vendor: {part.preferredVendor} (Lead Time: {part.leadTimeDays} days)</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const orderQty = Math.max(5, (part.maxStockLevel || 10) - part.currentStock);
                          const cost = part.purchasePrice || part.costPrice || 500;
                          const taxable = round2(orderQty * cost);
                          const vat = round2(taxable * 0.13);
                          const todayAd = new Date().toISOString().slice(0, 10);
                          const poFy = getNepalFiscalYear(todayAd).replace('/', '-');
                          setSelectedPO({
                            id: generateUniqueId('PO'),
                            poNumber: getNextSequentialDocNumber(
                              safePOs.map((p) => p.poNumber),
                              'PO',
                              poFy,
                              5
                            ),
                            date: todayAd,
                            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                            supplierName: part.preferredVendor || 'Sipradi Trading Pvt. Ltd.',
                            supplierPanVat: '300049211',
                            supplierContact: '+977-1-4240000',
                            supplierAddress: 'Kathmandu, Nepal',
                            paymentTerms: 'Net 30 Days (Credit)',
                            status: 'Pending',
                            items: [{
                              partId: part.id,
                              partNumber: part.partNumber || part.sku,
                              partName: part.name,
                              currentStock: part.currentStock,
                              orderedQuantity: orderQty,
                              unitCost: cost,
                              vatRate: 13,
                              vatAmount: vat,
                              lineTotal: taxable + vat,
                              quantity: orderQty,
                              unitPrice: cost,
                              total: taxable + vat
                            }],
                            subtotal: taxable,
                            taxableAmount: taxable,
                            vatTotal: vat,
                            totalAmount: taxable + vat,
                            notes: `Auto-replenishment for low safety stock (${part.currentStock}/${part.minReorderLevel})`
                          });
                          setIsPOModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Create PO ({Math.max(5, (part.maxStockLevel || 10) - part.currentStock)} {part.unit})</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FMS & ABC CLASSIFICATION */}
      {activeSubTab === 'fms_abc' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FMS Classification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div>
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Velocity Analysis</span>
              <h3 className="text-base font-bold text-slate-900">FMS (Fast, Medium, Slow) Matrix</h3>
              <p className="text-xs text-slate-500">Based on consumption frequency and repair job turnaround.</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-950 block">Fast Moving (F)</span>
                  <span className="text-emerald-700 text-[11px]">Oil filters, brake pads, air filters, wiper blades</span>
                </div>
                <span className="font-mono font-bold text-emerald-900">{parts.filter(p => p.fmsClass === 'Fast').length} SKUs</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-950 block">Medium Moving (M)</span>
                  <span className="text-blue-700 text-[11px]">Clutch plates, spark plugs, drive belts, tie-rod ends</span>
                </div>
                <span className="font-mono font-bold text-blue-900">{parts.filter(p => p.fmsClass === 'Medium').length} SKUs</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">Slow Moving (S)</span>
                  <span className="text-slate-600 text-[11px]">Steering racks, ECM modules, radiators, body panels</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{parts.filter(p => p.fmsClass === 'Slow').length} SKUs</span>
              </div>
            </div>
          </div>

          {/* ABC Classification */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div>
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Valuation Analysis</span>
              <h3 className="text-base font-bold text-slate-900">ABC Inventory Valuation</h3>
              <p className="text-xs text-slate-500">Pareto 80/20 rule classification of inventory capital.</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-purple-950 block">Category A (High Value, 70% Capital)</span>
                  <span className="text-purple-700 text-[11px]">Strict perpetual audit, low buffer, high security</span>
                </div>
                <span className="font-mono font-bold text-purple-900">{parts.filter(p => p.abcClass === 'A').length} SKUs</span>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-indigo-950 block">Category B (Medium Value, 20% Capital)</span>
                  <span className="text-indigo-700 text-[11px]">Regular periodic reordering and lead time monitoring</span>
                </div>
                <span className="font-mono font-bold text-indigo-900">{parts.filter(p => p.abcClass === 'B').length} SKUs</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">Category C (Bulk Volume, 10% Capital)</span>
                  <span className="text-slate-600 text-[11px]">Two-bin system, bulk replenishment, nuts & washers</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{parts.filter(p => p.abcClass === 'C').length} SKUs</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: OTC SPARES SALES & DISPATCH */}
      {activeSubTab === 'otc_sales' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Over-the-Counter (OTC) Spares Sales & Dispatch</h3>
                <p className="text-xs text-slate-500">Issue over-the-counter spare parts sales orders, verify live stock availability, dispatch inventory, and calculate 13% Nepal VAT.</p>
              </div>
              <button
                onClick={() => setIsNewOrderModal(true)}
                className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Over the Counter Sale</span>
              </button>
            </div>

            {/* OTC Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Total OTC Orders</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{salesOrders.length}</span>
                <span className="text-[10px] text-[#0284C7] block font-semibold">
                  NPR {salesOrders.reduce((sum, o) => sum + o.grandTotal, 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Dispatched Orders</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {salesOrders.filter(o => o.dispatchStatus === 'Fully Dispatched').length}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">Stock issued from shelves</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Pending Dispatch</span>
                <span className="text-base font-extrabold text-amber-600 font-mono">
                  {salesOrders.filter(o => o.dispatchStatus !== 'Fully Dispatched').length}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">Awaiting warehouse pickup</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Nepal VAT (13%)</span>
                <span className="text-base font-extrabold text-[#0F3D5E] font-mono">
                  NPR {salesOrders.reduce((sum, o) => sum + o.vatAmount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">IRD Tax Ledger Ready</span>
              </div>
            </div>

            {/* Pricing Tiers Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                <span className="font-semibold">OTC Pricing Tiers:</span>
                <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">Retail</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Fleet (-10%)</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">Wholesale (-15%)</span>
              </div>
              <span className="text-[11px] text-slate-400">Stock levels deduct automatically on dispatch</span>
            </div>
          </div>

          {/* OTC Sales Orders Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-[#0F3D5E]" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  OTC Sales Orders & Dispatches ({salesOrders.length})
                </h4>
              </div>
            </div>

            {salesOrders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No OTC sales orders recorded yet. Click "Over the Counter Sale" above to create and dispatch an order.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Order # & Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Items Summary</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-center">Dispatch Status</th>
                      <th className="p-3 text-center">Invoice</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedSalesOrders.map(order => {
                      const linkedInvoice = findLinkedOtcInvoice(order);
                      return (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <span className="font-bold font-mono text-slate-900 block">{order.orderNumber}</span>
                          <span className="text-[11px] text-slate-400">{order.date}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{order.customerName}</div>
                          {order.customerPhone && (
                            <span className="text-[10px] font-mono text-slate-400">{order.customerPhone}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs truncate text-[11px] text-slate-600">
                            {order.items.map(item => `${item.quantity}x ${item.partName}`).join(', ')}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">({order.items.length} unique parts)</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            NPR {order.grandTotal.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (VAT: NPR {order.vatAmount.toLocaleString()})
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            order.dispatchStatus === 'Fully Dispatched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.dispatchStatus === 'Partially Dispatched'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {order.dispatchStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {linkedInvoice ? (
                            <button
                              type="button"
                              onClick={() => onViewInvoice && onViewInvoice(linkedInvoice)}
                              className="inline-flex flex-col items-center group"
                              title="Open & Print IRD Tax Invoice"
                            >
                              <span className="font-mono font-bold text-[11px] text-[#0284C7] group-hover:underline">
                                {linkedInvoice.invoiceNumber}
                              </span>
                              <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                linkedInvoice.status === 'Paid'
                                  ? 'bg-emerald-100 text-[#16A34A]'
                                  : 'bg-amber-100 text-[#B45309]'
                              }`}>
                                {linkedInvoice.status}
                              </span>
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              order.invoiceStatus === 'Invoiced'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {order.invoiceStatus}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {order.dispatchStatus !== 'Fully Dispatched' && onDispatchOrder && (
                              <button
                                onClick={() => {
                                  onDispatchOrder(order.id, false);
                                  notify(`Stock dispatched for order ${order.orderNumber}! Shelves updated.`);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                              >
                                Dispatch
                              </button>
                            )}
                            {(linkedInvoice && onViewInvoice) ? (
                              <button
                                type="button"
                                onClick={() => onViewInvoice(linkedInvoice)}
                                className="px-2.5 py-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                                title="View & Print A4 Nepal IRD 13% VAT Tax Invoice"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Tax Invoice</span>
                              </button>
                            ) : onGenerateOtcInvoice ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onGenerateOtcInvoice(order);
                                  notify(`IRD Tax Invoice generated for OTC order ${order.orderNumber}.`);
                                }}
                                className="px-2.5 py-1 bg-[#0F3D5E] hover:bg-[#0A2B43] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                                title="Generate & Print Nepal IRD 13% VAT Tax Invoice"
                              >
                                <FileText className="w-3 h-3 text-[#0EA5E9]" />
                                <span>Generate Invoice</span>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setViewSalesOrder(order)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Challan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                <PaginationBar
                  totalItems={salesOrders.length}
                  currentPage={otcPage}
                  pageSize={otcPageSize}
                  onPageChange={setOtcPage}
                  onPageSizeChange={(size) => {
                    setOtcPageSize(size);
                    setOtcPage(1);
                  }}
                  itemLabel="OTC sales orders"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: QUOTATIONS REGISTER */}
      {activeSubTab === 'quotations' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#0284C7]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Customer Repair Estimates & Quotations</h3>
                  <p className="text-xs text-slate-500">
                    Preliminary cost estimates for vehicle repairs and spare parts generated from Job Cards.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Total Quotations</span>
                  <span className="font-mono font-extrabold text-slate-900 text-sm">{quotations.length}</span>
                </div>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Estimated Value</span>
                  <span className="font-mono font-extrabold text-[#0284C7] text-sm">
                    NPR {quotations.reduce((sum, q) => sum + q.grandTotal, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {quotations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No quotations recorded yet. Repair quotations generated from Job Cards will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Quotation # & Date</th>
                      <th className="p-3">Customer & Vehicle</th>
                      <th className="p-3">Validity Expiry</th>
                      <th className="p-3">Items Count</th>
                      <th className="p-3 text-right">Grand Total (Inc VAT)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedQuotations.map(quot => (
                      <tr key={quot.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <span className="font-bold font-mono text-slate-900 block">{quot.quotationNumber}</span>
                          <span className="text-[11px] text-slate-400 block">{quot.date}</span>
                          {quot.jobCardNumber && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[#0F3D5E] text-[10px] font-bold font-mono">
                                JC: {quot.jobCardNumber}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{quot.customerName}</div>
                          {quot.vehicleReg && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              {quot.vehicleReg} {quot.vehicleModel ? `• ${quot.vehicleModel}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{quot.expiryDate}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">{quot.items.length} parts</td>
                        <td className="p-3 text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            NPR {quot.grandTotal.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Subtotal: NPR {quot.subtotal.toLocaleString()})
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            quot.status === 'Converted to Order'
                              ? 'bg-emerald-100 text-emerald-800'
                              : quot.status === 'Sent'
                              ? 'bg-sky-100 text-sky-800'
                              : quot.status === 'Expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {quot.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {quot.jobCardNumber && onViewJobCard && (
                              <button
                                onClick={() => onViewJobCard(quot.jobCardNumber!)}
                                className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-[#0F3D5E] rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                                title="Directly access linked Job Card"
                              >
                                <Wrench className="w-3 h-3" />
                                <span>Job Card</span>
                              </button>
                            )}
                            <button
                              onClick={() => setViewQuotation(quot)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Slip</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationBar
                  totalItems={quotations.length}
                  currentPage={quotPage}
                  pageSize={quotPageSize}
                  onPageChange={setQuotPage}
                  onPageSizeChange={(size) => {
                    setQuotPageSize(size);
                    setQuotPage(1);
                  }}
                  itemLabel="quotations"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: CROSS-REFERENCES & SUBSTITUTES */}
      {activeSubTab === 'substitutes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Alternative & Substitute Item Cross-References</h3>
            <p className="text-xs text-slate-500 mb-4">
              Allows technicians and storekeepers to safely substitute OEM items with high-grade aftermarket alternatives (e.g. Bosch, Minda, Mann-Filter) during stockouts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-900">Hyundai Oil Filter 26300-35505</span>
                  <span className="text-teal-700 font-mono">PART-01</span>
                </div>
                <div className="text-slate-500 text-[11px]">Primary OEM application: Creta, Seltos, Venue, i20</div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Verified Substitute:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                    Bosch 0986AF0059 (PART-05)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: SALES RETURNS & CREDIT NOTES */}
      {activeSubTab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales Return & Restocking Management</h3>
                <p className="text-xs text-slate-500">Process returned parts, verify seal integrity, replenish inventory counts, and issue IRD-compliant Credit Notes.</p>
              </div>
              <button
                onClick={() => setIsNewReturnModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Process Return</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Returns Processed</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{salesReturns.length}</span>
                <span className="text-[10px] text-rose-600 block font-semibold">Authorized Cases</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Total Credit Value</span>
                <span className="text-base font-extrabold text-rose-700 font-mono">
                  NPR {salesReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">Refunded / Credited</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Restocked Parts</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {salesReturns.reduce((sum, r) => sum + r.items.reduce((acc, it) => acc + it.quantity, 0), 0)} pcs
                </span>
                <span className="text-[10px] text-emerald-600 block font-semibold">Added to Shelves</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">IRD Credit Notes</span>
                <span className="text-base font-extrabold text-slate-800 font-mono">{salesReturns.length}</span>
                <span className="text-[10px] text-slate-400 block font-semibold">Synced with IRD VAT Portal</span>
              </div>
            </div>
          </div>

          {/* Returns Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Authorized Returns & Credit Note Ledger ({salesReturns.length})
            </h4>

            {salesReturns.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No sales return claims logged for current period. Click "Process Return" above to register a return and restock parts.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="p-3">Credit Note # & Date</th>
                      <th className="p-3">Customer & Original Inv</th>
                      <th className="p-3">Returned Item(s)</th>
                      <th className="p-3">Inspection Reason</th>
                      <th className="p-3 text-right">Credit Amount</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesReturns.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <span className="font-bold font-mono text-rose-700 block">{ret.creditNoteNumber}</span>
                          <span className="text-[10px] font-mono text-slate-400">{ret.returnNumber} • {ret.date}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{ret.customerName}</span>
                          <span className="text-[10px] font-mono text-slate-400">Ref: {ret.originalInvoiceNumber}</span>
                        </td>
                        <td className="p-3">
                          {ret.items.map((item, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 font-medium">
                              <span className="font-bold text-slate-900 font-mono">{item.quantity}x</span> {item.partName}
                            </div>
                          ))}
                        </td>
                        <td className="p-3 max-w-xs text-[11px] text-slate-600">
                          {ret.reason}
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-mono font-bold text-rose-700 text-sm block">
                            NPR {ret.totalRefundAmount.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">13% VAT Reversed</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ret.status === 'Restocked'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {ret.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setViewSalesReturn(ret)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 ml-auto transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Credit Note</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: BARCODE / QR CODE LABEL */}
      {barcodeModalPart && (
        <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-xl max-w-sm w-full p-5 border border-[#E2E8F0] text-center">
            <div className="print:hidden flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h4 className="text-sm font-bold text-[#0F172A]">Bin Barcode Label</h4>
              <button onClick={() => setBarcodeModalPart(null)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={barcodePrintRef} className="mt-4 p-4 border-2 border-dashed border-[#CBD5E1] rounded-lg bg-[#FFFFFF] space-y-3">
              <div className="text-xs font-bold text-[#0F3D5E] tracking-tight uppercase">
                {profile?.name || 'CONTINENTAL AUTO KRAFT'}
              </div>
              <div className="text-xs font-bold text-[#0F172A]">{barcodeModalPart.name}</div>
              <div className="text-xs font-mono text-[#0284C7] font-bold">{barcodeModalPart.sku}</div>

              {/* Barcode graphic visualization */}
              <div className="bg-[#FFFFFF] p-3 rounded border border-[#E2E8F0] inline-block mx-auto">
                <div className="flex items-center justify-center space-x-0.5 h-10">
                  {[3,1,2,4,1,3,2,1,4,2,3,1,2,3,1,4,2,1,3,2,4,1].map((w, i) => (
                    <div
                      key={i}
                      className="bg-[#0F172A] h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[10px] text-[#64748B] mt-1 tracking-widest">
                  {barcodeModalPart.barcode}
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-mono font-bold text-[#0F172A] pt-2 border-t border-[#E2E8F0]">
                <span>Rack: {barcodeModalPart.rackLocation}</span>
                <span>Rs. {barcodeModalPart.sellingPrice} + 13% VAT</span>
              </div>
            </div>

            <div className="print:hidden mt-4 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setBarcodeModalPart(null)}
                className="px-4 py-2 border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg font-semibold transition"
              >
                Close
              </button>
              <button
                onClick={() => printElement(barcodePrintRef.current, `Barcode-${barcodeModalPart.sku}`)}
                className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-semibold flex items-center space-x-1 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label Tag</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PART MASTER */}
      {isAddPartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                {editingPart ? `Edit SKU: ${editingPart.sku}` : 'Add Master Spare Part SKU'}
              </h4>
              <button onClick={() => setIsAddPartModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const getNum = (name: string, fallback = 0) =>
                  parseFloat((form.elements.namedItem(name) as HTMLInputElement)?.value || '') || fallback;
                const getInt = (name: string, fallback = 0) =>
                  parseInt((form.elements.namedItem(name) as HTMLInputElement)?.value || '', 10) || fallback;

                const cost = getNum('cost', 0);
                const selling = getNum('selling', 0);
                const modelsStr = getVal('models', 'Creta, Seltos, Venue');
                const models = modelsStr.split(',').map(m => m.trim()).filter(Boolean);

                const partObj: SparePart = {
                  id: editingPart?.id || `PART-${Date.now().toString().slice(-4)}`,
                  sku: getVal('sku', `SKU-PART-${Math.floor(100 + Math.random()*900)}`),
                  partNumber: getVal('partNumber', 'GEN-PART'),
                  oemNumber: getVal('oemNumber', 'OEM-PART'),
                  name: getVal('name', 'Spare Part'),
                  category: (getVal('category', 'Filters & Fluids') as any),
                  compatibleModels: models.length > 0 ? models : ['Universal'],
                  rackLocation: getVal('rack', 'Bin-A1-01'),
                  barcode: getVal('barcode', '8901234' + Math.floor(10000 + Math.random()*90000)),
                  costPrice: cost,
                  sellingPrice: selling,
                  vatRate: 13,
                  hsnSacCode: getVal('hsn', '87083000'),
                  currentStock: getInt('stock', 10),
                  minReorderLevel: getInt('minLevel', 5),
                  maxStockLevel: getInt('maxLevel', 50),
                  safetyStock: 5,
                  monthlyConsumption: 20,
                  unit: (getVal('unit', 'pcs') as any),
                  fmsClass: (getVal('fms', 'Fast') as any),
                  abcClass: (getVal('abc', 'B') as any),
                  substitutePartIds: [],
                  leadTimeDays: 3,
                  lastRestockedDate: new Date().toISOString().slice(0, 10),
                  preferredVendor: getVal('vendor', 'Authorized Nepal Distributor')
                };

                if (editingPart) {
                  onUpdatePart(partObj);
                  notify(`Part ${partObj.sku} updated successfully`);
                } else {
                  onAddPart(partObj);
                  notify(`New Master Part ${partObj.sku} registered`);
                }
                setIsAddPartModalOpen(false);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code</label>
                  <input name="sku" defaultValue={editingPart?.sku || `SKU-PART-${Math.floor(100 + Math.random()*900)}`} className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Part Number</label>
                  <input name="partNumber" defaultValue={editingPart?.partNumber || ''} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">OEM Number</label>
                  <input name="oemNumber" defaultValue={editingPart?.oemNumber || ''} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select name="category" defaultValue={editingPart?.category || 'Filters & Fluids'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium">
                    <option value="Filters & Fluids">Filters & Fluids</option>
                    <option value="Brakes">Brakes</option>
                    <option value="Transmission">Transmission</option>
                    <option value="Engine">Engine</option>
                    <option value="Suspension & Steering">Suspension & Steering</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Body & Glass">Body & Glass</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Part Name</label>
                <input name="name" defaultValue={editingPart?.name || ''} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-semibold" required />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Compatible Models (Comma-separated)</label>
                <input name="models" defaultValue={editingPart?.compatibleModels.join(', ') || 'Creta, Seltos, Venue'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Bin / Rack Location</label>
                  <input name="rack" defaultValue={editingPart?.rackLocation || 'Bin-A1-01'} className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">FMS Class</label>
                  <select name="fms" defaultValue={editingPart?.fmsClass || 'Fast'} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-semibold">
                    <option value="Fast">Fast Moving</option>
                    <option value="Medium">Medium Moving</option>
                    <option value="Slow">Slow Moving</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">ABC Class</label>
                  <select name="abc" defaultValue={editingPart?.abcClass || 'B'} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-semibold">
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Purchase Cost (NPR, excl. VAT)</label>
                  <input name="cost" type="number" defaultValue={editingPart?.costPrice || 1000} className="w-full font-mono font-bold border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Selling Price (NPR, excl. VAT)</label>
                  <input name="selling" type="number" defaultValue={editingPart?.sellingPrice || 1500} className="w-full font-mono font-bold border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Initial Stock</label>
                  <input name="stock" type="number" defaultValue={editingPart?.currentStock || 10} className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Min Reorder</label>
                  <input name="minLevel" type="number" defaultValue={editingPart?.minReorderLevel || 5} className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Max Level</label>
                  <input name="maxLevel" type="number" defaultValue={editingPart?.maxStockLevel || 50} className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Unit</label>
                  <select name="unit" defaultValue={editingPart?.unit || 'pcs'} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF]">
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="liters">liters</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Nepal HSN / HS Code</label>
                  <input name="hsn" defaultValue={editingPart?.hsnSacCode || '87083000'} className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Barcode / EAN</label>
                  <input name="barcode" defaultValue={editingPart?.barcode || ''} placeholder="890..." className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Preferred Distributor</label>
                  <input name="vendor" defaultValue={editingPart?.preferredVendor || 'Authorized Importers Nepal'} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none" required />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddPartModalOpen(false)} className="px-4 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-semibold">Save Master SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW OTC SPARES SALES ORDER & DISPATCH */}
      <OtcOrderModal
        isOpen={isNewOrderModal}
        onClose={() => setIsNewOrderModal(false)}
        parts={parts}
        customers={customers}
        existingOrderNumbers={salesOrders.map((o) => o.orderNumber)}
        onCreateSalesOrder={onCreateSalesOrder}
        onNotify={notify}
      />

      {/* MODAL: PROCESS SALES RETURN & CREDIT NOTE */}
      <SalesReturnModal
        isOpen={isNewReturnModal}
        onClose={() => setIsNewReturnModal(false)}
        parts={parts}
        customers={customers}
        salesOrders={salesOrders}
        invoices={invoices}
        onCreateSalesReturn={onCreateSalesReturn}
        onNotify={notify}
      />

      {/* MODAL: PRINT / VIEW DOCUMENT SLIP */}
      <InventoryDocSlipModal
        isOpen={Boolean(viewQuotation || viewSalesOrder || viewSalesReturn)}
        onClose={() => {
          setViewQuotation(null);
          setViewSalesOrder(null);
          setViewSalesReturn(null);
        }}
        quotation={viewQuotation}
        salesOrder={viewSalesOrder}
        salesReturn={viewSalesReturn}
        profile={profile}
      />

      {/* MODAL: CREATE / EDIT / RECEIVE PURCHASE ORDER */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => {
          setIsPOModalOpen(false);
          setSelectedPO(null);
        }}
        parts={parts}
        existingPO={selectedPO}
        profile={profile}
        onSavePO={handleSavePO}
        onReceivePO={handleReceivePO}
        onPrintPO={handlePrintPOModal}
      />

      {/* MODAL: PRINT STANDARD A4 PURCHASE ORDER */}
      <PrintPurchaseOrderModal
        isOpen={isPrintPOOpen}
        onClose={() => {
          setIsPrintPOOpen(false);
          setPrintPO(null);
        }}
        purchaseOrder={printPO}
        profile={profile}
      />
    </div>
  );
};
