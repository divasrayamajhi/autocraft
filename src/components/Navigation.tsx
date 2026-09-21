import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { UserRole, WorkshopProfile, UserAccount, AppThemeConfig } from '../types';
import { themeService } from '../services/themeService';

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
  nepaliLabel?: string;
  icon: React.FC<{ className?: string }>;
  allowedRoles: UserRole[];
  badge?: number;
  alertColor?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  nepaliTitle: string;
  items: NavItemConfig[];
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

  const [theme, setTheme] = useState<AppThemeConfig>(() => themeService.getTheme());

  useEffect(() => {
    const unsub = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
    });
    return unsub;
  }, []);

  // Helper classes based on active theme
  const getSidebarBgClass = () => {
    switch (theme.sidebarStyle) {
      case 'midnight-blue': return 'bg-[#0B1528] text-slate-200 border-blue-950';
      case 'charcoal-dark': return 'bg-[#18181b] text-zinc-200 border-zinc-800';
      case 'clean-light': return 'bg-white text-slate-800 border-slate-200';
      case 'forest-dark': return 'bg-[#061e16] text-emerald-100 border-emerald-950';
      case 'slate-dark':
      default:
        return 'bg-slate-900 text-slate-200 border-slate-800';
    }
  };

  const getActiveButtonClass = () => {
    switch (theme.primaryColor) {
      case 'emerald': return 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/40';
      case 'crimson': return 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40';
      case 'sapphire': return 'bg-blue-600 text-white border-blue-500 shadow-blue-950/40';
      case 'violet': return 'bg-purple-600 text-white border-purple-500 shadow-purple-950/40';
      case 'amber': return 'bg-amber-600 text-white border-amber-500 shadow-amber-950/40';
      case 'teal': return 'bg-teal-600 text-white border-teal-500 shadow-teal-950/40';
      case 'indigo':
      default:
        return 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-950/40';
    }
  };

  const getIconWrapperRadius = () => {
    switch (theme.iconStyle) {
      case 'pill': return 'rounded-full';
      case 'sharp': return 'rounded-none';
      case 'badge': return 'rounded-xl';
      case 'glow': return 'rounded-xl shadow-inner ring-1 ring-white/30';
      case 'stroke':
      case 'bold':
      default:
        return 'rounded-lg';
    }
  };

  const isLightSidebar = theme.sidebarStyle === 'clean-light';

  // Flat list of independent navigation buttons (no grouped categories)
  const navItems: NavItemConfig[] = [
    {
      id: 'dashboard',
      label: 'Workshop Pulse',
      nepaliLabel: 'ड्यासबोर्ड',
      icon: LayoutDashboard,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier']
    },
    {
      id: 'jobcards',
      label: 'Job Cards & Bays',
      nepaliLabel: 'जब कार्ड तथा बे',
      icon: Wrench,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician'],
      badge: activeJobCardsCount,
      alertColor: 'bg-indigo-500 text-white'
    },
    {
      id: 'customers',
      label: 'Customer Garages',
      nepaliLabel: 'ग्राहक तथा सवारी',
      icon: Users,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier']
    },
    {
      id: 'inventory',
      label: 'Spare Parts Master',
      nepaliLabel: 'स्पेयर पार्ट्स मौज्दात',
      icon: Package,
      allowedRoles: ['Admin', 'Inventory Manager'],
      badge: lowStockCount,
      alertColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    {
      id: 'warranty',
      label: 'Warranty & Claims',
      nepaliLabel: 'वारेन्टी दाबी',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Inventory Manager'],
      badge: pendingWarrantyCount,
      alertColor: 'bg-blue-500 text-white'
    },
    {
      id: 'insurance',
      label: 'Cashless Insurance',
      nepaliLabel: 'नगदरहित बीमा दाबी',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier'],
      badge: pendingInsuranceCount,
      alertColor: 'bg-emerald-500 text-white'
    },
    {
      id: 'billing',
      label: 'Invoicing & IRD Tax',
      nepaliLabel: 'बिजक तथा बिलिङ',
      icon: Receipt,
      allowedRoles: ['Admin', 'Cashier'],
      badge: unpaidInvoicesCount,
      alertColor: 'bg-rose-500 text-white'
    },
    {
      id: 'accounting',
      label: 'GL & VAT Ledger',
      nepaliLabel: 'खाता तथा भ्याट दर्ता',
      icon: FileSpreadsheet,
      allowedRoles: ['Admin', 'Cashier']
    },
    {
      id: 'analytics',
      label: 'BI & Performance',
      nepaliLabel: 'विश्लेषण तथा रिपोर्ट',
      icon: BarChart3,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier']
    },
    {
      id: 'admin_settings',
      label: 'Master Settings',
      nepaliLabel: 'सेटिङ्स तथा कन्फिग',
      icon: Settings,
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier'],
      adminOnly: true
    }
  ];

  // Filter items allowed for user role
  const visibleItems = navItems.filter(item => item.allowedRoles.includes(userRole));

  const renderSidebarContent = () => (
    <div className={`flex flex-col h-full ${getSidebarBgClass()}`}>
      {/* Workshop Brand Header */}
      <div className={`p-4 border-b ${isLightSidebar ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800/80 bg-slate-950/40'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 ${theme.borderRadius || 'rounded-xl'} bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-900/40 flex-shrink-0`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`text-sm font-bold tracking-tight truncate leading-tight ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>
                {profile?.name || 'Continental Auto Kraft'}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-emerald-500 font-medium tracking-wide">
                  IRD CBMS Online
                </span>
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              id="sidebar-btn-close-mobile"
              onClick={onCloseMobile}
              className={`lg:hidden p-1.5 rounded-lg transition ${
                isLightSidebar 
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Fiscal Year & Legal Status */}
        <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
          isLightSidebar ? 'border-slate-200 text-slate-500' : 'border-slate-800/60 text-slate-400'
        }`}>
          <span>FY: <strong className="text-amber-500 font-mono">{profile?.fiscalYear || '2081/82'} B.S.</strong></span>
          <span>PAN: <strong className={`font-mono ${isLightSidebar ? 'text-slate-800' : 'text-slate-200'}`}>{profile?.panVatNumber || '609812453'}</strong></span>
        </div>
      </div>

      {/* Flat List of Independent Navigation Buttons (No Grouping) */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
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
              className={`w-full flex items-center justify-between px-3.5 py-2.5 ${theme.borderRadius || 'rounded-xl'} text-xs font-medium transition-all group relative text-left border ${
                isActive
                  ? `${getActiveButtonClass()} shadow-md font-semibold`
                  : isLightSidebar
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/90 border-transparent hover:border-slate-200'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-transparent hover:border-slate-700/60'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`w-7 h-7 ${getIconWrapperRadius()} flex items-center justify-center flex-shrink-0 transition-colors ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : isLightSidebar
                      ? 'bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-900'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold leading-tight">{item.label}</div>
                  {item.nepaliLabel && (
                    <div className={`text-[10px] truncate leading-tight mt-0.5 ${
                      isActive 
                        ? 'text-white/80' 
                        : isLightSidebar 
                          ? 'text-slate-500 group-hover:text-slate-700' 
                          : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {item.nepaliLabel}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                {item.adminOnly && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isLightSidebar
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-purple-900/60 text-purple-300 border border-purple-800'
                  }`}>
                    Admin
                  </span>
                )}

                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className={`text-[10px] min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full font-bold shadow-sm ${item.alertColor || 'bg-slate-700 text-slate-200'}`}>
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 text-white/80" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Profile & System Footer */}
      <div className={`p-3 border-t ${
        isLightSidebar ? 'border-slate-200 bg-slate-50' : 'border-slate-800/80 bg-slate-950/50'
      } space-y-2`}>
        {currentUser && (
          <div className={`flex items-center justify-between p-2 ${theme.borderRadius || 'rounded-xl'} ${
            isLightSidebar ? 'bg-white border border-slate-200' : 'bg-slate-800/50 border border-slate-700/60'
          }`}>
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 ${theme.borderRadius || 'rounded-lg'} bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0`}>
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate leading-tight ${isLightSidebar ? 'text-slate-900' : 'text-white'}`}>
                  {currentUser.name}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                    currentUser.role === 'Admin' ? 'bg-purple-400' :
                    currentUser.role === 'Service Advisor' ? 'bg-blue-400' :
                    currentUser.role === 'Technician' ? 'bg-amber-400' :
                    currentUser.role === 'Inventory Manager' ? 'bg-teal-400' : 'bg-rose-400'
                  }`} />
                  <span className="text-[10px] text-slate-400 truncate">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                id="sidebar-btn-logout"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                title="Log Out of System"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Cloud Sync Status */}
        {onOpenCloudModal && (
          <button
            id="sidebar-btn-cloud-sync"
            onClick={onOpenCloudModal}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] ${
              isLightSidebar 
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            } transition`}
          >
            <div className="flex items-center space-x-2">
              <Cloud className={`w-3.5 h-3.5 ${isCloudSynced ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
              <span>{isCloudSynced ? 'Local & Cloud Synced' : 'Sync Pending'}</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-medium">Backup</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          id="sidebar-mobile-backdrop"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Fixed Responsive Left Sidebar */}
      <aside 
        id="app-fixed-sidebar"
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 xl:w-72 ${getSidebarBgClass()} border-r flex flex-col shadow-2xl lg:shadow-xl select-none transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {renderSidebarContent()}
      </aside>
    </>
  );
};
