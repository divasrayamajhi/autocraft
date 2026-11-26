import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  Edit3,
  ExternalLink,
  Globe,
  HardDrive,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  Network,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  apiClient,
  APP_ROOT_DOMAIN,
  CreateDeveloperPayload,
  CreateTenantPayload,
  DeveloperAccount,
  DeveloperRole,
  TenantPlan,
  TenantRecord,
  UpdateTenantPayload,
} from '../../services/apiClient';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

export type DeveloperPortalSection = 'overview' | 'tenants' | 'developers';

interface DeveloperConsoleProps {
  developerEmail: string;
  developerName: string;
  isDemoMode?: boolean;
  tenants: TenantRecord[];
  onTenantsChange: (tenants: TenantRecord[]) => void;
  onOpenTenantSignIn: (tenantSubdomain: string) => void;
  onGoToPublicWebsite: () => void;
  onLogout: () => void;
}

const PLAN_DEFAULTS: Record<TenantPlan, { storageQuotaMb: number; bandwidthQuotaGb: number }> = {
  Starter: { storageQuotaMb: 512, bandwidthQuotaGb: 25 },
  Professional: { storageQuotaMb: 2048, bandwidthQuotaGb: 100 },
  Enterprise: { storageQuotaMb: 10240, bandwidthQuotaGb: 500 },
};

function formatBytes(bytes: number): string {
  const safe = Math.max(0, Number(bytes) || 0);
  if (safe < 1024) return `${safe} B`;
  if (safe < 1024 * 1024) return `${(safe / 1024).toFixed(1)} KB`;
  if (safe < 1024 * 1024 * 1024) return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
  return `${(safe / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNumber(n: number): string {
  return (Number(n) || 0).toLocaleString();
}

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({
  developerEmail,
  developerName,
  isDemoMode = false,
  tenants,
  onTenantsChange,
  onOpenTenantSignIn,
  onGoToPublicWebsite,
  onLogout,
}) => {
  const [activeSection, setActiveSection] = useState<DeveloperPortalSection>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Tenant Fleet State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [measuringTenantId, setMeasuringTenantId] = useState<string | null>(null);
  const [inspectedTenantId, setInspectedTenantId] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Tenant Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTenantPayload>({
    companyName: '',
    subdomain: '',
    adminEmail: '',
    panVatNumber: '',
    city: 'Kathmandu',
    address: '',
    contactNumber: '',
    fiscalYear: '2081/2082',
    plan: 'Professional',
    storageQuotaMb: 2048,
    bandwidthQuotaGb: 100,
  });

  // Edit / Delete Tenant State
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [editForm, setEditForm] = useState<UpdateTenantPayload>({});
  const [deletingTenant, setDeletingTenant] = useState<TenantRecord | null>(null);

  // Developer Accounts Settings State
  const [developerAccounts, setDeveloperAccounts] = useState<DeveloperAccount[]>([]);
  const [isLoadingDevs, setIsLoadingDevs] = useState(false);
  const [isAddDevOpen, setIsAddDevOpen] = useState(false);
  const [newDevForm, setNewDevForm] = useState<CreateDeveloperPayload>({
    name: '',
    email: '',
    role: 'Platform Engineer',
    uid: '',
  });
  const [deletingDev, setDeletingDev] = useState<DeveloperAccount | null>(null);

  useEscapeKey(isCreateOpen, () => setIsCreateOpen(false));
  useEscapeKey(Boolean(editingTenant), () => setEditingTenant(null));
  useEscapeKey(Boolean(deletingTenant), () => setDeletingTenant(null));
  useEscapeKey(isAddDevOpen, () => setIsAddDevOpen(false));
  useEscapeKey(Boolean(deletingDev), () => setDeletingDev(null));
  useEscapeKey(isMobileSidebarOpen, () => setIsMobileSidebarOpen(false));

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    window.setTimeout(() => {
      setBannerMessage((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  }, []);

  const loadDeveloperAccounts = useCallback(async () => {
    setIsLoadingDevs(true);
    try {
      const list = await apiClient.listDeveloperAccounts();
      setDeveloperAccounts(list);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to load developer accounts.');
    } finally {
      setIsLoadingDevs(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadDeveloperAccounts();
  }, [loadDeveloperAccounts]);

  // Measure live telemetry automatically once on portal mount if unmeasured
  useEffect(() => {
    if (tenants.length > 0 && tenants.every((t) => !t.collectionBreakdown)) {
      let active = true;
      void Promise.all(
        tenants.map((t) => apiClient.measureTenantTelemetry(t).catch(() => t))
      ).then((measured) => {
        if (active) onTenantsChange(measured);
      });
      return () => {
        active = false;
      };
    }
  }, []);

  const handleRefreshAllTelemetry = useCallback(async () => {
    setIsRefreshingAll(true);
    try {
      const freshList = await apiClient.listAllTenants();
      const measured = await Promise.all(
        freshList.map((tenant) => apiClient.measureTenantTelemetry(tenant).catch(() => tenant))
      );
      onTenantsChange(measured);
      notify(
        'success',
        `Measured live storage, bandwidth, and network operations across ${measured.length} tenant(s).`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to refresh tenant telemetry.');
    } finally {
      setIsRefreshingAll(false);
    }
  }, [notify, onTenantsChange]);

  const handleMeasureSingle = async (tenant: TenantRecord) => {
    setMeasuringTenantId(tenant.id);
    try {
      const updated = await apiClient.measureTenantTelemetry(tenant);
      onTenantsChange(tenants.map((t) => (t.id === updated.id ? updated : t)));
      setInspectedTenantId(updated.id);
      notify('success', `Updated live telemetry for ${updated.companyName}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to inspect tenant telemetry.');
    } finally {
      setMeasuringTenantId(null);
    }
  };

  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const created = await apiClient.createTenantAsDeveloper(createForm);
      const measured = await apiClient.measureTenantTelemetry(created).catch(() => created);
      onTenantsChange(
        [...tenants, measured].sort((a, b) => a.companyName.localeCompare(b.companyName))
      );
      setIsCreateOpen(false);
      setCreateForm({
        companyName: '',
        subdomain: '',
        adminEmail: '',
        panVatNumber: '',
        city: 'Kathmandu',
        address: '',
        contactNumber: '',
        fiscalYear: '2081/2082',
        plan: 'Professional',
        storageQuotaMb: 2048,
        bandwidthQuotaGb: 100,
      });
      setActiveSection('tenants');
      notify(
        'success',
        `Onboarded "${measured.companyName}" (${measured.subdomain}.${APP_ROOT_DOMAIN}). Tenant Admin: ${measured.adminEmail}.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to onboard tenant.');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (tenant: TenantRecord) => {
    setEditingTenant(tenant);
    setEditForm({
      companyName: tenant.companyName,
      adminEmail: tenant.adminEmail || '',
      panVatNumber: tenant.panVatNumber || '',
      city: tenant.city || '',
      address: tenant.address || '',
      contactNumber: tenant.contactNumber || '',
      fiscalYear: tenant.fiscalYear || '2081/2082',
      plan: tenant.plan,
      storageQuotaMb: tenant.storageQuotaMb,
      bandwidthQuotaGb: tenant.bandwidthQuotaGb,
      isActive: tenant.isActive,
    });
  };

  const handleSaveEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.updateTenantAsDeveloper(editingTenant.subdomain, editForm);
      const merged: TenantRecord = {
        ...editingTenant,
        ...updated,
        collectionBreakdown: editingTenant.collectionBreakdown,
      };
      onTenantsChange(tenants.map((t) => (t.id === merged.id ? merged : t)));
      setEditingTenant(null);
      notify('success', `Updated configuration & quotas for ${merged.companyName}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update tenant.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTenantActive = async (tenant: TenantRecord) => {
    try {
      const updated = await apiClient.updateTenantAsDeveloper(tenant.subdomain, {
        isActive: !tenant.isActive,
      });
      const merged: TenantRecord = {
        ...tenant,
        ...updated,
        collectionBreakdown: tenant.collectionBreakdown,
      };
      onTenantsChange(tenants.map((t) => (t.id === merged.id ? merged : t)));
      notify(
        'success',
        merged.isActive
          ? `Reactivated "${merged.companyName}".`
          : `Suspended "${merged.companyName}". Workspace sign-in is now paused.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to change tenant status.');
    }
  };

  const handleConfirmDeleteTenant = async () => {
    if (!deletingTenant) return;
    setIsSaving(true);
    try {
      await apiClient.deleteTenantAsDeveloper(deletingTenant.subdomain);
      onTenantsChange(tenants.filter((t) => t.id !== deletingTenant.id));
      if (inspectedTenantId === deletingTenant.id) {
        setInspectedTenantId(null);
      }
      notify('success', `Removed tenant "${deletingTenant.companyName}" from the platform registry.`);
      setDeletingTenant(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete tenant.');
    } finally {
      setIsSaving(false);
    }
  };

  // Developer Account CRUD Handlers
  const handleAddDeveloperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const created = await apiClient.addDeveloperAccount(newDevForm);
      setDeveloperAccounts((prev) => [...prev, created]);
      setIsAddDevOpen(false);
      setNewDevForm({ name: '', email: '', role: 'Platform Engineer', uid: '' });
      notify(
        'success',
        `Added developer account "${created.name}" (${created.email}). They can now sign in to the Developer Portal and authenticate into tenant workspaces.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to add developer account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDeveloperActive = async (dev: DeveloperAccount) => {
    try {
      const updated = await apiClient.updateDeveloperAccount(dev.uid, {
        isActive: !dev.isActive,
      });
      setDeveloperAccounts((prev) => prev.map((d) => (d.uid === dev.uid ? { ...d, ...updated } : d)));
      notify(
        'success',
        updated.isActive
          ? `Reactivated developer account ${dev.email}.`
          : `Suspended developer account ${dev.email}.`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to update developer account.');
    }
  };

  const handleUpdateDeveloperRole = async (dev: DeveloperAccount, nextRole: DeveloperRole) => {
    try {
      const updated = await apiClient.updateDeveloperAccount(dev.uid, { role: nextRole });
      setDeveloperAccounts((prev) => prev.map((d) => (d.uid === dev.uid ? { ...d, ...updated } : d)));
      notify('success', `Updated role for ${dev.email} to ${nextRole}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to update developer role.');
    }
  };

  const handleConfirmDeleteDeveloper = async () => {
    if (!deletingDev) return;
    setIsSaving(true);
    try {
      await apiClient.deleteDeveloperAccount(deletingDev.uid);
      setDeveloperAccounts((prev) => prev.filter((d) => d.uid !== deletingDev.uid));
      notify('success', `Removed developer account "${deletingDev.email}".`);
      setDeletingDev(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Unable to delete developer account.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tenants.filter((t) => {
      if (statusFilter === 'active' && !t.isActive) return false;
      if (statusFilter === 'suspended' && t.isActive) return false;
      if (!q) return true;
      return (
        t.companyName.toLowerCase().includes(q) ||
        t.subdomain.toLowerCase().includes(q) ||
        (t.adminEmail || '').toLowerCase().includes(q) ||
        (t.panVatNumber || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q)
      );
    });
  }, [tenants, searchQuery, statusFilter]);

  const fleetTotals = useMemo(() => {
    let activeCount = 0;
    let totalStorageBytes = 0;
    let totalStorageQuotaMb = 0;
    let totalBandwidthBytes = 0;
    let totalBandwidthQuotaGb = 0;
    let totalNetworkRequests = 0;
    let totalReads = 0;
    let totalWrites = 0;
    let totalDocs = 0;

    tenants.forEach((t) => {
      if (t.isActive) activeCount += 1;
      totalStorageBytes += t.storageUsedBytes || 0;
      totalStorageQuotaMb += t.storageQuotaMb || 0;
      totalBandwidthBytes += t.bandwidthUsedBytes || 0;
      totalBandwidthQuotaGb += t.bandwidthQuotaGb || 0;
      totalNetworkRequests += t.networkRequestsCount || 0;
      totalReads += t.readOpsCount || 0;
      totalWrites += t.writeOpsCount || 0;
      totalDocs += t.docCount || 0;
    });

    const storagePct =
      totalStorageQuotaMb > 0
        ? Math.min(100, (totalStorageBytes / (totalStorageQuotaMb * 1024 * 1024)) * 100)
        : 0;
    const bandwidthPct =
      totalBandwidthQuotaGb > 0
        ? Math.min(100, (totalBandwidthBytes / (totalBandwidthQuotaGb * 1024 * 1024 * 1024)) * 100)
        : 0;

    return {
      activeCount,
      suspendedCount: tenants.length - activeCount,
      totalStorageBytes,
      totalStorageQuotaMb,
      storagePct,
      totalBandwidthBytes,
      totalBandwidthQuotaGb,
      bandwidthPct,
      totalNetworkRequests,
      totalReads,
      totalWrites,
      totalDocs,
    };
  }, [tenants]);

  const telemetryChartData = useMemo(() => {
    return tenants.map((t) => ({
      name: t.subdomain,
      company: t.companyName,
      storageKb: Number(((t.storageUsedBytes || 0) / 1024).toFixed(1)),
      bandwidthMb: Number(((t.bandwidthUsedBytes || 0) / (1024 * 1024)).toFixed(2)),
      reads: t.readOpsCount || 0,
      writes: t.writeOpsCount || 0,
    }));
  }, [tenants]);

  const inspectedTenant = useMemo(
    () => tenants.find((t) => t.id === inspectedTenantId) || tenants[0] || null,
    [tenants, inspectedTenantId]
  );

  const navItems: Array<{
    id: DeveloperPortalSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'overview', label: 'Overview & Telemetry', icon: BarChart3 },
    { id: 'tenants', label: 'Client Tenants', icon: Building2, count: tenants.length },
    { id: 'developers', label: 'Developer Accounts', icon: Users, count: developerAccounts.length },
  ];

  const sectionTitles: Record<DeveloperPortalSection, { title: string; subtitle: string }> = {
    overview: {
      title: 'Platform Telemetry Overview',
      subtitle: `Storage, bandwidth, and network read/write activity across ${APP_ROOT_DOMAIN} tenants`,
    },
    tenants: {
      title: 'Client Tenants & Onboarding',
      subtitle: `Provision isolated <company>.${APP_ROOT_DOMAIN} workspaces, adjust quotas, and audit storage`,
    },
    developers: {
      title: 'Developer Accounts & Access Settings',
      subtitle: 'Add or revoke developer credentials authorized for the Developer Portal and tenant login',
    },
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Standalone Developer Portal Left Sidebar */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-[#0F3D5E] text-white border-r border-white/10 flex flex-col transition-transform duration-200 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0EA5E9] text-white flex items-center justify-center shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight truncate leading-tight">
                Developer Portal
              </h1>
              <p className="text-[11px] font-mono text-sky-200/80 truncate mt-0.5">
                {APP_ROOT_DOMAIN}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`dev-nav-${item.id}`}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0EA5E9] text-white font-semibold'
                    : 'text-slate-200/90 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {typeof item.count === 'number' && (
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/15">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Strict Isolation Notice */}
        <div className="mx-3 mb-3 p-3 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] text-sky-100/80 leading-relaxed">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>Isolated Boundary</span>
          </p>
          Tenant workspaces are strictly separated. To access a tenant system, authenticate with your Developer ID &amp; Password on the Workspace Sign-In page.
        </div>

        {/* Developer Account Footer */}
        <div className="p-3 border-t border-white/10 bg-[#082236]/90 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.06] border border-white/10">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{developerName}</p>
              <p className="text-[11px] text-sky-200/75 truncate">{developerEmail}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-sky-200 hover:text-white hover:bg-[#DC2626]/80 rounded-md transition cursor-pointer shrink-0"
              title="Log Out of Developer Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Standalone Developer Shell */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Portal Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F1F5F9]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#0F172A] tracking-tight truncate">
                {sectionTitles[activeSection].title}
              </h2>
              <p className="text-xs text-[#64748B] truncate hidden sm:block">
                {sectionTitles[activeSection].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isDemoMode && (
              <span className="hidden md:inline-block text-[11px] font-mono text-[#0284C7] font-semibold px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200">
                Sandbox
              </span>
            )}

            <button
              type="button"
              onClick={handleRefreshAllTelemetry}
              disabled={isRefreshingAll}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] transition cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0284C7] ${isRefreshingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshingAll ? 'Measuring...' : 'Refresh Telemetry'}</span>
            </button>

            <button
              type="button"
              onClick={onGoToPublicWebsite}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#475569] hover:text-[#0F172A] transition cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Website</span>
            </button>

            <button
              id="dev-btn-logout"
              type="button"
              onClick={onLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 text-xs font-semibold text-[#DC2626] transition cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Feedback Banner */}
          {bannerMessage && (
            <div
              className={`px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
                bannerMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
                  : 'bg-red-50 border-red-200 text-[#DC2626]'
              }`}
            >
              <span>{bannerMessage.text}</span>
              <button
                type="button"
                onClick={() => setBannerMessage(null)}
                className="p-1 hover:opacity-75 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* =================================================================
              SECTION 1: OVERVIEW & TELEMETRY
              ================================================================= */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#64748B]">
                  Live metrics aggregated across <strong className="text-[#0F172A]">{tenants.length}</strong> client workspaces and{' '}
                  <strong className="text-[#0F172A]">{developerAccounts.filter((d) => d.isActive).length}</strong> active developer accounts.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 text-[#0EA5E9]" />
                    <span>Onboard New Tenant</span>
                  </button>
                </div>
              </div>

              {/* 4-Column Platform-Wide KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-medium">Provisioned Tenants</span>
                    <Building2 className="w-4 h-4 text-[#0284C7]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#0F172A] font-mono tabular-nums">
                      {fleetTotals.activeCount}
                    </span>
                    <span className="text-xs text-[#64748B] font-mono tabular-nums">
                      / {tenants.length} total
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    {fleetTotals.suspendedCount > 0
                      ? `${fleetTotals.suspendedCount} suspended · ${formatNumber(fleetTotals.totalDocs)} cloud docs`
                      : `All tenants active · ${formatNumber(fleetTotals.totalDocs)} cloud docs`}
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-medium">Total Storage Used</span>
                    <HardDrive className="w-4 h-4 text-[#0284C7]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#0F172A] font-mono tabular-nums">
                      {formatBytes(fleetTotals.totalStorageBytes)}
                    </span>
                    <span className="text-xs text-[#64748B] font-mono tabular-nums">
                      / {(fleetTotals.totalStorageQuotaMb / 1024).toFixed(1)} GB
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0EA5E9] rounded-full"
                      style={{ width: `${Math.max(2, fleetTotals.storagePct)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-medium">Bandwidth Transfer</span>
                    <Network className="w-4 h-4 text-[#0284C7]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#0F172A] font-mono tabular-nums">
                      {formatBytes(fleetTotals.totalBandwidthBytes)}
                    </span>
                    <span className="text-xs text-[#64748B] font-mono tabular-nums">
                      / {formatNumber(fleetTotals.totalBandwidthQuotaGb)} GB
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0F3D5E] rounded-full"
                      style={{ width: `${Math.max(2, fleetTotals.bandwidthPct)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-medium">Network Operations</span>
                    <Activity className="w-4 h-4 text-[#16A34A]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#0F172A] font-mono tabular-nums">
                      {formatNumber(fleetTotals.totalNetworkRequests)}
                    </span>
                    <span className="text-xs text-[#64748B]">requests</span>
                  </div>
                  <p className="text-[11px] text-[#64748B] font-mono tabular-nums">
                    {formatNumber(fleetTotals.totalReads)} reads · {formatNumber(fleetTotals.totalWrites)} writes
                  </p>
                </div>
              </div>

              {/* Resource Telemetry Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Storage (KB) &amp; Bandwidth (MB) by Tenant
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Measured Firestore document footprint and cumulative transfer per workspace
                    </p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={telemetryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="storageKb" name="Storage (KB)" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="bandwidthMb" name="Bandwidth (MB)" fill="#0F3D5E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Network Operations (Reads vs Writes)
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Firestore read and write operations tracked per tenant workspace
                    </p>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={telemetryChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="reads" name="Read Ops" stackId="ops" fill="#0284C7" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="writes" name="Write Ops" stackId="ops" fill="#16A34A" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Quick Jump Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Manage Client Tenants</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Onboard new workshops, edit storage/bandwidth quotas, or inspect per-collection bytes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('tenants')}
                    className="px-3.5 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Open Tenants
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">Developer Accounts Settings</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Add developer accounts for team members who manage the platform or support client workspaces.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('developers')}
                    className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Manage Accounts
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              SECTION 2: CLIENT TENANTS & ONBOARDING (NO DIRECT BYPASS BUTTON)
              ================================================================= */}
          {activeSection === 'tenants' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Client Tenants Directory ({filteredTenants.length})
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Provisioned tenants run on &lt;company&gt;.{APP_ROOT_DOMAIN}. Developers must sign in with their credentials on the tenant Workspace Login page.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search company, subdomain, admin..."
                        className="pl-8 pr-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] w-56"
                      />
                    </div>

                    <div className="flex items-center p-1 bg-[#F1F5F9] rounded-lg">
                      {(['all', 'active', 'suspended'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setStatusFilter(tab)}
                          className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                            statusFilter === tab
                              ? 'bg-white text-[#0F172A] shadow-xs'
                              : 'text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <button
                      id="btn-dev-onboard-tenant"
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0EA5E9]" />
                      <span>Onboard New Tenant</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                        <th className="py-3 px-4">Tenant &amp; Admin</th>
                        <th className="py-3 px-4">Plan &amp; Status</th>
                        <th className="py-3 px-4 text-right">Storage Used / Quota</th>
                        <th className="py-3 px-4 text-right">Bandwidth &amp; Network</th>
                        <th className="py-3 px-4 text-right">Docs / Staff</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs">
                      {filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-[#64748B]">
                            No tenants match your filter. Click &ldquo;Onboard New Tenant&rdquo; to provision a client workspace.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((tenant) => {
                          const storagePct = Math.min(
                            100,
                            ((tenant.storageUsedBytes || 0) /
                              Math.max(1, tenant.storageQuotaMb * 1024 * 1024)) *
                              100
                          );
                          const bandwidthPct = Math.min(
                            100,
                            ((tenant.bandwidthUsedBytes || 0) /
                              Math.max(1, tenant.bandwidthQuotaGb * 1024 * 1024 * 1024)) *
                              100
                          );

                          return (
                            <tr
                              key={tenant.id}
                              className={`hover:bg-[#F8FAFC] transition-colors ${
                                inspectedTenant?.id === tenant.id ? 'bg-sky-50/40' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-[#0F172A]">{tenant.companyName}</div>
                                <div className="text-[11px] text-[#64748B] font-mono mt-0.5 flex flex-wrap items-center gap-x-1.5">
                                  <Globe className="w-3 h-3 text-[#0284C7] shrink-0" />
                                  <span>
                                    {tenant.subdomain}.{APP_ROOT_DOMAIN}
                                  </span>
                                  {tenant.panVatNumber && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>PAN {tenant.panVatNumber}</span>
                                    </>
                                  )}
                                </div>
                                {tenant.adminEmail && (
                                  <div className="text-[11px] text-[#64748B] mt-0.5">
                                    Admin: <span className="text-[#0F172A]">{tenant.adminEmail}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-semibold text-[#0F172A]">{tenant.plan}</div>
                                <div
                                  className={`text-[11px] font-semibold mt-0.5 inline-flex items-center gap-1 ${
                                    tenant.isActive ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                  }`}
                                >
                                  {tenant.isActive ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Active</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="w-3.5 h-3.5" />
                                      <span>Suspended</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                <div className="font-semibold text-[#0F172A]">
                                  {formatBytes(tenant.storageUsedBytes)}
                                  <span className="text-[#64748B] font-normal">
                                    {' '}
                                    /{' '}
                                    {tenant.storageQuotaMb >= 1024
                                      ? `${(tenant.storageQuotaMb / 1024).toFixed(1)} GB`
                                      : `${tenant.storageQuotaMb} MB`}
                                  </span>
                                </div>
                                <div className="w-28 ml-auto h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-1.5">
                                  <div
                                    className={`h-full rounded-full ${
                                      storagePct > 85
                                        ? 'bg-[#DC2626]'
                                        : storagePct > 65
                                          ? 'bg-[#F59E0B]'
                                          : 'bg-[#0EA5E9]'
                                    }`}
                                    style={{ width: `${Math.max(3, storagePct)}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                <div className="font-semibold text-[#0F172A]">
                                  {formatBytes(tenant.bandwidthUsedBytes)}
                                  <span className="text-[#64748B] font-normal">
                                    {' '}
                                    / {tenant.bandwidthQuotaGb} GB
                                  </span>
                                </div>
                                <div className="text-[11px] text-[#64748B] mt-0.5">
                                  {formatNumber(tenant.networkRequestsCount)} req ·{' '}
                                  {bandwidthPct.toFixed(2)}%
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                                <div className="font-semibold text-[#0F172A]">
                                  {formatNumber(tenant.docCount)} docs
                                </div>
                                <div className="text-[11px] text-[#64748B] mt-0.5">
                                  {tenant.activeUsersCount} staff
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  {/* NO Direct Bypass — Routes to Workspace Sign-In where Developer must enter ID & Password */}
                                  <button
                                    type="button"
                                    onClick={() => onOpenTenantSignIn(tenant.subdomain)}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F3D5E] text-xs font-semibold transition-colors cursor-pointer"
                                    title={`Open Workspace Sign-In for ${tenant.subdomain}.${APP_ROOT_DOMAIN} (requires Developer email & password)`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#0284C7]" />
                                    <span>Workspace Login</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleMeasureSingle(tenant)}
                                    disabled={measuringTenantId === tenant.id}
                                    className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#0F3D5E] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                                    title="Inspect storage & network breakdown"
                                  >
                                    {measuringTenantId === tenant.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Database className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditModal(tenant)}
                                    className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                                    title="Edit tenant details & quotas"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleTenantActive(tenant)}
                                    className={`p-1.5 rounded-lg border border-[#E2E8F0] transition-colors cursor-pointer ${
                                      tenant.isActive
                                        ? 'text-[#F59E0B] hover:bg-amber-50'
                                        : 'text-[#16A34A] hover:bg-emerald-50'
                                    }`}
                                    title={tenant.isActive ? 'Suspend tenant' : 'Activate tenant'}
                                  >
                                    {tenant.isActive ? (
                                      <PauseCircle className="w-3.5 h-3.5" />
                                    ) : (
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {tenants.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setDeletingTenant(tenant)}
                                      className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete tenant"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Tenant Collection Storage & Network Breakdown */}
              {inspectedTenant && (
                <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                        <Server className="w-4 h-4 text-[#0284C7]" />
                        <span>
                          Collection Storage &amp; Traffic Breakdown: {inspectedTenant.companyName}
                        </span>
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5 font-mono">
                        {inspectedTenant.subdomain}.{APP_ROOT_DOMAIN} · Owner Key:{' '}
                        {inspectedTenant.ownerUid}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleMeasureSingle(inspectedTenant)}
                        disabled={measuringTenantId === inspectedTenant.id}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-[#0284C7] ${
                            measuringTenantId === inspectedTenant.id ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Recalculate Bytes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenTenantSignIn(inspectedTenant.subdomain)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-[#0EA5E9]" />
                        <span>Sign In to Workspace</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[#64748B]">Measured Storage</span>
                      <p className="font-mono font-bold text-sm text-[#0F172A] mt-0.5 tabular-nums">
                        {formatBytes(inspectedTenant.storageUsedBytes)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Cumulative Bandwidth</span>
                      <p className="font-mono font-bold text-sm text-[#0F172A] mt-0.5 tabular-nums">
                        {formatBytes(inspectedTenant.bandwidthUsedBytes)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Read / Write Ops</span>
                      <p className="font-mono font-bold text-sm text-[#0F172A] mt-0.5 tabular-nums">
                        {formatNumber(inspectedTenant.readOpsCount)} /{' '}
                        {formatNumber(inspectedTenant.writeOpsCount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748B]">Avg Payload / Req</span>
                      <p className="font-mono font-bold text-sm text-[#0F172A] mt-0.5 tabular-nums">
                        {inspectedTenant.networkRequestsCount > 0
                          ? formatBytes(
                              Math.round(
                                inspectedTenant.bandwidthUsedBytes /
                                  inspectedTenant.networkRequestsCount
                              )
                            )
                          : '0 B'}
                      </p>
                    </div>
                  </div>

                  {inspectedTenant.collectionBreakdown &&
                  inspectedTenant.collectionBreakdown.length > 0 ? (
                    <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                            <th className="py-2.5 px-3.5">Firestore Collection</th>
                            <th className="py-2.5 px-3.5 text-right">Documents</th>
                            <th className="py-2.5 px-3.5 text-right">Storage Size</th>
                            <th className="py-2.5 px-3.5 text-right">Share of Workspace</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {inspectedTenant.collectionBreakdown.map((col) => {
                            const share =
                              inspectedTenant.storageUsedBytes > 0
                                ? (col.bytes / inspectedTenant.storageUsedBytes) * 100
                                : 0;
                            return (
                              <tr key={col.collection} className="hover:bg-[#F8FAFC]">
                                <td className="py-2 px-3.5">
                                  <span className="font-semibold text-[#0F172A]">{col.label}</span>
                                  <span className="ml-2 text-[11px] font-mono text-[#64748B]">
                                    /{col.collection}
                                  </span>
                                </td>
                                <td className="py-2 px-3.5 text-right font-mono tabular-nums text-[#0F172A]">
                                  {formatNumber(col.docs)}
                                </td>
                                <td className="py-2 px-3.5 text-right font-mono tabular-nums text-[#0F172A]">
                                  {formatBytes(col.bytes)}
                                </td>
                                <td className="py-2 px-3.5 text-right font-mono tabular-nums text-[#64748B]">
                                  {share.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      Click &ldquo;Recalculate Bytes&rdquo; to scan all 12 Firestore collections for this tenant.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              SECTION 3: DEVELOPER ACCOUNTS (SETTINGS)
              ================================================================= */}
          {activeSection === 'developers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Authorized Developer Accounts ({developerAccounts.length})
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Accounts listed here can access the Developer Portal and log into any tenant workspace by entering the company name and their developer credentials.
                    </p>
                  </div>

                  <button
                    id="btn-add-developer-account"
                    type="button"
                    onClick={() => setIsAddDevOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    <span>Add Developer Account</span>
                  </button>
                </div>

                {isLoadingDevs ? (
                  <div className="py-10 flex items-center justify-center text-xs text-[#64748B] gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0EA5E9]" />
                    <span>Loading developer accounts...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-semibold text-[#64748B]">
                          <th className="py-3 px-4">Developer Name &amp; Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Account ID / UID</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {developerAccounts.map((dev) => (
                          <tr key={dev.uid} className="hover:bg-[#F8FAFC]">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-[#0F172A] flex items-center gap-2">
                                <span>{dev.name}</span>
                                {dev.isBootstrapped && (
                                  <span className="text-[10px] font-semibold text-[#0284C7]">
                                    (Primary Owner)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                                {dev.email}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {dev.isBootstrapped ? (
                                <span className="font-semibold text-[#0F3D5E]">{dev.role}</span>
                              ) : (
                                <select
                                  value={dev.role}
                                  onChange={(e) =>
                                    void handleUpdateDeveloperRole(
                                      dev,
                                      e.target.value as DeveloperRole
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                                >
                                  <option value="Super Developer">Super Developer</option>
                                  <option value="Platform Engineer">Platform Engineer</option>
                                  <option value="Support Engineer">Support Engineer</option>
                                </select>
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#64748B]">
                              {dev.uid}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  dev.isActive ? 'text-[#16A34A]' : 'text-[#DC2626]'
                                }`}
                              >
                                {dev.isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    <span>Suspended</span>
                                  </>
                                )}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {dev.isBootstrapped ? (
                                <span className="text-[11px] text-[#64748B]">Protected</span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleDeveloperActive(dev)}
                                    className={`p-1.5 rounded-lg border border-[#E2E8F0] transition cursor-pointer ${
                                      dev.isActive
                                        ? 'text-[#F59E0B] hover:bg-amber-50'
                                        : 'text-[#16A34A] hover:bg-emerald-50'
                                    }`}
                                    title={dev.isActive ? 'Suspend developer' : 'Activate developer'}
                                  >
                                    {dev.isActive ? (
                                      <PauseCircle className="w-3.5 h-3.5" />
                                    ) : (
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingDev(dev)}
                                    className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-red-50 transition cursor-pointer"
                                    title="Remove developer account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =====================================================================
          MODAL 1: ONBOARD NEW CLIENT TENANT
          ===================================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-[#0EA5E9]" />
                <div>
                  <h3 className="text-sm font-bold">Onboard New Client Tenant</h3>
                  <p className="text-[11px] text-sky-200">
                    Provision an isolated &lt;company&gt;.{APP_ROOT_DOMAIN} workspace
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-sky-200 hover:text-white rounded cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTenantSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Company / Workshop Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.companyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateForm((prev) => ({
                        ...prev,
                        companyName: val,
                        subdomain:
                          prev.subdomain ||
                          val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                            .slice(0, 32),
                      }));
                    }}
                    placeholder="e.g. Valley Auto Engineering"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Tenant Subdomain *
                  </label>
                  <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden focus-within:ring-2 focus-within:ring-[#0EA5E9] focus-within:bg-white">
                    <input
                      type="text"
                      required
                      value={createForm.subdomain}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        }))
                      }
                      placeholder="valley-auto"
                      className="flex-1 px-3 py-2 font-mono text-[#0F172A] bg-transparent outline-none"
                    />
                    <span className="px-3 py-2 text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] border-l border-[#E2E8F0]">
                      .{APP_ROOT_DOMAIN}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Assigned Tenant Admin Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.adminEmail}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                    }
                    placeholder="admin@clientworkshop.com.np"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">PAN / VAT Number</label>
                  <input
                    type="text"
                    value={createForm.panVatNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, panVatNumber: e.target.value }))
                    }
                    placeholder="609812453"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">City</label>
                  <input
                    type="text"
                    value={createForm.city}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="Kathmandu"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Subscription Plan</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => {
                      const nextPlan = e.target.value as TenantPlan;
                      const defaults = PLAN_DEFAULTS[nextPlan];
                      setCreateForm((prev) => ({
                        ...prev,
                        plan: nextPlan,
                        storageQuotaMb: defaults.storageQuotaMb,
                        bandwidthQuotaGb: defaults.bandwidthQuotaGb,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  >
                    <option value="Starter">Starter (512 MB / 25 GB)</option>
                    <option value="Professional">Professional (2 GB / 100 GB)</option>
                    <option value="Enterprise">Enterprise (10 GB / 500 GB)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    value={createForm.fiscalYear}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, fiscalYear: e.target.value }))
                    }
                    placeholder="2081/2082"
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Storage Quota (MB)</label>
                  <input
                    type="number"
                    min={1}
                    max={102400}
                    value={createForm.storageQuotaMb}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        storageQuotaMb: Number(e.target.value) || 512,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Bandwidth Quota (GB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10240}
                    value={createForm.bandwidthQuotaGb}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        bandwidthQuotaGb: Number(e.target.value) || 25,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Provision Tenant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: EDIT TENANT DETAILS & QUOTAS
          ===================================================================== */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Edit Tenant: {editingTenant.companyName}</h3>
                <p className="text-[11px] font-mono text-sky-200">
                  {editingTenant.subdomain}.{APP_ROOT_DOMAIN}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTenant(null)}
                className="p-1 text-sky-200 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTenant} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.companyName || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, companyName: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#0F172A] mb-1">Tenant Admin Email</label>
                  <input
                    type="email"
                    value={editForm.adminEmail || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">PAN / VAT</label>
                  <input
                    type="text"
                    value={editForm.panVatNumber || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, panVatNumber: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Plan</label>
                  <select
                    value={editForm.plan || 'Professional'}
                    onChange={(e) => {
                      const nextPlan = e.target.value as TenantPlan;
                      const defaults = PLAN_DEFAULTS[nextPlan];
                      setEditForm((prev) => ({
                        ...prev,
                        plan: nextPlan,
                        storageQuotaMb: defaults.storageQuotaMb,
                        bandwidthQuotaGb: defaults.bandwidthQuotaGb,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  >
                    <option value="Starter">Starter</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">Storage Quota (MB)</label>
                  <input
                    type="number"
                    min={1}
                    max={102400}
                    value={editForm.storageQuotaMb ?? 2048}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        storageQuotaMb: Number(e.target.value) || 512,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0F172A] mb-1">
                    Bandwidth Quota (GB)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10240}
                    value={editForm.bandwidthQuotaGb ?? 100}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        bandwidthQuotaGb: Number(e.target.value) || 25,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: DELETE TENANT CONFIRMATION
          ===================================================================== */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#DC2626] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Remove Tenant from Registry</h3>
              <button
                type="button"
                onClick={() => setDeletingTenant(null)}
                className="p-1 text-red-100 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-[#475569]">
              <p className="leading-relaxed">
                Are you sure you want to remove{' '}
                <strong className="text-[#0F172A]">{deletingTenant.companyName}</strong> (
                <span className="font-mono">
                  {deletingTenant.subdomain}.{APP_ROOT_DOMAIN}
                </span>
                )? Users will no longer be able to sign into this workspace.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingTenant(null)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTenant}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Remove Tenant</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADD DEVELOPER ACCOUNT (SETTINGS)
          ===================================================================== */}
      {isAddDevOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#0F3D5E] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UserPlus className="w-5 h-5 text-[#0EA5E9]" />
                <div>
                  <h3 className="text-sm font-bold">Add Developer Account</h3>
                  <p className="text-[11px] text-sky-200">
                    Authorize a developer for the Developer Portal &amp; tenant login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDevOpen(false)}
                className="p-1 text-sky-200 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddDeveloperSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newDevForm.name}
                  onChange={(e) => setNewDevForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Aarav Shrestha"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Developer Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newDevForm.email}
                  onChange={(e) => setNewDevForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="engineer@autocraftpro.com.np"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">Platform Role *</label>
                <select
                  value={newDevForm.role}
                  onChange={(e) =>
                    setNewDevForm((prev) => ({ ...prev, role: e.target.value as DeveloperRole }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                >
                  <option value="Super Developer">Super Developer</option>
                  <option value="Platform Engineer">Platform Engineer</option>
                  <option value="Support Engineer">Support Engineer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] mb-1">
                  Firebase Auth UID (Optional)
                </label>
                <input
                  type="text"
                  value={newDevForm.uid || ''}
                  onChange={(e) => setNewDevForm((prev) => ({ ...prev, uid: e.target.value }))}
                  placeholder="Paste Firebase UID if already registered"
                  className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Make sure this email also has a verified Google or Email/Password login in Firebase Authentication.
                </p>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDevOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Developer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: DELETE DEVELOPER ACCOUNT CONFIRMATION
          ===================================================================== */}
      {deletingDev && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#DC2626] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Revoke Developer Account</h3>
              <button
                type="button"
                onClick={() => setDeletingDev(null)}
                className="p-1 text-red-100 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs text-[#475569]">
              <p className="leading-relaxed">
                Revoke Developer Portal access for{' '}
                <strong className="text-[#0F172A]">{deletingDev.name}</strong> (
                <span className="font-mono">{deletingDev.email}</span>)? They will no longer be able to access the Developer Portal or authenticate into client tenants as a developer.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingDev(null)}
                  className="px-4 py-2 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDeveloper}
                  disabled={isSaving}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-red-700 text-white font-semibold cursor-pointer disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Revoke Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
