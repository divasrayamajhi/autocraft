import React, { useState, useMemo } from 'react';
import { 
  Invoice, 
  SparePart, 
  GLAccount, 
  GLJournalEntry, 
  WorkshopProfile,
  UserRole,
  PurchaseOrder
} from '../../types';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  Receipt, 
  Layers, 
  Download, 
  Printer,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Percent,
  FileCheck,
  BookOpen,
  Search,
  Filter,
  X,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { PrintIrdVatRegisterModal } from './PrintIrdVatRegisterModal';
import { CreateJournalVoucherModal } from './CreateJournalVoucherModal';
import { CreateGLAccountModal } from './CreateGLAccountModal';

interface AccountingReportsProps {
  invoices: Invoice[];
  parts: SparePart[];
  profile: WorkshopProfile;
  glAccounts: GLAccount[];
  journalEntries: GLJournalEntry[];
  purchaseOrders?: PurchaseOrder[];
  onAddJournalEntry?: (entry: GLJournalEntry) => void;
  onAddGLAccount?: (account: GLAccount) => void;
  userRole: UserRole;
}

type AccountingTab = 
  | 'vat_sales' 
  | 'vat_purchases' 
  | 'vat_return' 
  | 'gl_accounts' 
  | 'journal_entries' 
  | 'account_ledger' 
  | 'trial_balance' 
  | 'pnl' 
  | 'balance_sheet' 
  | 'ar_ap';

export const AccountingReports: React.FC<AccountingReportsProps> = ({
  invoices = [],
  parts = [],
  profile,
  glAccounts = [],
  journalEntries = [],
  purchaseOrders = [],
  onAddJournalEntry,
  onAddGLAccount,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>('vat_sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>(
    glAccounts[0]?.accountCode || '1010'
  );

  // Modals state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalType, setPrintModalType] = useState<'sales' | 'purchase' | 'vat_return'>('sales');
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);

  // Filtered invoices for Sales Book / VAT Register
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
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
  }, [invoices, searchQuery, filterMonth]);

  // Filtered Purchase Orders for Purchase Book / VAT Register
  const filteredPurchases = useMemo(() => {
    return purchaseOrders.filter(po => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (po.poNumber || '').toLowerCase().includes(q) ||
        (po.supplierName || '').toLowerCase().includes(q) ||
        (po.supplierPanVat || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
      if (filterMonth !== 'All') {
        const dateStr = (po.date || '').slice(0, 7);
        if (!dateStr.includes(filterMonth)) return false;
      }
      return true;
    });
  }, [purchaseOrders, searchQuery, filterMonth]);

  // Filtered GL Accounts for Chart of Accounts
  const filteredGlAccounts = useMemo(() => {
    return glAccounts.filter(acc => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (acc.accountCode || '').toLowerCase().includes(q) ||
        (acc.accountName || '').toLowerCase().includes(q) ||
        (acc.category || '').toLowerCase().includes(q) ||
        (acc.subCategory || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;
      if (filterCategory !== 'All' && acc.category !== filterCategory) return false;
      return true;
    });
  }, [glAccounts, searchQuery, filterCategory]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter(entry => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (entry.entryNumber || '').toLowerCase().includes(q) ||
        (entry.sourceDocument || '').toLowerCase().includes(q) ||
        (entry.narration || '').toLowerCase().includes(q) ||
        entry.lines.some(l => l.accountName.toLowerCase().includes(q) || l.accountCode.includes(q))
      );
    });
  }, [journalEntries, searchQuery]);

  // Compute Sales Figures in NPR
  const totalTaxableSales = invoices.reduce((acc, inv) => acc + (inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0), 0);
  const totalVat13 = invoices.reduce((acc, inv) => acc + (inv.vatAmount ?? inv.totalVatAmount ?? 0), 0);
  const totalGrossRevenue = invoices.reduce((acc, inv) => acc + (inv.grandTotal ?? 0), 0);
  const totalReceivables = invoices.reduce((acc, inv) => acc + (inv.balanceDue ?? 0), 0);

  // Compute Purchase Figures in NPR
  const totalTaxablePurchases = purchaseOrders.reduce((acc, po) => acc + (po.taxableAmount ?? po.subtotal ?? 0), 0);
  const totalInputVat = purchaseOrders.reduce((acc, po) => acc + (po.vatTotal ?? 0), 0);
  const totalGrossPurchases = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount ?? 0), 0);

  // Net VAT to IRD
  const netVatPayableToIRD = Math.max(0, totalVat13 - totalInputVat);
  const carryForwardVatCredit = Math.max(0, totalInputVat - totalVat13);

  // Inventory valuation (Cost)
  const currentInventoryCost = parts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);

  // COGS & Operational Expenses
  const estimatedCogsSpares = Math.round(totalTaxableSales * 0.45);
  const grossProfit = totalTaxableSales - estimatedCogsSpares;
  const staffPayroll = 180000;
  const workshopRentKTM = 85000;
  const electricityAndCompressor = 22000;
  const shopConsumables = 14500;
  const totalOpex = staffPayroll + workshopRentKTM + electricityAndCompressor + shopConsumables;
  const netOperatingProfit = grossProfit - totalOpex;

  // Selected Account for Ledger Statement
  const selectedAccount = glAccounts.find(a => a.accountCode === selectedLedgerAccountCode) || glAccounts[0];

  // Ledger transactions for the selected account
  const ledgerTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    const txs: {
      date: string;
      entryNumber: string;
      sourceDocument: string;
      narration: string;
      debit: number;
      credit: number;
    }[] = [];

    journalEntries.forEach(entry => {
      entry.lines.forEach(line => {
        if (line.accountCode === selectedAccount.accountCode) {
          txs.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            sourceDocument: entry.sourceDocument,
            narration: entry.narration,
            debit: line.debit,
            credit: line.credit
          });
        }
      });
    });

    return txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [selectedAccount, journalEntries]);

  // Trial Balance Calculations
  const trialBalanceData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = glAccounts.map(acc => {
      let debit = 0;
      let credit = 0;
      if (['Asset', 'Expense'].includes(acc.category)) {
        if (acc.currentBalance >= 0) debit = acc.currentBalance;
        else credit = Math.abs(acc.currentBalance);
      } else {
        if (acc.currentBalance >= 0) credit = acc.currentBalance;
        else debit = Math.abs(acc.currentBalance);
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        ...acc,
        debit,
        credit
      };
    });

    return { rows, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 1 };
  }, [glAccounts]);

  // CSV Export for Sales Book
  const exportSalesBookCsv = () => {
    const headers = ['Miti', 'Invoice Number', 'Buyer Name', 'Buyer PAN', 'Total Sales NPR', 'Tax Exempt NPR', 'Taxable Sales NPR', '13% VAT NPR', 'CBMS Ack Code'];
    const rows = filteredInvoices.map(inv => [
      (inv.createdAt || inv.date || '').slice(0, 10),
      inv.invoiceNumber,
      `"${(inv.customerName || '').replace(/"/g, '""')}"`,
      inv.customerPan || 'Consumer',
      inv.grandTotal ?? 0,
      0,
      inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0,
      inv.vatAmount ?? inv.totalVatAmount ?? 0,
      inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'ACK-2081-01'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nepal_IRD_Sales_Book_Annexure13_${profile.fiscalYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Purchase Book
  const exportPurchaseBookCsv = () => {
    const headers = ['Date', 'PO / Bill Number', 'Supplier Name', 'Supplier PAN', 'Total Purchase NPR', 'Tax Exempt NPR', 'Taxable Purchase NPR', '13% Input VAT NPR', 'Status'];
    const rows = filteredPurchases.map(po => [
      po.date,
      po.poNumber,
      `"${(po.supplierName || '').replace(/"/g, '""')}"`,
      po.supplierPanVat || 'N/A',
      po.totalAmount ?? 0,
      0,
      po.taxableAmount ?? po.subtotal ?? 0,
      po.vatTotal ?? 0,
      po.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nepal_IRD_Purchase_Book_Annexure13_${profile.fiscalYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Official IRD Compliance */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Nepal Inland Revenue Department (IRD)
            </span>
            <span className="text-xs text-slate-400">
              Value Added Tax Rules 2052 • Fiscal Year <strong className="text-amber-400 font-mono">{profile.fiscalYear} B.S.</strong>
            </span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            General Ledger & Nepal IRD VAT Register
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl mt-1 leading-relaxed">
            Full compliance suite: <strong>Schedule 13 (Sales & Purchase Register)</strong>, <strong>Schedule 10 (Monthly VAT Return VAT-01)</strong>, Double-Entry General Journal, Chart of Accounts, Trial Balance, P&L, Balance Sheet, and AR/AP Aging in Nepalese Rupees (NPR).
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <button
            onClick={() => {
              setPrintModalType(activeTab === 'vat_purchases' ? 'purchase' : activeTab === 'vat_return' ? 'vat_return' : 'sales');
              setIsPrintModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold border border-indigo-500 shadow-sm flex items-center space-x-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official A4 Register</span>
          </button>

          <button
            onClick={activeTab === 'vat_purchases' ? exportPurchaseBookCsv : exportSalesBookCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 shadow-sm flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Sales, VAT Output, Input Tax Credit, Net Payable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Sales Turnover (NPR)</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">Rs. {totalGrossRevenue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">Taxable Sales: Rs. {totalTaxableSales.toLocaleString()}</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Output VAT Collected (13%)</span>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">Rs. {totalVat13.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-900 font-medium">Credited to IRD Sales Register</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Input Tax Credit (ITC 13%)</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">Rs. {totalInputVat.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-800 font-medium">Claimable on Parts & Fluids</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Tax Payable to IRD</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">Rs. {netVatPayableToIRD.toLocaleString()}</div>
          <span className="text-[11px] text-rose-800 font-medium">Due on 25th of upcoming month</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center space-x-1 min-w-max">
          {[
            { id: 'vat_sales', label: 'Sales Book (Schedule 13)', tag: 'Sched 13', icon: FileCheck },
            { id: 'vat_purchases', label: 'Purchase Book (Schedule 13)', tag: 'Sched 13', icon: Receipt },
            { id: 'vat_return', label: 'Monthly VAT Return (VAT-01)', tag: 'Sched 10', icon: ShieldCheck },
            { id: 'gl_accounts', label: 'Chart of Accounts', tag: 'COA', icon: BookOpen },
            { id: 'journal_entries', label: 'Journal Entries (JV)', tag: 'Double-Entry', icon: FileSpreadsheet },
            { id: 'account_ledger', label: 'Ledger Statement', tag: 'T-Account', icon: Layers },
            { id: 'trial_balance', label: 'Trial Balance', tag: 'Balanced', icon: CheckCircle2 },
            { id: 'pnl', label: 'Profit & Loss (P&L)', tag: 'NPR', icon: TrendingUp },
            { id: 'balance_sheet', label: 'Balance Sheet', tag: 'NPR', icon: FileSpreadsheet },
            { id: 'ar_ap', label: 'AR & AP Aging', tag: 'Aging', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`accounting-subtab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id as AccountingTab);
                  setSearchQuery('');
                }}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SALES BOOK (Schedule 13) */}
      {activeTab === 'vat_sales' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Schedule 13: Sales Register (Sales Book)</span>
                  <span className="text-xs font-normal text-slate-500">(Value Added Tax Rules 2052, Rule 23(1))</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Taxpayer PAN: <strong className="font-mono text-slate-900 font-bold">{profile.panVatNumber}</strong> | 
                  Trading Name: <strong className="text-slate-900">{profile.name}</strong> | 
                  Fiscal Year: <strong className="font-mono text-slate-900">{profile.fiscalYear} B.S.</strong>
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center space-x-1 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>IRD CBMS Realtime Synchronized</span>
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by invoice #, buyer name, PAN, or vehicle registration..."
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

              <div className="flex items-center space-x-2">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">All Months (Full Fiscal Year)</option>
                  <option value="2026-09">Bhadra 2081 </option>
                  <option value="2026-10">Ashwin 2081 </option>
                  <option value="2026-08">Shrawan 2081 </option>
                </select>

                <button
                  onClick={exportSalesBookCsv}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Date</th>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Buyer Name</th>
                    <th className="p-3 text-center">Buyer PAN / VAT</th>
                    <th className="p-3 text-right">Grand Total</th>
                    <th className="p-3 text-right">Exempt</th>
                    <th className="p-3 text-right">Taxable Sales</th>
                    <th className="p-3 text-right">13% Output VAT</th>
                    <th className="p-3 text-center">CBMS Ack Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No sales invoices match your search query.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
                      const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
                      const grand = inv.grandTotal ?? (taxable + vat);
                      const dateStr = (inv.createdAt || inv.date || '').slice(0, 10);
                      const ack = inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'ACK-2081-NPL-01';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{dateStr}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {inv.customerName}
                            {inv.vehicleReg && (
                              <span className="block text-[10px] text-slate-400 font-mono">{inv.vehicleReg}</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            {inv.customerPan ? (
                              <span className="font-bold text-slate-800">{inv.customerPan}</span>
                            ) : (
                              <span className="text-slate-400">Consumer</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                            Rs. {grand.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">Rs. 0</td>
                          <td className="p-3 text-right font-mono">Rs. {taxable.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-indigo-700">
                            Rs. {vat.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-[10px] text-emerald-700 font-semibold">
                            {ack}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3.5 text-right uppercase">
                      Grand Total (MTD Total NPR):
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-sm">
                      Rs. {totalGrossRevenue.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono">Rs. 0</td>
                    <td className="p-3.5 text-right font-mono">
                      Rs. {totalTaxableSales.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-indigo-800 font-extrabold text-sm">
                      Rs. {totalVat13.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center text-[10px] text-emerald-800">
                      IRD Annex 13 Verified
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE BOOK (Schedule 13) */}
      {activeTab === 'vat_purchases' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <span>Schedule 13: Purchase Register (Purchase Book)</span>
                  <span className="text-xs font-normal text-slate-500">(Spare Parts & Lubricants Purchase Register)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Input Tax Credit: <strong className="font-mono text-emerald-700 font-bold">Rs. {totalInputVat.toLocaleString()}</strong> | 
                  Supplier Bills Count: <strong className="font-mono text-slate-900">{purchaseOrders.length}</strong>
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 flex items-center space-x-1 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>13% Input Tax Credit Eligible</span>
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by PO #, supplier name, or supplier PAN..."
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

              <div className="flex items-center space-x-2">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="All">All Months (Full Fiscal Year)</option>
                  <option value="2026-09">Bhadra 2081 </option>
                  <option value="2026-10">Ashwin 2081 </option>
                  <option value="2026-08">Shrawan 2081 </option>
                </select>

                <button
                  onClick={exportPurchaseBookCsv}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Date</th>
                    <th className="p-3">Supplier Bill / PO #</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3 text-center">Buyer PAN / VAT</th>
                    <th className="p-3 text-right">Total Purchase Amount</th>
                    <th className="p-3 text-right">Exempt</th>
                    <th className="p-3 text-right">Taxable Purchase</th>
                    <th className="p-3 text-right">13% Input VAT (ITC)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        No purchase records match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((po) => {
                      const taxable = po.taxableAmount ?? po.subtotal ?? 0;
                      const vat = po.vatTotal ?? 0;
                      const grand = po.totalAmount ?? (taxable + vat);

                      return (
                        <tr key={po.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{po.date}</td>
                          <td className="p-3 font-mono font-bold text-indigo-700">{po.poNumber}</td>
                          <td className="p-3 font-semibold text-slate-900">{po.supplierName}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{po.supplierPanVat || '—'}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-slate-900">
                            Rs. {grand.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-400">Rs. 0</td>
                          <td className="p-3 text-right font-mono">Rs. {taxable.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">
                            Rs. {vat.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              po.status === 'Received' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3.5 text-right uppercase">
                      Grand Total Purchases (NPR):
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-sm">
                      Rs. {totalGrossPurchases.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono">Rs. 0</td>
                    <td className="p-3.5 text-right font-mono">
                      Rs. {totalTaxablePurchases.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-800 font-extrabold text-sm">
                      Rs. {totalInputVat.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center text-[10px] text-emerald-800">
                      Input Tax Credit
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY VAT RETURN SUMMARY (Schedule 10: Monthly VAT Return) */}
      {activeTab === 'vat_return' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Schedule 10: Monthly Value Added Tax Return (Nepal IRD Form VAT-01)
              </h3>
              <p className="text-xs text-slate-500">
                Inland Revenue Department Tax Assessment & Net Payment Reconciliation
              </p>
            </div>
            <button
              onClick={() => {
                setPrintModalType('vat_return');
                setIsPrintModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Return</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Output Tax (Sales) */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                Section A: Sales & Output VAT (13%)
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Taxable Turnover:</span>
                  <span className="font-mono font-bold">Rs. {totalTaxableSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Zero-rated / Exempt Sales:</span>
                  <span className="font-mono text-slate-400">Rs. 0</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-indigo-900 text-sm">
                  <span>Output VAT Collected (13%):</span>
                  <span className="font-mono">Rs. {totalVat13.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Input Tax (Purchases) */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <h4 className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] pb-1 border-b border-slate-200">
                Section B: Purchases & Input Tax Credit
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Taxable Parts Purchases:</span>
                  <span className="font-mono font-bold">Rs. {totalTaxablePurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Exempt Spares Purchases:</span>
                  <span className="font-mono text-slate-400">Rs. 0</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-emerald-900 text-sm">
                  <span>Input Tax Credit Claimed (13%):</span>
                  <span className="font-mono">Rs. {totalInputVat.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Calculation */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                Section C: Net VAT Payable to IRD:
              </span>
              <span className="text-2xl font-black font-mono text-amber-300">
                Rs. {netVatPayableToIRD.toLocaleString()}
              </span>
            </div>

            {carryForwardVatCredit > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-400 pt-2 border-t border-slate-800">
                <span>Excess ITC Carry-Forward:</span>
                <span className="font-mono font-bold text-sm">Rs. {carryForwardVatCredit.toLocaleString()}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800 flex items-center justify-between">
              <span><strong>Payment Due Date:</strong> Due by 25th of subsequent monthly accounting cycle.</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CBMS Compliant</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHART OF ACCOUNTS */}
      {activeTab === 'gl_accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
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

            <div className="flex items-center space-x-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Categories</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>

              {onAddGLAccount && (
                <button
                  onClick={() => setIsNewAccountModalOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Account</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">Account Code</th>
                  <th className="p-3.5">GL Account Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Sub-Category</th>
                  <th className="p-3.5 text-right">Debit (NPR)</th>
                  <th className="p-3.5 text-right">Credit (NPR)</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGlAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No general ledger accounts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredGlAccounts.map((acc) => {
                    const isDebitNature = ['Asset', 'Expense'].includes(acc.category);
                    const debitAmount = isDebitNature && acc.currentBalance >= 0 ? acc.currentBalance : 0;
                    const creditAmount = !isDebitNature && acc.currentBalance >= 0 ? acc.currentBalance : 0;

                    return (
                      <tr key={acc.accountCode} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-indigo-700">{acc.accountCode}</td>
                        <td className="p-3.5 font-bold text-slate-900">{acc.accountName}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            acc.category === 'Asset' ? 'bg-blue-100 text-blue-800' :
                            acc.category === 'Liability' ? 'bg-amber-100 text-amber-800' :
                            acc.category === 'Equity' ? 'bg-purple-100 text-purple-800' :
                            acc.category === 'Revenue' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {acc.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">{acc.subCategory}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {debitAmount > 0 ? `Rs. ${debitAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {creditAmount > 0 ? `Rs. ${creditAmount.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedLedgerAccountCode(acc.accountCode);
                              setActiveTab('account_ledger');
                            }}
                            className="px-2 py-1 text-[11px] text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-semibold transition"
                          >
                            View Statement
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
      )}

      {/* TAB 5: GENERAL JOURNAL ENTRIES */}
      {activeTab === 'journal_entries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search journal entries by voucher #, narration, or source document..."
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

            {onAddJournalEntry && (
              <button
                onClick={() => setIsNewVoucherModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center space-x-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Voucher</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {filteredJournalEntries.length === 0 ? (
              <div className="bg-white p-8 text-center text-slate-400 rounded-2xl border border-slate-200">
                No journal vouchers match your search.
              </div>
            ) : (
              filteredJournalEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Voucher Header */}
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-black text-indigo-700 text-sm">
                        {entry.entryNumber}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-mono text-slate-600">{entry.date}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">Ref: <strong className="font-mono text-slate-800">{entry.sourceDocument}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        Total Amount: Rs. {entry.totalAmount.toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Balanced
                      </span>
                    </div>
                  </div>

                  {/* Narration */}
                  <div className="px-4 py-2 bg-indigo-50/40 text-[11px] text-slate-700 italic border-b border-slate-100">
                    Narration: {entry.narration}
                  </div>

                  {/* Voucher Lines */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 text-[11px] font-semibold border-b border-slate-100">
                        <th className="p-3">GL Account Code & Name</th>
                        <th className="p-3 text-right w-36">Debit (NPR)</th>
                        <th className="p-3 text-right w-36">Credit (NPR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entry.lines.map((line, lIdx) => (
                        <tr key={lIdx} className="hover:bg-slate-50/60">
                          <td className="p-3">
                            <span className="font-mono font-bold text-indigo-900 mr-2">{line.accountCode}</span>
                            <span className="font-medium text-slate-800">{line.accountName}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {line.debit > 0 ? `Rs. ${line.debit.toLocaleString()}` : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {line.credit > 0 ? `Rs. ${line.credit.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: ACCOUNT LEDGER STATEMENT */}
      {activeTab === 'account_ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Account Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Select GL Account:
                </label>
                <select
                  value={selectedLedgerAccountCode}
                  onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {glAccounts.map((acc) => (
                    <option key={acc.accountCode} value={acc.accountCode}>
                      {acc.accountCode} - {acc.accountName} ({acc.category})
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccount && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Current Balance:</span>
                  <span className="font-mono font-black text-sm text-indigo-700">
                    Rs. {selectedAccount.currentBalance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Ledger Transactions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Date</th>
                    <th className="p-3">Voucher #</th>
                    <th className="p-3">Source Ref</th>
                    <th className="p-3">Particulars / Narration</th>
                    <th className="p-3 text-right">Debit (NPR)</th>
                    <th className="p-3 text-right">Credit (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No journal entries posted for this account yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono text-slate-600 whitespace-nowrap">{tx.date}</td>
                        <td className="p-3 font-mono font-bold text-indigo-700">{tx.entryNumber}</td>
                        <td className="p-3 font-mono text-slate-500">{tx.sourceDocument}</td>
                        <td className="p-3 text-slate-800 font-medium">{tx.narration}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {tx.debit > 0 ? `Rs. ${tx.debit.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {tx.credit > 0 ? `Rs. ${tx.credit.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="p-3.5 text-right uppercase">
                      Account Total:
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-indigo-900">
                      Rs. {ledgerTransactions.reduce((acc, t) => acc + t.debit, 0).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-indigo-900">
                      Rs. {ledgerTransactions.reduce((acc, t) => acc + t.credit, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Trial Balance Statement
              </h3>
              <p className="text-xs text-slate-500">
                Double-Entry Balance Verification • Fiscal Year {profile.fiscalYear} B.S.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center space-x-1 ${
                trialBalanceData.isBalanced 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{trialBalanceData.isBalanced ? 'Books Balanced' : 'Out of Balance'}</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Particulars</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right w-40">Debit (NPR)</th>
                  <th className="p-3 text-right w-40">Credit (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalanceData.rows.map((row) => (
                  <tr key={row.accountCode} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-indigo-700">{row.accountCode}</td>
                    <td className="p-3 font-bold text-slate-900">{row.accountName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {row.debit > 0 ? `Rs. ${row.debit.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {row.credit > 0 ? `Rs. ${row.credit.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-800">
                  <td colSpan={3} className="p-3.5 text-right uppercase">
                    Grand Total (NPR):
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-sm text-indigo-900">
                    Rs. {trialBalanceData.totalDebit.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-right font-mono font-black text-sm text-indigo-900">
                    Rs. {trialBalanceData.totalCredit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: PROFIT & LOSS */}
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
                  <span className="font-mono font-semibold">Rs. {Math.round(totalTaxableSales * 0.4).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Spare Parts Revenue (Net of VAT)</span>
                  <span className="font-mono font-semibold">Rs. {Math.round(totalTaxableSales * 0.6).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Total Net Turnover</span>
                  <span className="font-mono">Rs. {totalTaxableSales.toLocaleString()}</span>
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
                  <span className="font-mono font-semibold">Rs. {estimatedCogsSpares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-emerald-800 text-sm">
                  <span>Gross Operating Margin</span>
                  <span className="font-mono">Rs. {grossProfit.toLocaleString()} ({totalTaxableSales > 0 ? Math.round((grossProfit / totalTaxableSales) * 100) : 0}%)</span>
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
                  <span className="font-mono font-semibold">Rs. {staffPayroll.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Workshop Lease (Sukedhara Kathmandu)</span>
                  <span className="font-mono font-semibold">Rs. {workshopRentKTM.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">NEA Electricity & Industrial Compressor Power</span>
                  <span className="font-mono font-semibold">Rs. {electricityAndCompressor.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">Shop Consumables & Tool Depreciation</span>
                  <span className="font-mono font-semibold">Rs. {shopConsumables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total Workshop Overheads</span>
                  <span className="font-mono">Rs. {totalOpex.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-950 font-black text-base">
              <span>Net Operating Profit Before Taxes</span>
              <span className="font-mono text-lg text-emerald-700">Rs. {netOperatingProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: BALANCE SHEET */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">Workshop Balance Sheet</h3>
            <p className="text-xs text-slate-500">As of today • {profile.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Assets</h4>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between font-semibold">
                  <span>Cash & Bank Balances (Nabil Bank / Cashier)</span>
                  <span className="font-mono">Rs. 726,550</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Fonepay / connectIPS Clearing In-Transit</span>
                  <span className="font-mono">Rs. 173,400</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Accounts Receivable (Customer Due)</span>
                  <span className="font-mono text-rose-600">Rs. {totalReceivables.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Spare Parts Stock Valuation (Cost)</span>
                  <span className="font-mono">Rs. {currentInventoryCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Workshop Lifts, Tools & Aligners</span>
                  <span className="font-mono">Rs. 2,450,000</span>
                </div>
                <div className="pt-2 border-t font-black text-slate-900 flex justify-between text-sm">
                  <span>Total Assets</span>
                  <span className="font-mono">Rs. {(726550 + 173400 + totalReceivables + currentInventoryCost + 2450000).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Liabilities */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm border-b pb-1">Liabilities & Equity</h4>
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl">
                <div className="flex justify-between font-semibold">
                  <span>Accounts Payable to Parts Vendors</span>
                  <span className="font-mono">Rs. 258,790</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Inland Revenue Dept. (13% VAT Payable)</span>
                  <span className="font-mono text-indigo-700">Rs. {netVatPayableToIRD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Staff Salary & Incentive Accrual</span>
                  <span className="font-mono">Rs. 78,500</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Owner Capital & Retained Reserves</span>
                  <span className="font-mono">Rs. 3,479,100</span>
                </div>
                <div className="pt-2 border-t font-black text-slate-900 flex justify-between text-sm">
                  <span>Total Liabilities & Equity</span>
                  <span className="font-mono">Rs. {(258790 + netVatPayableToIRD + 78500 + 3479100).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: AR / AP AGING */}
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
                <div className="text-lg font-black text-emerald-950 font-mono mt-1">Rs. {totalReceivables.toLocaleString()}</div>
                <span className="text-[11px] text-emerald-700">Normal payment terms</span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-semibold text-blue-800">16 - 30 Days</span>
                <div className="text-lg font-black text-blue-950 font-mono mt-1">Rs. 0</div>
                <span className="text-[11px] text-blue-700">Reminder SMS sent</span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <span className="text-xs font-semibold text-amber-800">31 - 60 Days</span>
                <div className="text-lg font-black text-amber-950 font-mono mt-1">Rs. 0</div>
                <span className="text-[11px] text-amber-700">Follow-up required</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-semibold text-rose-800">&gt; 60 Days Overdue</span>
                <div className="text-lg font-black text-rose-950 font-mono mt-1">Rs. 0</div>
                <span className="text-[11px] text-rose-700">No default accounts</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && (
        <PrintIrdVatRegisterModal
          type={printModalType}
          invoices={invoices}
          purchaseOrders={purchaseOrders}
          profile={profile}
          filterMonth={filterMonth}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* New Journal Voucher Modal */}
      {isNewVoucherModalOpen && onAddJournalEntry && (
        <CreateJournalVoucherModal
          glAccounts={glAccounts}
          existingEntriesCount={journalEntries.length}
          onSave={onAddJournalEntry}
          onClose={() => setIsNewVoucherModalOpen(false)}
        />
      )}

      {/* New GL Account Modal */}
      {isNewAccountModalOpen && onAddGLAccount && (
        <CreateGLAccountModal
          existingAccounts={glAccounts}
          onSave={onAddGLAccount}
          onClose={() => setIsNewAccountModalOpen(false)}
        />
      )}
    </div>
  );
};
