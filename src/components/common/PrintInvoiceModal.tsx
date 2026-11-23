import React, { useRef } from 'react';
import { Invoice, JobCard, WorkshopProfile } from '../../types';
import { Printer, X, Share2, CheckCircle2, Shield, QrCode, Lock } from 'lucide-react';
import { printElement, numberToWordsNPR, formatNPR } from '../../utils/printDocument';

interface PrintInvoiceModalProps {
  invoice: Invoice;
  jobCard?: JobCard;
  profile?: WorkshopProfile;
  onClose: () => void;
  onWhatsAppShare?: (invoice: Invoice) => void;
  onOpenGatePass?: (invoice: Invoice) => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  jobCard,
  profile,
  onClose,
  onWhatsAppShare,
  onOpenGatePass
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

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

  const isoDate = (invoice.createdAt || invoice.date || new Date().toISOString()).slice(0, 10);
  const odometer = jobCard?.vehicle?.odometerReading;
  const vinNumber = jobCard?.vehicle?.vinNumber || jobCard?.vehicle?.chassisNumber;
  const isCreditNote = invoice.type === 'Credit Note' || grandTotal < 0;
  const docTitle = isCreditNote ? 'CREDIT NOTE' : 'TAX INVOICE';

  const statusBadge =
    invoice.status === 'Paid'
      ? 'bg-green-50 text-[#16A34A] border-green-300'
      : invoice.status === 'Partially Paid'
        ? 'bg-amber-50 text-[#B45309] border-amber-300'
        : 'bg-red-50 text-[#DC2626] border-red-300';

  const handlePrint = () => {
    printElement(printAreaRef.current, `${docTitle.replace(/\s+/g, '-')}-${invoice.invoiceNumber}`);
  };

  const defaultWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(invoice);
    } else {
      const message = `Hello ${invoice.customerName}, your ${docTitle} #${invoice.invoiceNumber} from ${workshopName} for vehicle ${invoice.vehicleReg} is ready. Grand Total: NPR ${formatNPR(grandTotal)}. Thank you!`;
      const cleanPhone = (invoice.customerPhone || '').replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
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

          <div className="flex items-center space-x-2">
            {onOpenGatePass && (
              <button
                type="button"
                onClick={() => onOpenGatePass(invoice)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F3D5E] hover:bg-[#0B2F49] text-white text-xs font-semibold rounded-lg transition"
                title="View / Print Security Gate Pass"
              >
                <Shield className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Gate Pass</span>
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

        {/* Scrollable Preview Wrapper */}
        <div className="overflow-y-auto flex-1 bg-[#F1F5F9] p-4 sm:p-6">
          {/* A4 Printable Sheet */}
          <div
            ref={printAreaRef}
            className="a4-sheet bg-[#FFFFFF] mx-auto max-w-[210mm] border border-[#E2E8F0] print:border-0 text-[#0F172A] text-xs"
          >
            {/* Top Brand Accent Bar */}
            <div className="h-1.5 w-full bg-[#0F3D5E]" />

            <div className="p-6 sm:p-8 print:p-0 print:pt-3 space-y-5">
              {/* Two-Column Executive Masthead */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-[#0F3D5E]">
                <div className="space-y-1 max-w-[62%]">
                  <h1 className="text-lg font-extrabold text-[#0F3D5E] tracking-tight uppercase leading-snug">
                    {workshopName}
                  </h1>
                  {legalEntity && legalEntity !== workshopName && (
                    <p className="text-[11px] font-semibold text-[#0F172A]">{legalEntity}</p>
                  )}
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{workshopAddress}</p>
                  <p className="text-[11px] text-[#64748B]">
                    Tel: <span className="text-[#0F172A] font-medium">{workshopPhone}</span>
                    {workshopEmail && (
                      <>
                        {' · '}Email: <span className="text-[#0F172A] font-medium">{workshopEmail}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs font-mono font-bold text-[#0F172A] pt-0.5">
                    Seller PAN / VAT No.: <span className="text-[#0F3D5E]">{workshopPan}</span>
                  </p>
                </div>

                <div className="sm:text-right flex flex-col sm:items-end space-y-1.5">
                  <div className="inline-block px-3.5 py-1 border-2 border-[#0F3D5E] text-[#0F3D5E] font-extrabold text-sm tracking-widest uppercase">
                    {docTitle}
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    Section 14, Nepal Value Added Tax Act, 2052
                  </p>
                  <div className="pt-1 space-y-0.5 text-[11px]">
                    <div>
                      <span className="text-[#64748B]">Invoice No.: </span>
                      <span className="font-mono font-bold text-[#0F172A]">{invoice.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Date: </span>
                      <span className="font-semibold text-[#0F172A]">{formattedDate}</span>
                      <span className="text-[#64748B] font-mono ml-1">({isoDate})</span>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Fiscal Year: </span>
                      <span className="font-mono font-bold text-[#0F172A]">{fiscalYear} B.S.</span>
                    </div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded ${statusBadge}`}>
                    {invoice.status || 'Unpaid'}
                  </span>
                </div>
              </div>

              {/* Buyer & Vehicle Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[#E2E8F0] rounded-lg p-3.5 space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7]">
                      {invoice.billedToType === 'Company' || invoice.companyName
                        ? 'Billed To (Company / VAT Buyer)'
                        : 'Billed To (Buyer Details)'}
                    </p>
                    {(invoice.billedToType === 'Company' || invoice.companyName) && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-sky-50 text-[#0F3D5E] border border-sky-200">
                        Company Bill
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#0F172A] pt-1">
                    {invoice.companyName || invoice.customerName}
                  </p>
                  <div className="grid grid-cols-[95px_1fr] gap-y-0.5 text-[11px]">
                    <span className="text-[#64748B]">Buyer VAT/PAN:</span>
                    <span className="font-mono font-bold text-[#0F3D5E]">
                      {invoice.customerPan || invoice.customerPanVat || 'Consumer (Unregistered)'}
                    </span>
                    {(invoice.companyAddress || invoice.customerAddress) && (
                      <>
                        <span className="text-[#64748B]">Address:</span>
                        <span className="text-[#0F172A] leading-snug">
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
                    <span className="font-semibold text-[#0F3D5E]">{invoice.paymentMethod || 'Cash'}</span>
                    {invoice.paymentReference && (
                      <>
                        <span className="text-[#64748B]">Ref / Txn ID:</span>
                        <span className="font-mono text-[#0F172A]">{invoice.paymentReference}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="border border-[#E2E8F0] rounded-lg p-3.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0284C7] pb-1 border-b border-[#E2E8F0]">
                    Vehicle &amp; Job Reference
                  </p>
                  <p className="text-xs font-mono font-bold text-[#0F172A] pt-1">
                    {invoice.vehicleReg || 'N/A'}
                  </p>
                  <div className="grid grid-cols-[90px_1fr] gap-y-0.5 text-[11px]">
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
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <table className="w-full text-left border-collapse border border-[#CBD5E1] text-[11px]">
                  <thead>
                    <tr className="bg-[#0F3D5E] text-white font-semibold">
                      <th className="py-2 px-2.5 border-r border-white/20 w-10 text-center">S.N.</th>
                      <th className="py-2 px-3 border-r border-white/20">Particulars / Description</th>
                      <th className="py-2 px-2 border-r border-white/20 text-center w-20">HSN / SAC</th>
                      <th className="py-2 px-2 border-r border-white/20 text-center w-12">Qty</th>
                      <th className="py-2 px-2.5 border-r border-white/20 text-right w-24">Rate (NPR)</th>
                      <th className="py-2 px-2.5 border-r border-white/20 text-right w-24">Taxable Amt</th>
                      <th className="py-2 px-2.5 text-right w-24">Total (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[#64748B]">
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
                            <td className="py-2 px-2.5 border-r border-[#E2E8F0] text-center font-mono text-[#64748B]">
                              {index + 1}
                            </td>
                            <td className="py-2 px-3 border-r border-[#E2E8F0]">
                              <div className="font-semibold text-[#0F172A]">{item.description}</div>
                              <div className="text-[10px] text-[#64748B]">{item.itemType || 'Service'}</div>
                            </td>
                            <td className="py-2 px-2 border-r border-[#E2E8F0] text-center font-mono text-[10px] text-[#64748B]">
                              {item.hsnSacCode || (item.itemType === 'Labor' ? '998714' : '87082900')}
                            </td>
                            <td className="py-2 px-2 border-r border-[#E2E8F0] text-center font-mono tabular-nums">
                              {qty}
                            </td>
                            <td className="py-2 px-2.5 border-r border-[#E2E8F0] text-right font-mono tabular-nums">
                              {formatNPR(rate)}
                            </td>
                            <td className="py-2 px-2.5 border-r border-[#E2E8F0] text-right font-mono tabular-nums">
                              {formatNPR(lineTaxable)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-semibold text-[#0F172A] tabular-nums">
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
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start print-avoid-break">
                {/* Left Column: Amount in Words, IRD CBMS & Payment QR */}
                <div className="sm:col-span-7 space-y-3">
                  <div className="border border-[#E2E8F0] rounded-lg p-3 bg-[#F8FAFC]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                      Amount in Words
                    </p>
                    <p className="text-xs font-bold text-[#0F172A] mt-0.5 leading-snug">
                      {numberToWordsNPR(Math.abs(grandTotal))}
                    </p>
                  </div>

                  <div className="border border-[#E2E8F0] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#0F172A]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>IRD CBMS E-Billing Verification</span>
                      </div>
                      {invoice.isLocked && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-[#B45309] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Immutable</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#64748B] font-mono">
                      Ack Ref: {invoice.irdSyncDetails?.cbmsAckNumber || `CBMS-${invoice.invoiceNumber}`} · FY {fiscalYear}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 border border-[#E2E8F0] rounded-lg p-3">
                    <div className="w-14 h-14 bg-[#0F3D5E] text-white p-1.5 rounded flex items-center justify-center flex-shrink-0">
                      <QrCode className="w-11 h-11" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#0F172A] text-[11px]">Fonepay / NepalPay Dynamic QR</p>
                      <p className="text-[10px] text-[#64748B]">
                        Scan using mobile banking, eSewa, or Khalti to settle dues.
                      </p>
                      <p className="font-mono text-[10px] font-semibold text-[#0284C7]">
                        Merchant: {workshopName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Financial Breakdown Table */}
                <div className="sm:col-span-5 border border-[#CBD5E1] rounded-lg overflow-hidden">
                  <div className="divide-y divide-[#E2E8F0] text-[11px]">
                    <div className="flex justify-between px-3.5 py-2">
                      <span className="text-[#64748B]">Gross Subtotal</span>
                      <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                        NPR {formatNPR(subTotal)}
                      </span>
                    </div>
                    {discountTotal > 0 && (
                      <div className="flex justify-between px-3.5 py-2">
                        <span className="text-[#64748B]">Less: Discount</span>
                        <span className="font-mono font-semibold text-[#DC2626] tabular-nums">
                          - NPR {formatNPR(discountTotal)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between px-3.5 py-2">
                      <span className="text-[#64748B]">Taxable Amount</span>
                      <span className="font-mono font-semibold text-[#0F172A] tabular-nums">
                        NPR {formatNPR(taxableAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3.5 py-2">
                      <span className="text-[#0F3D5E] font-semibold">Value Added Tax ({vatRate}%)</span>
                      <span className="font-mono font-bold text-[#0F3D5E] tabular-nums">
                        NPR {formatNPR(vatAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3.5 py-2.5 bg-[#0F3D5E] text-white text-xs font-extrabold">
                      <span>Grand Total</span>
                      <span className="font-mono tabular-nums">NPR {formatNPR(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between px-3.5 py-2 bg-[#F8FAFC]">
                      <span className="text-[#16A34A] font-semibold">Amount Paid</span>
                      <span className="font-mono font-semibold text-[#16A34A] tabular-nums">
                        NPR {formatNPR(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3.5 py-2 bg-[#FFFFFF]">
                      <span className="font-bold text-[#0F172A]">Balance Due</span>
                      <span className={`font-mono font-bold tabular-nums ${balanceDue > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                        NPR {formatNPR(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & 3-Column Signature Block */}
              <div className="pt-4 border-t border-[#E2E8F0] space-y-6 print-avoid-break">
                <div className="text-[10px] text-[#64748B] leading-relaxed">
                  <strong className="text-[#0F172A]">Terms &amp; Conditions:</strong> Goods and services once invoiced are subject to standard workshop warranty terms. Please verify vehicle items and gate pass prior to exit. E.&amp;O.E.
                </div>

                <div className="grid grid-cols-3 gap-6 pt-6 text-center text-[11px]">
                  <div>
                    <div className="border-t border-[#94A3B8] pt-1.5 font-semibold text-[#0F172A]">
                      Prepared By
                    </div>
                    <p className="text-[10px] text-[#64748B]">Billing Desk</p>
                  </div>
                  <div>
                    <div className="border-t border-[#94A3B8] pt-1.5 font-semibold text-[#0F172A]">
                      Customer Signature
                    </div>
                    <p className="text-[10px] text-[#64748B]">Vehicle Received in Good Order</p>
                  </div>
                  <div>
                    <div className="border-t border-[#0F3D5E] pt-1.5 font-bold text-[#0F3D5E]">
                      Authorized Signatory
                    </div>
                    <p className="text-[10px] text-[#64748B]">For {workshopName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
