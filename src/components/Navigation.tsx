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
  ChevronRight,
  Sparkles
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

  const sections: NavSection[] = [
    {
      title: 'OPERATIONS',
      nepaliTitle: 'सञ्चालन',
      items: [
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
        }
      ]
    },
    {
      title: 'INVENTORY & CLAIMS',
      nepaliTitle: 'पार्ट्स तथा दाबी',
      items: [
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
          label: 'Warranty & OEM Claims',
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
        }
      ]
    },
    {
      title: 'FINANCE & TAX',
      nepaliTitle: 'लेखा तथा नेपाल कर',
      items: [
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
        }
      ]
    },
    {
      title: 'ADMINISTRATION',
      nepaliTitle: 'प्रणाली व्यवस्थापन',
      items: [
        {
          id: 'admin_settings',
          label: 'Master Settings',
          nepaliLabel: 'सेटिङ्स तथा कन्फिग',
          icon: Settings,
          allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier'],
          adminOnly: true
        }
      ]
    }
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200">
      {/* Workshop Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-indigo-900/40 flex-shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
                {profile?.name || 'Continental Auto Kraft'}
              </h1>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-medium tracking-wide">
                  IRD CBMS Online
                </span>
              </div>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Fiscal Year & Legal Status */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>FY: <strong className="text-amber-400 font-mono">{profile?.fiscalYear || '2081/82'} B.S.</strong></span>
          <span>PAN: <strong className="text-slate-200 font-mono">{profile?.panVatNumber || '609812453'}</strong></span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
        {sections.map((section, idx) => {
          // Filter items allowed for user role
          const visibleItems = section.items.filter(item => item.allowedRoles.includes(userRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>{section.title}</span>
                <span className="text-[9px] text-slate-400 font-normal">{section.nepaliTitle}</span>
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => {
                        onTabChange(item.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                        }`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {item.adminOnly && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-purple-900/60 text-purple-300 border border-purple-800'
                          }`}>
                            Admin
                          </span>
                        )}

                        {typeof item.badge === 'number' && item.badge > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm ${item.alertColor || 'bg-slate-700 text-slate-200'}`}>
                            {item.badge}
                          </span>
                        )}

                        {isActive && (
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Profile & System Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-2">
        {currentUser && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate leading-tight">
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
            onClick={onOpenCloudModal}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition"
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
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-30 border-r border-slate-800 select-none shadow-xl">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer Backdrop and Off-Canvas Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}
    </>
  );
};
