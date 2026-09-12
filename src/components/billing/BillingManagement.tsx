import React, { useState } from 'react';
import { 
  Invoice, 
  JobCard, 
  Customer, 
  SparePart, 
  NepalPaymentMethod,
  UserRole 
} from '../../types';
import { 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  DollarSign,
  QrCode,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Lock,
  Smartphone,
  Building2,
  X
} from 'lucide-react';
import { PrintInvoiceModal } from '../common/PrintInvoiceModal';

interface BillingManagementProps {
  invoices: Invoice[];
  jobCards: JobCard[];
  customers: Customer[];
  availableParts: SparePart[];
  userRole: UserRole;
  onCreateInvoice: (newInv: Invoice) => void;
  onUpdateInvoice: (updatedInv: Invoice) => void;
  onRecordPayment: (invoiceId: string, amount: number, method: NepalPaymentMethod, ref: string) => void;
}

export const BillingManagement: React.FC<BillingManagementProps> = ({
  invoices,
  jobCards,
  customers,
  availableParts,
  userRole,
  onCreateInvoice,
  onUpdateInvoice,
  onRecordPayment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partially Paid' | 'Unpaid'>('All');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  // Dynamic QR Payment Modal State
  const [qrModalInvoice, setQrModalInvoice] = useState<Invoice | null>(null);
  const [qrGateway, setQrGateway] = useState<'Fonepay' | 'NepalPay' | 'eSewa' | 'Khalti'>('Fonepay');
  const [qrPaymentSimulated, setQrPaymentSimulated] = useState(false);

  // Manual Payment Recording Modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<NepalPaymentMethod>('Fonepay');
  const [payRef, setPayRef] = useState('');

  // Notification Banner
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.vehicleReg.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.jobCardNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalInvoiced = (invoices || []).reduce((acc, i) => acc + (i.grandTotal || 0), 0);
  const totalPaid = (invoices || []).reduce((acc, i) => acc + (i.paidAmount ?? i.amountPaid ?? 0), 0);
  const totalReceivables = (invoices || []).reduce((acc, i) => acc + (i.balanceDue ?? 0), 0);
  const totalVatCollected = (invoices || []).reduce((acc, i) => acc + (i.vatAmount ?? i.totalVatAmount ?? 0), 0);

  const handleOpenQRModal = (inv: Invoice, gateway: 'Fonepay' | 'NepalPay' | 'eSewa' | 'Khalti' = 'Fonepay') => {
    setQrModalInvoice(inv);
    setQrGateway(gateway);
    setQrPaymentSimulated(false);
  };

  const handleSimulateWebhookSuccess = () => {
    if (!qrModalInvoice) return;
    const refNum = `${qrGateway.toUpperCase()}-TXN-${Math.floor(100000 + Math.random()*900000)}`;
    onRecordPayment(qrModalInvoice.id, qrModalInvoice.balanceDue, qrGateway, refNum);
    setQrPaymentSimulated(true);
    notify(`Payment of NPR रु. ${qrModalInvoice.balanceDue.toLocaleString()} confirmed via ${qrGateway} Dynamic QR Webhook!`);
    setTimeout(() => {
      setQrModalInvoice(null);
    }, 1800);
  };

  const handleRecordManualPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || payAmount <= 0) return;
    onRecordPayment(paymentInvoice.id, payAmount, payMethod, payRef || `REC-${Date.now().toString().slice(-4)}`);
    setPaymentInvoice(null);
    notify(`Payment of NPR रु. ${payAmount.toLocaleString()} recorded via ${payMethod}`);
  };

  const handleSendWhatsApp = (inv: Invoice) => {
    const cleanPhone = inv.customerPhone.replace(/[^0-9]/g, '');
    const text = `Namaste ${inv.customerName}! Your tax invoice ${inv.invoiceNumber} for vehicle ${inv.vehicleReg} is ready at Sagarmatha Auto Workshop. Total Amount: NPR रु. ${inv.grandTotal.toLocaleString()} (incl. 13% VAT). Balance Due: NPR रु. ${inv.balanceDue.toLocaleString()}. You can pay instantly using Fonepay/eSewa. Thank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Financial Dashboard Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gross Billed</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">रु. {totalInvoiced.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500">{invoices.length} IRD Tax Bills</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</span>
          <div className="text-xl font-black text-emerald-600 font-mono mt-1">रु. {totalPaid.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-700">Fonepay, NepalPay, Cash, eSewa</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Accounts Receivable (Due)</span>
          <div className="text-xl font-black text-rose-600 font-mono mt-1">रु. {totalReceivables.toLocaleString()}</div>
          <span className="text-[11px] text-rose-700">Pending collections</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nepal 13% VAT Output</span>
          <div className="text-xl font-black text-indigo-700 font-mono mt-1">रु. {totalVatCollected.toLocaleString()}</div>
          <span className="text-[11px] text-indigo-800">Payable to Inland Revenue Dept.</span>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{notification}</span>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Invoice #, Reg, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none font-semibold"
          >
            <option value="All">All Invoices</option>
            <option value="Paid">Fully Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid (Balance Due)</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
            IRD CBMS Realtime Connected (13% VAT)
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3.5">Bill Number</th>
              <th className="p-3.5">Customer & Vehicle</th>
              <th className="p-3.5">Job Card</th>
              <th className="p-3.5 text-right">Taxable (NPR)</th>
              <th className="p-3.5 text-right">13% VAT</th>
              <th className="p-3.5 text-right">Grand Total</th>
              <th className="p-3.5 text-center">Payment Status</th>
              <th className="p-3.5 text-center">Nepal Pay QR</th>
              <th className="p-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.map((inv) => {
              const invStatus = inv.status || inv.paymentStatus || 'Unpaid';
              const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
              const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
              const grand = inv.grandTotal ?? (taxable + vat);
              const due = inv.balanceDue ?? (invStatus === 'Paid' ? 0 : grand);
              const dateStr = (inv.createdAt || inv.date || '').slice(0, 10);

              return (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-indigo-700">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">{dateStr}</div>
                  </td>

                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{inv.customerName}</div>
                    <div className="font-mono text-[11px] text-slate-500 font-semibold">{inv.vehicleReg}</div>
                  </td>

                  <td className="p-3.5 font-mono text-slate-600 font-semibold">
                    {inv.jobCardNumber}
                  </td>

                  <td className="p-3.5 text-right font-mono text-slate-700">
                    रु. {taxable.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-indigo-700">
                    रु. {vat.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-right font-mono font-extrabold text-slate-900">
                    रु. {grand.toLocaleString()}
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      invStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                      invStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {invStatus}
                    </span>
                    {invStatus !== 'Paid' && (
                      <div className="text-[10px] font-mono font-bold text-rose-600 mt-0.5">
                        Due: रु. {due.toLocaleString()}
                      </div>
                    )}
                  </td>

                <td className="p-3.5 text-center">
                  {inv.balanceDue > 0 ? (
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        onClick={() => handleOpenQRModal(inv, 'Fonepay')}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                        title="Generate Fonepay Dynamic QR"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenQRModal(inv, 'NepalPay')}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                        title="Generate NepalPay NCHL Dynamic QR"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-center space-x-0.5">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Settled</span>
                    </span>
                  )}
                </td>

                <td className="p-3.5 text-center">
                  <div className="flex items-center justify-center space-x-1.5">
                    {inv.balanceDue > 0 && (
                      <button
                        onClick={() => {
                          setPaymentInvoice(inv);
                          setPayAmount(inv.balanceDue);
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold"
                        title="Record Payment"
                      >
                        Pay
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedInvoiceForPrint(inv)}
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                      title="Print IRD Tax Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(inv)}
                      className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                      title="Send Invoice on WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* DYNAMIC QR PAYMENT MODAL (FONEPAY & NEPALPAY NCHL) */}
      {qrModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center relative animate-scale-up">
            <button
              onClick={() => setQrModalInvoice(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Gateway Switcher Tabs */}
            <div className="flex justify-center space-x-1 mb-4">
              {(['Fonepay', 'NepalPay', 'eSewa', 'Khalti'] as const).map(gw => (
                <button
                  key={gw}
                  onClick={() => setQrGateway(gw)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    qrGateway === gw 
                      ? 'bg-slate-900 text-white shadow'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {gw}
                </button>
              ))}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Nepal National Payment Gateway
              </div>
              <h4 className="text-base font-extrabold text-slate-900">
                {qrGateway} Dynamic QR
              </h4>
              <p className="text-xs text-slate-500 font-mono">
                Bill #{qrModalInvoice.invoiceNumber} • {qrModalInvoice.vehicleReg}
              </p>

              {/* Dynamic QR Graphic Box */}
              <div className="bg-white p-4 rounded-xl border-2 border-dashed border-slate-300 inline-block mx-auto my-2">
                <QrCode className="w-32 h-32 text-slate-900 mx-auto" />
                <div className="mt-1 font-mono text-[10px] text-slate-500 font-bold">
                  SAGARMATHA-AUTO-KTM-01
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block">Exact Payable Amount</span>
                <span className="font-mono text-xl font-black text-slate-900 block">
                  रु. {qrModalInvoice.balanceDue.toLocaleString()}
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">Includes 13% Nepal VAT</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3">
              Scan with any mobile banking app, eSewa, or Khalti. Transaction clears instantly.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                disabled={qrPaymentSimulated}
                onClick={handleSimulateWebhookSuccess}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900 transition flex items-center justify-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{qrPaymentSimulated ? 'Payment Approved!' : 'Simulate Customer Payment Webhook'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MANUAL MODAL */}
      {paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                Record Payment for #{paymentInvoice.invoiceNumber}
              </h4>
              <button onClick={() => setPaymentInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordManualPaymentSubmit} className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{paymentInvoice.customerName}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="font-mono font-bold text-slate-900">रु. {paymentInvoice.grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1 text-rose-600 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">रु. {paymentInvoice.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paying Amount (NPR)</label>
                <input
                  type="number"
                  max={paymentInvoice.balanceDue}
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold text-sm border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold"
                >
                  <option value="Cash">Cash at Counter</option>
                  <option value="Fonepay">Fonepay Dynamic QR</option>
                  <option value="NepalPay">NepalPay / NCHL Dynamic QR</option>
                  <option value="eSewa">eSewa Wallet</option>
                  <option value="Khalti">Khalti Wallet</option>
                  <option value="connectIPS">connectIPS Interbank</option>
                  <option value="Card (POS)">Card (POS Terminal)</option>
                  <option value="Bank Transfer">Bank Transfer / Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. FP-TXN-88129 or Cash"
                  value={payRef}
                  onChange={e => setPayRef(e.target.value)}
                  className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT INVOICE MODAL */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          invoice={selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
          onWhatsAppShare={handleSendWhatsApp}
        />
      )}
    </div>
  );
};
