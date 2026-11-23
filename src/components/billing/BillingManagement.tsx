import React, { useState, useMemo } from 'react';
import {
  CashierVoucher,
  Invoice,
  JobCard,
  Customer,
  SparePart,
  NepalPaymentMethod,
  UserRole,
  GatePass,
  WorkshopProfile,
} from '../../types';
import {
  FileText,
  Search,
  Printer,
  Send,
  CheckCircle2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Shield,
  Lock,
  X,
  CalendarDays,
  RotateCcw,
  AlertCircle,
  Building2,
  Plus,
} from 'lucide-react';
import { PrintInvoiceModal } from '../common/PrintInvoiceModal';
import { DaybookView } from './DaybookView';
import { GenerateTaxInvoiceModal, TaxInvoiceGenerationOptions } from './GenerateTaxInvoiceModal';
import {
  formatAccountingNPR,
  isCreditNoteInvoice,
  isInvoiceSyncedToCbms,
  round2,
  toNepalBsDate,
} from '../../utils/accountingEngine';

interface BillingManagementProps {
  invoices: Invoice[];
  jobCards: JobCard[];
  customers: Customer[];
  availableParts: SparePart[];
  cashierVouchers?: CashierVoucher[];
  userRole: UserRole;
  gatePasses?: GatePass[];
  profile?: WorkshopProfile;
  currentUserName?: string;
  onCreateInvoice: (newInv: Invoice) => void;
  onConvertJobCardToInvoice?: (jc: JobCard, options?: TaxInvoiceGenerationOptions) => void;
  onUpdateInvoice: (updatedInv: Invoice) => void;
  onRecordPayment: (invoiceId: string, amount: number, method: NepalPaymentMethod, ref: string) => void;
  onCreateCreditNote?: (
    originalInv: Invoice,
    refundTaxable: number,
    reason: string,
    refundMethod: NepalPaymentMethod
  ) => void;
  onAddCashierVoucher?: (voucher: CashierVoucher) => void;
  onViewGatePass?: (gatePass: GatePass) => void;
}

export const BillingManagement: React.FC<BillingManagementProps> = ({
  invoices = [],
  jobCards,
  customers,
  availableParts,
  cashierVouchers = [],
  userRole,
  gatePasses = [],
  profile,
  currentUserName,
  onConvertJobCardToInvoice,
  onUpdateInvoice,
  onRecordPayment,
  onCreateCreditNote,
  onAddCashierVoucher,
  onViewGatePass,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partially Paid' | 'Unpaid' | 'Credit Note'>('All');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [billingSubTab, setBillingSubTab] = useState<'invoices' | 'daybook'>('invoices');

  // Generate Tax Invoice from Job Card (supports Bill in Company Name)
  const [isJobCardPickerOpen, setIsJobCardPickerOpen] = useState(false);
  const [jobCardToBill, setJobCardToBill] = useState<JobCard | null>(null);

  // Dynamic QR Payment Modal State
  const [qrModalInvoice, setQrModalInvoice] = useState<Invoice | null>(null);
  const [qrGateway, setQrGateway] = useState<'Fonepay' | 'NepalPay' | 'eSewa' | 'Khalti'>('Fonepay');
  const [qrPaymentSimulated, setQrPaymentSimulated] = useState(false);

  // Manual Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<NepalPaymentMethod>('Fonepay');
  const [payRef, setPayRef] = useState('');

  // IRD Credit Note Modal (VAT Rule 20)
  const [creditNoteSource, setCreditNoteSource] = useState<Invoice | null>(null);
  const [cnTaxableAmount, setCnTaxableAmount] = useState(0);
  const [cnReason, setCnReason] = useState('Billing rate revision / customer part return');
  const [cnRefundMethod, setCnRefundMethod] = useState<NepalPaymentMethod>('Cash');

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  const unbilledJobCards = useMemo(() => {
    return (jobCards || []).filter((jc) => {
      const alreadyBilled = invoices.some(
        (inv) =>
          !isCreditNoteInvoice(inv) &&
          ((inv.jobCardId && inv.jobCardId === jc.id) ||
            (inv.jobCardNumber && inv.jobCardNumber === jc.jobCardNumber) ||
            (jc.invoiceId && inv.id === jc.invoiceId))
      );
      return !alreadyBilled;
    });
  }, [jobCards, invoices]);

  const workshopName = profile?.name || 'Auto Workshop Pvt. Ltd.';
  const workshopPan = profile?.panVatNumber || '302849182';

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      const isCN = isCreditNoteInvoice(inv);
      const matchesSearch =
        !q ||
        (inv.invoiceNumber || '').toLowerCase().includes(q) ||
        (inv.customerName || '').toLowerCase().includes(q) ||
        (inv.vehicleReg || '').toLowerCase().includes(q) ||
        (inv.jobCardNumber || '').toLowerCase().includes(q) ||
        (inv.customerPan || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Credit Note' ? isCN : !isCN && inv.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Chartered Accountant Reconciled KPIs (Net of Credit Notes)
  const metrics = useMemo(() => {
    let grossTaxable = 0;
    let cnTaxable = 0;
    let netOutputVat = 0;
    let netGrandTotal = 0;
    let netCollected = 0;
    let accountsReceivable = 0;
    let syncedCount = 0;

    invoices.forEach((inv) => {
      const isCN = isCreditNoteInvoice(inv);
      const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
      const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
      const grand = Number(inv.grandTotal ?? round2(taxable + vat));
      const paid = Number(inv.paidAmount ?? inv.amountPaid ?? 0);
      const due = isCN ? 0 : Math.max(0, Number(inv.balanceDue ?? round2(grand - paid)));

      if (isCN) {
        cnTaxable = round2(cnTaxable + Math.abs(taxable));
      } else {
        grossTaxable = round2(grossTaxable + taxable);
      }
      netOutputVat = round2(netOutputVat + vat);
      netGrandTotal = round2(netGrandTotal + grand);
      netCollected = round2(netCollected + paid);
      accountsReceivable = round2(accountsReceivable + due);
      if (isInvoiceSyncedToCbms(inv)) syncedCount += 1;
    });

    const netTaxable = round2(grossTaxable - cnTaxable);
    return {
      grossTaxable,
      cnTaxable,
      netTaxable,
      netOutputVat,
      netGrandTotal,
      netCollected,
      accountsReceivable,
      syncedCount,
    };
  }, [invoices]);

  const handleTriggerDynamicQr = (inv: Invoice) => {
    if (isCreditNoteInvoice(inv)) return;
    setQrModalInvoice(inv);
    setQrGateway('Fonepay');
    setQrPaymentSimulated(false);
  };

  const handleConfirmQrPayment = () => {
    if (!qrModalInvoice) return;
    const txRef = `${qrGateway.toUpperCase()}-TXN-${Date.now().toString().slice(-6)}`;
    onRecordPayment(qrModalInvoice.id, qrModalInvoice.balanceDue, qrGateway as NepalPaymentMethod, txRef);
    setQrPaymentSimulated(true);
    notify(`Payment of ${formatAccountingNPR(qrModalInvoice.balanceDue)} settled via ${qrGateway} QR & posted to GL.`);
    setTimeout(() => {
      setQrModalInvoice(null);
      setQrPaymentSimulated(false);
    }, 1000);
  };

  const handleSendWhatsApp = (inv: Invoice) => {
    const cleanPhone = (inv.customerPhone || '').replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Namaste ${inv.customerName},\nYour IRD Tax Invoice ${inv.invoiceNumber} from ${workshopName} (PAN: ${workshopPan}) for vehicle ${inv.vehicleReg} is ready.\n\nTaxable: ${formatAccountingNPR(inv.taxableAmount)}\nVAT (13%): ${formatAccountingNPR(inv.vatAmount)}\nGrand Total: ${formatAccountingNPR(inv.grandTotal)}\nBalance Due: ${formatAccountingNPR(inv.balanceDue)}\n\nThank you for choosing ${workshopName}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleLockAndSyncIrd = (inv: Invoice) => {
    const syncedInv: Invoice = {
      ...inv,
      isLocked: true,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        cbmsAckNumber: `CBMS-NPL-${Math.floor(100000 + Math.random() * 900000)}`,
        fiscalYear: inv.fiscalYear || profile?.fiscalYear || '2081/82',
      },
      irdCompliance: {
        isTransmittedToCbms: true,
        cbmsSyncTimestamp: new Date().toISOString(),
        irdAcknowledgementCode: `CBMS-NPL-${Math.floor(100000 + Math.random() * 900000)}`,
        fiscalYearTag: inv.fiscalYear || profile?.fiscalYear || '2081/82',
        sellerPan: workshopPan,
      },
    };
    onUpdateInvoice(syncedInv);
    notify(`Invoice ${inv.invoiceNumber} transmitted & locked with Nepal IRD CBMS.`);
  };

  const handleSubmitCreditNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteSource || !onCreateCreditNote) return;
    const maxTaxable = Math.abs(creditNoteSource.taxableAmount ?? creditNoteSource.subTotal ?? 0);
    const amount = round2(Math.min(Math.max(0, cnTaxableAmount), maxTaxable));
    if (amount <= 0) return;
    onCreateCreditNote(creditNoteSource, amount, cnReason.trim() || 'Sales Return / Tax Adjustment', cnRefundMethod);
    notify(
      `IRD Credit Note issued for ${creditNoteSource.invoiceNumber} (Taxable ${formatAccountingNPR(amount)} + 13% VAT reversed in GL).`
    );
    setCreditNoteSource(null);
  };

  const paymentDue = paymentInvoice ? round2(paymentInvoice.balanceDue ?? 0) : 0;

  return (
    <div className="space-y-5">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F3D5E] text-white px-4 py-3 rounded-lg shadow-lg border border-[#0EA5E9] flex items-center space-x-2.5 text-xs font-medium max-w-md">
          <CheckCircle2 className="w-4 h-4 text-[#0EA5E9] flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Sub-navigation Switcher: Tax Invoices vs Daily Daybook */}
      <div className="bg-[#FFFFFF] p-2 rounded-xl border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <button
            onClick={() => setBillingSubTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              billingSubTab === 'invoices'
                ? 'bg-[#0EA5E9] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>IRD Tax Invoices &amp; Credit Notes</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                billingSubTab === 'invoices' ? 'bg-[#0284C7] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setBillingSubTab('daybook')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition whitespace-nowrap ${
              billingSubTab === 'daybook'
                ? 'bg-[#0EA5E9] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Cashier Daybook &amp; Reconciliation</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-[11px] text-[#0F172A] self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
          <span className="font-semibold">
            IRD CBMS: {metrics.syncedCount}/{invoices.length} Synced
          </span>
          <span className="text-[#E2E8F0]">|</span>
          <span className="font-mono text-[#64748B]">PAN: {workshopPan}</span>
        </div>
      </div>

      {/* Render Daybook View when selected */}
      {billingSubTab === 'daybook' ? (
        <DaybookView
          invoices={invoices}
          cashierVouchers={cashierVouchers}
          profile={profile}
          userRole={userRole}
          currentUserName={currentUserName}
          onAddCashierVoucher={(v) => {
            if (onAddCashierVoucher) {
              onAddCashierVoucher(v);
              notify(
                `${v.transactionType} Voucher ${v.voucherNumber} (${formatAccountingNPR(v.amount)}) saved & posted to GL.`
              );
            }
          }}
          onPrintInvoice={(inv) => setSelectedInvoiceForPrint(inv)}
        />
      ) : (
        <>
          {/* Chartered Accountant Financial Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Net Taxable Turnover
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#0F172A] font-mono tabular-nums mt-1 truncate">
                {formatAccountingNPR(metrics.netTaxable)}
              </div>
              <span className="text-[11px] text-[#64748B] block mt-0.5 truncate">
                {metrics.cnTaxable > 0
                  ? `After ${formatAccountingNPR(metrics.cnTaxable)} Credit Notes`
                  : `Gross Billed: ${formatAccountingNPR(metrics.netGrandTotal)}`}
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Net Output VAT (13%)
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#0284C7] font-mono tabular-nums mt-1 truncate">
                {formatAccountingNPR(metrics.netOutputVat)}
              </div>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                Posted to GL 2020 (Schedule 13)
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Net Receipts Collected
              </span>
              <div className="text-lg sm:text-xl font-bold text-[#16A34A] font-mono tabular-nums mt-1 truncate">
                {formatAccountingNPR(metrics.netCollected)}
              </div>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                Cash, Fonepay, NepalPay &amp; Bank
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E2E8F0]">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                Accounts Receivable (Due)
              </span>
              <div
                className={`text-lg sm:text-xl font-bold font-mono tabular-nums mt-1 truncate ${
                  metrics.accountsReceivable > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'
                }`}
              >
                {formatAccountingNPR(metrics.accountsReceivable)}
              </div>
              <span className="text-[11px] text-[#64748B] block mt-0.5">
                GL 1100 Trade Debtors Balance
              </span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FFFFFF] p-3.5 rounded-xl border border-[#E2E8F0]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice #, Credit Note, Customer, PAN, Vehicle Reg..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] placeholder:text-[#64748B] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-[#FFFFFF]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Paid', 'Partially Paid', 'Unpaid', 'Credit Note'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    statusFilter === status
                      ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                      : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                  }`}
                >
                  {status}
                </button>
              ))}

              {onConvertJobCardToInvoice && (
                <button
                  type="button"
                  onClick={() => setIsJobCardPickerOpen(true)}
                  className="px-3.5 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Tax Invoice</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Card Layout (< lg) */}
          <div className="block lg:hidden space-y-3">
            {filteredInvoices.length === 0 ? (
              <div className="bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B]">
                No invoices or credit notes match your filter criteria.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isCN = isCreditNoteInvoice(inv);
                const synced = isInvoiceSyncedToCbms(inv);
                const dateStr = (inv.date || inv.createdAt || '').slice(0, 10);
                const matchedGatePass = gatePasses.find(
                  (gp) => gp.invoiceNumber === inv.invoiceNumber || gp.invoiceId === inv.id
                );

                return (
                  <div
                    key={inv.id}
                    className={`bg-[#FFFFFF] rounded-xl border p-4 space-y-3 ${
                      isCN ? 'border-red-200 bg-red-50/20' : 'border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-mono font-bold text-xs ${isCN ? 'text-[#DC2626]' : 'text-[#0284C7]'}`}>
                            {inv.invoiceNumber}
                          </span>
                          {inv.isLocked && <Lock className="w-3 h-3 text-[#64748B]" />}
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">
                          {dateStr} ({inv.bsDate || toNepalBsDate(dateStr)} BS)
                        </div>
                      </div>

                      {isCN ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#DC2626] border border-red-200">
                          Credit Note
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-50 text-[#F59E0B] border-amber-200'
                              : 'bg-red-50 text-[#DC2626] border-red-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      )}
                    </div>

                    <div className="text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-[#0F172A]">{inv.companyName || inv.customerName}</span>
                        {(inv.billedToType === 'Company' || inv.companyName) && (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-sky-50 text-[#0F3D5E] border border-sky-200 text-[9px] font-bold uppercase">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>Company</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        {inv.vehicleReg} • {inv.jobCardNumber}
                        {(inv.customerPan || inv.customerPanVat) ? ` • VAT/PAN: ${inv.customerPan || inv.customerPanVat}` : ''}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E2E8F0] text-[11px]">
                      <div>
                        <span className="text-[#64748B] block">Taxable</span>
                        <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                          {formatAccountingNPR(inv.taxableAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] block">13% VAT</span>
                        <span className="font-mono font-semibold text-[#0284C7] tabular-nums">
                          {formatAccountingNPR(inv.vatAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#64748B] block">Grand Total</span>
                        <span className={`font-mono font-bold tabular-nums ${isCN ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
                          {formatAccountingNPR(inv.grandTotal)}
                        </span>
                      </div>
                    </div>

                    {!isCN && (inv.balanceDue ?? 0) > 0 && (
                      <div className="flex items-center justify-between text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                        <span className="text-[#DC2626] font-medium">Balance Due</span>
                        <span className="font-mono font-bold text-[#DC2626] tabular-nums">
                          {formatAccountingNPR(inv.balanceDue)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E2E8F0]">
                      <button
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="px-2.5 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print A4</span>
                      </button>

                      {!isCN && inv.status !== 'Paid' && (
                        <>
                          <button
                            onClick={() => handleTriggerDynamicQr(inv)}
                            className="px-2.5 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pay QR</span>
                          </button>
                          <button
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPayAmount(round2(inv.balanceDue ?? 0));
                              setPayMethod('Cash');
                              setPayRef('');
                            }}
                            className="px-2.5 py-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Record Pay</span>
                          </button>
                        </>
                      )}

                      {!isCN && onCreateCreditNote && (
                        <button
                          onClick={() => {
                            setCreditNoteSource(inv);
                            setCnTaxableAmount(Math.abs(inv.taxableAmount ?? 0));
                            setCnReason('Sales return / billing adjustment');
                          }}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#DC2626] border border-red-200 rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Credit Note</span>
                        </button>
                      )}

                      {!synced && (
                        <button
                          onClick={() => handleLockAndSyncIrd(inv)}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-200 rounded-lg text-[11px] font-semibold"
                        >
                          Sync CBMS
                        </button>
                      )}

                      {matchedGatePass && onViewGatePass && (
                        <button
                          onClick={() => onViewGatePass(matchedGatePass)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#16A34A] border border-emerald-200 rounded-lg text-[11px] font-semibold flex items-center space-x-1"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Gate Pass</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Invoices & Credit Notes Table (>= lg) */}
          <div className="hidden lg:block bg-[#FFFFFF] rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] font-semibold tracking-wider border-b border-[#E2E8F0]">
                    <th className="p-3.5">Document # / Date</th>
                    <th className="p-3.5">Customer &amp; Vehicle</th>
                    <th className="p-3.5 text-right">Taxable (NPR)</th>
                    <th className="p-3.5 text-right">13% VAT</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5 text-right">Paid / Balance</th>
                    <th className="p-3.5 text-center">Status &amp; CBMS</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#64748B]">
                        No invoices or credit notes match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isCN = isCreditNoteInvoice(inv);
                      const synced = isInvoiceSyncedToCbms(inv);
                      const dateStr = (inv.date || inv.createdAt || '').slice(0, 10);
                      const matchedGatePass = gatePasses.find(
                        (gp) => gp.invoiceNumber === inv.invoiceNumber || gp.invoiceId === inv.id
                      );

                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-[#F8FAFC] transition ${isCN ? 'bg-red-50/30' : ''}`}
                        >
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span className={`font-mono font-bold ${isCN ? 'text-[#DC2626]' : 'text-[#0284C7]'}`}>
                                {inv.invoiceNumber}
                              </span>
                              {inv.isLocked && <Lock className="w-3 h-3 text-[#64748B]" title="Locked per IRD Rule 20" />}
                            </div>
                            <div className="text-[10px] text-[#64748B] mt-0.5 font-mono">
                              {dateStr} • {inv.bsDate || toNepalBsDate(dateStr)} BS
                            </div>
                            <span
                              className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                isCN
                                  ? 'bg-red-100 text-[#DC2626]'
                                  : 'bg-[#F1F5F9] text-[#64748B]'
                              }`}
                            >
                              {inv.type || 'Tax Invoice'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-semibold text-[#0F172A]">{inv.companyName || inv.customerName}</span>
                              {(inv.billedToType === 'Company' || inv.companyName) && (
                                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-sky-50 text-[#0F3D5E] border border-sky-200 text-[9px] font-bold uppercase">
                                  <Building2 className="w-2.5 h-2.5" />
                                  <span>Company</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono">
                              {inv.vehicleReg} • {inv.jobCardNumber}
                            </div>
                            {(inv.customerPan || inv.customerPanVat) && (
                              <div className="text-[10px] text-[#0284C7] font-mono">
                                VAT/PAN: {inv.customerPan || inv.customerPanVat}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums text-[#0F172A] whitespace-nowrap">
                            {formatAccountingNPR(inv.taxableAmount)}
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums text-[#0284C7] font-semibold whitespace-nowrap">
                            {formatAccountingNPR(inv.vatAmount)}
                          </td>

                          <td className={`p-3.5 text-right font-mono tabular-nums font-bold whitespace-nowrap ${isCN ? 'text-[#DC2626]' : 'text-[#0F172A]'}`}>
                            {formatAccountingNPR(inv.grandTotal)}
                          </td>

                          <td className="p-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                            {isCN ? (
                              <span className="text-[11px] text-[#DC2626] font-semibold">Tax Reversed</span>
                            ) : (
                              <>
                                <div className="text-[#16A34A] font-semibold">
                                  Paid: {formatAccountingNPR(inv.paidAmount ?? inv.amountPaid ?? 0)}
                                </div>
                                {(inv.balanceDue ?? 0) > 0 && (
                                  <div className="text-[#DC2626] font-bold text-[11px]">
                                    Due: {formatAccountingNPR(inv.balanceDue)}
                                  </div>
                                )}
                              </>
                            )}
                          </td>

                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center space-y-1">
                              {isCN ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-[#DC2626] border border-red-200">
                                  Credit Note
                                </span>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                                      : inv.status === 'Partially Paid'
                                      ? 'bg-amber-50 text-[#F59E0B] border-amber-200'
                                      : 'bg-red-50 text-[#DC2626] border-red-200'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              )}

                              {synced ? (
                                <span className="text-[10px] text-[#16A34A] font-semibold flex items-center space-x-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>CBMS Verified</span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleLockAndSyncIrd(inv)}
                                  className="text-[10px] text-[#0284C7] hover:underline font-semibold"
                                >
                                  Sync to IRD
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="p-1.5 text-[#0F3D5E] hover:bg-[#F1F5F9] rounded-lg border border-transparent hover:border-[#E2E8F0] transition"
                                title="Print Official A4 IRD Tax Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {!isCN && inv.status !== 'Paid' && (
                                <>
                                  <button
                                    onClick={() => handleTriggerDynamicQr(inv)}
                                    className="px-2 py-1 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition"
                                    title="Dynamic Fonepay / NepalPay QR"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>QR</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setPaymentInvoice(inv);
                                      setPayAmount(round2(inv.balanceDue ?? 0));
                                      setPayMethod('Cash');
                                      setPayRef('');
                                    }}
                                    className="p-1.5 text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] transition"
                                    title="Record Cash / Bank / Cheque Payment"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {!isCN && onCreateCreditNote && (
                                <button
                                  onClick={() => {
                                    setCreditNoteSource(inv);
                                    setCnTaxableAmount(Math.abs(inv.taxableAmount ?? 0));
                                    setCnReason('Sales return / billing adjustment');
                                  }}
                                  className="p-1.5 text-[#DC2626] hover:bg-red-50 rounded-lg transition"
                                  title="Issue IRD Credit Note (VAT Rule 20)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {matchedGatePass && onViewGatePass && (
                                <button
                                  onClick={() => onViewGatePass(matchedGatePass)}
                                  className="p-1.5 text-[#16A34A] hover:bg-emerald-50 rounded-lg transition"
                                  title={`Print Gate Pass ${matchedGatePass.passNumber}`}
                                >
                                  <Shield className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleSendWhatsApp(inv)}
                                className="p-1.5 text-[#0284C7] hover:bg-sky-50 rounded-lg transition"
                                title="Share Invoice via WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
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
          </div>
        </>
      )}

      {/* MODAL 1: DYNAMIC NEPAL PAYMENT QR */}
      {qrModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-[#E2E8F0]">
            <div className="p-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <QrCode className="w-4 h-4 text-[#0EA5E9]" />
                <h4 className="font-bold text-sm">Dynamic QR Settlement</h4>
              </div>
              <button onClick={() => setQrModalInvoice(null)} className="text-sky-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-[#64748B] block">Invoice #</span>
                  <span className="font-mono font-bold text-[#0F172A]">{qrModalInvoice.invoiceNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#64748B] block">Balance Due</span>
                  <span className="text-base font-bold text-[#0F3D5E] font-mono tabular-nums">
                    {formatAccountingNPR(qrModalInvoice.balanceDue)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#64748B] uppercase block mb-1.5">
                  Select Settlement Network
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Fonepay', 'NepalPay', 'eSewa', 'Khalti'] as const).map((gw) => (
                    <button
                      key={gw}
                      type="button"
                      onClick={() => setQrGateway(gw)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition ${
                        qrGateway === gw
                          ? 'bg-[#0EA5E9] border-[#0EA5E9] text-white'
                          : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {gw}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-5 bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-xl space-y-2.5">
                {qrPaymentSimulated ? (
                  <div className="text-center space-y-2 py-4">
                    <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto" />
                    <p className="text-sm font-bold text-[#0F172A]">Settlement Confirmed</p>
                    <p className="text-xs text-[#64748B]">Receipt posted to GL &amp; Cashier Daybook</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-[#FFFFFF] rounded-xl border border-[#E2E8F0]">
                      <QrCode className="w-28 h-28 text-[#0F172A]" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#0F172A]">{workshopName}</p>
                      <p className="text-[10px] text-[#64748B] font-mono">
                        {qrGateway} Merchant • PAN: {workshopPan}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {!qrPaymentSimulated && (
                <div className="flex justify-end space-x-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    onClick={() => setQrModalInvoice(null)}
                    className="px-4 py-2 border border-[#E2E8F0] text-[#0F172A] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmQrPayment}
                    className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold"
                  >
                    Confirm Payment Received
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MANUAL PAYMENT RECEIPT */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-[#E2E8F0]">
            <div className="p-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Record Customer Payment Receipt</h4>
                <p className="text-[11px] text-sky-200 font-mono">
                  {paymentInvoice.invoiceNumber} • {paymentInvoice.customerName}
                </p>
              </div>
              <button onClick={() => setPaymentInvoice(null)} className="text-sky-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const applied = round2(Math.min(Math.max(0, payAmount), paymentDue));
                if (applied <= 0) return;
                onRecordPayment(paymentInvoice.id, applied, payMethod, payRef.trim() || `${payMethod}-RCPT`);
                notify(`Receipt of ${formatAccountingNPR(applied)} via ${payMethod} recorded & posted to GL.`);
                setPaymentInvoice(null);
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div className="bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0] flex justify-between items-center">
                <span className="text-[#64748B] font-medium">Outstanding Balance Due:</span>
                <span className="font-mono font-bold text-[#DC2626] text-sm tabular-nums">
                  {formatAccountingNPR(paymentDue)}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Receipt Amount (NPR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={paymentDue}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Math.min(paymentDue, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full font-mono font-bold text-sm border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
                <p className="text-[10px] text-[#64748B] mt-1">
                  Cannot exceed balance due ({formatAccountingNPR(paymentDue)}). Automatically posts Dr Cash/Bank, Cr AR (1100).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Payment Mode (GL Settlement Account)</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as NepalPaymentMethod)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF] font-medium"
                >
                  <option value="Cash">Cash (GL 1010 - Cashier Drawer)</option>
                  <option value="Fonepay">Fonepay QR (GL 1030 - Fonepay Clearing)</option>
                  <option value="NepalPay">NepalPay / connectIPS (GL 1040 - NCHL Clearing)</option>
                  <option value="eSewa">eSewa Wallet (GL 1040 - Digital Clearing)</option>
                  <option value="Khalti">Khalti Wallet (GL 1040 - Digital Clearing)</option>
                  <option value="Bank Transfer">Bank Transfer / Cheque (GL 1020 - Nabil Bank)</option>
                  <option value="Card">Debit / Credit Card (GL 1020 - Bank POS)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Transaction / Cheque / Receipt Reference</label>
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. FP-998120, CHQ-4012, CASH-RCPT"
                  className="w-full font-mono border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-semibold"
                >
                  Post Receipt to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ISSUE IRD CREDIT NOTE (NEPAL VAT RULE 20) */}
      {creditNoteSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-[#E2E8F0]">
            <div className="p-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-[#0EA5E9]" />
                <div>
                  <h4 className="font-bold text-sm">Issue IRD Credit Note (VAT Rule 20)</h4>
                  <p className="text-[11px] text-sky-200 font-mono">
                    Ref Invoice: {creditNoteSource.invoiceNumber}
                  </p>
                </div>
              </div>
              <button onClick={() => setCreditNoteSource(null)} className="text-sky-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreditNote} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-[#92400E] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <span>
                  Per Nepal IRD CBMS Guidelines, issued Tax Invoices cannot be edited or deleted. A Credit Note reverses Output VAT (13%) and posts an offsetting Double-Entry Voucher automatically.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Credit Note Taxable Value (Excl. 13% VAT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={Math.abs(creditNoteSource.taxableAmount ?? creditNoteSource.subTotal ?? 0)}
                  value={cnTaxableAmount}
                  onChange={(e) => setCnTaxableAmount(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-[#64748B] font-mono bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                  <span>13% VAT Reversal: {formatAccountingNPR(round2(cnTaxableAmount * 0.13))}</span>
                  <span className="font-bold text-[#DC2626]">
                    Total Credit: {formatAccountingNPR(round2(cnTaxableAmount * 1.13))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Refund / Adjustment Mode</label>
                <select
                  value={cnRefundMethod}
                  onChange={(e) => setCnRefundMethod(e.target.value as NepalPaymentMethod)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none bg-[#FFFFFF]"
                >
                  <option value="Cash">Cash Refund (GL 1010)</option>
                  <option value="Bank Transfer">Bank Transfer Refund (GL 1020)</option>
                  <option value="Fonepay">Fonepay Refund (GL 1030)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Reason for Credit Note *</label>
                <textarea
                  rows={2}
                  value={cnReason}
                  onChange={(e) => setCnReason(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreditNoteSource(null)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg font-semibold"
                >
                  Issue IRD Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINTABLE A4 NEPAL IRD TAX INVOICE */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          invoice={selectedInvoiceForPrint}
          jobCard={jobCards.find(
            (jc) =>
              jc.id === selectedInvoiceForPrint.jobCardId ||
              jc.jobCardNumber === selectedInvoiceForPrint.jobCardNumber
          )}
          profile={profile}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}

      {/* MODAL 5: PICK UNBILLED JOB CARD TO GENERATE TAX INVOICE */}
      {isJobCardPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-lg w-full border border-[#E2E8F0] overflow-hidden">
            <div className="p-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Select Job Card for Tax Invoice</h4>
                <p className="text-[11px] text-sky-200">
                  Choose an unbilled Job Card to issue an Individual or Company VAT Invoice
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsJobCardPickerOpen(false)}
                className="text-sky-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-[#E2E8F0]">
              {unbilledJobCards.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  All active Job Cards already have an IRD Tax Invoice issued.
                </div>
              ) : (
                unbilledJobCards.map((jc) => (
                  <button
                    key={jc.id}
                    type="button"
                    onClick={() => {
                      setIsJobCardPickerOpen(false);
                      setJobCardToBill(jc);
                    }}
                    className="w-full py-3 px-2 text-left hover:bg-[#F8FAFC] flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-[#0284C7]">
                        {jc.jobCardNumber} • {jc.vehicle?.registrationNumber}
                      </div>
                      <div className="text-xs font-semibold text-[#0F172A] mt-0.5">
                        {jc.customerName} ({jc.vehicle?.brand} {jc.vehicle?.model})
                      </div>
                      <div className="text-[10px] text-[#64748B]">Status: {jc.status}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#0EA5E9] text-white rounded-lg text-[11px] font-semibold">
                      Bill Now
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: GENERATE TAX INVOICE WITH COMPANY BILLING OPTION */}
      <GenerateTaxInvoiceModal
        isOpen={Boolean(jobCardToBill)}
        jobCard={jobCardToBill}
        customer={customers.find(
          (c) =>
            jobCardToBill &&
            ((jobCardToBill.customerId && c.id === jobCardToBill.customerId) ||
              c.name.trim().toLowerCase() === (jobCardToBill.customerName || '').trim().toLowerCase())
        )}
        onClose={() => setJobCardToBill(null)}
        onConfirm={(jc, options) => {
          setJobCardToBill(null);
          if (onConvertJobCardToInvoice) {
            onConvertJobCardToInvoice(jc, options);
          }
        }}
      />
    </div>
  );
};
