import React, { useState } from 'react';
import {
  LogIn,
  ShieldCheck,
  Wrench,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  User,
  Key,
  Lock
} from 'lucide-react';
import { UserAccount, WorkshopProfile } from '../../types';
import { storage } from '../../services/storageService';

interface AuthScreenProps {
  workshopProfile: WorkshopProfile;
  onLoginSuccess: (user: UserAccount) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  workshopProfile,
  onLoginSuccess
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const availableUsers = (storage.getDatabase().users || []).filter((u) => u.isActive);
  const mainAdminUser = availableUsers.find((u) => u.role === 'Admin') || availableUsers[0];

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginUsername.trim()) {
      setErrorMessage('Please enter your username or work email address.');
      return;
    }

    const res = storage.login(loginUsername, loginPassword);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  // Quick One-Click Sign In for configured accounts (starts with single Main Admin)
  const handleQuickLogin = (username: string) => {
    setErrorMessage(null);
    const res = storage.login(username);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Sign in failed.');
    }
  };

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
              AutoCraft Pro <span className="text-sky-200/80 font-medium text-xs">· {workshopProfile.name}</span>
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
          {errorMessage && (
            <div className="m-5 mb-0 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Notice</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Username or Work Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username-input"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#0F172A]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#64748B]">
                    Main Admin: <span className="font-mono text-[#0284C7] font-semibold">admin / admin</span>
                  </span>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <span>Sign In to System</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Access for Main Administrator (and any extra staff created by Admin) */}
            {mainAdminUser && (
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0F172A] flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                    <span>
                      {availableUsers.length > 1 ? 'Configured Accounts' : 'Main Administrator Account'}
                    </span>
                  </span>
                  <span className="text-[10px] text-[#64748B]">One-click sign in</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      id={`demo-login-${user.username}`}
                      type="button"
                      onClick={() => handleQuickLogin(user.username)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-sky-50 hover:border-[#0EA5E9]/50 text-left transition group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                            user.role === 'Admin' ? 'bg-[#0F3D5E]' : 'bg-[#0284C7]'
                          }`}
                        >
                          {user.role === 'Admin' ? (
                            <ShieldCheck className="w-4 h-4 text-[#0EA5E9]" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F172A] truncate">{user.name}</div>
                          <div className="text-[10px] text-[#64748B] font-mono truncate">
                            @{user.username} · {user.role}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#0F3D5E] bg-sky-100 px-2.5 py-1 rounded-lg shrink-0">
                        Sign In
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card Footer: Admin-Only Governance Notice */}
          <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-5 py-3 text-center text-[11px] text-[#64748B] flex items-center justify-center space-x-1.5">
            <Lock className="w-3 h-3 text-[#0F3D5E] shrink-0" />
            <span>
              Additional staff accounts are created exclusively by the Admin under <strong>Master Settings → Staff &amp; RBAC</strong>.
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
