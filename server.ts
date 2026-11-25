import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import {
  bulkSeedTenantRecords,
  createCustomer,
  createTenantWithOwner,
  deleteCustomer,
  deleteInventoryItem,
  deleteTenantIntegration,
  findTenantBySubdomain,
  getTenantDashboardStats,
  listCustomersPaginated,
  listInventoryPaginated,
  listTenantIntegrations,
  updateCustomer,
  upsertInventoryItem,
  upsertTenantIntegration,
} from './src/server/db.ts';
import { encryptCredentials } from './src/server/crypto.ts';
import { verifyFirebaseIdToken } from './src/server/firebaseAdmin.ts';
import {
  extractSubdomainFromRequest,
  requireTenantAuth,
  SUBDOMAIN_REGEX,
  TenantAuthenticatedRequest,
} from './src/server/middleware/tenantAuth.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVIDER_REGEX = /^[a-z0-9_-]{2,64}$/i;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));

  // =========================================================================
  // 1. PUBLIC ENDPOINTS (Exempt from Tenant Auth Middleware)
  // =========================================================================

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'autocraft-pro' });
  });

  app.get('/api/tenant/resolve', async (req: Request, res: Response) => {
    const subdomain = extractSubdomainFromRequest(req);
    if (!subdomain) {
      res.status(404).json({ error: 'Tenant Not Found' });
      return;
    }
    try {
      const tenant = await findTenantBySubdomain(subdomain);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant Not Found', subdomain });
        return;
      }
      res.json({
        subdomain: tenant.subdomain,
        companyName: tenant.company_name,
      });
    } catch {
      res.status(500).json({ error: 'Unable to resolve workspace tenant.' });
    }
  });

  /**
   * POST /api/onboarding/register-tenant
   * Verifies caller's Firebase ID token, creates a new tenant subdomain in `tenants`,
   * and links their `firebase_uid` in `users` with role = 'owner'.
   */
  app.post('/api/onboarding/register-tenant', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing Firebase Bearer token' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch {
      res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
      return;
    }

    const rawSubdomain = typeof req.body?.subdomain === 'string' ? req.body.subdomain.trim().toLowerCase() : '';
    const rawCompanyName = typeof req.body?.companyName === 'string' ? req.body.companyName.trim() : '';

    if (!SUBDOMAIN_REGEX.test(rawSubdomain) || rawSubdomain.length < 2 || rawSubdomain.length > 63) {
      res.status(400).json({
        error: 'Subdomain must be 2–63 lowercase letters, digits, or internal hyphens.',
      });
      return;
    }

    const reserved = new Set(['www', 'api', 'admin', 'app', 'auth', 'mail', 'static']);
    if (reserved.has(rawSubdomain)) {
      res.status(400).json({ error: 'This subdomain is reserved. Please choose another.' });
      return;
    }

    if (rawCompanyName.length < 2 || rawCompanyName.length > 255) {
      res.status(400).json({ error: 'Company name must be between 2 and 255 characters.' });
      return;
    }

    const ownerEmail = decoded.email || (typeof req.body?.email === 'string' ? req.body.email.trim() : '');
    if (!ownerEmail) {
      res.status(400).json({ error: 'Authenticated account must include an email address.' });
      return;
    }

    try {
      const created = await createTenantWithOwner({
        subdomain: rawSubdomain,
        companyName: rawCompanyName,
        firebaseUid: decoded.uid,
        email: ownerEmail,
      });

      res.status(201).json({
        tenant: {
          id: created.tenant.id,
          subdomain: created.tenant.subdomain,
          companyName: created.tenant.company_name,
          createdAt: created.tenant.created_at,
        },
        user: {
          id: created.user.id,
          email: created.user.email,
          role: created.user.role,
        },
      });
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode || 500;
      if (statusCode >= 500) {
        console.error('Tenant registration failed:', err);
        res.status(500).json({ error: 'Unable to register company tenant.' });
      } else {
        res.status(statusCode).json({
          error: err instanceof Error ? err.message : 'Unable to register company tenant.',
        });
      }
    }
  });

  // =========================================================================
  // 2. TENANT-ISOLATED PROTECTED /api/* ROUTES
  // =========================================================================
  const tenantRouter = express.Router();
  tenantRouter.use(requireTenantAuth);

  // Dashboard Metrics (strictly filtered by tenant_id)
  tenantRouter.get('/dashboard', async (req: TenantAuthenticatedRequest, res: Response) => {
    try {
      const stats = await getTenantDashboardStats(req.tenantId!);
      res.json({
        tenant: {
          id: req.tenant!.id,
          subdomain: req.tenant!.subdomain,
          companyName: req.tenant!.company_name,
        },
        user: {
          id: req.user!.id,
          email: req.user!.email,
          role: req.user!.role,
        },
        metrics: stats,
      });
    } catch (err) {
      console.error('Failed to load tenant dashboard:', err);
      res.status(500).json({ error: 'Failed to load dashboard.' });
    }
  });

  // Paginated Customers (5,000+ ready with LIMIT / OFFSET + search)
  tenantRouter.get('/customers', async (req: TenantAuthenticatedRequest, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    try {
      const result = await listCustomersPaginated(req.tenantId!, page, limit, search);
      res.json(result);
    } catch (err) {
      console.error('Failed to list customers:', err);
      res.status(500).json({ error: 'Failed to load customers.' });
    }
  });

  tenantRouter.post('/customers', async (req: TenantAuthenticatedRequest, res: Response) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : undefined;
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : undefined;
    const vehicleDetails = req.body?.vehicleDetails ?? [];

    if (!fullName || fullName.length > 255) {
      res.status(400).json({ error: 'Customer full name is required (max 255 chars).' });
      return;
    }

    try {
      const created = await createCustomer(req.tenantId!, {
        fullName,
        phone,
        email,
        vehicleDetails,
      });
      res.status(201).json(created);
    } catch (err) {
      console.error('Failed to create customer:', err);
      res.status(500).json({ error: 'Failed to create customer.' });
    }
  });

  tenantRouter.put('/customers/:id', async (req: TenantAuthenticatedRequest, res: Response) => {
    const customerId = req.params.id;
    if (!UUID_REGEX.test(customerId)) {
      res.status(400).json({ error: 'Invalid customer ID format.' });
      return;
    }
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    if (!fullName || fullName.length > 255) {
      res.status(400).json({ error: 'Customer full name is required (max 255 chars).' });
      return;
    }
    try {
      const updated = await updateCustomer(req.tenantId!, customerId, {
        fullName,
        phone: typeof req.body?.phone === 'string' ? req.body.phone.trim() : undefined,
        email: typeof req.body?.email === 'string' ? req.body.email.trim() : undefined,
        vehicleDetails: req.body?.vehicleDetails ?? [],
      });
      if (!updated) {
        res.status(404).json({ error: 'Customer not found.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      console.error('Failed to update customer:', err);
      res.status(500).json({ error: 'Failed to update customer.' });
    }
  });

  tenantRouter.delete('/customers/:id', async (req: TenantAuthenticatedRequest, res: Response) => {
    const customerId = req.params.id;
    if (!UUID_REGEX.test(customerId)) {
      res.status(400).json({ error: 'Invalid customer ID format.' });
      return;
    }
    try {
      const removed = await deleteCustomer(req.tenantId!, customerId);
      if (!removed) {
        res.status(404).json({ error: 'Customer not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('Failed to delete customer:', err);
      res.status(500).json({ error: 'Failed to delete customer.' });
    }
  });

  // Paginated Inventory (5,000+ ready with LIMIT / OFFSET + search)
  tenantRouter.get('/inventory', async (req: TenantAuthenticatedRequest, res: Response) => {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 25);
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    try {
      const result = await listInventoryPaginated(req.tenantId!, page, limit, search);
      res.json(result);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      res.status(500).json({ error: 'Failed to load inventory.' });
    }
  });

  tenantRouter.post('/inventory', async (req: TenantAuthenticatedRequest, res: Response) => {
    const sku = typeof req.body?.sku === 'string' ? req.body.sku.trim() : '';
    const itemName = typeof req.body?.itemName === 'string' ? req.body.itemName.trim() : '';
    const stockQty = Number(req.body?.stockQty ?? 0);
    const unitPrice = Number(req.body?.unitPrice ?? 0);

    if (!sku || sku.length > 100 || !itemName || itemName.length > 255) {
      res.status(400).json({ error: 'Valid SKU and item name are required.' });
      return;
    }
    if (!Number.isFinite(stockQty) || stockQty < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      res.status(400).json({ error: 'Stock quantity and unit price must be non-negative numbers.' });
      return;
    }

    try {
      const saved = await upsertInventoryItem(req.tenantId!, {
        sku,
        itemName,
        stockQty,
        unitPrice,
      });
      res.status(201).json(saved);
    } catch (err) {
      console.error('Failed to save inventory item:', err);
      res.status(500).json({ error: 'Failed to save inventory item.' });
    }
  });

  tenantRouter.delete('/inventory/:id', async (req: TenantAuthenticatedRequest, res: Response) => {
    const itemId = req.params.id;
    if (!UUID_REGEX.test(itemId)) {
      res.status(400).json({ error: 'Invalid inventory item ID format.' });
      return;
    }
    try {
      const removed = await deleteInventoryItem(req.tenantId!, itemId);
      if (!removed) {
        res.status(404).json({ error: 'Inventory item not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('Failed to delete inventory item:', err);
      res.status(500).json({ error: 'Failed to delete inventory item.' });
    }
  });

  // Encrypted Tenant API Integrations (IRD CBMS, SMS Gateway, Payment Gateways)
  tenantRouter.get('/integrations', async (req: TenantAuthenticatedRequest, res: Response) => {
    try {
      const items = await listTenantIntegrations(req.tenantId!);
      res.json({ items });
    } catch (err) {
      console.error('Failed to load integrations:', err);
      res.status(500).json({ error: 'Failed to load integrations.' });
    }
  });

  tenantRouter.put('/integrations/:provider', async (req: TenantAuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Only tenant admins can configure integrations.' });
      return;
    }
    const provider = req.params.provider;
    if (!PROVIDER_REGEX.test(provider)) {
      res.status(400).json({ error: 'Invalid integration provider name.' });
      return;
    }
    const rawCredentials =
      typeof req.body?.credentials === 'string'
        ? req.body.credentials
        : JSON.stringify(req.body?.credentials ?? {});
    if (!rawCredentials || rawCredentials.length > 8192) {
      res.status(400).json({ error: 'Credentials payload is required (max 8KB).' });
      return;
    }
    const isActive = req.body?.isActive !== false;

    try {
      const encrypted = encryptCredentials(rawCredentials);
      const saved = await upsertTenantIntegration(req.tenantId!, provider, encrypted, isActive);
      res.json(saved);
    } catch (err) {
      console.error('Failed to save integration:', err);
      res.status(500).json({ error: 'Failed to save integration.' });
    }
  });

  tenantRouter.delete('/integrations/:provider', async (req: TenantAuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Only tenant admins can remove integrations.' });
      return;
    }
    const provider = req.params.provider;
    if (!PROVIDER_REGEX.test(provider)) {
      res.status(400).json({ error: 'Invalid integration provider name.' });
      return;
    }
    try {
      const removed = await deleteTenantIntegration(req.tenantId!, provider);
      if (!removed) {
        res.status(404).json({ error: 'Integration not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      console.error('Failed to delete integration:', err);
      res.status(500).json({ error: 'Failed to delete integration.' });
    }
  });

  // Sync active workshop customers & spare parts into tenant SQL records
  tenantRouter.post('/sync/seed-tenant', async (req: TenantAuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'owner' && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Only tenant admins can seed records.' });
      return;
    }
    const customers = Array.isArray(req.body?.customers) ? req.body.customers : [];
    const inventory = Array.isArray(req.body?.inventory) ? req.body.inventory : [];
    try {
      const summary = await bulkSeedTenantRecords(req.tenantId!, customers, inventory);
      res.json(summary);
    } catch (err) {
      console.error('Failed to sync tenant data:', err);
      res.status(500).json({ error: 'Failed to sync tenant data.' });
    }
  });

  app.use('/api', tenantRouter);

  // =========================================================================
  // 3. VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCraft Pro server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
