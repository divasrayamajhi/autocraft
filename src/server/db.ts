import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

export interface TenantRow {
  id: string;
  subdomain: string;
  company_name: string;
  created_at: string;
}

export interface TenantUserRow {
  id: string;
  tenant_id: string;
  firebase_uid: string;
  email: string;
  role: string;
  created_at: string;
}

export interface TenantCustomerRow {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  vehicle_details: unknown;
  created_at: string;
}

export interface TenantInventoryRow {
  id: string;
  tenant_id: string;
  sku: string;
  item_name: string;
  stock_qty: number;
  unit_price: string;
  created_at: string;
}

export interface TenantIntegrationRow {
  id: string;
  tenant_id: string;
  provider: string;
  encrypted_credentials: string;
  is_active: boolean;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare global {
  var _autocraftPgPool: Pool | undefined;
}

export function isPostgresConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST &&
      process.env.SQL_USER &&
      process.env.SQL_PASSWORD &&
      process.env.SQL_DB_NAME
  );
}

/**
 * Creates or returns the shared PostgreSQL connection pool using the Object Method.
 * Connections are established lazily on demand (no eager startup probes or reconnect loops).
 */
export function getPgPool(): Pool | null {
  if (!isPostgresConfigured()) {
    return null;
  }
  if (!global._autocraftPgPool) {
    global._autocraftPgPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });
    global._autocraftPgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL pool client:', err);
    });
  }
  return global._autocraftPgPool;
}

let schemaInitPromise: Promise<void> | null = null;
let schemaInitialized = false;

/**
 * Idempotently executes schema.sql on PostgreSQL if tables do not yet exist.
 * Invoked lazily when Postgres requests arrive (and once on server boot if SQL_* is configured).
 */
export async function ensureSchemaInitialized(): Promise<void> {
  const pool = getPgPool();
  if (!pool || schemaInitialized) return;

  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      try {
        const schemaPath = path.resolve(process.cwd(), 'schema.sql');
        const ddl = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(ddl);
        schemaInitialized = true;
      } catch (err) {
        schemaInitPromise = null;
        console.error('PostgreSQL schema initialization failed:', err);
        throw new Error('Database initialization failed. Please try again later.', { cause: err });
      }
    })();
  }
  return schemaInitPromise;
}

// ============================================================================
// In-Memory Multi-Tenant Fallback Store (used ONLY when SQL_* env vars are unset)
// ============================================================================
interface MemoryStore {
  tenants: TenantRow[];
  users: TenantUserRow[];
  customers: TenantCustomerRow[];
  inventory: TenantInventoryRow[];
  integrations: TenantIntegrationRow[];
}

const DEFAULT_LAVISH_ID = '00000000-0000-4000-8000-000000000001';

const memoryStore: MemoryStore = {
  tenants: [
    {
      id: DEFAULT_LAVISH_ID,
      subdomain: 'lavish',
      company_name: 'Lavish Mobility',
      created_at: new Date().toISOString(),
    },
  ],
  users: [],
  customers: [],
  inventory: [],
  integrations: [],
};

// ============================================================================
// Tenant-Isolated Repository Operations (Parameterized SQL + Strict tenant_id)
// ============================================================================

export async function findTenantBySubdomain(subdomain: string): Promise<TenantRow | null> {
  const normalized = subdomain.trim().toLowerCase();
  const pool = getPgPool();
  if (!pool) {
    return memoryStore.tenants.find((t) => t.subdomain === normalized) ?? null;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantRow>(
      'SELECT id, subdomain, company_name, created_at FROM tenants WHERE subdomain = $1 LIMIT 1',
      [normalized]
    );
    return res.rows[0] ?? null;
  } catch (err) {
    console.error('findTenantBySubdomain failed:', err);
    throw new Error('Database query failed. Please try again later.', { cause: err });
  }
}

export async function createTenantWithOwner(params: {
  subdomain: string;
  companyName: string;
  firebaseUid: string;
  email: string;
}): Promise<{ tenant: TenantRow; user: TenantUserRow }> {
  const subdomain = params.subdomain.trim().toLowerCase();
  const companyName = params.companyName.trim();
  const email = params.email.trim().toLowerCase();
  const pool = getPgPool();

  if (!pool) {
    const existing = memoryStore.tenants.find((t) => t.subdomain === subdomain);
    if (existing) {
      // Allow claiming the seeded 'lavish' tenant only if it has zero users yet
      const existingUsers = memoryStore.users.filter((u) => u.tenant_id === existing.id);
      if (subdomain === 'lavish' && existingUsers.length === 0) {
        existing.company_name = companyName || existing.company_name;
        const owner: TenantUserRow = {
          id: crypto.randomUUID(),
          tenant_id: existing.id,
          firebase_uid: params.firebaseUid,
          email,
          role: 'owner',
          created_at: new Date().toISOString(),
        };
        memoryStore.users.push(owner);
        return { tenant: existing, user: owner };
      }
      const conflictErr = new Error('Subdomain is already registered.');
      (conflictErr as { statusCode?: number }).statusCode = 409;
      throw conflictErr;
    }

    const tenant: TenantRow = {
      id: crypto.randomUUID(),
      subdomain,
      company_name: companyName,
      created_at: new Date().toISOString(),
    };
    const user: TenantUserRow = {
      id: crypto.randomUUID(),
      tenant_id: tenant.id,
      firebase_uid: params.firebaseUid,
      email,
      role: 'owner',
      created_at: new Date().toISOString(),
    };
    memoryStore.tenants.push(tenant);
    memoryStore.users.push(user);
    return { tenant, user };
  }

  await ensureSchemaInitialized();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingTenantRes = await client.query<TenantRow>(
      'SELECT id, subdomain, company_name, created_at FROM tenants WHERE subdomain = $1 FOR UPDATE',
      [subdomain]
    );

    let tenant: TenantRow;
    if (existingTenantRes.rows.length > 0) {
      const existingTenant = existingTenantRes.rows[0];
      const countRes = await client.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM users WHERE tenant_id = $1',
        [existingTenant.id]
      );
      if (subdomain === 'lavish' && Number(countRes.rows[0]?.cnt || '0') === 0) {
        const updated = await client.query<TenantRow>(
          'UPDATE tenants SET company_name = $1 WHERE id = $2 RETURNING id, subdomain, company_name, created_at',
          [companyName || existingTenant.company_name, existingTenant.id]
        );
        tenant = updated.rows[0];
      } else {
        await client.query('ROLLBACK');
        const conflictErr = new Error('Subdomain is already registered.');
        (conflictErr as { statusCode?: number }).statusCode = 409;
        throw conflictErr;
      }
    } else {
      const insertTenantRes = await client.query<TenantRow>(
        'INSERT INTO tenants (subdomain, company_name) VALUES ($1, $2) RETURNING id, subdomain, company_name, created_at',
        [subdomain, companyName]
      );
      tenant = insertTenantRes.rows[0];
    }

    const insertUserRes = await client.query<TenantUserRow>(
      `INSERT INTO users (tenant_id, firebase_uid, email, role)
       VALUES ($1, $2, $3, 'owner')
       ON CONFLICT (tenant_id, email) DO UPDATE SET firebase_uid = EXCLUDED.firebase_uid
       RETURNING id, tenant_id, firebase_uid, email, role, created_at`,
      [tenant.id, params.firebaseUid, email]
    );

    await client.query('COMMIT');
    return { tenant, user: insertUserRes.rows[0] };
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    if ((err as { statusCode?: number }).statusCode === 409) {
      throw err;
    }
    console.error('createTenantWithOwner failed:', err);
    throw new Error('Failed to register tenant.', { cause: err });
  } finally {
    client.release();
  }
}

export async function findOrClaimTenantUser(params: {
  tenantId: string;
  tenantSubdomain: string;
  firebaseUid: string;
  email: string;
}): Promise<TenantUserRow | null> {
  const email = params.email.trim().toLowerCase();
  const pool = getPgPool();

  if (!pool) {
    const existing = memoryStore.users.find(
      (u) => u.tenant_id === params.tenantId && u.firebase_uid === params.firebaseUid
    );
    if (existing) return existing;

    // Also link pre-invited staff row by email if added by tenant owner
    const invitedByEmail = memoryStore.users.find(
      (u) => u.tenant_id === params.tenantId && u.email === email && !u.firebase_uid
    );
    if (invitedByEmail) {
      invitedByEmail.firebase_uid = params.firebaseUid;
      return invitedByEmail;
    }

    // Atomic first-run owner claim ONLY when the seeded 'lavish' tenant has zero users
    if (params.tenantSubdomain === 'lavish') {
      const tenantUserCount = memoryStore.users.filter((u) => u.tenant_id === params.tenantId).length;
      if (tenantUserCount === 0) {
        const owner: TenantUserRow = {
          id: crypto.randomUUID(),
          tenant_id: params.tenantId,
          firebase_uid: params.firebaseUid,
          email,
          role: 'owner',
          created_at: new Date().toISOString(),
        };
        memoryStore.users.push(owner);
        return owner;
      }
    }
    return null;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantUserRow>(
      `SELECT id, tenant_id, firebase_uid, email, role, created_at
       FROM users
       WHERE tenant_id = $1 AND firebase_uid = $2
       LIMIT 1`,
      [params.tenantId, params.firebaseUid]
    );
    if (res.rows[0]) return res.rows[0];

    // Atomic first-run claim ONLY when the default seeded 'lavish' tenant has 0 users
    if (params.tenantSubdomain === 'lavish') {
      const claimRes = await pool.query<TenantUserRow>(
        `INSERT INTO users (tenant_id, firebase_uid, email, role)
         SELECT $1, $2, $3, 'owner'
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = $1)
         RETURNING id, tenant_id, firebase_uid, email, role, created_at`,
        [params.tenantId, params.firebaseUid, email]
      );
      if (claimRes.rows[0]) return claimRes.rows[0];
    }

    return null;
  } catch (err) {
    console.error('findOrClaimTenantUser failed:', err);
    throw new Error('Authentication lookup failed. Please try again later.', { cause: err });
  }
}

export async function listCustomersPaginated(
  tenantId: string,
  page: number,
  limit: number,
  search: string
): Promise<PaginatedResult<TenantCustomerRow>> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 25));
  const offset = (safePage - 1) * safeLimit;
  const trimmedSearch = search.trim();
  const pool = getPgPool();

  if (!pool) {
    const q = trimmedSearch.toLowerCase();
    const filtered = memoryStore.customers
      .filter((c) => c.tenant_id === tenantId)
      .filter((c) => {
        if (!q) return true;
        return (
          c.full_name.toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = filtered.length;
    return {
      items: filtered.slice(offset, offset + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  try {
    await ensureSchemaInitialized();
    if (trimmedSearch) {
      const pattern = `%${trimmedSearch}%`;
      const [countRes, rowsRes] = await Promise.all([
        pool.query<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt
           FROM customers
           WHERE tenant_id = $1 AND (full_name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`,
          [tenantId, pattern]
        ),
        pool.query<TenantCustomerRow>(
          `SELECT id, tenant_id, full_name, phone, email, vehicle_details, created_at
           FROM customers
           WHERE tenant_id = $1 AND (full_name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)
           ORDER BY created_at DESC
           LIMIT $3 OFFSET $4`,
          [tenantId, pattern, safeLimit, offset]
        ),
      ]);
      const total = Number(countRes.rows[0]?.cnt || '0');
      return {
        items: rowsRes.rows,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      };
    }

    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM customers WHERE tenant_id = $1',
        [tenantId]
      ),
      pool.query<TenantCustomerRow>(
        `SELECT id, tenant_id, full_name, phone, email, vehicle_details, created_at
         FROM customers
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [tenantId, safeLimit, offset]
      ),
    ]);
    const total = Number(countRes.rows[0]?.cnt || '0');
    return {
      items: rowsRes.rows,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  } catch (err) {
    console.error('listCustomersPaginated failed:', err);
    throw new Error('Failed to load customers.', { cause: err });
  }
}

export async function createCustomer(
  tenantId: string,
  payload: { fullName: string; phone?: string; email?: string; vehicleDetails?: unknown }
): Promise<TenantCustomerRow> {
  const pool = getPgPool();
  const vehicleDetails = payload.vehicleDetails ?? [];
  if (!pool) {
    const row: TenantCustomerRow = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      full_name: payload.fullName.trim(),
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      vehicle_details: vehicleDetails,
      created_at: new Date().toISOString(),
    };
    memoryStore.customers.unshift(row);
    return row;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantCustomerRow>(
      `INSERT INTO customers (tenant_id, full_name, phone, email, vehicle_details)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, tenant_id, full_name, phone, email, vehicle_details, created_at`,
      [
        tenantId,
        payload.fullName.trim(),
        payload.phone?.trim() || null,
        payload.email?.trim() || null,
        JSON.stringify(vehicleDetails),
      ]
    );
    return res.rows[0];
  } catch (err) {
    console.error('createCustomer failed:', err);
    throw new Error('Failed to save customer.', { cause: err });
  }
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  payload: { fullName: string; phone?: string; email?: string; vehicleDetails?: unknown }
): Promise<TenantCustomerRow | null> {
  const pool = getPgPool();
  const vehicleDetails = payload.vehicleDetails ?? [];
  if (!pool) {
    const existing = memoryStore.customers.find(
      (c) => c.tenant_id === tenantId && c.id === customerId
    );
    if (!existing) return null;
    existing.full_name = payload.fullName.trim();
    existing.phone = payload.phone?.trim() || null;
    existing.email = payload.email?.trim() || null;
    existing.vehicle_details = vehicleDetails;
    return existing;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantCustomerRow>(
      `UPDATE customers
       SET full_name = $3, phone = $4, email = $5, vehicle_details = $6::jsonb
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, full_name, phone, email, vehicle_details, created_at`,
      [
        tenantId,
        customerId,
        payload.fullName.trim(),
        payload.phone?.trim() || null,
        payload.email?.trim() || null,
        JSON.stringify(vehicleDetails),
      ]
    );
    return res.rows[0] ?? null;
  } catch (err) {
    console.error('updateCustomer failed:', err);
    throw new Error('Failed to update customer.', { cause: err });
  }
}

export async function deleteCustomer(tenantId: string, customerId: string): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) {
    const idx = memoryStore.customers.findIndex(
      (c) => c.tenant_id === tenantId && c.id === customerId
    );
    if (idx < 0) return false;
    memoryStore.customers.splice(idx, 1);
    return true;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query(
      'DELETE FROM customers WHERE tenant_id = $1 AND id = $2',
      [tenantId, customerId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('deleteCustomer failed:', err);
    throw new Error('Failed to delete customer.', { cause: err });
  }
}

export async function listInventoryPaginated(
  tenantId: string,
  page: number,
  limit: number,
  search: string
): Promise<PaginatedResult<TenantInventoryRow>> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit) || 25));
  const offset = (safePage - 1) * safeLimit;
  const trimmedSearch = search.trim();
  const pool = getPgPool();

  if (!pool) {
    const q = trimmedSearch.toLowerCase();
    const filtered = memoryStore.inventory
      .filter((i) => i.tenant_id === tenantId)
      .filter((i) => {
        if (!q) return true;
        return i.sku.toLowerCase().includes(q) || i.item_name.toLowerCase().includes(q);
      })
      .sort((a, b) => a.item_name.localeCompare(b.item_name));
    const total = filtered.length;
    return {
      items: filtered.slice(offset, offset + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  try {
    await ensureSchemaInitialized();
    if (trimmedSearch) {
      const pattern = `%${trimmedSearch}%`;
      const [countRes, rowsRes] = await Promise.all([
        pool.query<{ cnt: string }>(
          `SELECT COUNT(*)::text AS cnt
           FROM inventory
           WHERE tenant_id = $1 AND (sku ILIKE $2 OR item_name ILIKE $2)`,
          [tenantId, pattern]
        ),
        pool.query<TenantInventoryRow>(
          `SELECT id, tenant_id, sku, item_name, stock_qty, unit_price, created_at
           FROM inventory
           WHERE tenant_id = $1 AND (sku ILIKE $2 OR item_name ILIKE $2)
           ORDER BY item_name ASC
           LIMIT $3 OFFSET $4`,
          [tenantId, pattern, safeLimit, offset]
        ),
      ]);
      const total = Number(countRes.rows[0]?.cnt || '0');
      return {
        items: rowsRes.rows,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      };
    }

    const [countRes, rowsRes] = await Promise.all([
      pool.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM inventory WHERE tenant_id = $1',
        [tenantId]
      ),
      pool.query<TenantInventoryRow>(
        `SELECT id, tenant_id, sku, item_name, stock_qty, unit_price, created_at
         FROM inventory
         WHERE tenant_id = $1
         ORDER BY item_name ASC
         LIMIT $2 OFFSET $3`,
        [tenantId, safeLimit, offset]
      ),
    ]);
    const total = Number(countRes.rows[0]?.cnt || '0');
    return {
      items: rowsRes.rows,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  } catch (err) {
    console.error('listInventoryPaginated failed:', err);
    throw new Error('Failed to load inventory.', { cause: err });
  }
}

export async function upsertInventoryItem(
  tenantId: string,
  payload: { sku: string; itemName: string; stockQty: number; unitPrice: number }
): Promise<TenantInventoryRow> {
  const sku = payload.sku.trim();
  const itemName = payload.itemName.trim();
  const stockQty = Math.max(0, Math.floor(Number(payload.stockQty) || 0));
  const unitPrice = Math.max(0, Math.round((Number(payload.unitPrice) || 0) * 100) / 100);
  const pool = getPgPool();

  if (!pool) {
    const existing = memoryStore.inventory.find(
      (i) => i.tenant_id === tenantId && i.sku.toLowerCase() === sku.toLowerCase()
    );
    if (existing) {
      existing.item_name = itemName;
      existing.stock_qty = stockQty;
      existing.unit_price = unitPrice.toFixed(2);
      return existing;
    }
    const row: TenantInventoryRow = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      sku,
      item_name: itemName,
      stock_qty: stockQty,
      unit_price: unitPrice.toFixed(2),
      created_at: new Date().toISOString(),
    };
    memoryStore.inventory.push(row);
    return row;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantInventoryRow>(
      `INSERT INTO inventory (tenant_id, sku, item_name, stock_qty, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, sku)
       DO UPDATE SET item_name = EXCLUDED.item_name, stock_qty = EXCLUDED.stock_qty, unit_price = EXCLUDED.unit_price
       RETURNING id, tenant_id, sku, item_name, stock_qty, unit_price, created_at`,
      [tenantId, sku, itemName, stockQty, unitPrice]
    );
    return res.rows[0];
  } catch (err) {
    console.error('upsertInventoryItem failed:', err);
    throw new Error('Failed to save inventory item.', { cause: err });
  }
}

export async function deleteInventoryItem(tenantId: string, itemId: string): Promise<boolean> {
  const pool = getPgPool();
  if (!pool) {
    const idx = memoryStore.inventory.findIndex(
      (i) => i.tenant_id === tenantId && i.id === itemId
    );
    if (idx < 0) return false;
    memoryStore.inventory.splice(idx, 1);
    return true;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query(
      'DELETE FROM inventory WHERE tenant_id = $1 AND id = $2',
      [tenantId, itemId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('deleteInventoryItem failed:', err);
    throw new Error('Failed to delete inventory item.', { cause: err });
  }
}

export async function listTenantIntegrations(
  tenantId: string
): Promise<Array<{ id: string; provider: string; isActive: boolean; hasCredentials: boolean; createdAt: string }>> {
  const pool = getPgPool();
  if (!pool) {
    return memoryStore.integrations
      .filter((i) => i.tenant_id === tenantId)
      .map((i) => ({
        id: i.id,
        provider: i.provider,
        isActive: i.is_active,
        hasCredentials: Boolean(i.encrypted_credentials),
        createdAt: i.created_at,
      }));
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantIntegrationRow>(
      `SELECT id, tenant_id, provider, encrypted_credentials, is_active, created_at
       FROM tenant_integrations
       WHERE tenant_id = $1
       ORDER BY provider ASC`,
      [tenantId]
    );
    return res.rows.map((i) => ({
      id: i.id,
      provider: i.provider,
      isActive: i.is_active,
      hasCredentials: Boolean(i.encrypted_credentials),
      createdAt: i.created_at,
    }));
  } catch (err) {
    console.error('listTenantIntegrations failed:', err);
    throw new Error('Failed to load tenant integrations.', { cause: err });
  }
}

export async function upsertTenantIntegration(
  tenantId: string,
  provider: string,
  encryptedCredentials: string,
  isActive: boolean
): Promise<{ id: string; provider: string; isActive: boolean; hasCredentials: boolean; createdAt: string }> {
  const cleanProvider = provider.trim().toLowerCase();
  const pool = getPgPool();

  if (!pool) {
    const existing = memoryStore.integrations.find(
      (i) => i.tenant_id === tenantId && i.provider === cleanProvider
    );
    if (existing) {
      existing.encrypted_credentials = encryptedCredentials;
      existing.is_active = isActive;
      return {
        id: existing.id,
        provider: existing.provider,
        isActive: existing.is_active,
        hasCredentials: true,
        createdAt: existing.created_at,
      };
    }
    const row: TenantIntegrationRow = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      provider: cleanProvider,
      encrypted_credentials: encryptedCredentials,
      is_active: isActive,
      created_at: new Date().toISOString(),
    };
    memoryStore.integrations.push(row);
    return {
      id: row.id,
      provider: row.provider,
      isActive: row.is_active,
      hasCredentials: true,
      createdAt: row.created_at,
    };
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query<TenantIntegrationRow>(
      `INSERT INTO tenant_integrations (tenant_id, provider, encrypted_credentials, is_active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, provider)
       DO UPDATE SET encrypted_credentials = EXCLUDED.encrypted_credentials, is_active = EXCLUDED.is_active
       RETURNING id, tenant_id, provider, encrypted_credentials, is_active, created_at`,
      [tenantId, cleanProvider, encryptedCredentials, isActive]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      provider: r.provider,
      isActive: r.is_active,
      hasCredentials: Boolean(r.encrypted_credentials),
      createdAt: r.created_at,
    };
  } catch (err) {
    console.error('upsertTenantIntegration failed:', err);
    throw new Error('Failed to save integration.', { cause: err });
  }
}

export async function deleteTenantIntegration(tenantId: string, provider: string): Promise<boolean> {
  const cleanProvider = provider.trim().toLowerCase();
  const pool = getPgPool();

  if (!pool) {
    const idx = memoryStore.integrations.findIndex(
      (i) => i.tenant_id === tenantId && i.provider === cleanProvider
    );
    if (idx < 0) return false;
    memoryStore.integrations.splice(idx, 1);
    return true;
  }

  try {
    await ensureSchemaInitialized();
    const res = await pool.query(
      'DELETE FROM tenant_integrations WHERE tenant_id = $1 AND provider = $2',
      [tenantId, cleanProvider]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (err) {
    console.error('deleteTenantIntegration failed:', err);
    throw new Error('Failed to remove integration.', { cause: err });
  }
}

export async function getTenantDashboardStats(tenantId: string): Promise<{
  totalCustomers: number;
  totalInventoryItems: number;
  lowStockCount: number;
  totalInventoryValue: number;
  activeIntegrations: number;
}> {
  const pool = getPgPool();

  if (!pool) {
    const custCount = memoryStore.customers.filter((c) => c.tenant_id === tenantId).length;
    const invRows = memoryStore.inventory.filter((i) => i.tenant_id === tenantId);
    const lowStock = invRows.filter((i) => i.stock_qty <= 5).length;
    const totalVal = invRows.reduce(
      (sum, i) => sum + i.stock_qty * (Number(i.unit_price) || 0),
      0
    );
    const activeInt = memoryStore.integrations.filter(
      (i) => i.tenant_id === tenantId && i.is_active
    ).length;
    return {
      totalCustomers: custCount,
      totalInventoryItems: invRows.length,
      lowStockCount: lowStock,
      totalInventoryValue: Math.round(totalVal * 100) / 100,
      activeIntegrations: activeInt,
    };
  }

  try {
    await ensureSchemaInitialized();
    const [custRes, invRes, intRes] = await Promise.all([
      pool.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM customers WHERE tenant_id = $1',
        [tenantId]
      ),
      pool.query<{ cnt: string; low_cnt: string; total_val: string }>(
        `SELECT
           COUNT(*)::text AS cnt,
           COUNT(*) FILTER (WHERE stock_qty <= 5)::text AS low_cnt,
           COALESCE(SUM(stock_qty * unit_price), 0)::text AS total_val
         FROM inventory
         WHERE tenant_id = $1`,
        [tenantId]
      ),
      pool.query<{ cnt: string }>(
        'SELECT COUNT(*)::text AS cnt FROM tenant_integrations WHERE tenant_id = $1 AND is_active = TRUE',
        [tenantId]
      ),
    ]);

    return {
      totalCustomers: Number(custRes.rows[0]?.cnt || '0'),
      totalInventoryItems: Number(invRes.rows[0]?.cnt || '0'),
      lowStockCount: Number(invRes.rows[0]?.low_cnt || '0'),
      totalInventoryValue: Math.round(Number(invRes.rows[0]?.total_val || '0') * 100) / 100,
      activeIntegrations: Number(intRes.rows[0]?.cnt || '0'),
    };
  } catch (err) {
    console.error('getTenantDashboardStats failed:', err);
    throw new Error('Failed to load dashboard metrics.', { cause: err });
  }
}

export async function bulkSeedTenantRecords(
  tenantId: string,
  customers: Array<{ fullName: string; phone?: string; email?: string; vehicleDetails?: unknown }>,
  inventory: Array<{ sku: string; itemName: string; stockQty: number; unitPrice: number }>
): Promise<{ customersSynced: number; inventorySynced: number }> {
  const existingCust = await listCustomersPaginated(tenantId, 1, 1, '');
  let customersSynced = 0;
  if (existingCust.total === 0) {
    for (const c of customers.slice(0, 200)) {
      if (c.fullName?.trim()) {
        await createCustomer(tenantId, c);
        customersSynced++;
      }
    }
  }

  let inventorySynced = 0;
  for (const item of inventory.slice(0, 200)) {
    if (item.sku?.trim() && item.itemName?.trim()) {
      await upsertInventoryItem(tenantId, item);
      inventorySynced++;
    }
  }

  return { customersSynced, inventorySynced };
}
