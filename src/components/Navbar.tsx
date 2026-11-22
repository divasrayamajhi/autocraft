import React from 'react';
import {
  Cloud,
  ChevronDown,
  LogOut,
  UserPlus,
  Menu,
  X
} from 'lucide-react';
import { UserAccount, WorkshopProfile } from '../types';

interface NavbarProps {
  profile: WorkshopProfile;
  currentUser: UserAccount;
  users: UserAccount[];
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  onOpenNewAccountModal?: () => void;
  isCloudSynced: boolean;
  lastSyncTime: string;
  onOpenCloudModal: () => void;
  onOpenProfileModal?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  activeTab?: string;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Workshop Pulse',
  jobcards: 'Job Cards & Bays',
  customers: 'Customer Garages',
  inventory: 'Spare Parts Master',
  warranty: 'Warranty & Claims',
  insurance: 'Cashless Insurance',
  billing: 'Invoicing & IRD Tax',
  accounting: 'GL & VAT Ledger',
  analytics: 'BI & Performance',
  admin_settings: 'Master Settings',
  admin: 'Master Settings'
};

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  currentUser,
  users = [],
  onSwitchUser,
  onLogout,
  onOpenNewAccountModal,
  isCloudSynced,
  onOpenCloudModal,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  activeTab = 'dashboard'
}) => {
  const pageTitle = TAB_TITLES[activeTab] || profile.name;

  return (
    <header className="sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#E2E8F0] print:hidden">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle + Page Context & Workshop Meta */}
        <div className="flex items-center space-x-3 min-w-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#0F172A] hover:bg-[#F1F5F9] transition border border-[#E2E8F0]"
              aria-label="Toggle navigation drawer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#0F172A] tracking-tight truncate leading-tight">
              {pageTitle}
            </h2>
            <p className="text-xs text-[#64748B] hidden sm:flex items-center space-x-2 truncate mt-0.5">
              <span className="font-medium text-[#0F3D5E]">{profile.name}</span>
              <span>·</span>
              <span>FY <span className="font-mono">{profile.fiscalYear}</span></span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">PAN <span className="font-mono">{profile.panVatNumber}</span></span>
              <span className="hidden xl:inline">·</span>
              <span className="hidden xl:inline">13% IRD VAT</span>
            </p>
          </div>
        </div>

        {/* Right: Sync, Role Switcher, Account & Logout */}
        <div className="flex items-center space-x-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenCloudModal}
            className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition"
            title="Backup & Sync Storage"
          >
            <Cloud className={`w-3.5 h-3.5 ${isCloudSynced ? 'text-[#16A34A]' : 'text-[#F59E0B]'}`} />
            <span>{isCloudSynced ? 'Synced' : 'Pending'}</span>
          </button>

          {/* User Selector Dropdown */}
          <div className="relative">
            <select
              aria-label="Switch User Role"
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="appearance-none bg-[#F1F5F9] hover:bg-[#E2E8F0]/70 border border-[#E2E8F0] text-[#0F172A] text-xs font-semibold rounded-lg pl-3 pr-8 py-2 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
            >
              {(users || []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {onOpenNewAccountModal && (
            <button
              id="navbar-btn-new-account"
              type="button"
              onClick={onOpenNewAccountModal}
              className="hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#0F3D5E] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition"
              title="Create New User Account"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#0EA5E9]" />
              <span>New Account</span>
            </button>
          )}

          <button
            id="navbar-btn-logout"
            type="button"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#DC2626] hover:bg-red-50 border border-[#E2E8F0] hover:border-red-200 transition"
            title="Log Out of System"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
