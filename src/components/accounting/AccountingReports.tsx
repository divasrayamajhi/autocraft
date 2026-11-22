import React, { useState, useMemo } from 'react';
import {
  Invoice,
  SparePart,
  WorkshopProfile,
  GLAccount,
  GLJournalEntry,
  PurchaseOrder,
  UserRole,
} from '../../types';
import {
  BookOpen,
  FileSpreadsheet,
  TrendingUp,
  Download,
  CheckCircle2,
  ShieldCheck,
  Receipt,
  FileCheck,
  Printer,
  Plus,
  Search,
  Layers,
  X,
  AlertTriangle,
} from 'lucide-react';
import { PrintIrdVatRegisterModal } from './PrintIrdVatRegisterModal';
import { CreateJournalVoucherModal } from './CreateJournalVoucherModal';
import { CreateGLAccountModal } from './CreateGLAccountModal';
import { DraggableTabBar } from '../common/DraggableTabBar';
import {
  formatAccountingNPR,
  isCreditNoteInvoice,
  isInvoiceSyncedToCbms,
  isPurchaseOrderItcEligible,
  round2,
} from '../../utils/accountingEngine';

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
  profile,
  glAccounts = [],
  journalEntries = [],
  purchaseOrders = [],
  onAddJournalEntry,
  onAddGLAccount,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTab>('vat_sales');

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedLedgerAccountCode, setSelectedLedgerAccountCode] = useState<string>(
    glAccounts[0]?.accountCode || '1010'
  );

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalType, setPrintModalType] = useState<'sales' | 'purchase' | 'vat_return'>('sales');
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);

  // Dynamic YYYY-MM month list derived from actual invoices & POs
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      const m = (inv.date || inv.createdAt || '').slice(0, 7);
      if (m && m.length === 7) set.add(m);
    });
    purchaseOrders.forEach((po) => {
      const m = (po.date || '').slice(0, 7);
      if (m && m.length === 7) set.add(m);
    });
    return Array.from(set).sort().reverse();
  }, [invoices, purchaseOrders]);

  // Month-scoped Invoices & Purchase Orders (for consistent VAT Return & Schedule 13 Books)
  const monthScopedInvoices = useMemo(() => {
    if (filterMonth === 'All') return invoices;
    return invoices.filter((inv) => (inv.date || inv.createdAt || '').startsWith(filterMonth));
  }, [invoices, filterMonth]);

  const monthScopedPurchases = useMemo(() => {
    if (filterMonth === 'All') return purchaseOrders;
    return purchaseOrders.filter((po) => (po.date || '').startsWith(filterMonth));
  }, [purchaseOrders, filterMonth]);

  // Filtered Sales Invoices (search + month)
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthScopedInvoices.filter((inv) => {
      if (!q) return true;
      return (
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.customerPan || '').toLowerCase().includes(q) ||
        (inv.vehicleReg || '').toLowerCase().includes(q)
      );
    });
  }, [monthScopedInvoices, searchQuery]);

  // Filtered Purchase Orders (search + month)
  const filteredPurchases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthScopedPurchases.filter((po) => {
      if (!q) return true;
      return (
        (po.poNumber || '').toLowerCase().includes(q) ||
        (po.supplierName || '').toLowerCase().includes(q) ||
        (po.supplierPanVat || '').toLowerCase().includes(q)
      );
    });
  }, [monthScopedPurchases, searchQuery]);

  // Filtered GL Accounts
  const filteredGlAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return glAccounts.filter((acc) => {
      const matchesCat = filterCategory === 'All' || acc.category === filterCategory;
      const matchesSearch =
        !q ||
        acc.accountCode.toLowerCase().includes(q) ||
        acc.accountName.toLowerCase().includes(q) ||
        (acc.subCategory || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [glAccounts, searchQuery, filterCategory]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return journalEntries.filter((entry) => {
      if (!q) return true;
      return (
        entry.entryNumber.toLowerCase().includes(q) ||
        entry.narration.toLowerCase().includes(q) ||
        entry.sourceDocument.toLowerCase().includes(q) ||
        entry.lines.some(
          (l) =>
            l.accountName.toLowerCase().includes(q) || l.accountCode.toLowerCase().includes(q)
        )
      );
    });
  }, [journalEntries, searchQuery]);

  // Chartered Accountant VAT Computations (Month-Scoped, Separating Credit Notes & Non-ITC POs)
  const vatMetrics = useMemo(() => {
    let grossTaxableSales = 0;
    let creditNoteTaxable = 0;
    let grossOutputVat = 0;
    let creditNoteVat = 0;
    let netGrossSales = 0;

    monthScopedInvoices.forEach((inv) => {
      const isCN = isCreditNoteInvoice(inv);
      const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
      const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
      const grand = Number(inv.grandTotal ?? round2(taxable + vat));
      if (isCN) {
        creditNoteTaxable = round2(creditNoteTaxable + Math.abs(taxable));
        creditNoteVat = round2(creditNoteVat + Math.abs(vat));
      } else {
        grossTaxableSales = round2(grossTaxableSales + taxable);
        grossOutputVat = round2(grossOutputVat + vat);
      }
      netGrossSales = round2(netGrossSales + grand);
    });

    const netTaxableSales = round2(grossTaxableSales - creditNoteTaxable);
    const netOutputVat = round2(grossOutputVat - creditNoteVat);

    // Purchase ITC: STRICTLY ONLY Received / Billed Supplier Bills (Nepal VAT Act 2052 Sec 17)
    let claimableTaxablePurchases = 0;
    let claimableInputVat = 0;
    let claimableGrossPurchases = 0;
    let pendingTaxablePurchases = 0;
    let pendingInputVat = 0;

    monthScopedPurchases.forEach((po) => {
      const taxable = Number(po.taxableAmount ?? po.subtotal ?? 0);
      const vat = Number(po.vatTotal ?? 0);
      const grand = Number(po.totalAmount ?? round2(taxable + vat));

      if (isPurchaseOrderItcEligible(po)) {
        claimableTaxablePurchases = round2(claimableTaxablePurchases + taxable);
        claimableInputVat = round2(claimableInputVat + vat);
        claimableGrossPurchases = round2(claimableGrossPurchases + grand);
      } else {
        pendingTaxablePurchases = round2(pendingTaxablePurchases + taxable);
        pendingInputVat = round2(pendingInputVat + vat);
      }
    });

    const netVatPayable = round2(Math.max(0, netOutputVat - claimableInputVat));
    const carryForwardItc = round2(Math.max(0, claimableInputVat - netOutputVat));

    return {
      grossTaxableSales,
      creditNoteTaxable,
      netTaxableSales,
      grossOutputVat,
      creditNoteVat,
      netOutputVat,
      netGrossSales,
      claimableTaxablePurchases,
      claimableInputVat,
      claimableGrossPurchases,
      pendingTaxablePurchases,
      pendingInputVat,
      netVatPayable,
      carryForwardItc,
    };
  }, [monthScopedInvoices, monthScopedPurchases]);

  // Filtered Table Totals (so footer always matches visible rows)
  const visibleSalesTotals = useMemo(() => {
    return filteredInvoices.reduce(
      (acc, inv) => {
        const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
        const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
        const grand = Number(inv.grandTotal ?? round2(taxable + vat));
        return {
          taxable: round2(acc.taxable + taxable),
          vat: round2(acc.vat + vat),
          grand: round2(acc.grand + grand),
        };
      },
      { taxable: 0, vat: 0, grand: 0 }
    );
  }, [filteredInvoices]);

  const visiblePurchaseTotals = useMemo(() => {
    return filteredPurchases.reduce(
      (acc, po) => {
        if (!isPurchaseOrderItcEligible(po)) return acc;
        const taxable = Number(po.taxableAmount ?? po.subtotal ?? 0);
        const vat = Number(po.vatTotal ?? 0);
        const grand = Number(po.totalAmount ?? round2(taxable + vat));
        return {
          taxable: round2(acc.taxable + taxable),
          vat: round2(acc.vat + vat),
          grand: round2(acc.grand + grand),
        };
      },
      { taxable: 0, vat: 0, grand: 0 }
    );
  }, [filteredPurchases]);

  // Trial Balance derived strictly from GL Accounts (handles abnormal negative balances properly)
  const trialBalanceData = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = glAccounts.map((acc) => {
      const isDrNature = acc.category === 'Asset' || acc.category === 'Expense';
      const bal = round2(acc.currentBalance || 0);
      let debit = 0;
      let credit = 0;

      if (isDrNature) {
        if (bal >= 0) debit = bal;
        else credit = Math.abs(bal);
      } else {
        if (bal >= 0) credit = bal;
        else debit = Math.abs(bal);
      }

      totalDebit = round2(totalDebit + debit);
      totalCredit = round2(totalCredit + credit);

      return { ...acc, debit, credit };
    });

    const difference = round2(Math.abs(totalDebit - totalCredit));
    return {
      rows,
      totalDebit,
      totalCredit,
      difference,
      isBalanced: difference < 0.05,
    };
  }, [glAccounts]);

  // Profit & Loss Statement derived 100% from actual GL Revenue & Expense accounts
  const pnlData = useMemo(() => {
    const revenueAccounts = glAccounts.filter((a) => a.category === 'Revenue');
    const directCostAccounts = glAccounts.filter(
      (a) => a.category === 'Expense' && a.accountCode.startsWith('5')
    );
    const overheadAccounts = glAccounts.filter(
      (a) => a.category === 'Expense' && !a.accountCode.startsWith('5')
    );

    const totalRevenue = round2(revenueAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const totalDirectCost = round2(directCostAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const grossProfit = round2(totalRevenue - totalDirectCost);
    const grossMarginPct = totalRevenue > 0 ? round2((grossProfit / totalRevenue) * 100) : 0;

    const totalOverheads = round2(overheadAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const netProfit = round2(grossProfit - totalOverheads);

    return {
      revenueAccounts,
      directCostAccounts,
      overheadAccounts,
      totalRevenue,
      totalDirectCost,
      grossProfit,
      grossMarginPct,
      totalOverheads,
      netProfit,
    };
  }, [glAccounts]);

  // Balance Sheet derived 100% from actual GL Asset, Liability, Equity + Current Period Net Profit
  const balanceSheetData = useMemo(() => {
    const assetAccounts = glAccounts.filter((a) => a.category === 'Asset');
    const liabilityAccounts = glAccounts.filter((a) => a.category === 'Liability');
    const equityAccounts = glAccounts.filter((a) => a.category === 'Equity');

    const totalAssets = round2(assetAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const totalLiabilities = round2(liabilityAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const baseEquity = round2(equityAccounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const currentPeriodProfit = pnlData.netProfit;
    const totalEquity = round2(baseEquity + currentPeriodProfit);
    const totalLiabilitiesAndEquity = round2(totalLiabilities + totalEquity);
    const difference = round2(Math.abs(totalAssets - totalLiabilitiesAndEquity));

    return {
      assetAccounts,
      liabilityAccounts,
      equityAccounts,
      totalAssets,
      totalLiabilities,
      baseEquity,
      currentPeriodProfit,
      totalEquity,
      totalLiabilitiesAndEquity,
      difference,
      isBalanced: difference < 0.05,
    };
  }, [glAccounts, pnlData.netProfit]);

  // Account Ledger Statement with chronological Running Balance
  const selectedAccount = useMemo(
    () => glAccounts.find((a) => a.accountCode === selectedLedgerAccountCode) || glAccounts[0],
    [glAccounts, selectedLedgerAccountCode]
  );

  const ledgerTransactions = useMemo(() => {
    if (!selectedAccount) return [];
    const isDrNature = selectedAccount.category === 'Asset' || selectedAccount.category === 'Expense';
    const raw: {
      date: string;
      entryNumber: string;
      sourceDocument: string;
      narration: string;
      debit: number;
      credit: number;
    }[] = [];

    journalEntries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        if (line.accountCode === selectedAccount.accountCode) {
          raw.push({
            date: entry.date,
            entryNumber: entry.entryNumber,
            sourceDocument: entry.sourceDocument,
            narration: entry.narration,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
          });
        }
      });
    });

    // Sort chronologically oldest -> newest so running balance flows accurately
    raw.sort((a, b) => a.date.localeCompare(b.date) || a.entryNumber.localeCompare(b.entryNumber));

    let running = 0;
    return raw.map((tx) => {
      running = isDrNature
        ? round2(running + tx.debit - tx.credit)
        : round2(running + tx.credit - tx.debit);
      return { ...tx, runningBalance: running };
    });
  }, [journalEntries, selectedAccount]);

  // Real-Time AR & AP Aging Schedule derived from actual unpaid invoices & received POs
  const agingData = useMemo(() => {
    const todayMs = Date.now();
    const bucketInit = () => ({ b0_15: 0, b16_30: 0, b31_60: 0, b60plus: 0, total: 0 });
    const ar = bucketInit();
    const ap = bucketInit();

    const arItems: {
      ref: string;
      party: string;
      date: string;
      days: number;
      amount: number;
      bucket: string;
    }[] = [];
    const apItems: {
      ref: string;
      party: string;
      date: string;
      days: number;
      amount: number;
      bucket: string;
    }[] = [];

    invoices.forEach((inv) => {
      if (isCreditNoteInvoice(inv)) return;
      const due = round2(inv.balanceDue ?? 0);
      if (due <= 0) return;
      const dt = (inv.date || inv.createdAt || new Date().toISOString()).slice(0, 10);
      const days = Math.max(0, Math.floor((todayMs - new Date(dt).getTime()) / 86400000));
      let bucket = '0-15 Days';
      if (days <= 15) ar.b0_15 = round2(ar.b0_15 + due);
      else if (days <= 30) {
        ar.b16_30 = round2(ar.b16_30 + due);
        bucket = '16-30 Days';
      } else if (days <= 60) {
        ar.b31_60 = round2(ar.b31_60 + due);
        bucket = '31-60 Days';
      } else {
        ar.b60plus = round2(ar.b60plus + due);
        bucket = '60+ Days';
      }
      ar.total = round2(ar.total + due);
      arItems.push({ ref: inv.invoiceNumber, party: inv.customerName, date: dt, days, amount: due, bucket });
    });

    purchaseOrders.forEach((po) => {
      if (!isPurchaseOrderItcEligible(po)) return;
      const amt = round2(po.totalAmount ?? 0);
      if (amt <= 0) return;
      const dt = (po.date || new Date().toISOString()).slice(0, 10);
      const days = Math.max(0, Math.floor((todayMs - new Date(dt).getTime()) / 86400000));
      let bucket = '0-15 Days';
      if (days <= 15) ap.b0_15 = round2(ap.b0_15 + amt);
      else if (days <= 30) {
        ap.b16_30 = round2(ap.b16_30 + amt);
        bucket = '16-30 Days';
      } else if (days <= 60) {
        ap.b31_60 = round2(ap.b31_60 + amt);
        bucket = '31-60 Days';
      } else {
        ap.b60plus = round2(ap.b60plus + amt);
        bucket = '60+ Days';
      }
      ap.total = round2(ap.total + amt);
      apItems.push({ ref: po.poNumber, party: po.supplierName, date: dt, days, amount: amt, bucket });
    });

    return { ar, ap, arItems, apItems };
  }, [invoices, purchaseOrders]);

  // GL Control Account figures for VAT reconciliation box
  const glOutputVatControl = glAccounts.find((a) => a.accountCode === '2020')?.currentBalance || 0;
  const glInputVatControl = glAccounts.find((a) => a.accountCode === '1250')?.currentBalance || 0;

  // CSV Exports
  const exportSalesBookCsv = () => {
    const headers = ['Date', 'Document #', 'Type', 'Buyer Name', 'Buyer PAN', 'Total Sales (NPR)', 'Exempt', 'Taxable Sales', '13% Output VAT', 'CBMS Ack'];
    const rows = filteredInvoices.map((inv) => {
      const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
      const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
      const grand = inv.grandTotal ?? round2(taxable + vat);
      const ack = inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'PENDING';
      return [
        (inv.date || inv.createdAt || '').slice(0, 10),
        inv.invoiceNumber,
        inv.type || 'Tax Invoice',
        `"${inv.customerName.replace(/"/g, '""')}"`,
        inv.customerPan || 'Consumer',
        grand,
        0,
        taxable,
        vat,
        ack,
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IRD_Sales_Register_${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPurchaseBookCsv = () => {
    const headers = ['Date', 'PO / Bill #', 'Supplier Name', 'Supplier PAN', 'Total Purchase (NPR)', 'Exempt', 'Taxable Purchase', '13% Input VAT', 'Status', 'ITC Eligible'];
    const rows = filteredPurchases.map((po) => {
      const eligible = isPurchaseOrderItcEligible(po);
      return [
        po.date,
        po.poNumber,
        `"${po.supplierName.replace(/"/g, '""')}"`,
        po.supplierPanVat || '',
        po.totalAmount ?? 0,
        0,
        po.taxableAmount ?? po.subtotal ?? 0,
        eligible ? (po.vatTotal ?? 0) : 0,
        po.status,
        eligible ? 'Claimable' : 'Pending Receipt',
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IRD_Purchase_Register_${filterMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: AccountingTab; label: string; tag: string; icon: any }[] = [
    { id: 'vat_sales', label: 'Sales Book', tag: 'Sched 13', icon: FileCheck },
    { id: 'vat_purchases', label: 'Purchase Book', tag: 'Sched 13', icon: Receipt },
    { id: 'vat_return', label: 'VAT Return (VAT-01)', tag: 'Sched 10', icon: ShieldCheck },
    { id: 'gl_accounts', label: 'Chart of Accounts', tag: 'COA', icon: BookOpen },
    { id: 'journal_entries', label: 'Journal Vouchers', tag: 'JV', icon: FileSpreadsheet },
    { id: 'account_ledger', label: 'Account Ledger', tag: 'T-Acc', icon: Layers },
    { id: 'trial_balance', label: 'Trial Balance', tag: trialBalanceData.isBalanced ? 'Tallied' : 'Check', icon: CheckCircle2 },
    { id: 'pnl', label: 'Profit & Loss', tag: 'P&L', icon: TrendingUp },
    { id: 'balance_sheet', label: 'Balance Sheet', tag: balanceSheetData.isBalanced ? 'Balanced' : 'Check', icon: FileSpreadsheet },
    { id: 'ar_ap', label: 'AR & AP Aging', tag: 'Aging', icon: Layers },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-xl border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
              General Ledger, Financial Statements &amp; Nepal IRD VAT
            </h2>
            <span className="px-2 py-0.5 rounded bg-sky-50 text-[#0284C7] border border-sky-200 text-[10px] font-bold">
              FY {profile.fiscalYear} B.S.
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                trialBalanceData.isBalanced && balanceSheetData.isBalanced
                  ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                  : 'bg-red-50 text-[#DC2626] border-red-200'
              }`}
            >
              {trialBalanceData.isBalanced && balanceSheetData.isBalanced
                ? 'Books Audited & Balanced'
                : 'Reconciliation Required'}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            {profile.name} • PAN/VAT: <span className="font-mono font-semibold text-[#0F172A]">{profile.panVatNumber}</span> • Double-Entry Accrual Accounting (ICAN / Nepal IRD VAT Act 2052)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPrintModalType(
                activeTab === 'vat_purchases'
                  ? 'purchase'
                  : activeTab === 'vat_return'
                  ? 'vat_return'
                  : 'sales'
              );
              setIsPrintModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print IRD Registers (A4)</span>
          </button>

          {onAddJournalEntry && (
            <button
              onClick={() => setIsNewVoucherModalOpen(true)}
              className="px-3.5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Journal Voucher</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip: Net Turnover, Net Output VAT, Claimable ITC, Net VAT Position */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            Net Taxable Sales
          </span>
          <div className="text-lg sm:text-xl font-bold text-[#0F172A] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(vatMetrics.netTaxableSales)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5 truncate">
            Gross Incl. VAT: {formatAccountingNPR(vatMetrics.netGrossSales)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            Net Output VAT (13%)
          </span>
          <div className="text-lg sm:text-xl font-bold text-[#0284C7] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(vatMetrics.netOutputVat)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5 truncate">
            {vatMetrics.creditNoteVat > 0
              ? `After ${formatAccountingNPR(vatMetrics.creditNoteVat)} CN reversal`
              : 'Schedule 13 Sales Register'}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            Claimable ITC (13%)
          </span>
          <div className="text-lg sm:text-xl font-bold text-[#16A34A] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(vatMetrics.claimableInputVat)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5 truncate">
            {vatMetrics.pendingInputVat > 0
              ? `+${formatAccountingNPR(vatMetrics.pendingInputVat)} pending receipt`
              : 'Received Supplier Bills Only'}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
            {vatMetrics.netVatPayable > 0 ? 'Net VAT Payable (IRD)' : 'Excess ITC Carry-Forward'}
          </span>
          <div
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate ${
              vatMetrics.netVatPayable > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
            }`}
          >
            {formatAccountingNPR(
              vatMetrics.netVatPayable > 0 ? vatMetrics.netVatPayable : vatMetrics.carryForwardItc
            )}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            {vatMetrics.netVatPayable > 0 ? 'Due by 25th of next BS month' : 'Credit offset to next cycle'}
          </span>
        </div>
      </div>

      {/* Draggable Sub-Navigation Tabs */}
      <div className="bg-[#FFFFFF] p-1.5 rounded-xl border border-[#E2E8F0]">
        <DraggableTabBar className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    isActive ? 'bg-[#0284C7] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                  }`}
                >
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </DraggableTabBar>
      </div>

      {/* TAB 1: SCHEDULE 13 SALES BOOK */}
      {activeTab === 'vat_sales' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Schedule 13: Statutory Sales Register (Sales Book)
              </h3>
              <p className="text-xs text-[#64748B]">
                Value Added Tax Rules 2052, Rule 23(1) • PAN: <strong className="font-mono text-[#0F172A]">{profile.panVatNumber}</strong>
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-[#16A34A] text-[11px] font-semibold rounded-lg border border-emerald-200 flex items-center space-x-1 self-start">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>IRD CBMS Compliant</span>
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice #, credit note, buyer name, PAN, or vehicle reg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] outline-none"
              >
                <option value="All">All Periods (FY {profile.fiscalYear})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Period {m}
                  </option>
                ))}
              </select>
              <button
                onClick={exportSalesBookCsv}
                className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0F172A] rounded-lg text-xs font-semibold border border-[#E2E8F0] flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#64748B]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Document #</th>
                  <th className="p-3">Buyer Name</th>
                  <th className="p-3 text-center">Buyer PAN</th>
                  <th className="p-3 text-right">Total Sales</th>
                  <th className="p-3 text-right">Exempt</th>
                  <th className="p-3 text-right">Taxable Sales</th>
                  <th className="p-3 text-right">13% Output VAT</th>
                  <th className="p-3 text-center">CBMS Ack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#64748B]">
                      No sales documents found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isCN = isCreditNoteInvoice(inv);
                    const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
                    const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
                    const grand = Number(inv.grandTotal ?? round2(taxable + vat));
                    const dateStr = (inv.date || inv.createdAt || '').slice(0, 10);
                    const ack =
                      inv.irdSyncDetails?.cbmsAckNumber ||
                      inv.irdCompliance?.irdAcknowledgementCode ||
                      (isInvoiceSyncedToCbms(inv) ? 'CBMS-SYNCED' : 'PENDING');

                    return (
                      <tr key={inv.id} className={`hover:bg-[#F8FAFC] ${isCN ? 'bg-red-50/30' : ''}`}>
                        <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{dateStr}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`font-mono font-bold ${isCN ? 'text-[#DC2626]' : 'text-[#0284C7]'}`}>
                            {inv.invoiceNumber}
                          </span>
                          {isCN && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-[#DC2626] text-[9px] font-bold">
                              CN
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-[#0F172A]">
                          {inv.customerName}
                          {inv.vehicleReg && (
                            <span className="block text-[10px] text-[#64748B] font-mono">{inv.vehicleReg}</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono text-[#64748B]">
                          {inv.customerPan || 'Consumer'}
                        </td>
                        <td className={`p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${isCN ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
                          {formatAccountingNPR(grand)}
                        </td>
                        <td className="p-3 text-right font-mono text-[#64748B]">Rs. 0</td>
                        <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatAccountingNPR(taxable)}
                        </td>
                        <td className={`p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${isCN ? 'text-[#DC2626]' : 'text-[#0284C7]'}`}>
                          {formatAccountingNPR(vat)}
                        </td>
                        <td className="p-3 text-center font-mono text-[10px] text-[#16A34A] font-semibold">
                          {ack}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#CBD5E1]">
                  <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                    Filtered Net Total (NPR):
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums font-bold">
                    {formatAccountingNPR(visibleSalesTotals.grand)}
                  </td>
                  <td className="p-3 text-right font-mono">Rs. 0</td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(visibleSalesTotals.taxable)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#0284C7] font-bold">
                    {formatAccountingNPR(visibleSalesTotals.vat)}
                  </td>
                  <td className="p-3 text-center text-[10px] text-[#16A34A]">Schedule 13</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULE 13 PURCHASE BOOK */}
      {activeTab === 'vat_purchases' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Schedule 13: Statutory Purchase Register (Purchase Book)
              </h3>
              <p className="text-xs text-[#64748B]">
                Per Nepal VAT Act 2052 Sec. 17: Only <strong>Received / Billed</strong> supplier tax invoices qualify for 13% Input Tax Credit (ITC).
              </p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-[#16A34A] text-[11px] font-semibold rounded-lg border border-emerald-200 self-start">
              Claimable ITC: {formatAccountingNPR(vatMetrics.claimableInputVat)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search PO / Bill #, supplier name, or supplier PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] outline-none"
              >
                <option value="All">All Periods (FY {profile.fiscalYear})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Period {m}
                  </option>
                ))}
              </select>
              <button
                onClick={exportPurchaseBookCsv}
                className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0F172A] rounded-lg text-xs font-semibold border border-[#E2E8F0] flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#64748B]" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Supplier Bill / PO #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3 text-center">Supplier PAN / VAT</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-right">Taxable Purchase</th>
                  <th className="p-3 text-right">13% Input VAT (ITC)</th>
                  <th className="p-3 text-center">ITC Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#64748B]">
                      No purchase records found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((po) => {
                    const eligible = isPurchaseOrderItcEligible(po);
                    const taxable = Number(po.taxableAmount ?? po.subtotal ?? 0);
                    const vat = Number(po.vatTotal ?? 0);
                    const grand = Number(po.totalAmount ?? round2(taxable + vat));

                    return (
                      <tr key={po.id} className={`hover:bg-[#F8FAFC] ${!eligible ? 'opacity-70 bg-[#F8FAFC]/50' : ''}`}>
                        <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{po.date}</td>
                        <td className="p-3 font-mono font-bold text-[#0284C7] whitespace-nowrap">{po.poNumber}</td>
                        <td className="p-3 font-semibold text-[#0F172A]">{po.supplierName}</td>
                        <td className="p-3 text-center font-mono text-[#64748B]">{po.supplierPanVat || '—'}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-bold text-[#0F172A] whitespace-nowrap">
                          {formatAccountingNPR(grand)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatAccountingNPR(taxable)}
                        </td>
                        <td className={`p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${eligible ? 'text-[#16A34A]' : 'text-[#64748B] line-through'}`}>
                          {formatAccountingNPR(vat)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              eligible
                                ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                                : 'bg-amber-50 text-[#B45309] border-amber-200'
                            }`}
                          >
                            {eligible ? `${po.status} • ITC Eligible` : `${po.status} • Non-ITC`}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#CBD5E1]">
                  <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                    Claimable ITC Total (Received Bills Only):
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(visiblePurchaseTotals.grand)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(visiblePurchaseTotals.taxable)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#16A34A]">
                    {formatAccountingNPR(visiblePurchaseTotals.vat)}
                  </td>
                  <td className="p-3 text-center text-[10px] text-[#16A34A]">Sec. 17 Verified</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULE 10 MONTHLY VAT RETURN (VAT-01) */}
      {activeTab === 'vat_return' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 sm:p-6 max-w-4xl space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Schedule 10: Monthly Value Added Tax Return (Nepal IRD Form VAT-01)
              </h3>
              <p className="text-xs text-[#64748B]">
                Inland Revenue Department Self-Assessment Reconciliation • Period: <strong>{filterMonth === 'All' ? `FY ${profile.fiscalYear}` : filterMonth}</strong>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="px-3 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A]"
              >
                <option value="All">All Periods</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPrintModalType('vat_return');
                  setIsPrintModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print A4 Return</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 bg-[#F8FAFC]">
              <h4 className="font-bold text-[#0F3D5E] uppercase tracking-wider text-[11px] pb-1.5 border-b border-[#E2E8F0]">
                Section A: Sales &amp; Output VAT (13%)
              </h4>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Gross Taxable Sales:</span>
                <span className="font-mono font-semibold tabular-nums">{formatAccountingNPR(vatMetrics.grossTaxableSales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Less: Credit Notes / Returns:</span>
                <span className="font-mono font-semibold text-[#DC2626] tabular-nums">-{formatAccountingNPR(vatMetrics.creditNoteTaxable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Net Taxable Sales Turnover:</span>
                <span className="font-mono font-bold tabular-nums">{formatAccountingNPR(vatMetrics.netTaxableSales)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] font-bold text-[#0284C7] text-sm">
                <span>Net Output VAT (13%):</span>
                <span className="font-mono tabular-nums">{formatAccountingNPR(vatMetrics.netOutputVat)}</span>
              </div>
            </div>

            <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-2.5 bg-[#F8FAFC]">
              <h4 className="font-bold text-[#16A34A] uppercase tracking-wider text-[11px] pb-1.5 border-b border-[#E2E8F0]">
                Section B: Purchases &amp; Input Tax Credit (13%)
              </h4>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Eligible Taxable Purchases (Received):</span>
                <span className="font-mono font-bold tabular-nums">{formatAccountingNPR(vatMetrics.claimableTaxablePurchases)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Unreceived / Ordered POs (Excluded):</span>
                <span className="font-mono text-[#64748B] tabular-nums">{formatAccountingNPR(vatMetrics.pendingTaxablePurchases)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Exempt Spares Purchases:</span>
                <span className="font-mono text-[#64748B]">Rs. 0</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] font-bold text-[#16A34A] text-sm">
                <span>Claimable ITC (13%):</span>
                <span className="font-mono tabular-nums">{formatAccountingNPR(vatMetrics.claimableInputVat)}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0F3D5E] text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Section C: Net VAT Payable to IRD</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-[#0EA5E9]">
                {formatAccountingNPR(vatMetrics.netVatPayable)}
              </span>
            </div>
            {vatMetrics.carryForwardItc > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-300 pt-2 border-t border-white/10">
                <span>Excess Input Tax Credit Carry-Forward (Next Tax Period):</span>
                <span className="font-mono font-bold text-sm tabular-nums">
                  {formatAccountingNPR(vatMetrics.carryForwardItc)}
                </span>
              </div>
            )}
            <div className="text-[11px] text-sky-200 pt-2 border-t border-white/10 flex flex-wrap justify-between gap-2">
              <span>Filing &amp; Deposit Due Date: 25th of the following Bikram Sambat month.</span>
              <span className="font-mono">
                GL Control Balances — 2020 Output VAT: {formatAccountingNPR(glOutputVatControl)} | 1250 Input ITC: {formatAccountingNPR(glInputVatControl)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHART OF ACCOUNTS */}
      {activeTab === 'gl_accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search GL accounts by code, name, or classification..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A]"
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
                  className="px-3.5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Account</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0]">
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">GL Account Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Sub-Category</th>
                    <th className="p-3.5 text-right">Debit (NPR)</th>
                    <th className="p-3.5 text-right">Credit (NPR)</th>
                    <th className="p-3.5 text-center">Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredGlAccounts.map((acc) => {
                    const isDrNature = acc.category === 'Asset' || acc.category === 'Expense';
                    const bal = round2(acc.currentBalance || 0);
                    const debitAmt = isDrNature ? (bal >= 0 ? bal : 0) : (bal < 0 ? Math.abs(bal) : 0);
                    const creditAmt = !isDrNature ? (bal >= 0 ? bal : 0) : (bal < 0 ? Math.abs(bal) : 0);

                    return (
                      <tr key={acc.accountCode} className="hover:bg-[#F8FAFC]">
                        <td className="p-3.5 font-mono font-bold text-[#0284C7]">{acc.accountCode}</td>
                        <td className="p-3.5 font-semibold text-[#0F172A]">{acc.accountName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#0F3D5E] border border-[#E2E8F0]">
                            {acc.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#64748B]">{acc.subCategory}</td>
                        <td className="p-3.5 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                          {debitAmt > 0 ? formatAccountingNPR(debitAmt) : '—'}
                        </td>
                        <td className="p-3.5 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                          {creditAmt > 0 ? formatAccountingNPR(creditAmt) : '—'}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedLedgerAccountCode(acc.accountCode);
                              setActiveTab('account_ledger');
                            }}
                            className="px-2.5 py-1 text-[11px] text-[#0284C7] hover:bg-sky-50 border border-sky-200 rounded-lg font-semibold"
                          >
                            Statement
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: JOURNAL VOUCHERS */}
      {activeTab === 'journal_entries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search journal vouchers by voucher #, narration, account, or ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              />
            </div>
            {onAddJournalEntry && (
              <button
                onClick={() => setIsNewVoucherModalOpen(true)}
                className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 self-start"
              >
                <Plus className="w-4 h-4" />
                <span>New Journal Voucher</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredJournalEntries.map((entry) => {
              const sumDr = round2(entry.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0));
              const sumCr = round2(entry.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
              const isEntryBalanced = Math.abs(sumDr - sumCr) < 0.05;

              return (
                <div key={entry.id} className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
                  <div className="bg-[#F8FAFC] px-4 py-2.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-[#0284C7]">{entry.entryNumber}</span>
                      <span className="text-[#CBD5E1]">|</span>
                      <span className="font-mono text-[#64748B]">{entry.date}</span>
                      <span className="text-[#CBD5E1]">|</span>
                      <span className="text-[#64748B]">
                        Ref: <strong className="font-mono text-[#0F172A]">{entry.sourceDocument}</strong>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#0F172A] tabular-nums">
                        {formatAccountingNPR(sumDr)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isEntryBalanced
                            ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                            : 'bg-red-50 text-[#DC2626] border border-red-200'
                        }`}
                      >
                        {isEntryBalanced ? 'Balanced' : `Diff: ${formatAccountingNPR(Math.abs(sumDr - sumCr))}`}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-[#FFFFFF] text-[11px] text-[#64748B] border-b border-[#E2E8F0]">
                    {entry.narration}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[#64748B] text-[11px] font-semibold border-b border-[#E2E8F0] bg-[#F8FAFC]/50">
                          <th className="p-2.5">GL Account</th>
                          <th className="p-2.5 text-right w-36">Debit (NPR)</th>
                          <th className="p-2.5 text-right w-36">Credit (NPR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {entry.lines.map((line, lIdx) => (
                          <tr key={lIdx}>
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-[#0F3D5E] mr-2">{line.accountCode}</span>
                              <span className="text-[#0F172A]">{line.accountName}</span>
                            </td>
                            <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                              {line.debit > 0 ? formatAccountingNPR(line.debit) : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                              {line.credit > 0 ? formatAccountingNPR(line.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: ACCOUNT LEDGER STATEMENT (WITH RUNNING BALANCE) */}
      {activeTab === 'account_ledger' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-[#0F172A] uppercase">GL Account:</label>
              <select
                value={selectedLedgerAccountCode}
                onChange={(e) => setSelectedLedgerAccountCode(e.target.value)}
                className="px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A]"
              >
                {glAccounts.map((acc) => (
                  <option key={acc.accountCode} value={acc.accountCode}>
                    {acc.accountCode} - {acc.accountName} ({acc.category})
                  </option>
                ))}
              </select>
            </div>
            {selectedAccount && (
              <div className="text-xs flex items-center space-x-2">
                <span className="text-[#64748B]">Closing Balance:</span>
                <span className="font-mono font-bold text-sm text-[#0F3D5E] tabular-nums">
                  {formatAccountingNPR(selectedAccount.currentBalance)}{' '}
                  <span className="text-[10px] text-[#64748B]">
                    ({['Asset', 'Expense'].includes(selectedAccount.category) ? 'Dr' : 'Cr'})
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0]">
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Particulars</th>
                  <th className="p-3 text-right">Debit</th>
                  <th className="p-3 text-right">Credit</th>
                  <th className="p-3 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {ledgerTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#64748B]">
                      No journal entries posted for this account yet.
                    </td>
                  </tr>
                ) : (
                  ledgerTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{tx.date}</td>
                      <td className="p-3 font-mono font-bold text-[#0284C7] whitespace-nowrap">{tx.entryNumber}</td>
                      <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{tx.sourceDocument}</td>
                      <td className="p-3 text-[#0F172A]">{tx.narration}</td>
                      <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {tx.debit > 0 ? formatAccountingNPR(tx.debit) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {tx.credit > 0 ? formatAccountingNPR(tx.credit) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums font-bold text-[#0F3D5E] whitespace-nowrap">
                        {formatAccountingNPR(tx.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#CBD5E1]">
                  <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                    Account Totals:
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(ledgerTransactions.reduce((s, t) => s + t.debit, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(ledgerTransactions.reduce((s, t) => s + t.credit, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#0F3D5E]">
                    {selectedAccount ? formatAccountingNPR(selectedAccount.currentBalance) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: TRIAL BALANCE */}
      {activeTab === 'trial_balance' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 sm:p-6 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#E2E8F0] gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Trial Balance Statement</h3>
              <p className="text-xs text-[#64748B]">
                Double-Entry General Ledger Verification • FY {profile.fiscalYear} B.S.
              </p>
            </div>
            <span
              className={`px-3 py-1 text-xs font-bold rounded-lg border flex items-center space-x-1.5 ${
                trialBalanceData.isBalanced
                  ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                  : 'bg-red-50 text-[#DC2626] border-red-200'
              }`}
            >
              {trialBalanceData.isBalanced ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>
                {trialBalanceData.isBalanced
                  ? 'Trial Balance Tallied (Diff: Rs. 0.00)'
                  : `Out of Balance by ${formatAccountingNPR(trialBalanceData.difference)}`}
              </span>
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold border-b border-[#E2E8F0]">
                  <th className="p-3">Code</th>
                  <th className="p-3">Account Particulars</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right w-40">Debit (NPR)</th>
                  <th className="p-3 text-right w-40">Credit (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {trialBalanceData.rows.map((row) => (
                  <tr key={row.accountCode} className="hover:bg-[#F8FAFC]">
                    <td className="p-3 font-mono font-bold text-[#0284C7]">{row.accountCode}</td>
                    <td className="p-3 font-semibold text-[#0F172A]">{row.accountName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#64748B]">
                        {row.category}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                      {row.debit > 0 ? formatAccountingNPR(row.debit) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                      {row.credit > 0 ? formatAccountingNPR(row.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#0F3D5E]">
                  <td colSpan={3} className="p-3.5 text-right uppercase">
                    Grand Total (NPR):
                  </td>
                  <td className="p-3.5 text-right font-mono tabular-nums text-sm text-[#0F3D5E]">
                    {formatAccountingNPR(trialBalanceData.totalDebit, true)}
                  </td>
                  <td className="p-3.5 text-right font-mono tabular-nums text-sm text-[#0F3D5E]">
                    {formatAccountingNPR(trialBalanceData.totalCredit, true)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: PROFIT & LOSS STATEMENT (100% GL-DERIVED) */}
      {activeTab === 'pnl' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 sm:p-6 max-w-4xl space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              Statement of Profit &amp; Loss (Income Statement)
            </h3>
            <p className="text-xs text-[#64748B]">
              Derived directly from General Ledger Revenue (4xxx) &amp; Expense (5xxx/6xxx) accounts • FY {profile.fiscalYear} B.S.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-[#0F3D5E] uppercase tracking-wider text-[11px] mb-2">
                1. Operating Revenue (4xxx)
              </h4>
              <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                {pnlData.revenueAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#CBD5E1] font-bold text-[#0F172A] text-sm">
                  <span>Total Operating Revenue (Net of 13% VAT)</span>
                  <span className="font-mono tabular-nums">{formatAccountingNPR(pnlData.totalRevenue)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#DC2626] uppercase tracking-wider text-[11px] mb-2">
                2. Direct Cost &amp; Cost of Goods Sold (5xxx)
              </h4>
              <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                {pnlData.directCostAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#CBD5E1] font-bold text-[#16A34A] text-sm">
                  <span>Gross Profit ({pnlData.grossMarginPct}% Margin)</span>
                  <span className="font-mono tabular-nums">{formatAccountingNPR(pnlData.grossProfit)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#64748B] uppercase tracking-wider text-[11px] mb-2">
                3. Operating Expenses &amp; Overheads (6xxx)
              </h4>
              <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                {pnlData.overheadAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-2">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-[#CBD5E1] font-bold text-[#0F172A]">
                  <span>Total Operating Overheads</span>
                  <span className="font-mono tabular-nums">{formatAccountingNPR(pnlData.totalOverheads)}</span>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border flex justify-between items-center font-bold text-sm sm:text-base ${
                pnlData.netProfit >= 0
                  ? 'bg-emerald-50 border-emerald-200 text-[#14532D]'
                  : 'bg-red-50 border-red-200 text-[#991B1B]'
              }`}
            >
              <span>Net Operating {pnlData.netProfit >= 0 ? 'Profit' : 'Loss'} Before Income Tax</span>
              <span className="font-mono text-lg tabular-nums">
                {formatAccountingNPR(pnlData.netProfit, true)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: BALANCE SHEET (100% GL-DERIVED & STRICTLY BALANCED) */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 sm:p-6 max-w-4xl space-y-5">
          <div className="border-b border-[#E2E8F0] pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Statement of Financial Position (Balance Sheet)
              </h3>
              <p className="text-xs text-[#64748B]">
                As of today • {profile.name} • Strictly reconciled with Trial Balance &amp; P&amp;L
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1.5 ${
                balanceSheetData.isBalanced
                  ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                  : 'bg-red-50 text-[#DC2626] border-red-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {balanceSheetData.isBalanced
                  ? 'Assets = Liabilities + Equity (Balanced)'
                  : `Variance: ${formatAccountingNPR(balanceSheetData.difference)}`}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* ASSETS */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F3D5E] text-sm border-b border-[#E2E8F0] pb-1.5">
                Assets (1xxx)
              </h4>
              <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                {balanceSheetData.assetAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between gap-2">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-1.5">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums whitespace-nowrap">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="pt-2.5 border-t-2 border-[#0F3D5E] font-bold text-[#0F3D5E] flex justify-between text-sm">
                  <span>Total Assets</span>
                  <span className="font-mono tabular-nums">
                    {formatAccountingNPR(balanceSheetData.totalAssets, true)}
                  </span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#0F3D5E] text-sm border-b border-[#E2E8F0] pb-1.5">
                Liabilities &amp; Equity (2xxx / 3xxx)
              </h4>
              <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                <div className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">
                  Liabilities
                </div>
                {balanceSheetData.liabilityAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between gap-2">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-1.5">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums whitespace-nowrap">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                  <span>Total Liabilities</span>
                  <span className="font-mono tabular-nums">{formatAccountingNPR(balanceSheetData.totalLiabilities)}</span>
                </div>

                <div className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider pt-2">
                  Owner&apos;s Equity
                </div>
                {balanceSheetData.equityAccounts.map((acc) => (
                  <div key={acc.accountCode} className="flex justify-between gap-2">
                    <span className="text-[#0F172A]">
                      <span className="font-mono text-[#64748B] mr-1.5">{acc.accountCode}</span>
                      {acc.accountName}
                    </span>
                    <span className="font-mono font-semibold tabular-nums whitespace-nowrap">
                      {formatAccountingNPR(acc.currentBalance)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between gap-2">
                  <span className="text-[#0284C7] font-medium">Current Period Net Profit / (Loss)</span>
                  <span
                    className={`font-mono font-semibold tabular-nums whitespace-nowrap ${
                      balanceSheetData.currentPeriodProfit >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                  >
                    {formatAccountingNPR(balanceSheetData.currentPeriodProfit, true)}
                  </span>
                </div>

                <div className="pt-2.5 border-t-2 border-[#0F3D5E] font-bold text-[#0F3D5E] flex justify-between text-sm">
                  <span>Total Liabilities &amp; Equity</span>
                  <span className="font-mono tabular-nums">
                    {formatAccountingNPR(balanceSheetData.totalLiabilitiesAndEquity, true)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: REAL-TIME AR & AP AGING SCHEDULE */}
      {activeTab === 'ar_ap' && (
        <div className="space-y-5">
          {/* Accounts Receivable Aging */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Accounts Receivable (Customer Debtors) Aging Schedule
              </h3>
              <p className="text-xs text-[#64748B]">
                Live aging computed from unpaid Tax Invoice issue dates.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-semibold text-[#16A34A]">0 – 15 Days Current</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ar.b0_15)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200">
                <span className="text-[11px] font-semibold text-[#0284C7]">16 – 30 Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ar.b16_30)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[11px] font-semibold text-[#B45309]">31 – 60 Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ar.b31_60)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200">
                <span className="text-[11px] font-semibold text-[#DC2626]">60+ Days Overdue</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ar.b60plus)}
                </div>
              </div>
            </div>

            {agingData.arItems.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5">Customer</th>
                      <th className="p-2.5">Issue Date</th>
                      <th className="p-2.5 text-center">Age (Days)</th>
                      <th className="p-2.5 text-right">Due Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {agingData.arItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono font-bold text-[#0284C7]">{item.ref}</td>
                        <td className="p-2.5 font-medium text-[#0F172A]">{item.party}</td>
                        <td className="p-2.5 font-mono text-[#64748B]">{item.date}</td>
                        <td className="p-2.5 text-center font-mono">{item.days}d ({item.bucket})</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#DC2626] tabular-nums">
                          {formatAccountingNPR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Accounts Payable Aging */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Accounts Payable (Spare Parts Vendors) Aging Schedule
              </h3>
              <p className="text-xs text-[#64748B]">
                Live vendor liabilities from Received / Billed Supplier Purchase Orders.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B]">0 – 15 Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ap.b0_15)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B]">16 – 30 Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ap.b16_30)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B]">31 – 60 Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ap.b31_60)}
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B]">60+ Days</span>
                <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1">
                  {formatAccountingNPR(agingData.ap.b60plus)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {isPrintModalOpen && (
        <PrintIrdVatRegisterModal
          type={printModalType}
          invoices={monthScopedInvoices}
          purchaseOrders={monthScopedPurchases}
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
