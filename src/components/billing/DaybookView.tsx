import React, { useState, useMemo, useRef } from 'react';
import { printElement } from '../../utils/printDocument';
import { Invoice, WorkshopProfile, UserRole } from '../../types';
import {
  Calendar,
  Download,
  Printer,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  Banknote,
  QrCode,
  Receipt,
  Clock,
  X,
} from 'lucide-react';
import {
  formatAccountingNPR,
  isCreditNoteInvoice,
  isInvoiceSyncedToCbms,
  round2,
  toNepalBsDate,
} from '../../utils/accountingEngine';

interface DaybookViewProps {
  invoices: Invoice[];
  profile?: WorkshopProfile;
  userRole?: UserRole;
  currentUserName?: string;
  onPrintInvoice?: (invoice: Invoice) => void;
}

interface DaybookEntry {
  id: string;
  time: string;
  date: string;
  bsDate: string;
  entryKind: 'Sales Invoice' | 'Credit Note' | 'Prior Invoice Settlement';
  referenceNumber: string;
  particulars: string;
  customerName: string;
  customerPan?: string;
  vehicleReg?: string;
  paymentMode: string;
  paymentReference?: string;
  taxableAmount: number;
  vatAmount: number;
  grossTotal: number;
  cashFlowToday: number; // positive = inflow collected today; negative = cash/bank refund today
  balanceDue: number;
  irdCbmsStatus: 'Synced' | 'Pending';
  rawInvoice: Invoice;
}

export const DaybookView: React.FC<DaybookViewProps> = ({
  invoices = [],
  profile,
  currentUserName,
  onPrintInvoice,
}) => {
  const workshopName = profile?.name || 'Auto Workshop Pvt. Ltd.';
  const workshopPan = profile?.panVatNumber || '302849182';
  const workshopAddress = profile?.address || 'Kathmandu, Nepal';
  const cashierLabel = currentUserName || 'Accounts Desk';

  // Extract all distinct dates with billing OR payment receipt activity
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
    const todayStr = new Date().toISOString().slice(0, 10);
    datesSet.add(todayStr);
    return Array.from(datesSet).sort().reverse();
  }, [invoices]);

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
  // Includes: (1) Invoices & Credit Notes issued on selectedDate, AND
  //           (2) Payment settlements collected on selectedDate for prior-day invoices
  const dayTransactions = useMemo<DaybookEntry[]>(() => {
    const list: DaybookEntry[] = [];

    invoices.forEach((inv) => {
      const invDate = (inv.date || inv.createdAt || '').slice(0, 10);
      const isCN = isCreditNoteInvoice(inv);
      const synced = isInvoiceSyncedToCbms(inv);

      // Payments recorded specifically on selectedDate
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

        // Actual cash/bank flow on selectedDate for this invoice
        let flowToday = 0;
        let modeUsed = inv.paymentMethod || 'Unpaid';
        let refUsed = inv.paymentReference || inv.jobCardNumber || '';

        if (paymentsOnDate.length > 0) {
          flowToday = round2(paymentsOnDate.reduce((s, p) => s + (Number(p.amount) || 0), 0));
          modeUsed = paymentsOnDate[paymentsOnDate.length - 1].method || modeUsed;
          refUsed = paymentsOnDate[paymentsOnDate.length - 1].referenceNumber || refUsed;
        } else {
          // Fallback if legacy invoice had paidAmount set on creation without payments[] array
          const legacyPaid = Number(inv.paidAmount ?? inv.amountPaid ?? 0);
          if ((!inv.payments || inv.payments.length === 0) && legacyPaid !== 0) {
            flowToday = legacyPaid;
          }
        }

        list.push({
          id: `INV-${inv.id}`,
          time: createdTime,
          date: invDate,
          bsDate: inv.bsDate || toNepalBsDate(invDate),
          entryKind: isCN ? 'Credit Note' : 'Sales Invoice',
          referenceNumber: inv.invoiceNumber,
          particulars: isCN
            ? `IRD Credit Note — ${inv.vehicleModel || 'Sales Adjustment'}`
            : inv.jobCardNumber && inv.jobCardNumber !== 'OTC-SALES'
            ? `Workshop Service (${inv.jobCardNumber}) — ${inv.vehicleModel || 'Vehicle'}`
            : `Over-The-Counter Spares Sale`,
          customerName: inv.customerName,
          customerPan: inv.customerPan,
          vehicleReg: inv.vehicleReg,
          paymentMode: flowToday === 0 && !isCN ? 'Credit (AR)' : modeUsed,
          paymentReference: refUsed,
          taxableAmount: taxable,
          vatAmount: vat,
          grossTotal: grand,
          cashFlowToday: flowToday,
          balanceDue: isCN ? 0 : Math.max(0, Number(inv.balanceDue ?? 0)),
          irdCbmsStatus: synced ? 'Synced' : 'Pending',
          rawInvoice: inv,
        });
      } else if (paymentsOnDate.length > 0) {
        // Payment collected TODAY against an earlier day's invoice!
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
            referenceNumber: pay.referenceNumber || inv.invoiceNumber,
            particulars: `AR Recovery against ${inv.invoiceNumber} (Issued ${invDate})`,
            customerName: inv.customerName,
            customerPan: inv.customerPan,
            vehicleReg: inv.vehicleReg,
            paymentMode: pay.method || 'Cash',
            paymentReference: pay.referenceNumber || inv.invoiceNumber,
            taxableAmount: 0, // Already recognized in Sales Book on original invoice date
            vatAmount: 0,
            grossTotal: 0,
            cashFlowToday: round2(Number(pay.amount) || 0),
            balanceDue: Math.max(0, Number(inv.balanceDue ?? 0)),
            irdCbmsStatus: synced ? 'Synced' : 'Pending',
            rawInvoice: inv,
          });
        });
      }
    });

    return list;
  }, [invoices, selectedDate]);

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
        t.referenceNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        (t.vehicleReg || '').toLowerCase().includes(q) ||
        t.particulars.toLowerCase().includes(q);
      return matchesType && matchesMode && matchesSearch;
    });
  }, [dayTransactions, typeFilter, modeFilter, searchQuery]);

  // Reconciled Daily Summary Totals
  const summary = useMemo(() => {
    let grossTaxableBilled = 0;
    let netOutputVat = 0;
    let netBilledTotal = 0;
    let cashInflow = 0;
    let cashOutflow = 0;
    let digitalInflow = 0;
    let digitalOutflow = 0;
    let creditSalesUnpaid = 0;

    dayTransactions.forEach((t) => {
      grossTaxableBilled = round2(grossTaxableBilled + t.taxableAmount);
      netOutputVat = round2(netOutputVat + t.vatAmount);
      netBilledTotal = round2(netBilledTotal + t.grossTotal);

      const isCashMode = t.paymentMode.toLowerCase().includes('cash');
      if (t.cashFlowToday > 0) {
        if (isCashMode) cashInflow = round2(cashInflow + t.cashFlowToday);
        else digitalInflow = round2(digitalInflow + t.cashFlowToday);
      } else if (t.cashFlowToday < 0) {
        if (isCashMode) cashOutflow = round2(cashOutflow + Math.abs(t.cashFlowToday));
        else digitalOutflow = round2(digitalOutflow + Math.abs(t.cashFlowToday));
      }

      if (t.entryKind === 'Sales Invoice' && t.balanceDue > 0) {
        creditSalesUnpaid = round2(creditSalesUnpaid + t.balanceDue);
      }
    });

    const netCashMovement = round2(cashInflow - cashOutflow);
    const netDigitalMovement = round2(digitalInflow - digitalOutflow);
    const totalNetCollected = round2(netCashMovement + netDigitalMovement);
    const closingCashInDrawer = round2(cashOpeningFloat + netCashMovement);

    return {
      grossTaxableBilled,
      netOutputVat,
      netBilledTotal,
      cashInflow,
      cashOutflow,
      netCashMovement,
      digitalInflow,
      digitalOutflow,
      netDigitalMovement,
      totalNetCollected,
      creditSalesUnpaid,
      closingCashInDrawer,
    };
  }, [dayTransactions, cashOpeningFloat]);

  const handleExportCsv = () => {
    const headers = [
      'Date (AD)',
      'Date (BS)',
      'Time',
      'Entry Type',
      'Ref / Invoice #',
      'Customer',
      'Vehicle Reg',
      'Payment Mode',
      'Taxable (NPR)',
      '13% VAT (NPR)',
      'Billed Total (NPR)',
      'Collected / Refunded Today (NPR)',
      'CBMS Status',
    ];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.bsDate,
      t.time,
      t.entryKind,
      t.referenceNumber,
      `"${t.customerName.replace(/"/g, '""')}"`,
      t.vehicleReg || '',
      t.paymentMode,
      t.taxableAmount,
      t.vatAmount,
      t.grossTotal,
      t.cashFlowToday,
      t.irdCbmsStatus,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Daybook_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedBsDateLabel = toNepalBsDate(selectedDate, true);

  return (
    <div className="space-y-5">
      {/* Daybook Date Controller & Actions */}
      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
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

          <span className="px-2.5 py-1.5 bg-sky-50 text-[#0284C7] border border-sky-200 rounded-lg text-[11px] font-semibold">
            {selectedBsDateLabel}
          </span>

          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-medium text-[#0F172A] outline-none"
          >
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d} ({toNepalBsDate(d)} BS)
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Export CSV</span>
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
            <span>{isDayClosed ? 'Day Closed & Signed Off' : 'Close Day Shift'}</span>
          </button>
        </div>
      </div>

      {/* Daily Financial & Cashier Drawer Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Net Billed Today
            </span>
            <Receipt className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#0F172A] font-mono tabular-nums mt-1">
            {formatAccountingNPR(summary.netBilledTotal)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Taxable: {formatAccountingNPR(summary.grossTaxableBilled)} • VAT: {formatAccountingNPR(summary.netOutputVat)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Cash Drawer Net Flow
            </span>
            <Banknote className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#16A34A] font-mono tabular-nums mt-1">
            {formatAccountingNPR(summary.netCashMovement)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            In: {formatAccountingNPR(summary.cashInflow)} • Refunds: {formatAccountingNPR(summary.cashOutflow)}
          </span>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Digital &amp; Bank Receipts
            </span>
            <QrCode className="w-4 h-4 text-[#0EA5E9]" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-[#0284C7] font-mono tabular-nums mt-1">
            {formatAccountingNPR(summary.netDigitalMovement)}
          </div>
          <span className="text-[11px] text-[#64748B] block mt-0.5">
            Fonepay, NepalPay, Bank &amp; Card
          </span>
        </div>

        <div className="bg-[#0F3D5E] p-4 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider">
              Closing Cash in Drawer
            </span>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums mt-1">
            {formatAccountingNPR(summary.closingCashInDrawer)}
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[10px] text-sky-200">
            <span>Opening Float (NPR):</span>
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
            placeholder="Filter today's entries by invoice #, customer, vehicle reg, or narration..."
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

      {/* Daybook Ledger Table */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#E2E8F0]">
                <th className="p-3">Time</th>
                <th className="p-3">Type &amp; Ref #</th>
                <th className="p-3">Customer / Particulars</th>
                <th className="p-3">Mode</th>
                <th className="p-3 text-right">Taxable</th>
                <th className="p-3 text-right">13% VAT</th>
                <th className="p-3 text-right">Billed Total</th>
                <th className="p-3 text-right">Cash/Bank Flow</th>
                <th className="p-3 text-center">CBMS</th>
                <th className="p-3 text-center">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#64748B]">
                    No billing or payment receipt transactions recorded on {selectedDate} ({selectedBsDateLabel}).
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="p-3 font-mono text-[#64748B] whitespace-nowrap">{tx.time}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-[#0284C7] block">{tx.referenceNumber}</span>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          tx.entryKind === 'Credit Note'
                            ? 'bg-red-100 text-[#DC2626]'
                            : tx.entryKind === 'Prior Invoice Settlement'
                            ? 'bg-emerald-100 text-[#16A34A]'
                            : 'bg-[#F1F5F9] text-[#0F3D5E]'
                        }`}
                      >
                        {tx.entryKind}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[#0F172A]">{tx.customerName}</div>
                      <div className="text-[11px] text-[#64748B]">{tx.particulars}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]">
                        {tx.paymentMode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {tx.taxableAmount !== 0 ? formatAccountingNPR(tx.taxableAmount) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-[#0284C7] whitespace-nowrap">
                      {tx.vatAmount !== 0 ? formatAccountingNPR(tx.vatAmount) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-[#0F172A] whitespace-nowrap">
                      {tx.grossTotal !== 0 ? formatAccountingNPR(tx.grossTotal) : '—'}
                    </td>
                    <td
                      className={`p-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        tx.cashFlowToday > 0
                          ? 'text-[#16A34A]'
                          : tx.cashFlowToday < 0
                          ? 'text-[#DC2626]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {tx.cashFlowToday !== 0 ? formatAccountingNPR(tx.cashFlowToday) : 'Credit (AR)'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.irdCbmsStatus === 'Synced'
                            ? 'bg-emerald-50 text-[#16A34A]'
                            : 'bg-amber-50 text-[#F59E0B]'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{tx.irdCbmsStatus}</span>
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(tx.rawInvoice)}
                          className="p-1.5 text-[#0F3D5E] hover:bg-[#F1F5F9] rounded-lg transition"
                          title="Print Invoice"
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
                  <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                    Day Total ({filteredTransactions.length} entries):
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(filteredTransactions.reduce((s, t) => s + t.taxableAmount, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#0284C7]">
                    {formatAccountingNPR(filteredTransactions.reduce((s, t) => s + t.vatAmount, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatAccountingNPR(filteredTransactions.reduce((s, t) => s + t.grossTotal, 0))}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-[#16A34A]">
                    {formatAccountingNPR(filteredTransactions.reduce((s, t) => s + t.cashFlowToday, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

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
                    {workshopAddress} | PAN / VAT Reg: <strong className="font-mono text-[#0F172A]">{workshopPan}</strong>
                  </p>
                  <h2 className="text-sm font-bold uppercase tracking-wider mt-2 text-[#0F172A]">
                    Daily Cashier Daybook &amp; Sales Reconciliation Sheet
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

                <table className="w-full border-collapse border border-[#CBD5E1] text-[11px]">
                  <thead>
                    <tr className="bg-[#F1F5F9] text-[#0F172A] font-bold">
                      <th className="border border-[#CBD5E1] p-2">Ref #</th>
                      <th className="border border-[#CBD5E1] p-2">Type</th>
                      <th className="border border-[#CBD5E1] p-2">Customer &amp; Particulars</th>
                      <th className="border border-[#CBD5E1] p-2">Mode</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Taxable</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">13% VAT</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Billed Total</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Collected</th>
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
                          <td className="border border-[#CBD5E1] p-2 font-mono font-bold">{tx.referenceNumber}</td>
                          <td className="border border-[#CBD5E1] p-2">{tx.entryKind}</td>
                          <td className="border border-[#CBD5E1] p-2">
                            <strong>{tx.customerName}</strong> — {tx.particulars}
                          </td>
                          <td className="border border-[#CBD5E1] p-2">{tx.paymentMode}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono">{formatAccountingNPR(tx.taxableAmount)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono">{formatAccountingNPR(tx.vatAmount)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(tx.grossTotal)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(tx.cashFlowToday)}</td>
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
                      <span>Add: Cash Receipts Today:</span>
                      <span className="font-mono text-[#16A34A]">{formatAccountingNPR(summary.cashInflow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Less: Cash Refunds Today:</span>
                      <span className="font-mono text-[#DC2626]">-{formatAccountingNPR(summary.cashOutflow)}</span>
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
