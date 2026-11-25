-- ============================================================================
-- AutoCraft Pro — Multi-Tenant SaaS PostgreSQL Schema (Cloud SQL)
-- Strict tenant_id isolation, foreign keys, unique constraints, and B-tree indexes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tenants (Workshop Companies mapped by Subdomain)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(63) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenants_subdomain_format_chk CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants (subdomain);

-- 2. Users (Tenant-scoped Staff & Owners linked to Firebase Auth UID)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  firebase_uid VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_firebase_uid ON users (tenant_id, firebase_uid);

-- 3. Customers (Indexed for 5,000+ records per tenant)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  vehicle_details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_created_at ON customers (tenant_id, created_at DESC);

-- 4. Inventory (Spare Parts & Warehouse Stock per tenant)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku VARCHAR(100) NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_tenant_sku_unique UNIQUE (tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_item_name ON inventory (tenant_id, item_name);

-- 5. Tenant Integrations (Encrypted per-tenant API credentials)
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_integrations_tenant_provider_unique UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id ON tenant_integrations (tenant_id);

-- 6. Seed Default Tenant ('lavish' -> 'Lavish Mobility') if tenants table is empty
INSERT INTO tenants (subdomain, company_name)
SELECT 'lavish', 'Lavish Mobility'
WHERE NOT EXISTS (SELECT 1 FROM tenants);
