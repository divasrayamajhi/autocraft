import React, { useState, useEffect } from 'react';
import {
  CompanyBillingDetails,
  Customer,
  JobCard,
  NepalPaymentMethod,
} from '../../types';
import {
  Building2,
  User,
  FileText,
  X,
  CheckCircle2,
  MapPin,
  Phone,
  Hash,
  Percent,
} from 'lucide-react';
import { formatAccountingNPR, round2 } from '../../utils/accountingEngine';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

export interface TaxInvoiceGenerationOptions {
  companyBilling?: CompanyBillingDetails;
  paymentMethod?: NepalPaymentMethod;
  customerPan?: string;
  customerAddress?: string;
  onlyUnbilledItems?: boolean;
  discountType?: 'percent' | 'amount';
  discountValue?: number;
}

interface GenerateTaxInvoiceModalProps {
  isOpen: boolean;
  jobCard: JobCard | null;
  customer?: Customer;
  onlyUnbilledItems?: boolean;
  previousPaidInvoiceNumber?: string;
  onClose: () => void;
  onConfirm: (jobCard: JobCard, options: TaxInvoiceGenerationOptions) => void;
}

export const GenerateTaxInvoiceModal: React.FC<GenerateTaxInvoiceModalProps> = ({
  isOpen,
  jobCard,
  customer,
  onlyUnbilledItems = false,
  previousPaidInvoiceNumber,
  onClose,
  onConfirm,
}) => {
  const [billToCompany, setBillToCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyPanVat, setCompanyPanVat] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  const [individualPan, setIndividualPan] = useState('');
  const [individualAddress, setIndividualAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<NepalPaymentMethod>('Fonepay');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !jobCard) return;
    const existingPan = jobCard.customerPan || customer?.panVatNumber || '';
    const existingAddress = customer?.address || '';
    const isCorporateCustomer =
      customer?.customerType === 'Corporate' || customer?.customerType === 'Fleet';

    setBillToCompany(Boolean(isCorporateCustomer));
    setCompanyName(isCorporateCustomer ? customer?.name || jobCard.customerName || '' : '');
    setCompanyPanVat(existingPan);
    setCompanyAddress(existingAddress);
    setCompanyPhone(customer?.phone || jobCard.customerPhone || '');
    setIndividualPan(existingPan);
    setIndividualAddress(existingAddress);
    setPaymentMethod('Fonepay');
    setDiscountType('percent');
    setDiscountValue(0);
    setErrorMsg('');
  }, [isOpen, jobCard, customer]);

  useEscapeKey(isOpen, onClose);

  if (!isOpen || !jobCard) return null;

  const billedPartSet = new Set(jobCard.billedPartIds || []);
  const billedLaborSet = new Set(jobCard.billedLaborIds || []);
  const allParts = jobCard.partsRequested || jobCard.partsItems || [];
  const allLabor = jobCard.laborItems || [];
  const rawParts = onlyUnbilledItems ? allParts.filter((p) => !billedPartSet.has(p.id)) : allParts;
  const rawLabor = onlyUnbilledItems ? allLabor.filter((l) => !billedLaborSet.has(l.id)) : allLabor;
  const partsSubtotal = round2(
    rawParts.reduce(
      (acc, p) =>
        acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))),
      0
    )
  );
  const laborSubtotal = round2(
    rawLabor.reduce(
      (acc, l) => acc + (l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour ?? 0))),
      0
    )
  );
  const grossSubtotal = round2(partsSubtotal + laborSubtotal);
  const safeDiscVal = Math.max(0, Number(discountValue) || 0);
  const clampedDiscVal =
    discountType === 'percent' ? Math.min(100, safeDiscVal) : Math.min(grossSubtotal, safeDiscVal);
  const discountAmount =
    discountType === 'percent'
      ? round2((grossSubtotal * clampedDiscVal) / 100)
      : round2(clampedDiscVal);
  const taxableAmount = round2(Math.max(0, grossSubtotal - discountAmount));
  const vatAmount = round2(taxableAmount * 0.13);
  const grandTotal = round2(taxableAmount + vatAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (billToCompany) {
      if (!companyName.trim()) {
        setErrorMsg('Please enter the Company Name for corporate tax billing.');
        return;
      }
      if (!companyPanVat.trim()) {
        setErrorMsg('Please enter the Company VAT / PAN Number.');
        return;
      }
      if (!companyAddress.trim()) {
        setErrorMsg('Please enter the Company Address.');
        return;
      }
      if (!companyPhone.trim()) {
        setErrorMsg('Please enter the Company Phone Number.');
        return;
      }

      onConfirm(jobCard, {
        companyBilling: {
          isCompanyBill: true,
          companyName: companyName.trim(),
          panVatNumber: companyPanVat.trim(),
          address: companyAddress.trim(),
          phone: companyPhone.trim(),
        },
        paymentMethod,
        onlyUnbilledItems,
        discountType,
        discountValue: clampedDiscVal,
      });
    } else {
      onConfirm(jobCard, {
        companyBilling: {
          isCompanyBill: false,
          companyName: '',
          panVatNumber: '',
          address: '',
          phone: '',
        },
        customerPan: individualPan.trim() || undefined,
        customerAddress: individualAddress.trim() || undefined,
        paymentMethod,
        onlyUnbilledItems,
        discountType,
        discountValue: clampedDiscVal,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-xl w-full border border-[#E2E8F0] overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0F3D5E] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Generate IRD Tax Invoice (13% VAT)</h3>
              <p className="text-[11px] text-sky-200 font-mono">
                {jobCard.jobCardNumber} • {jobCard.vehicle?.registrationNumber} ({jobCard.vehicle?.brand} {jobCard.vehicle?.model})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sky-200 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {onlyUnbilledItems && (
            <div className="bg-emerald-50 border border-emerald-200 text-[#16A34A] px-3.5 py-2.5 rounded-lg text-[11px] font-medium">
              <strong>Separate Supplementary Invoice:</strong> Earlier Paid Invoice{' '}
              <span className="font-mono font-bold">{previousPaidInvoiceNumber || ''}</span> remains fully Paid and untouched. This separate invoice bills only the{' '}
              <strong>{rawLabor.length} new labor</strong> and <strong>{rawParts.length} new part</strong> item(s) added after re-opening.
            </div>
          )}

          {/* Financial Preview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Labor</span>
              <span className="font-mono font-bold text-[#0F172A] tabular-nums">
                {formatAccountingNPR(laborSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Spares</span>
              <span className="font-mono font-bold text-[#0F172A] tabular-nums">
                {formatAccountingNPR(partsSubtotal)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#0284C7] uppercase block">13% VAT</span>
              <span className="font-mono font-bold text-[#0284C7] tabular-nums">
                {formatAccountingNPR(vatAmount)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#0F3D5E] uppercase block">Grand Total</span>
              <span className="font-mono font-extrabold text-[#0F3D5E] tabular-nums text-sm">
                {formatAccountingNPR(grandTotal)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="col-span-2 sm:col-span-4 pt-2 border-t border-[#CBD5E1] flex items-center justify-between text-[11px]">
                <span className="text-[#DC2626] font-semibold">
                  Discount Applied ({discountType === 'percent' ? `${clampedDiscVal}%` : 'Fixed Amount'}):
                </span>
                <span className="font-mono font-bold text-[#DC2626]">
                  - {formatAccountingNPR(discountAmount)} (Taxable: {formatAccountingNPR(taxableAmount)})
                </span>
              </div>
            )}
          </div>

          {grandTotal <= 0.01 && (
            <div className="bg-emerald-50 border border-emerald-200 text-[#16A34A] px-3.5 py-2 rounded-lg text-[11px] font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                Free Service — Rs. 0 Payable. This invoice will be automatically marked <strong>Paid</strong> upon generation.
              </span>
            </div>
          )}

          {/* Billing Entity Switcher */}
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
              Bill In The Name Of
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setBillToCompany(false);
                  setErrorMsg('');
                }}
                className={`p-3 rounded-lg border text-left transition flex items-start space-x-2.5 ${
                  !billToCompany
                    ? 'bg-sky-50 border-[#0EA5E9] ring-1 ring-[#0EA5E9]'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <User
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    !billToCompany ? 'text-[#0284C7]' : 'text-[#64748B]'
                  }`}
                />
                <div>
                  <div className="font-bold text-[#0F172A]">Individual Customer</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    Bill in vehicle owner&apos;s name ({jobCard.customerName})
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBillToCompany(true);
                  setErrorMsg('');
                }}
                className={`p-3 rounded-lg border text-left transition flex items-start space-x-2.5 ${
                  billToCompany
                    ? 'bg-sky-50 border-[#0EA5E9] ring-1 ring-[#0EA5E9]'
                    : 'bg-[#FFFFFF] border-[#E2E8F0] hover:bg-[#F8FAFC]'
                }`}
              >
                <Building2
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    billToCompany ? 'text-[#0284C7]' : 'text-[#64748B]'
                  }`}
                />
                <div>
                  <div className="font-bold text-[#0F172A]">Bill in Company Name</div>
                  <div className="text-[10px] text-[#64748B] mt-0.5">
                    Add Company Name, VAT/PAN, Address &amp; Phone
                  </div>
                </div>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-[#DC2626] px-3 py-2 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Individual Details OR Company Billing Details */}
          {billToCompany ? (
            <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <div className="flex items-center space-x-1.5 text-[#0F3D5E] font-bold">
                  <Building2 className="w-4 h-4 text-[#0284C7]" />
                  <span>Company VAT / PAN Billing Details</span>
                </div>
                <span className="text-[10px] text-[#64748B]">
                  Vehicle Owner: <strong className="text-[#0F172A]">{jobCard.customerName}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Company Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Himalayan Traders & Logistics Pvt. Ltd."
                      className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Company VAT / PAN Number <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyPanVat}
                      onChange={(e) => setCompanyPanVat(e.target.value)}
                      placeholder="e.g. 601234567"
                      className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Company Phone Number <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="e.g. +977-1-4220192"
                      className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      required
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Company Address <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="e.g. Durbar Marg, Ward No. 1, Kathmandu, Nepal"
                      className="w-full pl-8 pr-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#0F172A]">{jobCard.customerName}</div>
                  <div className="text-[11px] text-[#64748B] font-mono">{jobCard.customerPhone}</div>
                </div>
                <span className="px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded text-[10px] font-semibold">
                  Individual Consumer Bill
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Buyer PAN (Optional)
                  </label>
                  <input
                    type="text"
                    value={individualPan}
                    onChange={(e) => setIndividualPan(e.target.value)}
                    placeholder="Optional 9-digit PAN"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={individualAddress}
                    onChange={(e) => setIndividualAddress(e.target.value)}
                    placeholder="City / Street address"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Discount Option (% or Amount) & Payment Method Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#0F172A] mb-1 flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Invoice Discount (% or NPR)</span>
              </label>
              <div className="flex items-stretch space-x-1.5">
                <div className="inline-flex rounded-lg border border-[#CBD5E1] bg-white p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percent');
                      setDiscountValue((v) => Math.min(100, Math.max(0, v)));
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      discountType === 'percent'
                        ? 'bg-[#0F3D5E] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('amount')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      discountType === 'amount'
                        ? 'bg-[#0F3D5E] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    NPR
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : undefined}
                  step="any"
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    if (isNaN(parsed) || parsed < 0) {
                      setDiscountValue(0);
                    } else {
                      setDiscountValue(discountType === 'percent' ? Math.min(100, parsed) : parsed);
                    }
                  }}
                  placeholder={discountType === 'percent' ? '0%' : '0 NPR'}
                  className="w-full px-3 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono font-bold text-[#0F172A] outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#0F172A] mb-1">
                Expected / Preferred Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as NepalPaymentMethod)}
                className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-medium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              >
                <option value="Fonepay">Fonepay QR</option>
                <option value="Cash">Cash</option>
                <option value="NepalPay">NepalPay / connectIPS</option>
                <option value="Bank Transfer">Bank Transfer / Cheque</option>
                <option value="eSewa">eSewa</option>
                <option value="Khalti">Khalti</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E2E8F0] text-[#0F172A] rounded-lg font-semibold hover:bg-[#F1F5F9] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg font-bold flex items-center space-x-1.5 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Generate Official IRD Tax Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
