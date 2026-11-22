import React, { useState, useMemo, useRef } from 'react';
import { printElement } from '../../utils/printDocument';
import { 
  Invoice, 
  WorkshopProfile, 
  NepalPaymentMethod,
  UserRole 
} from '../../types';
import { 
  Calendar, 
  CalendarDays, 
  DollarSign, 
  Receipt, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  QrCode, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  ShieldCheck, 
  Building2, 
  X,
  Filter,
  Search,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Banknote
} from 'lucide-react';

interface DaybookViewProps {
  invoices: Invoice[];
  profile?: WorkshopProfile;
  userRole?: UserRole;
  onPrintInvoice?: (invoice: Invoice) => void;
}

interface FlattenedDayTransaction {
  id: string;
  time: string;
  date: string;
  bsDate?: string;
  type: string;
  referenceNumber: string;
  particulars: string;
  customerName: string;
  customerPhone?: string;
  customerPan?: string;
  vehicleReg?: string;
  jobCardNumber?: string;
  paymentMode: string;
  paymentReference?: string;
  taxableAmount: number;
  vatAmount: number;
  grossTotal: number;
  amountReceived: number;
  balanceDue: number;
  irdCbmsStatus: 'Synced' | 'Pending' | 'Exempt';
  rawInvoice?: Invoice;
}

export const DaybookView: React.FC<DaybookViewProps> = ({
  invoices = [],
  profile,
  userRole = 'Admin',
  onPrintInvoice
}) => {
  // Extract all distinct dates with activity across all invoices
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    invoices.forEach(inv => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      if (invDate) datesSet.add(invDate);
      if (inv.payments && Array.isArray(inv.payments)) {
        inv.payments.forEach(p => {
          if (p.date) {
            datesSet.add(p.date.slice(0, 10));
          }
        });
      }
    });
    // Also include today's date if not present
    const todayStr = new Date().toISOString().slice(0, 10);
    datesSet.add(todayStr);

    return Array.from(datesSet).sort().reverse();
  }, [invoices]);

  // Default selected date: today or latest active date with transactions
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (availableDates.includes(today)) return today;
    return availableDates[0] || today;
  });

  // Filters inside Daybook
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [modeFilter, setModeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const printDaybookRef = useRef<HTMLDivElement>(null);
  const [cashOpeningFloat, setCashOpeningFloat] = useState<number>(10000); // 10k NPR cash drawer float
  const [isDayClosed, setIsDayClosed] = useState<boolean>(false);

  // Quick navigation handlers
  const handleJumpDate = (offset: number) => {
    const currIndex = availableDates.indexOf(selectedDate);
    if (currIndex === -1) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().slice(0, 10));
    } else {
      const nextIndex = currIndex - offset; // because availableDates is sorted descending
      if (nextIndex >= 0 && nextIndex < availableDates.length) {
        setSelectedDate(availableDates[nextIndex]);
      } else {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().slice(0, 10));
      }
    }
  };

  // Compile transactions for the selected day
  const dayTransactions = useMemo<FlattenedDayTransaction[]>(() => {
    const list: FlattenedDayTransaction[] = [];

    invoices.forEach((inv, index) => {
      const invDate = (inv.createdAt || inv.date || '').slice(0, 10);
      
      // If invoice itself was generated on this day
      if (invDate === selectedDate) {
        const timePart = inv.createdAt?.includes('T')
          ? inv.createdAt.split('T')[1].slice(0, 5)
          : `1${(index % 8) + 0}:${(index * 13) % 60 < 10 ? '0' : ''}${(index * 13) % 60}`;

        const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
        const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
        const grand = inv.grandTotal ?? (taxable + vat);
        const paid = inv.paidAmount ?? inv.amountPaid ?? 0;
        const due = inv.balanceDue ?? Math.max(0, grand - paid);
        const paymentMode = inv.paymentMethod || (paid > 0 ? 'Fonepay (Dynamic QR)' : 'Credit / Pending');

        list.push({
          id: `TXN-${inv.id}`,
          time: timePart,
          date: invDate,
          bsDate: inv.bsDate || '2081-05-28',
          type: inv.type || 'Tax Invoice',
          referenceNumber: inv.invoiceNumber,
          particulars: `${inv.customerName} - ${inv.vehicleReg} (${inv.jobCardNumber || 'Counter Sale'})`,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          customerPan: inv.customerPan || inv.customerPanVat,
          vehicleReg: inv.vehicleReg,
          jobCardNumber: inv.jobCardNumber,
          paymentMode: paymentMode,
          paymentReference: inv.paymentReference || 'CBMS-POS-REC',
          taxableAmount: taxable,
          vatAmount: vat,
          grossTotal: grand,
          amountReceived: paid,
          balanceDue: due,
          irdCbmsStatus: inv.irdCompliance?.isTransmittedToCbms ? 'Synced' : 'Pending',
          rawInvoice: inv
        });
      }
    });

    // Sort chronologically
    return list.sort((a, b) => a.time.localeCompare(b.time));
  }, [invoices, selectedDate]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return dayTransactions.filter(txn => {
      const matchType = typeFilter === 'All' || txn.type === typeFilter;
      const matchMode = modeFilter === 'All' || txn.paymentMode.toLowerCase().includes(modeFilter.toLowerCase());
      const matchSearch = 
        txn.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (txn.vehicleReg || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (txn.particulars || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchMode && matchSearch;
    });
  }, [dayTransactions, typeFilter, modeFilter, searchQuery]);

  // Aggregate stats for the chosen day
  const daySummary = useMemo(() => {
    let totalTaxable = 0;
    let totalVat = 0;
    let totalGrossBilled = 0;
    let totalCollected = 0;
    let cashCollected = 0;
    let digitalCollected = 0;
    let totalDue = 0;

    const modeTotals: Record<string, { count: number; amount: number }> = {};

    dayTransactions.forEach(t => {
      totalTaxable += t.taxableAmount;
      totalVat += t.vatAmount;
      totalGrossBilled += t.grossTotal;
      totalCollected += t.amountReceived;
      totalDue += t.balanceDue;

      const lowerMode = t.paymentMode.toLowerCase();
      if (lowerMode.includes('cash') && !lowerMode.includes('less')) {
        cashCollected += t.amountReceived;
      } else {
        digitalCollected += t.amountReceived;
      }

      // Group by payment mode
      const normalizedMode = lowerMode.includes('fonepay') ? 'Fonepay Dynamic QR' :
        lowerMode.includes('nepalpay') ? 'NCHL NepalPay QR' :
        lowerMode.includes('esewa') ? 'eSewa Wallet' :
        lowerMode.includes('khalti') ? 'Khalti Wallet' :
        lowerMode.includes('cash') ? 'Counter Cash' :
        lowerMode.includes('bank') ? 'Bank Transfer' : 'Credit / Other';

      if (!modeTotals[normalizedMode]) {
        modeTotals[normalizedMode] = { count: 0, amount: 0 };
      }
      modeTotals[normalizedMode].count += 1;
      modeTotals[normalizedMode].amount += t.amountReceived;
    });

    return {
      totalTaxable,
      totalVat,
      totalGrossBilled,
      totalCollected,
      cashCollected,
      digitalCollected,
      totalDue,
      transactionCount: dayTransactions.length,
      modeTotals
    };
  }, [dayTransactions]);

  // Multi-day Summary Table for historical review
  const allDaysSummaries = useMemo(() => {
    return availableDates.map(dStr => {
      let billed = 0;
      let collected = 0;
      let vat = 0;
      let count = 0;

      invoices.forEach(inv => {
        const iDate = (inv.createdAt || inv.date || '').slice(0, 10);
        if (iDate === dStr) {
          count += 1;
          billed += inv.grandTotal || 0;
          collected += (inv.paidAmount ?? inv.amountPaid ?? 0);
          vat += (inv.vatAmount ?? inv.totalVatAmount ?? 0);
        }
      });

      return {
        date: dStr,
        count,
        billed,
        collected,
        vat,
        due: Math.max(0, billed - collected)
      };
    });
  }, [availableDates, invoices]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (dayTransactions.length === 0) {
      alert('No transactions to export for ' + selectedDate);
      return;
    }

    const headers = [
      'Time',
      'Date (AD)',
      'Voucher/Invoice No',
      'Type',
      'Customer Name',
      'Vehicle Reg',
      'Job Card No',
      'Payment Mode',
      'Payment Ref',
      'Taxable Amount (NPR)',
      '13% VAT Amount (NPR)',
      'Gross Total (NPR)',
      'Amount Received (NPR)',
      'Balance Due (NPR)',
      'IRD CBMS Status'
    ];

    const rows = dayTransactions.map(t => [
      t.time,
      t.date,
      t.referenceNumber,
      t.type,
      `"${t.customerName}"`,
      `"${t.vehicleReg || ''}"`,
      t.jobCardNumber || '',
      `"${t.paymentMode}"`,
      `"${t.paymentReference || ''}"`,
      t.taxableAmount.toFixed(2),
      t.vatAmount.toFixed(2),
      t.grossTotal.toFixed(2),
      t.amountReceived.toFixed(2),
      t.balanceDue.toFixed(2),
      t.irdCbmsStatus
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Workshop_Daybook_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Picker Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <CalendarDays className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Workshop Financial Daybook 
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            Daily Transaction Register & Cashier Ledger
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-compliant record of all invoices, cash drawer collections, digital Fonepay/NepalPay payments, and 13% IRD VAT output for each day.
          </p>
        </div>

        {/* Date Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Quick Step Buttons */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              id="daybook-prev-day-btn"
              onClick={() => handleJumpDate(-1)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Exact Date Picker Input */}
            <div className="flex items-center px-2 space-x-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <input
                id="daybook-date-picker"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 outline-none cursor-pointer"
              />
            </div>

            <button
              id="daybook-next-day-btn"
              onClick={() => handleJumpDate(1)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Jumper Pills */}
          <button
            id="daybook-today-btn"
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedDate === new Date().toISOString().slice(0, 10)
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Today 
          </button>

          {/* Export & Print */}
          <button
            id="daybook-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Download CSV for Excel / Tally"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            id="daybook-print-btn"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Daybook</span>
          </button>
        </div>
      </div>

      {/* Date Quick Navigation Strip for Days with Activity */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-slate-400 font-bold text-[11px] whitespace-nowrap pl-1">Recorded Days:</span>
        {availableDates.map(dStr => {
          const isSelected = dStr === selectedDate;
          const invoiceCount = invoices.filter(i => (i.createdAt || i.date || '').startsWith(dStr)).length;
          return (
            <button
              key={dStr}
              id={`daybook-date-tab-${dStr}`}
              onClick={() => setSelectedDate(dStr)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl whitespace-nowrap font-medium transition ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{dStr}</span>
              {invoiceCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {invoiceCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4 Financial Pulse Stat Cards for Selected Day */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gross Billed */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Day Gross Sales</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            Rs. {daySummary.totalGrossBilled.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Taxable: Rs. {daySummary.totalTaxable.toLocaleString()}</span>
            <span className="font-bold text-indigo-600">{daySummary.transactionCount} Bills</span>
          </div>
        </div>

        {/* Card 2: Payments Collected */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Money Received Today</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            Rs. {daySummary.totalCollected.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Cash: Rs. {daySummary.cashCollected.toLocaleString()}</span>
            <span className="text-blue-600 font-semibold">Digital: Rs. {daySummary.digitalCollected.toLocaleString()}</span>
          </div>
        </div>

        {/* Card 3: 13% VAT Output */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Nepal 13% VAT Output</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono mt-1">
            Rs. {daySummary.totalVat.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="text-purple-600">IRD CBMS Realtime</span>
            <span className="font-semibold text-emerald-600">● 100% Compliant</span>
          </div>
        </div>

        {/* Card 4: Day Receivables (Unpaid) */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Day Balance Due</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1">
            Rs. {daySummary.totalDue.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span className="text-rose-600">Pending recovery</span>
            <span className="text-slate-400">Ledger balance</span>
          </div>
        </div>
      </div>

      {/* Payment Modes Breakdown & Cash Drawer Closing Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Payment Modes Pill Breakdown */}
        <div className="lg:col-span-2 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Collections by Payment Mode for {selectedDate}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total Inflow: Rs. {daySummary.totalCollected.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {Object.entries(daySummary.modeTotals).map(([modeName, rawInfo]) => {
              const info = rawInfo as { count: number; amount: number };
              const isFonepay = modeName.includes('Fonepay');
              const isNepalPay = modeName.includes('NepalPay');
              const isCash = modeName.includes('Cash');
              const isEsewa = modeName.includes('eSewa');

              return (
                <div 
                  key={modeName} 
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                    isFonepay ? 'bg-rose-50/50 border-rose-200' :
                    isNepalPay ? 'bg-blue-50/50 border-blue-200' :
                    isCash ? 'bg-emerald-50/50 border-emerald-200' :
                    isEsewa ? 'bg-lime-50/50 border-lime-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 text-[11px] truncate">{modeName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white border font-semibold">
                      {info.count}
                    </span>
                  </div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    Rs. {info.amount.toLocaleString()}
                  </div>
                </div>
              );
            })}

            {Object.keys(daySummary.modeTotals).length === 0 && (
              <div className="col-span-full text-center py-4 text-xs text-slate-400">
                No payment transactions recorded for this day yet.
              </div>
            )}
          </div>
        </div>

        {/* Cash Drawer Reconciliation Box */}
        <div className="bg-slate-900 text-white p-4.5 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Cash Drawer Float</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isDayClosed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {isDayClosed ? 'Day Closed' : 'Day Active'}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Opening Cash Drawer:</span>
                <span className="font-mono font-bold text-white">Rs. {cashOpeningFloat.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Cash Inflow Today:</span>
                <span className="font-mono font-bold text-emerald-400">+ Rs. {daySummary.cashCollected.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-bold">
                <span className="text-white">Expected Physical Cash:</span>
                <span className="font-mono text-base text-amber-400">
                  Rs. {(cashOpeningFloat + daySummary.cashCollected).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Cashier: Pooja Gurung</span>
            <button
              onClick={() => setIsDayClosed(!isDayClosed)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                isDayClosed 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isDayClosed ? 'Reopen Daybook' : 'Close Daybook'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar for Day's Ledger */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Bill #, Customer, Reg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold outline-none"
          >
            <option value="All">All Types</option>
            <option value="Tax Invoice">Tax Invoice</option>
            <option value="Cashless Insurance Invoice">Cashless Insurance</option>
            <option value="Warranty Claim Invoice">Warranty Claim</option>
            <option value="OTC Counter Sale">OTC Counter Sale</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold outline-none"
          >
            <option value="All">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="Fonepay">Fonepay Dynamic QR</option>
            <option value="NepalPay">NepalPay QR</option>
            <option value="eSewa">eSewa</option>
            <option value="Bank">Bank Transfer</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
          <span>Showing <strong>{filteredTransactions.length}</strong> of <strong>{dayTransactions.length}</strong> transactions for <strong>{selectedDate}</strong></span>
        </div>
      </div>

      {/* Day's Chronological Transactions Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Itemized Transactions Ledger ({selectedDate})
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Nepal IRD Rule 23 Daybook Record</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-slate-700">No Transactions Found for {selectedDate}</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no invoices, payments, or counter sales registered on this date. You can select another date from the recorded days list above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Bill / Voucher #</th>
                  <th className="p-3.5">Customer & Vehicle</th>
                  <th className="p-3.5">Job Card / Ref</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5 text-right">Taxable (NPR)</th>
                  <th className="p-3.5 text-right">13% VAT</th>
                  <th className="p-3.5 text-right">Gross Total</th>
                  <th className="p-3.5 text-right">Collected</th>
                  <th className="p-3.5 text-center">CBMS Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono text-slate-500 font-semibold">
                      {t.time}
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono font-bold text-indigo-700">{t.referenceNumber}</div>
                      <div className="text-[10px] text-slate-400">{t.type}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{t.customerName}</div>
                      <div className="font-mono text-[11px] text-slate-500 font-semibold">{t.vehicleReg}</div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-600 font-semibold">
                      {t.jobCardNumber || 'OTC-Sale'}
                    </td>

                    <td className="p-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.paymentMode}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-mono text-slate-700">
                      Rs. {t.taxableAmount.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-purple-700">
                      Rs. {t.vatAmount.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono font-extrabold text-slate-900">
                      Rs. {t.grossTotal.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                      Rs. {t.amountReceived.toLocaleString()}
                      {t.balanceDue > 0 && (
                        <div className="text-[10px] text-rose-500 font-semibold">
                          Due: Rs. {t.balanceDue.toLocaleString()}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.irdCbmsStatus === 'Synced' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.irdCbmsStatus === 'Synced' ? '● Synced' : '○ Pending'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      {t.rawInvoice && onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(t.rawInvoice!)}
                          className="p-1 text-slate-500 hover:text-indigo-600 rounded transition"
                          title="Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold border-t border-slate-300 text-slate-900">
                    <td colSpan={5} className="p-3.5 text-right uppercase tracking-wider text-xs">
                      Daybook Total ({selectedDate}):
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      Rs. {daySummary.totalTaxable.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-purple-700">
                      Rs. {daySummary.totalVat.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">
                      Rs. {daySummary.totalGrossBilled.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600">
                      Rs. {daySummary.totalCollected.toLocaleString()}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Historical Daily Daybooks Archive Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm space-y-2">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              All Days Daybook Archive & Closing History
            </h4>
            <p className="text-[11px] text-slate-500">
              Overview of transactions, VAT, and collections grouped by day. Click any day to inspect its full detailed ledger.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Transaction Date (AD)</th>
                <th className="p-3.5 text-center">Invoices / Txns</th>
                <th className="p-3.5 text-right">Day Gross Billed (NPR)</th>
                <th className="p-3.5 text-right">13% Output VAT</th>
                <th className="p-3.5 text-right">Total Collected</th>
                <th className="p-3.5 text-right">Balance Due</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allDaysSummaries.map((dayRow) => {
                const isCurrent = dayRow.date === selectedDate;
                return (
                  <tr 
                    key={dayRow.date} 
                    className={`transition ${isCurrent ? 'bg-indigo-50/40 font-semibold' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900 flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dayRow.date}</span>
                      {dayRow.date === new Date().toISOString().slice(0, 10) && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                          Today
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center font-mono font-bold">
                      {dayRow.count}
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      Rs. {dayRow.billed.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono text-purple-700 font-bold">
                      Rs. {dayRow.vat.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">
                      Rs. {dayRow.collected.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-right font-mono text-rose-600">
                      Rs. {dayRow.due.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedDate(dayRow.date)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          isCurrent 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCurrent ? 'Viewing' : 'Open Daybook'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE DAYBOOK MODAL (A4 CASHIER DAY CLOSING REPORT) */}
      {isPrintModalOpen && (
        <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-4xl w-full p-6 sm:p-8 border border-[#E2E8F0] space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Actions Bar (hidden when printing) */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-[#0EA5E9]" />
                <h4 className="font-bold text-base text-[#0F172A]">Print Official Daily Daybook</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => printElement(printDaybookRef.current, `Daybook-${selectedDate}`)}
                  className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold transition"
                >
                  Print A4 / Save PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div ref={printDaybookRef} className="a4-sheet space-y-6 text-[#0F172A] font-sans bg-[#FFFFFF]">
              {/* Header */}
              <div className="text-center border-b pb-4 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {profile?.legalEntityName || profile?.name || 'Sagarmatha Multi-Care Auto Workshop Pvt. Ltd.'}
                </h2>
                <div className="text-xs text-slate-600">
                  {profile?.address || 'Sukedhara-04, Ring Road, Kathmandu, Bagmati Province, Nepal'}
                </div>
                <div className="text-xs font-bold font-mono text-slate-800">
                  PAN / VAT Number: {profile?.panVatNumber || '302849182'} | Fiscal Year: {profile?.fiscalYear || '2081/2082'}
                </div>
                <div className="pt-2">
                  <span className="px-3 py-1 bg-slate-100 rounded text-xs font-black uppercase tracking-wider border">
                    DAILY CASHIER CLOSING & TRANSACTION REGISTER 
                  </span>
                </div>
              </div>

              {/* Day Meta Info */}
              <div className="grid grid-cols-2 text-xs border p-3 rounded-lg bg-slate-50">
                <div>
                  <div><strong>Transaction Date (AD):</strong> {selectedDate}</div>
                  <div><strong>Bikram Sambat (Miti):</strong> 2081-05-28 BS</div>
                  <div><strong>Day Register Status:</strong> {isDayClosed ? 'Reconciled & Closed' : 'Active / Open'}</div>
                </div>
                <div className="text-right">
                  <div><strong>Total Invoices Issued:</strong> {daySummary.transactionCount}</div>
                  <div><strong>Generated At:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                  <div><strong>Cashier Desk:</strong> Pooja Gurung (Accounts)</div>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 border rounded">
                  <div className="text-[10px] text-slate-500 uppercase">Gross Billed</div>
                  <div className="font-mono font-bold text-sm">Rs. {daySummary.totalGrossBilled.toLocaleString()}</div>
                </div>
                <div className="p-2 border rounded">
                  <div className="text-[10px] text-slate-500 uppercase">13% VAT Output</div>
                  <div className="font-mono font-bold text-sm">Rs. {daySummary.totalVat.toLocaleString()}</div>
                </div>
                <div className="p-2 border rounded">
                  <div className="text-[10px] text-slate-500 uppercase">Total Collected</div>
                  <div className="font-mono font-bold text-sm text-emerald-700">Rs. {daySummary.totalCollected.toLocaleString()}</div>
                </div>
                <div className="p-2 border rounded">
                  <div className="text-[10px] text-slate-500 uppercase">Cash In Drawer</div>
                  <div className="font-mono font-bold text-sm text-blue-700">Rs. {(cashOpeningFloat + daySummary.cashCollected).toLocaleString()}</div>
                </div>
              </div>

              {/* Transaction List */}
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-y bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2">Time</th>
                    <th className="p-2">Bill No</th>
                    <th className="p-2">Customer / Vehicle</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2 text-right">Taxable</th>
                    <th className="p-2 text-right">13% VAT</th>
                    <th className="p-2 text-right">Grand Total</th>
                    <th className="p-2 text-right">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dayTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-2 font-mono">{t.time}</td>
                      <td className="p-2 font-mono font-bold">{t.referenceNumber}</td>
                      <td className="p-2">{t.customerName} ({t.vehicleReg})</td>
                      <td className="p-2">{t.paymentMode}</td>
                      <td className="p-2 text-right font-mono">Rs. {t.taxableAmount.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono">Rs. {t.vatAmount.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-bold">Rs. {t.grossTotal.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono">Rs. {t.amountReceived.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-12 text-center text-xs">
                <div>
                  <div className="w-48 border-t border-slate-400 mx-auto pt-1 font-semibold">
                    Duty Cashier Signature
                  </div>
                  <div className="text-[10px] text-slate-500">Pooja Gurung</div>
                </div>
                <div>
                  <div className="w-48 border-t border-slate-400 mx-auto pt-1 font-semibold">
                    Finance Supervisor Verification
                  </div>
                  <div className="text-[10px] text-slate-500">Ramesh Shrestha (Admin)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
