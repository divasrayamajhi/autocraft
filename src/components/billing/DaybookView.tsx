import React, { useState, useMemo, useRef } from 'react';
import { printElement, numberToWordsNPR } from '../../utils/printDocument';
import {
  CashierVoucher,
  CashierVoucherType,
  Invoice,
  UserRole,
  WorkshopProfile,
} from '../../types';
import {
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Banknote,
  QrCode,
  Receipt,
  Clock,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  FileCheck2,
} from 'lucide-react';
import {
  CASHBOOK_ACCOUNT_HEADS,
  formatAccountingNPR,
  isCreditNoteInvoice,
  round2,
  toNepalBsDate,
} from '../../utils/accountingEngine';
import { DualCalendarPicker } from '../common/DualCalendarPicker';
import { adToBs, bsToAd, BS_MONTH_NAMES, BS_YEAR_START, BS_YEAR_END, getBsMonthDays } from '../../utils/nepaliDate';

interface DaybookViewProps {
  invoices: Invoice[];
  cashierVouchers?: CashierVoucher[];
  profile?: WorkshopProfile;
  userRole?: UserRole;
  currentUserName?: string;
  onAddCashierVoucher?: (voucher: CashierVoucher) => void;
  onPrintInvoice?: (invoice: Invoice) => void;
}

type DaybookEntryKind =
  | 'Sales Invoice'
  | 'Credit Note'
  | 'Prior Invoice Settlement'
  | 'Cash In'
  | 'Cash Out';

interface DaybookEntry {
  id: string;
  time: string;
  date: string;
  bsDate: string;
  entryKind: DaybookEntryKind;
  voucherOrDocNumber: string;
  accountHead: string;
  particulars: string;
  partyName: string; // Customer OR Received From / Paid To
  customerPan?: string;
  vehicleReg?: string;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  createdBy?: string;
  approvedBy?: string;
  taxableAmount: number;
  vatAmount: number;
  grossTotal: number;
  cashFlowToday: number; // positive = inflow today; negative = outflow today
  balanceDue: number;
  rawInvoice?: Invoice;
  rawVoucher?: CashierVoucher;
}

export const DaybookView: React.FC<DaybookViewProps> = ({
  invoices = [],
  cashierVouchers = [],
  profile,
  currentUserName,
  onAddCashierVoucher,
  onPrintInvoice,
}) => {
  const workshopName = profile?.name || 'Auto Workshop Pvt. Ltd.';
  const workshopPan = profile?.panVatNumber || '302849182';
  const workshopAddress = profile?.address || 'Kathmandu, Nepal';
  const cashierLabel = currentUserName || 'Accounts Desk';

  // Extract all distinct dates with billing, payment receipt, or cash voucher activity
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    invoices.forEach((inv) => {
      const invDate = (inv.date || inv.createdAt || '').slice(0, 10);
      if (invDate) datesSet.add(invDate);
      if (Array.isArray(inv.payments)) {
        inv.payments.forEach((p) => {
          if (p.date) datesSet.add(p.date.slice(0, 10));
        });
      }
    });
    cashierVouchers.forEach((v) => {
      if (v.transactionDate) datesSet.add(v.transactionDate.slice(0, 10));
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    datesSet.add(todayStr);
    return Array.from(datesSet).sort().reverse();
  }, [invoices, cashierVouchers]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (availableDates.includes(today)) return today;
    return availableDates[0] || today;
  });

  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printDaybookRef = useRef<HTMLDivElement>(null);
  const [cashOpeningFloat, setCashOpeningFloat] = useState<number>(10000);
  const [isDayClosed, setIsDayClosed] = useState<boolean>(false);

  // Cash In / Cash Out Entry Modal State (all 12 required fields)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [vDate, setVDate] = useState<string>(selectedDate);
  const [vNumber, setVNumber] = useState<string>('');
  const [vType, setVType] = useState<CashierVoucherType>('Cash In');
  const [vAccountHead, setVAccountHead] = useState<string>(
    CASHBOOK_ACCOUNT_HEADS.find((h) => h.allowedFor === 'Cash In')?.label || 'Sales / Service Cash Receipt'
  );
  const [vParticulars, setVParticulars] = useState<string>('');
  const [vReference, setVReference] = useState<string>('');
  const [vAmount, setVAmount] = useState<string>('');
  const [vPartyName, setVPartyName] = useState<string>('');
  const [vRemarks, setVRemarks] = useState<string>('');
  const [vApprovedBy, setVApprovedBy] = useState<string>('');
  const [vError, setVError] = useState<string>('');

  // Print Single Cash Receipt / Payment Voucher Modal
  const [printVoucher, setPrintVoucher] = useState<CashierVoucher | null>(null);
  const printVoucherRef = useRef<HTMLDivElement>(null);

  const generateNextVoucherNumber = (type: CashierVoucherType): string => {
    const prefix = type === 'Cash In' ? 'CRV' : 'CPV';
    const existingCount = cashierVouchers.filter((v) => v.transactionType === type).length;
    let seq = existingCount + 1;
    let candidate = `${prefix}-81-${String(seq).padStart(4, '0')}`;
    const existingSet = new Set(cashierVouchers.map((v) => v.voucherNumber.toUpperCase()));
    while (existingSet.has(candidate.toUpperCase())) {
      seq += 1;
      candidate = `${prefix}-81-${String(seq).padStart(4, '0')}`;
    }
    return candidate;
  };

  const openVoucherModal = (type: CashierVoucherType) => {
    setVType(type);
    setVDate(selectedDate);
    setVNumber(generateNextVoucherNumber(type));
    const defaultHead =
      CASHBOOK_ACCOUNT_HEADS.find((h) => h.allowedFor === type || h.allowedFor === 'Both')?.label ||
      (type === 'Cash In' ? 'Sales / Service Cash Receipt' : 'Workshop Expense / Petty Cash');
    setVAccountHead(defaultHead);
    setVParticulars('');
    setVReference('');
    setVAmount('');
    setVPartyName('');
    setVRemarks('');
    setVApprovedBy('');
    setVError('');
    setIsVoucherModalOpen(true);
  };

  const handleVoucherTypeSwitch = (nextType: CashierVoucherType) => {
    setVType(nextType);
    setVNumber(generateNextVoucherNumber(nextType));
    const defaultHead =
      CASHBOOK_ACCOUNT_HEADS.find((h) => h.allowedFor === nextType || h.allowedFor === 'Both')?.label ||
      '';
    setVAccountHead(defaultHead);
    setVError('');
  };

  const handleSaveCashierVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    setVError('');

    const trimmedVoucherNo = vNumber.trim();
    const numericAmount = round2(parseFloat(vAmount) || 0);

    if (!vDate) {
      setVError('Transaction Date is required.');
      return;
    }
    if (!trimmedVoucherNo) {
      setVError('Voucher Number is required.');
      return;
    }
    const isDuplicate = cashierVouchers.some(
      (v) => v.voucherNumber.trim().toLowerCase() === trimmedVoucherNo.toLowerCase()
    );
    if (isDuplicate) {
      setVError(`Voucher Number "${trimmedVoucherNo}" already exists. Please use a unique Voucher Number.`);
      return;
    }
    if (!vAccountHead.trim()) {
      setVError('Account Head is required.');
      return;
    }
    if (!vParticulars.trim()) {
      setVError('Particulars / description is required.');
      return;
    }
    if (!vPartyName.trim()) {
      setVError(vType === 'Cash In' ? 'Received From is required.' : 'Paid To is required.');
      return;
    }
    if (numericAmount <= 0) {
      setVError('Amount must be greater than NPR 0.');
      return;
    }

    const headObj = CASHBOOK_ACCOUNT_HEADS.find((h) => h.label === vAccountHead);

    const newVoucher: CashierVoucher = {
      id: `CV-${Date.now().toString().slice(-6)}`,
      transactionDate: vDate,
      bsDate: toNepalBsDate(vDate),
      voucherNumber: trimmedVoucherNo,
      transactionType: vType,
      accountHead: vAccountHead,
      glAccountCode: headObj?.glAccountCode,
      particulars: vParticulars.trim(),
      referenceNumber: vReference.trim() || undefined,
      amount: numericAmount,
      paymentMode: 'Cash',
      partyName: vPartyName.trim(),
      remarks: vRemarks.trim() || undefined,
      createdBy: cashierLabel,
      approvedBy: vApprovedBy.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    if (onAddCashierVoucher) {
      onAddCashierVoucher(newVoucher);
    }
    setSelectedDate(vDate);
    setIsVoucherModalOpen(false);
  };

  const handleJumpDate = (offset: number) => {
    const currIndex = availableDates.indexOf(selectedDate);
    if (currIndex === -1) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().slice(0, 10));
    } else {
      const nextIndex = currIndex - offset;
      if (nextIndex >= 0 && nextIndex < availableDates.length) {
        setSelectedDate(availableDates[nextIndex]);
      } else {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().slice(0, 10));
      }
    }
  };

  // Build Chartered Accountant reconciled Daybook entries for `selectedDate`
  // Includes: (1) Invoices & Credit Notes issued on selectedDate,
  //           (2) Payment settlements collected on selectedDate for prior-day invoices, AND
  //           (3) Manual Cash In (Receipt) & Cash Out (Payment) Vouchers recorded on selectedDate
  const dayTransactions = useMemo<DaybookEntry[]>(() => {
    const list: DaybookEntry[] = [];

    invoices.forEach((inv) => {
      const invDate = (inv.date || inv.createdAt || '').slice(0, 10);
      const isCN = isCreditNoteInvoice(inv);

      const paymentsOnDate = (inv.payments || []).filter(
        (p) => (p.date || '').slice(0, 10) === selectedDate
      );

      if (invDate === selectedDate) {
        const createdTime =
          inv.createdAt && inv.createdAt.length >= 16
            ? new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '10:00 AM';

        const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
        const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
        const grand = Number(inv.grandTotal ?? round2(taxable + vat));

        let flowToday = 0;
        let modeUsed = inv.paymentMethod || 'Unpaid';
        let refUsed = inv.paymentReference || inv.jobCardNumber || '';

        if (paymentsOnDate.length > 0) {
          flowToday = round2(paymentsOnDate.reduce((s, p) => s + (Number(p.amount) || 0), 0));
          modeUsed = paymentsOnDate[paymentsOnDate.length - 1].method || modeUsed;
          refUsed = paymentsOnDate[paymentsOnDate.length - 1].referenceNumber || refUsed;
        } else {
          const legacyPaid = Number(inv.paidAmount ?? inv.amountPaid ?? 0);
          if ((!inv.payments || inv.payments.length === 0) && legacyPaid !== 0) {
            flowToday = legacyPaid;
          }
        }

        list.push({
          id: `INV-${inv.id}`,
          time: createdTime,
          date: invDate,
          bsDate: toNepalBsDate(invDate),
          entryKind: isCN ? 'Credit Note' : 'Sales Invoice',
          voucherOrDocNumber: inv.invoiceNumber,
          accountHead: isCN ? 'Sales Return / Credit Note' : 'Sales / Service Revenue',
          particulars: isCN
            ? `IRD Credit Note — ${inv.vehicleModel || 'Sales Adjustment'}`
            : inv.jobCardNumber && inv.jobCardNumber !== 'OTC-SALES'
            ? `Workshop Service (${inv.jobCardNumber}) — ${inv.vehicleModel || 'Vehicle'}`
            : `Over-The-Counter Spares Sale`,
          partyName: inv.companyName || inv.customerName,
          customerPan: inv.customerPan || inv.customerPanVat,
          vehicleReg: inv.vehicleReg,
          paymentMode: flowToday === 0 && !isCN ? 'Credit (AR)' : modeUsed,
          referenceNumber: refUsed,
          createdBy: cashierLabel,
          taxableAmount: taxable,
          vatAmount: vat,
          grossTotal: grand,
          cashFlowToday: flowToday,
          balanceDue: isCN ? 0 : Math.max(0, Number(inv.balanceDue ?? 0)),
          rawInvoice: inv,
        });
      } else if (paymentsOnDate.length > 0) {
        paymentsOnDate.forEach((pay, idx) => {
          const payTime =
            pay.date && pay.date.length >= 16
              ? new Date(pay.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '12:00 PM';
          list.push({
            id: `RCPT-${inv.id}-${pay.id || idx}`,
            time: payTime,
            date: selectedDate,
            bsDate: toNepalBsDate(selectedDate),
            entryKind: 'Prior Invoice Settlement',
            voucherOrDocNumber: pay.referenceNumber || inv.invoiceNumber,
            accountHead: 'Accounts Receivable (AR)',
            particulars: `AR Recovery against ${inv.invoiceNumber} (Issued ${invDate})`,
            partyName: inv.companyName || inv.customerName,
            customerPan: inv.customerPan || inv.customerPanVat,
            vehicleReg: inv.vehicleReg,
            paymentMode: pay.method || 'Cash',
            referenceNumber: inv.invoiceNumber,
            createdBy: cashierLabel,
            taxableAmount: 0,
            vatAmount: 0,
            grossTotal: 0,
            cashFlowToday: round2(Number(pay.amount) || 0),
            balanceDue: Math.max(0, Number(inv.balanceDue ?? 0)),
            rawInvoice: inv,
          });
        });
      }
    });

    // Include Manual Cashier Cash In (Receipt) & Cash Out (Payment) Vouchers
    cashierVouchers
      .filter((v) => (v.transactionDate || '').slice(0, 10) === selectedDate)
      .forEach((v) => {
        const vTime =
          v.createdAt && v.createdAt.length >= 16
            ? new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '11:00 AM';
        const signedFlow = v.transactionType === 'Cash In' ? round2(v.amount) : -round2(v.amount);

        list.push({
          id: `CV-${v.id}`,
          time: vTime,
          date: v.transactionDate.slice(0, 10),
          bsDate: v.bsDate || toNepalBsDate(v.transactionDate),
          entryKind: v.transactionType,
          voucherOrDocNumber: v.voucherNumber,
          accountHead: v.accountHead,
          particulars: v.particulars,
          partyName: v.partyName,
          paymentMode: v.paymentMode || 'Cash',
          referenceNumber: v.referenceNumber,
          remarks: v.remarks,
          createdBy: v.createdBy || cashierLabel,
          approvedBy: v.approvedBy,
          taxableAmount: 0,
          vatAmount: 0,
          grossTotal: 0,
          cashFlowToday: signedFlow,
          balanceDue: 0,
          rawVoucher: v,
        });
      });

    return list;
  }, [invoices, cashierVouchers, selectedDate, cashierLabel]);

  // Filtered view
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return dayTransactions.filter((t) => {
      const matchesType = typeFilter === 'All' || t.entryKind === typeFilter;
      const matchesMode =
        modeFilter === 'All' ||
        t.paymentMode.toLowerCase().includes(modeFilter.toLowerCase());
      const matchesSearch =
        !q ||
        t.voucherOrDocNumber.toLowerCase().includes(q) ||
        t.partyName.toLowerCase().includes(q) ||
        t.accountHead.toLowerCase().includes(q) ||
        (t.referenceNumber || '').toLowerCase().includes(q) ||
        (t.vehicleReg || '').toLowerCase().includes(q) ||
        t.particulars.toLowerCase().includes(q) ||
        (t.remarks || '').toLowerCase().includes(q);
      return matchesType && matchesMode && matchesSearch;
    });
  }, [dayTransactions, typeFilter, modeFilter, searchQuery]);

  // Reconciled Daily Summary Totals
  const summary = useMemo(() => {
    let grossTaxableBilled = 0;
    let netOutputVat = 0;
    let netBilledTotal = 0;
    let invoiceCashIn = 0;
    let manualCashIn = 0;
    let invoiceCashOut = 0;
    let manualCashOut = 0;
    let digitalInflow = 0;
    let digitalOutflow = 0;
    let creditSalesUnpaid = 0;

    dayTransactions.forEach((t) => {
      grossTaxableBilled = round2(grossTaxableBilled + t.taxableAmount);
      netOutputVat = round2(netOutputVat + t.vatAmount);
      netBilledTotal = round2(netBilledTotal + t.grossTotal);

      const isCashMode = t.paymentMode.toLowerCase().includes('cash');
      if (t.entryKind === 'Cash In') {
        manualCashIn = round2(manualCashIn + Math.abs(t.cashFlowToday));
      } else if (t.entryKind === 'Cash Out') {
        manualCashOut = round2(manualCashOut + Math.abs(t.cashFlowToday));
      } else if (t.cashFlowToday > 0) {
        if (isCashMode) invoiceCashIn = round2(invoiceCashIn + t.cashFlowToday);
        else digitalInflow = round2(digitalInflow + t.cashFlowToday);
      } else if (t.cashFlowToday < 0) {
        if (isCashMode) invoiceCashOut = round2(invoiceCashOut + Math.abs(t.cashFlowToday));
        else digitalOutflow = round2(digitalOutflow + Math.abs(t.cashFlowToday));
      }

      if (t.entryKind === 'Sales Invoice' && t.balanceDue > 0) {
        creditSalesUnpaid = round2(creditSalesUnpaid + t.balanceDue);
      }
    });

    const totalCashInflow = round2(invoiceCashIn + manualCashIn);
    const totalCashOutflow = round2(invoiceCashOut + manualCashOut);
    const netCashMovement = round2(totalCashInflow - totalCashOutflow);
    const netDigitalMovement = round2(digitalInflow - digitalOutflow);
    const closingCashInDrawer = round2(cashOpeningFloat + netCashMovement);

    return {
      grossTaxableBilled,
      netOutputVat,
      netBilledTotal,
      invoiceCashIn,
      manualCashIn,
      totalCashInflow,
      invoiceCashOut,
      manualCashOut,
      totalCashOutflow,
      netCashMovement,
      digitalInflow,
      digitalOutflow,
      netDigitalMovement,
      creditSalesUnpaid,
      closingCashInDrawer,
    };
  }, [dayTransactions, cashOpeningFloat]);

  const handleExportCsv = () => {
    const headers = [
      'Date (AD)',
      'Date (BS)',
      'Time',
      'Transaction Type',
      'Voucher / Invoice #',
      'Account Head',
      'Received From / Paid To',
      'Particulars',
      'Reference #',
      'Payment Mode',
      'Taxable (NPR)',
      '13% VAT (NPR)',
      'Billed Total (NPR)',
      'Cash/Bank In (+)/Out (-) (NPR)',
      'Remarks',
      'Created By',
      'Approved By',
    ];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.bsDate,
      t.time,
      t.entryKind,
      t.voucherOrDocNumber,
      `"${t.accountHead.replace(/"/g, '""')}"`,
      `"${t.partyName.replace(/"/g, '""')}"`,
      `"${t.particulars.replace(/"/g, '""')}"`,
      `"${(t.referenceNumber || '').replace(/"/g, '""')}"`,
      t.paymentMode,
      t.taxableAmount,
      t.vatAmount,
      t.grossTotal,
      t.cashFlowToday,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      `"${(t.createdBy || '').replace(/"/g, '""')}"`,
      `"${(t.approvedBy || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cashier_Daybook_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedBsDateLabel = toNepalBsDate(selectedDate, true);
  const contextualAccountHeads = CASHBOOK_ACCOUNT_HEADS.filter(
    (h) => h.allowedFor === vType || h.allowedFor === 'Both'
  );

  return (
    <div className="space-y-5">
      {/* Daybook Date Controller & Primary Actions */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1 bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0]">
            <button
              onClick={() => handleJumpDate(-1)}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFFFFF] rounded-md transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-2 px-2">
              <Calendar className="w-4 h-4 text-[#0284C7]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-[#0F172A] outline-none"
              />
            </div>
            <button
              onClick={() => handleJumpDate(1)}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFFFFF] rounded-md transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Synchronized Nepali B.S. Calendar Selector */}
          {(() => {
            const bs = adToBs(selectedDate);
            const maxDay = getBsMonthDays(bs.year, bs.month);
            const bsYears: number[] = [];
            for (let y = BS_YEAR_START; y <= BS_YEAR_END; y++) bsYears.push(y);
            return (
              <div className="flex items-center space-x-1 bg-sky-50 border border-sky-200 rounded-lg px-2 py-1 text-[11px]">
                <span className="font-bold text-[#0F3D5E] uppercase mr-1">B.S.</span>
                <select
                  aria-label="Daybook B.S. Year"
                  value={bs.year}
                  onChange={(e) => setSelectedDate(bsToAd(Number(e.target.value), bs.month, bs.day))}
                  className="bg-transparent font-mono font-bold text-[#0F3D5E] outline-none"
                >
                  {bsYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <select
                  aria-label="Daybook B.S. Month"
                  value={bs.month}
                  onChange={(e) => setSelectedDate(bsToAd(bs.year, Number(e.target.value), bs.day))}
                  className="bg-transparent font-semibold text-[#0284C7] outline-none"
                >
                  {BS_MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  aria-label="Daybook B.S. Day"
                  value={bs.day}
                  onChange={(e) => setSelectedDate(bsToAd(bs.year, bs.month, Number(e.target.value)))}
                  className="bg-transparent font-mono font-bold text-[#0F3D5E] outline-none"
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{String(d).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
            );
          })()}

          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] outline-none"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d} AD ({toNepalBsDate(d)} BS)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Cashier Daybook Actions: Cash In (Receipt) & Cash Out (Payment) */}
          {onAddCashierVoucher && (
            <>
              <button
                type="button"
                onClick={() => openVoucherModal('Cash In')}
                className="px-3.5 py-2 bg-[#16A34A] hover:bg-green-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Cash In (Receipt)</span>
              </button>

              <button
                type="button"
                onClick={() => openVoucherModal('Cash Out')}
                className="px-3.5 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Cash Out (Payment)</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A4 Daybook</span>
          </button>

          <button
            onClick={() => setIsDayClosed(!isDayClosed)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition ${
              isDayClosed
                ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                : 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-[#0EA5E9]'
            }`}
          >
            {isDayClosed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            <span>{isDayClosed ? 'Day Closed' : 'Close Day Shift'}</span>
          </button>
        </div>
      </div>

      {/* Daily Financial & Cashier Drawer Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Net Billed Today
            </span>
            <Receipt className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-lg font-bold text-[#0F172A] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(summary.netBilledTotal)}
          </div>
          <span className="text-[10px] text-[#64748B] block mt-0.5 truncate">
            Tax: {formatAccountingNPR(summary.grossTaxableBilled)} • VAT: {formatAccountingNPR(summary.netOutputVat)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Cash In
            </span>
            <ArrowDownLeft className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-lg font-bold text-[#16A34A] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(summary.totalCashInflow)}
          </div>
          <span className="text-[10px] text-[#64748B] block mt-0.5 truncate">
            Bills: {formatAccountingNPR(summary.invoiceCashIn)} • Vouchers: {formatAccountingNPR(summary.manualCashIn)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Cash Out
            </span>
            <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-lg font-bold text-[#DC2626] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(summary.totalCashOutflow)}
          </div>
          <span className="text-[10px] text-[#64748B] block mt-0.5 truncate">
            Payments: {formatAccountingNPR(summary.manualCashOut)} • Refunds: {formatAccountingNPR(summary.invoiceCashOut)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Digital &amp; Bank
            </span>
            <QrCode className="w-4 h-4 text-[#0EA5E9]" />
          </div>
          <div className="text-lg font-bold text-[#0284C7] font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(summary.netDigitalMovement)}
          </div>
          <span className="text-[10px] text-[#64748B] block mt-0.5 truncate">
            Fonepay, NepalPay &amp; Bank
          </span>
        </div>

        <div className="bg-[#0F3D5E] p-4 rounded-xl text-white col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
              Closing Drawer Cash
            </span>
            <Banknote className="w-4 h-4 text-[#0EA5E9]" />
          </div>
          <div className="text-lg font-bold font-mono tabular-nums mt-1 truncate">
            {formatAccountingNPR(summary.closingCashInDrawer)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-sky-200">
            <span>Opening Float:</span>
            <input
              type="number"
              min={0}
              value={cashOpeningFloat}
              onChange={(e) => setCashOpeningFloat(Math.max(0, Number(e.target.value) || 0))}
              className="w-20 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-right font-mono text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Filters inside Daybook */}
      <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0] flex flex-col md:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by voucher #, invoice #, account head, received from / paid to, reference, or particulars..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg focus:bg-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
        </div>

        <div className="grid grid-cols-2 md:flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] outline-none"
          >
            <option value="All">All Entry Types</option>
            <option value="Cash In">Cash In (Receipts)</option>
            <option value="Cash Out">Cash Out (Payments)</option>
            <option value="Sales Invoice">Sales Invoices</option>
            <option value="Credit Note">Credit Notes</option>
            <option value="Prior Invoice Settlement">AR Settlements</option>
          </select>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] outline-none"
          >
            <option value="All">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="Fonepay">Fonepay</option>
            <option value="NepalPay">NepalPay / connectIPS</option>
            <option value="Bank">Bank Transfer</option>
            <option value="Credit">Credit (AR)</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards (< lg) */}
      <div className="block lg:hidden space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B]">
            No billing, cash in, or cash out transactions recorded on {selectedDate} ({selectedBsDateLabel}).
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-4 space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#0284C7] block">{tx.voucherOrDocNumber}</span>
                  <span className="text-[10px] text-[#64748B] font-mono">
                    {tx.date} • {tx.time}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tx.entryKind === 'Cash In'
                      ? 'bg-emerald-100 text-[#16A34A]'
                      : tx.entryKind === 'Cash Out'
                      ? 'bg-red-100 text-[#DC2626]'
                      : tx.entryKind === 'Credit Note'
                      ? 'bg-red-50 text-[#DC2626]'
                      : tx.entryKind === 'Prior Invoice Settlement'
                      ? 'bg-emerald-50 text-[#16A34A]'
                      : 'bg-[#F1F5F9] text-[#0F3D5E]'
                  }`}
                >
                  {tx.entryKind}
                </span>
              </div>

              <div>
                <div className="font-semibold text-[#0F172A]">
                  {tx.entryKind === 'Cash In'
                    ? `Received From: ${tx.partyName}`
                    : tx.entryKind === 'Cash Out'
                    ? `Paid To: ${tx.partyName}`
                    : tx.partyName}
                </div>
                <div className="text-[11px] text-[#0F3D5E] font-medium">{tx.accountHead}</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">{tx.particulars}</div>
                {tx.referenceNumber && (
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5">Ref: {tx.referenceNumber}</div>
                )}
                {tx.remarks && (
                  <div className="text-[10px] text-[#64748B] italic mt-0.5">Remarks: {tx.remarks}</div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <div className="text-[10px] text-[#64748B]">
                  <div>Mode: <strong className="text-[#0F172A]">{tx.paymentMode}</strong></div>
                  <div>By: {tx.createdBy}{tx.approvedBy ? ` • Appr: ${tx.approvedBy}` : ''}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ${
                      tx.cashFlowToday > 0
                        ? 'text-[#16A34A]'
                        : tx.cashFlowToday < 0
                        ? 'text-[#DC2626]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {tx.cashFlowToday !== 0 ? formatAccountingNPR(tx.cashFlowToday) : 'Credit (AR)'}
                  </span>
                  {tx.rawInvoice && onPrintInvoice && (
                    <button
                      onClick={() => onPrintInvoice(tx.rawInvoice!)}
                      className="p-1.5 text-[#0F3D5E] bg-[#F1F5F9] rounded-lg"
                      title="Print Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {tx.rawVoucher && (
                    <button
                      onClick={() => setPrintVoucher(tx.rawVoucher!)}
                      className="p-1.5 text-[#0F3D5E] bg-[#F1F5F9] rounded-lg"
                      title="Print Cash Voucher"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Daybook Ledger Table (>= lg) */}
      <div className="hidden lg:block bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#E2E8F0]">
                <th className="p-3">Time</th>
                <th className="p-3">Voucher / Doc #</th>
                <th className="p-3">Account Head &amp; Party</th>
                <th className="p-3">Particulars &amp; Reference</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Billed Total</th>
                <th className="p-3 text-right">Cash / Bank In (+)</th>
                <th className="p-3 text-right">Cash Out (-)</th>
                <th className="p-3">Audit (By / Appr)</th>
                <th className="p-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#64748B]">
                    No billing, Cash In, or Cash Out transactions recorded on {selectedDate} ({selectedBsDateLabel}).
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-[#F8FAFC] transition ${
                      tx.entryKind === 'Cash In'
                        ? 'bg-emerald-50/20'
                        : tx.entryKind === 'Cash Out'
                        ? 'bg-red-50/20'
                        : ''
                    }`}
                  >
                    <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{tx.time}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-[#0284C7] block">{tx.voucherOrDocNumber}</span>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          tx.entryKind === 'Cash In'
                            ? 'bg-emerald-100 text-[#16A34A]'
                            : tx.entryKind === 'Cash Out'
                            ? 'bg-red-100 text-[#DC2626]'
                            : tx.entryKind === 'Credit Note'
                            ? 'bg-red-50 text-[#DC2626]'
                            : tx.entryKind === 'Prior Invoice Settlement'
                            ? 'bg-emerald-50 text-[#16A34A]'
                            : 'bg-[#F1F5F9] text-[#0F3D5E]'
                        }`}
                      >
                        {tx.entryKind}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[#0F172A]">{tx.partyName}</div>
                      <div className="text-[11px] text-[#0F3D5E] font-medium">{tx.accountHead}</div>
                      {tx.entryKind === 'Cash In' && (
                        <span className="text-[10px] text-[#16A34A]">Received From</span>
                      )}
                      {tx.entryKind === 'Cash Out' && (
                        <span className="text-[10px] text-[#DC2626]">Paid To</span>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="text-[#0F172A] leading-snug">{tx.particulars}</div>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-[#64748B] mt-0.5">
                        {tx.referenceNumber && (
                          <span className="font-mono">Ref: {tx.referenceNumber}</span>
                        )}
                        {tx.remarks && <span className="italic">Note: {tx.remarks}</span>}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
                        {tx.paymentMode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#0F172A] whitespace-nowrap">
                      {tx.grossTotal !== 0 ? formatAccountingNPR(tx.grossTotal) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-[#16A34A] whitespace-nowrap">
                      {tx.cashFlowToday > 0 ? formatAccountingNPR(tx.cashFlowToday) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-[#DC2626] whitespace-nowrap">
                      {tx.cashFlowToday < 0 ? formatAccountingNPR(Math.abs(tx.cashFlowToday)) : '—'}
                    </td>
                    <td className="p-3 text-[10px] text-[#64748B] whitespace-nowrap">
                      <div className="font-medium text-[#0F172A]">{tx.createdBy || cashierLabel}</div>
                      {tx.approvedBy ? (
                        <div className="text-[#16A34A]">Appr: {tx.approvedBy}</div>
                      ) : (
                        <span>Cashier Desk</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {tx.rawInvoice && onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(tx.rawInvoice!)}
                          className="p-1.5 text-[#0F3D5E] hover:bg-[#F1F5F9] rounded-lg transition"
                          title="Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {tx.rawVoucher && (
                        <button
                          onClick={() => setPrintVoucher(tx.rawVoucher!)}
                          className="p-1.5 text-[#0F3D5E] hover:bg-[#F1F5F9] rounded-lg transition"
                          title="Print Cash Receipt / Payment Voucher"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-[#F8FAFC] font-bold text-[#0F172A] border-t-2 border-[#E2E8F0]">
                  <td colSpan={5} className="p-3 text-right uppercase text-[11px]">
                    Day Total ({filteredTransactions.length} entries):
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(filteredTransactions.reduce((s, t) => s + t.grossTotal, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#16A34A]">
                    {formatAccountingNPR(
                      filteredTransactions.reduce((s, t) => s + (t.cashFlowToday > 0 ? t.cashFlowToday : 0), 0)
                    )}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#DC2626]">
                    {formatAccountingNPR(
                      filteredTransactions.reduce((s, t) => s + (t.cashFlowToday < 0 ? Math.abs(t.cashFlowToday) : 0), 0)
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL: CASH IN (RECEIPT) / CASH OUT (PAYMENT) VOUCHER ENTRY */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-2xl w-full border border-[#E2E8F0] overflow-hidden my-auto max-h-[94vh] flex flex-col">
            <div
              className={`px-5 py-4 text-white flex items-center justify-between shrink-0 ${
                vType === 'Cash In' ? 'bg-[#0F3D5E]' : 'bg-[#0F3D5E]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    vType === 'Cash In' ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                  }`}
                >
                  {vType === 'Cash In' ? (
                    <ArrowDownLeft className="w-4 h-4 text-white" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {vType === 'Cash In'
                      ? 'Cash In (Receipt Voucher) — Money Received by Cashier'
                      : 'Cash Out (Payment Voucher) — Money Paid Out by Cashier'}
                  </h3>
                  <p className="text-[11px] text-sky-200">
                    Automatically updates Cashier Drawer balance &amp; posts balanced Double-Entry Journal to GL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="p-1.5 text-sky-200 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCashierVoucher}
              className="p-5 space-y-4 text-xs overflow-y-auto flex-1"
            >
              {/* Field 3: Transaction Type Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-1.5">
                  Transaction Type *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleVoucherTypeSwitch('Cash In')}
                    className={`py-2.5 px-3 rounded-lg border font-bold flex items-center justify-center space-x-2 transition ${
                      vType === 'Cash In'
                        ? 'bg-emerald-50 border-[#16A34A] text-[#16A34A] ring-1 ring-[#16A34A]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Cash In (Receipt)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVoucherTypeSwitch('Cash Out')}
                    className={`py-2.5 px-3 rounded-lg border font-bold flex items-center justify-center space-x-2 transition ${
                      vType === 'Cash Out'
                        ? 'bg-red-50 border-[#DC2626] text-[#DC2626] ring-1 ring-[#DC2626]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Cash Out (Payment)</span>
                  </button>
                </div>
              </div>

              {vError && (
                <div className="bg-red-50 border border-red-200 text-[#DC2626] px-3 py-2 rounded-lg font-semibold">
                  {vError}
                </div>
              )}

              {/* Row 1: Dual BS/AD Transaction Date + Voucher Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <DualCalendarPicker
                    label="Transaction Date (B.S. / A.D.)"
                    value={vDate}
                    onChange={(nextAd) => setVDate(nextAd)}
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Voucher Number (Unique ID) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={vNumber}
                    onChange={(e) => setVNumber(e.target.value)}
                    placeholder={vType === 'Cash In' ? 'CRV-81-0001' : 'CPV-81-0001'}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono font-bold text-[#0F3D5E] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Account Head + Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Account Head <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={vAccountHead}
                    onChange={(e) => setVAccountHead(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  >
                    {contextualAccountHeads.map((head) => (
                      <option key={`${head.glAccountCode}-${head.label}`} value={head.label}>
                        {head.label} (GL {head.glAccountCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Payment Mode</label>
                  <input
                    type="text"
                    value="Cash"
                    readOnly
                    className="w-full px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-bold text-[#0F3D5E] cursor-not-allowed"
                  />
                  <span className="text-[10px] text-[#64748B] mt-0.5 block">
                    Cashier Drawer — GL 1010 Cash in Hand
                  </span>
                </div>
              </div>

              {/* Row 3: Received From / Paid To + Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    {vType === 'Cash In'
                      ? 'Received From (Person / Department)'
                      : 'Paid To (Person / Department)'}{' '}
                    <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={vPartyName}
                    onChange={(e) => setVPartyName(e.target.value)}
                    placeholder={
                      vType === 'Cash In'
                        ? 'e.g. Customer Name / Counter Desk'
                        : 'e.g. Store Runner / NEA Electricity / Technician'
                    }
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Amount (NPR) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={vAmount}
                    onChange={(e) => setVAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] ${
                      vType === 'Cash In' ? 'text-[#16A34A]' : 'text-[#DC2626]'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Row 4: Particulars + Reference Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Particulars (Description) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    value={vParticulars}
                    onChange={(e) => setVParticulars(e.target.value)}
                    placeholder={
                      vType === 'Cash In'
                        ? 'e.g. Booking advance received for full body repaint'
                        : 'e.g. Local spares purchase / tea & workshop consumables'
                    }
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={vReference}
                    onChange={(e) => setVReference(e.target.value)}
                    placeholder="Invoice / Bill / Receipt #"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </div>

              {/* Row 5: Remarks */}
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Remarks (Additional Information)
                </label>
                <textarea
                  rows={2}
                  value={vRemarks}
                  onChange={(e) => setVRemarks(e.target.value)}
                  placeholder="Optional audit remarks, bill attachment note, or authorization context..."
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>

              {/* Row 6: Created By + Approved By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Created By (Logged-in Cashier)
                  </label>
                  <input
                    type="text"
                    value={cashierLabel}
                    readOnly
                    className="w-full px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Approved By (Authorizing Person, if required)
                  </label>
                  <input
                    type="text"
                    value={vApprovedBy}
                    onChange={(e) => setVApprovedBy(e.target.value)}
                    placeholder="e.g. Workshop Manager / Chief Accountant"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#0F172A] rounded-lg font-semibold hover:bg-[#F1F5F9] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg font-bold flex items-center space-x-1.5 transition ${
                    vType === 'Cash In'
                      ? 'bg-[#16A34A] hover:bg-green-700'
                      : 'bg-[#DC2626] hover:bg-red-700'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>
                    {vType === 'Cash In' ? 'Save Cash In Receipt' : 'Save Cash Out Payment'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINT INDIVIDUAL CASH RECEIPT / PAYMENT VOUCHER (A4) */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-3xl rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#0F3D5E] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  {printVoucher.transactionType === 'Cash In'
                    ? 'Cash Receipt Voucher (CRV)'
                    : 'Cash Payment Voucher (CPV)'}{' '}
                  · <span className="font-mono">{printVoucher.voucherNumber}</span>
                </h3>
                <p className="text-[11px] text-sky-200">
                  {printVoucher.transactionDate} • {printVoucher.bsDate || toNepalBsDate(printVoucher.transactionDate)} BS
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    printElement(
                      printVoucherRef.current,
                      `${printVoucher.transactionType === 'Cash In' ? 'CRV' : 'CPV'}-${printVoucher.voucherNumber}`
                    )
                  }
                  className="px-4 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 / Save PDF</span>
                </button>
                <button
                  onClick={() => setPrintVoucher(null)}
                  className="p-1.5 text-sky-200 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 bg-[#F1F5F9]">
              <div
                ref={printVoucherRef}
                className="a4-sheet bg-[#FFFFFF] p-8 border border-[#E2E8F0] text-[#0F172A] text-xs space-y-5"
              >
                <div className="flex justify-between items-start border-b-2 border-[#0F3D5E] pb-4">
                  <div>
                    <h1 className="text-lg font-extrabold uppercase text-[#0F3D5E]">{workshopName}</h1>
                    <p className="text-[11px] text-[#64748B]">{workshopAddress}</p>
                    <p className="text-[11px] font-mono font-bold text-[#0F172A]">
                      PAN / VAT No.: {workshopPan}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-block px-3 py-1 border-2 font-extrabold text-sm uppercase tracking-wider ${
                        printVoucher.transactionType === 'Cash In'
                          ? 'border-[#16A34A] text-[#16A34A]'
                          : 'border-[#DC2626] text-[#DC2626]'
                      }`}
                    >
                      {printVoucher.transactionType === 'Cash In'
                        ? 'CASH RECEIPT VOUCHER'
                        : 'CASH PAYMENT VOUCHER'}
                    </div>
                    <p className="text-[11px] font-mono font-bold mt-1.5">
                      Voucher No.: {printVoucher.voucherNumber}
                    </p>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      Date: {printVoucher.transactionDate} ({printVoucher.bsDate || toNepalBsDate(printVoucher.transactionDate)} BS)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0] text-[11px]">
                  <div>
                    <span className="text-[#64748B] block uppercase text-[10px] font-bold">
                      {printVoucher.transactionType === 'Cash In' ? 'Received From' : 'Paid To'}
                    </span>
                    <strong className="text-sm text-[#0F172A]">{printVoucher.partyName}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block uppercase text-[10px] font-bold">
                      Account Head &amp; Payment Mode
                    </span>
                    <strong className="text-[#0F3D5E]">
                      {printVoucher.accountHead}
                      {printVoucher.glAccountCode ? ` (GL ${printVoucher.glAccountCode})` : ''}
                    </strong>
                    <div className="text-[#64748B]">Mode: {printVoucher.paymentMode} (GL 1010)</div>
                  </div>
                </div>

                <table className="w-full border-collapse border border-[#CBD5E1] text-[11px]">
                  <thead>
                    <tr className="bg-[#0F3D5E] text-white">
                      <th className="p-2.5 text-left border-r border-white/20">Particulars / Description</th>
                      <th className="p-2.5 text-left border-r border-white/20 w-36">Reference #</th>
                      <th className="p-2.5 text-right w-36">Amount (NPR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border-r border-[#CBD5E1]">
                        <div className="font-semibold text-[#0F172A]">{printVoucher.particulars}</div>
                        {printVoucher.remarks && (
                          <div className="text-[10px] text-[#64748B] mt-1">
                            Remarks: {printVoucher.remarks}
                          </div>
                        )}
                      </td>
                      <td className="p-3 border-r border-[#CBD5E1] font-mono">
                        {printVoucher.referenceNumber || '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-sm tabular-nums">
                        {formatAccountingNPR(printVoucher.amount, true)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8FAFC] font-bold border-t-2 border-[#CBD5E1]">
                      <td colSpan={2} className="p-2.5 text-right uppercase">
                        Total {printVoucher.transactionType === 'Cash In' ? 'Received' : 'Paid'} (NPR):
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm tabular-nums">
                        {formatAccountingNPR(printVoucher.amount, true)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="border border-[#E2E8F0] rounded-lg p-3 bg-[#F8FAFC]">
                  <span className="text-[10px] font-bold uppercase text-[#64748B] block">
                    Amount in Words
                  </span>
                  <strong className="text-xs text-[#0F172A]">
                    {numberToWordsNPR(Math.abs(printVoucher.amount))}
                  </strong>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-[11px]">
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">{printVoucher.createdBy}</div>
                    <div className="text-[10px] text-[#64748B]">Created By (Cashier)</div>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">{printVoucher.partyName}</div>
                    <div className="text-[10px] text-[#64748B]">
                      {printVoucher.transactionType === 'Cash In' ? 'Depositor Signature' : 'Receiver Signature'}
                    </div>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">{printVoucher.approvedBy || 'Authorized Signatory'}</div>
                    <div className="text-[10px] text-[#64748B]">Approved By</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A4 Printable Daybook Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] w-full max-w-4xl rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#0F3D5E] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Daily Cashier Daybook &amp; Tax Summary (A4)</h3>
                <p className="text-[11px] text-sky-200">
                  {selectedDate} • {selectedBsDateLabel}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => printElement(printDaybookRef.current, `Daybook-${selectedDate}`)}
                  className="px-4 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 / Save PDF</span>
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-sky-200 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6 bg-[#F1F5F9]">
              <div
                ref={printDaybookRef}
                className="a4-sheet bg-[#FFFFFF] p-8 border border-[#E2E8F0] text-[#0F172A] text-xs space-y-5"
              >
                <div className="text-center border-b-2 border-[#0F3D5E] pb-4">
                  <h1 className="text-lg font-bold uppercase tracking-tight text-[#0F3D5E]">
                    {workshopName}
                  </h1>
                  <p className="text-[11px] text-[#64748B]">
                    {workshopAddress} | PAN / VAT Reg:{' '}
                    <strong className="font-mono text-[#0F172A]">{workshopPan}</strong>
                  </p>
                  <h2 className="text-sm font-bold uppercase tracking-wider mt-2 text-[#0F172A]">
                    Daily Cashier Daybook &amp; Cash Drawer Reconciliation Sheet
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-4 text-[11px] bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                  <div>
                    <span className="text-[#64748B] block">Accounting Date (A.D.)</span>
                    <strong className="font-mono">{selectedDate}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Nepal Date (B.S.)</span>
                    <strong className="font-mono">{selectedBsDateLabel}</strong>
                  </div>
                  <div>
                    <span className="text-[#64748B] block">Cashier / Prepared By</span>
                    <strong>{cashierLabel}</strong>
                  </div>
                </div>

                <table className="w-full border-collapse border border-[#CBD5E1] text-[10px]">
                  <thead>
                    <tr className="bg-[#F1F5F9] text-[#0F172A] font-bold">
                      <th className="border border-[#CBD5E1] p-1.5">Voucher / Ref #</th>
                      <th className="border border-[#CBD5E1] p-1.5">Type</th>
                      <th className="border border-[#CBD5E1] p-1.5">Account Head &amp; Party</th>
                      <th className="border border-[#CBD5E1] p-1.5">Particulars</th>
                      <th className="border border-[#CBD5E1] p-1.5">Mode</th>
                      <th className="border border-[#CBD5E1] p-1.5 text-right">Billed Total</th>
                      <th className="border border-[#CBD5E1] p-1.5 text-right">Cash/Bank In</th>
                      <th className="border border-[#CBD5E1] p-1.5 text-right">Cash Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="border border-[#CBD5E1] p-4 text-center text-[#64748B]">
                          No transactions recorded on {selectedDate}.
                        </td>
                      </tr>
                    ) : (
                      dayTransactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="border border-[#CBD5E1] p-1.5 font-mono font-bold">
                            {tx.voucherOrDocNumber}
                          </td>
                          <td className="border border-[#CBD5E1] p-1.5">{tx.entryKind}</td>
                          <td className="border border-[#CBD5E1] p-1.5">
                            <strong>{tx.partyName}</strong>
                            <div className="text-[9px] text-[#64748B]">{tx.accountHead}</div>
                          </td>
                          <td className="border border-[#CBD5E1] p-1.5">
                            {tx.particulars}
                            {tx.referenceNumber ? ` (Ref: ${tx.referenceNumber})` : ''}
                            {tx.approvedBy ? ` [Appr: ${tx.approvedBy}]` : ''}
                          </td>
                          <td className="border border-[#CBD5E1] p-1.5">{tx.paymentMode}</td>
                          <td className="border border-[#CBD5E1] p-1.5 text-right font-mono">
                            {tx.grossTotal !== 0 ? formatAccountingNPR(tx.grossTotal) : '—'}
                          </td>
                          <td className="border border-[#CBD5E1] p-1.5 text-right font-mono font-bold text-[#16A34A]">
                            {tx.cashFlowToday > 0 ? formatAccountingNPR(tx.cashFlowToday) : '—'}
                          </td>
                          <td className="border border-[#CBD5E1] p-1.5 text-right font-mono font-bold text-[#DC2626]">
                            {tx.cashFlowToday < 0 ? formatAccountingNPR(Math.abs(tx.cashFlowToday)) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="grid grid-cols-2 gap-6 pt-2 text-[11px]">
                  <div className="border border-[#CBD5E1] rounded p-3 space-y-1.5">
                    <div className="font-bold uppercase text-[#0F3D5E] border-b border-[#E2E8F0] pb-1">
                      Daily Tax &amp; Billing Summary
                    </div>
                    <div className="flex justify-between">
                      <span>Net Taxable Sales:</span>
                      <span className="font-mono font-semibold">{formatAccountingNPR(summary.grossTaxableBilled)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net 13% Output VAT:</span>
                      <span className="font-mono font-semibold">{formatAccountingNPR(summary.netOutputVat)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-[#E2E8F0] pt-1">
                      <span>Net Billed Turnover:</span>
                      <span className="font-mono">{formatAccountingNPR(summary.netBilledTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#DC2626]">
                      <span>Credit Sales (Receivable):</span>
                      <span className="font-mono font-semibold">{formatAccountingNPR(summary.creditSalesUnpaid)}</span>
                    </div>
                  </div>

                  <div className="border border-[#CBD5E1] rounded p-3 space-y-1.5">
                    <div className="font-bold uppercase text-[#0F3D5E] border-b border-[#E2E8F0] pb-1">
                      Physical Cash Drawer Reconciliation
                    </div>
                    <div className="flex justify-between">
                      <span>Opening Cash Float:</span>
                      <span className="font-mono">{formatAccountingNPR(cashOpeningFloat)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add: Invoice Cash Receipts:</span>
                      <span className="font-mono text-[#16A34A]">{formatAccountingNPR(summary.invoiceCashIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Add: Cash In Vouchers (CRV):</span>
                      <span className="font-mono text-[#16A34A]">{formatAccountingNPR(summary.manualCashIn)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Less: Cash Out Vouchers (CPV) &amp; Refunds:</span>
                      <span className="font-mono text-[#DC2626]">
                        -{formatAccountingNPR(summary.totalCashOutflow)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-[#E2E8F0] pt-1">
                      <span>Closing Cash in Drawer:</span>
                      <span className="font-mono">{formatAccountingNPR(summary.closingCashInDrawer)}</span>
                    </div>
                    <div className="flex justify-between text-[#0284C7]">
                      <span>Digital / Bank Receipts:</span>
                      <span className="font-mono font-semibold">{formatAccountingNPR(summary.netDigitalMovement)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-12 text-center text-[11px]">
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">{cashierLabel}</div>
                    <div className="text-[10px] text-[#64748B]">Cashier / Accounts</div>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">Verified By</div>
                    <div className="text-[10px] text-[#64748B]">Chief Accountant</div>
                  </div>
                  <div>
                    <div className="border-b border-dashed border-[#94A3B8] h-10 mb-1.5" />
                    <div className="font-bold">Approved By</div>
                    <div className="text-[10px] text-[#64748B]">Managing Director</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
