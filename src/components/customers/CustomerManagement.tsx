import React, { useState } from 'react';
import { 
  Customer, 
  Vehicle, 
  Invoice, 
  JobCard, 
  UserRole 
} from '../../types';
import { 
  Users, 
  Car, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Search, 
  TrendingUp, 
  Calendar, 
  History, 
  DollarSign, 
  FileText,
  Building2,
  CheckCircle2,
  Wrench,
  X
} from 'lucide-react';

interface CustomerManagementProps {
  customers: Customer[];
  invoices: Invoice[];
  jobCards: JobCard[];
  userRole: UserRole;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onViewJobCard: (jcNumber: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  invoices,
  jobCards,
  userRole,
  onAddCustomer,
  onUpdateCustomer,
  onViewJobCard
}) => {
  const [activeTab, setActiveTab] = useState<'profiles' | 'sales_reports'>('profiles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customers[0] || null);

  // New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('+977-98');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('Kathmandu, Nepal');
  const [newCustType, setNewCustType] = useState<Customer['customerType']>('Individual');
  const [newCustPan, setNewCustPan] = useState('');
  const [newVehReg, setNewVehReg] = useState('');
  const [newVehBrand, setNewVehBrand] = useState('Hyundai');
  const [newVehModel, setNewVehModel] = useState('Creta');
  const [newVehYear, setNewVehYear] = useState(2022);

  // Filter customers by search
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.vehicles.some(v => v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const totalInvoicedSales = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone || !newVehReg) {
      alert('Customer name, phone, and vehicle registration are required.');
      return;
    }

    const created: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCustName,
      phone: newCustPhone,
      email: newCustEmail || 'customer@nepalmail.com',
      address: newCustAddress || 'Kathmandu, Nepal',
      panNumber: newCustPan || undefined,
      customerType: newCustType,
      createdAt: new Date().toISOString().slice(0, 10),
      totalSpent: 0,
      lastVisit: new Date().toISOString().slice(0, 10),
      vehicles: [
        {
          id: `VEH-${Date.now().toString().slice(-4)}`,
          registrationNumber: newVehReg.toUpperCase(),
          make: newVehBrand,
          brand: newVehBrand,
          model: newVehModel || 'Standard Variant',
          fuelType: 'Petrol',
          year: newVehYear,
          vinNumber: `VIN${newVehReg.replace(/[^A-Z0-9]/g, '')}`,
          engineNumber: `ENG${newVehReg.replace(/[^A-Z0-9]/g, '')}`,
          odometerReading: 25000,
          color: 'Pearl White'
        }
      ]
    };

    onAddCustomer(created);
    setSelectedCustomer(created);
    setIsAddCustomerOpen(false);

    // Reset Form
    setNewCustName('');
    setNewCustPhone('+977-98');
    setNewCustEmail('');
    setNewCustPan('');
    setNewVehReg('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
              activeTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Customer Directory ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales_reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
              activeTab === 'sales_reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Customer Sales & Loyalty Reports</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, reg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CUSTOMER PROFILES & VEHICLES */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Customer List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registered Clients
              </span>
              <span className="text-xs font-mono font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {filteredCustomers.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {filteredCustomers.map(cust => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-slate-900">{cust.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {cust.customerType}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono mt-1">{cust.phone}</div>

                    <div className="mt-2 flex items-center space-x-1 text-[11px] text-slate-600">
                      <Car className="w-3 h-3 text-slate-400" />
                      <span>{cust.vehicles.map(v => v.registrationNumber).join(', ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Customer Dossier & History */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCustomer ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {selectedCustomer.customerType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedCustomer.address}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Workshop Spend</span>
                      <span className="font-mono text-base font-black text-emerald-600">
                        रु. {selectedCustomer.totalSpent.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Mobile Phone</span>
                      <span className="font-mono font-bold text-slate-800">{selectedCustomer.phone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Email</span>
                      <span className="text-slate-800 truncate block">{selectedCustomer.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Nepal PAN No.</span>
                      <span className="font-mono font-bold text-slate-800">{selectedCustomer.panNumber || 'None (Consumer)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Member Since</span>
                      <span className="font-mono text-slate-800">{selectedCustomer.createdAt}</span>
                    </div>
                  </div>

                  {/* Registered Vehicles */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                      <Car className="w-4 h-4 text-indigo-600" />
                      <span>Registered Fleet / Vehicles ({selectedCustomer.vehicles.length})</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedCustomer.vehicles.map(veh => (
                        <div key={veh.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-xs text-slate-900">{veh.registrationNumber}</span>
                            <span className="text-[10px] text-slate-500">{veh.year}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold">{veh.brand} {veh.model}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Odo: {veh.odometerReading.toLocaleString()} km • Fuel: {veh.fuelType}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service History in Workshop */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center space-x-1.5">
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>Past Service Invoices & Visits</span>
                    </h4>

                    {invoices.filter(i => i.customerName === selectedCustomer.name).length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                        No historical visits recorded yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Invoice #</th>
                              <th className="p-2.5">Vehicle</th>
                              <th className="p-2.5 text-right">Amount (NPR)</th>
                              <th className="p-2.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(invoices || []).filter(i => i && i.customerName === selectedCustomer.name).map(inv => (
                              <tr key={inv.id}>
                                <td className="p-2.5 font-mono text-slate-600">{(inv.createdAt || inv.date || '').slice(0, 10)}</td>
                                <td className="p-2.5 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                                <td className="p-2.5 font-mono">{inv.vehicleReg}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  रु. {(inv.grandTotal || 0).toLocaleString()}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {inv.status || inv.paymentStatus || 'Paid'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                Select a customer from the left to view profile details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SALES REPORTS */}
      {activeTab === 'sales_reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer Lifetime Value (LTV) & Sales Rankings</h3>
              <p className="text-xs text-slate-500">Ranked by total historical workshop turnover</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Workshop Billed</span>
              <span className="font-mono text-lg font-black text-slate-900">रु. {totalInvoicedSales.toLocaleString()}</span>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Rank</th>
                <th className="p-3">Customer Name</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Vehicles Managed</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Lifetime Spent (NPR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...customers].sort((a, b) => b.totalSpent - a.totalSpent).map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{c.name}</td>
                  <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                  <td className="p-3 font-mono">{c.vehicles.map(v => v.registrationNumber).join(', ')}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {c.customerType}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                    रु. {c.totalSpent.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900">Add New Customer & Vehicle</h4>
              <button onClick={() => setIsAddCustomerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name</label>
                  <input
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    placeholder="e.g. Ramesh Shrestha"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                  <input
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="+977-9841..."
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Type</label>
                  <select
                    value={newCustType}
                    onChange={e => setNewCustType(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    <option value="Individual">Individual Vehicle Owner</option>
                    <option value="Fleet / Corporate">Fleet / Corporate Company</option>
                    <option value="Insurance Co. Partner">Insurance Co. Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nepal PAN / VAT (Optional)</label>
                  <input
                    value={newCustPan}
                    onChange={e => setNewCustPan(e.target.value)}
                    placeholder="9-digit PAN (e.g. 601928491)"
                    className="w-full font-mono border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address in Nepal</label>
                <input
                  value={newCustAddress}
                  onChange={e => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Baluwatar, Kathmandu"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              {/* Vehicle Initial Info */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-800 text-xs block mb-2">Primary Vehicle Details:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Vehicle Reg #</label>
                    <input
                      value={newVehReg}
                      onChange={e => setNewVehReg(e.target.value)}
                      placeholder="BA 02 CHA 9912"
                      className="w-full font-mono uppercase font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Make / Brand</label>
                    <input
                      value={newVehBrand}
                      onChange={e => setNewVehBrand(e.target.value)}
                      placeholder="Hyundai"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Model & Year</label>
                    <input
                      value={newVehModel}
                      onChange={e => setNewVehModel(e.target.value)}
                      placeholder="Creta 2022"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Save Customer Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
