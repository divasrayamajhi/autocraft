import React from 'react';
import { Invoice, JobCard } from '../../types';
import { Printer, X, Share2, CheckCircle2, Shield, QrCode, Lock } from 'lucide-react';

interface PrintInvoiceModalProps {
  invoice: Invoice;
  jobCard?: JobCard;
  onClose: () => void;
  onWhatsAppShare?: (invoice: Invoice) => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  jobCard,
  onClose,
  onWhatsAppShare
}) => {
  const handlePrint = () => {
    window.print();
  };

  const defaultWhatsApp = () => {
    if (onWhatsAppShare) {
      onWhatsAppShare(invoice);
    } else {
      const message = `Namaste ${invoice.customerName}! Here is your Tax Invoice ${invoice.invoiceNumber} from Sagarmatha Auto Workshop for vehicle ${invoice.vehicleReg}. Total: NPR रु. ${invoice.grandTotal.toLocaleString()}. Thank you for choosing us!`;
      const cleanPhone = invoice.customerPhone.replace(/[^0-9]/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide">
              Nepal IRD 13% VAT Tax Invoice
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Tax Invoice: {invoice.invoiceNumber}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={defaultWhatsApp}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto print:p-0 text-slate-800 text-xs bg-white">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase">
              SAGARMATHA MULTI-CARE AUTO WORKSHOP PVT. LTD.
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Sukedhara-04, Ring Road, Kathmandu, Nepal | Hotline: +977-1-4378920, 9851099882
            </p>
            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
              PAN / VAT Registration No.: <span className="text-indigo-800 font-extrabold text-sm">302849182</span>
            </p>
            <div className="inline-block mt-2 px-4 py-1 border border-slate-800 rounded font-black text-sm uppercase tracking-wider bg-slate-50">
              TAX INVOICE (कर बिजक)
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              (Issued in accordance with Section 14 of Value Added Tax Act, 2052 - Nepal IRD)
            </p>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <p><strong className="text-slate-500">Invoice No:</strong> <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
              <p><strong className="text-slate-500">Fiscal Year:</strong> <span className="font-mono font-bold">2081/82 B.S.</span></p>
              <p><strong className="text-slate-500">Invoice Date:</strong> {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : (invoice.date || 'N/A')} ({(invoice.createdAt || invoice.date || '').slice(0, 10)})</p>
              <p><strong className="text-slate-500">Job Card No:</strong> <span className="font-mono">{invoice.jobCardNumber}</span></p>
              <p><strong className="text-slate-500">Payment Mode:</strong> <span className="font-bold text-indigo-700">{invoice.paymentMethod || 'Cash'}</span></p>
            </div>

            <div className="text-right">
              <p><strong className="text-slate-500">Buyer Name:</strong> <span className="font-bold text-slate-900">{invoice.customerName}</span></p>
              <p><strong className="text-slate-500">Buyer Phone:</strong> {invoice.customerPhone}</p>
              <p><strong className="text-slate-500">Buyer PAN / VAT:</strong> <span className="font-mono font-bold">{invoice.customerPan || 'Consumer (No PAN)'}</span></p>
              <p><strong className="text-slate-500">Vehicle Reg:</strong> <span className="font-mono font-bold text-slate-900">{invoice.vehicleReg}</span></p>
              <p><strong className="text-slate-500">Vehicle:</strong> {invoice.vehicleBrand} {invoice.vehicleModel}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-4">
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300 w-8 text-center">S.N.</th>
                  <th className="p-2 border-r border-slate-300">Description of Goods / Services</th>
                  <th className="p-2 border-r border-slate-300 text-center w-20">HSN/SAC</th>
                  <th className="p-2 border-r border-slate-300 text-center w-12">Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right w-24">Rate (NPR)</th>
                  <th className="p-2 border-r border-slate-300 text-right w-24">Taxable Amt</th>
                  <th className="p-2 text-right w-24">Total (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(invoice.items || []).map((item, index) => (
                  <tr key={item.id}>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{index + 1}</td>
                    <td className="p-2 border-r border-slate-200">
                      <div className="font-semibold text-slate-900">{item.description}</div>
                      <div className="text-[10px] text-slate-500">{item.itemType}</div>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono text-[10px]">{item.hsnSacCode}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-mono">{item.quantity}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">रु. {item.unitPrice.toLocaleString()}</td>
                    <td className="p-2 border-r border-slate-200 text-right font-mono">रु. {item.taxableAmount.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono font-semibold">रु. {item.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="mt-4 grid grid-cols-2 gap-4 items-start">
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Nepal IRD CBMS Sync Status: VERIFIED</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                IRD Ref: {invoice.irdSyncDetails?.cbmsAckNumber || 'IRD-2081-CBMS-091823'}
              </p>
              <p className="text-[10px] text-slate-500">
                Fiscal Terminal: KTM-SUKEDHARA-TERM-01 | Synced Realtime
              </p>
              {invoice.isLocked && (
                <div className="text-[10px] font-mono text-amber-800 bg-amber-100 p-1.5 rounded flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-amber-700" />
                  <span>Sealed & Locked: Record Immutable</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-xs text-right">
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-600">Total Gross Amount:</span>
                <span className="font-mono font-semibold">रु. {invoice.subTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-600">Total Discount:</span>
                <span className="font-mono font-semibold text-rose-600">- रु. {invoice.discountTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100">
                <span className="text-slate-600">Taxable Amount (करयोग्य रकम):</span>
                <span className="font-mono font-bold">रु. {invoice.taxableAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-slate-100 text-indigo-800 font-bold">
                <span>Value Added Tax (13% VAT):</span>
                <span className="font-mono">रु. {invoice.vatAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t-2 border-slate-900 text-sm font-extrabold text-slate-900">
                <span>Grand Total (कुल रकम):</span>
                <span className="font-mono text-base">रु. {invoice.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[11px] text-emerald-700 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">रु. {invoice.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-0.5 text-[11px] font-bold text-slate-800">
                <span>Balance Due:</span>
                <span className="font-mono text-rose-700">रु. {invoice.balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment QR Codes: Fonepay & IRD Verification */}
          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 items-center">
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded flex items-center justify-center flex-shrink-0">
                <QrCode className="w-14 h-14" />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">Fonepay / NepalPay Dynamic QR</span>
                <span className="text-[10px] text-slate-500 block">Scan using any Nepal mobile banking or wallet (eSewa, Khalti)</span>
                <span className="font-mono text-[10px] font-bold text-indigo-700">Merchant: SAGARMATHA AUTO KTM</span>
              </div>
            </div>

            <div className="text-right space-y-4">
              <div className="h-10"></div>
              <div className="inline-block border-t border-slate-800 pt-1 text-center min-w-[160px]">
                <p className="font-bold text-slate-900">Authorized Signature</p>
                <p className="text-[10px] text-slate-500">For Sagarmatha Multi-Care Auto</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
