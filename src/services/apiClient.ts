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
import { firestoreSync } from './firestoreSyncService';
import { storage } from './storageService';

const DEFAULT_SUBDOMAIN = 'lavish';
const DEFAULT_COMPANY_NAME = 'Lavish Mobility';
const SUBDOMAIN_STORAGE_KEY = 'AUTOCRAFT_ACTIVE_SUBDOMAIN';
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ALLOWED_PROVIDERS = new Set(['ird_cbms', 'sparrow_sms', 'fonepay', 'connectips']);

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

export interface TenantInfo {
  id?: string;
  subdomain: string;
  companyName: string;
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

export function getActiveTenantSubdomain(): string {
  if (typeof window === 'undefined') return DEFAULT_SUBDOMAIN;

  if (!isPreviewOrLocalHost()) {
    const parts = window.location.hostname.toLowerCase().split('.').filter(Boolean);
    if (parts.length >= 3 && parts[0] !== 'www' && SUBDOMAIN_PATTERN.test(parts[0])) {
      return parts[0];
    }
  }

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

/**
 * 100% Firebase-Native Tenant & SaaS Client (Spark Free Tier — Zero Paid Servers Required).
 * Operates directly against Cloud Firestore + Firebase Auth so the app runs seamlessly on
 * static Firebase Hosting (`*.web.app` / custom domain) as well as AI Studio preview.
 */
export const apiClient = {
  async resolveTenant(subdomain?: string): Promise<TenantInfo> {
    const clean = (subdomain || getActiveTenantSubdomain()).trim().toLowerCase();
    if (!SUBDOMAIN_PATTERN.test(clean) || clean.length < 2) {
      throw new Error('Subdomain must use 2–63 lowercase letters, digits, or hyphens.');
    }

    const user = auth.currentUser;
    if (user && user.emailVerified) {
      const path = `tenants/${clean}`;
      try {
        const snap = await getDoc(doc(db, 'tenants', clean));
        if (snap.exists()) {
          const data = snap.data();
          return {
            id: snap.id,
            subdomain: String(data.subdomain || clean),
            companyName: String(data.companyName || formatCompanyLabel(clean)),
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

  async registerTenant(payload: {
    companyName: string;
    subdomain: string;
    email?: string;
  }): Promise<{ tenant: TenantInfo; user: { id: string; email: string; role: string } }> {
    const { uid, email } = requireVerifiedUid();
    const cleanSub = payload.subdomain.trim().toLowerCase();
    const cleanCompany = payload.companyName.trim().slice(0, 160);

    if (!SUBDOMAIN_PATTERN.test(cleanSub) || cleanSub.length < 2) {
      throw new Error('Subdomain must be 2–63 lowercase letters, digits, or internal hyphens.');
    }
    if (cleanCompany.length < 2) {
      throw new Error('Company name must be at least 2 characters.');
    }

    const ref = doc(db, 'tenants', cleanSub);
    const path = `tenants/${cleanSub}`;

    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        const data = existing.data();
        if (data.ownerUid !== uid) {
          throw new Error(`Subdomain "${cleanSub}" is already registered to another organization.`);
        }
        await updateDoc(ref, {
          companyName: cleanCompany,
          isActive: true,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          id: cleanSub,
          subdomain: cleanSub,
          companyName: cleanCompany,
          isActive: true,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered')) {
        throw err;
      }
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        throw new Error(`Subdomain "${cleanSub}" is already claimed by another workspace.`);
      }
      handleFirestoreError(err, OperationType.WRITE, path);
    }

    setActiveTenantSubdomain(cleanSub);

    return {
      tenant: {
        id: cleanSub,
        subdomain: cleanSub,
        companyName: cleanCompany,
      },
      user: {
        id: uid,
        email: email || payload.email || '',
        role: 'owner',
      },
    };
  },

  async getDashboard(): Promise<TenantDashboardResponse> {
    const { uid, email } = requireVerifiedUid();
    const subdomain = getActiveTenantSubdomain();

    let companyName = formatCompanyLabel(subdomain);
    const tenantRef = doc(db, 'tenants', subdomain);
    try {
      const tenantSnap = await getDoc(tenantRef);
      if (tenantSnap.exists()) {
        const data = tenantSnap.data();
        companyName = String(data.companyName || companyName);
      } else {
        // Auto-provision user's workspace document on first verified login
        await setDoc(tenantRef, {
          id: subdomain,
          subdomain,
          companyName,
          isActive: true,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        // Fallback: check if user owns another tenant or use personal scoped workspace
        const ownedTenantsSnap = await getDocs(
          query(collection(db, 'tenants'), where('ownerUid', '==', uid))
        );
        if (!ownedTenantsSnap.empty) {
          const first = ownedTenantsSnap.docs[0].data();
          const ownedSub = String(first.subdomain || subdomain);
          setActiveTenantSubdomain(ownedSub);
          companyName = String(first.companyName || formatCompanyLabel(ownedSub));
        }
      }
    }

    const [custSnap, partsSnap, intSnap] = await Promise.all([
      getDocs(query(collection(db, 'customers'), where('ownerUid', '==', uid))),
      getDocs(query(collection(db, 'spare_parts'), where('ownerUid', '==', uid))),
      getDocs(query(collection(db, 'tenant_integrations'), where('ownerUid', '==', uid))),
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
        id: getActiveTenantSubdomain(),
        subdomain: getActiveTenantSubdomain(),
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

  async listCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ApiCustomerRow>> {
    const { uid } = requireVerifiedUid();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const search = (params.search || '').trim().toLowerCase();

    try {
      const snap = await getDocs(
        query(collection(db, 'customers'), where('ownerUid', '==', uid))
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

  async listInventory(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ApiInventoryRow>> {
    const { uid } = requireVerifiedUid();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const search = (params.search || '').trim().toLowerCase();

    try {
      const snap = await getDocs(
        query(collection(db, 'spare_parts'), where('ownerUid', '==', uid))
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

  async listIntegrations(): Promise<{ items: ApiIntegrationItem[] }> {
    const { uid } = requireVerifiedUid();
    try {
      const snap = await getDocs(
        query(collection(db, 'tenant_integrations'), where('ownerUid', '==', uid))
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
    isActive = true
  ): Promise<ApiIntegrationItem> {
    const { uid } = requireVerifiedUid();
    if (!ALLOWED_PROVIDERS.has(provider)) {
      throw new Error('Unsupported integration provider.');
    }

    const subdomain = getActiveTenantSubdomain();
    const docId = `${uid.slice(0, 24)}_${provider}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ref = doc(db, 'tenant_integrations', docId);
    const keyHint = maskKeyHint(credentials.apiKey);
    const endpoint = (credentials.endpoint || '').trim().slice(0, 240);

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
          ownerUid: uid,
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

  async deleteIntegration(provider: string): Promise<{ deleted: boolean }> {
    const { uid } = requireVerifiedUid();
    const docId = `${uid.slice(0, 24)}_${provider}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      await deleteDoc(doc(db, 'tenant_integrations', docId));
      return { deleted: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tenant_integrations/${docId}`);
    }
  },

  async seedTenantFromWorkspace(): Promise<{ customersSynced: number; inventorySynced: number }> {
    const { uid } = requireVerifiedUid();
    const snapshot = storage.getDatabase();
    await firestoreSync.syncDatabaseDiff(uid, snapshot, { allowDeletes: false, forceAll: true });
    return {
      customersSynced: (snapshot.customers || []).length,
      inventorySynced: (snapshot.parts || []).length,
    };
  },
};
