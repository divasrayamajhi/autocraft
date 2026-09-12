import React from 'react';
import { 
  Shield, 
  Wrench, 
  Building2, 
  Cloud, 
  CheckCircle2, 
  User, 
  ChevronDown, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { UserAccount, WorkshopProfile } from '../types';

interface NavbarProps {
  profile: WorkshopProfile;
  currentUser: UserAccount;
  users: UserAccount[];
  onSwitchUser: (userId: string) => void;
  isCloudSynced: boolean;
  lastSyncTime: string;
  onOpenCloudModal: () => void;
  onOpenProfileModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  currentUser,
  users,
  onSwitchUser,
  isCloudSynced,
  lastSyncTime,
  onOpenCloudModal,
  onOpenProfileModal
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Top Nepal IRD & Fiscal Year Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
            IRD CBMS Realtime E-Billing Connected
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 font-medium">Fiscal Year:</span>
          <span className="text-amber-400 font-mono font-bold">{profile.fiscalYear} B.S.</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">PAN/VAT:</span>
          <span className="font-mono text-white font-semibold">{profile.panVatNumber}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">Standard VAT:</span>
          <span className="text-indigo-300 font-bold">13%</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenCloudModal}
            className="hover:text-white transition flex items-center space-x-1.5 text-[11px] text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded border border-slate-700"
          >
            <Cloud className={`w-3 h-3 ${isCloudSynced ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{isCloudSynced ? 'Local & Cloud Synced' : 'Sync Pending'}</span>
          </button>
        </div>
      </div>

      {/* Main Workshop Bar */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Workshop Brand & Details */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                {profile.name}
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Independent Single Workshop
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1.5">
              <span>{profile.address}, {profile.city}</span>
              <span>•</span>
              <span>{profile.contactNumber}</span>
            </p>
          </div>
        </div>

        {/* User Role Switcher & Profile */}
        <div className="flex items-center space-x-3">
          {/* Role Pill */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Active Access Role
            </span>
            <div className="flex items-center space-x-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                currentUser.role === 'Admin' ? 'bg-purple-500' :
                currentUser.role === 'Service Advisor' ? 'bg-blue-500' :
                currentUser.role === 'Technician' ? 'bg-amber-500' :
                currentUser.role === 'Inventory Manager' ? 'bg-teal-500' : 'bg-rose-500'
              }`} />
              <span className="text-xs font-bold text-slate-800">
                {currentUser.role}
              </span>
            </div>
          </div>

          {/* User Selector Dropdown */}
          <div className="relative group">
            <select
              aria-label="Switch User Role"
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 cursor-pointer shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Quick User Role Tag */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold">{currentUser.username}</span>
            {currentUser.role === 'Admin' ? (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold ml-1">Full Admin Control</span>
            ) : (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium ml-1">Role Limited</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
