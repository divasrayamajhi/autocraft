import React, { useEffect, useState } from 'react';
import {
  LogIn,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  Building2,
  Globe,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { WorkshopProfile } from '../../types';
import { auth, googleProvider } from '../../firebase';
import {
  apiClient,
  beginOnboarding,
  endOnboarding,
  getActiveTenantSubdomain,
  isPreviewOrLocalHost,
  setActiveTenantSubdomain,
  TenantInfo,
} from '../../services/apiClient';

interface AuthScreenProps {
  workshopProfile: WorkshopProfile;
  authError?: string | null;
  onTenantRegistered?: (tenant: TenantInfo) => void;
}

type AuthTab = 'signin' | 'onboarding';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  workshopProfile,
  authError,
  onTenantRegistered,
}) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Tenant resolution state
  const [subdomainInput, setSubdomainInput] = useState<string>(() => getActiveTenantSubdomain());
  const [resolvedTenant, setResolvedTenant] = useState<TenantInfo | null>(null);
  const [tenantLookupError, setTenantLookupError] = useState<string | null>(null);

  // Sign-In Form State (Email/Password)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Company Onboarding State
  const [companyName, setCompanyName] = useState('');
  const [newSubdomain, setNewSubdomain] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const canSelectSubdomain = isPreviewOrLocalHost();

  useEffect(() => {
    let active = true;
    const target = subdomainInput.trim().toLowerCase() || 'lavish';
    setTenantLookupError(null);
    void apiClient
      .resolveTenant(target)
      .then((info) => {
        if (active) {
          setResolvedTenant(info);
          setActiveTenantSubdomain(info.subdomain);
        }
      })
      .catch((err) => {
        if (active) {
          setResolvedTenant(null);
          setTenantLookupError(err instanceof Error ? err.message : 'Tenant Not Found');
        }
      });
    return () => {
      active = false;
    };
  }, [subdomainInput]);

  const mapFirebaseAuthError = (err: unknown): string => {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Sign-in window was closed before completing authentication. Please try again.';
    }
    if (code === 'auth/popup-blocked') {
      return 'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Email/Password sign-in is not yet enabled in your Firebase Console (Authentication → Sign-in method). Enable it there or use Continue with Google.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email already has a Firebase account. Sign in first or use Continue with Google.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters long.';
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsBusy(true);
    try {
      setActiveTenantSubdomain(subdomainInput || 'lavish');
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your work email and password.');
      return;
    }
    setIsBusy(true);
    try {
      setActiveTenantSubdomain(subdomainInput || 'lavish');
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const completeTenantRegistration = async (preferredEmail?: string) => {
    const cleanSub = newSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const cleanCompany = companyName.trim();
    const res = await apiClient.registerTenant({
      companyName: cleanCompany,
      subdomain: cleanSub,
      email: preferredEmail,
    });
    setSubdomainInput(res.tenant.subdomain);
    setResolvedTenant(res.tenant);
    if (onTenantRegistered) {
      onTenantRegistered(res.tenant);
    }
    setInfoMessage(`Company "${res.tenant.companyName}" (${res.tenant.subdomain}.autocraftpro.com) provisioned.`);
  };

  const handleEmailOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanSub = newSubdomain.trim().toLowerCase();
    if (companyName.trim().length < 2) {
      setErrorMessage('Please enter your company or workshop name.');
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(cleanSub)) {
      setErrorMessage('Subdomain must use lowercase letters, digits, or internal hyphens (e.g., lavish).');
      return;
    }
    if (!ownerEmail.trim() || ownerPassword.length < 6) {
      setErrorMessage('Please enter an owner email and a password of at least 6 characters.');
      return;
    }

    setIsBusy(true);
    beginOnboarding();
    try {
      await createUserWithEmailAndPassword(auth, ownerEmail.trim(), ownerPassword);
      await completeTenantRegistration(ownerEmail.trim());
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
      await signOut(auth).catch(() => {});
    } finally {
      endOnboarding();
      setIsBusy(false);
    }
  };

  const handleGoogleOnboarding = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const cleanSub = newSubdomain.trim().toLowerCase();
    if (companyName.trim().length < 2) {
      setErrorMessage('Please enter your company name before onboarding with Google.');
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(cleanSub)) {
      setErrorMessage('Subdomain must use lowercase letters, digits, or internal hyphens (e.g., lavish).');
      return;
    }

    setIsBusy(true);
    beginOnboarding();
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await completeTenantRegistration(cred.user.email || undefined);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
      await signOut(auth).catch(() => {});
    } finally {
      endOnboarding();
      setIsBusy(false);
    }
  };

  const displayedError = errorMessage || authError || null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-between font-sans selection:bg-[#0EA5E9] selection:text-white">
      {/* Top Brand Header */}
      <header className="bg-[#0F3D5E] text-white border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#0EA5E9] text-white flex items-center justify-center shadow-sm">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              AutoCraft Pro{' '}
              <span className="text-sky-200/80 font-medium text-xs">
                · {resolvedTenant?.companyName || workshopProfile.name}
              </span>
            </h1>
            <p className="text-xs text-sky-200/80">
              {resolvedTenant ? `${resolvedTenant.subdomain}.autocraftpro.com` : `${workshopProfile.address}, ${workshopProfile.city}`} · PAN/VAT: {workshopProfile.panVatNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-sky-100">
          <span className="font-mono font-semibold bg-white/10 px-2.5 py-1 rounded border border-white/15">
            FY {workshopProfile.fiscalYear} B.S.
          </span>
          <span className="hidden sm:inline-flex items-center text-sky-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#16A34A]" />
            IRD 13% VAT Ready
          </span>
        </div>
      </header>

      {/* Main Sign-In & Company Onboarding Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#FFFFFF] text-[#0F172A] rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
          {/* Card Header */}
          <div className="bg-[#0F3D5E] text-white px-6 py-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center">
                {activeTab === 'signin' ? (
                  <LogIn className="w-5 h-5 text-[#0EA5E9]" />
                ) : (
                  <Building2 className="w-5 h-5 text-[#0EA5E9]" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">
                  {activeTab === 'signin' ? 'Sign In to AutoCraft Pro' : 'Company Workspace Onboarding'}
                </h2>
                <p className="text-[11px] text-sky-200">
                  {activeTab === 'signin'
                    ? 'Multi-Tenant Automotive Workshop DMS & ERP'
                    : 'Provision an isolated company subdomain & owner account'}
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 mt-4 p-1 bg-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'signin'
                    ? 'bg-white text-[#0F3D5E] shadow-sm'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                Workspace Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('onboarding');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'onboarding'
                    ? 'bg-white text-[#0F3D5E] shadow-sm'
                    : 'text-sky-100 hover:bg-white/10'
                }`}
              >
                Onboard Company
              </button>
            </div>
          </div>

          {/* Alerts */}
          {displayedError && (
            <div className="m-5 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Notice</p>
                <p>{displayedError}</p>
              </div>
            </div>
          )}

          {infoMessage && (
            <div className="m-5 mb-0 p-3.5 rounded-xl bg-green-50 border border-green-200 text-[#16A34A] text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="font-semibold">{infoMessage}</p>
            </div>
          )}

          {activeTab === 'signin' ? (
            <div className="p-6 space-y-4">
              {/* Active Tenant Subdomain Banner */}
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0F172A] flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>Company Workspace</span>
                  </span>
                  {resolvedTenant ? (
                    <span className="text-[11px] font-semibold text-[#16A34A]">
                      {resolvedTenant.companyName}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#DC2626]">
                      {tenantLookupError || 'Not Found'}
                    </span>
                  )}
                </div>

                {canSelectSubdomain && (
                  <div className="flex items-center rounded-lg border border-[#CBD5E1] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#0EA5E9]">
                    <input
                      type="text"
                      value={subdomainInput}
                      onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="lavish"
                      className="flex-1 px-2.5 py-1.5 text-xs font-mono text-[#0F172A] outline-none"
                      aria-label="Company subdomain"
                    />
                    <span className="px-2.5 py-1.5 text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] border-l border-[#E2E8F0]">
                      .autocraftpro.com
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Google Sign-In */}
              <button
                id="btn-google-signin"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F3D5E] hover:bg-[#0c314c] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-sm transition-all cursor-pointer"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0EA5E9]" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#E2E8F0]" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-[#64748B]">
                  or Email &amp; Password
                </span>
                <div className="flex-grow border-t border-[#E2E8F0]" />
              </div>

              {/* Firebase Email / Password Sign In */}
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@lavishmobility.com"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-9 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer"
                >
                  <span>Sign In with Email</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <form onSubmit={handleEmailOnboarding} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Company / Workshop Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompanyName(val);
                      if (!newSubdomain) {
                        setNewSubdomain(
                          val
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '')
                            .slice(0, 32)
                        );
                      }
                    }}
                    placeholder="e.g. Lavish Mobility"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Tenant Subdomain *
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden focus-within:ring-2 focus-within:ring-[#0EA5E9] focus-within:bg-white">
                    <input
                      type="text"
                      value={newSubdomain}
                      onChange={(e) =>
                        setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="lavish"
                      className="flex-1 px-3 py-2 text-xs font-mono text-[#0F172A] bg-transparent outline-none"
                      required
                    />
                    <span className="px-2.5 py-2 text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] border-l border-[#E2E8F0]">
                      .autocraftpro.com
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@company.com"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">
                      Owner Password *
                    </label>
                    <input
                      type="password"
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer"
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Create Company Tenant (Email/Password)</span>
                </button>
              </form>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-[#E2E8F0]" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-[#64748B]">or</span>
                <div className="flex-grow border-t border-[#E2E8F0]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleOnboarding}
                disabled={isBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F3D5E] hover:bg-[#0c314c] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#0EA5E9]" />
                <span>Provision Company Tenant with Google</span>
              </button>
            </div>
          )}

          {/* Card Footer: Admin-Only Governance Notice */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 text-center text-[11px] text-[#64748B] flex items-center justify-center space-x-1.5">
            <Lock className="w-3 h-3 text-[#0F3D5E] shrink-0" />
            <span>
              Internal staff accounts are managed exclusively by your company Admin under{' '}
              <strong>Master Settings → Staff &amp; RBAC</strong>.
            </span>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="text-center py-3 text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        AutoCraft Pro · Multi-Tenant Automotive Workshop SaaS · Nepal IRD 13% VAT Compliant
      </footer>
    </div>
  );
};
