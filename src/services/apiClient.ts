import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { COLLECTIONS, firestoreSync } from './firestoreSyncService';
import { AppDatabase, storage } from './storageService';

export const BOOTSTRAPPED_DEVELOPER_EMAIL = 'divasrayamajhi2@gmail.com';
export const APP_ROOT_DOMAIN = 'autocraftpro.com.np';

const DEFAULT_SUBDOMAIN = 'lavish';
const DEFAULT_COMPANY_NAME = 'Lavish Mobility';
const SUBDOMAIN_STORAGE_KEY = 'AUTOCRAFT_ACTIVE_SUBDOMAIN';
const DEMO_SESSION_STORAGE_KEY = 'AUTOCRAFT_DEMO_SESSION';
const DEMO_SESSION_MODE_KEY = 'AUTOCRAFT_DEMO_SESSION_MODE';
const DEMO_INTEGRATIONS_STORAGE_KEY = 'AUTOCRAFT_DEMO_INTEGRATIONS';
const DEMO_TENANTS_STORAGE_KEY = 'AUTOCRAFT_DEMO_TENANTS_V1';
const DEMO_DEVELOPERS_STORAGE_KEY = 'AUTOCRAFT_DEMO_DEVELOPERS_V1';
const DEMO_TENANT_DB_PREFIX = 'AUTOCRAFT_DEMO_TENANT_DB_';
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ALLOWED_PROVIDERS = new Set(['ird_cbms', 'sparrow_sms', 'fonepay', 'connectips']);

export type TenantPlan = 'Starter' | 'Professional' | 'Enterprise';
export type DeveloperRole = 'Super Developer' | 'Platform Engineer' | 'Support Engineer';
export type DemoSessionMode = 'workspace' | 'developer' | null;

export interface DeveloperAccount {
  uid: string;
  email: string;
  name: string;
  role: DeveloperRole;
  isActive: boolean;
  isBootstrapped?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDeveloperPayload {
  name: string;
  email: string;
  role: DeveloperRole;
  uid?: string;
}

export interface UpdateDeveloperPayload {
  name?: string;
  email?: string;
  role?: DeveloperRole;
  isActive?: boolean;
}

export interface TenantInfo {
  id?: string;
  subdomain: string;
  companyName: string;
  ownerUid?: string;
  adminEmail?: string;
  panVatNumber?: string;
  city?: string;
  address?: string;
  contactNumber?: string;
  fiscalYear?: string;
  plan?: TenantPlan;
  isActive?: boolean;
}

export interface TenantCollectionBreakdown {
  collection: string;
  label: string;
  docs: number;
  bytes: number;
}

export interface TenantRecord {
  id: string;
  subdomain: string;
  companyName: string;
  adminEmail?: string;
  panVatNumber?: string;
  city?: string;
  address?: string;
  contactNumber?: string;
  fiscalYear?: string;
  plan: TenantPlan;
  storageQuotaMb: number;
  bandwidthQuotaGb: number;
  storageUsedBytes: number;
  bandwidthUsedBytes: number;
  networkRequestsCount: number;
  readOpsCount: number;
  writeOpsCount: number;
  docCount: number;
  activeUsersCount: number;
  isActive: boolean;
  ownerUid: string;
  createdAt?: string;
  updatedAt?: string;
  collectionBreakdown?: TenantCollectionBreakdown[];
}

export interface CreateTenantPayload {
  companyName: string;
  subdomain: string;
  adminEmail: string;
  panVatNumber?: string;
  city?: string;
  address?: string;
  contactNumber?: string;
  fiscalYear?: string;
  plan?: TenantPlan;
  storageQuotaMb?: number;
  bandwidthQuotaGb?: number;
}

export interface UpdateTenantPayload {
  companyName?: string;
  adminEmail?: string;
  panVatNumber?: string;
  city?: string;
  address?: string;
  contactNumber?: string;
  fiscalYear?: string;
  plan?: TenantPlan;
  storageQuotaMb?: number;
  bandwidthQuotaGb?: number;
  isActive?: boolean;
}

export interface ApiCustomerRow {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicle_details: unknown;
  created_at: string;
}

export interface ApiInventoryRow {
  id: string;
  tenant_id: string;
  sku: string;
  item_name: string;
  stock_qty: number;
  unit_price: string;
  created_at: string;
}

export interface ApiIntegrationItem {
  id: string;
  provider: string;
  endpoint?: string;
  keyHint?: string;
  isActive: boolean;
  hasCredentials: boolean;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantDashboardResponse {
  tenant: {
    id: string;
    subdomain: string;
    companyName: string;
  };
  user: {
    id: string;
    email: string;
    role: string;
  };
  metrics: {
    totalCustomers: number;
    totalInventoryItems: number;
    lowStockCount: number;
    totalInventoryValue: number;
    activeIntegrations: number;
  };
}

let onboardingGate: Promise<void> | null = null;
let resolveOnboardingGate: (() => void) | null = null;

export function beginOnboarding(): void {
  if (!onboardingGate) {
    onboardingGate = new Promise<void>((resolve) => {
      resolveOnboardingGate = resolve;
    });
  }
}

export function endOnboarding(): void {
  if (resolveOnboardingGate) {
    resolveOnboardingGate();
  }
  onboardingGate = null;
  resolveOnboardingGate = null;
}

export async function waitForOnboardingIfActive(): Promise<void> {
  if (onboardingGate) {
    await onboardingGate;
  }
}

export function getDemoSessionMode(): DemoSessionMode {
  if (typeof window === 'undefined') return null;
  try {
    const mode = window.sessionStorage.getItem(DEMO_SESSION_MODE_KEY);
    if (mode === 'workspace' || mode === 'developer') return mode;
    if (window.sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY) === '1') {
      return 'workspace';
    }
    return null;
  } catch {
    return null;
  }
}

export function setDemoSessionMode(mode: DemoSessionMode): void {
  if (typeof window === 'undefined') return;
  try {
    if (mode) {
      window.sessionStorage.setItem(DEMO_SESSION_STORAGE_KEY, '1');
      window.sessionStorage.setItem(DEMO_SESSION_MODE_KEY, mode);
    } else {
      window.sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(DEMO_SESSION_MODE_KEY);
    }
  } catch {
    // Ignore storage restrictions
  }
}

export function isDemoSessionActive(): boolean {
  return getDemoSessionMode() !== null;
}

export function setDemoSessionActive(active: boolean): void {
  setDemoSessionMode(active ? 'workspace' : null);
}

export function isPreviewOrLocalHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname.toLowerCase();
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.ai.studio') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com')
  );
}

export function formatTenantHostname(subdomain: string): string {
  const clean = subdomain.trim().toLowerCase();
  return `${clean}.${APP_ROOT_DOMAIN}`;
}

export function normalizeCompanySlug(companyInput: string): string {
  let cleaned = companyInput.trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '').split('/')[0];
  if (cleaned.endsWith(`.${APP_ROOT_DOMAIN}`)) {
    cleaned = cleaned.slice(0, -(`.${APP_ROOT_DOMAIN}`).length);
  } else if (cleaned.endsWith('.autocraftpro.com')) {
    cleaned = cleaned.slice(0, -'.autocraftpro.com'.length);
  }
  return cleaned
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function getUrlSubdomainIfPresent(): string | null {
  if (typeof window === 'undefined') return null;

  if (!isPreviewOrLocalHost()) {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith(`.${APP_ROOT_DOMAIN}`)) {
      const sub = host.slice(0, -(`.${APP_ROOT_DOMAIN}`).length);
      if (sub && sub !== 'www' && SUBDOMAIN_PATTERN.test(sub)) {
        return sub;
      }
    }
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const paramTenant = params.get('tenant')?.trim().toLowerCase();
    if (paramTenant && SUBDOMAIN_PATTERN.test(paramTenant)) {
      return paramTenant;
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

export function syncBrowserToTenantSubdomain(subdomain: string): void {
  if (typeof window === 'undefined') return;
  const clean = subdomain.trim().toLowerCase();
  if (!SUBDOMAIN_PATTERN.test(clean)) return;

  setActiveTenantSubdomain(clean);

  // On the production custom domain (autocraftpro.com.np), route to <tenant>.autocraftpro.com.np
  const host = window.location.hostname.toLowerCase();
  if (host === APP_ROOT_DOMAIN || host === `www.${APP_ROOT_DOMAIN}`) {
    window.location.assign(`${window.location.protocol}//${clean}.${APP_ROOT_DOMAIN}/`);
    return;
  }

  // On Cloud Run / preview / localhost, reflect the active tenant subdomain cleanly in the URL query
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    url.searchParams.delete('company');
    url.searchParams.set('tenant', clean);
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history API restrictions
  }
}

export function clearBrowserPortalParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('tenant');
    url.searchParams.delete('portal');
    url.searchParams.delete('company');
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history API restrictions
  }
}

export function getActiveTenantSubdomain(): string {
  if (typeof window === 'undefined') return DEFAULT_SUBDOMAIN;

  const urlSub = getUrlSubdomainIfPresent();
  if (urlSub) return urlSub;

  try {
    const saved = window.sessionStorage.getItem(SUBDOMAIN_STORAGE_KEY);
    if (saved && SUBDOMAIN_PATTERN.test(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage restrictions
  }
  return DEFAULT_SUBDOMAIN;
}

export function setActiveTenantSubdomain(subdomain: string): string {
  const cleaned = subdomain.trim().toLowerCase();
  const valid = SUBDOMAIN_PATTERN.test(cleaned) ? cleaned : DEFAULT_SUBDOMAIN;
  try {
    window.sessionStorage.setItem(SUBDOMAIN_STORAGE_KEY, valid);
  } catch {
    // Ignore storage restrictions
  }
  return valid;
}

function getDefaultDemoDevelopers(): DeveloperAccount[] {
  const now = new Date().toISOString();
  return [
    {
      uid: 'bootstrapped_super_dev',
      email: BOOTSTRAPPED_DEVELOPER_EMAIL,
      name: 'Divas Rayamajhi',
      role: 'Super Developer',
      isActive: true,
      isBootstrapped: true,
      createdAt: '2025-11-01T08:00:00.000Z',
      updatedAt: now,
    },
    {
      uid: 'dev_platform_ops',
      email: 'dev@autocraftpro.com.np',
      name: 'AutoCraft Platform Ops',
      role: 'Platform Engineer',
      isActive: true,
      isBootstrapped: false,
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: now,
    },
  ];
}

export function readDemoDevelopers(): DeveloperAccount[] {
  if (typeof window === 'undefined') return getDefaultDemoDevelopers();
  try {
    const raw = window.sessionStorage.getItem(DEMO_DEVELOPERS_STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultDemoDevelopers();
      window.sessionStorage.setItem(DEMO_DEVELOPERS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as DeveloperAccount[];
    }
  } catch {
    // Fallback to defaults
  }
  return getDefaultDemoDevelopers();
}

function writeDemoDevelopers(devs: DeveloperAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DEMO_DEVELOPERS_STORAGE_KEY, JSON.stringify(devs));
  } catch {
    // Ignore storage restrictions
  }
}

export async function checkIsPlatformDeveloper(
  uid?: string | null,
  email?: string | null
): Promise<boolean> {
  const normalizedEmail = email?.trim().toLowerCase() || '';
  if (normalizedEmail === BOOTSTRAPPED_DEVELOPER_EMAIL) {
    return true;
  }
  if (isDemoSessionActive() && !auth.currentUser) {
    if (!normalizedEmail) return getDemoSessionMode() === 'developer';
    return readDemoDevelopers().some(
      (d) => d.isActive && d.email.toLowerCase() === normalizedEmail
    );
  }
  if (!uid || !auth.currentUser?.emailVerified) {
    return false;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    if (snap.exists()) {
      const data = snap.data() as Record<string, unknown>;
      return data.isActive !== false;
    }
    if (normalizedEmail) {
      const byEmail = await getDocs(
        query(collection(db, 'admins'), where('email', '==', normalizedEmail))
      );
      return byEmail.docs.some((d) => d.data().isActive !== false);
    }
    return false;
  } catch {
    return false;
  }
}

function formatCompanyLabel(subdomain: string): string {
  if (subdomain === DEFAULT_SUBDOMAIN) return DEFAULT_COMPANY_NAME;
  return subdomain
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function requireVerifiedUid(): { uid: string; email: string } {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to access your AutoCraft Pro workspace.');
  }
  if (!user.emailVerified) {
    throw new Error('Please verify your email address (or sign in with Google) to access Firestore.');
  }
  return { uid: user.uid, email: user.email || '' };
}

function maskKeyHint(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return '••••';
  return `••••${trimmed.slice(-4)}`.slice(0, 32);
}

function measureJsonUtf8Bytes(value: unknown): number {
  try {
    const text = JSON.stringify(value ?? {});
    return new TextEncoder().encode(text).length;
  } catch {
    return 0;
  }
}

function toIsoDate(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

function normalizeTenantDoc(docId: string, data: Record<string, unknown>): TenantRecord {
  const subdomain = String(data.subdomain || docId);
  const planRaw = String(data.plan || 'Professional');
  const plan: TenantPlan =
    planRaw === 'Starter' || planRaw === 'Enterprise' ? planRaw : 'Professional';

  return {
    id: docId,
    subdomain,
    companyName: String(data.companyName || formatCompanyLabel(subdomain)),
    adminEmail: data.adminEmail ? String(data.adminEmail) : undefined,
    panVatNumber: data.panVatNumber ? String(data.panVatNumber) : undefined,
    city: data.city ? String(data.city) : undefined,
    address: data.address ? String(data.address) : undefined,
    contactNumber: data.contactNumber ? String(data.contactNumber) : undefined,
    fiscalYear: data.fiscalYear ? String(data.fiscalYear) : '2081/2082',
    plan,
    storageQuotaMb: Number(data.storageQuotaMb ?? (plan === 'Enterprise' ? 10240 : plan === 'Professional' ? 2048 : 512)),
    bandwidthQuotaGb: Number(data.bandwidthQuotaGb ?? (plan === 'Enterprise' ? 500 : plan === 'Professional' ? 100 : 25)),
    storageUsedBytes: Number(data.storageUsedBytes ?? 0),
    bandwidthUsedBytes: Number(data.bandwidthUsedBytes ?? 0),
    networkRequestsCount: Number(data.networkRequestsCount ?? 0),
    readOpsCount: Number(data.readOpsCount ?? 0),
    writeOpsCount: Number(data.writeOpsCount ?? 0),
    docCount: Number(data.docCount ?? 0),
    activeUsersCount: Number(data.activeUsersCount ?? 1),
    isActive: data.isActive !== false,
    ownerUid: String(data.ownerUid || `tenant_${subdomain}`),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
}

function isUsingDemoFallback(): boolean {
  return isDemoSessionActive() && (!auth.currentUser || !auth.currentUser.emailVerified);
}

const COLLECTION_LABELS: Record<string, string> = {
  workshop_profiles: 'Workshop Profile',
  staff_accounts: 'Staff & RBAC',
  workshop_masters: 'Masters & Bays',
  customers: 'Customers & Vehicles',
  spare_parts: 'Spare Parts Master',
  job_cards: 'Job Cards',
  appointments: 'Appointments',
  invoices: 'IRD Invoices',
  gate_passes: 'Gate Passes',
  parts_operations: 'Parts Ops & POs',
  accounting_records: 'GL & VAT Ledger',
  warranty_and_notifications: 'Warranty & Alerts',
};

function computeLocalDatabaseBreakdown(snapshot: AppDatabase): {
  storageUsedBytes: number;
  docCount: number;
  activeUsersCount: number;
  breakdown: TenantCollectionBreakdown[];
} {
  const buckets: Array<{ collection: string; items: unknown[] }> = [
    { collection: 'workshop_profiles', items: snapshot.profile ? [snapshot.profile] : [] },
    { collection: 'staff_accounts', items: snapshot.users || [] },
    {
      collection: 'workshop_masters',
      items: [
        ...(snapshot.servicePriceBook || []),
        ...(snapshot.bays || []),
        ...(snapshot.technicians || []),
      ],
    },
    { collection: 'customers', items: snapshot.customers || [] },
    { collection: 'spare_parts', items: snapshot.parts || [] },
    { collection: 'job_cards', items: snapshot.jobCards || [] },
    { collection: 'appointments', items: snapshot.appointments || [] },
    { collection: 'invoices', items: snapshot.invoices || [] },
    { collection: 'gate_passes', items: snapshot.gatePasses || [] },
    {
      collection: 'parts_operations',
      items: [
        ...(snapshot.partsQuotations || []),
        ...(snapshot.partsSalesOrders || []),
        ...(snapshot.partsSalesReturns || []),
        ...(snapshot.purchaseOrders || []),
      ],
    },
    {
      collection: 'accounting_records',
      items: [
        ...(snapshot.glAccounts || []),
        ...(snapshot.journalEntries || []),
        ...(snapshot.vatLedger || []),
        ...(snapshot.cashierVouchers || []),
      ],
    },
    {
      collection: 'warranty_and_notifications',
      items: [
        ...(snapshot.warrantyRecords || []),
        ...(snapshot.warrantyClaims || []),
        ...(snapshot.insuranceClaims || []),
        ...(snapshot.readyNotifications || []),
      ],
    },
  ];

  let storageUsedBytes = 0;
  let docCount = 0;
  const breakdown: TenantCollectionBreakdown[] = buckets.map((b) => {
    const bytes = b.items.reduce<number>((sum, item) => sum + measureJsonUtf8Bytes(item), 0);
    storageUsedBytes += bytes;
    docCount += b.items.length;
    return {
      collection: b.collection,
      label: COLLECTION_LABELS[b.collection] || b.collection,
      docs: b.items.length,
      bytes,
    };
  });

  const activeUsersCount = (snapshot.users || []).filter((u) => u.isActive !== false).length || 1;
  return { storageUsedBytes, docCount, activeUsersCount, breakdown };
}

function getDefaultDemoTenants(): TenantRecord[] {
  const localStats = computeLocalDatabaseBreakdown(storage.getDatabase());
  const now = new Date().toISOString();
  return [
    {
      id: 'lavish',
      subdomain: 'lavish',
      companyName: 'Lavish Mobility',
      adminEmail: 'admin@lavishmobility.com.np',
      panVatNumber: '609812453',
      city: 'Kathmandu',
      address: 'Ring Road, Sukedhara-04, Kathmandu',
      contactNumber: '+977-1-4378912',
      fiscalYear: '2081/2082',
      plan: 'Enterprise',
      storageQuotaMb: 10240,
      bandwidthQuotaGb: 500,
      storageUsedBytes: localStats.storageUsedBytes,
      bandwidthUsedBytes: 184_520_400,
      networkRequestsCount: 14_820,
      readOpsCount: 11_240,
      writeOpsCount: 3_580,
      docCount: localStats.docCount,
      activeUsersCount: localStats.activeUsersCount,
      isActive: true,
      ownerUid: 'tenant_lavish',
      createdAt: '2025-11-12T08:30:00.000Z',
      updatedAt: now,
      collectionBreakdown: localStats.breakdown,
    },
    {
      id: 'himalayan',
      subdomain: 'himalayan',
      companyName: 'Himalayan Auto Care',
      adminEmail: 'ops@himalayanautocare.com.np',
      panVatNumber: '304591827',
      city: 'Lalitpur',
      address: 'Satdobato Ring Road, Lalitpur',
      contactNumber: '+977-1-5541209',
      fiscalYear: '2081/2082',
      plan: 'Professional',
      storageQuotaMb: 2048,
      bandwidthQuotaGb: 100,
      storageUsedBytes: Math.round(localStats.storageUsedBytes * 0.72),
      bandwidthUsedBytes: 76_310_200,
      networkRequestsCount: 6_490,
      readOpsCount: 4_920,
      writeOpsCount: 1_570,
      docCount: Math.max(12, Math.round(localStats.docCount * 0.7)),
      activeUsersCount: 4,
      isActive: true,
      ownerUid: 'tenant_himalayan',
      createdAt: '2026-01-18T10:15:00.000Z',
      updatedAt: now,
    },
    {
      id: 'everest-ev',
      subdomain: 'everest-ev',
      companyName: 'Everest EV Service Hub',
      adminEmail: 'director@everestev.com.np',
      panVatNumber: '612904318',
      city: 'Pokhara',
      address: 'Prithvi Chowk, Pokhara-08',
      contactNumber: '+977-61-539810',
      fiscalYear: '2081/2082',
      plan: 'Starter',
      storageQuotaMb: 512,
      bandwidthQuotaGb: 25,
      storageUsedBytes: Math.round(localStats.storageUsedBytes * 0.45),
      bandwidthUsedBytes: 28_940_000,
      networkRequestsCount: 2_315,
      readOpsCount: 1_840,
      writeOpsCount: 475,
      docCount: Math.max(8, Math.round(localStats.docCount * 0.45)),
      activeUsersCount: 2,
      isActive: true,
      ownerUid: 'tenant_everest_ev',
      createdAt: '2026-03-04T06:45:00.000Z',
      updatedAt: now,
    },
  ];
}

function readDemoTenants(): TenantRecord[] {
  if (typeof window === 'undefined') return getDefaultDemoTenants();
  try {
    const raw = window.sessionStorage.getItem(DEMO_TENANTS_STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultDemoTenants();
      window.sessionStorage.setItem(DEMO_TENANTS_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as TenantRecord[];
    }
  } catch {
    // Fallback to defaults
  }
  return getDefaultDemoTenants();
}

function writeDemoTenants(tenants: TenantRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DEMO_TENANTS_STORAGE_KEY, JSON.stringify(tenants));
  } catch {
    // Ignore storage quota issues
  }
}

export function saveDemoTenantWorkspaceSnapshot(subdomain: string, snapshot: AppDatabase): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${DEMO_TENANT_DB_PREFIX}${subdomain}`, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadDemoTenantWorkspaceSnapshot(tenant: TenantRecord): AppDatabase {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.sessionStorage.getItem(`${DEMO_TENANT_DB_PREFIX}${tenant.subdomain}`);
      if (raw) {
        return JSON.parse(raw) as AppDatabase;
      }
    } catch {
      // Fall through to fresh tenant clone
    }
  }

  const base = storage.getDatabase();
  const cloned: AppDatabase = JSON.parse(JSON.stringify(base));
  cloned.profile = {
    ...cloned.profile,
    name: tenant.companyName,
    legalEntityName: `${tenant.companyName} Pvt. Ltd.`,
    panVatNumber: tenant.panVatNumber || cloned.profile.panVatNumber,
    city: tenant.city || cloned.profile.city,
    address: tenant.address || `${tenant.city || 'Kathmandu'}, Nepal`,
    contactNumber: tenant.contactNumber || cloned.profile.contactNumber,
    email: tenant.adminEmail || cloned.profile.email,
    website: `https://${tenant.subdomain}.${APP_ROOT_DOMAIN}`,
    fiscalYear: tenant.fiscalYear || cloned.profile.fiscalYear,
  };
  if (cloned.users && cloned.users.length > 0) {
    cloned.users = cloned.users.map((u, idx) =>
      idx === 0
        ? {
            ...u,
            name: `${tenant.companyName} Admin`,
            email: tenant.adminEmail || u.email,
            role: 'Admin',
          }
        : u
    );
    cloned.currentUser = cloned.users[0];
  }
  saveDemoTenantWorkspaceSnapshot(tenant.subdomain, cloned);
  return cloned;
}

function readDemoIntegrations(subdomain: string): ApiIntegrationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(`${DEMO_INTEGRATIONS_STORAGE_KEY}_${subdomain}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApiIntegrationItem[]) : [];
  } catch {
    return [];
  }
}

function writeDemoIntegrations(subdomain: string, items: ApiIntegrationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      `${DEMO_INTEGRATIONS_STORAGE_KEY}_${subdomain}`,
      JSON.stringify(items)
    );
  } catch {
    // Ignore storage restrictions
  }
}

/**
 * 100% Firebase-Native Multi-Tenant & Developer Control Plane Client.
 * - Only the Platform Developer (Super Admin) can onboard, suspend, edit quotas, delete, or access any tenant.
 * - Each Tenant Admin has full control over their own isolated workspace and staff accounts.
 */
export const apiClient = {
  async resolveTenant(subdomain?: string): Promise<TenantInfo> {
    const clean = (subdomain || getActiveTenantSubdomain()).trim().toLowerCase();
    if (!SUBDOMAIN_PATTERN.test(clean) || clean.length < 2) {
      throw new Error('Subdomain must use 2–63 lowercase letters, digits, or hyphens.');
    }

    if (isUsingDemoFallback()) {
      const found = readDemoTenants().find((t) => t.subdomain === clean);
      if (found) {
        return {
          id: found.id,
          subdomain: found.subdomain,
          companyName: found.companyName,
          ownerUid: found.ownerUid,
          adminEmail: found.adminEmail,
          panVatNumber: found.panVatNumber,
          city: found.city,
          address: found.address,
          contactNumber: found.contactNumber,
          fiscalYear: found.fiscalYear,
          plan: found.plan,
          isActive: found.isActive,
        };
      }
    }

    const user = auth.currentUser;
    if (user && user.emailVerified) {
      try {
        const snap = await getDoc(doc(db, 'tenants', clean));
        if (snap.exists()) {
          const rec = normalizeTenantDoc(snap.id, snap.data() as Record<string, unknown>);
          return {
            id: rec.id,
            subdomain: rec.subdomain,
            companyName: rec.companyName,
            ownerUid: rec.ownerUid,
            adminEmail: rec.adminEmail,
            panVatNumber: rec.panVatNumber,
            city: rec.city,
            address: rec.address,
            contactNumber: rec.contactNumber,
            fiscalYear: rec.fiscalYear,
            plan: rec.plan,
            isActive: rec.isActive,
          };
        }
      } catch {
        // Document either does not exist yet or belongs to another tenant
      }
    }

    return {
      subdomain: clean,
      companyName: formatCompanyLabel(clean),
    };
  },

  /**
   * Resolves a target tenant strictly for Workspace Login (Company Name + Work Email + Password).
   * - Accepts either the tenant's assigned Admin OR an authorized Platform Developer signing in with their developer credentials.
   */
  async resolveTenantForWorkspaceLogin(
    companyInput: string,
    uid: string,
    email: string | null,
    isDeveloper: boolean
  ): Promise<{
    tenant: TenantRecord | null;
    status: 'ok' | 'not_found' | 'unauthorized' | 'suspended';
  }> {
    const cleanInput = companyInput.trim().toLowerCase();
    const slug = normalizeCompanySlug(companyInput);
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!cleanInput || slug.length < 2) {
      return { tenant: null, status: 'not_found' };
    }

    if (isUsingDemoFallback()) {
      const demoTenants = readDemoTenants();
      const matched = demoTenants.find(
        (t) =>
          t.subdomain.toLowerCase() === slug ||
          t.companyName.toLowerCase() === cleanInput ||
          normalizeCompanySlug(t.companyName) === slug
      );
      if (!matched) {
        return { tenant: null, status: 'not_found' };
      }
      if (!matched.isActive && !isDeveloper) {
        return { tenant: matched, status: 'suspended' };
      }
      const isTenantAdmin =
        Boolean(normalizedEmail) && matched.adminEmail?.toLowerCase() === normalizedEmail;
      if (!isDeveloper && !isTenantAdmin) {
        return { tenant: null, status: 'unauthorized' };
      }
      return { tenant: matched, status: 'ok' };
    }

    // Live Firestore lookup:
    // 1. Try direct doc get by normalized subdomain (works for both Tenant Admin and Platform Developer via rules)
    let matched: TenantRecord | null = null;
    if (SUBDOMAIN_PATTERN.test(slug)) {
      try {
        const directSnap = await getDoc(doc(db, 'tenants', slug));
        if (directSnap.exists()) {
          matched = normalizeTenantDoc(directSnap.id, directSnap.data() as Record<string, unknown>);
        }
      } catch {
        // Permission denied means the tenant exists for someone else (unauthorized) or cannot be read
      }
    }

    // 2. Fallback: search accessible tenants by company name (for Developer or owned tenant)
    if (!matched) {
      if (isDeveloper) {
        try {
          const allTenants = await this.listAllTenants();
          matched =
            allTenants.find(
              (t) =>
                t.subdomain.toLowerCase() === slug ||
                t.companyName.toLowerCase() === cleanInput ||
                normalizeCompanySlug(t.companyName) === slug
            ) || null;
        } catch {
          // Ignore list error for non-bootstrapped secondary dev if not matched by direct slug
        }
      } else {
        const [byOwner, byEmail] = await Promise.all([
          getDocs(query(collection(db, 'tenants'), where('ownerUid', '==', uid))),
          normalizedEmail
            ? getDocs(query(collection(db, 'tenants'), where('adminEmail', '==', normalizedEmail)))
            : Promise.resolve(null),
        ]);
        const docs = [...byOwner.docs, ...(byEmail ? byEmail.docs : [])];
        const unique = new Map<string, TenantRecord>();
        docs.forEach((d) => {
          unique.set(d.id, normalizeTenantDoc(d.id, d.data() as Record<string, unknown>));
        });
        matched =
          Array.from(unique.values()).find(
            (t) =>
              t.subdomain.toLowerCase() === slug ||
              t.companyName.toLowerCase() === cleanInput ||
              normalizeCompanySlug(t.companyName) === slug
          ) || null;
      }
    }

    if (!matched) {
      return { tenant: null, status: 'not_found' };
    }

    if (!matched.isActive && !isDeveloper) {
      return { tenant: matched, status: 'suspended' };
    }

    const isOwnerOrAdminEmail =
      matched.ownerUid === uid ||
      (Boolean(normalizedEmail) && matched.adminEmail?.toLowerCase() === normalizedEmail);

    if (!isDeveloper && !isOwnerOrAdminEmail) {
      return { tenant: null, status: 'unauthorized' };
    }

    // Claim placeholder ownerUid on first verified Tenant Admin sign-in
    if (
      !isDeveloper &&
      matched.ownerUid.startsWith('tenant_') &&
      normalizedEmail &&
      matched.adminEmail?.toLowerCase() === normalizedEmail
    ) {
      try {
        await updateDoc(doc(db, 'tenants', matched.id), {
          ownerUid: uid,
          updatedAt: serverTimestamp(),
        });
        matched = { ...matched, ownerUid: uid };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tenants/${matched.id}`);
      }
    }

    return { tenant: matched, status: 'ok' };
  },

  /**
   * Resolves the authenticated user's provisioned tenant (and auto-provisions default tenant for Developer if empty).
   */
  async resolveAuthenticatedTenant(
    uid: string,
    email: string | null,
    isDeveloper: boolean
  ): Promise<{
    tenant: TenantRecord | null;
    allTenants: TenantRecord[];
    status: 'ok' | 'suspended' | 'not_provisioned';
  }> {
    if (isUsingDemoFallback()) {
      const demoTenants = readDemoTenants();
      const activeSub = getActiveTenantSubdomain();
      const matched = demoTenants.find((t) => t.subdomain === activeSub) || demoTenants[0];
      if (matched) setActiveTenantSubdomain(matched.subdomain);
      return { tenant: matched || null, allTenants: demoTenants, status: 'ok' };
    }

    if (isDeveloper) {
      let allTenants: TenantRecord[] = [];
      try {
        allTenants = await this.listAllTenants();
      } catch {
        allTenants = [];
      }
      if (allTenants.length === 0 && email?.trim().toLowerCase() === BOOTSTRAPPED_DEVELOPER_EMAIL) {
        const defaultCreated = await this.createTenantAsDeveloper({
          companyName: DEFAULT_COMPANY_NAME,
          subdomain: DEFAULT_SUBDOMAIN,
          adminEmail: email || BOOTSTRAPPED_DEVELOPER_EMAIL,
          panVatNumber: '609812453',
          city: 'Kathmandu',
          address: 'Ring Road, Sukedhara-04, Kathmandu',
          contactNumber: '+977-1-4378912',
          fiscalYear: '2081/2082',
          plan: 'Enterprise',
          storageQuotaMb: 10240,
          bandwidthQuotaGb: 500,
        }, uid);
        setActiveTenantSubdomain(defaultCreated.subdomain);
        return { tenant: defaultCreated, allTenants: [defaultCreated], status: 'ok' };
      }

      const preferredSub = getActiveTenantSubdomain();
      const active =
        allTenants.find((t) => t.subdomain === preferredSub) ||
        allTenants.find((t) => t.ownerUid === uid) ||
        allTenants[0] ||
        null;
      if (active) setActiveTenantSubdomain(active.subdomain);
      return { tenant: active, allTenants, status: 'ok' };
    }

    // Tenant Admin / End User: look up strictly provisioned tenant by ownerUid or verified adminEmail
    const byOwnerSnap = await getDocs(
      query(collection(db, 'tenants'), where('ownerUid', '==', uid))
    );
    let tenantDoc = byOwnerSnap.docs[0] || null;

    if (!tenantDoc && email) {
      const byEmailSnap = await getDocs(
        query(collection(db, 'tenants'), where('adminEmail', '==', email.trim().toLowerCase()))
      );
      tenantDoc = byEmailSnap.docs[0] || null;
    }

    if (!tenantDoc) {
      return { tenant: null, allTenants: [], status: 'not_provisioned' };
    }

    let record = normalizeTenantDoc(tenantDoc.id, tenantDoc.data() as Record<string, unknown>);
    if (!record.isActive) {
      return { tenant: record, allTenants: [record], status: 'suspended' };
    }

    if (record.ownerUid.startsWith('tenant_') && email && record.adminEmail?.toLowerCase() === email.trim().toLowerCase()) {
      try {
        await updateDoc(doc(db, 'tenants', record.id), {
          ownerUid: uid,
          updatedAt: serverTimestamp(),
        });
        record = { ...record, ownerUid: uid };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `tenants/${record.id}`);
      }
    }

    setActiveTenantSubdomain(record.subdomain);
    return { tenant: record, allTenants: [record], status: 'ok' };
  },

  /**
   * Developer Portal Settings: list authorized platform developer accounts.
   */
  async listDeveloperAccounts(): Promise<DeveloperAccount[]> {
    if (isUsingDemoFallback()) {
      return readDemoDevelopers();
    }
    requireVerifiedUid();
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const list: DeveloperAccount[] = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const roleRaw = String(data.role || 'Platform Engineer');
        const role: DeveloperRole =
          roleRaw === 'Super Developer' || roleRaw === 'Support Engineer'
            ? roleRaw
            : 'Platform Engineer';
        const emailVal = String(data.email || '');
        return {
          uid: d.id,
          email: emailVal,
          name: String(data.name || emailVal.split('@')[0] || 'Developer'),
          role,
          isActive: data.isActive !== false,
          isBootstrapped: emailVal.toLowerCase() === BOOTSTRAPPED_DEVELOPER_EMAIL,
          createdAt: toIsoDate(data.createdAt),
          updatedAt: toIsoDate(data.updatedAt),
        };
      });

      const hasBootstrapped = list.some(
        (item) => item.email.toLowerCase() === BOOTSTRAPPED_DEVELOPER_EMAIL
      );
      if (!hasBootstrapped) {
        list.unshift({
          uid: 'bootstrapped_super_dev',
          email: BOOTSTRAPPED_DEVELOPER_EMAIL,
          name: 'Platform Owner (Bootstrapped)',
          role: 'Super Developer',
          isActive: true,
          isBootstrapped: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'admins');
    }
  },

  /**
   * Developer Portal Settings: add a new platform developer account.
   */
  async addDeveloperAccount(payload: CreateDeveloperPayload): Promise<DeveloperAccount> {
    const cleanEmail = payload.email.trim().toLowerCase().slice(0, 254);
    const cleanName = payload.name.trim().slice(0, 120);
    const role: DeveloperRole = payload.role || 'Platform Engineer';

    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      throw new Error('Please enter a valid developer email address.');
    }
    if (cleanName.length < 2) {
      throw new Error('Please enter the developer full name.');
    }

    const explicitUid = (payload.uid || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    const docId =
      explicitUid ||
      `dev_${cleanEmail.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 120);

    if (isUsingDemoFallback()) {
      const existing = readDemoDevelopers();
      if (existing.some((d) => d.email.toLowerCase() === cleanEmail)) {
        throw new Error(`Developer account "${cleanEmail}" already exists.`);
      }
      const now = new Date().toISOString();
      const created: DeveloperAccount = {
        uid: docId,
        email: cleanEmail,
        name: cleanName,
        role,
        isActive: true,
        isBootstrapped: false,
        createdAt: now,
        updatedAt: now,
      };
      writeDemoDevelopers([...existing, created]);
      return created;
    }

    requireVerifiedUid();
    const ref = doc(db, 'admins', docId);
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        throw new Error(`Developer account "${cleanEmail}" or UID "${docId}" already exists.`);
      }
      await setDoc(ref, {
        uid: docId,
        email: cleanEmail,
        name: cleanName,
        role,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        uid: docId,
        email: cleanEmail,
        name: cleanName,
        role,
        isActive: true,
        isBootstrapped: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) throw err;
      handleFirestoreError(err, OperationType.WRITE, `admins/${docId}`);
    }
  },

  /**
   * Developer Portal Settings: update a developer account's name, role, or active status.
   */
  async updateDeveloperAccount(
    uid: string,
    updates: UpdateDeveloperPayload
  ): Promise<DeveloperAccount> {
    if (uid === 'bootstrapped_super_dev') {
      throw new Error('The primary bootstrapped developer account cannot be modified or suspended.');
    }

    if (isUsingDemoFallback()) {
      const list = readDemoDevelopers();
      const idx = list.findIndex((d) => d.uid === uid);
      if (idx < 0) throw new Error('Developer account not found.');
      const next: DeveloperAccount = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = next;
      writeDemoDevelopers(list);
      return next;
    }

    requireVerifiedUid();
    const ref = doc(db, 'admins', uid);
    const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.name !== undefined) patch.name = updates.name.trim().slice(0, 120);
    if (updates.email !== undefined) patch.email = updates.email.trim().toLowerCase().slice(0, 254);
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.isActive !== undefined) patch.isActive = Boolean(updates.isActive);

    try {
      await updateDoc(ref, patch);
      const snap = await getDoc(ref);
      const data = (snap.data() || {}) as Record<string, unknown>;
      return {
        uid,
        email: String(data.email || ''),
        name: String(data.name || ''),
        role: (data.role as DeveloperRole) || 'Platform Engineer',
        isActive: data.isActive !== false,
        createdAt: toIsoDate(data.createdAt),
        updatedAt: toIsoDate(data.updatedAt),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
    }
  },

  /**
   * Developer Portal Settings: remove a developer account.
   */
  async deleteDeveloperAccount(uid: string): Promise<{ deleted: boolean }> {
    if (uid === 'bootstrapped_super_dev') {
      throw new Error('The primary bootstrapped developer account cannot be deleted.');
    }
    if (isUsingDemoFallback()) {
      const next = readDemoDevelopers().filter((d) => d.uid !== uid);
      writeDemoDevelopers(next);
      return { deleted: true };
    }
    requireVerifiedUid();
    try {
      await deleteDoc(doc(db, 'admins', uid));
      return { deleted: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${uid}`);
    }
  },

  /**
   * Platform Developer Only: list every onboarded tenant across the SaaS platform.
   */
  async listAllTenants(): Promise<TenantRecord[]> {
    if (isUsingDemoFallback()) {
      return readDemoTenants();
    }
    requireVerifiedUid();
    try {
      const snap = await getDocs(collection(db, 'tenants'));
      const list = snap.docs.map((d) =>
        normalizeTenantDoc(d.id, d.data() as Record<string, unknown>)
      );
      return list.sort((a, b) => a.companyName.localeCompare(b.companyName));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tenants');
    }
  },

  /**
   * Platform Developer Only: onboard & provision a brand-new client tenant workspace.
   */
  async createTenantAsDeveloper(
    payload: CreateTenantPayload,
    explicitOwnerUid?: string
  ): Promise<TenantRecord> {
    const cleanSub = payload.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanCompany = payload.companyName.trim().slice(0, 160);
    const cleanAdminEmail = payload.adminEmail.trim().toLowerCase().slice(0, 254);
    const plan: TenantPlan = payload.plan || 'Professional';
    const storageQuotaMb = Math.max(
      1,
      Math.min(102400, Number(payload.storageQuotaMb ?? (plan === 'Enterprise' ? 10240 : plan === 'Professional' ? 2048 : 512)))
    );
    const bandwidthQuotaGb = Math.max(
      1,
      Math.min(10240, Number(payload.bandwidthQuotaGb ?? (plan === 'Enterprise' ? 500 : plan === 'Professional' ? 100 : 25)))
    );

    if (!SUBDOMAIN_PATTERN.test(cleanSub) || cleanSub.length < 2) {
      throw new Error('Subdomain must be 2–63 lowercase letters, digits, or internal hyphens.');
    }
    if (cleanCompany.length < 2) {
      throw new Error('Company name must be at least 2 characters.');
    }
    if (!cleanAdminEmail.includes('@') || cleanAdminEmail.length < 5) {
      throw new Error('Please provide a valid Tenant Admin email address.');
    }

    const ownerUid =
      explicitOwnerUid ||
      `tenant_${cleanSub.replace(/[^a-z0-9_-]/g, '_')}`.slice(0, 120);

    if (isUsingDemoFallback()) {
      const existingList = readDemoTenants();
      if (existingList.some((t) => t.subdomain === cleanSub)) {
        throw new Error(`Subdomain "${cleanSub}" is already onboarded.`);
      }
      const now = new Date().toISOString();
      const created: TenantRecord = {
        id: cleanSub,
        subdomain: cleanSub,
        companyName: cleanCompany,
        adminEmail: cleanAdminEmail,
        panVatNumber: (payload.panVatNumber || '').trim().slice(0, 40) || '601234567',
        city: (payload.city || '').trim().slice(0, 100) || 'Kathmandu',
        address: (payload.address || '').trim().slice(0, 240) || 'Kathmandu, Nepal',
        contactNumber: (payload.contactNumber || '').trim().slice(0, 80) || '+977-1-4000000',
        fiscalYear: (payload.fiscalYear || '').trim().slice(0, 30) || '2081/2082',
        plan,
        storageQuotaMb,
        bandwidthQuotaGb,
        storageUsedBytes: 0,
        bandwidthUsedBytes: 0,
        networkRequestsCount: 1,
        readOpsCount: 0,
        writeOpsCount: 1,
        docCount: 0,
        activeUsersCount: 1,
        isActive: true,
        ownerUid,
        createdAt: now,
        updatedAt: now,
      };
      const seededSnapshot = loadDemoTenantWorkspaceSnapshot(created);
      const stats = computeLocalDatabaseBreakdown(seededSnapshot);
      created.storageUsedBytes = stats.storageUsedBytes;
      created.docCount = stats.docCount;
      created.activeUsersCount = stats.activeUsersCount;
      created.bandwidthUsedBytes = stats.storageUsedBytes;
      created.collectionBreakdown = stats.breakdown;
      writeDemoTenants([...existingList, created]);
      return created;
    }

    requireVerifiedUid();
    const ref = doc(db, 'tenants', cleanSub);
    const path = `tenants/${cleanSub}`;

    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        throw new Error(`Subdomain "${cleanSub}" is already onboarded.`);
      }

      const writePayload: Record<string, unknown> = {
        id: cleanSub,
        subdomain: cleanSub,
        companyName: cleanCompany,
        adminEmail: cleanAdminEmail,
        panVatNumber: (payload.panVatNumber || '').trim().slice(0, 40),
        city: (payload.city || 'Kathmandu').trim().slice(0, 100),
        address: (payload.address || '').trim().slice(0, 240),
        contactNumber: (payload.contactNumber || '').trim().slice(0, 80),
        fiscalYear: (payload.fiscalYear || '2081/2082').trim().slice(0, 30),
        plan,
        storageQuotaMb,
        bandwidthQuotaGb,
        storageUsedBytes: 0,
        bandwidthUsedBytes: 0,
        networkRequestsCount: 1,
        readOpsCount: 0,
        writeOpsCount: 1,
        docCount: 0,
        activeUsersCount: 1,
        isActive: true,
        ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(ref, writePayload);

      return normalizeTenantDoc(cleanSub, {
        ...writePayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('already onboarded')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  /**
   * Platform Developer Only: update tenant status (active/suspended), plan, quotas, or contact metadata.
   */
  async updateTenantAsDeveloper(
    subdomain: string,
    updates: UpdateTenantPayload
  ): Promise<TenantRecord> {
    const cleanSub = subdomain.trim().toLowerCase();

    if (isUsingDemoFallback()) {
      const list = readDemoTenants();
      const idx = list.findIndex((t) => t.subdomain === cleanSub);
      if (idx < 0) throw new Error(`Tenant "${cleanSub}" not found.`);
      const next: TenantRecord = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = next;
      writeDemoTenants(list);
      return next;
    }

    requireVerifiedUid();
    const ref = doc(db, 'tenants', cleanSub);
    const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (updates.companyName !== undefined) patch.companyName = updates.companyName.trim().slice(0, 160);
    if (updates.adminEmail !== undefined) patch.adminEmail = updates.adminEmail.trim().toLowerCase().slice(0, 254);
    if (updates.panVatNumber !== undefined) patch.panVatNumber = updates.panVatNumber.trim().slice(0, 40);
    if (updates.city !== undefined) patch.city = updates.city.trim().slice(0, 100);
    if (updates.address !== undefined) patch.address = updates.address.trim().slice(0, 240);
    if (updates.contactNumber !== undefined) patch.contactNumber = updates.contactNumber.trim().slice(0, 80);
    if (updates.fiscalYear !== undefined) patch.fiscalYear = updates.fiscalYear.trim().slice(0, 30);
    if (updates.plan !== undefined) patch.plan = updates.plan;
    if (updates.storageQuotaMb !== undefined) patch.storageQuotaMb = Math.max(1, Math.min(102400, Number(updates.storageQuotaMb)));
    if (updates.bandwidthQuotaGb !== undefined) patch.bandwidthQuotaGb = Math.max(1, Math.min(10240, Number(updates.bandwidthQuotaGb)));
    if (updates.isActive !== undefined) patch.isActive = Boolean(updates.isActive);

    try {
      await updateDoc(ref, patch);
      const refreshed = await getDoc(ref);
      return normalizeTenantDoc(cleanSub, (refreshed.data() || {}) as Record<string, unknown>);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tenants/${cleanSub}`);
    }
  },

  /**
   * Platform Developer Only: remove a tenant record from the registry.
   */
  async deleteTenantAsDeveloper(subdomain: string): Promise<{ deleted: boolean }> {
    const cleanSub = subdomain.trim().toLowerCase();
    if (isUsingDemoFallback()) {
      const list = readDemoTenants().filter((t) => t.subdomain !== cleanSub);
      writeDemoTenants(list);
      try {
        window.sessionStorage.removeItem(`${DEMO_TENANT_DB_PREFIX}${cleanSub}`);
      } catch {
        // Ignore storage error
      }
      return { deleted: true };
    }
    requireVerifiedUid();
    try {
      await deleteDoc(doc(db, 'tenants', cleanSub));
      return { deleted: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tenants/${cleanSub}`);
    }
  },

  /**
   * Computes exact per-collection storage bytes, document counts, and network read/transfer telemetry
   * for a specific tenant and saves the fresh telemetry snapshot.
   */
  async measureTenantTelemetry(tenant: TenantRecord): Promise<TenantRecord> {
    if (isUsingDemoFallback()) {
      const snapshot = loadDemoTenantWorkspaceSnapshot(tenant);
      const stats = computeLocalDatabaseBreakdown(snapshot);
      const list = readDemoTenants();
      const idx = list.findIndex((t) => t.subdomain === tenant.subdomain);
      const base = idx >= 0 ? list[idx] : tenant;
      const updated: TenantRecord = {
        ...base,
        storageUsedBytes: stats.storageUsedBytes,
        bandwidthUsedBytes: (base.bandwidthUsedBytes || 0) + stats.storageUsedBytes,
        networkRequestsCount: (base.networkRequestsCount || 0) + 12,
        readOpsCount: (base.readOpsCount || 0) + stats.docCount,
        docCount: stats.docCount,
        activeUsersCount: stats.activeUsersCount,
        updatedAt: new Date().toISOString(),
        collectionBreakdown: stats.breakdown,
      };
      if (idx >= 0) {
        list[idx] = updated;
        writeDemoTenants(list);
      }
      return updated;
    }

    requireVerifiedUid();
    const allCollections = Object.values(COLLECTIONS);
    let totalBytes = 0;
    let totalDocs = 0;
    let activeUsersCount = 1;
    const breakdown: TenantCollectionBreakdown[] = [];

    await Promise.all(
      allCollections.map(async (colName) => {
        try {
          const snap = await getDocs(
            query(collection(db, colName), where('ownerUid', '==', tenant.ownerUid))
          );
          let colBytes = 0;
          let activeStaff = 0;
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            colBytes += measureJsonUtf8Bytes(data);
            if (colName === COLLECTIONS.staffAccounts && data.isActive !== false) {
              activeStaff += 1;
            }
          });
          if (colName === COLLECTIONS.staffAccounts && activeStaff > 0) {
            activeUsersCount = activeStaff;
          }
          totalBytes += colBytes;
          totalDocs += snap.size;
          breakdown.push({
            collection: colName,
            label: COLLECTION_LABELS[colName] || colName,
            docs: snap.size,
            bytes: colBytes,
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.LIST, colName);
        }
      })
    );

    breakdown.sort((a, b) => b.bytes - a.bytes);
    const nextBandwidth = (tenant.bandwidthUsedBytes || 0) + totalBytes;
    const nextRequests = (tenant.networkRequestsCount || 0) + allCollections.length;
    const nextReads = (tenant.readOpsCount || 0) + Math.max(allCollections.length, totalDocs);

    try {
      await updateDoc(doc(db, 'tenants', tenant.id), {
        storageUsedBytes: totalBytes,
        bandwidthUsedBytes: nextBandwidth,
        networkRequestsCount: nextRequests,
        readOpsCount: nextReads,
        docCount: totalDocs,
        activeUsersCount,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal if telemetry write is skipped
    }

    return {
      ...tenant,
      storageUsedBytes: totalBytes,
      bandwidthUsedBytes: nextBandwidth,
      networkRequestsCount: nextRequests,
      readOpsCount: nextReads,
      docCount: totalDocs,
      activeUsersCount,
      updatedAt: new Date().toISOString(),
      collectionBreakdown: breakdown,
    };
  },

  /**
   * Increments real network bandwidth and storage telemetry after workspace reads/writes.
   */
  async recordTenantNetworkActivity(
    subdomain: string,
    delta: {
      bytesTransferred: number;
      reads?: number;
      writes?: number;
      storageUsedBytes?: number;
      docCount?: number;
      activeUsersCount?: number;
    }
  ): Promise<void> {
    const cleanSub = subdomain.trim().toLowerCase();
    if (!SUBDOMAIN_PATTERN.test(cleanSub)) return;

    if (isUsingDemoFallback()) {
      const list = readDemoTenants();
      const idx = list.findIndex((t) => t.subdomain === cleanSub);
      if (idx < 0) return;
      const prev = list[idx];
      list[idx] = {
        ...prev,
        bandwidthUsedBytes: (prev.bandwidthUsedBytes || 0) + Math.max(0, delta.bytesTransferred),
        networkRequestsCount: (prev.networkRequestsCount || 0) + 1,
        readOpsCount: (prev.readOpsCount || 0) + Math.max(0, delta.reads || 0),
        writeOpsCount: (prev.writeOpsCount || 0) + Math.max(0, delta.writes || 0),
        ...(delta.storageUsedBytes !== undefined ? { storageUsedBytes: delta.storageUsedBytes } : {}),
        ...(delta.docCount !== undefined ? { docCount: delta.docCount } : {}),
        ...(delta.activeUsersCount !== undefined ? { activeUsersCount: delta.activeUsersCount } : {}),
        updatedAt: new Date().toISOString(),
      };
      writeDemoTenants(list);
      return;
    }

    if (!auth.currentUser?.emailVerified) return;
    try {
      const ref = doc(db, 'tenants', cleanSub);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const cur = snap.data() as Record<string, unknown>;
      await updateDoc(ref, {
        bandwidthUsedBytes: Number(cur.bandwidthUsedBytes ?? 0) + Math.max(0, delta.bytesTransferred),
        networkRequestsCount: Number(cur.networkRequestsCount ?? 0) + 1,
        readOpsCount: Number(cur.readOpsCount ?? 0) + Math.max(0, delta.reads || 0),
        writeOpsCount: Number(cur.writeOpsCount ?? 0) + Math.max(0, delta.writes || 0),
        ...(delta.storageUsedBytes !== undefined ? { storageUsedBytes: delta.storageUsedBytes } : {}),
        ...(delta.docCount !== undefined ? { docCount: delta.docCount } : {}),
        ...(delta.activeUsersCount !== undefined ? { activeUsersCount: delta.activeUsersCount } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Telemetry update is best-effort and never blocks workshop operations
    }
  },

  async getDashboard(targetOwnerUid?: string): Promise<TenantDashboardResponse> {
    if (isUsingDemoFallback()) {
      const subdomain = getActiveTenantSubdomain();
      const localDb = storage.getDatabase();
      const parts = localDb.parts || [];
      let lowStockCount = 0;
      let totalInventoryValue = 0;
      parts.forEach((p) => {
        const stock = Number(p.currentStock ?? 0);
        const minLvl = Number(p.minReorderLevel ?? 5);
        const price = Number(p.sellingPrice ?? 0);
        if (stock <= minLvl) lowStockCount += 1;
        totalInventoryValue += stock * price;
      });
      const demoIntegrations = readDemoIntegrations(subdomain);
      return {
        tenant: {
          id: subdomain,
          subdomain,
          companyName: localDb.profile?.name || formatCompanyLabel(subdomain),
        },
        user: {
          id: 'demo-admin',
          email: localDb.currentUser?.email || `demo@${APP_ROOT_DOMAIN}`,
          role: 'owner',
        },
        metrics: {
          totalCustomers: (localDb.customers || []).length,
          totalInventoryItems: parts.length,
          lowStockCount,
          totalInventoryValue,
          activeIntegrations: demoIntegrations.filter((i) => i.isActive).length,
        },
      };
    }

    const { uid, email } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;
    const subdomain = getActiveTenantSubdomain();
    let companyName = formatCompanyLabel(subdomain);

    try {
      const snap = await getDoc(doc(db, 'tenants', subdomain));
      if (snap.exists()) {
        companyName = String(snap.data().companyName || companyName);
      }
    } catch {
      // Proceed gracefully with active subdomain label
    }

    const [custSnap, partsSnap, intSnap] = await Promise.all([
      getDocs(query(collection(db, 'customers'), where('ownerUid', '==', effectiveOwnerUid))),
      getDocs(query(collection(db, 'spare_parts'), where('ownerUid', '==', effectiveOwnerUid))),
      getDocs(query(collection(db, 'tenant_integrations'), where('ownerUid', '==', effectiveOwnerUid))),
    ]);

    let lowStockCount = 0;
    let totalInventoryValue = 0;
    partsSnap.docs.forEach((d) => {
      const p = d.data();
      const stock = Number(p.currentStock ?? 0);
      const minLvl = Number(p.minReorderLevel ?? 5);
      const price = Number(p.sellingPrice ?? 0);
      if (stock <= minLvl) lowStockCount += 1;
      totalInventoryValue += stock * price;
    });

    const activeIntegrations = intSnap.docs.filter((d) => d.data().isActive === true).length;

    return {
      tenant: {
        id: subdomain,
        subdomain,
        companyName,
      },
      user: {
        id: uid,
        email,
        role: 'owner',
      },
      metrics: {
        totalCustomers: custSnap.size,
        totalInventoryItems: partsSnap.size,
        lowStockCount,
        totalInventoryValue,
        activeIntegrations,
      },
    };
  },

  async listCustomers(
    params: { page?: number; limit?: number; search?: string },
    targetOwnerUid?: string
  ): Promise<PaginatedResponse<ApiCustomerRow>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const search = (params.search || '').trim().toLowerCase();

    if (isUsingDemoFallback()) {
      const localDb = storage.getDatabase();
      let rows: ApiCustomerRow[] = (localDb.customers || []).map((c) => ({
        id: c.id,
        tenant_id: getActiveTenantSubdomain(),
        full_name: c.name || 'Unnamed',
        phone: c.phone || null,
        email: c.email || null,
        vehicle_details: c.vehicles || [],
        created_at: new Date().toISOString(),
      }));
      if (search) {
        rows = rows.filter(
          (r) =>
            r.full_name.toLowerCase().includes(search) ||
            (r.phone || '').toLowerCase().includes(search) ||
            (r.email || '').toLowerCase().includes(search)
        );
      }
      const total = rows.length;
      const offset = (page - 1) * limit;
      return {
        items: rows.slice(offset, offset + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;

    try {
      const snap = await getDocs(
        query(collection(db, 'customers'), where('ownerUid', '==', effectiveOwnerUid))
      );

      let rows: ApiCustomerRow[] = snap.docs.map((d) => {
        const docData = d.data();
        const nested = (docData.data || {}) as Record<string, unknown>;
        return {
          id: d.id,
          tenant_id: getActiveTenantSubdomain(),
          full_name: String(docData.name || nested.name || 'Unnamed'),
          phone: docData.phone ? String(docData.phone) : null,
          email: docData.email ? String(docData.email) : null,
          vehicle_details: nested.vehicles || [],
          created_at: new Date().toISOString(),
        };
      });

      if (search) {
        rows = rows.filter(
          (r) =>
            r.full_name.toLowerCase().includes(search) ||
            (r.phone || '').toLowerCase().includes(search) ||
            (r.email || '').toLowerCase().includes(search)
        );
      }

      const total = rows.length;
      const offset = (page - 1) * limit;
      return {
        items: rows.slice(offset, offset + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'customers');
    }
  },

  async listInventory(
    params: { page?: number; limit?: number; search?: string },
    targetOwnerUid?: string
  ): Promise<PaginatedResponse<ApiInventoryRow>> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const search = (params.search || '').trim().toLowerCase();

    if (isUsingDemoFallback()) {
      const localDb = storage.getDatabase();
      let rows: ApiInventoryRow[] = (localDb.parts || []).map((p) => ({
        id: p.id,
        tenant_id: getActiveTenantSubdomain(),
        sku: p.partNumber || p.id,
        item_name: p.name || 'Spare Part',
        stock_qty: Number(p.currentStock ?? 0),
        unit_price: Number(p.sellingPrice ?? 0).toFixed(2),
        created_at: new Date().toISOString(),
      }));
      if (search) {
        rows = rows.filter(
          (r) =>
            r.sku.toLowerCase().includes(search) ||
            r.item_name.toLowerCase().includes(search)
        );
      }
      const total = rows.length;
      const offset = (page - 1) * limit;
      return {
        items: rows.slice(offset, offset + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;

    try {
      const snap = await getDocs(
        query(collection(db, 'spare_parts'), where('ownerUid', '==', effectiveOwnerUid))
      );

      let rows: ApiInventoryRow[] = snap.docs.map((d) => {
        const docData = d.data();
        return {
          id: d.id,
          tenant_id: getActiveTenantSubdomain(),
          sku: String(docData.partNumber || d.id),
          item_name: String(docData.name || 'Spare Part'),
          stock_qty: Number(docData.currentStock ?? 0),
          unit_price: Number(docData.sellingPrice ?? 0).toFixed(2),
          created_at: new Date().toISOString(),
        };
      });

      if (search) {
        rows = rows.filter(
          (r) =>
            r.sku.toLowerCase().includes(search) ||
            r.item_name.toLowerCase().includes(search)
        );
      }

      const total = rows.length;
      const offset = (page - 1) * limit;
      return {
        items: rows.slice(offset, offset + limit),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'spare_parts');
    }
  },

  async listIntegrations(targetOwnerUid?: string): Promise<{ items: ApiIntegrationItem[] }> {
    const subdomain = getActiveTenantSubdomain();
    if (isUsingDemoFallback()) {
      return { items: readDemoIntegrations(subdomain) };
    }
    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;
    try {
      const snap = await getDocs(
        query(collection(db, 'tenant_integrations'), where('ownerUid', '==', effectiveOwnerUid))
      );
      const items: ApiIntegrationItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          provider: String(data.provider || ''),
          endpoint: data.endpoint ? String(data.endpoint) : undefined,
          keyHint: data.keyHint ? String(data.keyHint) : undefined,
          isActive: Boolean(data.isActive),
          hasCredentials: true,
          createdAt: new Date().toISOString(),
        };
      });
      return { items };
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'tenant_integrations');
    }
  },

  async saveIntegration(
    provider: string,
    credentials: { apiKey: string; endpoint?: string },
    isActive = true,
    targetOwnerUid?: string
  ): Promise<ApiIntegrationItem> {
    if (!ALLOWED_PROVIDERS.has(provider)) {
      throw new Error('Unsupported integration provider.');
    }

    const subdomain = getActiveTenantSubdomain();
    const keyHint = maskKeyHint(credentials.apiKey);
    const endpoint = (credentials.endpoint || '').trim().slice(0, 240);

    if (isUsingDemoFallback()) {
      const item: ApiIntegrationItem = {
        id: `demo_${subdomain}_${provider}`,
        provider,
        endpoint: endpoint || undefined,
        keyHint,
        isActive,
        hasCredentials: true,
        createdAt: new Date().toISOString(),
      };
      const next = [
        ...readDemoIntegrations(subdomain).filter((existing) => existing.provider !== provider),
        item,
      ];
      writeDemoIntegrations(subdomain, next);
      return item;
    }

    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;
    const docId = `${effectiveOwnerUid.slice(0, 24)}_${provider}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ref = doc(db, 'tenant_integrations', docId);

    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        await updateDoc(ref, {
          ...(endpoint ? { endpoint } : {}),
          keyHint,
          isActive,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: docId,
          tenantSubdomain: subdomain,
          provider,
          ...(endpoint ? { endpoint } : {}),
          keyHint,
          isActive,
          ownerUid: effectiveOwnerUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return {
        id: docId,
        provider,
        endpoint: endpoint || undefined,
        keyHint,
        isActive,
        hasCredentials: true,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tenant_integrations/${docId}`);
    }
  },

  async deleteIntegration(provider: string, targetOwnerUid?: string): Promise<{ deleted: boolean }> {
    const subdomain = getActiveTenantSubdomain();
    if (isUsingDemoFallback()) {
      const next = readDemoIntegrations(subdomain).filter((existing) => existing.provider !== provider);
      writeDemoIntegrations(subdomain, next);
      return { deleted: true };
    }
    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;
    const docId = `${effectiveOwnerUid.slice(0, 24)}_${provider}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      await deleteDoc(doc(db, 'tenant_integrations', docId));
      return { deleted: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tenant_integrations/${docId}`);
    }
  },

  async seedTenantFromWorkspace(
    targetOwnerUid?: string
  ): Promise<{ customersSynced: number; inventorySynced: number }> {
    const snapshot = storage.getDatabase();
    if (isUsingDemoFallback()) {
      return {
        customersSynced: (snapshot.customers || []).length,
        inventorySynced: (snapshot.parts || []).length,
      };
    }
    const { uid } = requireVerifiedUid();
    const effectiveOwnerUid = targetOwnerUid || uid;
    await firestoreSync.syncDatabaseDiff(effectiveOwnerUid, snapshot, {
      allowDeletes: false,
      forceAll: true,
    });
    return {
      customersSynced: (snapshot.customers || []).length,
      inventorySynced: (snapshot.parts || []).length,
    };
  },
};
