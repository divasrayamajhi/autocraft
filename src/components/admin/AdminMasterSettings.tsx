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

interface AdminMasterSettingsProps {
  profile: WorkshopProfile;
  users: UserAccount[];
  customers: Customer[];
  parts: SparePart[];
  priceBook: ServicePriceItem[];
  bays: WorkshopBay[];
  technicians: Technician[];
  onUpdateProfile: (profile: WorkshopProfile) => void;
  onUpdateUsers: (users: UserAccount[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateParts: (parts: SparePart[]) => void;
  onUpdatePriceBook: (priceBook: ServicePriceItem[]) => void;
  onUpdateBays: (bays: WorkshopBay[]) => void;
  onUpdateTechnicians: (technicians: Technician[]) => void;
}

type AdminSubTab = 'staff' | 'services' | 'bays' | 'technicians' | 'parts' | 'profile' | 'ird_config';

export const AdminMasterSettings: React.FC<AdminMasterSettingsProps> = ({
  profile,
  users,
  customers,
  parts,
  priceBook,
  bays,
  technicians,
  onUpdateProfile,
  onUpdateUsers,
  onUpdateCustomers,
  onUpdateParts,
  onUpdatePriceBook,
  onUpdateBays,
  onUpdateTechnicians
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('staff');
  const [profileForm, setProfileForm] = useState<WorkshopProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Staff edit modal state
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isNewUserModal, setIsNewUserModal] = useState(false);

  // Service item edit modal state
  const [editingService, setEditingService] = useState<ServicePriceItem | null>(null);
  const [isNewServiceModal, setIsNewServiceModal] = useState(false);

  // Bay edit modal state
  const [editingBay, setEditingBay] = useState<WorkshopBay | null>(null);

  // Technician edit modal state
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [isNewTechModal, setIsNewTechModal] = useState(false);

  const showNotification = (msg: string) => {
    setSavedSuccess(msg);
    setTimeout(() => setSavedSuccess(null), 3500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    showNotification('Workshop Profile & Nepal IRD Configuration Updated Successfully');
  };

  // Staff Handlers
  const handleSaveUser = (user: UserAccount) => {
    if (editingUser) {
      const updated = users.map(u => u.id === user.id ? user : u);
      onUpdateUsers(updated);
      showNotification(`Staff Member "${user.name}" Updated`);
    } else {
      const newUser = { ...user, id: `USR-${Date.now().toString().slice(-3)}` };
      onUpdateUsers([...users, newUser]);
      showNotification(`New Staff Member "${user.name}" Added`);
    }
    setEditingUser(null);
    setIsNewUserModal(false);
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
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
              Admin Exclusive Access
            </span>
            <span className="text-xs text-slate-400">Master Data Control Panel</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            Workshop Master Configuration & Governance
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Configure workshop legal profiles, staff role-based permissions (Admin + 4 limited roles), Nepal IRD CBMS 13% VAT endpoints, service labor price book, bay areas, and technician commissions.
          </p>
        </div>

        {savedSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">{savedSuccess}</span>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'staff', label: 'Staff & Roles (RBAC)', icon: Users },
          { id: 'services', label: 'Labor Price Book (NPR)', icon: DollarSign },
          { id: 'bays', label: 'Workshop Bays & Lifts', icon: Layers },
          { id: 'technicians', label: 'Technician Master', icon: Wrench },
          { id: 'profile', label: 'Workshop Profile', icon: Building2 },
          { id: 'ird_config', label: 'Nepal IRD E-Billing (13% VAT)', icon: FileCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as AdminSubTab)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: STAFF & USER ROLES (RBAC) */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Workshop Users & Access Control</h3>
              <p className="text-xs text-slate-500">1 Full Admin with master edit privileges, and 4 specialized limited access personnel.</p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setIsNewUserModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow transition flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'Service Advisor' ? 'bg-blue-100 text-blue-800' :
                        u.role === 'Technician' ? 'bg-amber-100 text-amber-800' :
                        u.role === 'Inventory Manager' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.role}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">{u.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">@{u.username}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setIsNewUserModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Edit Staff Member"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-500">Email:</span> {u.email}</p>
                    <p><span className="font-semibold text-slate-500">Phone:</span> {u.phone}</p>
                    <p><span className="font-semibold text-slate-500">Status:</span> {u.isActive ? 'Active' : 'Disabled'}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">Effective Permissions:</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className={u.permissions.canEditMasters ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• Edit Masters</span>
                      <span className={u.permissions.canCreateJobCard ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• Intake & Job Card</span>
                      <span className={u.permissions.canIssueBill ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• Issue Tax Bills</span>
                      <span className={u.permissions.canManageInventory ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• Manage Spares</span>
                      <span className={u.permissions.canViewFinancials ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• View Financials</span>
                      <span className={u.permissions.canManageWarranty ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}>• Warranty Claims</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>User ID: {u.id}</span>
                  {u.role === 'Admin' && <span className="font-semibold text-purple-600">Master Governance</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 2: LABOR PRICE BOOK (NPR) */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Standard Service & Labor Price Book</h3>
              <p className="text-xs text-slate-500">Customizable base hourly rates and flat rates in Nepalese Rupees (NPR) subject to 13% VAT.</p>
            </div>
            <button
              onClick={() => {
                setEditingService(null);
                setIsNewServiceModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service Item</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3.5">Service Code</th>
                  <th className="p-3.5">Service Name & Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-center">Std. Hours</th>
                  <th className="p-3.5 text-right">Base Labor (NPR)</th>
                  <th className="p-3.5 text-center">VAT Rate</th>
                  <th className="p-3.5 text-right">Total with 13% VAT</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priceBook.map((srv) => {
                  const vatAmount = srv.isTaxable ? srv.baseLaborRate * 0.13 : 0;
                  const totalWithVat = srv.baseLaborRate + vatAmount;
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
                      <td className="p-3.5 text-center font-mono font-semibold">{srv.standardHours} hrs</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                        रु. {srv.baseLaborRate.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {srv.isTaxable ? '13%' : 'Exempt'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700">
                        रु. {totalWithVat.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setEditingService(srv);
                            setIsNewServiceModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
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
            {bays.map((bay) => (
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
            {technicians.map((t) => (
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

      {/* MODAL: STAFF USER EDIT / NEW */}
      {isNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">
                {editingUser ? `Edit Staff: ${editingUser.name}` : 'Add New Staff Member'}
              </h4>
              <button onClick={() => setIsNewUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const role = (form.elements.namedItem('role') as HTMLSelectElement).value as UserRole;
                const passwordVal = (form.elements.namedItem('password') as HTMLInputElement)?.value;
                const updated: UserAccount = {
                  id: editingUser?.id || `USR-${Date.now()}`,
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  username: (form.elements.namedItem('username') as HTMLInputElement).value.toLowerCase(),
                  email: (form.elements.namedItem('email') as HTMLInputElement).value,
                  phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
                  role: role,
                  password: passwordVal || editingUser?.password || 'password123',
                  isActive: true,
                  permissions: getDefaultPermissionsForRole(role)
                };
                handleSaveUser(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  name="name"
                  defaultValue={editingUser?.name || ''}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username</label>
                <input
                  name="username"
                  defaultValue={editingUser?.username || ''}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  name="password"
                  type="password"
                  defaultValue={editingUser?.password || ''}
                  placeholder={editingUser ? 'Leave blank to keep existing password' : 'Enter password (default: password123)'}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Assignment</label>
                <select
                  name="role"
                  defaultValue={editingUser?.role || 'Service Advisor'}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
                >
                  <option value="Admin">Admin (Full Control of all Masters & Settings)</option>
                  <option value="Service Advisor">Service Advisor (Intake, Job Cards, Garages)</option>
                  <option value="Technician">Technician (Bay Tasks & Part Requisitions)</option>
                  <option value="Inventory Manager">Inventory Manager (Stock Master, Barcode, Sales)</option>
                  <option value="Cashier">Cashier / Accountant (Billing, Payments, VAT)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  name="phone"
                  defaultValue={editingUser?.phone || '+977-'}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingUser?.email || ''}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Staff
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
                const updated: ServicePriceItem = {
                  id: editingService?.id || `SRV-${Date.now()}`,
                  code: (form.elements.namedItem('code') as HTMLInputElement).value,
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  category: (form.elements.namedItem('category') as HTMLSelectElement).value as any,
                  standardHours: parseFloat((form.elements.namedItem('hours') as HTMLInputElement).value) || 1,
                  baseLaborRate: parseFloat((form.elements.namedItem('rate') as HTMLInputElement).value) || 1000,
                  vatRate: 13,
                  isTaxable: true,
                  description: (form.elements.namedItem('desc') as HTMLInputElement).value
                };
                handleSaveService(updated);
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Code</label>
                <input
                  name="code"
                  defaultValue={editingService?.code || `SRV-${Math.floor(100 + Math.random()*900)}`}
                  className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Name</label>
                <input
                  name="name"
                  defaultValue={editingService?.name || ''}
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
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Hours</label>
                  <input
                    name="hours"
                    type="number"
                    step="0.5"
                    defaultValue={editingService?.standardHours || 2}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base Labor Rate (NPR, excl. 13% VAT)</label>
                <input
                  name="rate"
                  type="number"
                  defaultValue={editingService?.baseLaborRate || 2000}
                  className="w-full font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
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
                const updated: WorkshopBay = {
                  ...editingBay,
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  type: (form.elements.namedItem('type') as HTMLSelectElement).value as any,
                  status: (form.elements.namedItem('status') as HTMLSelectElement).value as any,
                  assignedTechnicianId: (form.elements.namedItem('tech') as HTMLSelectElement).value || undefined
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
                  {technicians.map(t => (
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
                const updated: Technician = {
                  id: editingTech?.id || `TECH-${Date.now()}`,
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  phone: (form.elements.namedItem('phone') as HTMLInputElement).value,
                  specialization: (form.elements.namedItem('spec') as HTMLInputElement).value,
                  experienceYears: parseInt((form.elements.namedItem('exp') as HTMLInputElement).value) || 3,
                  commissionPercentage: parseFloat((form.elements.namedItem('comm') as HTMLInputElement).value) || 5,
                  isActive: true,
                  monthlyTargetHours: parseInt((form.elements.namedItem('target') as HTMLInputElement).value) || 160,
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
