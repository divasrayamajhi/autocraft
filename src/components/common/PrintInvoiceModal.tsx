import React, { useRef, useState } from 'react';
import { GatePass, Invoice, JobCard, NepalPaymentMethod, WorkshopProfile } from '../../types';
import { Printer, X, Share2, CheckCircle2, Shield, QrCode, Lock, RotateCcw, Scissors } from 'lucide-react';
import { printElement, numberToWordsNPR, formatNPR } from '../../utils/printDocument';
import { adToBs } from '../../utils/nepaliDate';
import { formatAccountingNPR, round2 } from '../../utils/accountingEngine';
import { useEscapeKey, usePrintShortcut } from '../../hooks/useKeyboardShortcuts';

interface PrintInvoiceModalProps {
  invoice: Invoice;
  jobCard?: JobCard;
  gatePass?: GatePass;
  profile?: WorkshopProfile;
  onClose: () => void;
  onWhatsAppShare?: (invoice: Invoice) => void;
  onCreateCreditNote?: (
    originalInv: Invoice,
    refundTaxable: number,
    reason: string,
    refundMethod: NepalPaymentMethod
  ) => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  jobCard,
  gatePass,
  profile,
  onClose,
  onWhatsAppShare,
  onCreateCreditNote
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isCnOpen, setIsCnOpen] = useState(false);
  const [cnTaxable, setCnTaxable] = useState<number>(Math.abs(Number(invoice.taxableAmount ?? invoice.subTotal ?? 0)));
  const [cnReason, setCnReason] = useState('Customer billing adjustment / service or part return');
  const [cnMethod, setCnMethod] = useState<NepalPaymentMethod>('Cash');
  const [cnSubmittedMsg, setCnSubmittedMsg] = useState<string | null>(null);

  const workshopName = profile?.name || 'CONTINENTAL AUTO KRAFT';
  const legalEntity = profile?.legalEntityName || workshopName;
  const workshopAddress = profile?.address
    ? `${profile.address}${profile.city ? `, ${profile.city}` : ''}, Nepal`
    : 'Sukedhara-04, Ring Road, Kathmandu, Nepal';
  const workshopPhone = profile?.contactNumber || '+977-1-4378920';
  const workshopEmail = profile?.email || '';
  const workshopPan = profile?.panVatNumber || '609812453';
  const fiscalYear = invoice.fiscalYear || profile?.fiscalYear || '2081/82';

  // Safe numeric calculations (guards against missing/legacy fields)
  const items = invoice.items || [];
  const computedSubTotal = items.reduce(
    (sum, item) => sum + Number(item.taxableAmount ?? (Number(item.quantity || 1) * Number(item.unitPrice || 0))),
    0
  );
  const subTotal = Number(invoice.subTotal ?? invoice.subtotal ?? computedSubTotal) || 0;
  const discountTotal = Number(invoice.discountTotal ?? invoice.totalDiscount ?? 0) || 0;
  const taxableAmount = Number(invoice.taxableAmount ?? invoice.totalTaxableAmount ?? Math.max(0, subTotal - discountTotal)) || 0;
  const vatRate = Number(invoice.vatRate ?? 13);
  const vatAmount = Number(invoice.vatAmount ?? invoice.totalVatAmount ?? Math.round(taxableAmount * (vatRate / 100))) || 0;
  const grandTotal = Number(invoice.grandTotal ?? (taxableAmount + vatAmount)) || 0;
  const paidAmount = Number(invoice.paidAmount ?? invoice.amountPaid ?? 0) || 0;
  const balanceDue = Number(invoice.balanceDue ?? Math.max(0, grandTotal - paidAmount)) || 0;

  const formattedDate = (() => {
    const raw = invoice.createdAt || invoice.date;
    if (!raw) return new Date().toISOString().slice(0, 10);
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw).slice(0, 10);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const isoDate = (invoice.date || invoice.createdAt || new Date().toISOString()).slice(0, 10);
  const bsDateObj = adToBs(isoDate);
  const odometer = jobCard?.vehicle?.odometerReading;
  const vinNumber = jobCard?.vehicle?.vinNumber || jobCard?.vehicle?.chassisNumber;
  const isCreditNote = invoice.type === 'Credit Note' || grandTotal < 0;
  const isOtcInvoice = Boolean(
    invoice.salesOrderId ||
      invoice.salesOrderNumber ||
      invoice.jobCardId === 'JC-OTC' ||
      invoice.jobCardNumber === 'OTC-SALES' ||
      (invoice.jobCardNumber || '').startsWith('PSO-') ||
      invoice.vehicleReg === 'OTC-WALKIN' ||
      (invoice.invoiceNumber || '').startsWith('OTC-')
  );
  const otcOrderRef =
    invoice.salesOrderNumber ||
    (invoice.jobCardNumber && invoice.jobCardNumber !== 'OTC-SALES' ? invoice.jobCardNumber : invoice.paymentReference) ||
    invoice.invoiceNumber;
  const totalPartsQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const docTitle = isCreditNote ? 'CREDIT NOTE' : isOtcInvoice ? 'OTC TAX INVOICE' : 'TAX INVOICE';

  // Ensure Rs. 0 Free Service bills and fully-paid invoices always reflect Paid status
  const effectiveStatus: Invoice['status'] = isCreditNote
    ? 'Paid'
    : invoice.status === 'Paid' || grandTotal <= 0.01 || paidAmount >= grandTotal - 0.01 || balanceDue <= 0.01
      ? 'Paid'
      : paidAmount > 0.01
        ? 'Partially Paid'
        : 'Unpaid';
  const effectiveBalanceDue = effectiveStatus === 'Paid' ? 0 : Math.max(0, round2(grandTotal - paidAmount));

  const statusBadge =
    effectiveStatus === 'Paid'
      ? 'bg-green-50 text-[#16A34A] border-green-300'
      : effectiveStatus === 'Partially Paid'
        ? 'bg-amber-50 text-[#B45309] border-amber-300'
        : 'bg-red-50 text-[#DC2626] border-red-300';

  const handlePrint = () => {
    printElement(printAreaRef.current, `${docTitle.replace(/\s+/g, '-')}-${invoice.invoiceNumber}`);
  };

  // ESC closes inner Credit Note dialog first, then the invoice preview; Ctrl/Cmd+P prints
  useEscapeKey(true, onClose);
  useEscapeKey(isCnOpen, () => setIsCnOpen(false));
  usePrintShortcut(!isCnOpen, handlePrint);

  const gatePassNumber = gatePass?.passNumber || `GP-${invoice.invoiceNumber.replace(/^TAX-/, '')}`;
  const gatePassAuthBy = gatePass?.authorizedBy || 'Workshop Manager';
  const gatePassTime = gatePass?.issueTime || new Date(invoice.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const defaultWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(invoice);
    } else {
      const subjectLabel = isOtcInvoice
        ? `OTC spares order ${otcOrderRef}`
        : `vehicle ${invoice.vehicleReg}`;
      const message = `Hello ${invoice.customerName}, your ${docTitle} #${invoice.invoiceNumber} from ${workshopName} for ${subjectLabel} is ready. Grand Total: NPR ${formatNPR(grandTotal)}. Thank you!`;
      const cleanPhone = (invoice.customerPhone || '').replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-[#E2E8F0]">
        {/* Modal Action Toolbar (hidden during print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#E2E8F0] bg-[#FFFFFF]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-sky-50 text-[#0F3D5E] border border-sky-200 uppercase tracking-wide">
              IRD 13% VAT
            </span>
            <h2 className="text-sm font-bold text-[#0F172A] truncate">
              {docTitle} · <span className="font-mono">{invoice.invoiceNumber}</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isCreditNote && onCreateCreditNote && (
              <button
                type="button"
                onClick={() => {
                  setCnTaxable(Math.abs(taxableAmount));
                  setCnReason('Customer billing adjustment / service or part return');
                  setIsCnOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-[#DC2626] border border-red-200 text-xs font-semibold rounded-lg transition"
                title="Add Sales Invoice Credit Note (separate from Purchase Orders)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Add Credit Note</span>
              </button>
            )}
            <button
              type="button"
              onClick={defaultWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-semibold rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition"
              aria-label="Close invoice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {cnSubmittedMsg && (
          <div className="print:hidden px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center justify-between">
            <span>{cnSubmittedMsg}</span>
            <button type="button" onClick={() => setCnSubmittedMsg(null)} className="text-[#16A34A] hover:underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Preview Wrapper */}
        <div className="overflow-y-auto flex-1 bg-[#F1F5F9] p-4 sm:p-6">
          {/* Single-Page A4 Printable Sheet (Tax Invoice + Detachable Vehicle Exit Gate Pass) */}
          <div
            ref={printAreaRef}
            className="a4-sheet invoice-single-a4 bg-[#FFFFFF] mx-auto max-w-[210mm] border border-[#E2E8F0] print:border-0 text-[#0F172A] text-xs"
          >
            {/* Top Brand Accent Bar */}
            <div className="h-1.5 print:h-1 w-full bg-[#0F3D5E]" />

            <div className="p-5 sm:p-6 print:p-0 print:pt-1.5 space-y-3.5 print:space-y-2">
              {/* Two-Column Executive Masthead */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 print:gap-2 pb-3 print:pb-2 border-b-2 border-[#0F3D5E]">
                <div className="space-y-0.5 max-w-[60%]">
                  <h1 className="text-base print:text-sm font-extrabold text-[#0F3D5E] tracking-tight uppercase leading-tight">
                    {workshopName}
                  </h1>
                  {legalEntity && legalEntity !== workshopName && (
                    <p className="text-[11px] print:text-[10px] font-semibold text-[#0F172A]">{legalEntity}</p>
                  )}
                  <p className="text-[11px] print:text-[10px] text-[#64748B] leading-snug">{workshopAddress}</p>
                  <p className="text-[11px] print:text-[10px] text-[#64748B]">
                    Tel: <span className="text-[#0F172A] font-medium">{workshopPhone}</span>
                    {workshopEmail && (
                      <>
                        {' · '}Email: <span className="text-[#0F172A] font-medium">{workshopEmail}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] print:text-[10px] font-mono font-bold text-[#0F172A]">
                    Seller PAN / VAT No.: <span className="text-[#0F3D5E]">{workshopPan}</span>
                  </p>
                </div>

                <div className="sm:text-right flex flex-col sm:items-end space-y-1 print:space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <div className="inline-block px-3 py-0.5 border-2 border-[#0F3D5E] text-[#0F3D5E] font-extrabold text-xs tracking-widest uppercase">
                      {docTitle}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded ${statusBadge}`}>
                      {effectiveStatus}
                    </span>
                  </div>
                  <p className="text-[9px] text-[#64748B]">
                    Section 14, Nepal Value Added Tax Act, 2052
                  </p>
                  <div className="space-y-0.5 text-[10px] leading-tight">
                    <div>
                      <span className="text-[#64748B]">Invoice No.: </span>
                      <span className="font-mono font-bold text-[#0F172A]">{invoice.invoiceNumber}</span>
                      {' · '}
                      <span className="text-[#64748B]">FY: </span>
                      <span className="font-mono font-bold text-[#0F172A]">{fiscalYear}</span>
                    </div>
                    {isCreditNote && invoice.originalInvoiceNumber && (
                      <div>
                        <span className="text-[#64748B]">Against Invoice: </span>
                        <span className="font-mono font-bold text-[#DC2626]">{invoice.originalInvoiceNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[#64748B]">Date (B.S.): </span>
                      <span className="font-mono font-bold text-[#0F3D5E]">{bsDateObj.fullLabel}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Date (A.D.): </span>
                      <span className="font-semibold text-[#0F172A]">{formattedDate}</span>
                      <span className="text-[#64748B] font-mono ml-1">({isoDate})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buyer & Vehicle Information Grid */}
              <div className="grid grid-cols-2 gap-3 print:gap-2">
                <div className="border border-[#E2E8F0] rounded-lg p-2.5 print:p-2 space-y-0.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#0284C7]">
                      {invoice.billedToType === 'Company' || invoice.companyName
                        ? 'Billed To (Company / VAT Buyer)'
                        : 'Billed To (Buyer Details)'}
                    </p>
                    {(invoice.billedToType === 'Company' || invoice.companyName) && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-sky-50 text-[#0F3D5E] border border-sky-200">
                        Company Bill
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-[#0F172A] pt-0.5">
                    {invoice.companyName || invoice.customerName}
                  </p>
                  <div className="grid grid-cols-[88px_1fr] gap-y-0.5 text-[10px] leading-tight">
                    <span className="text-[#64748B]">Buyer VAT/PAN:</span>
                    <span className="font-mono font-bold text-[#0F3D5E]">
                      {invoice.customerPan || invoice.customerPanVat || 'Consumer (Unregistered)'}
                    </span>
                    {(invoice.companyAddress || invoice.customerAddress) && (
                      <>
                        <span className="text-[#64748B]">Address:</span>
                        <span className="text-[#0F172A] leading-tight">
                          {invoice.companyAddress || invoice.customerAddress}
                        </span>
                      </>
                    )}
                    <span className="text-[#64748B]">Phone:</span>
                    <span className="font-mono text-[#0F172A]">
                      {invoice.companyPhone || invoice.customerPhone || 'N/A'}
                    </span>
                    {invoice.buyerContactPerson &&
                      invoice.buyerContactPerson !== (invoice.companyName || invoice.customerName) && (
                        <>
                          <span className="text-[#64748B]">Attn / Owner:</span>
                          <span className="font-medium text-[#0F172A]">{invoice.buyerContactPerson}</span>
                        </>
                      )}
                    <span className="text-[#64748B]">Payment Mode:</span>
                    <span className="font-semibold text-[#0F3D5E]">
                      {invoice.paymentMethod || 'Cash'}
                      {invoice.paymentReference ? ` · Ref: ${invoice.paymentReference}` : ''}
                    </span>
                  </div>
                </div>

                <div className="border border-[#E2E8F0] rounded-lg p-2.5 print:p-2 space-y-0.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#0284C7] pb-1 border-b border-[#E2E8F0]">
                    {isOtcInvoice ? 'OTC Spares Sales & Dispatch Ref' : 'Vehicle & Job Reference'}
                  </p>
                  {isOtcInvoice ? (
                    <>
                      <p className="text-[11px] font-mono font-bold text-[#0F172A] pt-0.5">
                        Order #{otcOrderRef}
                      </p>
                      <div className="grid grid-cols-[90px_1fr] gap-y-0.5 text-[10px] leading-tight">
                        <span className="text-[#64748B]">Sale Channel:</span>
                        <span className="font-semibold text-[#0F3D5E]">Over-the-Counter Spares</span>
                        <span className="text-[#64748B]">Pricing Tier:</span>
                        <span className="font-medium text-[#0F172A]">{invoice.pricingTier || 'Retail'} Counter Rate</span>
                        <span className="text-[#64748B]">Items / Units:</span>
                        <span className="font-mono text-[#0F172A]">{items.length} SKU(s) · {totalPartsQty} unit(s)</span>
                        <span className="text-[#64748B]">Dispatch Status:</span>
                        <span className="font-semibold text-[#16A34A]">Dispatched from Spares Store</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-mono font-bold text-[#0F172A] pt-0.5">
                        {invoice.vehicleReg || 'N/A'}
                      </p>
                      <div className="grid grid-cols-[82px_1fr] gap-y-0.5 text-[10px] leading-tight">
                        <span className="text-[#64748B]">Vehicle:</span>
                        <span className="font-medium text-[#0F172A]">
                          {[invoice.vehicleBrand, invoice.vehicleModel].filter(Boolean).join(' ') || 'Multi-Brand Vehicle'}
                        </span>
                        <span className="text-[#64748B]">Job Card #:</span>
                        <span className="font-mono font-semibold text-[#0F172A]">{invoice.jobCardNumber || 'DIRECT'}</span>
                        {odometer !== undefined && odometer > 0 && (
                          <>
                            <span className="text-[#64748B]">Odometer:</span>
                            <span className="font-mono text-[#0F172A]">{odometer.toLocaleString('en-IN')} km</span>
                          </>
                        )}
                        {vinNumber && (
                          <>
                            <span className="text-[#64748B]">VIN / Chassis:</span>
                            <span className="font-mono text-[#0F172A]">{vinNumber}</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <table className="w-full text-left border-collapse border border-[#CBD5E1] text-[10px]">
                  <thead>
                    <tr className="bg-[#0F3D5E] text-white font-semibold">
                      <th className="py-1.5 print:py-1 px-2 border-r border-white/20 w-8 text-center">S.N.</th>
                      <th className="py-1.5 print:py-1 px-2.5 border-r border-white/20">Particulars / Description</th>
                      <th className="py-1.5 print:py-1 px-2 border-r border-white/20 text-center w-18">HSN / SAC</th>
                      <th className="py-1.5 print:py-1 px-1.5 border-r border-white/20 text-center w-10">Qty</th>
                      <th className="py-1.5 print:py-1 px-2 border-r border-white/20 text-right w-20">Rate (NPR)</th>
                      <th className="py-1.5 print:py-1 px-2 border-r border-white/20 text-right w-22">Taxable Amt</th>
                      <th className="py-1.5 print:py-1 px-2 text-right w-22">Total (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-4 text-center text-[#64748B]">
                          No itemized lines recorded on this invoice.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const qty = Number(item.quantity || 1);
                        const rate = Number(item.unitPrice || 0);
                        const lineTaxable = Number(item.taxableAmount ?? qty * rate);
                        const lineTotal = Number(item.totalAmount ?? Math.round(lineTaxable * (1 + vatRate / 100)));

                        return (
                          <tr key={item.id || index} className={index % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-[#FFFFFF]'}>
                            <td className="py-1.5 print:py-1 px-2 border-r border-[#E2E8F0] text-center font-mono text-[#64748B]">
                              {index + 1}
                            </td>
                            <td className="py-1.5 print:py-1 px-2.5 border-r border-[#E2E8F0]">
                              <span className="font-semibold text-[#0F172A]">{item.description}</span>
                              <span className="text-[9px] text-[#64748B] ml-1.5">({item.itemType || 'Service'})</span>
                            </td>
                            <td className="py-1.5 print:py-1 px-2 border-r border-[#E2E8F0] text-center font-mono text-[9px] text-[#64748B]">
                              {item.hsnSacCode || (item.itemType === 'Labor' ? '998714' : '87082900')}
                            </td>
                            <td className="py-1.5 print:py-1 px-1.5 border-r border-[#E2E8F0] text-center font-mono tabular-nums">
                              {qty}
                            </td>
                            <td className="py-1.5 print:py-1 px-2 border-r border-[#E2E8F0] text-right font-mono tabular-nums">
                              {formatNPR(rate)}
                            </td>
                            <td className="py-1.5 print:py-1 px-2 border-r border-[#E2E8F0] text-right font-mono tabular-nums">
                              {formatNPR(lineTaxable)}
                            </td>
                            <td className="py-1.5 print:py-1 px-2 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
                              {formatNPR(lineTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Amount in Words + Accounting Summary */}
              <div className="grid grid-cols-12 gap-3 print:gap-2 items-start print-avoid-break">
                {/* Left Column: Amount in Words, IRD CBMS & Payment QR */}
                <div className="col-span-7 space-y-2 print:space-y-1.5">
                  <div className="border border-[#E2E8F0] rounded-lg p-2 print:p-1.5 bg-[#F8FAFC]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">
                      Amount in Words
                    </p>
                    <p className="text-[11px] print:text-[10px] font-bold text-[#0F172A] mt-0.5 leading-snug">
                      {numberToWordsNPR(Math.abs(grandTotal))}
                    </p>
                  </div>

                  <div className="border border-[#E2E8F0] rounded-lg p-2 print:p-1.5 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-[#0F172A]">
                        <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
                        <span>IRD CBMS E-Billing Verification</span>
                      </div>
                      {invoice.isLocked && (
                        <span className="inline-flex items-center space-x-1 text-[9px] font-semibold text-[#B45309] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Immutable</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-[#64748B] font-mono">
                      Ack Ref: {invoice.irdSyncDetails?.cbmsAckNumber || `CBMS-${invoice.invoiceNumber}`} · FY {fiscalYear}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5 border border-[#E2E8F0] rounded-lg p-2 print:p-1.5">
                    <div className="w-10 h-10 bg-[#0F3D5E] text-white p-1 rounded flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-8 h-8" />
                    </div>
                    <div className="space-y-0.5 leading-tight">
                      <p className="font-bold text-[#0F172A] text-[10px]">Fonepay / NepalPay Dynamic QR</p>
                      <p className="text-[9px] text-[#64748B]">
                        Scan using mobile banking, eSewa, or Khalti · Merchant: <span className="font-mono font-semibold text-[#0284C7]">{workshopName}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Financial Breakdown Table */}
                <div className="col-span-5 border border-[#CBD5E1] rounded-lg overflow-hidden">
                  <div className="divide-y divide-[#E2E8F0] text-[10px]">
                    <div className="flex justify-between px-3 py-1.5 print:py-1">
                      <span className="text-[#64748B]">Gross Subtotal</span>
                      <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                        NPR {formatNPR(subTotal)}
                      </span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between px-3 py-1.5 print:py-1">
                        <span className="text-[#64748B]">Less: Discount</span>
                        <span className="font-mono font-semibold text-[#DC2626] tabular-nums">
                          - NPR {formatNPR(discountTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-3 py-1.5 print:py-1">
                      <span className="text-[#64748B]">Taxable Amount</span>
                      <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                        NPR {formatNPR(taxableAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5 print:py-1">
                      <span className="text-[#0F3D5E] font-semibold">Value Added Tax ({vatRate}%)</span>
                      <span className="font-mono font-bold text-[#0F3D5E] tabular-nums">
                        NPR {formatNPR(vatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-2 print:py-1.5 bg-[#0F3D5E] text-white text-[11px] font-extrabold">
                      <span>Grand Total</span>
                      <span className="font-mono tabular-nums">NPR {formatNPR(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5 print:py-1 bg-[#F8FAFC]">
                      <span className="text-[#16A34A] font-semibold">Amount Paid</span>
                      <span className="font-mono font-semibold text-[#16A34A] tabular-nums">
                        NPR {formatNPR(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3 py-1.5 print:py-1 bg-[#FFFFFF]">
                      <span className="font-bold text-[#0F172A]">Balance Due</span>
                      <span className={`font-mono font-bold tabular-nums ${effectiveBalanceDue > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                        NPR {formatNPR(effectiveBalanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & 3-Column Signature Block */}
              <div className="pt-2.5 print:pt-1.5 border-t border-[#E2E8F0] space-y-4 print:space-y-2.5 print-avoid-break">
                <div className="text-[9px] text-[#64748B] leading-snug">
                  <strong className="text-[#0F172A]">Terms &amp; Conditions:</strong>{' '}
                  {isOtcInvoice
                    ? 'Over-the-counter genuine spare parts once sold and unsealed cannot be returned unless defective under OEM policy. Please verify part SKUs and quantities at the spares counter before leaving. E.&O.E.'
                    : 'Goods and services once invoiced are subject to standard workshop warranty terms. Please verify vehicle items and gate pass prior to exit. E.&O.E.'}
                </div>

                <div className="grid grid-cols-3 gap-6 pt-4 print:pt-3 text-center text-[10px]">
                  <div>
                    <div className="border-t border-[#94A3B8] pt-1 font-semibold text-[#0F172A]">
                      Prepared By
                    </div>
                    <p className="text-[9px] text-[#64748B]">{isOtcInvoice ? 'Spares Counter Desk' : 'Billing Desk'}</p>
                  </div>
                  <div>
                    <div className="border-t border-[#94A3B8] pt-1 font-semibold text-[#0F172A]">
                      Customer Signature
                    </div>
                    <p className="text-[9px] text-[#64748B]">
                      {isOtcInvoice ? 'Spare Parts Received in Good Condition' : 'Vehicle Received in Good Order'}
                    </p>
                  </div>
                  <div>
                    <div className="border-t border-[#0F3D5E] pt-1 font-bold text-[#0F3D5E]">
                      Authorized Signatory
                    </div>
                    <p className="text-[9px] text-[#64748B]">For {workshopName}</p>
                  </div>
                </div>
              </div>

              {/* Compact Detachable Exit / Store Dispatch Slip Footer Section (Fits Together on Single A4 Sheet) */}
              {!isCreditNote && (
                <div className="pt-2.5 print:pt-2 mt-1 border-t-2 border-dashed border-[#94A3B8] print-avoid-break">
                  <div className="flex items-center justify-between text-[8.5px] text-[#64748B] uppercase tracking-wider mb-1.5 print:mb-1">
                    <span className="inline-flex items-center space-x-1 font-semibold">
                      <Scissors className="w-2.5 h-2.5 text-[#64748B]" />
                      <span>
                        {isOtcInvoice
                          ? 'Detach Along Perforation — Present Slip to Spares Store / Exit Security'
                          : 'Detach Along Perforation — Present Slip to Main Gate Security'}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-[#0F3D5E]">{workshopName}</span>
                  </div>

                  <div className="border border-[#0F3D5E] rounded-lg overflow-hidden">
                    <div className="bg-[#0F3D5E] text-white px-2.5 py-1 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <Shield className="w-3 h-3 text-[#0EA5E9]" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                          {isOtcInvoice ? 'OTC Spares Dispatch & Store Exit Slip' : 'Vehicle Exit Gate Pass'}
                        </span>
                        <span className="text-[9px] font-mono text-sky-200">
                          #{gatePassNumber}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold uppercase tracking-wider ${
                          effectiveStatus === 'Paid'
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-[#DC2626] text-white'
                        }`}
                      >
                        {effectiveStatus === 'Paid'
                          ? isOtcInvoice
                            ? 'PAID — CLEARED FOR SPARES DISPATCH'
                            : 'PAID — CLEARED FOR EXIT'
                          : `BALANCE DUE (NPR ${formatNPR(effectiveBalanceDue)}) — HOLD AT GATE`}
                      </span>
                    </div>

                    <div className="p-2.5 print:p-2 bg-[#FFFFFF] space-y-2 print:space-y-1.5 text-[9.5px] leading-tight">
                      <div className="grid grid-cols-4 gap-x-2.5 gap-y-1">
                        {isOtcInvoice ? (
                          <>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">OTC Order #</span>
                              <span className="font-mono font-extrabold text-[#0F172A] text-[10px]">
                                {otcOrderRef}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Tax Invoice #</span>
                              <span className="font-mono font-bold text-[#0284C7]">
                                {invoice.invoiceNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Dispatched Qty</span>
                              <span className="font-mono font-semibold text-[#0F172A]">
                                {items.length} SKU(s) · {totalPartsQty} unit(s)
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Date (B.S. / A.D.)</span>
                              <span className="font-mono font-semibold text-[#0F3D5E]">
                                {bsDateObj.formatted} BS
                              </span>{' '}
                              <span className="text-[#64748B] font-mono">({isoDate})</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Vehicle Reg #</span>
                              <span className="font-mono font-extrabold text-[#0F172A] text-[10px]">
                                {invoice.vehicleReg || 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Make / Model</span>
                              <span className="font-semibold text-[#0F172A]">
                                {[invoice.vehicleBrand, invoice.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Job Card / Invoice #</span>
                              <span className="font-mono font-semibold text-[#0F172A]">
                                {invoice.jobCardNumber || 'DIRECT'} · {invoice.invoiceNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Date (B.S. / A.D.)</span>
                              <span className="font-mono font-semibold text-[#0F3D5E]">
                                {bsDateObj.formatted} BS
                              </span>{' '}
                              <span className="text-[#64748B] font-mono">({isoDate})</span>
                            </div>
                          </>
                        )}
                        <div>
                          <span className="text-[#64748B] uppercase text-[8px] font-semibold block">
                            {isOtcInvoice ? 'Buyer / Company' : 'Owner / Company'}
                          </span>
                          <span className="font-semibold text-[#0F172A] truncate block">
                            {invoice.companyName || invoice.customerName}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Contact Phone</span>
                          <span className="font-mono text-[#0F172A]">
                            {invoice.companyPhone || invoice.customerPhone || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] uppercase text-[8px] font-semibold block">
                            {isOtcInvoice ? 'Payment Mode' : 'VIN / Odometer'}
                          </span>
                          <span className="font-mono text-[#0F172A]">
                            {isOtcInvoice
                              ? `${invoice.paymentMethod || 'Cash'} (${effectiveStatus})`
                              : `${vinNumber ? vinNumber.slice(-8) : 'N/A'}${odometer !== undefined && odometer > 0 ? ` · ${odometer.toLocaleString('en-IN')} km` : ''}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] uppercase text-[8px] font-semibold block">Bill Total / Issued</span>
                          <span className="font-mono font-bold text-[#0F172A]">
                            NPR {formatNPR(grandTotal)} · {gatePassTime}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-3 print:pt-2.5 border-t border-[#E2E8F0] text-center text-[9px]">
                        <div>
                          <div className="border-t border-[#94A3B8] pt-0.5 font-semibold text-[#0F172A]">
                            {isOtcInvoice ? `Storekeeper (${gatePassAuthBy})` : `Authorized By (${gatePassAuthBy})`}
                          </div>
                        </div>
                        <div>
                          <div className="border-t border-[#94A3B8] pt-0.5 font-semibold text-[#0F172A]">
                            Main Gate Security Sign
                          </div>
                        </div>
                        <div>
                          <div className="border-t border-[#94A3B8] pt-0.5 font-semibold text-[#0F172A]">
                            {isOtcInvoice ? 'Buyer Receipt Sign' : 'Actual Exit Time: ____:____'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inline Sales Invoice Credit Note Modal */}
      {isCnOpen && onCreateCreditNote && (
        <div className="print:hidden fixed inset-0 z-[70] flex items-center justify-center bg-[#0F172A]/65 backdrop-blur-xs p-4">
          <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-md w-full border border-[#E2E8F0] overflow-hidden">
            <div className="p-4 bg-[#DC2626] text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Add Credit Note on Invoice {invoice.invoiceNumber}</h4>
                <p className="text-[11px] text-red-100">
                  Sales Invoice Credit Note (separate from Purchase Orders)
                </p>
              </div>
              <button type="button" onClick={() => setIsCnOpen(false)} className="text-red-100 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const maxVal = Math.abs(taxableAmount);
                const applied = round2(Math.min(Math.max(0, cnTaxable), maxVal));
                if (applied <= 0) return;
                onCreateCreditNote(invoice, applied, cnReason.trim() || 'Invoice adjustment / return', cnMethod);
                setIsCnOpen(false);
                setCnSubmittedMsg(
                  `Credit Note issued against ${invoice.invoiceNumber} for ${formatAccountingNPR(round2(applied * 1.13))} (incl. 13% VAT).`
                );
              }}
              className="p-5 space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">
                  Credit Note Taxable Amount (Excl. 13% VAT) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={1}
                  max={Math.abs(taxableAmount)}
                  value={cnTaxable}
                  onChange={(e) => setCnTaxable(parseFloat(e.target.value) || 0)}
                  className="w-full font-mono font-bold border border-[#E2E8F0] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
                <div className="mt-1.5 flex justify-between text-[11px] text-[#64748B] font-mono bg-[#F8FAFC] p-2 rounded border border-[#E2E8F0]">
                  <span>13% VAT Reversal: {formatAccountingNPR(round2(cnTaxable * 0.13))}</span>
                  <span className="font-bold text-[#DC2626]">
                    Total Credit: {formatAccountingNPR(round2(cnTaxable * 1.13))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Refund / Adjustment Mode</label>
                <select
                  value={cnMethod}
                  onChange={(e) => setCnMethod(e.target.value as NepalPaymentMethod)}
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
                  onClick={() => setIsCnOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg font-semibold"
                >
                  Issue Invoice Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
