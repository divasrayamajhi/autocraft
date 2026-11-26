import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Play,
  Server,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../../firebase';
import { APP_ROOT_DOMAIN, normalizeCompanySlug } from '../../services/apiClient';

export type AuthScreenMode = 'workspace' | 'developer';

interface AuthScreenProps {
  mode: AuthScreenMode;
  authError?: string | null;
  initialCompanyHint?: string;
  onBackToWebsite: () => void;
  onSwitchMode: (nextMode: AuthScreenMode) => void;
  onWorkspaceSignIn: (companyName: string, email: string, password: string) => Promise<void>;
  onDeveloperEmailSignIn: (email: string, password: string) => Promise<void>;
  onDeveloperGoogleSignIn: () => Promise<void>;
  onEnterWorkspaceDemo: (companyHint?: string) => void;
  onEnterDeveloperDemo: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  mode,
  authError,
  initialCompanyHint = '',
  onBackToWebsite,
  onSwitchMode,
  onWorkspaceSignIn,
  onDeveloperEmailSignIn,
  onDeveloperGoogleSignIn,
  onEnterWorkspaceDemo,
  onEnterDeveloperDemo,
}) => {
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState(initialCompanyHint);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setCompanyName(initialCompanyHint);
    setErrorMessage(null);
  }, [initialCompanyHint, mode]);

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
      return mode === 'developer'
        ? 'Email/Password sign-in is not yet enabled in Firebase Authentication. Use Continue with Google or enable Email/Password in Firebase Console.'
        : 'Email/Password sign-in is not yet enabled in Firebase Authentication. Enable Email/Password in Firebase Console or launch the 1-Click Interactive Demo.';
    }
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid credentials. Please verify your email and password.';
    }
    return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await onDeveloperGoogleSignIn();
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedCompany = companyName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedCompany || normalizeCompanySlug(trimmedCompany).length < 2) {
      setErrorMessage('Please enter your Company Name to locate your workspace subdomain.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsBusy(true);
    try {
      await onWorkspaceSignIn(trimmedCompany, trimmedEmail, password);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeveloperEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your developer email and password.');
      return;
    }

    setIsBusy(true);
    try {
      await onDeveloperEmailSignIn(email.trim(), password);
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleWorkspaceDemoClick = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
      const demoEmail = metaEnv?.VITE_DEMO_EMAIL?.trim();
      const demoPassword = metaEnv?.VITE_DEMO_PASSWORD?.trim();

      if (demoEmail && demoPassword) {
        try {
          const cred = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
          if (cred.user.emailVerified) {
            return;
          }
          await signOut(auth).catch(() => {});
        } catch {
          // Fall back cleanly to instant interactive workspace demo
        }
      }

      onEnterWorkspaceDemo(companyName.trim() || undefined);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeveloperGoogleDirect = async () => {
    setErrorMessage(null);
    setIsBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      await onDeveloperGoogleSignIn();
    } catch (err) {
      setErrorMessage(mapFirebaseAuthError(err));
    } finally {
      setIsBusy(false);
    }
  };

  const displayedError = errorMessage || authError || null;
  const typedSlug = companyName.trim() ? normalizeCompanySlug(companyName) : '';

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] flex flex-col justify-between font-sans selection:bg-[#0EA5E9] selection:text-white">
      {/* Clean Platform-Only Header (Zero Tenant, Link, or VAT Exposure Prior to Sign-In) */}
      <header className="bg-[#0F3D5E] text-white border-b border-white/10 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            type="button"
            onClick={onBackToWebsite}
            className="flex items-center space-x-2.5 text-left hover:opacity-90 transition cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0EA5E9] text-white flex items-center justify-center shadow-sm shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
              AutoCraft Pro
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => onSwitchMode(mode === 'workspace' ? 'developer' : 'workspace')}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-medium text-sky-100 transition cursor-pointer whitespace-nowrap"
          >
            {mode === 'workspace' ? (
              <>
                <Server className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Developer Login</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5 text-[#0EA5E9]" />
                <span>Workspace Login</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToWebsite}
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-sky-200 hover:text-white transition cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to {APP_ROOT_DOMAIN}</span>
          </button>
        </div>
      </header>

      {/* Main Sign-In Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        {mode === 'workspace' ? (
          /* =====================================================================
             SURFACE A: WORKSPACE ACCOUNT LOGIN (NO GOOGLE BUTTON, COMPANY + EMAIL + PASSWORD + 1-CLICK DEMO)
             ===================================================================== */
          <div className="w-full max-w-md bg-[#FFFFFF] text-[#0F172A] rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#0F3D5E] text-white px-6 py-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center shrink-0">
                  <LogIn className="w-5 h-5 text-[#0EA5E9]" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">Workspace Account Sign In</h1>
                  <p className="text-xs text-sky-200/90 mt-0.5">
                    Enter your company name and credentials to open your subdomain
                  </p>
                </div>
              </div>
            </div>

            {displayedError && (
              <div className="m-6 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sign-In Notice</p>
                  <p className="mt-0.5 leading-relaxed">{displayedError}</p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Company Name + Work Email + Password Form */}
              <form onSubmit={handleWorkspaceSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Company Name
                  </label>
                  <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden focus-within:ring-2 focus-within:ring-[#0EA5E9] focus-within:bg-white transition">
                    <div className="pl-3 text-[#64748B]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <input
                      id="workspace-company-input"
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Enter your company name"
                      autoComplete="organization"
                      className="flex-1 bg-transparent px-2.5 py-2.5 text-xs text-[#0F172A] focus:outline-none min-w-0"
                    />
                    <span className="px-2.5 py-2.5 text-[11px] font-mono text-[#64748B] bg-[#F1F5F9] border-l border-[#E2E8F0] shrink-0">
                      .{APP_ROOT_DOMAIN}
                    </span>
                  </div>
                  {typedSlug.length >= 2 && (
                    <p className="mt-1 text-[11px] text-[#64748B] font-mono">
                      Workspace URL: <span className="text-[#0284C7]">{typedSlug}.{APP_ROOT_DOMAIN}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="workspace-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com.np"
                      autoComplete="email"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="workspace-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-9 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-workspace-signin"
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0F3D5E] hover:bg-[#0c314c] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isBusy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0EA5E9]" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    </>
                  )}
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#E2E8F0]" />
                <span className="flex-shrink mx-3 text-[11px] font-semibold text-[#64748B]">
                  or Explore Live Sandbox
                </span>
                <div className="flex-grow border-t border-[#E2E8F0]" />
              </div>

              {/* Launch 1-Click Interactive Demo */}
              <button
                id="btn-demo-login"
                type="button"
                onClick={handleWorkspaceDemoClick}
                disabled={isBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 border border-[#0EA5E9]/40 disabled:opacity-60 text-[#0F3D5E] text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 text-[#0284C7] fill-[#0284C7]" />
                <span>Launch 1-Click Interactive Demo</span>
              </button>
            </div>

            {/* Governance Footer */}
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 text-center text-[11px] text-[#64748B] flex items-center justify-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-[#0F3D5E] shrink-0" />
              <span>
                Workspaces open on your dedicated <span className="font-mono">&lt;company&gt;.{APP_ROOT_DOMAIN}</span> subdomain after sign-in.
              </span>
            </div>
          </div>
        ) : (
          /* =====================================================================
             SURFACE B: DEVELOPER LOGIN (CONTINUE WITH GOOGLE + EMAIL & PASSWORD + DEV DEMO)
             ===================================================================== */
          <div className="w-full max-w-md bg-[#FFFFFF] text-[#0F172A] rounded-2xl shadow-lg border border-[#E2E8F0] overflow-hidden">
            {/* Card Header */}
            <div className="bg-[#0F3D5E] text-white px-6 py-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#0EA5E9]" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight">Developer Portal Sign In</h1>
                  <p className="text-xs text-sky-200/90 mt-0.5">
                    Platform governance, tenant onboarding &amp; resource telemetry
                  </p>
                </div>
              </div>
            </div>

            {displayedError && (
              <div className="m-6 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Developer Access Notice</p>
                  <p className="mt-0.5 leading-relaxed">{displayedError}</p>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Continue with Google (Developer Portal) */}
              <button
                id="btn-dev-google-signin"
                type="button"
                onClick={onDeveloperGoogleSignIn ? handleGoogleSignIn : handleDeveloperGoogleDirect}
                disabled={isBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0F3D5E] hover:bg-[#0c314c] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
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
                  or Developer Email &amp; Password
                </span>
                <div className="flex-grow border-t border-[#E2E8F0]" />
              </div>

              {/* Developer Email / Password Form */}
              <form onSubmit={handleDeveloperEmailSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Developer Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="dev-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="developer@autocraftpro.com.np"
                      autoComplete="email"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="dev-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-9 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button
                  id="btn-dev-email-signin"
                  type="submit"
                  disabled={isBusy}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Sign In to Developer Portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Developer Portal Sandbox Preview */}
              <button
                id="btn-dev-demo-login"
                type="button"
                onClick={onEnterDeveloperDemo}
                disabled={isBusy}
                className="w-full py-2.5 px-4 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] disabled:opacity-60 text-[#0F3D5E] text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Server className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Open Developer Portal Sandbox</span>
              </button>
            </div>

            {/* Developer Boundary Notice */}
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3.5 text-center text-[11px] text-[#64748B] flex items-center justify-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-[#0F3D5E] shrink-0" />
              <span>
                Restricted to authorized AutoCraft Pro platform developers. To enter a client workspace, authenticate on the Workspace Sign-In portal with your developer credentials.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Quiet Platform Footer */}
      <footer className="text-center py-3 text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        AutoCraft Pro · {APP_ROOT_DOMAIN}
      </footer>
    </div>
  );
};
