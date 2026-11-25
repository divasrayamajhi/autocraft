import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppDatabase } from './storageService';
import {
  Appointment,
  CashierVoucher,
  Customer,
  GatePass,
  GLAccount,
  GLJournalEntry,
  InsuranceClaim,
  Invoice,
  JobCard,
  PartsQuotation,
  PartsSalesOrder,
  PartsSalesReturn,
  PurchaseOrder,
  ReadyNotificationLog,
  ServicePriceItem,
  SparePart,
  Technician,
  UserAccount,
  VatLedgerEntry,
  WarrantyClaim,
  WarrantyRecord,
  WorkshopBay,
  WorkshopProfile,
} from '../types';

export const COLLECTIONS = {
  workshopProfiles: 'workshop_profiles',
  staffAccounts: 'staff_accounts',
  workshopMasters: 'workshop_masters',
  customers: 'customers',
  spareParts: 'spare_parts',
  jobCards: 'job_cards',
  appointments: 'appointments',
  invoices: 'invoices',
  gatePasses: 'gate_passes',
  partsOperations: 'parts_operations',
  accountingRecords: 'accounting_records',
  warrantyAndNotifications: 'warranty_and_notifications',
} as const;

type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

const VALID_ROLES = new Set([
  'Admin',
  'Service Advisor',
  'Billing Cashier',
  'Parts Manager',
  'Technician',
]);

const VALID_INVOICE_STATUSES = new Set(['Paid', 'Partially Paid', 'Unpaid', 'Voided']);
const VALID_GATE_PASS_STATUSES = new Set(['Cleared for Exit', 'Exited', 'On Hold']);

/**
 * Verbatim enforcement of blueprint pattern `^[a-zA-Z0-9_\\-]+$` and maxLength 128.
 */
export const toSafeDocId = (prefix: string, rawId: string): string => {
  const cleaned = String(rawId || 'item')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 96);
  const combined = `${prefix}_${cleaned || 'doc'}`;
  return combined.slice(0, 128);
};

const clampString = (value: unknown, maxLen: number, fallback = ''): string => {
  const str = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  const effective = str.length > 0 ? str : fallback;
  return effective.slice(0, maxLen);
};

const toSafeNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Recursively removes undefined values and non-finite numbers so native Firestore Maps/Lists
 * never fail serialization. Never uses JSON.stringify for storage.
 */
const sanitizeForFirestore = (input: unknown): unknown => {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (typeof input === 'string' || typeof input === 'boolean') return input;
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item));
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
      if (val !== undefined) {
        out[key] = sanitizeForFirestore(val);
      }
    }
    return out;
  }
  return String(input);
};

interface PreparedDoc {
  collectionName: CollectionName;
  docId: string;
  fields: Record<string, unknown>; // Excludes ownerUid, createdAt, updatedAt
  fingerprint: string;
}

const buildAllPreparedDocs = (uid: string, state: AppDatabase): PreparedDoc[] => {
  const docs: PreparedDoc[] = [];

  const pushDoc = (
    collectionName: CollectionName,
    docId: string,
    fields: Record<string, unknown>
  ) => {
    const sanitized = sanitizeForFirestore(fields) as Record<string, unknown>;
    docs.push({
      collectionName,
      docId,
      fields: sanitized,
      fingerprint: JSON.stringify(sanitized),
    });
  };

  // 1. Workshop Profile
  const p = state.profile;
  if (p) {
    const profileDocId = toSafeDocId('profile', uid);
    pushDoc(COLLECTIONS.workshopProfiles, profileDocId, {
      id: profileDocId,
      name: clampString(p.name, 160, 'AutoCraft Pro Workshop'),
      legalEntityName: clampString(p.legalEntityName || p.name, 200, 'AutoCraft Pro Pvt. Ltd.'),
      panVatNumber: clampString(p.panVatNumber, 40, '000000000'),
      address: clampString(p.address, 240, 'Kathmandu'),
      city: clampString(p.city, 100, 'Kathmandu'),
      contactNumber: clampString(p.contactNumber, 80, '+977-1-0000000'),
      email: clampString(p.email, 254, 'admin@autocraftpro.np'),
      fiscalYear: clampString(p.fiscalYear, 30, '2081/2082'),
      defaultVatRate: Math.min(100, Math.max(0, toSafeNumber(p.defaultVatRate, 13))),
      data: p,
    });
  }

  // 2. Staff Accounts (strip plaintext passwords before persisting to cloud)
  (state.users || []).forEach((u) => {
    const cleanUserId = String(u.id || u.username || 'USR-01')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 128) || 'USR-01';
    const docId = toSafeDocId('staff', cleanUserId);
    const role = VALID_ROLES.has(u.role) ? u.role : 'Service Advisor';
    const fields: Record<string, unknown> = {
      id: cleanUserId,
      name: clampString(u.name, 120, 'Workshop Staff'),
      username: clampString(u.username, 64, 'staff'),
      email: clampString(u.email, 254, `${u.username || 'staff'}@autocraftpro.np`),
      phone: clampString(u.phone, 40, ''),
      role,
      isActive: Boolean(u.isActive),
      permissions: u.permissions || {},
    };
    pushDoc(COLLECTIONS.staffAccounts, docId, fields);
  });

  // 3. Workshop Masters (Service Price Book, Bays, Technicians)
  (state.servicePriceBook || []).forEach((srv) => {
    const safeId = toSafeDocId('srv', srv.id || srv.code);
    pushDoc(COLLECTIONS.workshopMasters, safeId, {
      id: safeId,
      masterType: 'service_price',
      name: clampString(srv.name, 200, 'Workshop Service'),
      data: srv,
    });
  });
  (state.bays || []).forEach((bay) => {
    const safeId = toSafeDocId('bay', bay.id || bay.bayNumber);
    pushDoc(COLLECTIONS.workshopMasters, safeId, {
      id: safeId,
      masterType: 'bay',
      name: clampString(bay.name || bay.bayNumber, 200, 'Service Bay'),
      data: bay,
    });
  });
  (state.technicians || []).forEach((tech) => {
    const safeId = toSafeDocId('tech', tech.id || tech.name);
    pushDoc(COLLECTIONS.workshopMasters, safeId, {
      id: safeId,
      masterType: 'technician',
      name: clampString(tech.name, 200, 'Technician'),
      data: tech,
    });
  });

  // 4. Customers
  (state.customers || []).forEach((c) => {
    const safeId = toSafeDocId('cust', c.id);
    const totalVisits = (c.vehicles || []).reduce(
      (sum, v) => sum + toSafeNumber(v?.totalServiceCount, 0),
      0
    );
    const fields: Record<string, unknown> = {
      id: safeId,
      name: clampString(c.name, 160, 'Walk-in Customer'),
      phone: clampString(c.phone, 40, ''),
      email: clampString(c.email, 254, ''),
      panVatNumber: clampString(c.panVatNumber || c.panNumber, 40, ''),
      customerType: clampString(c.customerType, 60, 'Individual'),
      totalVisits,
      totalSpent: toSafeNumber(c.totalSpent, 0),
      data: c,
    };
    pushDoc(COLLECTIONS.customers, safeId, fields);
  });

  // 5. Spare Parts
  (state.parts || []).forEach((part) => {
    const safeId = toSafeDocId('part', part.id || part.partNumber);
    pushDoc(COLLECTIONS.spareParts, safeId, {
      id: safeId,
      partNumber: clampString(part.partNumber, 80, safeId),
      name: clampString(part.name, 200, 'Spare Part'),
      category: clampString(part.category, 80, 'General'),
      currentStock: toSafeNumber(part.currentStock, 0),
      minReorderLevel: toSafeNumber(part.minReorderLevel, 0),
      sellingPrice: toSafeNumber(part.sellingPrice, 0),
      data: part,
    });
  });

  // 6. Job Cards
  (state.jobCards || []).forEach((jc) => {
    const safeId = toSafeDocId('jc', jc.id || jc.jobCardNumber);
    const laborTotal = (jc.laborItems || []).reduce(
      (s, l) => s + toSafeNumber(l.totalAmount ?? toSafeNumber(l.hours ?? l.hoursEstimated, 1) * toSafeNumber(l.ratePerHour, 0), 0),
      0
    );
    const partsTotal = (jc.partsItems || jc.partsRequested || []).reduce(
      (s, p) => s + toSafeNumber(p.totalAmount ?? toSafeNumber(p.quantity, 0) * toSafeNumber(p.unitPrice, 0), 0),
      0
    );
    pushDoc(COLLECTIONS.jobCards, safeId, {
      id: safeId,
      jobCardNumber: clampString(jc.jobCardNumber, 80, safeId),
      status: clampString(jc.status, 80, 'Received'),
      customerName: clampString(jc.customerName, 160, 'Customer'),
      vehicleReg: clampString(jc.vehicle?.registrationNumber, 60, 'UNREGISTERED'),
      isClosed: Boolean(jc.isLocked && jc.status === 'Delivered'),
      grandTotal: Math.round((laborTotal + partsTotal) * 100) / 100,
      data: jc,
    });
  });

  // 7. Appointments
  (state.appointments || []).forEach((apt) => {
    const safeId = toSafeDocId('apt', apt.id);
    pushDoc(COLLECTIONS.appointments, safeId, {
      id: safeId,
      customerName: clampString(apt.customerName, 160, 'Customer'),
      vehicleReg: clampString(apt.vehicleReg, 60, 'UNREGISTERED'),
      scheduledDate: clampString(apt.scheduledDate, 40, new Date().toISOString().slice(0, 10)),
      status: clampString(apt.status, 60, 'Scheduled'),
      data: apt,
    });
  });

  // 8. Invoices
  (state.invoices || []).forEach((inv) => {
    const safeId = toSafeDocId('inv', inv.id || inv.invoiceNumber);
    const rawStatus = inv.status || inv.paymentStatus || 'Unpaid';
    const status = VALID_INVOICE_STATUSES.has(rawStatus) ? rawStatus : 'Unpaid';
    const fields: Record<string, unknown> = {
      id: safeId,
      invoiceNumber: clampString(inv.invoiceNumber, 80, safeId),
      status,
      customerName: clampString(inv.customerName, 160, 'Customer'),
      grandTotal: toSafeNumber(inv.grandTotal, 0),
      balanceDue: toSafeNumber(inv.balanceDue, 0),
      discountAmount: toSafeNumber(inv.discountTotal ?? inv.totalDiscount, 0),
      isLocked: Boolean(inv.isLocked),
      data: inv,
    };
    if (inv.discountType === 'percent' || inv.discountType === 'amount') {
      fields.discountType = inv.discountType;
    }
    if (inv.discountValue !== undefined && Number.isFinite(Number(inv.discountValue))) {
      fields.discountValue = Number(inv.discountValue);
    }
    pushDoc(COLLECTIONS.invoices, safeId, fields);
  });

  // 9. Gate Passes
  (state.gatePasses || []).forEach((gp) => {
    const safeId = toSafeDocId('gp', gp.id || gp.passNumber);
    const status = VALID_GATE_PASS_STATUSES.has(gp.status) ? gp.status : 'Cleared for Exit';
    pushDoc(COLLECTIONS.gatePasses, safeId, {
      id: safeId,
      passNumber: clampString(gp.passNumber, 80, safeId),
      invoiceNumber: clampString(gp.invoiceNumber, 80, 'N/A'),
      vehicleReg: clampString(gp.vehicleReg, 60, 'UNREGISTERED'),
      status,
      data: gp,
    });
  });

  // 10. Parts Operations (Quotations, OTC Sales Orders, Sales Returns, Purchase Orders)
  (state.partsQuotations || []).forEach((qt) => {
    const safeId = toSafeDocId('qt', qt.id || qt.quotationNumber);
    pushDoc(COLLECTIONS.partsOperations, safeId, {
      id: safeId,
      opType: 'quotation',
      docNumber: clampString(qt.quotationNumber, 80, safeId),
      status: clampString(qt.status, 80, 'Draft'),
      totalAmount: toSafeNumber(qt.grandTotal, 0),
      data: qt,
    });
  });
  (state.partsSalesOrders || []).forEach((so) => {
    const safeId = toSafeDocId('otc', so.id || so.orderNumber);
    pushDoc(COLLECTIONS.partsOperations, safeId, {
      id: safeId,
      opType: 'otc_order',
      docNumber: clampString(so.orderNumber, 80, safeId),
      status: clampString(so.dispatchStatus || so.invoiceStatus, 80, 'Pending'),
      totalAmount: toSafeNumber(so.grandTotal, 0),
      data: so,
    });
  });
  (state.partsSalesReturns || []).forEach((ret) => {
    const safeId = toSafeDocId('ret', ret.id || ret.creditNoteNumber);
    pushDoc(COLLECTIONS.partsOperations, safeId, {
      id: safeId,
      opType: 'sales_return',
      docNumber: clampString(ret.creditNoteNumber, 80, safeId),
      status: clampString(ret.status, 80, 'Completed'),
      totalAmount: toSafeNumber(ret.totalRefundAmount, 0),
      data: ret,
    });
  });
  (state.purchaseOrders || []).forEach((po) => {
    const safeId = toSafeDocId('po', po.id || po.poNumber);
    pushDoc(COLLECTIONS.partsOperations, safeId, {
      id: safeId,
      opType: 'purchase_order',
      docNumber: clampString(po.poNumber, 80, safeId),
      status: clampString(po.status, 80, 'Pending'),
      totalAmount: toSafeNumber(po.totalAmount, 0),
      data: po,
    });
  });

  // 11. Accounting Records (GL Accounts, Journal Entries, VAT Ledger, Cashier Vouchers)
  (state.glAccounts || []).forEach((gl) => {
    const safeId = toSafeDocId('gl', gl.accountCode || gl.id || gl.accountName);
    pushDoc(COLLECTIONS.accountingRecords, safeId, {
      id: safeId,
      recordType: 'gl_account',
      docNumber: clampString(gl.accountCode, 80, safeId),
      date: '',
      amount: toSafeNumber(gl.currentBalance, 0),
      data: gl,
    });
  });
  (state.journalEntries || []).forEach((jv) => {
    const safeId = toSafeDocId('jv', jv.id || jv.entryNumber);
    pushDoc(COLLECTIONS.accountingRecords, safeId, {
      id: safeId,
      recordType: 'journal_entry',
      docNumber: clampString(jv.entryNumber, 80, safeId),
      date: clampString(jv.date, 40, ''),
      amount: toSafeNumber(jv.totalAmount, 0),
      data: jv,
    });
  });
  (state.vatLedger || []).forEach((vat) => {
    const safeId = toSafeDocId('vat', vat.id || vat.invoiceNumber);
    pushDoc(COLLECTIONS.accountingRecords, safeId, {
      id: safeId,
      recordType: 'vat_ledger',
      docNumber: clampString(vat.invoiceNumber, 80, safeId),
      date: clampString(vat.date, 40, ''),
      amount: toSafeNumber(vat.vatAmount, 0),
      data: vat,
    });
  });
  (state.cashierVouchers || []).forEach((cv) => {
    const safeId = toSafeDocId('cv', cv.id || cv.voucherNumber);
    pushDoc(COLLECTIONS.accountingRecords, safeId, {
      id: safeId,
      recordType: 'cashier_voucher',
      docNumber: clampString(cv.voucherNumber, 80, safeId),
      date: clampString(cv.transactionDate, 40, ''),
      amount: toSafeNumber(cv.amount, 0),
      data: cv,
    });
  });

  // 12. Warranty Records, Warranty Claims, Insurance Claims, Ready Notifications
  (state.warrantyRecords || []).forEach((wr) => {
    const safeId = toSafeDocId('wr', wr.id);
    pushDoc(COLLECTIONS.warrantyAndNotifications, safeId, {
      id: safeId,
      itemType: 'warranty_record',
      status: clampString(wr.status, 80, 'Active'),
      data: wr,
    });
  });
  (state.warrantyClaims || []).forEach((wc) => {
    const safeId = toSafeDocId('wc', wc.id || wc.claimNumber);
    pushDoc(COLLECTIONS.warrantyAndNotifications, safeId, {
      id: safeId,
      itemType: 'warranty_claim',
      status: clampString(wc.status, 80, 'Draft'),
      data: wc,
    });
  });
  (state.insuranceClaims || []).forEach((ic) => {
    const safeId = toSafeDocId('ic', ic.id || ic.claimNumber);
    pushDoc(COLLECTIONS.warrantyAndNotifications, safeId, {
      id: safeId,
      itemType: 'insurance_claim',
      status: clampString(ic.status, 80, 'Pending'),
      data: ic,
    });
  });
  (state.readyNotifications || []).forEach((rn) => {
    const safeId = toSafeDocId('rn', rn.id);
    pushDoc(COLLECTIONS.warrantyAndNotifications, safeId, {
      id: safeId,
      itemType: 'ready_notification',
      status: rn.isRead ? 'Read' : 'Sent',
      data: rn,
    });
  });

  return docs;
};

interface RawCollectionBuckets {
  workshop_profiles: Record<string, Record<string, unknown>>;
  staff_accounts: Record<string, Record<string, unknown>>;
  workshop_masters: Record<string, Record<string, unknown>>;
  customers: Record<string, Record<string, unknown>>;
  spare_parts: Record<string, Record<string, unknown>>;
  job_cards: Record<string, Record<string, unknown>>;
  appointments: Record<string, Record<string, unknown>>;
  invoices: Record<string, Record<string, unknown>>;
  gate_passes: Record<string, Record<string, unknown>>;
  parts_operations: Record<string, Record<string, unknown>>;
  accounting_records: Record<string, Record<string, unknown>>;
  warranty_and_notifications: Record<string, Record<string, unknown>>;
}

const createEmptyBuckets = (): RawCollectionBuckets => ({
  workshop_profiles: {},
  staff_accounts: {},
  workshop_masters: {},
  customers: {},
  spare_parts: {},
  job_cards: {},
  appointments: {},
  invoices: {},
  gate_passes: {},
  parts_operations: {},
  accounting_records: {},
  warranty_and_notifications: {},
});

const reconstructPartialDbFromBuckets = (buckets: RawCollectionBuckets): Partial<AppDatabase> => {
  const profileDocs = Object.values(buckets.workshop_profiles);
  const profile =
    profileDocs.length > 0 && profileDocs[0].data
      ? (profileDocs[0].data as WorkshopProfile)
      : undefined;

  const users: UserAccount[] = Object.values(buckets.staff_accounts).map((docData) => ({
    id: String(docData.id || ''),
    name: String(docData.name || 'Staff'),
    username: String(docData.username || 'staff'),
    email: String(docData.email || ''),
    phone: docData.phone ? String(docData.phone) : undefined,
    role: (docData.role as UserAccount['role']) || 'Service Advisor',
    isActive: Boolean(docData.isActive),
    permissions: (docData.permissions as UserAccount['permissions']) || {
      canEditMasters: false,
      canCreateJobCard: true,
      canEditJobCard: true,
      canIssueBill: false,
      canManageInventory: false,
      canViewFinancials: false,
      canManageWarranty: false,
    },
  }));

  const servicePriceBook: ServicePriceItem[] = [];
  const bays: WorkshopBay[] = [];
  const technicians: Technician[] = [];
  Object.values(buckets.workshop_masters).forEach((docData) => {
    if (!docData.data) return;
    if (docData.masterType === 'service_price') servicePriceBook.push(docData.data as ServicePriceItem);
    else if (docData.masterType === 'bay') bays.push(docData.data as WorkshopBay);
    else if (docData.masterType === 'technician') technicians.push(docData.data as Technician);
  });

  const customers = Object.values(buckets.customers)
    .map((d) => d.data as Customer)
    .filter(Boolean);

  const parts = Object.values(buckets.spare_parts)
    .map((d) => d.data as SparePart)
    .filter(Boolean);

  const jobCards = Object.values(buckets.job_cards)
    .map((d) => d.data as JobCard)
    .filter(Boolean);

  const appointments = Object.values(buckets.appointments)
    .map((d) => d.data as Appointment)
    .filter(Boolean);

  const invoices = Object.values(buckets.invoices)
    .map((d) => d.data as Invoice)
    .filter(Boolean);

  const gatePasses = Object.values(buckets.gate_passes)
    .map((d) => d.data as GatePass)
    .filter(Boolean);

  const partsQuotations: PartsQuotation[] = [];
  const partsSalesOrders: PartsSalesOrder[] = [];
  const partsSalesReturns: PartsSalesReturn[] = [];
  const purchaseOrders: PurchaseOrder[] = [];
  Object.values(buckets.parts_operations).forEach((docData) => {
    if (!docData.data) return;
    if (docData.opType === 'quotation') partsQuotations.push(docData.data as PartsQuotation);
    else if (docData.opType === 'otc_order') partsSalesOrders.push(docData.data as PartsSalesOrder);
    else if (docData.opType === 'sales_return') partsSalesReturns.push(docData.data as PartsSalesReturn);
    else if (docData.opType === 'purchase_order') purchaseOrders.push(docData.data as PurchaseOrder);
  });

  const glAccounts: GLAccount[] = [];
  const journalEntries: GLJournalEntry[] = [];
  const vatLedger: VatLedgerEntry[] = [];
  const cashierVouchers: CashierVoucher[] = [];
  Object.values(buckets.accounting_records).forEach((docData) => {
    if (!docData.data) return;
    if (docData.recordType === 'gl_account') glAccounts.push(docData.data as GLAccount);
    else if (docData.recordType === 'journal_entry') journalEntries.push(docData.data as GLJournalEntry);
    else if (docData.recordType === 'vat_ledger') vatLedger.push(docData.data as VatLedgerEntry);
    else if (docData.recordType === 'cashier_voucher') cashierVouchers.push(docData.data as CashierVoucher);
  });

  const warrantyRecords: WarrantyRecord[] = [];
  const warrantyClaims: WarrantyClaim[] = [];
  const insuranceClaims: InsuranceClaim[] = [];
  const readyNotifications: ReadyNotificationLog[] = [];
  Object.values(buckets.warranty_and_notifications).forEach((docData) => {
    if (!docData.data) return;
    if (docData.itemType === 'warranty_record') warrantyRecords.push(docData.data as WarrantyRecord);
    else if (docData.itemType === 'warranty_claim') warrantyClaims.push(docData.data as WarrantyClaim);
    else if (docData.itemType === 'insurance_claim') insuranceClaims.push(docData.data as InsuranceClaim);
    else if (docData.itemType === 'ready_notification') readyNotifications.push(docData.data as ReadyNotificationLog);
  });

  const result: Partial<AppDatabase> = {
    servicePriceBook,
    servicePriceList: servicePriceBook,
    bays,
    technicians,
    customers,
    parts,
    jobCards,
    appointments,
    invoices,
    gatePasses,
    partsQuotations,
    partsSalesOrders,
    partsSalesReturns,
    purchaseOrders,
    glAccounts,
    journalEntries,
    vatLedger,
    cashierVouchers,
    warrantyRecords,
    warrantyClaims,
    insuranceClaims,
    readyNotifications,
    lastCloudSync: new Date().toISOString(),
    isCloudSynced: true,
  };

  if (profile) result.profile = profile;
  if (users.length > 0) result.users = users;
  return result;
};

class FirestoreSyncService {
  private syncedFingerprints = new Map<string, string>();
  private existingKeys = new Set<string>();
  private unsubscribers: Unsubscribe[] = [];
  private liveBuckets: RawCollectionBuckets = createEmptyBuckets();
  private activeUid: string | null = null;
  private isWriting = false;

  private docKey(collectionName: CollectionName, docId: string): string {
    return `${collectionName}/${docId}`;
  }

  public resetTracking(): void {
    this.stopRealtimeListeners();
    this.syncedFingerprints.clear();
    this.existingKeys.clear();
    this.liveBuckets = createEmptyBuckets();
    this.activeUid = null;
  }

  public stopRealtimeListeners(): void {
    this.unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore cleanup errors
      }
    });
    this.unsubscribers = [];
  }

  /**
   * Loads all 12 collections for the authenticated workshop owner from Firestore.
   */
  public async loadWorkspace(
    uid: string
  ): Promise<{ exists: boolean; partialDb?: Partial<AppDatabase> }> {
    this.resetTracking();
    this.activeUid = uid;
    const allCollections = Object.values(COLLECTIONS);

    await Promise.all(
      allCollections.map(async (colName) => {
        const q = query(collection(db, colName), where('ownerUid', '==', uid));
        try {
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const raw = docSnap.data() as Record<string, unknown>;
            this.liveBuckets[colName][docSnap.id] = raw;

            const { ownerUid: _o, createdAt: _c, updatedAt: _u, ...rest } = raw;
            const key = this.docKey(colName, docSnap.id);
            this.existingKeys.add(key);
            this.syncedFingerprints.set(key, JSON.stringify(sanitizeForFirestore(rest)));
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, colName);
        }
      })
    );

    const hasProfile = Object.keys(this.liveBuckets.workshop_profiles).length > 0;
    if (!hasProfile) {
      return { exists: false };
    }

    return {
      exists: true,
      partialDb: reconstructPartialDbFromBuckets(this.liveBuckets),
    };
  }

  /**
   * Attaches real-time onSnapshot listeners across all 12 collections after auth is confirmed.
   */
  public startRealtimeListeners(
    uid: string,
    onRemoteChange: (partialDb: Partial<AppDatabase>) => void,
    onFatalError?: (err: Error) => void
  ): void {
    this.stopRealtimeListeners();
    this.activeUid = uid;
    const allCollections = Object.values(COLLECTIONS);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const initialSnapSeen = new Set<CollectionName>();

    allCollections.forEach((colName) => {
      const q = query(collection(db, colName), where('ownerUid', '==', uid));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          // Ignore local optimistic echoes while a local batch write is in progress
          if (snapshot.metadata.hasPendingWrites || this.isWriting) return;

          const nextBucket: Record<string, Record<string, unknown>> = {};
          const seenDocIds = new Set<string>();

          snapshot.forEach((docSnap) => {
            const raw = docSnap.data() as Record<string, unknown>;
            nextBucket[docSnap.id] = raw;
            seenDocIds.add(docSnap.id);

            const { ownerUid: _o, createdAt: _c, updatedAt: _u, ...rest } = raw;
            const key = this.docKey(colName, docSnap.id);
            this.existingKeys.add(key);
            this.syncedFingerprints.set(key, JSON.stringify(sanitizeForFirestore(rest)));
          });

          // Clear tracking for remotely deleted docs in this collection
          for (const existingKey of Array.from(this.existingKeys)) {
            if (existingKey.startsWith(`${colName}/`)) {
              const idPart = existingKey.slice(colName.length + 1);
              if (!seenDocIds.has(idPart)) {
                this.existingKeys.delete(existingKey);
                this.syncedFingerprints.delete(existingKey);
              }
            }
          }

          this.liveBuckets[colName] = nextBucket;

          if (!initialSnapSeen.has(colName)) {
            initialSnapSeen.add(colName);
            return;
          }

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (this.activeUid === uid) {
              onRemoteChange(reconstructPartialDbFromBuckets(this.liveBuckets));
            }
          }, 180);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, colName);
          } catch (wrapped) {
            if (onFatalError && wrapped instanceof Error) {
              onFatalError(wrapped);
            }
          }
        }
      );

      this.unsubscribers.push(unsub);
    });
  }

  /**
   * Computes per-document diff against the last synced cloud snapshot and commits
   * only changed/new/deleted documents via chunked Firestore writeBatches.
   */
  public async syncDatabaseDiff(
    uid: string,
    nextDb: AppDatabase,
    options: { allowDeletes?: boolean; forceAll?: boolean } = {}
  ): Promise<{ written: number; deleted: number; timestamp: string }> {
    const { allowDeletes = true, forceAll = false } = options;
    const prepared = buildAllPreparedDocs(uid, nextDb);
    const nextKeys = new Set<string>();

    interface PendingOp {
      type: 'create' | 'update' | 'delete';
      collectionName: CollectionName;
      docId: string;
      fields?: Record<string, unknown>;
      fingerprint?: string;
    }

    const ops: PendingOp[] = [];

    for (const item of prepared) {
      const key = this.docKey(item.collectionName, item.docId);
      nextKeys.add(key);
      const existsInCloud = this.existingKeys.has(key);
      const prevFp = this.syncedFingerprints.get(key);

      if (!existsInCloud) {
        ops.push({
          type: 'create',
          collectionName: item.collectionName,
          docId: item.docId,
          fields: item.fields,
          fingerprint: item.fingerprint,
        });
      } else if (forceAll || prevFp !== item.fingerprint) {
        ops.push({
          type: 'update',
          collectionName: item.collectionName,
          docId: item.docId,
          fields: item.fields,
          fingerprint: item.fingerprint,
        });
      }
    }

    if (allowDeletes) {
      for (const existingKey of Array.from(this.existingKeys)) {
        if (!nextKeys.has(existingKey)) {
          const slashIdx = existingKey.indexOf('/');
          const colName = existingKey.slice(0, slashIdx) as CollectionName;
          const docId = existingKey.slice(slashIdx + 1);
          ops.push({
            type: 'delete',
            collectionName: colName,
            docId,
          });
        }
      }
    }

    if (ops.length === 0) {
      return { written: 0, deleted: 0, timestamp: new Date().toISOString() };
    }

    const CHUNK_SIZE = 350;
    let written = 0;
    let deleted = 0;
    this.isWriting = true;

    try {
      for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
        const chunk = ops.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        let batchPath: string = chunk[0].collectionName;

        for (const op of chunk) {
          const docRef = doc(db, op.collectionName, op.docId);
          batchPath = `${op.collectionName}/${op.docId}`;

          if (op.type === 'create' && op.fields) {
            batch.set(docRef, {
              ...op.fields,
              ownerUid: uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else if (op.type === 'update' && op.fields) {
            // Strip immutable base fields from update payload so affectedKeys().hasOnly(...) passes cleanly
            const { id: _id, masterType: _mt, opType: _ot, recordType: _rt, itemType: _it, ...updatable } = op.fields;
            // For invoices, exclude invoiceNumber & isLocked from normal update payload
            if (op.collectionName === COLLECTIONS.invoices) {
              delete updatable.invoiceNumber;
              delete updatable.customerName;
              delete updatable.isLocked;
            } else if (op.collectionName === COLLECTIONS.gatePasses) {
              delete updatable.passNumber;
              delete updatable.invoiceNumber;
              delete updatable.vehicleReg;
            }
            batch.update(docRef, {
              ...updatable,
              updatedAt: serverTimestamp(),
            });
          } else if (op.type === 'delete') {
            batch.delete(docRef);
          }
        }

        try {
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, batchPath);
        }

        for (const op of chunk) {
          const key = this.docKey(op.collectionName, op.docId);
          if (op.type === 'delete') {
            this.existingKeys.delete(key);
            this.syncedFingerprints.delete(key);
            deleted++;
          } else {
            this.existingKeys.add(key);
            if (op.fingerprint) {
              this.syncedFingerprints.set(key, op.fingerprint);
            }
            written++;
          }
        }
      }
    } finally {
      this.isWriting = false;
    }

    return { written, deleted, timestamp: new Date().toISOString() };
  }
}

export const firestoreSync = new FirestoreSyncService();
