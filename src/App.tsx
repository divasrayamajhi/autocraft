import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { firestoreSync } from './services/firestoreSyncService';
import {
  apiClient,
  APP_ROOT_DOMAIN,
  checkIsPlatformDeveloper,
  clearBrowserPortalParams,
  getDemoSessionMode,
  getUrlSubdomainIfPresent,
  isDemoSessionActive,
  loadDemoTenantWorkspaceSnapshot,
  normalizeCompanySlug,
  readDemoDevelopers,
  saveDemoTenantWorkspaceSnapshot,
  setActiveTenantSubdomain,
  setDemoSessionMode,
  syncBrowserToTenantSubdomain,
  TenantRecord,
  waitForOnboardingIfActive,
} from './services/apiClient';
import { 
  storage, 
  AppDatabase 
} from './services/storageService';
import { 
  TabType, 
  Navigation 
} from './components/Navigation';
import { Navbar } from './components/Navbar';
import { WorkshopOverview } from './components/dashboard/WorkshopOverview';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { JobCardManagement } from './components/jobcards/JobCardManagement';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { BillingManagement } from './components/billing/BillingManagement';
import { AccountingReports } from './components/accounting/AccountingReports';
import { WarrantyManagement } from './components/warranty/WarrantyManagement';
import { AdminMasterSettings } from './components/admin/AdminMasterSettings';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { DeveloperConsole } from './components/developer/DeveloperConsole';
import { PublicWebsite } from './components/marketing/PublicWebsite';
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { PrintInvoiceModal } from './components/common/PrintInvoiceModal';
import { PrintGatePassModal } from './components/common/PrintGatePassModal';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { AuthScreen } from './components/auth/AuthScreen';
import {
  ensureGlobalEscapeListener,
  isEditableTarget,
  useEscapeKey,
} from './hooks/useKeyboardShortcuts';
import { 
  JobCard, 
  Invoice, 
  Appointment, 
  SparePart, 
  PurchaseOrder, 
  Customer, 
  NepalPaymentMethod,
  UserAccount,
  WarrantyClaim,
  WarrantyRecord,
  WorkshopProfile,
  Technician,
  ServicePriceItem,
  BayArea,
  PartsQuotation,
  PartsSalesOrder,
  PartsSalesReturn,
  GatePass,
  GLAccount,
  GLJournalEntry,
  CashierVoucher,
  ReadyNotificationLog
} from './types';
import { TaxInvoiceGenerationOptions } from './components/billing/GenerateTaxInvoiceModal';
import {
  applyJournalEntryToAccounts,
  buildCashierVoucherJournalEntry,
  buildCreditNoteJournalEntry,
  buildInvoiceJournalEntry,
  buildPaymentJournalEntry,
  buildPurchaseReceiptJournalEntry,
  generateUniqueId,
  getNepalFiscalYear,
  getNextSequentialDocNumber,
  isCreditNoteInvoice,
  recomputeGlBalancesFromJournal,
  round2,
  toNepalBsDate,
} from './utils/accountingEngine';
import { adToBs } from './utils/nepaliDate';
import { Bell, Loader2, Lock, MessageSquare, Send, Unlock, Wrench, X } from 'lucide-react';

type SurfaceMode =
  | 'public_site'
  | 'workspace_login'
  | 'developer_login'
  | 'developer_portal'
  | 'tenant_workspace';

const LAST_SURFACE_STORAGE_KEY = 'AUTOCRAFT_LAST_SURFACE';

function getInitialSurfaceMode(): SurfaceMode {
  if (typeof window === 'undefined') return 'public_site';
  const demoMode = getDemoSessionMode();
  if (demoMode === 'developer') return 'developer_portal';
  if (demoMode === 'workspace') return 'tenant_workspace';
  try {
    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal');
    if (portal === 'developer') return 'developer_login';
    if (portal === 'workspace') return 'workspace_login';
  } catch {
    // Ignore URL errors
  }
  return 'public_site';
}

function getInitialCompanyHint(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const company = params.get('company')?.trim();
    if (company) return company;
  } catch {
    // Ignore URL errors
  }
  return '';
}

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => storage.getDatabase());
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>(() => getInitialSurfaceMode());
  const [workspaceCompanyHint, setWorkspaceCompanyHint] = useState<string>(() => getInitialCompanyHint());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [developerIdentity, setDeveloperIdentity] = useState<{ name: string; email: string }>({
    name: 'Platform Developer',
    email: 'dev@autocraftpro.com.np',
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoSessionActive());
  const [allTenants, setAllTenants] = useState<TenantRecord[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantRecord | null>(null);
  const [activeWorkspaceOwnerUid, setActiveWorkspaceOwnerUid] = useState<string | null>(null);
  const activeTenantRef = useRef<TenantRecord | null>(null);
  const loginIntentRef = useRef<
    { type: 'developer' } | { type: 'workspace'; companyName: string } | null
  >(null);
  const manualAuthFlowRef = useRef<boolean>(false);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isCloudHydrating, setIsCloudHydrating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fatalSyncError, setFatalSyncError] = useState<Error | null>(null);
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printGatePass, setPrintGatePass] = useState<GatePass | null>(null);
  const [activeReadyToast, setActiveReadyToast] = useState<ReadyNotificationLog | null>(null);
  const [lifecycleToast, setLifecycleToast] = useState<{
    title: string;
    message: string;
    variant: 'locked' | 'reopened';
  } | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [quickIntakeTrigger, setQuickIntakeTrigger] = useState(0);
  const [pendingOpenJobCardRef, setPendingOpenJobCardRef] = useState<{
    jobCardId?: string;
    jobCardNumber?: string;
    nonce: number;
  } | null>(null);

  if (fatalSyncError) {
    throw fatalSyncError;
  }

  const showLifecycleToast = (title: string, message: string, variant: 'locked' | 'reopened') => {
    setLifecycleToast({ title, message, variant });
  };

  useEffect(() => {
    if (!lifecycleToast) return;
    const timer = window.setTimeout(() => setLifecycleToast(null), 5500);
    return () => window.clearTimeout(timer);
  }, [lifecycleToast]);

  // Register global ESC listener & close top-level overlays via LIFO stack
  useEscapeKey(isMobileNavOpen, () => setIsMobileNavOpen(false));
  useEscapeKey(Boolean(printGatePass), () => setPrintGatePass(null));

  // Schedule debounced diff-sync to Firestore whenever workshop state changes
  const scheduleCloudSync = useCallback((ownerUid: string, allowDeletes = true) => {
    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
    }
    cloudSyncTimerRef.current = setTimeout(() => {
      cloudSyncTimerRef.current = null;
      const snapshot = storage.getDatabase();
      void firestoreSync
        .syncDatabaseDiff(ownerUid, snapshot, { allowDeletes })
        .then((res) => {
          storage.saveDatabase({
            lastCloudSync: res.timestamp,
            isCloudSynced: true,
          });
          setDb(storage.getDatabase());
          if (activeTenantRef.current && (res.written > 0 || res.deleted > 0)) {
            const payloadBytes = new TextEncoder().encode(JSON.stringify(snapshot)).length;
            void apiClient.recordTenantNetworkActivity(activeTenantRef.current.subdomain, {
              bytesTransferred: Math.max(512, Math.round(payloadBytes * 0.12)),
              writes: res.written + res.deleted,
              storageUsedBytes: payloadBytes,
              activeUsersCount: (snapshot.users || []).filter((u) => u.isActive !== false).length || 1,
            });
          }
        })
        .catch((err) => {
          console.error('Firestore background sync error:', err);
          setFatalSyncError(err instanceof Error ? err : new Error(String(err)));
        });
    }, 280);
  }, []);

  // Hydrate and attach realtime listeners for any target tenant workspace
  const hydrateCloudTenantWorkspace = useCallback(
    async (
      tenant: TenantRecord,
      fbUser: FirebaseUser,
      isActiveRef?: () => boolean
    ) => {
      const stillActive = () => (isActiveRef ? isActiveRef() : true);
      firestoreSync.stopRealtimeListeners();
      firestoreSync.resetTracking();
      setActiveTenantSubdomain(tenant.subdomain);
      setActiveTenant(tenant);
      activeTenantRef.current = tenant;
      setActiveWorkspaceOwnerUid(tenant.ownerUid);

      const loaded = await firestoreSync.loadWorkspace(tenant.ownerUid);
      if (!stillActive()) return;

      if (loaded.exists && loaded.partialDb) {
        storage.applyRemoteDatabase(loaded.partialDb);
        storage.bindAuthenticatedUser(fbUser.email, fbUser.displayName);
        const syncedState = storage.getDatabase();
        const patchedProfile = {
          ...syncedState.profile,
          name: syncedState.profile.name || tenant.companyName,
          panVatNumber: syncedState.profile.panVatNumber || tenant.panVatNumber || syncedState.profile.panVatNumber,
          website: `https://${tenant.subdomain}.${APP_ROOT_DOMAIN}`,
        };
        storage.saveDatabase({ profile: patchedProfile });
        const finalState = storage.getDatabase();
        setDb(finalState);
        const bytes = new TextEncoder().encode(JSON.stringify(finalState)).length;
        void apiClient.recordTenantNetworkActivity(tenant.subdomain, {
          bytesTransferred: bytes,
          reads: 12,
          storageUsedBytes: bytes,
          activeUsersCount: (finalState.users || []).filter((u) => u.isActive !== false).length || 1,
        });
      } else {
        storage.resetToDemo();
        const freshBase = storage.getDatabase();
        const tenantProfile = {
          ...freshBase.profile,
          name: tenant.companyName,
          legalEntityName: `${tenant.companyName} Pvt. Ltd.`,
          panVatNumber: tenant.panVatNumber || freshBase.profile.panVatNumber,
          city: tenant.city || freshBase.profile.city,
          address: tenant.address || `${tenant.city || 'Kathmandu'}, Nepal`,
          contactNumber: tenant.contactNumber || freshBase.profile.contactNumber,
          email: tenant.adminEmail || fbUser.email || freshBase.profile.email,
          website: `https://${tenant.subdomain}.${APP_ROOT_DOMAIN}`,
          fiscalYear: tenant.fiscalYear || freshBase.profile.fiscalYear,
        };
        storage.saveDatabase({ profile: tenantProfile });
        storage.bindAuthenticatedUser(fbUser.email, fbUser.displayName);
        const initialState = storage.getDatabase();
        const seeded = await firestoreSync.syncDatabaseDiff(tenant.ownerUid, initialState, {
          allowDeletes: false,
        });
        if (!stillActive()) return;
        storage.saveDatabase({
          lastCloudSync: seeded.timestamp,
          isCloudSynced: true,
        });
        const finalState = storage.getDatabase();
        setDb(finalState);
        const bytes = new TextEncoder().encode(JSON.stringify(finalState)).length;
        void apiClient.recordTenantNetworkActivity(tenant.subdomain, {
          bytesTransferred: bytes,
          writes: seeded.written,
          storageUsedBytes: bytes,
          docCount: seeded.written,
          activeUsersCount: (finalState.users || []).filter((u) => u.isActive !== false).length || 1,
        });
      }

      firestoreSync.startRealtimeListeners(
        tenant.ownerUid,
        (remotePartial) => {
          if (!stillActive()) return;
          const merged = storage.applyRemoteDatabase(remotePartial);
          setDb(merged);
        },
        (err) => {
          if (!stillActive()) return;
          setFatalSyncError(err);
        }
      );
    },
    []
  );

  // Firebase Authentication & Strict 3-Surface Resolution Lifecycle
  useEffect(() => {
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!active) return;

      // If an explicit login handler is orchestrating verification, let it complete cleanly
      if (manualAuthFlowRef.current) {
        return;
      }

      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }

      if (!fbUser) {
        firestoreSync.resetTracking();
        setFirebaseUser(null);
        setIsCloudHydrating(false);

        const demoMode = getDemoSessionMode();
        if (demoMode === 'developer') {
          const demoTenants = await apiClient.listAllTenants();
          if (!active) return;
          setAllTenants(demoTenants);
          setIsDemoMode(true);
          setSurfaceMode('developer_portal');
        } else if (demoMode === 'workspace') {
          const demoTenants = await apiClient.listAllTenants();
          if (!active) return;
          const urlSub = getUrlSubdomainIfPresent();
          const selected =
            (urlSub && demoTenants.find((t) => t.subdomain === urlSub)) || demoTenants[0] || null;
          setAllTenants(demoTenants);
          setActiveTenant(selected);
          activeTenantRef.current = selected;
          setActiveWorkspaceOwnerUid(selected?.ownerUid || null);
          if (selected) {
            setActiveTenantSubdomain(selected.subdomain);
            const snap = loadDemoTenantWorkspaceSnapshot(selected);
            storage.saveDatabase(snap);
            storage.bindAuthenticatedUser(
              selected.adminEmail || 'demo@autocraftpro.com.np',
              `${selected.companyName} Admin`
            );
          }
          setDb(storage.getDatabase());
          setIsDemoMode(true);
          setSurfaceMode('tenant_workspace');
        } else {
          setIsDemoMode(false);
          setAllTenants([]);
          setActiveTenant(null);
          activeTenantRef.current = null;
          setActiveWorkspaceOwnerUid(null);
        }
        setAuthReady(true);
        return;
      }

      await waitForOnboardingIfActive();
      if (!active || !auth.currentUser) return;

      if (!fbUser.emailVerified) {
        setAuthError(
          'Please verify your email address before signing in, or use Continue with Google on Developer Login.'
        );
        firestoreSync.resetTracking();
        setFirebaseUser(null);
        setAllTenants([]);
        setActiveTenant(null);
        activeTenantRef.current = null;
        setActiveWorkspaceOwnerUid(null);
        setIsCloudHydrating(false);
        setAuthReady(true);
        void signOut(auth);
        return;
      }

      setDemoSessionMode(null);
      setIsDemoMode(false);
      setAuthError(null);
      setFirebaseUser(fbUser);
      setIsCloudHydrating(true);
      setAuthReady(true);

      try {
        const developerFlag = await checkIsPlatformDeveloper(fbUser.uid, fbUser.email);
        if (!active) return;

        const savedSurface = (() => {
          try {
            return window.sessionStorage.getItem(LAST_SURFACE_STORAGE_KEY);
          } catch {
            return null;
          }
        })();

        const intent = loginIntentRef.current;
        loginIntentRef.current = null;

        // Route A: Developer Portal Session
        if (
          intent?.type === 'developer' ||
          (!intent && savedSurface === 'developer_portal')
        ) {
          if (!developerFlag) {
            setAuthError(
              'This account is not registered in Developer Accounts. Contact the platform owner to grant developer access.'
            );
            setFirebaseUser(null);
            setSurfaceMode('developer_login');
            void signOut(auth);
            return;
          }

          const resolved = await apiClient.resolveAuthenticatedTenant(
            fbUser.uid,
            fbUser.email,
            true
          );
          if (!active) return;

          setDeveloperIdentity({
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Platform Developer',
            email: fbUser.email || 'developer@autocraftpro.com.np',
          });
          setAllTenants(resolved.allTenants);
          setActiveTenant(null);
          activeTenantRef.current = null;
          setActiveWorkspaceOwnerUid(null);
          try {
            window.sessionStorage.setItem(LAST_SURFACE_STORAGE_KEY, 'developer_portal');
          } catch {
            // Ignore storage restrictions
          }
          setSurfaceMode('developer_portal');
          return;
        }

        // Route B: Tenant Workspace Session (either from Workspace Login or reloaded tenant tab)
        const targetCompany =
          intent?.type === 'workspace'
            ? intent.companyName
            : getUrlSubdomainIfPresent() || '';

        if (targetCompany) {
          const wsResult = await apiClient.resolveTenantForWorkspaceLogin(
            targetCompany,
            fbUser.uid,
            fbUser.email,
            developerFlag
          );
          if (!active) return;

          if (wsResult.status === 'not_found') {
            setAuthError(`No provisioned company workspace found for "${targetCompany}".`);
            setFirebaseUser(null);
            setSurfaceMode('workspace_login');
            void signOut(auth);
            return;
          }
          if (wsResult.status === 'suspended') {
            setAuthError(
              `The workspace for "${targetCompany}" is currently suspended. Contact your platform administrator.`
            );
            setFirebaseUser(null);
            setSurfaceMode('workspace_login');
            void signOut(auth);
            return;
          }
          if (wsResult.status === 'unauthorized' || !wsResult.tenant) {
            setAuthError(
              `Your account is not authorized to sign in to "${targetCompany}". Enter your tenant Admin credentials or an authorized Developer account.`
            );
            setFirebaseUser(null);
            setSurfaceMode('workspace_login');
            void signOut(auth);
            return;
          }

          await hydrateCloudTenantWorkspace(wsResult.tenant, fbUser, () => active);
          if (!active) return;
          syncBrowserToTenantSubdomain(wsResult.tenant.subdomain);
          try {
            window.sessionStorage.setItem(LAST_SURFACE_STORAGE_KEY, 'tenant_workspace');
          } catch {
            // Ignore storage restrictions
          }
          setActiveTab('dashboard');
          setSurfaceMode('tenant_workspace');
          return;
        }

        // Route C: Reloaded session without explicit tenant parameter
        const resolved = await apiClient.resolveAuthenticatedTenant(
          fbUser.uid,
          fbUser.email,
          developerFlag
        );
        if (!active) return;

        if (developerFlag) {
          setDeveloperIdentity({
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Platform Developer',
            email: fbUser.email || 'developer@autocraftpro.com.np',
          });
          setAllTenants(resolved.allTenants);
          setSurfaceMode('developer_portal');
          return;
        }

        if (resolved.status !== 'ok' || !resolved.tenant) {
          setAuthError(
            resolved.status === 'suspended'
              ? 'This company workspace is currently suspended.'
              : 'No active tenant workspace is assigned to this account.'
          );
          setFirebaseUser(null);
          setSurfaceMode('workspace_login');
          void signOut(auth);
          return;
        }

        await hydrateCloudTenantWorkspace(resolved.tenant, fbUser, () => active);
        if (!active) return;
        syncBrowserToTenantSubdomain(resolved.tenant.subdomain);
        setActiveTab('dashboard');
        setSurfaceMode('tenant_workspace');
      } catch (err) {
        if (!active) return;
        setFatalSyncError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (active) {
          setIsCloudHydrating(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
      if (cloudSyncTimerRef.current) {
        clearTimeout(cloudSyncTimerRef.current);
      }
      firestoreSync.stopRealtimeListeners();
    };
  }, [hydrateCloudTenantWorkspace]);

  useEffect(() => {
    ensureGlobalEscapeListener();

    const TAB_SHORTCUTS: Record<string, TabType> = {
      '1': 'dashboard',
      '2': 'jobcards',
      '3': 'customers',
      '4': 'inventory',
      '5': 'billing',
      '6': 'accounting',
      '7': 'warranty',
      '8': 'analytics',
      '9': 'admin_settings',
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (surfaceMode !== 'tenant_workspace') return;

      // Alt + K or Shift + ? (outside editable inputs) -> Keyboard Shortcuts dialog
      if ((e.altKey && e.key.toLowerCase() === 'k') || (e.key === '?' && !isEditableTarget(e.target))) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Alt + N -> Quick New Vehicle Intake (Job Cards)
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('jobcards');
        setQuickIntakeTrigger((n) => n + 1);
        return;
      }

      // Alt + 1..9 / 0 -> Switch primary modules
      if (e.altKey && !e.ctrlKey && !e.metaKey && TAB_SHORTCUTS[e.key]) {
        e.preventDefault();
        setActiveTab(TAB_SHORTCUTS[e.key]);
        setIsMobileNavOpen(false);
        return;
      }

      // "/" outside inputs -> Focus current module's search input
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditableTarget(e.target)) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'main input[type="text"], main input[type="search"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [surfaceMode]);

  // Sync state changes with local cache & Cloud Firestore persistence (scoped to active tenant ownerUid)
  const updateDb = (partial: Partial<AppDatabase>) => {
    const effectiveOwnerUid = activeWorkspaceOwnerUid || firebaseUser?.uid;
    const canSyncFirestore = Boolean(firebaseUser?.uid && firebaseUser.emailVerified && effectiveOwnerUid);
    storage.saveDatabase({
      ...partial,
      ...(canSyncFirestore ? { isCloudSynced: false } : {}),
    });
    const nextSnapshot = storage.getDatabase();
    setDb(nextSnapshot);

    if (canSyncFirestore && effectiveOwnerUid) {
      scheduleCloudSync(effectiveOwnerUid, true);
    } else if (isDemoMode && activeTenantRef.current) {
      saveDemoTenantWorkspaceSnapshot(activeTenantRef.current.subdomain, nextSnapshot);
      const bytes = new TextEncoder().encode(JSON.stringify(nextSnapshot)).length;
      void apiClient.recordTenantNetworkActivity(activeTenantRef.current.subdomain, {
        bytesTransferred: Math.max(512, Math.round(bytes * 0.08)),
        writes: 1,
        storageUsedBytes: bytes,
        activeUsersCount: (nextSnapshot.users || []).filter((u) => u.isActive !== false).length || 1,
      });
    }
  };

  const currentUser = db.currentUser;

  // --- SEPARATED AUTHENTICATION HANDLERS (WEBSITE, DEVELOPER PORTAL, TENANT WORKSPACE) ---
  const enterDemoTenantWorkspace = useCallback(
    async (tenant: TenantRecord, actorEmail: string, actorName: string) => {
      setDemoSessionMode('workspace');
      setIsDemoMode(true);
      setAuthError(null);
      setFatalSyncError(null);
      setActiveTenantSubdomain(tenant.subdomain);
      setActiveTenant(tenant);
      activeTenantRef.current = tenant;
      setActiveWorkspaceOwnerUid(tenant.ownerUid);
      const snap = loadDemoTenantWorkspaceSnapshot(tenant);
      storage.saveDatabase(snap);
      storage.bindAuthenticatedUser(actorEmail, actorName);
      const nextDb = storage.getDatabase();
      setDb(nextDb);
      const bytes = new TextEncoder().encode(JSON.stringify(nextDb)).length;
      await apiClient.recordTenantNetworkActivity(tenant.subdomain, {
        bytesTransferred: bytes,
        reads: 12,
        storageUsedBytes: bytes,
        activeUsersCount: (nextDb.users || []).filter((u) => u.isActive !== false).length || 1,
      });
      syncBrowserToTenantSubdomain(tenant.subdomain);
      setActiveTab('dashboard');
      setSurfaceMode('tenant_workspace');
      setIsCloudHydrating(false);
      setAuthReady(true);
    },
    []
  );

  const handleEnterWorkspaceDemo = useCallback(
    (companyHint?: string) => {
      setDemoSessionMode('workspace');
      void apiClient.listAllTenants().then((demoTenants) => {
        const slug = companyHint ? normalizeCompanySlug(companyHint) : '';
        const matched =
          (slug &&
            demoTenants.find(
              (t) =>
                t.subdomain.toLowerCase() === slug ||
                t.companyName.toLowerCase() === (companyHint || '').trim().toLowerCase()
            )) ||
          demoTenants[0];
        if (matched) {
          void enterDemoTenantWorkspace(
            matched,
            matched.adminEmail || `admin@${matched.subdomain}.${APP_ROOT_DOMAIN}`,
            `${matched.companyName} Admin`
          );
        }
      });
    },
    [enterDemoTenantWorkspace]
  );

  const handleEnterDeveloperDemo = useCallback(() => {
    setDemoSessionMode('developer');
    setIsDemoMode(true);
    setAuthError(null);
    setFatalSyncError(null);
    setActiveTenant(null);
    activeTenantRef.current = null;
    setActiveWorkspaceOwnerUid(null);
    clearBrowserPortalParams();
    setDeveloperIdentity({
      name: 'Divas Rayamajhi',
      email: 'divasrayamajhi2@gmail.com',
    });
    void apiClient.listAllTenants().then((demoTenants) => {
      setAllTenants(demoTenants);
      setSurfaceMode('developer_portal');
      setIsCloudHydrating(false);
      setAuthReady(true);
    });
  }, []);

  const handleDeveloperGoogleSignIn = useCallback(async () => {
    setAuthError(null);
    loginIntentRef.current = { type: 'developer' };
    await signInWithPopup(auth, googleProvider);
  }, []);

  const handleDeveloperEmailSignIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const normalizedEmail = email.trim().toLowerCase();
    loginIntentRef.current = { type: 'developer' };
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err) {
      // Allow sandbox developer testing when Email/Password is not enabled in Firebase Auth
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      const matchedDemoDev = readDemoDevelopers().find(
        (d) => d.isActive && d.email.toLowerCase() === normalizedEmail
      );
      if (
        matchedDemoDev &&
        password.length >= 6 &&
        (code === 'auth/operation-not-allowed' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/user-not-found')
      ) {
        setDemoSessionMode('developer');
        setIsDemoMode(true);
        setDeveloperIdentity({ name: matchedDemoDev.name, email: matchedDemoDev.email });
        const demoTenants = await apiClient.listAllTenants();
        setAllTenants(demoTenants);
        setSurfaceMode('developer_portal');
        return;
      }
      throw err;
    }
  }, []);

  const handleWorkspaceSignIn = useCallback(
    async (companyName: string, email: string, password: string) => {
      setAuthError(null);
      const normalizedEmail = email.trim().toLowerCase();
      const slug = normalizeCompanySlug(companyName);
      manualAuthFlowRef.current = true;
      loginIntentRef.current = { type: 'workspace', companyName };

      try {
        let fbUser: FirebaseUser | null = null;
        let firebaseErr: unknown = null;
        try {
          const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);
          fbUser = cred.user;
        } catch (err) {
          firebaseErr = err;
        }

        if (fbUser) {
          if (!fbUser.emailVerified) {
            await signOut(auth).catch(() => {});
            throw new Error(
              'Please verify your work email address before signing into your workspace.'
            );
          }

          setDemoSessionMode(null);
          setIsDemoMode(false);
          const developerFlag = await checkIsPlatformDeveloper(fbUser.uid, fbUser.email);
          const wsResult = await apiClient.resolveTenantForWorkspaceLogin(
            companyName,
            fbUser.uid,
            fbUser.email,
            developerFlag
          );

          if (wsResult.status === 'not_found') {
            await signOut(auth).catch(() => {});
            throw new Error(`No provisioned workspace found for "${companyName}".`);
          }
          if (wsResult.status === 'suspended') {
            await signOut(auth).catch(() => {});
            throw new Error(
              `Workspace "${companyName}" is currently suspended. Please contact your platform administrator.`
            );
          }
          if (wsResult.status === 'unauthorized' || !wsResult.tenant) {
            await signOut(auth).catch(() => {});
            throw new Error(
              `Account "${normalizedEmail}" is not authorized for "${companyName}". Sign in with your Tenant Admin credentials or an authorized Developer account.`
            );
          }

          setFirebaseUser(fbUser);
          setIsCloudHydrating(true);
          await hydrateCloudTenantWorkspace(wsResult.tenant, fbUser);
          syncBrowserToTenantSubdomain(wsResult.tenant.subdomain);
          try {
            window.sessionStorage.setItem(LAST_SURFACE_STORAGE_KEY, 'tenant_workspace');
          } catch {
            // Ignore storage restrictions
          }
          setActiveTab('dashboard');
          setSurfaceMode('tenant_workspace');
          setIsCloudHydrating(false);
          return;
        }

        // Sandbox credential fallback: enables testing newly onboarded tenants & added Developer Accounts
        const errCode =
          typeof firebaseErr === 'object' && firebaseErr !== null && 'code' in firebaseErr
            ? String((firebaseErr as { code?: string }).code)
            : '';

        if (
          password.length >= 6 &&
          (errCode === 'auth/operation-not-allowed' ||
            errCode === 'auth/invalid-credential' ||
            errCode === 'auth/user-not-found')
        ) {
          setDemoSessionMode('workspace');
          const demoTenants = await apiClient.listAllTenants();
          const matchedTenant = demoTenants.find(
            (t) =>
              t.subdomain.toLowerCase() === slug ||
              t.companyName.toLowerCase() === companyName.trim().toLowerCase() ||
              normalizeCompanySlug(t.companyName) === slug
          );

          if (!matchedTenant) {
            setDemoSessionMode(null);
            throw new Error(`No provisioned company workspace found for "${companyName}".`);
          }

          const matchedDev = readDemoDevelopers().find(
            (d) => d.isActive && d.email.toLowerCase() === normalizedEmail
          );
          const isTenantAdmin = matchedTenant.adminEmail?.toLowerCase() === normalizedEmail;

          if (!matchedTenant.isActive && !matchedDev) {
            setDemoSessionMode(null);
            throw new Error(`Workspace "${matchedTenant.companyName}" is currently suspended.`);
          }

          if (matchedDev || isTenantAdmin) {
            await enterDemoTenantWorkspace(
              matchedTenant,
              normalizedEmail,
              matchedDev
                ? `${matchedDev.name} (Developer Support)`
                : `${matchedTenant.companyName} Admin`
            );
            return;
          }

          setDemoSessionMode(null);
          throw new Error(
            `Email "${normalizedEmail}" is not authorized for "${matchedTenant.companyName}". Use the tenant Admin email (${matchedTenant.adminEmail || 'assigned admin'}) or an active Developer account.`
          );
        }

        throw firebaseErr;
      } finally {
        manualAuthFlowRef.current = false;
        loginIntentRef.current = null;
      }
    },
    [enterDemoTenantWorkspace, hydrateCloudTenantWorkspace]
  );

  // From Developer Portal: routes strictly to Workspace Login (forces Developer ID & Password entry)
  const handleOpenTenantSignInFromDevPortal = useCallback((tenantSubdomain: string) => {
    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }
    firestoreSync.resetTracking();
    setDemoSessionMode(null);
    setIsDemoMode(false);
    setActiveTenant(null);
    activeTenantRef.current = null;
    setActiveWorkspaceOwnerUid(null);
    try {
      window.sessionStorage.removeItem(LAST_SURFACE_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions
    }
    void signOut(auth);
    setWorkspaceCompanyHint(tenantSubdomain);
    setAuthError(null);
    setSurfaceMode('workspace_login');
  }, []);

  const handleLogout = () => {
    if (cloudSyncTimerRef.current) {
      clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }
    firestoreSync.resetTracking();
    setDemoSessionMode(null);
    setIsDemoMode(false);
    setAllTenants([]);
    setActiveTenant(null);
    activeTenantRef.current = null;
    setActiveWorkspaceOwnerUid(null);
    setActiveTab('dashboard');
    setWorkspaceCompanyHint('');
    setAuthError(null);
    try {
      window.sessionStorage.removeItem(LAST_SURFACE_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions
    }
    clearBrowserPortalParams();
    storage.logout();
    void signOut(auth);
    setSurfaceMode('public_site');
  };

  // Badges Calculation for Navigation
  const partsList = db.parts || [];
  const jobCardsList = db.jobCards || [];
  const invoicesList = db.invoices || [];
  const warrantyClaimsList = db.warrantyClaims || [];

  const lowStockCount = partsList.filter(p => p && p.currentStock <= p.minReorderLevel).length;
  const activeJobCardsCount = jobCardsList.filter(jc => jc && jc.status !== 'Delivered').length;
  const unpaidInvoicesCount = invoicesList.filter(i => i && i.status !== 'Paid').length;
  const pendingWarrantyCount = warrantyClaimsList.filter(w => w && (w.status === 'Submitted to OEM' || w.status === 'OEM Inspection / Under Review')).length;

  // --- USER SWITCHER ---
  const handleSwitchUser = (userId: string) => {
    storage.setCurrentUser(userId);
    setDb(storage.getDatabase());
  };

  // --- JOB CARDS HANDLERS ---
  const syncJobCardContactToCustomers = (jc: JobCard, customersList: Customer[]): Customer[] => {
    const cleanPhone = (jc.customerPhone || '').trim();
    const cleanName = (jc.customerName || '').trim();
    const cleanReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPhone && !cleanName) return customersList;

    return (customersList || []).map((cust) => {
      const matchesId = Boolean(jc.customerId && cust.id === jc.customerId);
      const matchesReg = Boolean(
        cleanReg &&
        (cust.vehicles || []).some(
          (v) =>
            (typeof v === 'string' ? v : v?.registrationNumber || '')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '') === cleanReg
        )
      );
      if (!matchesId && !matchesReg) return cust;
      return {
        ...cust,
        phone: cleanPhone || cust.phone,
        name: cleanName || cust.name,
      };
    });
  };

  const handleCreateJobCard = (newJc: JobCard) => {
    const updatedCards = [newJc, ...db.jobCards];
    const syncedCustomers = syncJobCardContactToCustomers(newJc, db.customers || []);
    updateDb({ jobCards: updatedCards, customers: syncedCustomers });
  };

  const hasLinkedRegularInvoice = (jc: JobCard, invoicesList: Invoice[] = db.invoices || []) => {
    if (jc.invoiceId || jc.invoiceNumber) return true;
    return invoicesList.some(
      (inv) =>
        !isCreditNoteInvoice(inv) &&
        ((inv.jobCardId && inv.jobCardId === jc.id) ||
          (inv.jobCardNumber && inv.jobCardNumber === jc.jobCardNumber))
    );
  };

  const sealDeliveredInvoicedJobCard = (jc: JobCard, actorName: string): JobCard => {
    const nowIso = new Date().toISOString();
    return {
      ...jc,
      status: 'Delivered',
      isLocked: true,
      lockedAt: nowIso,
      lockedBy: actorName,
      lockHash:
        jc.lockHash ||
        `NPL-JC-${jc.jobCardNumber}-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
      reopenedByAdmin: false,
    };
  };

  const handleUpdateJobCard = (updatedJc: JobCard) => {
    const prevJc = (db.jobCards || []).find((jc) => jc.id === updatedJc.id);

    // Hard role enforcement: Once closed & locked, ONLY Admin can reopen or modify a Job Card
    if (prevJc?.isLocked && currentUser.role !== 'Admin') {
      return;
    }

    const isAdminReopening = Boolean(
      prevJc?.isLocked && !updatedJc.isLocked && currentUser.role === 'Admin'
    );

    // Auto-close & lock when vehicle is marked Delivered AND an invoice is already generated
    let finalJc: JobCard = updatedJc;
    let didAutoClose = false;
    if (
      !isAdminReopening &&
      updatedJc.status === 'Delivered' &&
      hasLinkedRegularInvoice(updatedJc, db.invoices || []) &&
      !updatedJc.isLocked
    ) {
      finalJc = sealDeliveredInvoicedJobCard(updatedJc, currentUser?.name || 'System Auto-Close');
      didAutoClose = true;
    } else if (
      !isAdminReopening &&
      updatedJc.isLocked &&
      !prevJc?.isLocked &&
      !updatedJc.lockedAt
    ) {
      finalJc = {
        ...updatedJc,
        lockedAt: new Date().toISOString(),
        lockedBy: updatedJc.lockedBy || currentUser?.name || 'Workshop Staff',
      };
    }

    const updatedCards = db.jobCards.map((jc) => (jc.id === finalJc.id ? finalJc : jc));
    const syncedCustomers = syncJobCardContactToCustomers(finalJc, db.customers || []);

    // Release bay automatically if Delivered or Ready for Billing
    const updatedBays =
      finalJc.status === 'Delivered' || finalJc.status === 'Ready for Billing'
        ? (db.bays || []).map((b) =>
            b.currentJobCardId === finalJc.id ||
            (finalJc.bayNumber && (b.name === finalJc.bayNumber || b.bayNumber === finalJc.bayNumber))
              ? { ...b, status: 'Available' as const, currentJobCardId: undefined, currentVehicleReg: undefined }
              : b
          )
        : db.bays;

    updateDb({ jobCards: updatedCards, customers: syncedCustomers, bays: updatedBays });

    if (didAutoClose) {
      showLifecycleToast(
        `Job Card ${finalJc.jobCardNumber} Closed & Locked`,
        'Vehicle marked Delivered with Tax Invoice generated. Job Card is now closed — only an Admin can reopen it.',
        'locked'
      );
    } else if (isAdminReopening) {
      showLifecycleToast(
        `Job Card ${finalJc.jobCardNumber} Re-Opened by Admin`,
        `Unlocked by ${currentUser.name} for authorized adjustments. Marking Delivered or generating a new invoice will auto-close it again.`,
        'reopened'
      );
    }
  };

  const handleCreateAppointment = (newApt: Appointment) => {
    const updatedApts = [newApt, ...db.appointments];
    updateDb({ appointments: updatedApts });
  };

  // --- VEHICLE READY / PICKUP SMS & MESSAGE NOTIFICATION HANDLER ---
  const handleTriggerReadyNotification = (jc: JobCard) => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);
    const workshopName = db.profile?.name || 'Continental Auto Kraft';
    const workshopPhone = db.profile?.contactNumber || '+977-1-4378920';
    const customerContact = (jc.customerPhone || '').trim();
    const message = `Vehicle Ready for Pickup: ${jc.vehicle?.registrationNumber || ''} (${jc.vehicle?.brand || jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}) under ${jc.jobCardNumber} is Ready for Billing & Pickup at ${workshopName}. Customer: ${jc.customerName}. Workshop Helpline: ${workshopPhone}.`;

    const newLog: ReadyNotificationLog = {
      id: generateUniqueId('NTF'),
      jobCardId: jc.id,
      jobCardNumber: jc.jobCardNumber,
      vehicleReg: jc.vehicle?.registrationNumber || '',
      vehicleLabel: `${jc.vehicle?.brand || jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}`.trim() || 'Vehicle',
      customerName: jc.customerName,
      recipientPhone: customerContact,
      channel: 'SMS & Message',
      message,
      sentAt: nowIso,
      bsDate: adToBs(todayDate).formatted,
      isRead: false,
    };

    const updatedCards = (db.jobCards || []).map((card) =>
      card.id === jc.id ? { ...card, readyNotificationSentAt: nowIso } : card
    );

    updateDb({
      jobCards: updatedCards,
      readyNotifications: [newLog, ...(db.readyNotifications || [])],
    });
    setActiveReadyToast(newLog);
  };

  const handleMarkNotificationsRead = () => {
    const updated = (db.readyNotifications || []).map((n) => ({ ...n, isRead: true }));
    updateDb({ readyNotifications: updated });
  };

  // Convert Job Card to Nepal IRD Tax Invoice (13% VAT) — supports Individual/Company Billing & Separate Supplementary Invoices for Re-Opened Paid Job Cards
  const handleConvertJobCardToInvoice = (jc: JobCard, options?: TaxInvoiceGenerationOptions) => {
    // Check existing regular (non-credit-note) invoices for this Job Card
    const existingRegularInvoices = (db.invoices || []).filter(
      (inv) =>
        !isCreditNoteInvoice(inv) &&
        (inv.jobCardId === jc.id ||
          inv.jobCardNumber === jc.jobCardNumber ||
          (jc.invoiceId && inv.id === jc.invoiceId) ||
          (jc.invoiceNumber && inv.invoiceNumber === jc.invoiceNumber))
    );

    const hasExistingInvoice = existingRegularInvoices.length > 0;
    const allExistingPaid =
      hasExistingInvoice && existingRegularInvoices.every((inv) => inv.status === 'Paid');

    const billedLaborSet = new Set(jc.billedLaborIds || []);
    const billedPartSet = new Set(jc.billedPartIds || []);
    const allParts = jc.partsRequested || jc.partsItems || [];
    const allLabor = jc.laborItems || [];

    const isSupplementary =
      hasExistingInvoice && (Boolean(options?.onlyUnbilledItems) || allExistingPaid);

    // If an UNPAID invoice already exists for this job card, open it instead of duplicating
    if (hasExistingInvoice && !isSupplementary) {
      setActiveTab('billing');
      setPrintInvoice(existingRegularInvoices[0]);
      return;
    }

    // For a re-opened Paid Job Card, bill ONLY newly added unbilled items under a separate new Tax Invoice
    // while keeping the earlier Paid invoice permanently Paid and untouched
    const rawParts = isSupplementary
      ? allParts.filter((p) => !billedPartSet.has(p.id))
      : allParts;
    const rawLabor = isSupplementary
      ? allLabor.filter((l) => !billedLaborSet.has(l.id))
      : allLabor;

    if (isSupplementary && rawParts.length === 0 && rawLabor.length === 0) {
      setActiveTab('billing');
      setPrintInvoice(existingRegularInvoices[0]);
      return;
    }

    const partsSubtotal = round2(
      rawParts.reduce(
        (acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))),
        0
      )
    );
    const laborSubtotal = round2(
      rawLabor.reduce(
        (acc, l) => acc + (l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour ?? 0))),
        0
      )
    );
    const grossSubtotal = round2(partsSubtotal + laborSubtotal);
    const optDiscType = options?.discountType || 'percent';
    const rawOptDiscVal = Math.max(0, Number(options?.discountValue) || 0);
    const clampedOptDiscVal =
      optDiscType === 'percent' ? Math.min(100, rawOptDiscVal) : Math.min(grossSubtotal, rawOptDiscVal);
    const appliedDiscount =
      optDiscType === 'percent'
        ? round2((grossSubtotal * clampedOptDiscVal) / 100)
        : round2(clampedOptDiscVal);
    const taxableAmount = round2(Math.max(0, grossSubtotal - appliedDiscount));
    const vatAmount = round2(taxableAmount * 0.13);
    const grandTotal = round2(taxableAmount + vatAmount);
    const isZeroDue = grandTotal <= 0.01;
    const netRatio = grossSubtotal > 0 ? taxableAmount / grossSubtotal : 1;
    const netLaborTaxable = round2(laborSubtotal * netRatio);
    const netPartsTaxable = round2(taxableAmount - netLaborTaxable);

    const cb = options?.companyBilling;
    const isCompanyBill = Boolean(cb?.isCompanyBill && cb.companyName?.trim());
    const todayIso = new Date().toISOString();
    const todayDate = todayIso.slice(0, 10);
    const fiscalYear = getNepalFiscalYear(todayDate) || db.profile.fiscalYear || '2083/84';
    const nextInvoiceNumber = getNextSequentialDocNumber(
      (db.invoices || []).map((i) => i.invoiceNumber),
      'TAX',
      fiscalYear
    );

    const newInvoice: Invoice = {
      id: generateUniqueId('INV'),
      invoiceNumber: nextInvoiceNumber,
      fiscalYear,
      date: todayDate,
      bsDate: toNepalBsDate(todayDate),
      jobCardId: jc.id,
      jobCardNumber: jc.jobCardNumber,
      customerId: jc.customerId,
      customerName: isCompanyBill ? cb!.companyName.trim() : jc.customerName,
      customerPhone: isCompanyBill ? cb!.phone.trim() : jc.customerPhone,
      customerAddress: isCompanyBill ? cb!.address.trim() : options?.customerAddress,
      customerPan: isCompanyBill ? cb!.panVatNumber.trim() : (options?.customerPan || jc.customerPan),
      customerPanVat: isCompanyBill ? cb!.panVatNumber.trim() : (options?.customerPan || jc.customerPan),
      billedToType: isCompanyBill ? 'Company' : 'Individual',
      companyName: isCompanyBill ? cb!.companyName.trim() : undefined,
      companyAddress: isCompanyBill ? cb!.address.trim() : undefined,
      companyPhone: isCompanyBill ? cb!.phone.trim() : undefined,
      buyerContactPerson: jc.customerName,
      vehicleReg: jc.vehicle?.registrationNumber || 'BA 01 PA 0001',
      vehicleBrand: jc.vehicle?.brand || 'Generic',
      vehicleModel: jc.vehicle?.model || 'Model',
      subTotal: grossSubtotal,
      taxableAmount,
      totalTaxableAmount: taxableAmount,
      laborTaxableAmount: netLaborTaxable,
      partsTaxableAmount: netPartsTaxable,
      discountType: appliedDiscount > 0 ? optDiscType : undefined,
      discountValue: appliedDiscount > 0 ? clampedOptDiscVal : 0,
      discountTotal: appliedDiscount,
      totalDiscount: appliedDiscount,
      vatRate: 13,
      vatAmount,
      totalVatAmount: vatAmount,
      grandTotal,
      paidAmount: 0,
      amountPaid: 0,
      balanceDue: isZeroDue ? 0 : grandTotal,
      paymentMethod: options?.paymentMethod || 'Fonepay',
      status: isZeroDue ? 'Paid' : 'Unpaid',
      paymentStatus: isZeroDue ? 'Paid' : 'Unpaid',
      createdAt: todayIso,
      type: 'Tax Invoice',
      isLocked: false,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: todayIso,
        cbmsAckNumber: generateUniqueId('CBMS'),
        fiscalYear
      },
      items: [
        ...rawLabor.map((l, idx) => ({
          id: generateUniqueId(`ITEM-L${idx}`),
          itemType: 'Labor' as const,
          description: l.description,
          hsnSacCode: '998714',
          quantity: l.hours || l.hoursEstimated || 1,
          unitPrice: l.ratePerHour ?? l.totalAmount ?? 0,
          taxableAmount: l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0)),
          vatRate: 13,
          vatAmount: round2((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0))) * 0.13),
          totalAmount: round2((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0))) * 1.13)
        })),
        ...rawParts.map((p, idx) => ({
          id: generateUniqueId(`ITEM-P${idx}`),
          itemType: 'Part' as const,
          description: `${p.partName || p.name || 'Spare Part'} (${p.partNumber || 'GEN'})`,
          hsnSacCode: '87082900',
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
          taxableAmount: p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0)),
          vatRate: 13,
          vatAmount: round2((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 0.13),
          totalAmount: round2((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 1.13)
        }))
      ]
    };

    const mergedBilledLaborIds = Array.from(
      new Set([...(jc.billedLaborIds || []), ...rawLabor.map((l) => l.id)])
    );
    const mergedBilledPartIds = Array.from(
      new Set([...(jc.billedPartIds || []), ...rawParts.map((p) => p.id)])
    );

    const existingHistory = jc.invoiceHistory || existingRegularInvoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date || inv.createdAt?.slice(0, 10) || todayDate,
      amount: inv.grandTotal,
      status: inv.status,
    }));

    const closeTimestamp = new Date().toISOString();
    const updatedJc: JobCard = { 
      ...jc, 
      status: 'Delivered',
      isLocked: true,
      lockedAt: closeTimestamp,
      lockedBy: currentUser?.name || 'System Auto-Close',
      lockHash:
        jc.lockHash ||
        `NPL-JC-${jc.jobCardNumber}-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
      reopenedByAdmin: false,
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      billedLaborIds: mergedBilledLaborIds,
      billedPartIds: mergedBilledPartIds,
      invoiceHistory: [
        ...existingHistory,
        {
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          date: todayDate,
          amount: newInvoice.grandTotal,
          status: newInvoice.status,
        },
      ],
    };
    const updatedCards = db.jobCards.map(c => c.id === jc.id ? updatedJc : c);
    const updatedInvoices = [newInvoice, ...db.invoices];

    // Release the assigned workshop bay automatically upon invoicing/delivery
    const updatedBays = (db.bays || []).map((b) =>
      b.currentJobCardId === jc.id || b.name === jc.bayNumber || b.bayNumber === jc.bayNumber
        ? { ...b, status: 'Available' as const, currentJobCardId: undefined, currentVehicleReg: undefined }
        : b
    );

    // User requirement: "once the invoice is generated, create a gate pass of individual vehicle with information."
    const now = new Date();
    const vehicleGatePass: GatePass = {
      id: generateUniqueId('GP'),
      passNumber: getNextSequentialDocNumber(
        (db.gatePasses || []).map((g) => g.passNumber),
        'GP',
        fiscalYear
      ),
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      jobCardId: jc.id,
      jobCardNumber: newInvoice.jobCardNumber,
      vehicleReg: newInvoice.vehicleReg,
      vehicleMake: jc.vehicle?.brand || newInvoice.vehicleBrand,
      vehicleModel: jc.vehicle?.model || newInvoice.vehicleModel,
      vinNumber: jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || 'N/A',
      engineNumber: jc.vehicle?.engineNumber || 'N/A',
      odometerReading: jc.vehicle?.odometerReading || 0,
      arrivalDate: jc.arrivalDate || jc.createdAt.slice(0, 10),
      entryTime: jc.entryTime || '09:30 AM',
      customerName: newInvoice.customerName,
      customerPhone: newInvoice.customerPhone,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Workshop Manager',
      securityOfficerName: 'Main Gate Security',
      status: 'Cleared for Exit',
      totalInvoiceAmount: newInvoice.grandTotal,
      paymentStatus: newInvoice.status
    };
    const updatedGatePasses = [vehicleGatePass, ...(db.gatePasses || [])];

    // Automatically update customer directory: aggregate lifetime totalSpent, last visit date, and vehicle garage records
    const invoiceCustName = (jc.customerName || newInvoice.customerName || '').trim().toLowerCase();
    const invoiceVehReg = (newInvoice.vehicleReg || '').trim().toUpperCase();
    const updatedCustomers = (db.customers || []).map(cust => {
      const matchesId = newInvoice.customerId && cust.id === newInvoice.customerId;
      const matchesName = cust.name.trim().toLowerCase() === invoiceCustName;
      const matchesVeh = (cust.vehicles || []).some(v => (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase() === invoiceVehReg);
      if (!matchesId && !matchesName && !matchesVeh) return cust;

      const updatedVehicles = (cust.vehicles || []).map(v => {
        const reg = (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase();
        if (reg === invoiceVehReg) {
          return {
            ...(typeof v === 'object' ? v : {}),
            registrationNumber: typeof v === 'string' ? v : v?.registrationNumber || invoiceVehReg,
            totalServiceCount: ((typeof v === 'object' && v?.totalServiceCount) || 0) + 1,
            totalBilledAmount: ((typeof v === 'object' && v?.totalBilledAmount) || 0) + newInvoice.grandTotal,
            lastServiceDate: now.toISOString().slice(0, 10),
            nextServiceDueDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            nextServiceDueKm: (jc.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0) || 0) + 5000,
            lastJobCardNumber: newInvoice.jobCardNumber,
            odometerReading: jc.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0)
          };
        }
        return v;
      });

      return {
        ...cust,
        totalSpent: (cust.totalSpent || 0) + newInvoice.grandTotal,
        lastVisit: now.toISOString().slice(0, 10),
        vehicles: updatedVehicles
      };
    });

    // Post balanced Double-Entry GL Journal Entry for non-zero IRD Tax Invoices
    const invJv = grandTotal > 0.01
      ? buildInvoiceJournalEntry(newInvoice, (db.journalEntries || []).length)
      : null;
    const updatedJournalEntries = invJv ? [invJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = invJv ? applyJournalEntryToAccounts(db.glAccounts || [], invJv) : (db.glAccounts || []);

    updateDb({ 
      jobCards: updatedCards, 
      bays: updatedBays,
      invoices: updatedInvoices, 
      gatePasses: updatedGatePasses,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
    showLifecycleToast(
      `Job Card ${updatedJc.jobCardNumber} Closed & Locked`,
      `Vehicle marked Delivered and IRD Tax Invoice ${newInvoice.invoiceNumber} generated. Only an Admin can reopen this Job Card.`,
      'locked'
    );
    setActiveTab('billing');
    setPrintInvoice(newInvoice);
  };

  // --- INVOICE & PAYMENT HANDLERS ---
  const handleCreateInvoice = (newInv: Invoice) => {
    // Check if an invoice already exists for this job card
    if (newInv.jobCardId || newInv.jobCardNumber) {
      const duplicate = db.invoices.find(inv => 
        (newInv.jobCardId && inv.jobCardId === newInv.jobCardId) ||
        (newInv.jobCardNumber && inv.jobCardNumber === newInv.jobCardNumber)
      );
      if (duplicate) {
        setActiveTab('billing');
        setPrintInvoice(duplicate);
        return;
      }
    }

    const updated = [newInv, ...db.invoices];
    const now = new Date();
    const invFy = newInv.fiscalYear || getNepalFiscalYear(newInv.date);
    // Automatically create vehicle gate pass upon invoice generation
    const correspondingJc = db.jobCards.find(jc => jc.id === newInv.jobCardId || jc.jobCardNumber === newInv.jobCardNumber);
    const vehicleGatePass: GatePass = {
      id: generateUniqueId('GP'),
      passNumber: getNextSequentialDocNumber(
        (db.gatePasses || []).map((g) => g.passNumber),
        'GP',
        invFy
      ),
      invoiceId: newInv.id,
      invoiceNumber: newInv.invoiceNumber,
      jobCardId: newInv.jobCardId,
      jobCardNumber: newInv.jobCardNumber,
      vehicleReg: newInv.vehicleReg,
      vehicleMake: newInv.vehicleBrand || correspondingJc?.vehicle?.brand || 'Multi-Brand',
      vehicleModel: newInv.vehicleModel,
      vinNumber: correspondingJc?.vehicle?.vinNumber || correspondingJc?.vehicle?.chassisNumber || 'N/A',
      engineNumber: correspondingJc?.vehicle?.engineNumber || 'N/A',
      odometerReading: correspondingJc?.vehicle?.odometerReading || 0,
      arrivalDate: correspondingJc?.arrivalDate || newInv.createdAt.slice(0, 10),
      entryTime: correspondingJc?.entryTime || '09:30 AM',
      customerName: newInv.customerName,
      customerPhone: newInv.customerPhone,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Workshop Manager',
      securityOfficerName: 'Main Gate Security',
      status: 'Cleared for Exit',
      totalInvoiceAmount: newInv.grandTotal,
      paymentStatus: newInv.status
    };
    const updatedGatePasses = [vehicleGatePass, ...(db.gatePasses || [])];

    // Automatically mark Delivered, close & lock the linked job card and release its bay
    let updatedCards = db.jobCards;
    let updatedBays = db.bays;
    let closedJobCardNumber: string | null = null;
    if (newInv.jobCardId || newInv.jobCardNumber) {
      const closeIso = now.toISOString();
      updatedCards = db.jobCards.map(jc => {
        if (jc.id === newInv.jobCardId || jc.jobCardNumber === newInv.jobCardNumber) {
          closedJobCardNumber = jc.jobCardNumber;
          return {
            ...jc,
            status: 'Delivered',
            isLocked: true,
            lockedAt: closeIso,
            lockedBy: currentUser?.name || 'System Auto-Close',
            lockHash:
              jc.lockHash ||
              `NPL-JC-${jc.jobCardNumber}-${Date.now().toString(36).toUpperCase()}-${Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase()}`,
            reopenedByAdmin: false,
            invoiceId: newInv.id,
            invoiceNumber: newInv.invoiceNumber
          };
        }
        return jc;
      });
      if (correspondingJc) {
        updatedBays = (db.bays || []).map((b) =>
          b.currentJobCardId === correspondingJc.id ||
          (correspondingJc.bayNumber &&
            (b.name === correspondingJc.bayNumber || b.bayNumber === correspondingJc.bayNumber))
            ? { ...b, status: 'Available' as const, currentJobCardId: undefined, currentVehicleReg: undefined }
            : b
        );
      }
    }

    // Automatically update customer directory: aggregate lifetime totalSpent, last visit date, and vehicle garage records
    const invoiceCustName = (newInv.customerName || '').trim().toLowerCase();
    const invoiceVehReg = (newInv.vehicleReg || '').trim().toUpperCase();
    const updatedCustomers = (db.customers || []).map(cust => {
      const matchesId = newInv.customerId && cust.id === newInv.customerId;
      const matchesName = cust.name.trim().toLowerCase() === invoiceCustName;
      const matchesVeh = (cust.vehicles || []).some(v => (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase() === invoiceVehReg);
      if (!matchesId && !matchesName && !matchesVeh) return cust;

      const updatedVehicles = (cust.vehicles || []).map(v => {
        const reg = (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase();
        if (reg === invoiceVehReg) {
          return {
            ...(typeof v === 'object' ? v : {}),
            registrationNumber: typeof v === 'string' ? v : v?.registrationNumber || invoiceVehReg,
            totalServiceCount: ((typeof v === 'object' && v?.totalServiceCount) || 0) + 1,
            totalBilledAmount: ((typeof v === 'object' && v?.totalBilledAmount) || 0) + newInv.grandTotal,
            lastServiceDate: now.toISOString().slice(0, 10),
            nextServiceDueDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            nextServiceDueKm: (correspondingJc?.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0) || 0) + 5000,
            lastJobCardNumber: newInv.jobCardNumber,
            odometerReading: correspondingJc?.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0)
          };
        }
        return v;
      });

      return {
        ...cust,
        totalSpent: (cust.totalSpent || 0) + newInv.grandTotal,
        lastVisit: now.toISOString().slice(0, 10),
        vehicles: updatedVehicles
      };
    });

    // Post balanced Double-Entry GL Journal Entry
    const invJv = isCreditNoteInvoice(newInv)
      ? buildCreditNoteJournalEntry(newInv, (newInv.paidAmount ?? 0) !== 0, (db.journalEntries || []).length)
      : buildInvoiceJournalEntry(newInv, (db.journalEntries || []).length);
    const updatedJournalEntries = invJv ? [invJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = invJv ? applyJournalEntryToAccounts(db.glAccounts || [], invJv) : (db.glAccounts || []);

    updateDb({
      invoices: updated,
      gatePasses: updatedGatePasses,
      jobCards: updatedCards,
      bays: updatedBays,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
    if (closedJobCardNumber) {
      showLifecycleToast(
        `Job Card ${closedJobCardNumber} Closed & Locked`,
        `Vehicle marked Delivered and Tax Invoice ${newInv.invoiceNumber} generated. Only an Admin can reopen this Job Card.`,
        'locked'
      );
    }
  };

  const handleUpdateInvoice = (updatedInv: Invoice) => {
    const updated = db.invoices.map(i => i.id === updatedInv.id ? updatedInv : i);
    updateDb({ invoices: updated });
  };

  // Apply Discount (% or NPR Amount) on an Invoice & Automatically Reconcile Bill, Gate Pass, Customer, and GL/VAT
  const handleApplyInvoiceDiscount = (
    targetInv: Invoice,
    discountType: 'percent' | 'amount',
    discountValue: number
  ) => {
    const liveInv = (db.invoices || []).find((i) => i.id === targetInv.id) || targetInv;
    if (isCreditNoteInvoice(liveInv)) return;

    const items = liveInv.items || [];
    const itemsSum = round2(
      items.reduce(
        (sum, it) => sum + Number(it.taxableAmount ?? Number(it.quantity || 1) * Number(it.unitPrice || 0)),
        0
      )
    );
    const grossSubTotal = round2(
      Number(liveInv.subTotal ?? liveInv.subtotal ?? itemsSum) || itemsSum
    );
    const safeVal = Math.max(0, Number(discountValue) || 0);
    const clampedVal =
      discountType === 'percent' ? Math.min(100, safeVal) : Math.min(grossSubTotal, safeVal);
    const newDiscount =
      discountType === 'percent'
        ? round2((grossSubTotal * clampedVal) / 100)
        : round2(clampedVal);
    const newTaxable = round2(Math.max(0, grossSubTotal - newDiscount));
    const vatRate = Number(liveInv.vatRate ?? 13);
    const newVat = round2(newTaxable * (vatRate / 100));
    const newGrandTotal = round2(newTaxable + newVat);

    // Proportional Labor / Parts revenue split for GL reconciliation
    let rawLaborGross = 0;
    let rawPartsGross = 0;
    if (items.length > 0) {
      items.forEach((it) => {
        const amt = round2(Number(it.taxableAmount ?? Number(it.quantity || 1) * Number(it.unitPrice || 0)));
        if (it.itemType === 'Labor') rawLaborGross = round2(rawLaborGross + amt);
        else rawPartsGross = round2(rawPartsGross + amt);
      });
    } else {
      rawLaborGross = round2(liveInv.laborTaxableAmount || 0);
      rawPartsGross = round2(liveInv.partsTaxableAmount || grossSubTotal);
    }
    const rawSplitTotal = round2(rawLaborGross + rawPartsGross);
    const netLaborTaxable =
      rawSplitTotal > 0 ? round2((rawLaborGross / rawSplitTotal) * newTaxable) : 0;
    const netPartsTaxable = round2(newTaxable - netLaborTaxable);
    const netLaborVat = round2(netLaborTaxable * (vatRate / 100));
    const netPartsVat = round2(newVat - netLaborVat);

    const oldGrandTotal = round2(liveInv.grandTotal ?? 0);
    const oldPaid = round2(liveInv.paidAmount ?? liveInv.amountPaid ?? 0);
    const newPaid = round2(Math.min(oldPaid, newGrandTotal));
    const newBalance = round2(Math.max(0, newGrandTotal - newPaid));
    const newStatus: Invoice['status'] =
      newGrandTotal <= 0.01 || newBalance <= 0.01
        ? 'Paid'
        : newPaid > 0.01
          ? 'Partially Paid'
          : 'Unpaid';

    const updatedInv: Invoice = {
      ...liveInv,
      subTotal: grossSubTotal,
      discountType: newDiscount > 0 ? discountType : undefined,
      discountValue: newDiscount > 0 ? clampedVal : 0,
      discountTotal: newDiscount,
      totalDiscount: newDiscount,
      taxableAmount: newTaxable,
      totalTaxableAmount: newTaxable,
      laborTaxableAmount: netLaborTaxable,
      laborVatAmount: netLaborVat,
      partsTaxableAmount: netPartsTaxable,
      partsVatAmount: netPartsVat,
      vatAmount: newVat,
      totalVatAmount: newVat,
      grandTotal: newGrandTotal,
      paidAmount: newPaid,
      amountPaid: newPaid,
      balanceDue: newBalance <= 0.01 ? 0 : newBalance,
      status: newStatus,
      paymentStatus: newStatus
    };

    const updatedInvoices = (db.invoices || []).map((i) =>
      i.id === updatedInv.id ? updatedInv : i
    );

    const updatedGatePasses = (db.gatePasses || []).map((gp) =>
      gp.invoiceId === updatedInv.id || gp.invoiceNumber === updatedInv.invoiceNumber
        ? { ...gp, totalInvoiceAmount: newGrandTotal, paymentStatus: newStatus }
        : gp
    );

    const updatedJobCards = (db.jobCards || []).map((jc) => {
      if (jc.id !== updatedInv.jobCardId && jc.jobCardNumber !== updatedInv.jobCardNumber) return jc;
      if (!jc.invoiceHistory || jc.invoiceHistory.length === 0) return jc;
      return {
        ...jc,
        invoiceHistory: jc.invoiceHistory.map((h) =>
          h.invoiceId === updatedInv.id || h.invoiceNumber === updatedInv.invoiceNumber
            ? { ...h, amount: newGrandTotal, status: newStatus }
            : h
        )
      };
    });

    const grandDelta = round2(newGrandTotal - oldGrandTotal);
    const updatedCustomers =
      Math.abs(grandDelta) > 0.005
        ? (db.customers || []).map((c) => {
            const matches =
              (updatedInv.customerId && c.id === updatedInv.customerId) ||
              c.name.trim().toLowerCase() === (updatedInv.customerName || '').trim().toLowerCase();
            if (!matches) return c;
            return {
              ...c,
              totalSpent: Math.max(0, round2((c.totalSpent || 0) + grandDelta))
            };
          })
        : db.customers || [];

    // Rebuild corresponding Sales Journal Entry & recompute GL balances so Trial Balance stays balanced
    const existingJournals = db.journalEntries || [];
    const jvIndex = existingJournals.findIndex(
      (j) =>
        j.sourceDocument === updatedInv.invoiceNumber &&
        (j.id.startsWith('JV-INV') || (j.narration || '').startsWith('Sales Invoice'))
    );
    let updatedJournalEntries = existingJournals;
    if (jvIndex >= 0) {
      const existingJv = existingJournals[jvIndex];
      const wasBookedFullAr = (existingJv.lines || []).some(
        (l) => l.accountCode === '1100' && Math.abs((l.debit || 0) - (existingJv.totalAmount || 0)) < 0.02
      );
      const invForJournal = wasBookedFullAr
        ? { ...updatedInv, paidAmount: 0, amountPaid: 0 }
        : updatedInv;
      const rebuiltJv = buildInvoiceJournalEntry(invForJournal, jvIndex);
      if (rebuiltJv) {
        rebuiltJv.id = existingJv.id;
        rebuiltJv.entryNumber = existingJv.entryNumber;
        updatedJournalEntries = existingJournals.map((j, idx) =>
          idx === jvIndex ? rebuiltJv : j
        );
      } else {
        updatedJournalEntries = existingJournals.filter((_, idx) => idx !== jvIndex);
      }
    }
    const updatedGlAccounts = recomputeGlBalancesFromJournal(
      db.glAccounts || [],
      updatedJournalEntries
    );

    updateDb({
      invoices: updatedInvoices,
      gatePasses: updatedGatePasses,
      jobCards: updatedJobCards,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });

    if (printInvoice && printInvoice.id === updatedInv.id) {
      setPrintInvoice(updatedInv);
    }
  };

  const handleRecordPayment = (invoiceId: string, amount: number, method: NepalPaymentMethod, ref: string) => {
    const inv = db.invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    if (isCreditNoteInvoice(inv)) return;

    const grandTotal = round2(inv.grandTotal ?? 0);
    const currentPaid = round2(inv.paidAmount ?? inv.amountPaid ?? 0);
    const currentDue = round2(Math.max(0, grandTotal - currentPaid));
    const appliedAmount = round2(Math.min(Math.max(0, Number(amount) || 0), currentDue));

    // If balance is already Rs. 0 (e.g., Free Service Rs. 0 invoice or settled bill still stuck on Unpaid), normalize to Paid
    if (appliedAmount <= 0 && currentDue > 0.01) return;

    const newPaid = round2(currentPaid + appliedAmount);
    const newBalance = round2(Math.max(0, grandTotal - newPaid));
    const newStatus: Invoice['status'] = newBalance <= 0.01 ? 'Paid' : 'Partially Paid';
    const nowIso = new Date().toISOString();

    const newPaymentRecord = appliedAmount > 0
      ? {
          id: generateUniqueId('PAY'),
          method: method as any,
          amount: appliedAmount,
          referenceNumber: ref || generateUniqueId('RCPT'),
          date: nowIso
        }
      : null;

    const updatedInv: Invoice = {
      ...inv,
      paidAmount: newPaid,
      amountPaid: newPaid,
      balanceDue: newBalance <= 0.01 ? 0 : newBalance,
      status: newStatus,
      paymentStatus: newStatus,
      paymentMethod: method,
      paymentReference: ref || newPaymentRecord?.referenceNumber || inv.paymentReference,
      payments: newPaymentRecord ? [...(inv.payments || []), newPaymentRecord] : (inv.payments || [])
    };

    const updatedInvoices = db.invoices.map(i => i.id === updatedInv.id ? updatedInv : i);

    // Sync corresponding Gate Pass payment status
    const updatedGatePasses = (db.gatePasses || []).map(gp =>
      gp.invoiceId === updatedInv.id || gp.invoiceNumber === updatedInv.invoiceNumber
        ? { ...gp, paymentStatus: newStatus }
        : gp
    );

    // Post balanced Double-Entry Receipt Voucher only when cash/bank movement > 0
    const payJv = appliedAmount > 0
      ? buildPaymentJournalEntry(
          updatedInv,
          appliedAmount,
          method,
          newPaymentRecord?.referenceNumber || `RCPT-${Date.now().toString().slice(-5)}`,
          nowIso.slice(0, 10),
          (db.journalEntries || []).length
        )
      : null;
    const updatedJournalEntries = payJv ? [payJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = payJv ? applyJournalEntryToAccounts(db.glAccounts || [], payJv) : (db.glAccounts || []);

    // Update customer lastVisit only (totalSpent was already aggregated on invoice generation — prevents double counting!)
    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === inv.customerId || c.name.trim().toLowerCase() === inv.customerName.trim().toLowerCase()) {
        return {
          ...c,
          lastVisit: nowIso.slice(0, 10)
        };
      }
      return c;
    });

    // Keep Job Card invoiceHistory status synchronized when invoice is paid
    const updatedJobCards = (db.jobCards || []).map((jc) => {
      if (jc.id !== updatedInv.jobCardId && jc.jobCardNumber !== updatedInv.jobCardNumber) return jc;
      if (!jc.invoiceHistory || jc.invoiceHistory.length === 0) return jc;
      return {
        ...jc,
        invoiceHistory: jc.invoiceHistory.map((h) =>
          h.invoiceId === updatedInv.id || h.invoiceNumber === updatedInv.invoiceNumber
            ? { ...h, status: newStatus }
            : h
        ),
      };
    });

    updateDb({
      invoices: updatedInvoices,
      jobCards: updatedJobCards,
      gatePasses: updatedGatePasses,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  // Issue an IRD-compliant Credit Note (VAT Rule 20 Sales Adjustment / Return)
  const handleCreateCreditNote = (
    originalInv: Invoice,
    refundTaxable: number,
    reason: string,
    refundMethod: NepalPaymentMethod
  ) => {
    const cleanTaxable = round2(Math.max(0, refundTaxable));
    if (cleanTaxable <= 0) return;

    const vatAmount = round2(cleanTaxable * 0.13);
    const grandTotal = round2(cleanTaxable + vatAmount);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const fy = getNepalFiscalYear(todayStr) || db.profile.fiscalYear || '2083/84';
    const cnNumber = getNextSequentialDocNumber(
      (db.invoices || []).map((i) => i.invoiceNumber),
      'CN',
      fy
    );

    // If original invoice had paid amount, treat refund as settled via selected payment mode; otherwise adjust AR
    const refundViaCash = (originalInv.paidAmount ?? 0) > 0;

    const creditNote: Invoice = {
      id: generateUniqueId('CN'),
      invoiceNumber: cnNumber,
      fiscalYear: fy,
      jobCardId: originalInv.jobCardId || 'JC-CN',
      jobCardNumber: originalInv.jobCardNumber || 'TAX-ADJ',
      originalInvoiceId: originalInv.id,
      originalInvoiceNumber: originalInv.invoiceNumber,
      creditNoteReason: reason,
      customerId: originalInv.customerId,
      customerName: originalInv.customerName,
      customerPhone: originalInv.customerPhone,
      customerPan: originalInv.customerPan,
      customerPanVat: originalInv.customerPanVat || originalInv.customerPan,
      customerAddress: originalInv.customerAddress,
      billedToType: originalInv.billedToType,
      companyName: originalInv.companyName,
      companyAddress: originalInv.companyAddress,
      companyPhone: originalInv.companyPhone,
      vehicleReg: originalInv.vehicleReg,
      vehicleBrand: originalInv.vehicleBrand,
      vehicleModel: `Credit Note vs ${originalInv.invoiceNumber}`,
      type: 'Credit Note',
      date: todayStr,
      bsDate: toNepalBsDate(todayStr),
      createdAt: now.toISOString(),
      subTotal: -cleanTaxable,
      taxableAmount: -cleanTaxable,
      totalTaxableAmount: -cleanTaxable,
      vatRate: 13,
      vatAmount: -vatAmount,
      totalVatAmount: -vatAmount,
      grandTotal: -grandTotal,
      paidAmount: refundViaCash ? -grandTotal : 0,
      amountPaid: refundViaCash ? -grandTotal : 0,
      balanceDue: 0,
      status: 'Paid',
      paymentStatus: 'Paid',
      paymentMethod: refundMethod,
      paymentReference: `CN-REF-${originalInv.invoiceNumber}`,
      isLocked: true,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: now.toISOString(),
        cbmsAckNumber: generateUniqueId('CBMS-CN'),
        fiscalYear: fy
      },
      items: [
        {
          id: generateUniqueId('CN-ITEM'),
          itemType: 'Part',
          description: `Credit Note Adjustment (${originalInv.invoiceNumber}): ${reason}`,
          hsnSacCode: '998714',
          quantity: 1,
          unitPrice: -cleanTaxable,
          taxableAmount: -cleanTaxable,
          vatRate: 13,
          vatAmount: -vatAmount,
          totalAmount: -grandTotal
        }
      ],
      payments: refundViaCash
        ? [
            {
              id: generateUniqueId('PAY-CN'),
              method: refundMethod as any,
              amount: -grandTotal,
              referenceNumber: cnNumber,
              date: now.toISOString()
            }
          ]
        : []
    };

    const cnJv = buildCreditNoteJournalEntry(creditNote, refundViaCash, (db.journalEntries || []).length);
    const updatedJournalEntries = cnJv ? [cnJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cnJv ? applyJournalEntryToAccounts(db.glAccounts || [], cnJv) : (db.glAccounts || []);

    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === originalInv.customerId || c.name.trim().toLowerCase() === originalInv.customerName.trim().toLowerCase()) {
        return {
          ...c,
          totalSpent: Math.max(0, round2((c.totalSpent || 0) - grandTotal))
        };
      }
      return c;
    });

    updateDb({
      invoices: [creditNote, ...(db.invoices || [])],
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
    setPrintInvoice(creditNote);
  };

  // --- INVENTORY HANDLERS ---
  const handleAddPart = (newPart: SparePart) => {
    const updated = [newPart, ...(db.parts || [])];
    updateDb({ parts: updated });
  };

  const handleUpdatePart = (updatedPart: SparePart) => {
    const updated = (db.parts || []).map(p => p.id === updatedPart.id ? updatedPart : p);
    updateDb({ parts: updated });
  };

  const handleCreatePurchaseOrder = (newPO: PurchaseOrder) => {
    // Inventory rule: Creating a PO does NOT increase stock. Stock increases ONLY upon receipt.
    const updatedPOs = [newPO, ...(db.purchaseOrders || [])];
    updateDb({ purchaseOrders: updatedPOs });
  };

  const handleUpdatePurchaseOrder = (updatedPO: PurchaseOrder) => {
    const updatedPOs = (db.purchaseOrders || []).map(po => po.id === updatedPO.id ? updatedPO : po);
    updateDb({ purchaseOrders: updatedPOs });
  };

  const handleReceivePurchaseOrder = (receivedPO: PurchaseOrder) => {
    // Rule: Stock increases ONLY when spare parts are marked as received.
    const updatedPO: PurchaseOrder = {
      ...receivedPO,
      status: 'Received',
      updatedAt: new Date().toISOString()
    };

    const updatedPOs = (db.purchaseOrders || []).map(po => po.id === updatedPO.id ? updatedPO : po);
    if (!updatedPOs.some(po => po.id === updatedPO.id)) {
      updatedPOs.unshift(updatedPO);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedParts = (db.parts || []).map(p => {
      const match = updatedPO.items.find(item => item.partId === p.id || item.partNumber === p.partNumber || item.partNumber === p.sku);
      if (match) {
        const qty = match.orderedQuantity || match.quantity || 1;
        const newStock = (p.currentStock || 0) + qty;
        const purchaseHistory = [
          ...(p.purchaseHistory || []),
          {
            date: todayStr,
            poNumber: updatedPO.poNumber,
            supplier: updatedPO.supplierName,
            quantity: qty,
            unitCost: match.unitCost || match.unitPrice || p.purchasePrice
          }
        ];
        const stockMovements = [
          ...(p.stockMovements || []),
          {
            id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            date: todayStr,
            type: 'IN' as const,
            quantity: qty,
            reference: `PO Received: ${updatedPO.poNumber}`,
            currentStockAfter: newStock
          }
        ];
        return {
          ...p,
          currentStock: newStock,
          purchasePrice: match.unitCost || match.unitPrice || p.purchasePrice,
          purchaseHistory,
          stockMovements
        };
      }
      return p;
    });

    // Check if any items in the PO were new and not in parts list
    const existingPartIds = new Set(updatedParts.map(p => p.id));
    const existingPartNumbers = new Set(updatedParts.map(p => p.partNumber));
    updatedPO.items.forEach(item => {
      const matchFound = updatedParts.some(p => p.id === item.partId || p.partNumber === item.partNumber || p.sku === item.partNumber);
      if (!matchFound) {
        const qty = item.orderedQuantity || item.quantity || 1;
        const unitCost = item.unitCost || item.unitPrice || 0;
        const newPart: any = {
          id: item.partId || `PART-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sku: item.partNumber || `SKU-${Date.now().toString().slice(-4)}`,
          partNumber: item.partNumber || 'OEM-PART',
          oemNumber: item.partNumber || 'OEM-PART',
          name: item.partName,
          category: 'Filters & Fluids',
          compatibleModels: ['All Vehicles'],
          rackLocation: 'Rack-A-01',
          barcode: `890${Date.now().toString().slice(-9)}`,
          costPrice: unitCost,
          sellingPrice: Math.round(unitCost * 1.3),
          vatRate: 13,
          hsnSacCode: '8708',
          currentStock: qty,
          minReorderLevel: 2,
          maxStockLevel: 20,
          safetyStock: 1,
          monthlyConsumption: 2,
          unit: 'pcs',
          fmsClass: 'Fast',
          abcClass: 'B',
          substitutePartIds: [],
          leadTimeDays: 3,
          lastRestockedDate: todayStr,
          preferredVendor: updatedPO.supplierName,
          purchaseHistory: [
            {
              date: todayStr,
              poNumber: updatedPO.poNumber,
              supplier: updatedPO.supplierName,
              quantity: qty,
              unitCost
            }
          ],
          stockMovements: [
            {
              id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              date: todayStr,
              type: 'IN' as const,
              quantity: qty,
              reference: `PO Received: ${updatedPO.poNumber}`,
              currentStockAfter: qty
            }
          ]
        };
        updatedParts.push(newPart);
      }
    });

    // Post balanced GRN Purchase Voucher (Dr Inventory 1200 + Dr Input VAT 1250 / Cr Accounts Payable 2010)
    const alreadyReceived = (db.purchaseOrders || []).some(
      po => po.id === updatedPO.id && po.status === 'Received'
    );
    const poJv = !alreadyReceived
      ? buildPurchaseReceiptJournalEntry(updatedPO, (db.journalEntries || []).length)
      : null;
    const updatedJournalEntries = poJv ? [poJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = poJv ? applyJournalEntryToAccounts(db.glAccounts || [], poJv) : (db.glAccounts || []);

    updateDb({
      purchaseOrders: updatedPOs,
      parts: updatedParts,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  const handleCreateQuotation = (quotation: PartsQuotation) => {
    const updated = [quotation, ...(db.partsQuotations || [])];
    updateDb({ partsQuotations: updated });
  };

  const buildOtcTaxInvoiceAndRecords = (order: PartsSalesOrder, existingInvoices: Invoice[], existingGatePasses: GatePass[]) => {
    const otcDate = order.date || new Date().toISOString().slice(0, 10);
    const otcFy = getNepalFiscalYear(otcDate) || db.profile.fiscalYear || '2083/84';
    const now = new Date();
    const nowIso = now.toISOString();

    const otcCb = order.companyBilling;
    const isOtcCompany = Boolean(otcCb?.isCompanyBill && otcCb.companyName?.trim());
    const otcInvoiceNumber = getNextSequentialDocNumber(
      existingInvoices.map((i) => i.invoiceNumber),
      'OTC',
      otcFy
    );
    const isOtcPaid = order.paymentStatus !== 'Unpaid' && order.dispatchStatus === 'Fully Dispatched';
    const resolvedMethod: NepalPaymentMethod = order.paymentMethod || 'Cash';
    const matchedCustomer = (db.customers || []).find((c) => c.id === order.customerId);
    const resolvedPhone = isOtcCompany
      ? otcCb!.phone.trim()
      : order.customerPhone?.trim() || matchedCustomer?.phone || 'N/A';

    const otcInvoice: Invoice = {
      id: generateUniqueId('INV-OTC'),
      invoiceNumber: otcInvoiceNumber,
      fiscalYear: otcFy,
      jobCardId: 'JC-OTC',
      jobCardNumber: order.orderNumber,
      salesOrderId: order.id,
      salesOrderNumber: order.orderNumber,
      customerId: order.customerId !== 'walkin' ? order.customerId : undefined,
      customerName: isOtcCompany ? otcCb!.companyName.trim() : order.customerName,
      customerPhone: resolvedPhone,
      customerAddress: isOtcCompany ? otcCb!.address.trim() : matchedCustomer?.address,
      customerPan: isOtcCompany ? otcCb!.panVatNumber.trim() : matchedCustomer?.panVatNumber || matchedCustomer?.panNumber,
      customerPanVat: isOtcCompany ? otcCb!.panVatNumber.trim() : matchedCustomer?.panVatNumber || matchedCustomer?.panNumber,
      billedToType: isOtcCompany ? 'Company' : 'Individual',
      companyName: isOtcCompany ? otcCb!.companyName.trim() : undefined,
      companyAddress: isOtcCompany ? otcCb!.address.trim() : undefined,
      companyPhone: isOtcCompany ? otcCb!.phone.trim() : undefined,
      buyerContactPerson: order.customerName,
      vehicleReg: 'OTC-WALKIN',
      vehicleModel: 'Over-the-Counter Spares Sale',
      type: 'Tax Invoice',
      date: otcDate,
      createdAt: nowIso,
      bsDate: toNepalBsDate(otcDate),
      isLocked: true,
      items: order.items.map((item, idx) => {
        const lineTaxable = round2(item.total ?? (item.quantity * item.unitPrice - (item.discount || 0)));
        const lineVat = round2(lineTaxable * 0.13);
        const catalogPart = (db.parts || []).find((p) => p.id === item.partId || p.sku === item.sku);
        return {
          id: generateUniqueId(`OTC-ITEM-${idx}`),
          itemType: 'Part' as const,
          type: 'Part' as const,
          description: `${item.partName}${item.sku ? ` [${item.sku}]` : ''}`,
          hsnSacCode: catalogPart?.hsnSacCode || '87082900',
          quantity: item.quantity,
          unitPrice: round2(item.unitPrice),
          taxableAmount: lineTaxable,
          vatRate: 13,
          vatAmount: lineVat,
          totalAmount: round2(lineTaxable + lineVat)
        };
      }),
      subTotal: round2(order.grossSubtotal ?? order.subtotal),
      discountType: (order.discountAmount ?? 0) > 0 ? order.discountType : undefined,
      discountValue: (order.discountAmount ?? 0) > 0 ? (order.discountValue ?? 0) : 0,
      discountTotal: round2(order.discountAmount ?? 0),
      totalDiscount: round2(order.discountAmount ?? 0),
      taxableAmount: round2(order.subtotal),
      totalTaxableAmount: round2(order.subtotal),
      partsTaxableAmount: round2(order.subtotal),
      partsVatAmount: round2(order.vatAmount),
      laborTaxableAmount: 0,
      laborVatAmount: 0,
      vatRate: 13,
      vatAmount: round2(order.vatAmount),
      totalVatAmount: round2(order.vatAmount),
      grandTotal: round2(order.grandTotal),
      paidAmount: isOtcPaid ? round2(order.grandTotal) : 0,
      amountPaid: isOtcPaid ? round2(order.grandTotal) : 0,
      balanceDue: isOtcPaid ? 0 : round2(order.grandTotal),
      status: isOtcPaid ? 'Paid' : 'Unpaid',
      paymentStatus: isOtcPaid ? 'Paid' : 'Unpaid',
      paymentMethod: resolvedMethod,
      paymentReference: order.orderNumber,
      payments: isOtcPaid
        ? [
            {
              id: generateUniqueId('PAY-OTC'),
              method: resolvedMethod as any,
              amount: round2(order.grandTotal),
              referenceNumber: order.orderNumber,
              date: nowIso
            }
          ]
        : [],
      irdSyncDetails: {
        isSynced: true,
        syncedAt: nowIso,
        cbmsAckNumber: generateUniqueId('CBMS-OTC'),
        fiscalYear: otcFy
      }
    };

    const otcGatePass: GatePass = {
      id: generateUniqueId('GP'),
      passNumber: getNextSequentialDocNumber(
        existingGatePasses.map((g) => g.passNumber),
        'GP',
        otcFy
      ),
      invoiceId: otcInvoice.id,
      invoiceNumber: otcInvoice.invoiceNumber,
      jobCardNumber: order.orderNumber,
      vehicleReg: 'OTC-WALKIN',
      vehicleMake: 'Over-The-Counter',
      vehicleModel: 'Direct Spares Sale',
      odometerReading: 0,
      customerName: otcInvoice.customerName,
      customerPhone: otcInvoice.customerPhone,
      issueDate: otcDate,
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Store Incharge',
      securityOfficerName: 'Main Store Gate',
      status: 'Cleared for Exit',
      totalInvoiceAmount: otcInvoice.grandTotal,
      paymentStatus: otcInvoice.status
    };

    const linkedOrder: PartsSalesOrder = {
      ...order,
      invoiceId: otcInvoice.id,
      invoiceNumber: otcInvoice.invoiceNumber,
      invoiceStatus: 'Invoiced'
    };

    // Double-entry GL: Post Sales Revenue + 13% Output VAT JV, and if paid immediately, post Cash/Bank Settlement JV
    let nextEntries = [...(db.journalEntries || [])];
    let nextAccounts = [...(db.glAccounts || [])];

    const salesJv = buildInvoiceJournalEntry(otcInvoice, nextEntries.length);
    if (salesJv) {
      nextEntries = [salesJv, ...nextEntries];
      nextAccounts = applyJournalEntryToAccounts(nextAccounts, salesJv);
    }

    if (isOtcPaid && otcInvoice.grandTotal > 0) {
      const payJv = buildPaymentJournalEntry(
        otcInvoice,
        otcInvoice.grandTotal,
        resolvedMethod,
        order.orderNumber,
        otcDate,
        nextEntries.length
      );
      if (payJv) {
        nextEntries = [payJv, ...nextEntries];
        nextAccounts = applyJournalEntryToAccounts(nextAccounts, payJv);
      }
    }

    return { linkedOrder, otcInvoice, otcGatePass, nextEntries, nextAccounts };
  };

  const handleCreateSalesOrder = (order: PartsSalesOrder, deductStock: boolean = true) => {
    const otcDate = order.date || new Date().toISOString().slice(0, 10);

    // Deduct stock for immediate dispatch and append stock movement audit trail
    let updatedParts = db.parts || [];
    if (deductStock || order.dispatchStatus === 'Fully Dispatched') {
      updatedParts = (db.parts || []).map(p => {
        const orderItem = order.items.find(item => item.partId === p.id || item.sku === p.sku);
        if (orderItem) {
          const nextStock = Math.max(0, p.currentStock - orderItem.quantity);
          return {
            ...p,
            currentStock: nextStock,
            stockMovements: [
              ...(p.stockMovements || []),
              {
                id: generateUniqueId('SM'),
                date: otcDate,
                type: 'OUT' as const,
                quantity: orderItem.quantity,
                reference: `OTC Sale: ${order.orderNumber}`,
                currentStockAfter: nextStock
              }
            ]
          };
        }
        return p;
      });
    }

    // If converted from quotation, update quotation status
    let updatedQuotations = db.partsQuotations || [];
    if (order.quotationId) {
      updatedQuotations = (db.partsQuotations || []).map(q =>
        q.id === order.quotationId ? { ...q, status: 'Converted to Order' as const } : q
      );
    }

    const { linkedOrder, otcInvoice, otcGatePass, nextEntries, nextAccounts } =
      buildOtcTaxInvoiceAndRecords(order, db.invoices || [], db.gatePasses || []);

    const updatedOrders = [linkedOrder, ...(db.partsSalesOrders || [])];

    updateDb({
      partsSalesOrders: updatedOrders,
      parts: updatedParts,
      partsQuotations: updatedQuotations,
      invoices: [otcInvoice, ...(db.invoices || [])],
      gatePasses: [otcGatePass, ...(db.gatePasses || [])],
      journalEntries: nextEntries,
      glAccounts: nextAccounts
    });

    // Open printable A4 IRD Tax Invoice immediately for counter printing / PDF
    setPrintInvoice(otcInvoice);
  };

  const handleGenerateOtcInvoice = (order: PartsSalesOrder) => {
    // Check if an IRD Tax Invoice is already linked to this OTC sales order
    const existing = (db.invoices || []).find(
      (inv) =>
        (order.invoiceId && inv.id === order.invoiceId) ||
        (order.invoiceNumber && inv.invoiceNumber === order.invoiceNumber) ||
        inv.salesOrderId === order.id ||
        inv.salesOrderNumber === order.orderNumber ||
        inv.jobCardNumber === order.orderNumber ||
        inv.paymentReference === order.orderNumber
    );

    if (existing) {
      setPrintInvoice(existing);
      return;
    }

    const { linkedOrder, otcInvoice, otcGatePass, nextEntries, nextAccounts } =
      buildOtcTaxInvoiceAndRecords(order, db.invoices || [], db.gatePasses || []);

    const updatedOrders = (db.partsSalesOrders || []).map((o) =>
      o.id === order.id ? linkedOrder : o
    );

    updateDb({
      partsSalesOrders: updatedOrders,
      invoices: [otcInvoice, ...(db.invoices || [])],
      gatePasses: [otcGatePass, ...(db.gatePasses || [])],
      journalEntries: nextEntries,
      glAccounts: nextAccounts
    });

    setPrintInvoice(otcInvoice);
  };

  const handleDispatchOrder = (orderId: string, isPartial: boolean) => {
    const targetOrder = (db.partsSalesOrders || []).find(o => o.id === orderId);
    if (!targetOrder) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    
    const updatedParts = (db.parts || []).map(p => {
      const orderItem = targetOrder.items.find(item => item.partId === p.id || item.sku === p.sku);
      if (orderItem) {
        const nextStock = Math.max(0, p.currentStock - orderItem.quantity);
        return {
          ...p,
          currentStock: nextStock,
          stockMovements: [
            ...(p.stockMovements || []),
            {
              id: generateUniqueId('SM'),
              date: todayStr,
              type: 'OUT' as const,
              quantity: orderItem.quantity,
              reference: `OTC Dispatch: ${targetOrder.orderNumber}`,
              currentStockAfter: nextStock
            }
          ]
        };
      }
      return p;
    });

    const updatedOrders = (db.partsSalesOrders || []).map(o => 
      o.id === orderId 
        ? { 
            ...o, 
            dispatchStatus: isPartial ? ('Partially Dispatched' as const) : ('Fully Dispatched' as const),
            invoiceStatus: 'Invoiced' as const
          } 
        : o
    );

    updateDb({
      partsSalesOrders: updatedOrders,
      parts: updatedParts
    });
  };

  const handleAddJournalEntry = (newEntry: GLJournalEntry) => {
    const updatedEntries = [newEntry, ...(db.journalEntries || [])];
    const updatedAccounts = applyJournalEntryToAccounts(db.glAccounts || [], newEntry);

    updateDb({
      journalEntries: updatedEntries,
      glAccounts: updatedAccounts
    });
  };

  const handleAddGLAccount = (newAccount: GLAccount) => {
    const updatedAccounts = [...(db.glAccounts || []), newAccount];
    updateDb({ glAccounts: updatedAccounts });
  };

  const handleCreateSalesReturn = (returnData: PartsSalesReturn) => {
    const updatedReturns = [returnData, ...(db.partsSalesReturns || [])];

    // Re-stock inventory items: Add returned quantity back to stock
    const updatedParts = (db.parts || []).map(p => {
      const returnItem = returnData.items.find(item => item.partId === p.id || item.partName === p.name);
      if (returnItem) {
        return {
          ...p,
          currentStock: p.currentStock + returnItem.quantity
        };
      }
      return p;
    });

    // Update customer spending / credit if customer identified
    const matchingCustomer = (db.customers || []).find(c => 
      c.id === returnData.customerId || 
      c.name.toLowerCase().trim() === returnData.customerName.toLowerCase().trim()
    );

    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === returnData.customerId || c.name.toLowerCase().trim() === returnData.customerName.toLowerCase().trim()) {
        return {
          ...c,
          totalSpent: Math.max(0, (c.totalSpent || 0) - returnData.totalRefundAmount)
        };
      }
      return c;
    });

    // Update Sales Orders if return was logged against an order
    const updatedSalesOrders = (db.partsSalesOrders || []).map(o => {
      if (o.orderNumber === returnData.originalInvoiceNumber || o.id === returnData.originalInvoiceNumber) {
        return {
          ...o,
          dispatchStatus: 'Fully Dispatched' as const,
          invoiceStatus: 'Invoiced' as const
        };
      }
      return o;
    });

    // Create Credit Note Invoice entry in invoices
    const creditNoteInvoice: Invoice = {
      id: `CN-${returnData.id}`,
      invoiceNumber: returnData.creditNoteNumber,
      fiscalYear: db.profile.fiscalYear || '2081/82',
      jobCardId: 'JC-RETURN',
      jobCardNumber: 'SALES-RETURN',
      customerName: returnData.customerName,
      customerPhone: matchingCustomer?.phone || '+977-9800000000',
      vehicleReg: 'SALES-RETURN',
      vehicleModel: `Credit Note for ${returnData.originalInvoiceNumber}`,
      type: 'Credit Note',
      date: returnData.date || new Date().toISOString().slice(0, 10),
      isLocked: true,
      items: returnData.items.map((item, idx) => ({
        id: `CN-ITEM-${idx}`,
        itemType: 'Part' as const,
        description: `Credit Note / Restock: ${item.partName}`,
        hsnSacCode: '87082900',
        quantity: item.quantity,
        unitPrice: -item.unitPrice,
        taxableAmount: -item.quantity * item.unitPrice,
        vatRate: 13,
        vatAmount: -Math.round(item.quantity * item.unitPrice * 0.13),
        totalAmount: -Math.round(item.quantity * item.unitPrice * 1.13)
      })),
      subTotal: -Math.round(returnData.totalRefundAmount / 1.13),
      taxableAmount: -Math.round(returnData.totalRefundAmount / 1.13),
      vatRate: 13,
      vatAmount: -(returnData.totalRefundAmount - Math.round(returnData.totalRefundAmount / 1.13)),
      grandTotal: -returnData.totalRefundAmount,
      paidAmount: -returnData.totalRefundAmount,
      balanceDue: 0,
      status: 'Paid',
      paymentMethod: 'Cash',
      irdSyncDetails: {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        cbmsAckNumber: `CBMS-CN-${Date.now().toString().slice(-6)}`,
        fiscalYear: db.profile.fiscalYear
      }
    };

    const cnJv = buildCreditNoteJournalEntry(creditNoteInvoice, true, (db.journalEntries || []).length);
    const updatedJournalEntries = cnJv ? [cnJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cnJv ? applyJournalEntryToAccounts(db.glAccounts || [], cnJv) : (db.glAccounts || []);

    updateDb({
      partsSalesReturns: updatedReturns,
      parts: updatedParts,
      customers: updatedCustomers,
      partsSalesOrders: updatedSalesOrders,
      invoices: [creditNoteInvoice, ...(db.invoices || [])],
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  // --- CASHIER DAYBOOK VOUCHER HANDLER (CASH IN / CASH OUT + AUTO DOUBLE-ENTRY GL) ---
  const handleAddCashierVoucher = (voucher: CashierVoucher) => {
    const updatedVouchers = [voucher, ...(db.cashierVouchers || [])];
    const cbJv = buildCashierVoucherJournalEntry(voucher, (db.journalEntries || []).length);
    const updatedJournalEntries = cbJv ? [cbJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cbJv ? applyJournalEntryToAccounts(db.glAccounts || [], cbJv) : (db.glAccounts || []);

    updateDb({
      cashierVouchers: updatedVouchers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts,
    });
  };

  // --- CUSTOMER HANDLERS ---
  const handleAddCustomer = (customer: Customer) => {
    const updated = [customer, ...(db.customers || [])];
    updateDb({ customers: updated });
  };

  const handleUpdateCustomer = (customer: Customer) => {
    const updated = (db.customers || []).map(c => c.id === customer.id ? customer : c);
    updateDb({ customers: updated });
  };

  // --- WARRANTY HANDLERS ---
  const handleAddWarrantyRecord = (record: WarrantyRecord) => {
    const updated = [record, ...(db.warrantyRecords || [])];
    updateDb({ warrantyRecords: updated });
  };

  const handleAddWarrantyClaim = (claim: WarrantyClaim) => {
    const updated = [claim, ...(db.warrantyClaims || [])];
    updateDb({ warrantyClaims: updated });
  };

  const handleUpdateWarrantyClaim = (claim: WarrantyClaim) => {
    const updated = (db.warrantyClaims || []).map(w => w.id === claim.id ? claim : w);
    updateDb({ warrantyClaims: updated });
  };

  // --- ADMIN MASTER DATA HANDLERS ---
  const handleUpdateProfile = (profile: WorkshopProfile) => {
    updateDb({ profile });
    if (activeTenantRef.current) {
      const targetSub = activeTenantRef.current.subdomain;
      const updatedTenant: TenantRecord = {
        ...activeTenantRef.current,
        companyName: profile.name || activeTenantRef.current.companyName,
        panVatNumber: profile.panVatNumber || activeTenantRef.current.panVatNumber,
        city: profile.city || activeTenantRef.current.city,
        address: profile.address || activeTenantRef.current.address,
        contactNumber: profile.contactNumber || activeTenantRef.current.contactNumber,
        fiscalYear: profile.fiscalYear || activeTenantRef.current.fiscalYear,
      };
      activeTenantRef.current = updatedTenant;
      setActiveTenant(updatedTenant);
      setAllTenants((prev) => prev.map((t) => (t.subdomain === targetSub ? updatedTenant : t)));
      void apiClient
        .updateTenantAsDeveloper(targetSub, {
          companyName: updatedTenant.companyName,
          panVatNumber: updatedTenant.panVatNumber,
          city: updatedTenant.city,
          address: updatedTenant.address,
          contactNumber: updatedTenant.contactNumber,
          fiscalYear: updatedTenant.fiscalYear,
        })
        .catch(() => {});
    }
  };

  const handleUpdateUsers = (users: UserAccount[]) => {
    if (currentUser?.role !== 'Admin') return;
    const updatedCurrent = users.find((u) => u.id === currentUser.id) || currentUser;
    updateDb({ users, currentUser: updatedCurrent });
  };

  const handleUpdateTechnicians = (technicians: Technician[]) => {
    updateDb({ technicians });
  };

  const handleUpdateServicePriceList = (servicePriceList: ServicePriceItem[]) => {
    updateDb({ servicePriceList });
  };

  const handleUpdateBays = (bays: BayArea[]) => {
    updateDb({ bays });
  };

  // --- CLOUD SYNC & RESTORE ---
  const handleSyncCloud = async () => {
    const effectiveOwnerUid = activeWorkspaceOwnerUid || firebaseUser?.uid;
    if (firebaseUser?.uid && firebaseUser.emailVerified && effectiveOwnerUid) {
      const syncRes = await firestoreSync.syncDatabaseDiff(
        effectiveOwnerUid,
        storage.getDatabase(),
        { allowDeletes: true, forceAll: true }
      );
      storage.saveDatabase({
        lastCloudSync: syncRes.timestamp,
        isCloudSynced: true,
      });
      setDb(storage.getDatabase());
      return { success: true, timestamp: syncRes.timestamp };
    }
    const res = await storage.syncCloud();
    setDb(storage.getDatabase());
    return res;
  };

  const handleResetDemo = () => {
    const effectiveOwnerUid = activeWorkspaceOwnerUid || firebaseUser?.uid;
    storage.resetToDemo();
    if (firebaseUser) {
      storage.bindAuthenticatedUser(firebaseUser.email, firebaseUser.displayName);
      const next = storage.getDatabase();
      setDb(next);
      if (firebaseUser.emailVerified && effectiveOwnerUid) {
        scheduleCloudSync(effectiveOwnerUid, true);
      }
    } else if (isDemoMode) {
      const t = activeTenantRef.current;
      storage.bindAuthenticatedUser(
        t?.adminEmail || `demo@${APP_ROOT_DOMAIN}`,
        t ? `${t.companyName} Admin` : 'Workshop Admin'
      );
      const next = storage.getDatabase();
      if (t) {
        saveDemoTenantWorkspaceSnapshot(t.subdomain, next);
      }
      setDb(next);
    } else {
      setDb(storage.getDatabase());
    }
  };

  const handleImportBackup = (json: string) => {
    const effectiveOwnerUid = activeWorkspaceOwnerUid || firebaseUser?.uid;
    const ok = storage.importBackupJson(json);
    if (ok) {
      if (firebaseUser) {
        storage.bindAuthenticatedUser(firebaseUser.email, firebaseUser.displayName);
        if (firebaseUser.emailVerified && effectiveOwnerUid) {
          scheduleCloudSync(effectiveOwnerUid, true);
        }
      }
      setDb(storage.getDatabase());
    }
    return ok;
  };

  if (!authReady || isCloudHydrating) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 font-sans text-[#0F172A]">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] px-8 py-7 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0F3D5E] text-white flex items-center justify-center mx-auto shadow-sm">
            <Wrench className="w-5 h-5 text-[#0EA5E9]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight">AutoCraft Pro</h2>
            <p className="text-xs text-[#64748B]">
              {isCloudHydrating ? 'Loading your workshop workspace...' : 'Verifying session...'}
            </p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-[#0EA5E9] mx-auto" />
        </div>
      </div>
    );
  }

  // Surface 1: Full-Fledged Public Website (autocraftpro.com.np)
  if (surfaceMode === 'public_site') {
    return (
      <PublicWebsite
        onOpenWorkspaceLogin={(hint) => {
          setAuthError(null);
          setWorkspaceCompanyHint(hint || '');
          setSurfaceMode('workspace_login');
        }}
        onOpenDeveloperLogin={() => {
          setAuthError(null);
          setSurfaceMode('developer_login');
        }}
      />
    );
  }

  // Surface 2 & 3 Login Pages: Strictly Separated Workspace Login vs Developer Login
  if (surfaceMode === 'workspace_login' || surfaceMode === 'developer_login') {
    return (
      <AuthScreen
        mode={surfaceMode === 'workspace_login' ? 'workspace' : 'developer'}
        authError={authError}
        initialCompanyHint={workspaceCompanyHint}
        onBackToWebsite={() => {
          setAuthError(null);
          clearBrowserPortalParams();
          setSurfaceMode('public_site');
        }}
        onSwitchMode={(nextMode) => {
          setAuthError(null);
          setSurfaceMode(nextMode === 'workspace' ? 'workspace_login' : 'developer_login');
        }}
        onWorkspaceSignIn={handleWorkspaceSignIn}
        onDeveloperEmailSignIn={handleDeveloperEmailSignIn}
        onDeveloperGoogleSignIn={handleDeveloperGoogleSignIn}
        onEnterWorkspaceDemo={handleEnterWorkspaceDemo}
        onEnterDeveloperDemo={handleEnterDeveloperDemo}
      />
    );
  }

  // Surface 2 (Authenticated): Standalone Developer Portal (Completely Separate from Workshop Workspace)
  if (surfaceMode === 'developer_portal') {
    return (
      <DeveloperConsole
        developerEmail={developerIdentity.email}
        developerName={developerIdentity.name}
        isDemoMode={isDemoMode}
        tenants={allTenants}
        onTenantsChange={setAllTenants}
        onOpenTenantSignIn={handleOpenTenantSignInFromDevPortal}
        onGoToPublicWebsite={handleLogout}
        onLogout={handleLogout}
      />
    );
  }

  // Surface 3 (Authenticated): Isolated Tenant Workshop Workspace (<company>.autocraftpro.com.np)
  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans">
      {/* Fixed Responsive Left Sidebar (Pure Tenant Workshop ERP — Zero Developer Controls) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileNavOpen(false);
        }}
        userRole={currentUser.role}
        activeTenant={activeTenant}
        badges={{
          lowStockCount,
          activeJobCardsCount,
          unpaidInvoicesCount,
          pendingWarrantyCount
        }}
        profile={db.profile}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isCloudSynced={db.isCloudSynced}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main Content Area (Offset on desktop screens by fixed left sidebar) */}
      <div id="app-main-shell" className="lg:pl-64 xl:pl-72 flex flex-col min-h-screen transition-[padding] duration-200">
        {/* Top Universal Navbar (Shows Company Name, <company>.autocraftpro.com.np, FY & PAN/VAT strictly post-login) */}
        <Navbar
          profile={db.profile}
          activeTenant={activeTenant}
          currentUser={currentUser}
          users={db.users}
          readyNotifications={db.readyNotifications || []}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          isCloudSynced={db.isCloudSynced}
          lastSyncTime={db.lastCloudSync}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          isMobileMenuOpen={isMobileNavOpen}
          activeTab={activeTab}
        />

        {/* View Routing */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 pb-20 md:pb-12">
          {/* TAB 1: Workshop Dashboard */}
          {activeTab === 'dashboard' && (
            <WorkshopOverview
              jobCards={db.jobCards}
              appointments={db.appointments}
              parts={db.parts}
              invoices={db.invoices}
              technicians={db.technicians}
              warrantyClaims={db.warrantyClaims}
              profile={db.profile}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectJobCard={(jc) => {
                setPendingOpenJobCardRef({
                  jobCardId: jc.id,
                  jobCardNumber: jc.jobCardNumber,
                  nonce: Date.now(),
                });
                setActiveTab('jobcards');
              }}
              onNewIntake={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 2: Spares Inventory (ABC/FMS, Barcode, Reorder, OTC, Returns) */}
          {activeTab === 'inventory' && (
            <InventoryManagement
              parts={db.parts || []}
              customers={db.customers || []}
              quotations={db.partsQuotations || []}
              salesOrders={db.partsSalesOrders || []}
              salesReturns={db.partsSalesReturns || []}
              purchaseOrders={db.purchaseOrders || []}
              invoices={db.invoices || []}
              profile={db.profile}
              userRole={currentUser.role}
              onAddPart={handleAddPart}
              onUpdatePart={handleUpdatePart}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onReceivePurchaseOrder={handleReceivePurchaseOrder}
              onCreateQuotation={handleCreateQuotation}
              onCreateSalesOrder={handleCreateSalesOrder}
              onDispatchOrder={handleDispatchOrder}
              onCreateSalesReturn={handleCreateSalesReturn}
              onViewJobCard={(jobCardNumber, jobCardId) => {
                setPendingOpenJobCardRef({
                  jobCardId,
                  jobCardNumber,
                  nonce: Date.now(),
                });
                setActiveTab('jobcards');
              }}
              onViewInvoice={(inv) => setPrintInvoice(inv)}
              onGenerateOtcInvoice={handleGenerateOtcInvoice}
            />
          )}

          {/* TAB 3: Job Card Management & Bays (Locked & Immutable) */}
          {activeTab === 'jobcards' && (
            <JobCardManagement
              jobCards={db.jobCards}
              appointments={db.appointments}
              customers={db.customers}
              technicians={db.technicians}
              availableParts={db.parts}
              servicePrices={db.servicePriceBook || db.servicePriceList || []}
              bays={db.bays}
              invoices={db.invoices}
              gatePasses={db.gatePasses || []}
              currentUser={currentUser}
              profile={db.profile}
              onCreateJobCard={handleCreateJobCard}
              onUpdateJobCard={handleUpdateJobCard}
              onUpdatePart={handleUpdatePart}
              onUpdateBay={(bay) => updateDb({ bays: (db.bays || []).map(b => b.id === bay.id ? bay : b) })}
              onCreateAppointment={handleCreateAppointment}
              onConvertToInvoice={handleConvertJobCardToInvoice}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewInvoice={(invoice) => {
                setActiveTab('billing');
                setPrintInvoice(invoice);
              }}
              onCreateQuotation={handleCreateQuotation}
              onCreateCreditNote={handleCreateCreditNote}
              onTriggerReadyNotification={handleTriggerReadyNotification}
              openIntakeTrigger={quickIntakeTrigger}
              initialOpenJobCardRef={pendingOpenJobCardRef}
              onConsumeInitialOpenJobCard={() => setPendingOpenJobCardRef(null)}
            />
          )}

          {/* TAB 4: Billing & Invoicing (Fonepay, NepalPay, 13% VAT) */}
          {activeTab === 'billing' && (
            <BillingManagement
              invoices={db.invoices}
              jobCards={db.jobCards}
              customers={db.customers}
              availableParts={db.parts}
              cashierVouchers={db.cashierVouchers || []}
              userRole={currentUser.role}
              gatePasses={db.gatePasses || []}
              profile={db.profile}
              currentUserName={currentUser.name}
              onCreateInvoice={handleCreateInvoice}
              onConvertJobCardToInvoice={handleConvertJobCardToInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onApplyInvoiceDiscount={handleApplyInvoiceDiscount}
              onRecordPayment={handleRecordPayment}
              onCreateCreditNote={handleCreateCreditNote}
              onAddCashierVoucher={handleAddCashierVoucher}
              onViewGatePass={(gp) => setPrintGatePass(gp)}
            />
          )}

          {/* TAB 5: Warranty Management & OEM Claims */}
          {activeTab === 'warranty' && (
            <WarrantyManagement
              warrantyRecords={db.warrantyRecords || []}
              warrantyClaims={db.warrantyClaims || []}
              jobCards={db.jobCards || []}
              customers={db.customers || []}
              userRole={currentUser.role}
              onAddWarrantyRecord={handleAddWarrantyRecord}
              onCreateWarrantyClaim={handleAddWarrantyClaim}
              onUpdateWarrantyClaim={handleUpdateWarrantyClaim}
            />
          )}

          {/* TAB 7: Customer Directory & Sales Reports */}
          {activeTab === 'customers' && (
            <CustomerManagement
              customers={db.customers}
              invoices={db.invoices}
              jobCards={db.jobCards}
              gatePasses={db.gatePasses || []}
              userRole={currentUser.role}
              profile={db.profile}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewJobCard={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 8: Complete Accounting, Nepal VAT & P&L */}
          {activeTab === 'accounting' && (
            <AccountingReports
              invoices={db.invoices || []}
              parts={db.parts || []}
              profile={db.profile}
              glAccounts={db.glAccounts || []}
              journalEntries={db.journalEntries || []}
              purchaseOrders={db.purchaseOrders || []}
              onAddJournalEntry={handleAddJournalEntry}
              onAddGLAccount={handleAddGLAccount}
              userRole={currentUser.role}
            />
          )}

          {/* TAB 8: BI & Performance Analytics */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              jobCards={db.jobCards || []}
              invoices={db.invoices || []}
              parts={db.parts || []}
              technicians={db.technicians || []}
              bays={db.bays || []}
              customers={db.customers || []}
              warrantyClaims={db.warrantyClaims || []}
              profile={db.profile}
              userRole={currentUser.role}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB 10: Admin Master Settings (Staff, Rates, Bays, IRD) */}
          {(activeTab === 'admin_settings' || activeTab === 'admin') && (
            <AdminMasterSettings
              profile={db.profile}
              users={db.users || []}
              customers={db.customers || []}
              parts={db.parts || []}
              priceBook={db.servicePriceBook || db.servicePriceList || []}
              bays={db.bays || []}
              technicians={db.technicians || []}
              userRole={currentUser.role}
              targetOwnerUid={activeWorkspaceOwnerUid || undefined}
              onSwitchUser={handleSwitchUser}
              onUpdateProfile={handleUpdateProfile}
              onUpdateUsers={handleUpdateUsers}
              onUpdateCustomers={(customers) => updateDb({ customers })}
              onUpdateParts={(parts) => updateDb({ parts })}
              onUpdatePriceBook={(priceBook) => updateDb({ servicePriceBook: priceBook, servicePriceList: priceBook })}
              onUpdateBays={handleUpdateBays}
              onUpdateTechnicians={handleUpdateTechnicians}
            />
          )}
        </main>
      </div>

      {/* Global Cloud Sync & Storage Management Modal */}
      {isCloudModalOpen && (
        <CloudSyncModal
          isSynced={db.isCloudSynced}
          lastSyncTime={db.lastCloudSync}
          onClose={() => setIsCloudModalOpen(false)}
          onSyncNow={handleSyncCloud}
          onResetDemo={handleResetDemo}
          onExportData={() => storage.exportBackupJson()}
          onImportData={handleImportBackup}
        />
      )}

      {/* Global Printable Nepal IRD Tax Invoice Modal (Live-Resolved with Integrated Gate Pass Footer) */}
      {(() => {
        const activePrintInvoice = printInvoice
          ? (db.invoices || []).find((i) => i.id === printInvoice.id) || printInvoice
          : null;
        if (!activePrintInvoice) return null;
        return (
          <PrintInvoiceModal
            invoice={activePrintInvoice}
            jobCard={(db.jobCards || []).find(
              jc => jc.id === activePrintInvoice.jobCardId || jc.jobCardNumber === activePrintInvoice.jobCardNumber
            )}
            gatePass={(db.gatePasses || []).find(
              gp => gp.invoiceId === activePrintInvoice.id || gp.invoiceNumber === activePrintInvoice.invoiceNumber
            )}
            profile={db.profile}
            onClose={() => setPrintInvoice(null)}
            onApplyDiscount={handleApplyInvoiceDiscount}
            onCreateCreditNote={handleCreateCreditNote}
          />
        );
      })()}

      {/* Keyboard Shortcuts Reference Dialog */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Global Printable Nepal Vehicle Gate Pass Modal */}
      {printGatePass && (
        <PrintGatePassModal
          gatePass={printGatePass}
          profile={db.profile}
          onClose={() => setPrintGatePass(null)}
          onMarkExited={(gatePassId) => {
            const updated = (db.gatePasses || []).map(gp => gp.id === gatePassId ? { ...gp, status: 'Exited' as const, exitTimestamp: new Date().toISOString() } : gp);
            updateDb({ gatePasses: updated });
            setPrintGatePass(prev => prev && prev.id === gatePassId ? { ...prev, status: 'Exited', exitTimestamp: new Date().toISOString() } : prev);
          }}
        />
      )}

      {/* Job Card Auto-Close / Admin Re-Open Confirmation Toast */}
      {lifecycleToast && (
        <div
          className={`fixed bottom-4 left-4 lg:left-[18.5rem] z-[60] max-w-md w-[calc(100%-2rem)] bg-white rounded-xl shadow-2xl border overflow-hidden ${
            lifecycleToast.variant === 'locked' ? 'border-amber-300' : 'border-emerald-300'
          }`}
        >
          <div
            className={`px-4 py-2.5 flex items-center justify-between text-white ${
              lifecycleToast.variant === 'locked' ? 'bg-[#0F3D5E]' : 'bg-[#16A34A]'
            }`}
          >
            <div className="flex items-center space-x-2">
              {lifecycleToast.variant === 'locked' ? (
                <Lock className="w-4 h-4 text-amber-300" />
              ) : (
                <Unlock className="w-4 h-4 text-white" />
              )}
              <span className="text-xs font-bold">{lifecycleToast.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setLifecycleToast(null)}
              className="text-white/75 hover:text-white p-0.5 rounded"
              aria-label="Close lifecycle notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-4 py-3 text-xs text-[#0F172A] leading-relaxed">
            {lifecycleToast.message}
          </div>
        </div>
      )}

      {/* Non-Blocking Vehicle Ready & Pickup SMS Notification Banner */}
      {activeReadyToast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-md w-[calc(100%-2rem)] bg-white border border-[#16A34A] rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-[#0F3D5E] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#0EA5E9]" />
              <span className="text-xs font-bold">Vehicle Ready for Pickup — SMS Alert</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveReadyToast(null)}
              className="text-slate-300 hover:text-white p-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#0F172A]">
                {activeReadyToast.vehicleReg} · {activeReadyToast.jobCardNumber}
              </span>
              <span className="text-[10px] font-mono text-[#0284C7] font-semibold">
                B.S. {activeReadyToast.bsDate}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">{activeReadyToast.message}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <a
                href={`sms:${(activeReadyToast.recipientPhone || '').replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(activeReadyToast.message)}`}
                className="px-3 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1.5 transition shadow-sm"
              >
                <Send className="w-3 h-3" />
                <span>SMS Customer ({activeReadyToast.recipientPhone})</span>
              </a>
              <a
                href={`https://wa.me/${(activeReadyToast.recipientPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(activeReadyToast.message)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition shadow-sm"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
