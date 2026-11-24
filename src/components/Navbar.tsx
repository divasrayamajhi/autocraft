import React, { useState } from 'react';
import {
  Cloud,
  ChevronDown,
  LogOut,
  UserPlus,
  Menu,
  X,
  Bell,
  Calendar,
  MessageSquare,
  Send,
  CheckCheck,
  Keyboard,
} from 'lucide-react';
import { ReadyNotificationLog, UserAccount, WorkshopProfile } from '../types';
import { adToBs, formatAdDateReadable, getTodayAd } from '../utils/nepaliDate';
import { useEscapeKey } from '../hooks/useKeyboardShortcuts';

interface NavbarProps {
  profile: WorkshopProfile;
  currentUser: UserAccount;
  users: UserAccount[];
  readyNotifications?: ReadyNotificationLog[];
  onMarkNotificationsRead?: () => void;
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  onOpenNewAccountModal?: () => void;
  isCloudSynced: boolean;
  lastSyncTime: string;
  onOpenCloudModal: () => void;
  onOpenShortcuts?: () => void;
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
  admin: 'Master Settings',
};

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  currentUser,
  users = [],
  readyNotifications = [],
  onMarkNotificationsRead,
  onSwitchUser,
  onLogout,
  onOpenNewAccountModal,
  isCloudSynced,
  onOpenCloudModal,
  onOpenShortcuts,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  activeTab = 'dashboard',
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEscapeKey(isNotifOpen, () => setIsNotifOpen(false));

  const pageTitle = TAB_TITLES[activeTab] || profile.name;
  const todayAd = getTodayAd();
  const todayBs = adToBs(todayAd);
  const unreadCount = readyNotifications.filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-20 bg-[#FFFFFF] border-b border-[#E2E8F0] print:hidden">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
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
              <span>
                FY <span className="font-mono">{profile.fiscalYear}</span>
              </span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">
                PAN <span className="font-mono">{profile.panVatNumber}</span>
              </span>
            </p>
          </div>
        </div>

        {/* Right: Dual BS/AD Calendar, Notifications Bell, Sync, Role Switcher, Account & Logout */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Synchronized Live Nepal B.S. & A.D. Date Indicator */}
          <div
            className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-[11px]"
            title={`Nepal B.S.: ${todayBs.fullLabel} | Gregorian A.D.: ${formatAdDateReadable(todayAd)}`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
            <span className="font-bold text-[#0F3D5E] font-mono">{todayBs.fullLabel}</span>
            <span className="text-[#CBD5E1]">|</span>
            <span className="text-[#64748B] font-mono">{formatAdDateReadable(todayAd)} AD</span>
          </div>

          {/* Keyboard Shortcuts Reference Button */}
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="hidden sm:inline-flex items-center space-x-1 p-2 rounded-lg text-[#64748B] hover:text-[#0F3D5E] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition"
              title="Keyboard Shortcuts (Shift + ? or Alt + K)"
              aria-label="Open keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          )}

          {/* Vehicle Ready SMS & Message Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                if (!isNotifOpen && unreadCount > 0 && onMarkNotificationsRead) {
                  onMarkNotificationsRead();
                }
              }}
              className="relative p-2 rounded-lg text-[#0F3D5E] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition"
              title="Vehicle Ready SMS & Message Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FFFFFF] rounded-xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden">
                <div className="px-4 py-3 bg-[#0F3D5E] text-white flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold">Vehicle Ready &amp; Owner SMS Alerts</h4>
                    <p className="text-[10px] text-sky-200">
                      Automatic notifications when vehicles are ready for pickup
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="p-1 text-sky-200 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]">
                  {readyNotifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748B]">
                      No vehicle-ready notifications sent yet. Notifications appear automatically once parts are issued and a vehicle reaches Ready for Billing / Pickup.
                    </div>
                  ) : (
                    readyNotifications.map((n) => {
                      const cleanOwnerPhone = (n.recipientPhone || '').replace(/[^0-9+]/g, '');
                      const cleanWaPhone = (n.recipientPhone || '').replace(/[^0-9]/g, '');
                      const smsHref = `sms:${cleanOwnerPhone}?body=${encodeURIComponent(n.message)}`;
                      const waHref = `https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(n.message)}`;

                      return (
                        <div key={n.id} className="p-3.5 hover:bg-[#F8FAFC] space-y-2 text-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold text-[#0284C7]">
                                {n.vehicleReg} • {n.jobCardNumber}
                              </span>
                              <div className="font-semibold text-[#0F172A]">{n.customerName}</div>
                            </div>
                            <span className="inline-flex items-center space-x-1 text-[10px] text-[#16A34A] font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              <CheckCheck className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] leading-snug">{n.message}</p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-[#64748B] font-mono">
                              {n.bsDate} BS • {n.recipientPhone}
                            </span>
                            <div className="flex items-center space-x-1.5">
                              <a
                                href={smsHref}
                                className="px-2 py-1 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded text-[10px] font-semibold inline-flex items-center space-x-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>SMS</span>
                              </a>
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-[#16A34A] hover:bg-green-700 text-white rounded text-[10px] font-semibold inline-flex items-center space-x-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

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
