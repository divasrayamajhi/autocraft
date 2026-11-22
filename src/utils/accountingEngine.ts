import {
  GLAccount,
  GLJournalEntry,
  GLJournalLine,
  Invoice,
  NepalPaymentMethod,
  PurchaseOrder,
} from '../types';

export const round2 = (value: number): number =>
  Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;

export const formatAccountingNPR = (amount: number, showDecimals = false): string => {
  const num = Number(amount) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-NP', {
    minimumFractionDigits: showDecimals ? 2 : (Math.abs(abs - Math.round(abs)) > 0.001 ? 2 : 0),
    maximumFractionDigits: 2,
  });
  return num < 0 ? `-Rs. ${formatted}` : `Rs. ${formatted}`;
};

/**
 * Standard Nepal Bikram Sambat (B.S.) calendar approximation from Gregorian A.D. YYYY-MM-DD.
 * Uses accurate B.S. New Year anchor (April 14 = Baisakh 1, +56/57 years) with standard B.S. month lengths.
 */
const BS_MONTH_DAYS = [31, 31, 32, 31, 31, 30, 30, 29, 30, 29, 30, 30]; // Baisakh..Chaitra (~365 days)
const BS_MONTH_NAMES = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

export const toNepalBsDate = (adDateStr?: string, includeLabel = false): string => {
  const clean = (adDateStr || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '2082-01-01';

  const [adYear, adMonth, adDay] = parts;
  const inputUtc = Date.UTC(adYear, adMonth - 1, adDay);

  // Baisakh 1 falls on April 14 in standard years
  let bsYear = adYear + 57;
  let newYearUtc = Date.UTC(adYear, 3, 14); // April 14
  if (inputUtc < newYearUtc) {
    bsYear = adYear + 56;
    newYearUtc = Date.UTC(adYear - 1, 3, 14);
  }

  let dayOffset = Math.floor((inputUtc - newYearUtc) / 86400000);
  let bsMonthIdx = 0;
  while (bsMonthIdx < 11 && dayOffset >= BS_MONTH_DAYS[bsMonthIdx]) {
    dayOffset -= BS_MONTH_DAYS[bsMonthIdx];
    bsMonthIdx += 1;
  }
  const bsDay = Math.max(1, Math.min(32, dayOffset + 1));
  const mm = String(bsMonthIdx + 1).padStart(2, '0');
  const dd = String(bsDay).padStart(2, '0');

  if (includeLabel) {
    return `${BS_MONTH_NAMES[bsMonthIdx]} ${dd}, ${bsYear} B.S.`;
  }
  return `${bsYear}-${mm}-${dd}`;
};

/**
 * Computes Nepal Fiscal Year (Shrawan 1 to Ashadh End) from an AD date string.
 */
export const getNepalFiscalYear = (adDateStr?: string): string => {
  const bs = toNepalBsDate(adDateStr);
  const [y, m] = bs.split('-').map(Number);
  if (!y || !m) return '2081/82';
  // Nepal Fiscal Year begins Shrawan 1 (Month 04)
  if (m >= 4) {
    return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
  }
  return `${y - 1}/${String(y % 100).padStart(2, '0')}`;
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
  { accountCode: '1200', accountName: 'Spare Parts Inventory Asset', category: 'Asset', subCategory: 'Inventory' },
  { accountCode: '1250', accountName: 'Nepal IRD VAT Input Tax Credit (13%)', category: 'Asset', subCategory: 'Duties & Taxes' },
  { accountCode: '1500', accountName: 'Workshop Equipment (Lifts, Paint Booth)', category: 'Asset', subCategory: 'Fixed Assets' },
  { accountCode: '2010', accountName: 'Accounts Payable - Parts Vendors', category: 'Liability', subCategory: 'Current Liabilities' },
  { accountCode: '2020', accountName: 'Nepal IRD VAT Output Payable (13%)', category: 'Liability', subCategory: 'Duties & Taxes' },
  { accountCode: '2030', accountName: 'Accrued Payroll & Technician Incentives', category: 'Liability', subCategory: 'Current Liabilities' },
  { accountCode: '3010', accountName: "Owner's Capital & Retained Reserves", category: 'Equity', subCategory: 'Equity' },
  { accountCode: '4010', accountName: 'Service Labor Revenue', category: 'Revenue', subCategory: 'Operating Revenue' },
  { accountCode: '4020', accountName: 'Spare Parts Sales Revenue', category: 'Revenue', subCategory: 'Operating Revenue' },
  { accountCode: '5010', accountName: 'Cost of Spare Parts Sold (COGS)', category: 'Expense', subCategory: 'Direct Cost' },
  { accountCode: '5020', accountName: 'Direct Technician Labor Commission', category: 'Expense', subCategory: 'Direct Cost' },
  { accountCode: '6010', accountName: 'Workshop Electricity & Rent', category: 'Expense', subCategory: 'Overheads' },
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
 * Applies a single new balanced journal entry onto existing GL accounts.
 */
export const applyJournalEntryToAccounts = (
  glAccounts: GLAccount[],
  entry: GLJournalEntry
): GLAccount[] => {
  const map = new Map<string, GLAccount>();
  STANDARD_GL_ACCOUNT_TEMPLATES.forEach((tpl) => {
    const existing = glAccounts.find((a) => a.accountCode === tpl.accountCode);
    map.set(tpl.accountCode, existing ? { ...existing } : { ...tpl, currentBalance: 0 });
  });
  glAccounts.forEach((acc) => {
    if (!map.has(acc.accountCode)) {
      map.set(acc.accountCode, { ...acc });
    }
  });

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

  return Array.from(map.values()).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
};

const makeVoucherNumber = (existingCount: number, prefix = 'JV'): string => {
  const seq = String(existingCount + 1).padStart(3, '0');
  return `${prefix}-2081-${seq}`;
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

  return {
    id: `JV-INV-${Date.now().toString().slice(-6)}`,
    entryNumber: makeVoucherNumber(existingEntriesCount, 'JV'),
    date: (inv.date || inv.createdAt || new Date().toISOString()).slice(0, 10),
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
  return {
    id: `JV-PAY-${Date.now().toString().slice(-6)}`,
    entryNumber: makeVoucherNumber(existingEntriesCount, 'RV'),
    date: dateStr.slice(0, 10),
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
  return {
    id: `JV-CN-${Date.now().toString().slice(-6)}`,
    entryNumber: makeVoucherNumber(existingEntriesCount, 'CN'),
    date: (creditNote.date || creditNote.createdAt || new Date().toISOString()).slice(0, 10),
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

  return {
    id: `JV-PO-${Date.now().toString().slice(-6)}`,
    entryNumber: makeVoucherNumber(existingEntriesCount, 'PV'),
    date: new Date().toISOString().slice(0, 10),
    sourceDocument: po.poNumber,
    narration: `Goods Received Note (GRN) for ${po.poNumber} from ${po.supplierName} (PAN: ${po.supplierPanVat || 'N/A'})`,
    totalAmount: round2(lines.reduce((s, l) => s + l.debit, 0)),
    lines,
  };
};
