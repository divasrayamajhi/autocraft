import { NextFunction, Request, Response } from 'express';
import {
  findOrClaimTenantUser,
  findTenantBySubdomain,
  TenantRow,
  TenantUserRow,
} from '../db.ts';
import { verifyFirebaseIdToken } from '../firebaseAdmin.ts';

export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export const DEFAULT_TENANT_SUBDOMAIN = 'lavish';

export interface TenantAuthenticatedRequest extends Request {
  tenantId?: string;
  tenant?: TenantRow;
  user?: TenantUserRow & { firebaseUid: string };
}

/**
 * Extracts tenant subdomain from req.hostname (e.g., `lavish` from `lavish.autocraftpro.com`).
 * On localhost, 127.0.0.1, .run.app, or .ai.studio, reads the optional `x-tenant-subdomain` header
 * or falls back to 'lavish'.
 */
export function extractSubdomainFromRequest(req: Request): string | null {
  const host = (req.hostname || '').trim().toLowerCase();
  const isHostedPreviewOrLocal =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.run.app') ||
    host.endsWith('.ai.studio') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com');

  if (isHostedPreviewOrLocal) {
    const headerSubdomain = req.header('x-tenant-subdomain');
    if (headerSubdomain && headerSubdomain.trim().length > 0) {
      const cleaned = headerSubdomain.trim().toLowerCase();
      return SUBDOMAIN_REGEX.test(cleaned) ? cleaned : null;
    }
    return DEFAULT_TENANT_SUBDOMAIN;
  }

  const parts = host.split('.').filter(Boolean);
  if (parts.length < 3 || parts[0] === 'www') {
    const headerSubdomain = req.header('x-tenant-subdomain');
    if (headerSubdomain && headerSubdomain.trim().length > 0) {
      const cleaned = headerSubdomain.trim().toLowerCase();
      return SUBDOMAIN_REGEX.test(cleaned) ? cleaned : null;
    }
    return DEFAULT_TENANT_SUBDOMAIN;
  }

  const sub = parts[0];
  return SUBDOMAIN_REGEX.test(sub) ? sub : null;
}

/**
 * Subdomain Tenant Isolation & Firebase Auth Middleware.
 * Applies to all /api/* routes except /api/health, /api/tenant/resolve, and /api/onboarding/register-tenant.
 */
export async function requireTenantAuth(
  req: TenantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const subdomain = extractSubdomainFromRequest(req);
  if (!subdomain) {
    res.status(404).json({ error: 'Tenant Not Found' });
    return;
  }

  try {
    const tenant = await findTenantBySubdomain(subdomain);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant Not Found' });
      return;
    }
    req.tenantId = tenant.id;
    req.tenant = tenant;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing Firebase Bearer token' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Empty Bearer token' });
      return;
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch (verifyErr) {
      console.error('Firebase ID token verification failed:', verifyErr);
      res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
      return;
    }

    const email = decoded.email || '';
    const tenantUser = await findOrClaimTenantUser({
      tenantId: tenant.id,
      tenantSubdomain: tenant.subdomain,
      firebaseUid: decoded.uid,
      email,
    });

    if (!tenantUser) {
      res.status(403).json({
        error: 'Forbidden: Your account is not a registered member of this company workspace.',
      });
      return;
    }

    req.user = { ...tenantUser, firebaseUid: decoded.uid };
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal server error while resolving tenant workspace.' });
  }
}
