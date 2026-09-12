import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  ClipboardCheck, 
  Wrench, 
  Package, 
  Receipt, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  User, 
  Mail, 
  Phone, 
  Key,
  ShieldAlert,
  X
} from 'lucide-react';
import { UserAccount, UserRole, WorkshopProfile, getDefaultPermissionsForRole } from '../../types';
import { storage } from '../../services/storageService';

interface AuthScreenProps {
  workshopProfile: WorkshopProfile;
  onLoginSuccess: (user: UserAccount) => void;
  initialTab?: 'login' | 'signup';
  isModal?: boolean;
  onClose?: () => void;
}

interface RoleConfig {
  role: UserRole;
  title: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  badgeColor: string;
  description: string;
  highlights: string[];
}

const ROLES_CONFIG: RoleConfig[] = [
  {
    role: 'Admin',
    title: 'Workshop Administrator',
    icon: ShieldCheck,
    color: 'border-purple-500 bg-purple-50/50 text-purple-900',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Full administrative control over workshop configuration, financials, and team accounts.',
    highlights: ['Master pricing & bay config', 'Full IRD 13% VAT & CBMS e-billing', 'Audit trails & staff management']
  },
  {
    role: 'Service Advisor',
    title: 'Service Advisor',
    icon: ClipboardCheck,
    color: 'border-blue-500 bg-blue-50/50 text-blue-900',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Front-desk operations, vehicle intake reception, and job card lifecycle coordination.',
    highlights: ['Customer & vehicle intake', 'Digital job card generation', 'Customer estimates & warranty claims']
  },
  {
    role: 'Technician',
    title: 'Workshop Technician',
    icon: Wrench,
    color: 'border-amber-500 bg-amber-50/50 text-amber-900',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Bay work execution, multi-point digital inspections, and store parts requisitions.',
    highlights: ['45-Point inspection checklist', 'Labor hours recording', 'Spare parts store requisition']
  },
  {
    role: 'Inventory Manager',
    title: 'Inventory & Store Manager',
    icon: Package,
    color: 'border-teal-500 bg-teal-50/50 text-teal-900',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Store operations, stock replenishment, vendor purchase orders, and OEM warranty tags.',
    highlights: ['Stock ledger & bin management', 'Min-reorder alerts & PO issuance', 'OEM parts serial tracking']
  },
  {
    role: 'Cashier',
    title: 'Cashier & Billing Specialist',
    icon: Receipt,
    color: 'border-rose-500 bg-rose-50/50 text-rose-900',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Invoice settlements, IRD electronic fiscalization, and dynamic QR payments.',
    highlights: ['Nepal IRD 13% VAT invoices', 'Fonepay & NepalPay dynamic QR', 'Insurance cashless split billing']
  }
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  workshopProfile,
  onLoginSuccess,
  initialTab = 'login',
  isModal = false,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('+977-');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('Service Advisor');

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginUsername.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    const res = storage.login(loginUsername, loginPassword);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  // Quick Demo Login
  const handleQuickDemoLogin = (username: string) => {
    setErrorMessage(null);
    const res = storage.login(username);
    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.error || 'Demo login failed');
    }
  };

  // Handle Registration
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!signupUsername.trim()) {
      setErrorMessage('Username is required.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Valid work email is required.');
      return;
    }
    if (!signupPassword || signupPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const res = storage.register({
      name: signupName,
      username: signupUsername,
      email: signupEmail,
      phone: signupPhone,
      role: signupRole,
      password: signupPassword
    });

    if (res.success && res.user) {
      setSuccessMessage(`Account created successfully as ${signupRole}! Logging in...`);
      setTimeout(() => {
        if (res.user) {
          onLoginSuccess(res.user);
        }
      }, 500);
    } else {
      setErrorMessage(res.error || 'Account creation failed.');
    }
  };

  const selectedRoleConfig = ROLES_CONFIG.find(r => r.role === signupRole) || ROLES_CONFIG[0];
  const permissions = getDefaultPermissionsForRole(signupRole);

  const cardContent = (
    <div className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
      {isModal && onClose && (
        <button
          id="btn-close-auth-modal"
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Top Auth Navigation Tabs */}
      <div className={`grid grid-cols-2 border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5 ${isModal ? 'pr-12' : ''}`}>
        <button
          id="auth-tab-login"
          type="button"
          onClick={() => {
            setActiveTab('login');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'login'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>User Sign In</span>
        </button>

        <button
          id="auth-tab-register"
          type="button"
          onClick={() => {
            setActiveTab('signup');
            setErrorMessage(null);
          }}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-sm font-bold transition-all ${
            activeTab === 'signup'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Account</span>
        </button>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="m-5 mb-0 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div>
            <p className="font-semibold">Authentication Notice</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="m-5 mb-0 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <p className="font-semibold">{successMessage}</p>
        </div>
      )}

      {/* TAB 1: LOGIN FORM */}
      {activeTab === 'login' && (
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome to Workshop DMS & ERP
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Log in to access your role-specific work dashboard, jobs, inventory, or billing.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username or Work Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username-input"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="e.g. admin or suman.admin@sagarmathaauto.com.np"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">
                  Default demo: <span className="font-mono text-indigo-600 font-semibold">admin</span> or <span className="font-mono text-indigo-600 font-semibold">password123</span>
                </span>
              </div>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 transition-all"
            >
              <span>Sign In to System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick One-Click Demo Access */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick One-Click Demo Role Logins:</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Click any role to test</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="demo-login-admin"
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    👑
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-900 group-hover:text-purple-950">Suman Sharma</div>
                    <div className="text-[10px] text-purple-600 font-medium">Admin (Full Control)</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-200/60 px-2 py-0.5 rounded">Log In</span>
              </button>

              <button
                id="demo-login-advisor"
                type="button"
                onClick={() => handleQuickDemoLogin('aayush.advisor')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    📋
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-900 group-hover:text-blue-950">Aayush Thapa</div>
                    <div className="text-[10px] text-blue-600 font-medium">Service Advisor</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-200/60 px-2 py-0.5 rounded">Log In</span>
              </button>

              <button
                id="demo-login-tech"
                type="button"
                onClick={() => handleQuickDemoLogin('bikram.tech')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    🔧
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-900 group-hover:text-amber-950">Bikram Tamang</div>
                    <div className="text-[10px] text-amber-600 font-medium">Lead Technician</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">Log In</span>
              </button>

              <button
                id="demo-login-store"
                type="button"
                onClick={() => handleQuickDemoLogin('rajan.store')}
                className="flex items-center justify-between p-2.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/70 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    📦
                  </div>
                  <div>
                    <div className="text-xs font-bold text-teal-900 group-hover:text-teal-950">Rajan Shrestha</div>
                    <div className="text-[10px] text-teal-600 font-medium">Inventory Manager</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-200/60 px-2 py-0.5 rounded">Log In</span>
              </button>

              <button
                id="demo-login-cashier"
                type="button"
                onClick={() => handleQuickDemoLogin('pooja.cashier')}
                className="sm:col-span-2 flex items-center justify-between p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    💳
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-900 group-hover:text-rose-950">Pooja Gurung</div>
                    <div className="text-[10px] text-rose-600 font-medium">Cashier & Accounts (Nepal 13% VAT & QR Billing)</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-200/60 px-2 py-0.5 rounded">Log In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE NEW ACCOUNT WITH ROLE OPTIONS */}
      {activeTab === 'signup' && (
        <div className="p-6 sm:p-8 max-h-[78vh] overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Register New User Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Create a team member account and designate an operational role with calibrated workshop permissions.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Ramesh Basnet"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <span className="text-xs font-mono font-bold text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2">@</span>
                  <input
                    id="signup-username-input"
                    type="text"
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                    placeholder="e.g. ramesh.basnet"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="ramesh@sagarmathaauto.com.np"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Number (Nepal)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-phone-input"
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+977-9800000000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-password-input"
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Min. 4 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="signup-confirmpassword-input"
                    type="password"
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* ROLE OPTIONS SELECTION */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Select Account Role Option *
              </label>
              <p className="text-[11px] text-slate-500 mb-3">
                Roles define operational boundaries and module access across the workshop system.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROLES_CONFIG.map((r) => {
                  const Icon = r.icon;
                  const isSelected = signupRole === r.role;

                  return (
                    <div
                      key={r.role}
                      onClick={() => setSignupRole(r.role)}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-900">{r.role}</span>
                        </div>

                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                        {r.description}
                      </p>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        {r.highlights.map((h, i) => (
                          <span key={i} className="text-[9px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.2 rounded">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Role Permissions Breakdown */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800">
                  Granted Privileges for: <span className="text-indigo-600 font-extrabold">{signupRole}</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedRoleConfig.badgeColor}`}>
                  {signupRole} Tier
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                <span className={`flex items-center space-x-1 ${permissions.canCreateJobCard ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canCreateJobCard ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Create Job Cards</span>
                </span>
                <span className={`flex items-center space-x-1 ${permissions.canEditJobCard ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canEditJobCard ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Edit Bay Checklists</span>
                </span>
                <span className={`flex items-center space-x-1 ${permissions.canIssueBill ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canIssueBill ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Issue IRD Invoices</span>
                </span>
                <span className={`flex items-center space-x-1 ${permissions.canManageInventory ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canManageInventory ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Inventory Store PO</span>
                </span>
                <span className={`flex items-center space-x-1 ${permissions.canViewFinancials ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canViewFinancials ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Financial VAT Ledger</span>
                </span>
                <span className={`flex items-center space-x-1 ${permissions.canEditMasters ? 'text-emerald-700 font-semibold' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-3 h-3 ${permissions.canEditMasters ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Master Workshop Config</span>
                </span>
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              id="btn-register-submit"
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account & Sign In as {signupRole}</span>
            </button>
          </form>
        </div>
      )}

      {/* Card Footer */}
      <div className="bg-slate-50 border-t border-slate-100 p-3.5 text-center text-xs text-slate-500">
        {activeTab === 'login' ? (
          <p>
            Need a new staff profile or testing another role?{' '}
            <button
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage(null);
              }}
              className="text-indigo-600 font-bold hover:underline"
            >
              Create account here
            </button>
          </p>
        ) : (
          <p>
            Already have an existing staff account?{' '}
            <button
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className="text-indigo-600 font-bold hover:underline"
            >
              Sign in here
            </button>
          </p>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return cardContent;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Subtle Background Accent Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-tight">{workshopProfile.name}</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Nepal IRD 13% VAT CBMS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {workshopProfile.address}, {workshopProfile.city} • PAN/VAT: {workshopProfile.panVatNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-300">
          <span className="hidden sm:inline text-slate-400">Fiscal Year:</span>
          <span className="font-mono text-amber-400 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {workshopProfile.fiscalYear} B.S.
          </span>
          <span className="hidden sm:inline-flex items-center text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            System Online
          </span>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        {cardContent}
      </main>

      {/* Subtle Bottom Footer */}
      <footer className="text-center py-3 text-xs text-slate-500 border-t border-slate-800 bg-slate-900/60 z-10">
        Multi-Brand Workshop DMS & ERP • Compliant with Nepal Government IRD 13% VAT & CBMS Realtime E-Billing Rules
      </footer>
    </div>
  );
};
