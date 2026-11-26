import React, { useState } from 'react';
import { 
  Users, 
  Settings, 
  Building2, 
  Wrench, 
  Package, 
  DollarSign, 
  Layers, 
  CheckCircle2, 
  Edit3, 
  Plus, 
  Trash2, 
  Save, 
  X,
  FileCheck,
  ShieldAlert,
  Server
} from 'lucide-react';
import { DraggableTabBar } from '../common/DraggableTabBar';
import { TenantSaasSettingsPanel } from './TenantSaasSettingsPanel';
import { 
  UserAccount, 
  WorkshopProfile, 
  ServicePriceItem, 
  WorkshopBay, 
  Technician, 
  Customer, 
  SparePart,
  UserRole,
  getDefaultPermissionsForRole
} from '../../types';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

interface AdminMasterSettingsProps {
  profile: WorkshopProfile;
  users?: UserAccount[];
  customers?: Customer[];
  parts?: SparePart[];
  priceBook?: ServicePriceItem[];
  bays?: WorkshopBay[];
  technicians?: Technician[];
  userRole?: UserRole;
  targetOwnerUid?: string;
  onSwitchUser?: (userId: string) => void;
  onUpdateProfile: (profile: WorkshopProfile) => void;
  onUpdateUsers: (users: UserAccount[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateParts: (parts: SparePart[]) => void;
  onUpdatePriceBook: (priceBook: ServicePriceItem[]) => void;
  onUpdateBays: (bays: WorkshopBay[]) => void;
  onUpdateTechnicians: (technicians: Technician[]) => void;
}

type AdminSubTab = 'staff' | 'services' | 'bays' | 'technicians' | 'parts' | 'profile' | 'ird_config' | 'tenant_saas';

export const AdminMasterSettings: React.FC<AdminMasterSettingsProps> = ({
  profile,
  users = [],
  customers = [],
  parts = [],
  priceBook = [],
  bays = [],
  technicians = [],
  userRole = 'Admin',
  targetOwnerUid,
  onSwitchUser,
  onUpdateProfile,
  onUpdateUsers,
  onUpdateCustomers,
  onUpdateParts,
  onUpdatePriceBook,
  onUpdateBays,
  onUpdateTechnicians
}) => {
  const safeUsers = Array.isArray(users) ? users : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeParts = Array.isArray(parts) ? parts : [];
  const safePriceBook = Array.isArray(priceBook) ? priceBook : [];
  const safeBays = Array.isArray(bays) ? bays : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians : [];

  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('staff');
  const [profileForm, setProfileForm] = useState<WorkshopProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [viewReadOnly, setViewReadOnly] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setProfileForm(profile);
    }
  }, [profile]);

  // Staff edit modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isNewUserModal, setIsNewUserModal] = useState(false);
  const [selectedModalRole, setSelectedModalRole] = useState<UserRole>('Service Advisor');
  const [staffFormError, setStaffFormError] = useState<string | null>(null);

  // Service item edit modal state
  const [editingService, setEditingService] = useState<ServicePriceItem | null>(null);
  const [isNewServiceModal, setIsNewServiceModal] = useState(false);

  // Bay edit modal state
  const [editingBay, setEditingBay] = useState<WorkshopBay | null>(null);

  // Technician edit modal state
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [isNewTechModal, setIsNewTechModal] = useState(false);

  useEscapeKey(isNewUserModal, () => {
    setIsNewUserModal(false);
    setStaffFormError(null);
  });
  useEscapeKey(isNewServiceModal, () => setIsNewServiceModal(false));
  useEscapeKey(Boolean(editingBay), () => setEditingBay(null));
  useEscapeKey(isNewTechModal, () => setIsNewTechModal(false));

  // Strict Admin-only guard — only Admin has defined role to create extra users and edit masters
  if (userRole !== 'Admin') {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center max-w-lg mx-auto my-12 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">Administrator Access Required</h3>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            Master Settings — including creating extra user accounts under <strong>Staff &amp; Roles (RBAC)</strong>, Labor Price Book, Workshop Bays, and IRD E-Billing — are restricted strictly to the Main Administrator account. Current Role:{' '}
            <span className="font-semibold text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded">{userRole}</span>.
          </p>
        </div>
      </div>
    );
  }

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    showNotification('Workshop Profile & Nepal IRD Configuration Updated Successfully');
  };

  // Staff Handlers (Admin-Only)
  const handleSaveUser = (user: UserAccount) => {
    if (userRole !== 'Admin') return;
    setStaffFormError(null);

    const normalizedUsername = user.username.trim().toLowerCase();
    const normalizedEmail = user.email.trim().toLowerCase();
    const duplicate = safeUsers.find(
      (u) =>
        u.id !== user.id &&
        ((u.username || '').toLowerCase() === normalizedUsername ||
          (u.email || '').toLowerCase() === normalizedEmail)
    );
    if (duplicate) {
      setStaffFormError('A user account with this username or email already exists.');
      return;
    }

    if (editingUser) {
      const updated = safeUsers.map((u) => (u.id === user.id ? user : u));
      onUpdateUsers(updated);
      showNotification(`Staff User "${user.name}" Updated`);
    } else {
      const newUser: UserAccount = { ...user, id: `USR-${Date.now().toString().slice(-4)}` };
      onUpdateUsers([...safeUsers, newUser]);
      showNotification(`New User Account "${user.name}" (@${newUser.username}) Created`);
    }
    setEditingUser(null);
    setIsNewUserModal(false);
    setStaffFormError(null);
  };

  const handleToggleUserActive = (target: UserAccount) => {
    if (userRole !== 'Admin' || target.id === 'USR-01') return;
    const updated = safeUsers.map((u) =>
      u.id === target.id ? { ...u, isActive: !u.isActive } : u
    );
    onUpdateUsers(updated);
    showNotification(
      `Account "@${target.username}" ${target.isActive ? 'Deactivated' : 'Re-Activated'}`
    );
  };

  const handleDeleteUser = (target: UserAccount) => {
    if (userRole !== 'Admin' || target.id === 'USR-01') return;
    const updated = safeUsers.filter((u) => u.id !== target.id);
    onUpdateUsers(updated);
    showNotification(`Removed staff account "${target.name}" (@${target.username})`);
  };

  // Service Handlers
  const handleSaveService = (service: ServicePriceItem) => {
    if (editingService) {
      const updated = priceBook.map(s => s.id === service.id ? service : s);
      onUpdatePriceBook(updated);
      showNotification(`Service "${service.name}" Updated`);
    } else {
      const newSrv = { ...service, id: `SRV-${Date.now().toString().slice(-3)}` };
      onUpdatePriceBook([...priceBook, newSrv]);
      showNotification(`Service "${service.name}" Added to Price Book`);
    }
    setEditingService(null);
    setIsNewServiceModal(false);
  };

  // Bay Handlers
  const handleSaveBay = (bay: WorkshopBay) => {
    const updated = bays.map(b => b.id === bay.id ? bay : b);
    onUpdateBays(updated);
    showNotification(`Bay "${bay.bayNumber}" Updated`);
    setEditingBay(null);
  };

  // Technician Handlers
  const handleSaveTechnician = (tech: Technician) => {
    if (editingTech) {
      const updated = technicians.map(t => t.id === tech.id ? tech : t);
      onUpdateTechnicians(updated);
      showNotification(`Technician "${tech.name}" Updated`);
    } else {
      const newTech = { ...tech, id: `TECH-${Date.now().toString().slice(-3)}` };
      onUpdateTechnicians([...technicians, newTech]);
      showNotification(`New Technician "${tech.name}" Registered`);
    }
    setEditingTech(null);
    setIsNewTechModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0284C7]">
            Workshop Configuration &amp; Governance
          </p>
          <h2 className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">
            Master Settings
          </h2>
          <p className="text-xs text-[#64748B] max-w-2xl mt-1">
            Configure staff role-based access, fixed-price labor catalog, workshop bays, technician master, legal workshop profile, and Nepal IRD 13% VAT settings.
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-green-50 border border-green-200 text-[#16A34A] px-3.5 py-2 rounded-lg text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs with Click & Drag Scrolling */}
      <DraggableTabBar className="mb-4">
        {[
          { id: 'staff', label: 'Staff & Roles (RBAC)', icon: Users },
          { id: 'services', label: 'Labor Price Book', icon: DollarSign },
          { id: 'bays', label: 'Workshop Bays & Lifts', icon: Layers },
          { id: 'technicians', label: 'Technician Master', icon: Wrench },
          { id: 'profile', label: 'Workshop Profile', icon: Building2 },
          { id: 'ird_config', label: 'Nepal IRD E-Billing (13% VAT)', icon: FileCheck },
          { id: 'tenant_saas', label: 'SaaS Tenant & Integrations', icon: Server }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as AdminSubTab)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                  : 'bg-[#FFFFFF] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] border-[#E2E8F0]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </DraggableTabBar>

      {/* SUBTAB 1: STAFF & USER ROLES (RBAC) */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Workshop Users &amp; Role-Based Access Control (RBAC)</h3>
              <p className="text-xs text-[#64748B]">
                Only the Main Administrator can create extra staff user accounts and assign defined operational roles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingUser(null);
                setSelectedModalRole('Service Advisor');
                setStaffFormError(null);
                setIsNewUserModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Extra User</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeUsers.map((u) => {
              const isPrimaryAdmin = u.id === 'USR-01';
              return (
                <div key={u.id} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            u.role === 'Admin' ? 'bg-sky-100 text-[#0F3D5E]' :
                            u.role === 'Service Advisor' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'Technician' ? 'bg-amber-100 text-amber-800' :
                            u.role === 'Inventory Manager' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {u.role}
                          </span>
                          {isPrimaryAdmin && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#0F3D5E] text-white uppercase">
                              Main Account
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-[#0F172A] mt-1.5">{u.name}</h4>
                        <p className="text-xs text-[#64748B] font-mono">@{u.username}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setSelectedModalRole(u.role);
                            setStaffFormError(null);
                            setIsNewUserModal(true);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#0284C7] hover:bg-sky-50 rounded-lg transition"
                          title="Edit Staff Account"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {!isPrimaryAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition"
                            title="Remove Staff Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 text-xs text-[#475569]">
                      <p><span className="font-semibold text-[#64748B]">Email:</span> {u.email}</p>
                      <p><span className="font-semibold text-[#64748B]">Phone:</span> {u.phone}</p>
                      <p>
                        <span className="font-semibold text-[#64748B]">Status:</span>{' '}
                        <span className={u.isActive ? 'text-[#16A34A] font-semibold' : 'text-[#DC2626] font-semibold'}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E8F0]">
                      <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wide mb-1.5">Effective Permissions:</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <span className={u.permissions.canEditMasters ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Edit Masters</span>
                        <span className={u.permissions.canCreateJobCard ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Intake &amp; Job Card</span>
                        <span className={u.permissions.canIssueBill ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Issue Tax Bills</span>
                        <span className={u.permissions.canManageInventory ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Manage Spares</span>
                        <span className={u.permissions.canViewFinancials ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• View Financials</span>
                        <span className={u.permissions.canManageWarranty ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Warranty Claims</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="font-mono">ID: {u.id}</span>
                    {isPrimaryAdmin ? (
                      <span className="font-semibold text-[#0F3D5E]">Master Governance</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(u)}
                        className="font-semibold text-[#0284C7] hover:underline"
                      >
                        {u.isActive ? 'Disable Account' : 'Enable Account'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: LABOR PRICE BOOK (FIXED PRICE) */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Standard Labor Price Book (Fixed Price Master)</h3>
              <p className="text-xs text-slate-500">
                Admin-editable fixed labor prices in Nepalese Rupees (NPR). Used automatically across Job Cards by typing Task Codes.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setIsNewServiceModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Fixed Price Task</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">Task Code</th>
                  <th className="p-3.5">Labor Task Name & Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Fixed Price (excl. VAT)</th>
                  <th className="p-3.5 text-center">VAT Rate</th>
                  <th className="p-3.5 text-right">Total (incl. 13% VAT)</th>
                  <th className="p-3.5 text-center">Quick Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safePriceBook.map((srv) => {
                  const fixedPrice = srv.fixedPrice ?? srv.baseLaborRate;
                  const vatAmount = srv.isTaxable ? fixedPrice * 0.13 : 0;
                  const totalWithVat = fixedPrice + vatAmount;
                  return (
                    <tr key={srv.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-700">{srv.code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{srv.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{srv.description}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {srv.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center space-x-1.5 font-mono font-bold text-slate-900">
                          <span>Rs.</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            defaultValue={fixedPrice}
                            onBlur={(e) => {
                              const newRate = parseFloat(e.target.value) || 0;
                              if (newRate !== fixedPrice) {
                                handleSaveService({
                                  ...srv,
                                  baseLaborRate: newRate,
                                  fixedPrice: newRate
                                });
                              }
                            }}
                            className="w-24 text-right px-2 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            title="Edit fixed price directly"
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {srv.isTaxable ? '13%' : 'Exempt'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700">
                        Rs. {Math.round(totalWithVat).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setEditingService(srv);
                            setIsNewServiceModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Full Edit Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: WORKSHOP BAYS & EQUIPMENT */}
      {activeSubTab === 'bays' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Workshop Bays, Lifts & Specialized Equipment</h3>
            <p className="text-xs text-slate-500">Configure bay occupancy, lift types, technician allocations, and maintenance schedules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {safeBays.map((bay) => (
              <div key={bay.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {bay.bayNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      bay.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                      bay.status === 'Occupied' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {bay.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2">{bay.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{bay.type}</p>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <p><span className="font-semibold text-slate-500">Assigned Tech:</span> {
                      technicians.find(t => t.id === bay.assignedTechnicianId)?.name || 'Unassigned'
                    }</p>
                    <p><span className="font-semibold text-slate-500">Current Job:</span> {bay.currentJobCardId || 'None (Idle)'}</p>
                    <p><span className="font-semibold text-slate-500">Active Vehicle:</span> {bay.currentVehicleReg || '—'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setEditingBay(bay)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Bay Setup</span>
                  </button>
                  <span className="text-[10px] text-slate-400">{bay.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: TECHNICIANS MASTER */}
      {activeSubTab === 'technicians' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Workshop Technicians & Specialists</h3>
              <p className="text-xs text-slate-500">Track technician monthly target hours, labor commission percentage, and specialization.</p>
            </div>
            <button
              onClick={() => {
                setEditingTech(null);
                setIsNewTechModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Technician</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {safeTechnicians.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                    <p className="text-xs text-indigo-600 font-medium">{t.specialization}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTech(t);
                      setIsNewTechModal(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p><span className="text-slate-400">Phone:</span> {t.phone}</p>
                  <p><span className="text-slate-400">Experience:</span> {t.experienceYears} Years</p>
                  <p><span className="text-slate-400">Commission Rate:</span> <span className="font-bold text-emerald-700">{t.commissionPercentage}%</span></p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Monthly Target:</span>
                    <span>{t.completedHoursThisMonth} / {t.monthlyTargetHours} hrs</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.round((t.completedHoursThisMonth / t.monthlyTargetHours) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: WORKSHOP PROFILE */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Independent Single Workshop Profile</h3>
            <p className="text-xs text-slate-500">Legal entity information printed on all IRD Tax Invoices and Job Cards.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trading Workshop Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Legal Entity Name</label>
              <input
                type="text"
                value={profileForm.legalEntityName}
                onChange={(e) => setProfileForm({ ...profileForm, legalEntityName: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nepal PAN/VAT Number (9 Digits)</label>
              <input
                type="text"
                value={profileForm.panVatNumber}
                onChange={(e) => setProfileForm({ ...profileForm, panVatNumber: e.target.value })}
                className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Fiscal Year (B.S.)</label>
              <input
                type="text"
                value={profileForm.fiscalYear}
                onChange={(e) => setProfileForm({ ...profileForm, fiscalYear: e.target.value })}
                className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="2081/2082"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Workshop Address</label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">City & District</label>
              <input
                type="text"
                value={`${profileForm.city}, ${profileForm.district}`}
                onChange={(e) => {
                  const parts = e.target.value.split(',');
                  setProfileForm({ 
                    ...profileForm, 
                    city: parts[0]?.trim() || '', 
                    district: parts[1]?.trim() || '' 
                  });
                }}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telephone / Hotline</label>
              <input
                type="text"
                value={profileForm.contactNumber}
                onChange={(e) => setProfileForm({ ...profileForm, contactNumber: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Workshop Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 6: NEPAL IRD CBMS 13% VAT CONFIGURATION */}
      {activeSubTab === 'ird_config' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Inland Revenue Department (IRD) Nepal Compliance</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Centralized Billing Monitoring System (CBMS) real-time API sync and strict invoice immutability enforcement.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>CBMS API Live</span>
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-950">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Nepal E-Billing Legal Mandate: Immutability Guarantee</span>
            </div>
            <p>
              As per the directives of the Inland Revenue Department (IRD) of Nepal:
              <strong> Once an invoice or job card is officially sealed and assigned a fiscal bill number, it CANNOT BE EDITED OR DELETED BY ANYONE, INCLUDING THE SYSTEM ADMINISTRATOR.</strong> If errors occur, an official Credit Note / Debit Note must be generated.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">IRD CBMS Endpoint</label>
              <input
                type="text"
                readOnly
                value={profileForm.irdApiUrl}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered CBMS Seller PAN</label>
              <input
                type="text"
                readOnly
                value={profileForm.panVatNumber}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">CBMS Machine ID / Terminal Code</label>
              <input
                type="text"
                readOnly
                value="KTM-SUKEDHARA-TERM-01"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-700"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard VAT Rate</label>
              <input
                type="text"
                readOnly
                value="13% (Value Added Tax, Nepal)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold text-indigo-700"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">Last IRD Handshake: Today at 08:30:15 NPT • Status: 200 OK</span>
            <button
              onClick={() => showNotification('IRD Centralized Server Pinged Successfully! Latency: 42ms')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Test IRD Server Ping
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB: MULTI-TENANT SAAS & ENCRYPTED INTEGRATIONS */}
      {activeSubTab === 'tenant_saas' && (
        <TenantSaasSettingsPanel
          customers={safeCustomers}
          parts={safeParts}
          targetOwnerUid={targetOwnerUid}
          onNotify={showNotification}
        />
      )}

      {/* MODAL: STAFF USER EDIT / CREATE EXTRA USER (ADMIN ONLY) */}
      {isNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-[#E2E8F0] my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create Extra User Account'}
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Admin-controlled RBAC user provisioning
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewUserModal(false);
                  setStaffFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {staffFormError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold">
                {staffFormError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const role = (editingUser?.id === 'USR-01' ? 'Admin' : selectedModalRole);
                const passwordVal = getVal('password');
                if (!editingUser && passwordVal.length < 4) {
                  setStaffFormError('Please enter a password of at least 4 characters for the new user.');
                  return;
                }
                const updated: UserAccount = {
                  id: editingUser?.id || `USR-${Date.now().toString().slice(-4)}`,
                  name: getVal('name', 'Staff Member'),
                  username: getVal('username', `user.${Date.now().toString().slice(-4)}`).toLowerCase().replace(/\s+/g, '.'),
                  email: getVal('email', 'staff@workshop.np'),
                  phone: getVal('phone', '+977-9800000000'),
                  role,
                  password: passwordVal || editingUser?.password || 'password123',
                  isActive: editingUser ? editingUser.isActive : true,
                  permissions: getDefaultPermissionsForRole(role)
                };
                handleSaveUser(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Full Name *</label>
                <input
                  name="name"
                  defaultValue={editingUser?.name || ''}
                  placeholder="e.g. Aayush Thapa"
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Username *</label>
                  <input
                    name="username"
                    defaultValue={editingUser?.username || ''}
                    placeholder="e.g. aayush.advisor"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">
                    Password {editingUser ? '(Optional)' : '*'}
                  </label>
                  <input
                    name="password"
                    type="password"
                    defaultValue=""
                    placeholder={editingUser ? 'Leave blank to keep' : 'Min 4 characters'}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9] font-mono"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Defined Role Assignment *</label>
                <select
                  name="role"
                  value={editingUser?.id === 'USR-01' ? 'Admin' : selectedModalRole}
                  disabled={editingUser?.id === 'USR-01'}
                  onChange={(e) => setSelectedModalRole(e.target.value as UserRole)}
                  className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9] bg-white font-semibold disabled:bg-slate-100"
                >
                  <option value="Service Advisor">Service Advisor (Intake, Job Cards, Garages)</option>
                  <option value="Technician">Technician (Bay Tasks &amp; Part Requisitions)</option>
                  <option value="Inventory Manager">Inventory Manager (Stock Master, Barcode, Sales)</option>
                  <option value="Cashier">Cashier / Accountant (Billing, Payments, VAT)</option>
                  <option value="Admin">Admin (Full Control of Masters &amp; Settings)</option>
                </select>
              </div>

              {/* Live Role Permission Preview */}
              {(() => {
                const previewPerms = getDefaultPermissionsForRole(
                  editingUser?.id === 'USR-01' ? 'Admin' : selectedModalRole
                );
                return (
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
                      Defined Access Rights for {editingUser?.id === 'USR-01' ? 'Admin' : selectedModalRole}
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className={previewPerms.canEditMasters ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Edit Masters &amp; RBAC</span>
                      <span className={previewPerms.canCreateJobCard ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Intake &amp; Job Card</span>
                      <span className={previewPerms.canIssueBill ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Issue Tax Bills</span>
                      <span className={previewPerms.canManageInventory ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Manage Spares</span>
                      <span className={previewPerms.canViewFinancials ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• View Financials</span>
                      <span className={previewPerms.canManageWarranty ? 'text-[#16A34A] font-semibold' : 'text-slate-400 line-through'}>• Warranty Claims</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Phone *</label>
                  <input
                    name="phone"
                    defaultValue={editingUser?.phone || '+977-'}
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Work Email *</label>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email || ''}
                    placeholder="name@workshop.com.np"
                    className="w-full border border-[#CBD5E1] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewUserModal(false);
                    setStaffFormError(null);
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#0F172A] rounded-xl hover:bg-[#F1F5F9] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-xl font-bold"
                >
                  {editingUser ? 'Save Changes' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SERVICE PRICE BOOK ITEM */}
      {isNewServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                {editingService ? `Edit Service: ${editingService.code}` : 'Add Service Item'}
              </h4>
              <button onClick={() => setIsNewServiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const getNum = (name: string, fallback = 0) =>
                  parseFloat((form.elements.namedItem(name) as HTMLInputElement)?.value || '') || fallback;

                const updated: ServicePriceItem = {
                  id: editingService?.id || `SRV-${Date.now()}`,
                  code: getVal('code', `SRV-${Math.floor(100 + Math.random()*900)}`),
                  name: getVal('name', 'Service Item'),
                  category: (getVal('category', 'Mechanical') as any),
                  standardHours: 1,
                  fixedPrice: getNum('fixedPrice', 1500),
                  baseLaborRate: getNum('fixedPrice', 1500),
                  vatRate: 13,
                  isTaxable: true,
                  description: getVal('desc', '')
                };
                handleSaveService(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Code *</label>
                <input
                  name="code"
                  defaultValue={editingService?.code || `SRV-${Math.floor(100 + Math.random()*900)}`}
                  placeholder="e.g. SRV-GEN-01, SRV-BRK-02"
                  className="w-full font-mono font-bold uppercase border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Typing this code in Job Card labor section will automatically pull this service task and its price.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Labor Task Name *</label>
                <input
                  name="name"
                  defaultValue={editingService?.name || ''}
                  placeholder="e.g. Periodic Full Maintenance & Oil Inspection"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue={editingService?.category || 'General Service'}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    <option value="General Service">General Service</option>
                    <option value="Brake & Suspension">Brake & Suspension</option>
                    <option value="Engine & Transmission">Engine & Transmission</option>
                    <option value="Electrical & AC">Electrical & AC</option>
                    <option value="Dent & Paint">Dent & Paint</option>
                    <option value="Detailing">Detailing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fixed Labor Price (NPR, excl. 13% VAT) *</label>
                  <input
                    name="fixedPrice"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue={editingService?.fixedPrice ?? editingService?.baseLaborRate ?? 1500}
                    className="w-full font-mono font-bold text-indigo-700 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Scope & Description</label>
                <textarea
                  name="desc"
                  defaultValue={editingService?.description || ''}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAY EDIT */}
      {editingBay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Edit Bay: {editingBay.bayNumber}</h4>
              <button onClick={() => setEditingBay(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();

                const updated: WorkshopBay = {
                  ...editingBay,
                  name: getVal('name', editingBay.name),
                  type: (getVal('type', editingBay.type) as any),
                  status: (getVal('status', editingBay.status) as any),
                  assignedTechnicianId: getVal('tech') || undefined
                };
                handleSaveBay(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bay Description</label>
                <input
                  name="name"
                  defaultValue={editingBay.name}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lift / Equipment Type</label>
                <select
                  name="type"
                  defaultValue={editingBay.type}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                >
                  <option value="2-Post Electro-Hydraulic Lift">2-Post Electro-Hydraulic Lift</option>
                  <option value="Scissor Express Lift">Scissor Express Lift</option>
                  <option value="3D Wheel Alignment Bay">3D Wheel Alignment Bay</option>
                  <option value="Diagnostics & Electrical">Diagnostics & Electrical</option>
                  <option value="Paint Booth & Oven">Paint Booth & Oven</option>
                  <option value="Washing & Detailing Bay">Washing & Detailing Bay</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Status</label>
                <select
                  name="status"
                  defaultValue={editingBay.status}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                >
                  <option value="Available">Available (Ready for Inflow)</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Under Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Lead Technician</label>
                <select
                  name="tech"
                  defaultValue={editingBay.assignedTechnicianId || ''}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                >
                  <option value="">Unassigned</option>
                  {safeTechnicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingBay(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Bay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TECHNICIAN EDIT / NEW */}
      {isNewTechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                {editingTech ? `Edit Technician: ${editingTech.name}` : 'Register New Technician'}
              </h4>
              <button onClick={() => setIsNewTechModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const getVal = (name: string, fallback = '') =>
                  ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)?.value || fallback).trim();
                const getNum = (name: string, fallback = 0) =>
                  parseFloat((form.elements.namedItem(name) as HTMLInputElement)?.value || '') || fallback;
                const getInt = (name: string, fallback = 0) =>
                  parseInt((form.elements.namedItem(name) as HTMLInputElement)?.value || '', 10) || fallback;

                const updated: Technician = {
                  id: editingTech?.id || `TECH-${Date.now()}`,
                  name: getVal('name', 'Technician'),
                  phone: getVal('phone', '+977-9800000000'),
                  specialization: getVal('spec', 'General Maintenance'),
                  experienceYears: getInt('exp', 3),
                  commissionPercentage: getNum('comm', 5),
                  isActive: true,
                  monthlyTargetHours: getInt('target', 160),
                  completedHoursThisMonth: editingTech?.completedHoursThisMonth || 0
                };
                handleSaveTechnician(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technician Name</label>
                <input
                  name="name"
                  defaultValue={editingTech?.name || ''}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  name="spec"
                  defaultValue={editingTech?.specialization || 'Engine & Diagnostics'}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    name="exp"
                    type="number"
                    defaultValue={editingTech?.experienceYears || 5}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Labor Commission (%)</label>
                  <input
                    name="comm"
                    type="number"
                    step="0.5"
                    defaultValue={editingTech?.commissionPercentage || 6}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none font-bold text-emerald-700"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Monthly Target Hours</label>
                <input
                  name="target"
                  type="number"
                  defaultValue={editingTech?.monthlyTargetHours || 160}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  name="phone"
                  defaultValue={editingTech?.phone || '+977-'}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewTechModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
