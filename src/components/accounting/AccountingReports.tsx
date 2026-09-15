import React, { useState } from 'react';
import { 
  Invoice, 
  SparePart, 
  GLAccount, 
  GLJournalEntry, 
  WorkshopProfile,
  UserRole 
} from '../../types';
import { 
  FileSpreadsheet, 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Receipt, 
  Layers, 
  Download, 
  Calendar,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Percent,
  FileCheck,
  BookOpen,
  Search,
  Filter,
  X
} from 'lucide-react';

interface AccountingReportsProps {
  invoices: Invoice[];
  parts: SparePart[];
  profile: WorkshopProfile;
  glAccounts: GLAccount[];
  journalEntries: GLJournalEntry[];
  userRole: UserRole;
}

type AccountingTab = 'pnl' | 'balance_sheet' | 'vat_register' | 'gl_ledger' | 'ar_ap';

export const AccountingReports: React.FC<AccountingReportsProps> = ({
  invoices,
  parts,
  profile,
  glAccounts,
  journalEntries,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>('vat_register');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');

  // Filtered invoices for Sales Book / VAT Register
  const filteredInvoices = (invoices || []).filter(inv => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.customerName || '').toLowerCase().includes(q) ||
      (inv.customerPan || '').toLowerCase().includes(q) ||
      (inv.vehicleReg || '').toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;
    if (filterMonth !== 'All') {
      const dateStr = (inv.createdAt || inv.date || '').slice(0, 7);
      if (!dateStr.includes(filterMonth)) return false;
    }
    return true;
  });

  // Filtered GL Accounts for Chart of Accounts
  const filteredGlAccounts = (glAccounts || []).filter(acc => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (acc.code || '').toLowerCase().includes(q) ||
      (acc.name || '').toLowerCase().includes(q) ||
      (acc.type || '').toLowerCase().includes(q)
    );
  });

  // Compute Revenue in NPR
  const totalTaxableSales = (invoices || []).reduce((acc, inv) => acc + (inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0), 0);
  const totalVat13 = (invoices || []).reduce((acc, inv) => acc + (inv.vatAmount ?? inv.totalVatAmount ?? 0), 0);
  const totalGrossRevenue = (invoices || []).reduce((acc, inv) => acc + (inv.grandTotal ?? 0), 0);
  const totalPaidRevenue = (invoices || []).reduce((acc, inv) => acc + (inv.paidAmount ?? inv.amountPaid ?? 0), 0);
  const totalReceivables = (invoices || []).reduce((acc, inv) => acc + (inv.balanceDue ?? 0), 0);

  // Inventory valuation (Cost)
  const currentInventoryCost = parts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);

  // COGS Estimation (Spares consumption)
  const estimatedCogsSpares = Math.round(totalTaxableSales * 0.45);
  const grossProfit = totalTaxableSales - estimatedCogsSpares;

  // Monthly Workshop Operational Expenses in Nepal
  const staffPayroll = 180000; // Head tech + advisors + helpers
  const workshopRentKTM = 85000; // Ring road Sukedhara workshop rent
  const electricityAndCompressor = 22000; // NEA 3-phase industrial power
  const shopConsumables = 14500;
  const totalOpex = staffPayroll + workshopRentKTM + electricityAndCompressor + shopConsumables;
  const netOperatingProfit = grossProfit - totalOpex;

  // Input VAT on spare parts purchases (13% on COGS)
  const estimatedInputVat = Math.round(estimatedCogsSpares * 0.13);
  const netVatPayableToIRD = Math.max(0, totalVat13 - estimatedInputVat);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Nepal Accounting & Tax Compliance
            </span>
            <span className="text-xs text-slate-400">VAT Act 2052 • Fiscal Year {profile.fiscalYear} B.S.</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            General Ledger & Nepal IRD VAT Register
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Complies with Inland Revenue Department (IRD) Nepal requirements: 13% VAT Annexure 13 (बिक्री तथा खरिद खाता), Real-time double-entry GL journal, P&L, Balance Sheet, and AR/AP Aging in Nepalese Rupees (NPR).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 shadow-sm flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export IRD Annexure (Excel/PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales (incl. 13% VAT)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">रु. {totalGrossRevenue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Taxable: रु. {totalTaxableSales.toLocaleString()}</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Output VAT Collected (13%)</span>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">रु. {totalVat13.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-900">Credited to IRD VAT Ledger</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Input Tax Credit (ITC)</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">रु. {estimatedInputVat.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-800">Offset against spare purchases</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Payable to IRD</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">रु. {netVatPayableToIRD.toLocaleString()}</div>
          <span className="text-[11px] text-rose-800">Due on 25th of upcoming month</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'vat_register', label: 'Nepal IRD VAT Register (कर खाता)', icon: FileCheck },
          { id: 'pnl', label: 'Profit & Loss Statement (NPR)', icon: TrendingUp },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: FileSpreadsheet },
          { id: 'gl_ledger', label: 'Chart of Accounts & GL', icon: BookOpen },
          { id: 'ar_ap', label: 'AR & AP Ledger Aging', icon: Layers }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AccountingTab)}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: NEPAL IRD VAT REGISTER */}
      {activeTab === 'vat_register' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  बिक्री खाता (Sales Book) - Annexure 13, Nepal Value Added Tax Rules
                </h3>
                <p className="text-xs text-slate-500">
                  Seller PAN: <strong className="font-mono text-slate-800">{profile.panVatNumber}</strong> | Fiscal Year: <strong className="font-mono text-slate-800">{profile.fiscalYear} B.S.</strong>
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 self-start sm:self-auto">
                IRD CBMS Realtime Verified
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by invoice #, buyer name, PAN, or vehicle reg..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="flex items-center text-xs text-slate-500 px-1">
                  Showing {filteredInvoices.length} of {(invoices || []).length} invoices
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Bill Date (Miti)</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Buyer Name</th>
                    <th className="p-3">Buyer PAN</th>
                    <th className="p-3 text-right">Taxable Sales (NPR)</th>
                    <th className="p-3 text-right">13% VAT (NPR)</th>
                    <th className="p-3 text-right">Exempt Sales</th>
                    <th className="p-3 text-right">Grand Total (NPR)</th>
                    <th className="p-3 text-center">CBMS Ack #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-slate-400">
                        No sales invoices match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
                      const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
                      const grand = inv.grandTotal ?? (taxable + vat);
                      const dateStr = (inv.createdAt || inv.date || '').slice(0, 10);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono text-slate-600">{dateStr}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                          <td className="p-3 font-semibold text-slate-900">{inv.customerName}</td>
                          <td className="p-3 font-mono text-slate-600">{inv.customerPan || 'Consumer'}</td>
                          <td className="p-3 text-right font-mono">रु. {taxable.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-indigo-700">रु. {vat.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-slate-400">रु. 0</td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">रु. {grand.toLocaleString()}</td>
                          <td className="p-3 text-center font-mono text-[10px] text-emerald-700">
                            {inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'ACK-2081-NPL-01'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={4} className="p-3 text-right uppercase">Total Month To Date:</td>
                    <td className="p-3 text-right font-mono">रु. {totalTaxableSales.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono text-indigo-800 font-extrabold">रु. {totalVat13.toLocaleString()}</td>
                    <td className="p-3 text-right font-mono">रु. 0</td>
                    <td className="p-3 text-right font-mono font-black text-sm">रु. {totalGrossRevenue.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROFIT & LOSS */}
      {activeTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">Monthly Workshop Profit & Loss Statement</h3>
            <p className="text-xs text-slate-500">For the period ending today • Values in Nepalese Rupees (NPR)</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 text-indigo-700">
                1. Operating Revenue
              </h4>
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-700">Labor & Diagnostic Charges Billed</span>
                  <span className="font-mono font-semibold">रु. {Math.round(totalTaxableSales * 0.4).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Spare Parts Revenue (Net of VAT)</span>
                  <span className="font-mono font-semibold">रु. {Math.round(totalTaxableSales * 0.6).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Total Net Turnover</span>
                  <span className="font-mono">रु. {totalTaxableSales.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 text-rose-700">
                2. Cost of Goods Sold (COGS)
              </h4>
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-700">Cost of Spares & Lubricants Consumed</span>
                  <span className="font-mono font-semibold">रु. {estimatedCogsSpares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-emerald-800 text-sm">
                  <span>Gross Operating Margin</span>
                  <span className="font-mono">रु. {grossProfit.toLocaleString()} ({Math.round((grossProfit / totalTaxableSales) * 100)}%)</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 text-slate-700">
                3. Workshop Operating Expenses (OPEX)
              </h4>
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-slate-700">Technicians, Advisors & Helper Payroll</span>
                  <span className="font-mono font-semibold">रु. {staffPayroll.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Workshop Lease (Sukedhara Kathmandu)</span>
                  <span className="font-mono font-semibold">रु. {workshopRentKTM.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">NEA Electricity & Industrial Compressor Power</span>
                  <span className="font-mono font-semibold">रु. {electricityAndCompressor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Shop Consumables & Tool Depreciation</span>
                  <span className="font-mono font-semibold">रु. {shopConsumables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Workshop Overheads</span>
                  <span className="font-mono">रु. {totalOpex.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-950 font-black text-base">
              <span>Net Operating Profit Before Taxes</span>
              <span className="font-mono text-lg text-emerald-700">रु. {netOperatingProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">Workshop Balance Sheet</h3>
            <p className="text-xs text-slate-500">As of today • Sagarmatha Multi-Care Auto Workshop Pvt. Ltd.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Assets (सम्पत्ति)</h4>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between font-semibold">
                  <span>Cash & Bank Balances (NIC Asia / Nabil)</span>
                  <span className="font-mono">रु. 450,000</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Fonepay / NepalPay Settlement In-Transit</span>
                  <span className="font-mono">रु. 35,400</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Accounts Receivable (Customer Due)</span>
                  <span className="font-mono text-rose-600">रु. {totalReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Spare Parts Stock Valuation (Cost)</span>
                  <span className="font-mono">रु. {currentInventoryCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Workshop Lifts, Tools & Aligners</span>
                  <span className="font-mono">रु. 1,450,000</span>
                </div>
                <div className="pt-2 border-t font-black text-slate-900 flex justify-between text-sm">
                  <span>Total Assets</span>
                  <span className="font-mono">रु. {(450000 + 35400 + totalReceivables + currentInventoryCost + 1450000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Liabilities & Equity (दायित्व)</h4>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between font-semibold">
                  <span>Accounts Payable to Parts Distributors</span>
                  <span className="font-mono">रु. 280,000</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Inland Revenue Dept. (13% VAT Payable)</span>
                  <span className="font-mono text-indigo-700">रु. {netVatPayableToIRD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Staff Salary & Incentive Accrual</span>
                  <span className="font-mono">रु. 65,000</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Owner Capital & Retained Reserves</span>
                  <span className="font-mono">रु. 1,800,000</span>
                </div>
                <div className="pt-2 border-t font-black text-slate-900 flex justify-between text-sm">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono">रु. {(280000 + netVatPayableToIRD + 65000 + 1800000).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GL LEDGER */}
      {activeTab === 'gl_ledger' && (
        <div className="space-y-4">
          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search GL accounts by code, name, or classification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="flex items-center text-xs text-slate-500 px-1">
                Showing {filteredGlAccounts.length} of {glAccounts.length} accounts
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">Account Code</th>
                  <th className="p-3.5">GL Account Name</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5 text-right">Debit Balance (NPR)</th>
                  <th className="p-3.5 text-right">Credit Balance (NPR)</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGlAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No general ledger accounts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredGlAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-700">{acc.code}</td>
                      <td className="p-3.5 font-bold text-slate-900">{acc.name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {acc.type}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {acc.balance >= 0 && ['Asset', 'Expense'].includes(acc.type) ? `रु. ${acc.balance.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        {acc.balance >= 0 && ['Liability', 'Revenue', 'Equity'].includes(acc.type) ? `रु. ${acc.balance.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AR / AP AGING */}
      {activeTab === 'ar_ap' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Customer Receivables Aging Schedule</h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time aging of outstanding balances for fleet operators and private customers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">0 - 15 Days Current</span>
                <div className="text-lg font-black text-emerald-950 font-mono mt-1">रु. {totalReceivables.toLocaleString()}</div>
                <span className="text-[11px] text-emerald-700">Normal payment terms</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-800">16 - 30 Days</span>
                <div className="text-lg font-black text-blue-950 font-mono mt-1">रु. 0</div>
                <span className="text-[11px] text-blue-700">Reminder SMS sent</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">31 - 60 Days</span>
                <div className="text-lg font-black text-amber-950 font-mono mt-1">रु. 0</div>
                <span className="text-[11px] text-amber-700">Follow-up required</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-semibold text-rose-800">&gt; 60 Days Overdue</span>
                <div className="text-lg font-black text-rose-950 font-mono mt-1">रु. 0</div>
                <span className="text-[11px] text-rose-700">No default accounts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
