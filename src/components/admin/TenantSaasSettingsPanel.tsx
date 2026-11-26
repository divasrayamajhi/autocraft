import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  KeyRound,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { Customer, SparePart } from '../../types';
import {
  apiClient,
  APP_ROOT_DOMAIN,
  ApiCustomerRow,
  ApiIntegrationItem,
  ApiInventoryRow,
  TenantDashboardResponse,
} from '../../services/apiClient';

interface TenantSaasSettingsPanelProps {
  customers: Customer[];
  parts: SparePart[];
  targetOwnerUid?: string;
  onNotify: (msg: string) => void;
}

export const TenantSaasSettingsPanel: React.FC<TenantSaasSettingsPanelProps> = ({
  customers,
  parts,
  targetOwnerUid,
  onNotify,
}) => {
  const [dashboard, setDashboard] = useState<TenantDashboardResponse | null>(null);
  const [integrations, setIntegrations] = useState<ApiIntegrationItem[]>([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerRows, setCustomerRows] = useState<ApiCustomerRow[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerTotalPages, setCustomerTotalPages] = useState(1);

  const [invPage, setInvPage] = useState(1);
  const [invSearch, setInvSearch] = useState('');
  const [invRows, setInvRows] = useState<ApiInventoryRow[]>([]);
  const [invTotal, setInvTotal] = useState(0);
  const [invTotalPages, setInvTotalPages] = useState(1);

  const [providerName, setProviderName] = useState('ird_cbms');
  const [credentialApiKey, setCredentialApiKey] = useState('');
  const [credentialEndpoint, setCredentialEndpoint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [dashRes, intRes, custRes, invRes] = await Promise.all([
        apiClient.getDashboard(targetOwnerUid),
        apiClient.listIntegrations(targetOwnerUid),
        apiClient.listCustomers({ page: customerPage, limit: 10, search: customerSearch }, targetOwnerUid),
        apiClient.listInventory({ page: invPage, limit: 10, search: invSearch }, targetOwnerUid),
      ]);
      setDashboard(dashRes);
      setIntegrations(intRes.items || []);
      setCustomerRows(custRes.items || []);
      setCustomerTotal(custRes.total || 0);
      setCustomerTotalPages(custRes.totalPages || 1);
      setInvRows(invRes.items || []);
      setInvTotal(invRes.total || 0);
      setInvTotalPages(invRes.totalPages || 1);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach tenant API.');
    } finally {
      setIsLoading(false);
    }
  }, [customerPage, customerSearch, invPage, invSearch, targetOwnerUid]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSyncCatalog = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.seedTenantFromWorkspace(targetOwnerUid);
      onNotify(
        `Synced ${res.customersSynced} customers and ${res.inventorySynced} inventory SKUs to Cloud Firestore.`
      );
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to sync catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentialApiKey.trim()) {
      setErrorMsg('Please enter an API key or secret token to encrypt and save.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.saveIntegration(
        providerName,
        {
          apiKey: credentialApiKey.trim(),
          endpoint: credentialEndpoint.trim(),
        },
        true,
        targetOwnerUid
      );
      setCredentialApiKey('');
      setCredentialEndpoint('');
      onNotify(`Encrypted integration credentials saved for "${providerName}".`);
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save integration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveIntegration = async (provider: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.deleteIntegration(provider, targetOwnerUid);
      onNotify(`Removed integration "${provider}".`);
      await loadAll();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to remove integration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tenant Workspace Summary */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F3D5E] text-white flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#0EA5E9]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {dashboard?.tenant.companyName || 'Active SaaS Tenant'}
              </h3>
              <p className="text-xs text-[#64748B] font-mono flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>{dashboard ? `${dashboard.tenant.subdomain}.${APP_ROOT_DOMAIN}` : 'Resolving subdomain...'}</span>
                {dashboard?.user.role && (
                  <span className="px-2 py-0.5 rounded bg-sky-50 text-[#0F3D5E] font-sans font-bold text-[10px]">
                    Role: {dashboard.user.role}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSyncCatalog}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync Catalog to Tenant API</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Tenant-Isolated KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-[11px] font-semibold text-[#64748B]">Tenant Customers</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1 font-mono">
              {dashboard?.metrics.totalCustomers ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-[11px] font-semibold text-[#64748B]">Inventory SKUs</p>
            <p className="text-xl font-bold text-[#0F172A] mt-1 font-mono">
              {dashboard?.metrics.totalInventoryItems ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-[11px] font-semibold text-[#64748B]">Low Stock Alerts</p>
            <p className="text-xl font-bold text-[#F59E0B] mt-1 font-mono">
              {dashboard?.metrics.lowStockCount ?? 0}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <p className="text-[11px] font-semibold text-[#64748B]">Active Integrations</p>
            <p className="text-xl font-bold text-[#16A34A] mt-1 font-mono">
              {dashboard?.metrics.activeIntegrations ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Encrypted Tenant Integrations */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
        <div className="flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-[#0284C7]" />
          <div>
            <h4 className="text-sm font-bold text-[#0F172A]">
              Tenant Integration Registry (Firebase Firestore)
            </h4>
            <p className="text-xs text-[#64748B]">
              Register per-company IRD CBMS, SMS Gateway, or Fonepay endpoints (stores masked key hints only).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveIntegration} className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <select
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            className="border border-[#CBD5E1] rounded-xl px-3 py-2 bg-white font-semibold text-[#0F172A]"
          >
            <option value="ird_cbms">IRD CBMS (Nepal)</option>
            <option value="sparrow_sms">Sparrow SMS Gateway</option>
            <option value="fonepay">Fonepay Merchant API</option>
            <option value="connectips">NCHL connectIPS</option>
          </select>
          <input
            type="password"
            value={credentialApiKey}
            onChange={(e) => setCredentialApiKey(e.target.value)}
            placeholder="API Key / Secret Token"
            className="border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A]"
          />
          <input
            type="text"
            value={credentialEndpoint}
            onChange={(e) => setCredentialEndpoint(e.target.value)}
            placeholder="Endpoint / Merchant ID (optional)"
            className="border border-[#CBD5E1] rounded-xl px-3 py-2 text-[#0F172A]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-xl font-bold transition cursor-pointer"
          >
            Encrypt &amp; Save
          </button>
        </form>

        {integrations.length > 0 && (
          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden">
            {integrations.map((item) => (
              <div key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs bg-[#F8FAFC]">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  <span className="font-mono font-bold text-[#0F172A]">{item.provider}</span>
                  <span className="text-[11px] text-[#64748B] font-mono">
                    {item.keyHint ? `Key ${item.keyHint}` : 'Configured'}
                    {item.endpoint ? ` · ${item.endpoint}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveIntegration(item.provider)}
                  className="text-[#DC2626] hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer"
                  title="Remove integration"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server-Paginated Customers & Inventory (5,000+ Ready) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Paginated Customers */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#0284C7]" />
              <span>Tenant Customers ({customerTotal})</span>
            </h4>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => {
                setCustomerSearch(e.target.value);
                setCustomerPage(1);
              }}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-8 pr-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
            />
          </div>

          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl max-h-64 overflow-y-auto text-xs">
            {customerRows.length === 0 ? (
              <div className="p-4 text-center text-[#64748B]">
                No tenant customers synced yet. Click &ldquo;Sync Catalog to Tenant API&rdquo; above.
              </div>
            ) : (
              customerRows.map((c) => (
                <div key={c.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#0F172A]">{c.full_name}</p>
                    <p className="text-[11px] text-[#64748B] font-mono">
                      {c.phone || '—'} {c.email ? `· ${c.email}` : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Page {customerPage} of {customerTotalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={customerPage <= 1}
                onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={customerPage >= customerTotalPages}
                onClick={() => setCustomerPage((p) => Math.min(customerTotalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Paginated Inventory */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#0F172A] flex items-center space-x-2">
              <Package className="w-4 h-4 text-[#0284C7]" />
              <span>Tenant Inventory ({invTotal})</span>
            </h4>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={invSearch}
              onChange={(e) => {
                setInvSearch(e.target.value);
                setInvPage(1);
              }}
              placeholder="Search by SKU or part name..."
              className="w-full pl-8 pr-3 py-2 border border-[#E2E8F0] rounded-xl text-xs bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
            />
          </div>

          <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl max-h-64 overflow-y-auto text-xs">
            {invRows.length === 0 ? (
              <div className="p-4 text-center text-[#64748B]">
                No tenant inventory SKUs synced yet. Click &ldquo;Sync Catalog to Tenant API&rdquo; above.
              </div>
            ) : (
              invRows.map((item) => (
                <div key={item.id} className="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#0F172A]">{item.item_name}</p>
                    <p className="text-[11px] text-[#64748B] font-mono">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-[#0F172A]">Rs. {Number(item.unit_price).toLocaleString()}</p>
                    <p className="text-[11px] text-[#64748B]">Qty: {item.stock_qty}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Page {invPage} of {invTotalPages}
            </span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={invPage <= 1}
                onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={invPage >= invTotalPages}
                onClick={() => setInvPage((p) => Math.min(invTotalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F1F5F9]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
