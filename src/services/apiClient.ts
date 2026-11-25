import { auth } from '../firebase';

const DEFAULT_SUBDOMAIN = 'lavish';
const SUBDOMAIN_STORAGE_KEY = 'AUTOCRAFT_ACTIVE_SUBDOMAIN';
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

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
    // Ignore storage restriction
  }
  return DEFAULT_SUBDOMAIN;
}

export function setActiveTenantSubdomain(subdomain: string): string {
  const cleaned = subdomain.trim().toLowerCase();
  const valid = SUBDOMAIN_PATTERN.test(cleaned) ? cleaned : DEFAULT_SUBDOMAIN;
  try {
    window.sessionStorage.setItem(SUBDOMAIN_STORAGE_KEY, valid);
  } catch {
    // Ignore storage restriction
  }
  return valid;
}

async function getAuthHeaders(subdomainOverride?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const activeSubdomain = subdomainOverride || getActiveTenantSubdomain();
  if (isPreviewOrLocalHost() || subdomainOverride) {
    headers['x-tenant-subdomain'] = activeSubdomain;
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    // Token is fetched in-memory directly from Firebase Auth SDK (never persisted to localStorage)
    const idToken = await currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  return headers;
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  subdomainOverride?: string
): Promise<T> {
  const headers = await getAuthHeaders(subdomainOverride);
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body as T;
}

export const apiClient = {
  async resolveTenant(subdomain?: string): Promise<TenantInfo> {
    const target = subdomain || getActiveTenantSubdomain();
    const res = await fetch('/api/tenant/resolve', {
      headers: { 'x-tenant-subdomain': target },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof body?.error === 'string' ? body.error : 'Tenant Not Found');
    }
    return body as TenantInfo;
  },

  async registerTenant(payload: {
    companyName: string;
    subdomain: string;
    email?: string;
  }): Promise<{ tenant: TenantInfo; user: { id: string; email: string; role: string } }> {
    const result = await requestJson<{
      tenant: TenantInfo;
      user: { id: string; email: string; role: string };
    }>('/api/onboarding/register-tenant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setActiveTenantSubdomain(result.tenant.subdomain);
    return result;
  },

  async getDashboard(): Promise<TenantDashboardResponse> {
    return requestJson<TenantDashboardResponse>('/api/dashboard');
  },

  async listCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ApiCustomerRow>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    return requestJson<PaginatedResponse<ApiCustomerRow>>(`/api/customers?${qs.toString()}`);
  },

  async createCustomer(payload: {
    fullName: string;
    phone?: string;
    email?: string;
    vehicleDetails?: unknown;
  }): Promise<ApiCustomerRow> {
    return requestJson<ApiCustomerRow>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteCustomer(id: string): Promise<{ deleted: boolean }> {
    return requestJson<{ deleted: boolean }>(`/api/customers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listInventory(params: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<ApiInventoryRow>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    return requestJson<PaginatedResponse<ApiInventoryRow>>(`/api/inventory?${qs.toString()}`);
  },

  async upsertInventory(payload: {
    sku: string;
    itemName: string;
    stockQty: number;
    unitPrice: number;
  }): Promise<ApiInventoryRow> {
    return requestJson<ApiInventoryRow>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteInventory(id: string): Promise<{ deleted: boolean }> {
    return requestJson<{ deleted: boolean }>(`/api/inventory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async listIntegrations(): Promise<{ items: ApiIntegrationItem[] }> {
    return requestJson<{ items: ApiIntegrationItem[] }>('/api/integrations');
  },

  async saveIntegration(
    provider: string,
    credentials: Record<string, string>,
    isActive = true
  ): Promise<ApiIntegrationItem> {
    return requestJson<ApiIntegrationItem>(`/api/integrations/${encodeURIComponent(provider)}`, {
      method: 'PUT',
      body: JSON.stringify({ credentials, isActive }),
    });
  },

  async deleteIntegration(provider: string): Promise<{ deleted: boolean }> {
    return requestJson<{ deleted: boolean }>(`/api/integrations/${encodeURIComponent(provider)}`, {
      method: 'DELETE',
    });
  },

  async seedTenantFromWorkspace(
    customers: Array<{ fullName: string; phone?: string; email?: string; vehicleDetails?: unknown }>,
    inventory: Array<{ sku: string; itemName: string; stockQty: number; unitPrice: number }>
  ): Promise<{ customersSynced: number; inventorySynced: number }> {
    return requestJson<{ customersSynced: number; inventorySynced: number }>(
      '/api/sync/seed-tenant',
      {
        method: 'POST',
        body: JSON.stringify({ customers, inventory }),
      }
    );
  },
};
