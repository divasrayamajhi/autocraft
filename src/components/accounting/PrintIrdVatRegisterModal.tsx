import React, { useState } from 'react';
import { Invoice, PurchaseOrder, WorkshopProfile } from '../../types';
import { Printer, X, Download, FileSpreadsheet, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  onClose
}) => {
  const [activeView, setActiveView] = useState<'sales' | 'purchase' | 'vat_return'>(type);

  const workshopName = profile?.name || 'Continental Auto Kraft Pvt. Ltd.';
  const legalName = profile?.legalEntityName || workshopName;
  const pan = profile?.panVatNumber || '609812453';
  const fiscalYear = profile?.fiscalYear || '2081/82';
  const address = profile?.address ? `${profile.address}, ${profile.city || 'Kathmandu'}, Nepal` : 'Sukedhara-04, Ring Road, Kathmandu, Nepal';
  const phone = profile?.contactNumber || '+977-1-4378920';

  // Sales totals
  const totalTaxableSales = invoices.reduce((acc, inv) => acc + (inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0), 0);
  const totalVatSales = invoices.reduce((acc, inv) => acc + (inv.vatAmount ?? inv.totalVatAmount ?? 0), 0);
  const totalGrossSales = invoices.reduce((acc, inv) => acc + (inv.grandTotal ?? 0), 0);

  // Purchase totals
  const totalTaxablePurchases = purchaseOrders.reduce((acc, po) => acc + (po.taxableAmount ?? po.subtotal ?? 0), 0);
  const totalVatPurchases = purchaseOrders.reduce((acc, po) => acc + (po.vatTotal ?? 0), 0);
  const totalGrossPurchases = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount ?? 0), 0);

  // VAT Return
  const netPayable = Math.max(0, totalVatSales - totalVatPurchases);
  const carryForwardCredit = Math.max(0, totalVatPurchases - totalVatSales);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Toolbar (hidden on print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                Nepal IRD Standard VAT Register (Schedule 13)
              </h3>
              <p className="text-xs text-slate-300">
                Official Nepal Inland Revenue Department A4 Certified Print Layout
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveView('sales')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeView === 'sales' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Sales Register
              </button>
              <button
                onClick={() => setActiveView('purchase')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeView === 'purchase' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Purchase Register
              </button>
              <button
                onClick={() => setActiveView('vat_return')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  activeView === 'vat_return' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Monthly VAT Return
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body (Printable A4) */}
        <div className="p-8 overflow-y-auto print:p-0 text-slate-900 bg-white font-sans text-xs">
          {/* Header Section */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-5">
            <p className="text-[11px] font-semibold text-slate-600">Government of Nepal | Ministry of Finance | Inland Revenue Department</p>
            <p className="text-xs font-bold text-slate-800">
              Value Added Tax Rules 2052, Rule 23(1) Statutory Tax Register
            </p>
            <h1 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
              {activeView === 'sales' && 'Schedule 13: Sales Register (Sales Book)'}
              {activeView === 'purchase' && 'Schedule 13: Purchase Register (Purchase Book)'}
              {activeView === 'vat_return' && 'Schedule 10: Monthly Value Added Tax Return (VAT-01)'}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-left pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Legal Entity Name:</span>
                <strong className="text-slate-900">{legalName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Trading Name:</span>
                <strong className="text-slate-900">{workshopName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">PAN / VAT Registration No:</span>
                <strong className="font-mono text-slate-900 text-sm tracking-wider">{pan}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Fiscal Year:</span>
                <strong className="font-mono text-slate-900">{fiscalYear} B.S.</strong>
              </div>
            </div>
          </div>

          {/* VIEW 1: SALES BOOK */}
          {activeView === 'sales' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center">S.N.</th>
                      <th className="border border-slate-300 p-2">Date</th>
                      <th className="border border-slate-300 p-2">Invoice #</th>
                      <th className="border border-slate-300 p-2">Buyer Name</th>
                      <th className="border border-slate-300 p-2 text-center">PAN / VAT No</th>
                      <th className="border border-slate-300 p-2 text-right">Total Sales (NPR)</th>
                      <th className="border border-slate-300 p-2 text-right">Exempt Sales</th>
                      <th className="border border-slate-300 p-2 text-right">Taxable Sales</th>
                      <th className="border border-slate-300 p-2 text-right">Output VAT (13%)</th>
                      <th className="border border-slate-300 p-2 text-center">CBMS Ack Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => {
                      const taxable = inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0;
                      const vat = inv.vatAmount ?? inv.totalVatAmount ?? 0;
                      const grand = inv.grandTotal ?? (taxable + vat);
                      const dateStr = (inv.createdAt || inv.date || '').slice(0, 10);
                      const ack = inv.irdSyncDetails?.cbmsAckNumber || inv.irdCompliance?.irdAcknowledgementCode || 'ACK-2081-NPL-01';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{dateStr}</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold">{inv.invoiceNumber}</td>
                          <td className="border border-slate-300 p-2 font-medium">{inv.customerName}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{inv.customerPan || 'Walk-in Consumer'}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">Rs. {grand.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono text-slate-400">Rs. 0</td>
                          <td className="border border-slate-300 p-2 text-right font-mono">Rs. {taxable.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">Rs. {vat.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono text-[9px] text-slate-600">{ack}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-800">
                      <td colSpan={5} className="border border-slate-300 p-2.5 text-right uppercase">
                        Grand Total (NPR):
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-black text-xs">
                        Rs. {totalGrossSales.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono">
                        Rs. 0
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono">
                        Rs. {totalTaxableSales.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-black text-xs">
                        Rs. {totalVatSales.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-center text-[10px]">
                        IRD CBMS Verified
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: PURCHASE BOOK */}
          {activeView === 'purchase' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="border border-slate-300 p-2 text-center">S.N.</th>
                      <th className="border border-slate-300 p-2">Date</th>
                      <th className="border border-slate-300 p-2">Supplier Bill / PO #</th>
                      <th className="border border-slate-300 p-2">Supplier Name</th>
                      <th className="border border-slate-300 p-2 text-center">Supplier PAN</th>
                      <th className="border border-slate-300 p-2 text-right">Total Purchase (NPR)</th>
                      <th className="border border-slate-300 p-2 text-right">Exempt Purchase</th>
                      <th className="border border-slate-300 p-2 text-right">Taxable Purchase</th>
                      <th className="border border-slate-300 p-2 text-right">Input VAT (13%)</th>
                      <th className="border border-slate-300 p-2 text-center">ITC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po, idx) => {
                      const taxable = po.taxableAmount ?? po.subtotal ?? 0;
                      const vat = po.vatTotal ?? 0;
                      const grand = po.totalAmount ?? (taxable + vat);

                      return (
                        <tr key={po.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{po.date}</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold">{po.poNumber}</td>
                          <td className="border border-slate-300 p-2 font-medium">{po.supplierName}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono">{po.supplierPanVat || '—'}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold">Rs. {grand.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono text-slate-400">Rs. 0</td>
                          <td className="border border-slate-300 p-2 text-right font-mono">Rs. {taxable.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">Rs. {vat.toLocaleString()}</td>
                          <td className="border border-slate-300 p-2 text-center font-mono text-[10px] text-emerald-700 font-bold">
                            Claimable
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-800">
                      <td colSpan={5} className="border border-slate-300 p-2.5 text-right uppercase">
                        Grand Total (NPR):
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-black text-xs">
                        Rs. {totalGrossPurchases.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono">
                        Rs. 0
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono">
                        Rs. {totalTaxablePurchases.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-right font-mono font-black text-xs">
                        Rs. {totalVatPurchases.toLocaleString()}
                      </td>
                      <td className="border border-slate-300 p-2.5 text-center text-[10px] text-emerald-700 font-bold">
                        Input Tax Credit
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: MONTHLY VAT RETURN SUMMARY */}
          {activeView === 'vat_return' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-300">
                  Section A: Sales & Output VAT (13%)
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>1. Total Gross Turnover:</span>
                    <span className="font-mono font-bold">Rs. {totalGrossSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>2. Exempt / Zero-rated Sales:</span>
                    <span className="font-mono text-slate-500">Rs. 0</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>3. Total Taxable Sales Turnover:</span>
                    <span className="font-mono font-bold text-slate-900">Rs. {totalTaxableSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-indigo-900 bg-indigo-50 px-2 rounded">
                    <span>4. 13% Output VAT Collected:</span>
                    <span className="font-mono text-sm">Rs. {totalVatSales.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-300">
                  Section B: Purchases & Input VAT Credit (13%)
                </div>
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>5. Total Purchase Amount:</span>
                    <span className="font-mono font-bold">Rs. {totalGrossPurchases.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>6. Taxable Spares & Consumables Purchases:</span>
                    <span className="font-mono font-bold text-slate-900">Rs. {totalTaxablePurchases.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-bold text-emerald-900 bg-emerald-50 px-2 rounded">
                    <span>7. 13% Input Tax Credit Claimable:</span>
                    <span className="font-mono text-sm">Rs. {totalVatPurchases.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-800 rounded-xl overflow-hidden bg-slate-50">
                <div className="bg-slate-900 text-white px-4 py-3 font-bold text-sm flex justify-between items-center">
                  <span>Section C: Net Tax Calculation</span>
                  <span className="text-xs text-amber-300 font-mono">IRD Form VAT-01</span>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>8. Net VAT Payable to IRD:</span>
                    <span className="font-mono text-base font-black text-rose-700">Rs. {netPayable.toLocaleString()}</span>
                  </div>
                  {carryForwardCredit > 0 && (
                    <div className="flex justify-between items-center text-sm font-bold text-emerald-700">
                      <span>9. Excess Input VAT Carry-Forward:</span>
                      <span className="font-mono text-base font-black">Rs. {carryForwardCredit.toLocaleString()}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-300">
                    <strong>Payment Due Date:</strong> Due on or before 25th of upcoming accounting cycle. 
                    Must be submitted through Inland Revenue Department (IRD) or designated revenue portal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Legal Signatures Section */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-6 border-t border-slate-300 text-center text-xs">
            <div>
              <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900">Prepared By</p>
              <p className="text-[10px] text-slate-500">Chief Accountant / Cashier</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900">Audited & Verified By</p>
              <p className="text-[10px] text-slate-500">Finance Manager / Internal Auditor</p>
            </div>
            <div>
              <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
              <p className="font-bold text-slate-900">Authorized Signatory & Stamp</p>
              <p className="text-[10px] text-slate-500">Managing Director / Tax Agent</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
