import React, { useState } from 'react';
import {
  LogIn,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { WorkshopProfile } from '../../types';
import { auth, googleProvider } from '../../firebase';

interface AuthScreenProps {
  workshopProfile: WorkshopProfile;
  authError?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  workshopProfile,
  authError,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMessage('Sign-in window was closed before completing authentication. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.');
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to sign in with Google right now. Please try again.'
        );
      }
    } finally {
      setIsSigningIn(false);
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
              <span className="text-sky-200/80 font-medium text-xs">· {workshopProfile.name}</span>
            </h1>
            <p className="text-xs text-sky-200/80">
              {workshopProfile.address}, {workshopProfile.city} · PAN/VAT: {workshopProfile.panVatNumber}
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

      {/* Main Sign-In Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#FFFFFF] text-[#0F172A] rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
          {/* Card Header */}
          <div className="bg-[#0F3D5E] text-white px-6 py-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-[#0EA5E9]" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight">Sign In to AutoCraft Pro</h2>
                <p className="text-[11px] text-sky-200">
                  Authorized Workshop Administrator &amp; Staff Portal
                </p>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {displayedError && (
            <div className="m-5 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Notice</p>
                <p>{displayedError}</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-[#0F3D5E] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6 text-[#0284C7]" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                Secure Cloud Workspace Authentication
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Sign in with your verified Google account to access your persistent workshop records, job cards, spare parts inventory, and Nepal IRD billing ledger.
              </p>
            </div>

            <button
              id="btn-google-signin"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3 px-4 rounded-xl bg-[#0F3D5E] hover:bg-[#0c314c] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center space-x-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0EA5E9]" />
                  <span>Signing in...</span>
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
          </div>

          {/* Card Footer: Admin-Only Governance Notice */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 text-center text-[11px] text-[#64748B] flex items-center justify-center space-x-1.5">
            <Lock className="w-3 h-3 text-[#0F3D5E] shrink-0" />
            <span>
              Additional staff accounts are created exclusively by the Admin under{' '}
              <strong>Master Settings → Staff &amp; RBAC</strong>.
            </span>
          </div>
        </div>
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="text-center py-3 text-xs text-[#64748B] border-t border-[#E2E8F0] bg-[#FFFFFF]">
        AutoCraft Pro · Nepal IRD 13% VAT Compliant
      </footer>
    </div>
  );
};
