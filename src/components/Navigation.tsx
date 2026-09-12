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
  Lock
} from 'lucide-react';
import { UserRole } from '../types';

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

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  userRole: UserRole;
  badges?: NavigationBadges;
}

interface NavItemConfig {
  id: TabType;
  label: string;
  icon: React.FC<{ className?: string }>;
  allowedRoles: UserRole[];
  badge?: number;
  alertColor?: string;
  adminOnly?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  userRole,
  badges
}) => {
  const { 
    lowStockCount, 
    activeJobCardsCount, 
    pendingWarrantyCount, 
    unpaidInvoicesCount,
    pendingInsuranceCount 
  } = badges || {};

  const allNavItems: NavItemConfig[] = [
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
      alertColor: 'bg-indigo-600 text-white'
    },
    {
      id: 'inventory',
      label: 'Spare Parts Master',
      icon: Package,
      allowedRoles: ['Admin', 'Inventory Manager'],
      badge: lowStockCount,
      alertColor: 'bg-amber-500 text-white'
    },
    {
      id: 'warranty',
      label: 'Warranty & OEM Claims',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Inventory Manager'],
      badge: pendingWarrantyCount,
      alertColor: 'bg-blue-600 text-white'
    },
    {
      id: 'insurance',
      label: 'Cashless Insurance',
      icon: ShieldCheck,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier'],
      badge: pendingInsuranceCount,
      alertColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'billing',
      label: 'Invoicing & IRD Tax',
      icon: Receipt,
      allowedRoles: ['Admin', 'Cashier'],
      badge: unpaidInvoicesCount,
      alertColor: 'bg-rose-500 text-white'
    },
    {
      id: 'customers',
      label: 'Customer Garages',
      icon: Users,
      allowedRoles: ['Admin', 'Service Advisor', 'Cashier']
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
      allowedRoles: ['Admin', 'Service Advisor', 'Technician', 'Inventory Manager', 'Cashier'],
      adminOnly: true
    }
  ];

  // Filter items based on active user's role
  const visibleItems = allNavItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <nav className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 p-1.5 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-1 min-w-max">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>

              {item.adminOnly && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                  isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-purple-100 text-purple-700'
                }`}>
                  Admin
                </span>
              )}

              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${item.alertColor || 'bg-slate-200 text-slate-800'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
