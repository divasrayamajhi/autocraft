import React, { useState } from 'react';
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
  ShoppingBag
} from 'lucide-react';
import { 
  SparePart, 
  PartsQuotation, 
  PartsSalesOrder, 
  PartsSalesReturn, 
  Customer,
  PurchaseOrder,
  UserRole 
} from '../../types';
import { OtcOrderModal } from './OtcOrderModal';
import { SalesReturnModal } from './SalesReturnModal';
import { InventoryDocSlipModal } from './InventoryDocSlipModal';

interface InventoryManagementProps {
  parts: SparePart[];
  customers?: Customer[];
  quotations?: PartsQuotation[];
  salesOrders?: PartsSalesOrder[];
  salesReturns?: PartsSalesReturn[];
  purchaseOrders?: PurchaseOrder[];
  userRole: UserRole;
  onAddPart: (part: SparePart) => void;
  onUpdatePart: (part: SparePart) => void;
  onCreatePurchaseOrder?: (po: PurchaseOrder) => void;
  onCreateQuotation?: (quotation: PartsQuotation) => void;
  onCreateSalesOrder?: (order: PartsSalesOrder) => void;
  onDispatchOrder?: (orderId: string, isPartial: boolean) => void;
  onCreateSalesReturn?: (returnData: PartsSalesReturn) => void;
}

type InventorySubTab = 'master' | 'replenishment' | 'fms_abc' | 'sales_flow' | 'substitutes' | 'returns';

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  parts = [],
  customers = [],
  quotations = [],
  salesOrders = [],
  salesReturns = [],
  purchaseOrders = [],
  userRole,
  onAddPart,
  onUpdatePart,
  onCreatePurchaseOrder,
  onCreateQuotation,
  onCreateSalesOrder,
  onDispatchOrder,
  onCreateSalesReturn
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InventorySubTab>('master');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [fmsFilter, setFmsFilter] = useState('All');
  const [abcFilter, setAbcFilter] = useState('All');

  // Barcode / QR inspection modal
  const [barcodeModalPart, setBarcodeModalPart] = useState<SparePart | null>(null);

  // Edit / Add part modal
  const [isAddPartModalOpen, setIsAddPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);

  // New OTC Quotation / Sales Order Modal
  const [isNewOrderModal, setIsNewOrderModal] = useState(false);
  const [isNewReturnModal, setIsNewReturnModal] = useState(false);
  const [selectedPricingTier, setSelectedPricingTier] = useState<'Retail' | 'Fleet' | 'Insurance' | 'Wholesale'>('Retail');

  // Document Slip Preview Modals
  const [viewQuotation, setViewQuotation] = useState<PartsQuotation | null>(null);
  const [viewSalesOrder, setViewSalesOrder] = useState<PartsSalesOrder | null>(null);
  const [viewSalesReturn, setViewSalesReturn] = useState<PartsSalesReturn | null>(null);
  const [salesPipelineView, setSalesPipelineView] = useState<'all' | 'orders' | 'quotations'>('all');

  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
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

  // Total inventory valuation (NPR)
  const totalValuationCost = parts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);
  const totalValuationSelling = parts.reduce((acc, p) => acc + (p.currentStock * p.sellingPrice), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
              End-to-End Spares Lifecycle
            </span>
            <span className="text-xs text-slate-400">Master Data • FMS & ABC • OTC Sales • Returns</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            Spare Parts Master & Warehouse Logistics
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            SKU-level barcode tracking, dynamic replenishment triggers, FMS (Fast/Medium/Slow) and ABC valuation, interchangeable substitutes, and complete Quotation → Order → Dispatch → Return pipeline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNewOrderModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 shadow-sm"
          >
            New Spares Order
          </button>
          <button
            onClick={() => {
              setEditingPart(null);
              setIsAddPartModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-950"
          >
            <Plus className="w-4 h-4" />
            <span>Add Master SKU</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total SKUs in Master</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{parts.length} Items</div>
          <span className="text-[11px] text-teal-600 font-semibold">Active Catalog</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation (Cost)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">रु. {totalValuationCost.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Retail: रु. {totalValuationSelling.toLocaleString()}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reorder Alerts</span>
          <div className="text-xl font-black text-amber-600 font-mono mt-0.5">{lowStockParts.length} SKUs</div>
          <span className="text-[11px] text-amber-700 font-medium">At or below reorder level</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nepal 13% VAT Standard</span>
          <div className="text-xl font-black text-indigo-700 font-mono mt-0.5">13% Output VAT</div>
          <span className="text-[11px] text-slate-500">Auto-calculated on bill</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-2">
          {[
            { id: 'master', label: 'Parts Master & Barcodes', icon: Package },
            { id: 'replenishment', label: 'Replenishment & Alerts', icon: AlertTriangle, badge: lowStockParts.length },
            { id: 'fms_abc', label: 'FMS & ABC Classification', icon: Layers },
            { id: 'sales_flow', label: 'Quotation → Order → Dispatch', icon: ArrowRight },
            { id: 'substitutes', label: 'Cross-References & Substitutes', icon: Sparkles },
            { id: 'returns', label: 'Sales Returns (Credit Notes)', icon: RotateCcw }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as InventorySubTab)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: PARTS MASTER & BARCODE TRACKING */}
      {activeSubTab === 'master' && (
        <div className="space-y-4">
          {/* Search & Filter Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by SKU, OEM Number, Description, Model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                aria-label="Filter Parts by Category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none font-semibold"
              >
                <option value="All">All Categories</option>
                <option value="Filters & Fluids">Filters & Fluids</option>
                <option value="Brakes">Brakes</option>
                <option value="Transmission">Transmission</option>
                <option value="Engine">Engine</option>
                <option value="Suspension & Steering">Suspension & Steering</option>
                <option value="Electrical">Electrical</option>
              </select>

              <select
                aria-label="Filter Parts by FMS Class"
                value={fmsFilter}
                onChange={(e) => setFmsFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none font-semibold"
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none font-semibold"
              >
                <option value="All">All ABC</option>
                <option value="A">Class A (High Value)</option>
                <option value="B">Class B (Medium)</option>
                <option value="C">Class C (Bulk)</option>
              </select>
            </div>
          </div>

          {/* Parts Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">SKU & Barcode</th>
                  <th className="p-3.5">Description & OEM #</th>
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
              <tbody className="divide-y divide-slate-100">
                {filteredParts.map((part) => {
                  const isLow = part.currentStock <= part.minReorderLevel;
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-teal-700">{part.sku}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{part.partNumber}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{part.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">OEM: {part.oemNumber}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-100 text-slate-800">
                          {part.rackLocation}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(part.compatibleModels || []).map((m, idx) => (
                            <span key={idx} className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            part.fmsClass === 'Fast' ? 'bg-emerald-100 text-emerald-800' :
                            part.fmsClass === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {part.fmsClass}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            part.abcClass === 'A' ? 'bg-purple-100 text-purple-800' :
                            part.abcClass === 'B' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {part.abcClass}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                          isLow ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {part.currentStock} {part.unit}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-600">
                        रु. {part.costPrice.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        रु. {part.sellingPrice.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setBarcodeModalPart(part)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition"
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
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Edit Part Master"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                        onClick={() => notify(`Automated Purchase Order generated for ${part.maxStockLevel - part.currentStock} units of ${part.name}`)}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Auto-PO ({part.maxStockLevel - part.currentStock} {part.unit})
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

      {/* SUBTAB 4: SALES PIPELINE (QUOTATION -> ORDER -> DISPATCH) */}
      {activeSubTab === 'sales_flow' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Over-the-Counter (OTC) Spares Sales Pipeline</h3>
                <p className="text-xs text-slate-500">Manage OTC sales orders, formal customer quotations, stock dispatch, and 13% Nepal VAT invoicing.</p>
              </div>
              <button
                onClick={() => setIsNewOrderModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center space-x-1.5 shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Quotation / Order</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Sales Orders</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{salesOrders.length}</span>
                <span className="text-[10px] text-teal-600 block font-semibold">
                  NPR {salesOrders.reduce((sum, o) => sum + o.grandTotal, 0).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Quotations Active</span>
                <span className="text-base font-extrabold text-slate-900 font-mono">{quotations.length}</span>
                <span className="text-[10px] text-blue-600 block font-semibold">
                  NPR {quotations.reduce((sum, q) => sum + q.grandTotal, 0).toLocaleString()}
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
                <span className="text-[11px] text-slate-500 block">Nepal VAT (13%)</span>
                <span className="text-base font-extrabold text-teal-800 font-mono">
                  NPR {salesOrders.reduce((sum, o) => sum + o.vatAmount, 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">IRD Tax Ledger Ready</span>
              </div>
            </div>

            {/* Pricing Tiers Ribbon & Pipeline Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
                <span className="font-semibold text-slate-500 text-[11px] mr-1">Filter View:</span>
                <button
                  onClick={() => setSalesPipelineView('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    salesPipelineView === 'all' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Records ({salesOrders.length + quotations.length})
                </button>
                <button
                  onClick={() => setSalesPipelineView('orders')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    salesPipelineView === 'orders' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sales Orders ({salesOrders.length})
                </button>
                <button
                  onClick={() => setSalesPipelineView('quotations')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                    salesPipelineView === 'quotations' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Quotations ({quotations.length})
                </button>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                <span>Tiers:</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">Retail</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Fleet (-10%)</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">Wholesale (-15%)</span>
              </div>
            </div>
          </div>

          {/* Sales Orders Table */}
          {(salesPipelineView === 'all' || salesPipelineView === 'orders') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-teal-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Sales Orders & Dispatches ({salesOrders.length})
                  </h4>
                </div>
              </div>

              {salesOrders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No sales orders recorded yet. Click "+ Create Quotation / Order" above to issue spares.
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
                      {salesOrders.map(order => (
                        <tr key={order.id} className="hover:bg-slate-50/70">
                          <td className="p-3">
                            <span className="font-bold font-mono text-slate-900 block">{order.orderNumber}</span>
                            <span className="text-[11px] text-slate-400">{order.date}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{order.customerName}</td>
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
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {order.dispatchStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              order.invoiceStatus === 'Invoiced'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {order.invoiceStatus}
                            </span>
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
                              <button
                                onClick={() => setViewSalesOrder(order)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Challan</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Quotations Table */}
          {(salesPipelineView === 'all' || salesPipelineView === 'quotations') && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Estimates & Quotations ({quotations.length})
                  </h4>
                </div>
              </div>

              {quotations.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No pending quotations. Click "+ Create Quotation / Order" above to generate a client quotation.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                      <tr>
                        <th className="p-3">Quotation # & Date</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Validity Expiry</th>
                        <th className="p-3">Items Count</th>
                        <th className="p-3 text-right">Grand Total (Inc VAT)</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotations.map(quot => (
                        <tr key={quot.id} className="hover:bg-slate-50/70">
                          <td className="p-3">
                            <span className="font-bold font-mono text-slate-900 block">{quot.quotationNumber}</span>
                            <span className="text-[11px] text-slate-400">{quot.date}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{quot.customerName}</td>
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
                                ? 'bg-blue-100 text-blue-800'
                                : quot.status === 'Expired'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {quot.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {quot.status !== 'Converted to Order' && onCreateSalesOrder && (
                                <button
                                  onClick={() => {
                                    const convertedOrder: PartsSalesOrder = {
                                      id: `PSO-${Date.now().toString().slice(-4)}`,
                                      orderNumber: `PSO-81-${Math.floor(1000 + Math.random() * 9000)}`,
                                      quotationId: quot.id,
                                      customerId: quot.customerId,
                                      customerName: quot.customerName,
                                      date: new Date().toISOString().slice(0, 10),
                                      items: quot.items,
                                      subtotal: quot.subtotal,
                                      vatAmount: quot.vatAmount,
                                      grandTotal: quot.grandTotal,
                                      dispatchStatus: 'Fully Dispatched',
                                      invoiceStatus: 'Invoiced'
                                    };
                                    onCreateSalesOrder(convertedOrder);
                                    notify(`Quotation ${quot.quotationNumber} successfully converted to Order ${convertedOrder.orderNumber}! Stock deducted.`);
                                  }}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors"
                                >
                                  Convert to Order
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
                </div>
              )}
            </div>
          )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Bin Barcode Label</h4>
              <button onClick={() => setBarcodeModalPart(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 space-y-3">
              <div className="text-xs font-bold text-slate-800 tracking-tight">
                SAGARMATHA AUTO WORKSHOP
              </div>
              <div className="text-xs font-bold text-slate-900">{barcodeModalPart.name}</div>
              <div className="text-xs font-mono text-teal-700 font-bold">{barcodeModalPart.sku}</div>

              {/* Barcode graphic visualization */}
              <div className="bg-white p-3 rounded border border-slate-200 inline-block mx-auto">
                <div className="flex items-center justify-center space-x-0.5 h-10">
                  {[3,1,2,4,1,3,2,1,4,2,3,1,2,3,1,4,2,1,3,2,4,1].map((w, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 h-full"
                      style={{ width: `${w * 1.5}px` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[10px] text-slate-600 mt-1 tracking-widest">
                  {barcodeModalPart.barcode}
                </div>
              </div>

              <div className="flex justify-between text-[11px] font-mono font-bold text-slate-700 pt-2 border-t border-slate-200">
                <span>Rack: {barcodeModalPart.rackLocation}</span>
                <span>रु. {barcodeModalPart.sellingPrice} + 13% VAT</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setBarcodeModalPart(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center space-x-1"
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bin / Rack Location</label>
                  <input name="rack" defaultValue={editingPart?.rackLocation || 'Bin-A1-01'} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">FMS Class</label>
                  <select name="fms" defaultValue={editingPart?.fmsClass || 'Fast'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-bold">
                    <option value="Fast">Fast Moving</option>
                    <option value="Medium">Medium Moving</option>
                    <option value="Slow">Slow Moving</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ABC Class</label>
                  <select name="abc" defaultValue={editingPart?.abcClass || 'B'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-bold">
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (NPR, excl. VAT)</label>
                  <input name="cost" type="number" defaultValue={editingPart?.costPrice || 1000} className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (NPR, excl. VAT)</label>
                  <input name="selling" type="number" defaultValue={editingPart?.sellingPrice || 1500} className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input name="stock" type="number" defaultValue={editingPart?.currentStock || 10} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Reorder</label>
                  <input name="minLevel" type="number" defaultValue={editingPart?.minReorderLevel || 5} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Level</label>
                  <input name="maxLevel" type="number" defaultValue={editingPart?.maxStockLevel || 50} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select name="unit" defaultValue={editingPart?.unit || 'pcs'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white">
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="liters">liters</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nepal HSN / HS Code</label>
                  <input name="hsn" defaultValue={editingPart?.hsnSacCode || '87083000'} className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode / EAN</label>
                  <input name="barcode" defaultValue={editingPart?.barcode || ''} placeholder="890..." className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Preferred Distributor</label>
                  <input name="vendor" defaultValue={editingPart?.preferredVendor || 'Authorized Importers Nepal'} className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none" required />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsAddPartModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-xl font-semibold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold">Save Master SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE OTC ORDER & QUOTATION */}
      <OtcOrderModal
        isOpen={isNewOrderModal}
        onClose={() => setIsNewOrderModal(false)}
        parts={parts}
        customers={customers}
        onCreateQuotation={onCreateQuotation}
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
      />
    </div>
  );
};
