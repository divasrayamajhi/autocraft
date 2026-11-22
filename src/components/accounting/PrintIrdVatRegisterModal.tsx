import React, { useState, useRef } from 'react';
import { Invoice, PurchaseOrder, WorkshopProfile } from '../../types';
import { Printer, X } from 'lucide-react';
import { printElement } from '../../utils/printDocument';
import {
  formatAccountingNPR,
  isCreditNoteInvoice,
  isPurchaseOrderItcEligible,
  round2,
} from '../../utils/accountingEngine';

interface PrintIrdVatRegisterModalProps {
  type: 'sales' | 'purchase' | 'vat_return';
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  profile: WorkshopProfile;
  filterMonth?: string;
  onClose: () => void;
}

export const PrintIrdVatRegisterModal: React.FC<PrintIrdVatRegisterModalProps> = ({
  type,
  invoices,
  purchaseOrders,
  profile,
  filterMonth = 'All',
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'sales' | 'purchase' | 'vat_return'>(type);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const workshopName = profile?.name || 'Auto Workshop Pvt. Ltd.';
  const legalName = profile?.legalEntityName || workshopName;
  const pan = profile?.panVatNumber || '302849182';
  const fiscalYear = profile?.fiscalYear || '2081/82';

  // Sales totals (Net of Credit Notes)
  const totalTaxableSales = round2(
    invoices.reduce((acc, inv) => acc + Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0), 0)
  );
  const totalVatSales = round2(
    invoices.reduce((acc, inv) => acc + Number(inv.vatAmount ?? inv.totalVatAmount ?? 0), 0)
  );
  const totalGrossSales = round2(
    invoices.reduce((acc, inv) => acc + Number(inv.grandTotal ?? 0), 0)
  );

  // Purchase totals: ONLY ITC-Eligible (Received / Billed) Supplier Bills per Nepal VAT Act 2052 Sec 17
  const eligiblePurchases = purchaseOrders.filter(isPurchaseOrderItcEligible);
  const totalTaxablePurchases = round2(
    eligiblePurchases.reduce((acc, po) => acc + Number(po.taxableAmount ?? po.subtotal ?? 0), 0)
  );
  const totalVatPurchases = round2(
    eligiblePurchases.reduce((acc, po) => acc + Number(po.vatTotal ?? 0), 0)
  );
  const totalGrossPurchases = round2(
    eligiblePurchases.reduce((acc, po) => acc + Number(po.totalAmount ?? 0), 0)
  );

  // VAT Return
  const netPayable = round2(Math.max(0, totalVatSales - totalVatPurchases));
  const carryForwardCredit = round2(Math.max(0, totalVatPurchases - totalVatSales));

  const handlePrint = () => {
    printElement(printAreaRef.current, `IRD-VAT-${activeView}-${fiscalYear}`);
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-[#FFFFFF] w-full max-w-5xl rounded-xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Toolbar */}
        <div className="bg-[#0F3D5E] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9] flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Nepal IRD Statutory VAT Register (Schedule 13 / Form VAT-01)
              </h3>
              <p className="text-[11px] text-sky-200">
                Period: {filterMonth === 'All' ? `FY ${fiscalYear} B.S.` : filterMonth}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white/10 p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setActiveView('sales')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  activeView === 'sales' ? 'bg-[#0EA5E9] text-white font-semibold' : 'text-sky-100 hover:text-white'
                }`}
              >
                Sales Register
              </button>
              <button
                onClick={() => setActiveView('purchase')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  activeView === 'purchase' ? 'bg-[#0EA5E9] text-white font-semibold' : 'text-sky-100 hover:text-white'
                }`}
              >
                Purchase Register
              </button>
              <button
                onClick={() => setActiveView('vat_return')}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  activeView === 'vat_return' ? 'bg-[#0EA5E9] text-white font-semibold' : 'text-sky-100 hover:text-white'
                }`}
              >
                VAT Return
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-sky-200 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div className="overflow-y-auto flex-1 bg-[#F1F5F9] p-4 sm:p-6">
          <div
            ref={printAreaRef}
            className="a4-sheet p-6 sm:p-8 print:p-0 text-[#0F172A] bg-[#FFFFFF] border border-[#E2E8F0] print:border-0 font-sans text-xs"
          >
            {/* Header Section */}
            <div className="text-center border-b-2 border-[#0F3D5E] pb-4 mb-5">
              <p className="text-[11px] font-semibold text-[#64748B]">
                Government of Nepal | Ministry of Finance | Inland Revenue Department
              </p>
              <p className="text-xs font-bold text-[#0F172A]">
                Value Added Tax Rules 2052, Rule 23(1) Statutory Tax Register
              </p>
              <h1 className="text-lg font-bold text-[#0F3D5E] mt-1 uppercase tracking-tight">
                {activeView === 'sales' && 'Schedule 13: Sales Register (Sales Book)'}
                {activeView === 'purchase' && 'Schedule 13: Purchase Register (Purchase Book)'}
                {activeView === 'vat_return' && 'Schedule 10: Monthly Value Added Tax Return (VAT-01)'}
              </h1>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-left pt-3 border-t border-[#E2E8F0] text-xs">
                <div>
                  <span className="text-[#64748B] block text-[10px]">Legal Entity Name:</span>
                  <strong className="text-[#0F172A]">{legalName}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">Trading Name:</span>
                  <strong className="text-[#0F172A]">{workshopName}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">PAN / VAT Registration No:</span>
                  <strong className="font-mono text-[#0F172A] text-sm tracking-wider">{pan}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">Fiscal Year / Period:</span>
                  <strong className="font-mono text-[#0F172A]">
                    {fiscalYear} B.S. ({filterMonth})
                  </strong>
                </div>
              </div>
            </div>

            {/* VIEW 1: SALES BOOK */}
            {activeView === 'sales' && (
              <table className="w-full border-collapse border border-[#CBD5E1] text-[11px]">
                <thead>
                  <tr className="bg-[#F1F5F9] text-[#0F172A] font-bold">
                    <th className="border border-[#CBD5E1] p-2 text-center">S.N.</th>
                    <th className="border border-[#CBD5E1] p-2">Date</th>
                    <th className="border border-[#CBD5E1] p-2">Document #</th>
                    <th className="border border-[#CBD5E1] p-2">Buyer Name</th>
                    <th className="border border-[#CBD5E1] p-2 text-center">Buyer PAN</th>
                    <th className="border border-[#CBD5E1] p-2 text-right">Total Sales</th>
                    <th className="border border-[#CBD5E1] p-2 text-right">Exempt</th>
                    <th className="border border-[#CBD5E1] p-2 text-right">Taxable Sales</th>
                    <th className="border border-[#CBD5E1] p-2 text-right">Output VAT (13%)</th>
                    <th className="border border-[#CBD5E1] p-2 text-center">CBMS Ack</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const isCN = isCreditNoteInvoice(inv);
                    const taxable = Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
                    const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
                    const grand = Number(inv.grandTotal ?? round2(taxable + vat));
                    const dateStr = (inv.date || inv.createdAt || '').slice(0, 10);
                    const ack = inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'CBMS-SYNCED';

                    return (
                      <tr key={inv.id} className={isCN ? 'text-[#DC2626]' : ''}>
                        <td className="border border-[#CBD5E1] p-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-[#CBD5E1] p-2 font-mono whitespace-nowrap">{dateStr}</td>
                        <td className="border border-[#CBD5E1] p-2 font-mono font-bold">{inv.invoiceNumber}</td>
                        <td className="border border-[#CBD5E1] p-2">{inv.customerName}</td>
                        <td className="border border-[#CBD5E1] p-2 text-center font-mono">{inv.customerPan || 'Consumer'}</td>
                        <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(grand)}</td>
                        <td className="border border-[#CBD5E1] p-2 text-right font-mono">Rs. 0</td>
                        <td className="border border-[#CBD5E1] p-2 text-right font-mono">{formatAccountingNPR(taxable)}</td>
                        <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(vat)}</td>
                        <td className="border border-[#CBD5E1] p-2 text-center font-mono text-[9px]">{ack}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F1F5F9] font-bold text-[#0F172A] border-t-2 border-[#0F3D5E]">
                    <td colSpan={5} className="border border-[#CBD5E1] p-2.5 text-right uppercase">
                      Net Sales Total (NPR):
                    </td>
                    <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalGrossSales)}</td>
                    <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">Rs. 0</td>
                    <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalTaxableSales)}</td>
                    <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalVatSales)}</td>
                    <td className="border border-[#CBD5E1] p-2.5 text-center text-[10px]">IRD Annex 13</td>
                  </tr>
                </tfoot>
              </table>
            )}

            {/* VIEW 2: PURCHASE BOOK (ONLY ITC-ELIGIBLE RECEIVED BILLS SUMMED) */}
            {activeView === 'purchase' && (
              <div className="space-y-3">
                <p className="text-[11px] text-[#64748B]">
                  Note: Per Nepal VAT Act 2052 Section 17, only Received / Billed supplier tax invoices are included in claimable Input Tax Credit totals.
                </p>
                <table className="w-full border-collapse border border-[#CBD5E1] text-[11px]">
                  <thead>
                    <tr className="bg-[#F1F5F9] text-[#0F172A] font-bold">
                      <th className="border border-[#CBD5E1] p-2 text-center">S.N.</th>
                      <th className="border border-[#CBD5E1] p-2">Date</th>
                      <th className="border border-[#CBD5E1] p-2">Supplier Bill / PO #</th>
                      <th className="border border-[#CBD5E1] p-2">Supplier Name</th>
                      <th className="border border-[#CBD5E1] p-2 text-center">Supplier PAN</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Total Purchase</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Taxable Purchase</th>
                      <th className="border border-[#CBD5E1] p-2 text-right">Input VAT (13%)</th>
                      <th className="border border-[#CBD5E1] p-2 text-center">ITC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligiblePurchases.map((po, idx) => {
                      const taxable = Number(po.taxableAmount ?? po.subtotal ?? 0);
                      const vat = Number(po.vatTotal ?? 0);
                      const grand = Number(po.totalAmount ?? round2(taxable + vat));

                      return (
                        <tr key={po.id}>
                          <td className="border border-[#CBD5E1] p-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-[#CBD5E1] p-2 font-mono whitespace-nowrap">{po.date}</td>
                          <td className="border border-[#CBD5E1] p-2 font-mono font-bold">{po.poNumber}</td>
                          <td className="border border-[#CBD5E1] p-2">{po.supplierName}</td>
                          <td className="border border-[#CBD5E1] p-2 text-center font-mono">{po.supplierPanVat || '—'}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(grand)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono">{formatAccountingNPR(taxable)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-right font-mono font-bold">{formatAccountingNPR(vat)}</td>
                          <td className="border border-[#CBD5E1] p-2 text-center text-[#16A34A] font-bold">Claimable</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F1F5F9] font-bold text-[#0F172A] border-t-2 border-[#0F3D5E]">
                      <td colSpan={5} className="border border-[#CBD5E1] p-2.5 text-right uppercase">
                        Claimable Purchases Total (NPR):
                      </td>
                      <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalGrossPurchases)}</td>
                      <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalTaxablePurchases)}</td>
                      <td className="border border-[#CBD5E1] p-2.5 text-right font-mono">{formatAccountingNPR(totalVatPurchases)}</td>
                      <td className="border border-[#CBD5E1] p-2.5 text-center text-[10px]">Sec. 17 ITC</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* VIEW 3: MONTHLY VAT RETURN */}
            {activeView === 'vat_return' && (
              <div className="space-y-5 max-w-3xl mx-auto">
                <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                  <div className="bg-[#F1F5F9] px-4 py-2 font-bold text-[#0F3D5E] border-b border-[#CBD5E1]">
                    Section A: Sales &amp; Output VAT (13%)
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>1. Net Gross Turnover (Incl. VAT):</span>
                      <span className="font-mono font-bold">{formatAccountingNPR(totalGrossSales)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>2. Exempt / Zero-rated Sales:</span>
                      <span className="font-mono text-[#64748B]">Rs. 0</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>3. Net Taxable Sales Turnover:</span>
                      <span className="font-mono font-bold">{formatAccountingNPR(totalTaxableSales)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold text-[#0F3D5E] bg-sky-50 px-2 rounded">
                      <span>4. Net 13% Output VAT Collected:</span>
                      <span className="font-mono text-sm">{formatAccountingNPR(totalVatSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-[#CBD5E1] rounded-lg overflow-hidden">
                  <div className="bg-[#F1F5F9] px-4 py-2 font-bold text-[#16A34A] border-b border-[#CBD5E1]">
                    Section B: Purchases &amp; Claimable Input Tax Credit (13%)
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>5. Eligible Received Purchase Amount:</span>
                      <span className="font-mono font-bold">{formatAccountingNPR(totalGrossPurchases)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>6. Taxable Spares &amp; Lubricants Purchases:</span>
                      <span className="font-mono font-bold">{formatAccountingNPR(totalTaxablePurchases)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 font-bold text-[#16A34A] bg-emerald-50 px-2 rounded">
                      <span>7. Claimable 13% Input Tax Credit (ITC):</span>
                      <span className="font-mono text-sm">{formatAccountingNPR(totalVatPurchases)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-2 border-[#0F3D5E] rounded-lg overflow-hidden">
                  <div className="bg-[#0F3D5E] text-white px-4 py-2.5 font-bold text-sm flex justify-between">
                    <span>Section C: Net VAT Tax Position</span>
                    <span className="font-mono text-xs text-sky-200">IRD Form VAT-01</span>
                  </div>
                  <div className="p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span>8. Net VAT Payable to Inland Revenue Department:</span>
                      <span className="font-mono text-base text-[#DC2626]">{formatAccountingNPR(netPayable)}</span>
                    </div>
                    {carryForwardCredit > 0 && (
                      <div className="flex justify-between items-center text-sm font-bold text-[#16A34A]">
                        <span>9. Excess Input Tax Credit Carry-Forward:</span>
                        <span className="font-mono text-base">{formatAccountingNPR(carryForwardCredit)}</span>
                      </div>
                    )}
                    <p className="text-[11px] text-[#64748B] pt-2 border-t border-[#E2E8F0]">
                      <strong>Statutory Due Date:</strong> Payable on or before the 25th of the subsequent Bikram Sambat month via Nepal IRD portal / revenue bank deposit.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Statutory Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-[#CBD5E1] text-center text-xs">
              <div>
                <div className="h-12 border-b border-dashed border-[#94A3B8] mb-2" />
                <p className="font-bold text-[#0F172A]">Prepared By</p>
                <p className="text-[10px] text-[#64748B]">Accountant / Cashier</p>
              </div>
              <div>
                <div className="h-12 border-b border-dashed border-[#94A3B8] mb-2" />
                <p className="font-bold text-[#0F172A]">Audited &amp; Verified By</p>
                <p className="text-[10px] text-[#64748B]">Chartered Accountant / Finance Manager</p>
              </div>
              <div>
                <div className="h-12 border-b border-dashed border-[#94A3B8] mb-2" />
                <p className="font-bold text-[#0F172A]">Authorized Signatory</p>
                <p className="text-[10px] text-[#64748B]">Managing Director &amp; Company Stamp</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
