import React from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Car, 
  Layers, 
  ArrowUpRight,
  Sparkles,
  Calendar,
  PhoneCall,
  Activity,
  QrCode,
  Zap,
  Lock,
  Plus
} from 'lucide-react';
import { 
  JobCard, 
  Appointment, 
  SparePart, 
  Invoice, 
  InsuranceClaim, 
  Technician, 
  WorkshopProfile,
  WarrantyClaim 
} from '../../types';

interface WorkshopOverviewProps {
  jobCards: JobCard[];
  appointments: Appointment[];
  parts: SparePart[];
  invoices: Invoice[];
  claims: InsuranceClaim[];
  technicians: Technician[];
  warrantyClaims: WarrantyClaim[];
  profile: WorkshopProfile;
  onNavigateTab: (tab: any) => void;
  onSelectJobCard: (jc: JobCard) => void;
  onNewIntake: () => void;
}

export const WorkshopOverview: React.FC<WorkshopOverviewProps> = ({
  jobCards = [],
  appointments = [],
  parts = [],
  invoices = [],
  claims = [],
  technicians = [],
  warrantyClaims = [],
  profile,
  onNavigateTab,
  onSelectJobCard,
  onNewIntake
}) => {
  const safeJobCards = Array.isArray(jobCards) ? jobCards.filter(Boolean) : [];
  const safeAppointments = Array.isArray(appointments) ? appointments.filter(Boolean) : [];
  const safeParts = Array.isArray(parts) ? parts.filter(Boolean) : [];
  const safeInvoices = Array.isArray(invoices) ? invoices.filter(Boolean) : [];
  const safeClaims = Array.isArray(claims) ? claims.filter(Boolean) : [];
  const safeWarrantyClaims = Array.isArray(warrantyClaims) ? warrantyClaims.filter(Boolean) : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians.filter(Boolean) : [];

  const activeJobCards = safeJobCards.filter(j => j && j.status !== 'Delivered');
  const deliveredCards = safeJobCards.filter(j => j && j.status === 'Delivered');
  const lowStockParts = safeParts.filter(p => p && p.currentStock <= p.minReorderLevel);
  const pendingInsurance = safeClaims.filter(c => c && c.status !== 'Settled');
  const pendingWarranty = safeWarrantyClaims.filter(w => w && (w.status === 'Submitted to OEM' || w.status === 'OEM Inspection / Under Review'));

  // Revenue aggregates in NPR
  const totalGrossRevenue = safeInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const collectedRevenue = safeInvoices.reduce((acc, inv) => acc + (inv.paidAmount ?? 0), 0);
  const pendingReceivables = safeInvoices.reduce((acc, inv) => acc + (inv.balanceDue ?? 0), 0);
  const totalVat13Collected = safeInvoices.reduce((acc, inv) => acc + (inv.vatAmount ?? 0), 0);

  // Workshop Bay Occupancy Map
  const BAYS = [
    { bay: 'Bay 1 (Mechanical Lift)', type: 'Two-Post Hydraulic' },
    { bay: 'Bay 2 (Express Service)', type: 'Scissor Lift' },
    { bay: 'Bay 3 (3D Wheel Alignment)', type: 'Four-Post Aligner' },
    { bay: 'Bay 4 (Diagnostics)', type: 'OBD-II Scan Station' },
    { bay: 'Bay 5 (Body & Paint)', type: 'Tinkering / Spray' },
    { bay: 'Bay 6 (Wash & Detailing)', type: 'High-Pressure Wash' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & IRD Status Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              ● Nepal IRD CBMS Connected
            </span>
            <span className="text-xs text-slate-400">Fiscal Year {profile.fiscalYear} B.S.</span>
            <span className="text-xs text-indigo-400 font-bold">PAN: {profile.panVatNumber}</span>
          </div>
          <h2 className="text-2xl font-black mt-1 tracking-tight">
            {profile.name}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Autonomous Single Workshop DMS • 13% Nepal VAT Billing, Fonepay & NepalPay Dynamic QR, Warranty OEM Workflows, and Immutable Audit Trails.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNewIntake}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Vehicle Intake</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (All in NPR) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab('jobcards')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vehicles in Workshop</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">{activeJobCards.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{deliveredCards.length} vehicles delivered</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('billing')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-2">रु. {collectedRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Fonepay, NepalPay, eSewa</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('accounting')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nepal 13% VAT Output</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700 font-mono mt-2">रु. {totalVat13Collected.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Due to IRD: 25th of month</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-300 transition cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Spares Low Stock Alert</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-2">{lowStockParts.length} SKUs</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span>Critical replenishment required</span>
          </div>
        </div>
      </div>

      {/* Second Row: Workshop Bay Occupancy & Ongoing Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bay Allocation Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>Live Workshop Bay Allocation & Occupancy</span>
              </h3>
              <p className="text-xs text-slate-500">
                Real-time technician utilization across workshop bays.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">
              6 Active Service Bays
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {BAYS.map((b, i) => {
              const occupyingJc = activeJobCards.find(j => (j.bayNumber || '').toLowerCase().includes(`bay ${i + 1}`));
              const isOccupied = !!occupyingJc;

              return (
                <div
                  key={b.bay}
                  onClick={() => occupyingJc && onSelectJobCard(occupyingJc)}
                  className={`p-3.5 rounded-xl border transition ${
                    isOccupied 
                      ? 'border-indigo-300 bg-indigo-50/40 cursor-pointer hover:shadow-md' 
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-slate-800">Bay {i + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isOccupied ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isOccupied ? 'OCCUPIED' : 'VACANT'}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 block mb-2">{b.type}</span>

                  {isOccupied && occupyingJc ? (
                    <div className="space-y-1 pt-2 border-t border-indigo-100">
                      <div className="font-mono text-xs font-bold text-slate-900 truncate">
                        {occupyingJc.vehicle.registrationNumber}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate">
                        {occupyingJc.vehicle.brand} {occupyingJc.vehicle.model}
                      </div>
                      <div className="text-[10px] text-indigo-700 font-semibold truncate">
                        {occupyingJc.assignedTechnicianName || 'Workshop Tech'}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-400 italic">
                      Ready for next intake
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Quick Alerts & Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Upcoming Appointments</span>
            </h3>
            <span className="text-xs font-mono font-bold text-slate-500">
              {safeAppointments.length} scheduled
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px]">
            {safeAppointments.length === 0 ? (
              <p className="text-xs text-slate-400">No appointments scheduled today.</p>
            ) : (
              safeAppointments.slice(0, 4).map(apt => (
                <div key={apt.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-indigo-700">{apt.vehicleReg}</span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {apt.scheduledDate ? new Date(apt.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Scheduled'}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-800">{apt.customerName} ({apt.customerPhone})</div>
                  <div className="text-[11px] text-slate-500">{apt.serviceType}</div>
                </div>
              ))
            )}
          </div>

          {/* Quick Warranty & Insurance badges */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div 
              onClick={() => onNavigateTab('warranty')}
              className="flex justify-between items-center p-2.5 bg-purple-50 rounded-xl text-xs font-semibold text-purple-900 cursor-pointer hover:bg-purple-100 transition"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <span>Pending OEM Warranty Claims</span>
              </div>
              <span className="font-mono font-black">{pendingWarranty.length}</span>
            </div>

            <div 
              onClick={() => onNavigateTab('insurance')}
              className="flex justify-between items-center p-2.5 bg-blue-50 rounded-xl text-xs font-semibold text-blue-900 cursor-pointer hover:bg-blue-100 transition"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Cashless Insurance Claims</span>
              </div>
              <span className="font-mono font-black">{pendingInsurance.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
