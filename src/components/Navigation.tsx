import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Package,
  ShieldCheck,
  Receipt,
  Users,
  FileSpreadsheet,
  BarChart3,
  Settings,
  X,
  Cloud,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { UserRole, WorkshopProfile, UserAccount } from '../types';

export type TabType =
  | 'dashboard'
  | 'jobcards'
  | 'inventory'
  | 'warranty'
  | 'insurance'
  | 'billing'
  | 'customers'
  | 'accounting'
  | 'analytics'
  | 'admin_settings'
  | 'admin';

export interface NavigationBadges {
  lowStockCount?: number;
  activeJobCardsCount?: number;
  pendingWarrantyCount?: number;
  unpaidInvoicesCount?: number;
  pendingInsuranceCount?: number;
}

export interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: UserRole;
  badges?: NavigationBadges;
  profile?: WorkshopProfile;
  currentUser?: UserAccount;
  users?: UserAccount[];
  onSwitchUser?: (userId: string) => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCloudSynced?: boolean;
  onOpenCloudModal?: () => void;
}

interface NavItemConfig {
  id: TabType;
  label: string;
  icon: React.FC<{ className?: string }>;
  allowedRoles: UserRole[];
  badge?: number;
  badgeClass?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userRole,
  badges,
  profile,
  currentUser,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
  isCloudSynced = true,
  onOpenCloudModal
}) => {
  const {
    lowStockCount,
    activeJobCardsCount,
    pendingWarrantyCount,
    unpaidInvoicesCount,
    pendingInsuranceCount
  } = badges || {};

  // Flat list of independent navigation buttons (no grouped categories)
  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Workshop Pulse',
      icon: LayoutDashboard,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier']
    },
    {
      id: 'jobcards',
      label: 'Job Cards & Bays',
      icon: Wrench,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician'],
      badge: activeJobCardsCount,
      badgeClass: 'bg-white/15 text-white'
    },
    {
      id: 'customers',
      label: 'Customer Garages',
      icon: Users,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier']
    },
    {
      id: 'inventory',
      label: 'Spare Parts Master',
      icon: Package,
      allowedRoles: ['Admin', 'Inventory Manager'],
      badge: lowStockCount,
      badgeClass: 'bg-[#F59E0B] text-[#0F172A]'
    },
    {
      id: 'warranty',
      label: 'Warranty & Claims',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Inventory Manager'],
      badge: pendingWarrantyCount,
      badgeClass: 'bg-[#0284C7] text-white'
    },
    {
      id: 'insurance',
      label: 'Cashless Insurance',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier'],
      badge: pendingInsuranceCount,
      badgeClass: 'bg-[#16A34A] text-white'
    },
    {
      id: 'billing',
      label: 'Invoicing & IRD Tax',
      icon: Receipt,
      allowedRoles: ['Admin', 'Cashier'],
      badge: unpaidInvoicesCount,
      badgeClass: 'bg-[#DC2626] text-white'
    },
    {
      id: 'accounting',
      label: 'GL & VAT Ledger',
      icon: FileSpreadsheet,
      allowedRoles: ['Admin', 'Cashier']
    },
    {
      id: 'analytics',
      label: 'BI & Performance',
      icon: BarChart3,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier']
    },
    {
      id: 'admin_settings',
      label: 'Master Settings',
      icon: Settings,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier']
    }
  ];

  const visibleItems = navItems.filter(item => item.allowedRoles.includes(userRole));

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0F3D5E] text-white">
      {/* Workshop Brand Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0EA5E9] text-white flex items-center justify-center flex-shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold tracking-tight truncate leading-tight text-white">
                {profile?.name || 'Continental Auto Kraft'}
              </h1>
              <p className="text-[11px] text-sky-200/80 font-medium truncate mt-0.5">
                Workshop DMS &amp; ERP
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              id="sidebar-btn-close-mobile"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Fiscal Year & PAN/VAT */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-sky-100/75">
          <span>
            FY <strong className="text-white font-mono">{profile?.fiscalYear || '2081/82'}</strong>
          </span>
          <span>
            PAN <strong className="text-white font-mono">{profile?.panVatNumber || '609812453'}</strong>
          </span>
        </div>
      </div>

      {/* Flat List of Independent Navigation Buttons */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-clean">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'admin_settings' && activeTab === 'admin');

          return (
            <button
              key={item.id}
              id={`sidebar-btn-${item.id}`}
              type="button"
              onClick={() => {
                onTabChange(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] transition-colors group text-left ${
                isActive
                  ? 'bg-[#0EA5E9] text-white font-semibold'
                  : 'text-slate-200/90 hover:text-white hover:bg-white/10 font-medium'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-sky-200/75 group-hover:text-white'
                  }`}
                />
                <span className="truncate leading-tight">{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`text-[10px] min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-md font-mono font-bold ${
                      isActive ? 'bg-white/20 text-white' : item.badgeClass || 'bg-white/15 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/85" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Sync Footer */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#0B2F49]">
        {currentUser && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 text-sky-200 border border-[#0EA5E9]/40 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate leading-tight text-white">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-sky-200/75 truncate mt-0.5">
                  {currentUser.role}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                id="sidebar-btn-logout"
                onClick={onLogout}
                className="p-1.5 text-sky-200/80 hover:text-white hover:bg-[#DC2626]/80 rounded-md transition"
                title="Log Out of System"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {onOpenCloudModal && (
          <button
            id="sidebar-btn-cloud-sync"
            onClick={onOpenCloudModal}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-sky-100/80 hover:text-white hover:bg-white/10 transition"
          >
            <div className="flex items-center space-x-2">
              <Cloud className={`w-3.5 h-3.5 ${isCloudSynced ? 'text-[#16A34A]' : 'text-[#F59E0B]'}`} />
              <span>{isCloudSynced ? 'Data Synced' : 'Sync Pending'}</span>
            </div>
            <span className="text-[11px] text-[#0EA5E9] font-semibold">Backup</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity print:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-fixed-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 xl:w-72 bg-[#0F3D5E] border-r border-white/10 flex flex-col select-none transition-transform duration-200 ease-in-out print:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
};
