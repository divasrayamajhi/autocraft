import {
  CashierVoucher,
  GLAccount,
  GLJournalEntry,
  GLJournalLine,
  Invoice,
  NepalPaymentMethod,
  PurchaseOrder,
} from '../types';
import { adToBs, getNepalFiscalYearFromAd } from './nepaliDate';

export const round2 = (value: number): number =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

let _idCounter = 0;

/**
 * Collision-proof unique identifier generator for high-volume concurrent / batch transactions.
 * Eliminates `Date.now().slice(-6)` collisions when multiple records are created within the same millisecond.
 */
export const generateUniqueId = (prefix: string): string => {
  _idCounter = (_idCounter + 1) % 1000000;
  const ts = Date.now().toString(36).toUpperCase();
  const seq = String(_idCounter).padStart(4, '0');
  const rnd = Math.floor(Math.random() * 1296)
    .toString(36)
    .toUpperCase()
    .padStart(2, '0');
  return `${prefix}-${ts}-${seq}${rnd}`;
};

/**
 * Generates strictly sequential, globally unique IRD-compliant document numbers
 * (e.g. TAX-83-00001, OTC-83-00001, CN-83-00001, GP-83-00001).
 * Eliminates 4-digit Math.random() invoice number collisions under high annual volume.
 */
export const getNextSequentialDocNumber = (
  existingNumbers: Iterable<string | undefined>,
  prefix: string,
  fiscalYear: string,
  padLength = 5
): string => {
  const fyShort = (fiscalYear || '2083/84').replace(/[^0-9]/g, '').slice(2, 4) || '83';
  const base = `${prefix}-${fyShort}-`;
  let maxSeq = 0;
  const existingSet = new Set<string>();

  for (const raw of existingNumbers) {
    if (!raw) continue;
    const upper = raw.toUpperCase();
    existingSet.add(upper);
    if (upper.startsWith(base.toUpperCase())) {
      const tail = upper.slice(base.length);
      if (/^\d+$/.test(tail)) {
        const parsed = parseInt(tail, 10);
        if (parsed > maxSeq) maxSeq = parsed;
      }
    }
  }

  let next = maxSeq + 1;
  let candidate = `${base}${String(next).padStart(padLength, '0')}`;
  while (existingSet.has(candidate.toUpperCase())) {
    next += 1;
    candidate = `${base}${String(next).padStart(padLength, '0')}`;
  }
  return candidate;
};

/**
 * Free Car Service waives labor charges ONLY for Periodic Maintenance Service (PMS) - 45-Point Checkup.
 * All other labor tasks (brake overhaul, clutch, AC, alignment, dent/paint, custom jobs) remain billable.
 */
export const isFreeServicePmsLabor = (code?: string, name?: string): boolean => {
  const cleanCode = (code || '').trim().toUpperCase();
  if (cleanCode === 'SRV-GEN-PMS') return true;
  const cleanName = (name || '').trim().toLowerCase();
  if (!cleanName) return false;
  return (
    (cleanName.includes('periodic maintenance service') && (cleanName.includes('pms') || cleanName.includes('45-point') || cleanName.includes('45 point'))) ||
    (cleanName.includes('pms') && (cleanName.includes('45-point') || cleanName.includes('45 point')))
  );
};

export const formatAccountingNPR = (amount: number, showDecimals = false): string => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-NP', {
    minimumFractionDigits: showDecimals ? 2 : (Math.abs(abs - Math.round(abs)) > 0.001 ? 2 : 0),
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-Rs. ${formatted}` : `Rs. ${formatted}`;
};

export const toNepalBsDate = (adDateStr?: string, includeLabel = false): string => {
  const bs = adToBs(adDateStr);
  return includeLabel ? bs.fullLabel : bs.formatted;
};

/**
 * Computes Nepal Fiscal Year (Shrawan 1 to Ashadh End) from an AD date string.
 */
export const getNepalFiscalYear = (adDateStr?: string): string => {
  return getNepalFiscalYearFromAd(adDateStr);
};

/**
 * Nepal VAT Act 2052 Section 17 & Rule 39:
 * Input Tax Credit (ITC) is ONLY claimable on Received / Billed supplier tax invoices.
 * Draft, Ordered, Pending, or Cancelled Purchase Orders are NOT eligible for ITC.
 */
export const isPurchaseOrderItcEligible = (po: PurchaseOrder): boolean => {
  const st = (po.status || '').toLowerCase();
  return st === 'received' || st === 'billed' || st === 'partially received';
};

export const isCreditNoteInvoice = (inv: Invoice): boolean => {
  return (
    inv.type === 'Credit Note' ||
    (inv.grandTotal ?? 0) < 0 ||
    (inv.invoiceNumber || '').toUpperCase().startsWith('CN-')
  );
};

export const isInvoiceSyncedToCbms = (inv: Invoice): boolean => {
  return Boolean(inv.irdSyncDetails?.isSynced || inv.irdCompliance?.isTransmittedToCbms);
};

export const getCashBankAccountForMethod = (
  method?: string
): { accountCode: string; accountName: string } => {
  const m = (method || '').toLowerCase();
  if (m.includes('cash')) {
    return { accountCode: '1010', accountName: 'Cash in Hand (Cashier Drawer)' };
  }
  if (m.includes('fonepay')) {
    return { accountCode: '1030', accountName: 'Fonepay Settlement Clearing Account' };
  }
  if (m.includes('nepalpay') || m.includes('connectips') || m.includes('esewa') || m.includes('khalti')) {
    return { accountCode: '1040', accountName: 'NCHL NepalPay / connectIPS Clearing' };
  }
  return { accountCode: '1020', accountName: 'Nabil Bank Ltd. - Current Account' };
};

export const STANDARD_GL_ACCOUNT_TEMPLATES: Omit<GLAccount, 'currentBalance'>[] = [
  { accountCode: '1010', accountName: 'Cash in Hand (Cashier Drawer)', category: 'Asset', subCategory: 'Current Assets' },
  { accountCode: '1020', accountName: 'Nabil Bank Ltd. - Current Account', category: 'Asset', subCategory: 'Bank Accounts' },
  { accountCode: '1030', accountName: 'Fonepay Settlement Clearing Account', category: 'Asset', subCategory: 'Payment Gateway Clearing' },
  { accountCode: '1040', accountName: 'NCHL NepalPay / connectIPS Clearing', category: 'Asset', subCategory: 'Payment Gateway Clearing' },
  { accountCode: '1100', accountName: 'Accounts Receivable - Trade Debtors', category: 'Asset', subCategory: 'Current Assets' },
  { accountCode: '1150', accountName: 'Staff & Supplier Advances', category: 'Asset', subCategory: 'Current Assets' },
  { accountCode: '1200', accountName: 'Spare Parts Inventory Asset', category: 'Asset', subCategory: 'Inventory' },
  { accountCode: '1250', accountName: 'Nepal IRD VAT Input Tax Credit (13%)', category: 'Asset', subCategory: 'Duties & Taxes' },
  { accountCode: '1500', accountName: 'Workshop Equipment (Lifts, Paint Booth)', category: 'Asset', subCategory: 'Fixed Assets' },
  { accountCode: '2010', accountName: 'Accounts Payable - Parts Vendors', category: 'Liability', subCategory: 'Current Liabilities' },
  { accountCode: '2020', accountName: 'Nepal IRD VAT Output Payable (13%)', category: 'Liability', subCategory: 'Duties & Taxes' },
  { accountCode: '2030', accountName: 'Accrued Payroll & Technician Incentives', category: 'Liability', subCategory: 'Current Liabilities' },
  { accountCode: '2040', accountName: 'Customer Advances & Booking Deposits', category: 'Liability', subCategory: 'Current Liabilities' },
  { accountCode: '3010', accountName: "Owner's Capital & Retained Reserves", category: 'Equity', subCategory: 'Equity' },
  { accountCode: '4010', accountName: 'Service Labor Revenue', category: 'Revenue', subCategory: 'Operating Revenue' },
  { accountCode: '4020', accountName: 'Spare Parts Sales Revenue', category: 'Revenue', subCategory: 'Operating Revenue' },
  { accountCode: '4090', accountName: 'Miscellaneous & Scrap Income', category: 'Revenue', subCategory: 'Other Income' },
  { accountCode: '5010', accountName: 'Cost of Spare Parts Sold (COGS)', category: 'Expense', subCategory: 'Direct Cost' },
  { accountCode: '5020', accountName: 'Direct Technician Labor Commission', category: 'Expense', subCategory: 'Direct Cost' },
  { accountCode: '6010', accountName: 'Workshop Electricity & Rent', category: 'Expense', subCategory: 'Overheads' },
  { accountCode: '6020', accountName: 'Petty Cash & Workshop Operating Expenses', category: 'Expense', subCategory: 'Overheads' },
  { accountCode: '6090', accountName: 'Invoice Rounding Adjustment', category: 'Expense', subCategory: 'Overheads' },
];

/**
 * Recomputes GL Account balances cleanly from a list of Double-Entry Journal Entries.
 * Guarantees Trial Balance (Debits === Credits) and Balance Sheet reconciliation.
 */
export const recomputeGlBalancesFromJournal = (
  baseAccounts: GLAccount[],
  entries: GLJournalEntry[]
): GLAccount[] => {
  const map = new Map<string, GLAccount>();

  // Ensure standard control accounts exist
  STANDARD_GL_ACCOUNT_TEMPLATES.forEach((tpl) => {
    map.set(tpl.accountCode, { ...tpl, currentBalance: 0 });
  });
  // Preserve any custom accounts added by user
  baseAccounts.forEach((acc) => {
    map.set(acc.accountCode, { ...acc, currentBalance: 0 });
  });

  entries.forEach((entry) => {
    (entry.lines || []).forEach((line) => {
      let acc = map.get(line.accountCode);
      if (!acc) {
        const inferredCat: GLAccount['category'] =
          line.accountCode.startsWith('1') ? 'Asset' :
          line.accountCode.startsWith('2') ? 'Liability' :
          line.accountCode.startsWith('3') ? 'Equity' :
          line.accountCode.startsWith('4') ? 'Revenue' : 'Expense';
        acc = {
          accountCode: line.accountCode,
          accountName: line.accountName,
          category: inferredCat,
          subCategory: 'General',
          currentBalance: 0,
        };
        map.set(line.accountCode, acc);
      }

      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (acc.category === 'Asset' || acc.category === 'Expense') {
        acc.currentBalance = round2(acc.currentBalance + debit - credit);
      } else {
        acc.currentBalance = round2(acc.currentBalance + credit - debit);
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
};

/**
 * Applies a single new balanced journal entry onto existing GL accounts in O(A + L).
 */
export const applyJournalEntryToAccounts = (
  glAccounts: GLAccount[],
  entry: GLJournalEntry
): GLAccount[] => {
  const existingMap = new Map<string, GLAccount>();
  glAccounts.forEach((acc) => existingMap.set(acc.accountCode, { ...acc }));

  STANDARD_GL_ACCOUNT_TEMPLATES.forEach((tpl) => {
    if (!existingMap.has(tpl.accountCode)) {
      existingMap.set(tpl.accountCode, { ...tpl, currentBalance: 0 });
    }
  });

  (entry.lines || []).forEach((line) => {
    let acc = existingMap.get(line.accountCode);
    if (!acc) {
      const inferredCat: GLAccount['category'] =
        line.accountCode.startsWith('1') ? 'Asset' :
        line.accountCode.startsWith('2') ? 'Liability' :
        line.accountCode.startsWith('3') ? 'Equity' :
        line.accountCode.startsWith('4') ? 'Revenue' : 'Expense';
      acc = {
        accountCode: line.accountCode,
        accountName: line.accountName,
        category: inferredCat,
        subCategory: 'General',
        currentBalance: 0,
      };
      existingMap.set(line.accountCode, acc);
    }

    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if (acc.category === 'Asset' || acc.category === 'Expense') {
      acc.currentBalance = round2(acc.currentBalance + debit - credit);
    } else {
      acc.currentBalance = round2(acc.currentBalance + credit - debit);
    }
  });

  return Array.from(existingMap.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
};

const makeVoucherNumber = (existingCount: number, prefix = 'JV', adDateStr?: string): string => {
  const fyYear = getNepalFiscalYear(adDateStr).slice(0, 4) || '2083';
  const seq = String(existingCount + 1).padStart(5, '0');
  return `${prefix}-${fyYear}-${seq}`;
};

/**
 * Builds a balanced Double-Entry Journal Voucher for a Sales Tax Invoice.
 * Dr Accounts Receivable (1100) [or Cash/Bank if settled immediately]
 *   Cr Service Labor Revenue (4010)
 *   Cr Spare Parts Sales Revenue (4020)
 *   Cr Nepal IRD VAT Output Payable 13% (2020)
 */
export const buildInvoiceJournalEntry = (
  inv: Invoice,
  existingEntriesCount: number
): GLJournalEntry | null => {
  const grandTotal = round2(inv.grandTotal || 0);
  if (grandTotal <= 0) return null;

  const taxableTotal = round2(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0);
  const vatTotal = round2(inv.vatAmount ?? inv.totalVatAmount ?? 0);

  let laborTaxable = 0;
  let partsTaxable = 0;
  if (inv.laborTaxableAmount !== undefined || inv.partsTaxableAmount !== undefined) {
    laborTaxable = round2(inv.laborTaxableAmount || 0);
    partsTaxable = round2(inv.partsTaxableAmount || 0);
  } else if (Array.isArray(inv.items) && inv.items.length > 0) {
    inv.items.forEach((item) => {
      const amt = round2(item.taxableAmount ?? (item.quantity * item.unitPrice));
      if (item.itemType === 'Labor') laborTaxable = round2(laborTaxable + amt);
      else partsTaxable = round2(partsTaxable + amt);
    });
  } else {
    partsTaxable = taxableTotal;
  }

  // Reconcile revenue split to exact taxableTotal
  const splitSum = round2(laborTaxable + partsTaxable);
  if (Math.abs(splitSum - taxableTotal) > 0.005) {
    const diff = round2(taxableTotal - splitSum);
    if (partsTaxable > 0 || laborTaxable === 0) {
      partsTaxable = round2(partsTaxable + diff);
    } else {
      laborTaxable = round2(laborTaxable + diff);
    }
  }

  const lines: GLJournalLine[] = [];
  const paidAmt = round2(inv.paidAmount ?? inv.amountPaid ?? 0);
  const arAmt = round2(Math.max(0, grandTotal - paidAmt));

  if (paidAmt > 0) {
    const cashAcc = getCashBankAccountForMethod(inv.paymentMethod);
    lines.push({
      accountCode: cashAcc.accountCode,
      accountName: cashAcc.accountName,
      debit: Math.min(paidAmt, grandTotal),
      credit: 0,
    });
  }
  if (arAmt > 0) {
    lines.push({
      accountCode: '1100',
      accountName: 'Accounts Receivable - Trade Debtors',
      debit: arAmt,
      credit: 0,
    });
  }

  if (laborTaxable > 0) {
    lines.push({
      accountCode: '4010',
      accountName: 'Service Labor Revenue',
      debit: 0,
      credit: laborTaxable,
    });
  }
  if (partsTaxable > 0) {
    lines.push({
      accountCode: '4020',
      accountName: 'Spare Parts Sales Revenue',
      debit: 0,
      credit: partsTaxable,
    });
  }
  if (vatTotal > 0) {
    lines.push({
      accountCode: '2020',
      accountName: 'Nepal IRD VAT Output Payable (13%)',
      debit: 0,
      credit: vatTotal,
    });
  }

  // Balancing rounding adjustment line (if grandTotal != taxableTotal + vatTotal)
  const totalDr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(lines.reduce((s, l) => s + l.credit, 0));
  const diff = round2(totalDr - totalCr);
  if (Math.abs(diff) > 0.001) {
    lines.push({
      accountCode: '6090',
      accountName: 'Invoice Rounding Adjustment',
      debit: diff < 0 ? Math.abs(diff) : 0,
      credit: diff > 0 ? diff : 0,
    });
  }

  const balancedTotal = round2(lines.reduce((s, l) => s + l.debit, 0));

  const entryDate = (inv.date || inv.createdAt || new Date().toISOString()).slice(0, 10);

  return {
    id: generateUniqueId('JV-INV'),
    entryNumber: makeVoucherNumber(existingEntriesCount, 'JV', entryDate),
    date: entryDate,
    sourceDocument: inv.invoiceNumber,
    narration: `Sales Invoice ${inv.invoiceNumber} — ${inv.customerName} (${inv.vehicleReg || 'Workshop'}) [Taxable + 13% IRD VAT]`,
    totalAmount: balancedTotal,
    lines,
  };
};

/**
 * Builds a balanced Double-Entry Journal Voucher for a Customer Payment Receipt.
 * Dr Cash / Bank / Fonepay / NepalPay
 *   Cr Accounts Receivable - Trade Debtors (1100)
 */
export const buildPaymentJournalEntry = (
  inv: Invoice,
  amount: number,
  method: NepalPaymentMethod | string,
  reference: string,
  dateStr: string,
  existingEntriesCount: number
): GLJournalEntry | null => {
  const amt = round2(amount);
  if (amt <= 0) return null;

  const cashAcc = getCashBankAccountForMethod(method);
  const entryDate = dateStr.slice(0, 10);
  return {
    id: generateUniqueId('JV-PAY'),
    entryNumber: makeVoucherNumber(existingEntriesCount, 'RV', entryDate),
    date: entryDate,
    sourceDocument: reference || inv.invoiceNumber,
    narration: `Payment receipt via ${method} against ${inv.invoiceNumber} from ${inv.customerName}`,
    totalAmount: amt,
    lines: [
      {
        accountCode: cashAcc.accountCode,
        accountName: cashAcc.accountName,
        debit: amt,
        credit: 0,
      },
      {
        accountCode: '1100',
        accountName: 'Accounts Receivable - Trade Debtors',
        debit: 0,
        credit: amt,
      },
    ],
  };
};

/**
 * Builds a balanced Double-Entry Journal Voucher for an IRD Credit Note / Sales Return.
 * Dr Spare Parts / Service Revenue (4020 / 4010)
 * Dr Nepal IRD VAT Output Payable 13% (2020)
 *   Cr Cash in Hand (1010) or Accounts Receivable (1100)
 */
export const buildCreditNoteJournalEntry = (
  creditNote: Invoice,
  refundViaCash: boolean,
  existingEntriesCount: number
): GLJournalEntry | null => {
  const absGrand = round2(Math.abs(creditNote.grandTotal || 0));
  if (absGrand <= 0) return null;

  const absTaxable = round2(Math.abs(creditNote.taxableAmount ?? creditNote.subTotal ?? round2(absGrand / 1.13)));
  const absVat = round2(Math.abs(creditNote.vatAmount ?? round2(absGrand - absTaxable)));

  const lines: GLJournalLine[] = [
    {
      accountCode: '4020',
      accountName: 'Spare Parts Sales Revenue',
      debit: absTaxable,
      credit: 0,
    },
  ];
  if (absVat > 0) {
    lines.push({
      accountCode: '2020',
      accountName: 'Nepal IRD VAT Output Payable (13%)',
      debit: absVat,
      credit: 0,
    });
  }

  const creditAcc = refundViaCash
    ? getCashBankAccountForMethod(creditNote.paymentMethod || 'Cash')
    : { accountCode: '1100', accountName: 'Accounts Receivable - Trade Debtors' };

  lines.push({
    accountCode: creditAcc.accountCode,
    accountName: creditAcc.accountName,
    debit: 0,
    credit: absGrand,
  });

  const totalDr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(lines.reduce((s, l) => s + l.credit, 0));
  const diff = round2(totalDr - totalCr);
  if (Math.abs(diff) > 0.001) {
    lines.push({
      accountCode: '6090',
      accountName: 'Invoice Rounding Adjustment',
      debit: diff < 0 ? Math.abs(diff) : 0,
      credit: diff > 0 ? diff : 0,
    });
  }

  const balancedTotal = round2(lines.reduce((s, l) => s + l.debit, 0));
  const entryDate = (creditNote.date || creditNote.createdAt || new Date().toISOString()).slice(0, 10);
  return {
    id: generateUniqueId('JV-CN'),
    entryNumber: makeVoucherNumber(existingEntriesCount, 'CN', entryDate),
    date: entryDate,
    sourceDocument: creditNote.invoiceNumber,
    narration: `IRD Credit Note ${creditNote.invoiceNumber} issued to ${creditNote.customerName} (${creditNote.vehicleModel || 'Sales Return'})`,
    totalAmount: balancedTotal,
    lines,
  };
};

/**
 * Builds a balanced Double-Entry Journal Voucher upon receiving a Supplier Purchase Order (GRN).
 * Dr Spare Parts Inventory Asset (1200)
 * Dr Nepal IRD VAT Input Tax Credit 13% (1250)
 *   Cr Accounts Payable - Parts Vendors (2010)
 */
export const buildPurchaseReceiptJournalEntry = (
  po: PurchaseOrder,
  existingEntriesCount: number
): GLJournalEntry | null => {
  const taxable = round2(po.taxableAmount ?? po.subtotal ?? 0);
  const vat = round2(po.vatTotal ?? round2(taxable * 0.13));
  const total = round2(po.totalAmount ?? round2(taxable + vat));
  if (total <= 0) return null;

  const lines: GLJournalLine[] = [
    {
      accountCode: '1200',
      accountName: 'Spare Parts Inventory Asset',
      debit: taxable,
      credit: 0,
    },
  ];
  if (vat > 0) {
    lines.push({
      accountCode: '1250',
      accountName: 'Nepal IRD VAT Input Tax Credit (13%)',
      debit: vat,
      credit: 0,
    });
  }
  lines.push({
    accountCode: '2010',
    accountName: 'Accounts Payable - Parts Vendors',
    debit: 0,
    credit: total,
  });

  const totalDr = round2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCr = round2(lines.reduce((s, l) => s + l.credit, 0));
  const diff = round2(totalDr - totalCr);
  if (Math.abs(diff) > 0.001) {
    lines.push({
      accountCode: '6090',
      accountName: 'Invoice Rounding Adjustment',
      debit: diff < 0 ? Math.abs(diff) : 0,
      credit: diff > 0 ? diff : 0,
    });
  }

  const poDate = (po.date || new Date().toISOString()).slice(0, 10);
  return {
    id: generateUniqueId('JV-PO'),
    entryNumber: makeVoucherNumber(existingEntriesCount, 'PV', poDate),
    date: poDate,
    sourceDocument: po.poNumber,
    narration: `Goods Received Note (GRN) for ${po.poNumber} from ${po.supplierName} (PAN: ${po.supplierPanVat || 'N/A'})`,
    totalAmount: round2(lines.reduce((s, l) => s + l.debit, 0)),
    lines,
  };
};

export interface CashbookAccountHeadOption {
  label: string;
  glAccountCode: string;
  glAccountName: string;
  allowedFor: 'Cash In' | 'Cash Out' | 'Both';
}

export const CASHBOOK_ACCOUNT_HEADS: CashbookAccountHeadOption[] = [
  // Cash In (Receipt) Heads
  { label: 'Sales / Service Cash Receipt', glAccountCode: '4010', glAccountName: 'Service Labor Revenue', allowedFor: 'Cash In' },
  { label: 'Counter Spares Cash Sale', glAccountCode: '4020', glAccountName: 'Spare Parts Sales Revenue', allowedFor: 'Cash In' },
  { label: 'Customer Advance / Booking Deposit', glAccountCode: '2040', glAccountName: 'Customer Advances & Booking Deposits', allowedFor: 'Cash In' },
  { label: 'Debtors Recovery (AR Settlement)', glAccountCode: '1100', glAccountName: 'Accounts Receivable - Trade Debtors', allowedFor: 'Cash In' },
  { label: 'Bank Withdrawal / Drawer Float Top-Up', glAccountCode: '1020', glAccountName: 'Nabil Bank Ltd. - Current Account', allowedFor: 'Cash In' },
  { label: 'Scrap / Miscellaneous Cash Income', glAccountCode: '4090', glAccountName: 'Miscellaneous & Scrap Income', allowedFor: 'Cash In' },
  { label: 'Staff Advance Recovery', glAccountCode: '1150', glAccountName: 'Staff & Supplier Advances', allowedFor: 'Cash In' },
  { label: 'Owner Capital / Cash Injection', glAccountCode: '3010', glAccountName: "Owner's Capital & Retained Reserves", allowedFor: 'Cash In' },

  // Cash Out (Payment) Heads
  { label: 'Workshop Expense / Petty Cash', glAccountCode: '6020', glAccountName: 'Petty Cash & Workshop Operating Expenses', allowedFor: 'Cash Out' },
  { label: 'Electricity, Water & Facility Rent', glAccountCode: '6010', glAccountName: 'Workshop Electricity & Rent', allowedFor: 'Cash Out' },
  { label: 'Staff Advance / Petty Imprest', glAccountCode: '1150', glAccountName: 'Staff & Supplier Advances', allowedFor: 'Cash Out' },
  { label: 'Staff Salary / Technician Incentive', glAccountCode: '2030', glAccountName: 'Accrued Payroll & Technician Incentives', allowedFor: 'Cash Out' },
  { label: 'Supplier / Parts Vendor Payment (AP)', glAccountCode: '2010', glAccountName: 'Accounts Payable - Parts Vendors', allowedFor: 'Cash Out' },
  { label: 'Cash Parts Purchase (Local Market)', glAccountCode: '1200', glAccountName: 'Spare Parts Inventory Asset', allowedFor: 'Cash Out' },
  { label: 'Bank Cash Deposit (Counter to Bank)', glAccountCode: '1020', glAccountName: 'Nabil Bank Ltd. - Current Account', allowedFor: 'Cash Out' },
  { label: 'Customer Advance Refund', glAccountCode: '2040', glAccountName: 'Customer Advances & Booking Deposits', allowedFor: 'Cash Out' },
  { label: 'Owner Drawings / Cash Withdrawal', glAccountCode: '3010', glAccountName: "Owner's Capital & Retained Reserves", allowedFor: 'Cash Out' },
];

/**
 * Builds a balanced Double-Entry Journal Voucher for a Cashier Daybook Cash In (Receipt) or Cash Out (Payment).
 * - Cash In:  Dr 1010 Cash in Hand, Cr Mapped Account Head
 * - Cash Out: Dr Mapped Account Head, Cr 1010 Cash in Hand
 */
export const buildCashierVoucherJournalEntry = (
  voucher: CashierVoucher,
  existingEntriesCount: number
): GLJournalEntry | null => {
  const amt = round2(Math.abs(Number(voucher.amount) || 0));
  if (amt <= 0) return null;

  const matchedHead = CASHBOOK_ACCOUNT_HEADS.find(
    (h) =>
      (voucher.glAccountCode && h.glAccountCode === voucher.glAccountCode) ||
      h.label.toLowerCase() === (voucher.accountHead || '').toLowerCase()
  );

  const counterCode =
    voucher.glAccountCode ||
    matchedHead?.glAccountCode ||
    (voucher.transactionType === 'Cash In' ? '4090' : '6020');

  const counterName =
    matchedHead?.glAccountName ||
    STANDARD_GL_ACCOUNT_TEMPLATES.find((t) => t.accountCode === counterCode)?.accountName ||
    voucher.accountHead;

  const isCashIn = voucher.transactionType === 'Cash In';
  const lines: GLJournalLine[] = isCashIn
    ? [
        {
          accountCode: '1010',
          accountName: 'Cash in Hand (Cashier Drawer)',
          debit: amt,
          credit: 0,
        },
        {
          accountCode: counterCode,
          accountName: counterName,
          debit: 0,
          credit: amt,
        },
      ]
    : [
        {
          accountCode: counterCode,
          accountName: counterName,
          debit: amt,
          credit: 0,
        },
        {
          accountCode: '1010',
          accountName: 'Cash in Hand (Cashier Drawer)',
          debit: 0,
          credit: amt,
        },
      ];

  const partyPrefix = isCashIn ? 'Received from' : 'Paid to';
  const entryDate = (voucher.transactionDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
  return {
    id: generateUniqueId('JV-CB'),
    entryNumber: makeVoucherNumber(existingEntriesCount, isCashIn ? 'CRV' : 'CPV', entryDate),
    date: entryDate,
    sourceDocument: voucher.voucherNumber,
    narration: `${voucher.transactionType} (${voucher.accountHead}) — ${partyPrefix} ${voucher.partyName}: ${voucher.particulars}${
      voucher.referenceNumber ? ` [Ref: ${voucher.referenceNumber}]` : ''
    }`,
    totalAmount: amt,
    lines,
  };
};
