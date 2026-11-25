import React, { useMemo } from 'react';
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
  Technician, 
  WorkshopProfile,
  WarrantyClaim 
} from '../../types';
import { round2 } from '../../utils/accountingEngine';

interface WorkshopOverviewProps {
  jobCards: JobCard[];
  appointments: Appointment[];
  parts: SparePart[];
  invoices: Invoice[];
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
  const safeWarrantyClaims = Array.isArray(warrantyClaims) ? warrantyClaims.filter(Boolean) : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians.filter(Boolean) : [];

  const {
    activeJobCards,
    deliveredCards,
    lowStockParts,
    pendingWarranty,
    collectedRevenue,
    totalVat13Collected,
    bayOccupantMap,
  } = useMemo(() => {
    const active: JobCard[] = [];
    const delivered: JobCard[] = [];
    const bMap = new Map<number, JobCard>();

    for (const j of safeJobCards) {
      if (!j) continue;
      if (j.status === 'Delivered') {
        delivered.push(j);
      } else {
        active.push(j);
        const match = (j.bayNumber || '').match(/bay\s*(\d+)/i);
        if (match) {
          const idx = Number(match[1]);
          if (!bMap.has(idx)) bMap.set(idx, j);
        }
      }
    }

    const lowStock = safeParts.filter((p) => p && p.currentStock <= p.minReorderLevel);
    const pendingW = safeWarrantyClaims.filter(
      (w) => w && (w.status === 'Submitted to OEM' || w.status === 'OEM Inspection / Under Review')
    );

    let collected = 0;
    let vat13 = 0;
    for (const inv of safeInvoices) {
      collected = round2(collected + (inv.paidAmount ?? 0));
      vat13 = round2(vat13 + (inv.vatAmount ?? 0));
    }

    return {
      activeJobCards: active,
      deliveredCards: delivered,
      lowStockParts: lowStock,
      pendingWarranty: pendingW,
      collectedRevenue: collected,
      totalVat13Collected: vat13,
      bayOccupantMap: bMap,
    };
  }, [safeJobCards, safeParts, safeWarrantyClaims, safeInvoices]);

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
      {/* Clean Minimal Workshop Header */}
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0284C7]">
            AutoCraft Pro · FY {profile.fiscalYear} B.S. · PAN {profile.panVatNumber} · Nepal IRD 13% VAT
          </p>
          <h2 className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">
            {profile.name}
          </h2>
          <p className="text-xs text-[#64748B] max-w-xl mt-1">
            Real-time workshop operations, bay utilization, spares stock health, and IRD-compliant billing overview.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onNewIntake}
            className="px-4 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 whitespace-nowrap"
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
          className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] hover:border-[#0EA5E9]/60 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Vehicles in Workshop</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-[#0284C7] flex items-center justify-center group-hover:scale-105 transition">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F172A] font-mono mt-2">{activeJobCards.length}</div>
          <div className="text-[11px] text-[#64748B] mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            <span>{deliveredCards.length} vehicles delivered</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('billing')}
          className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] hover:border-[#16A34A]/60 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Payments Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-[#16A34A] flex items-center justify-center group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#16A34A] font-mono mt-2">Rs. {collectedRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Fonepay, NepalPay, eSewa</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('accounting')}
          className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] hover:border-[#0EA5E9]/60 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Nepal 13% VAT Output</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 text-[#0F3D5E] flex items-center justify-center group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F3D5E] font-mono mt-2">Rs. {totalVat13Collected.toLocaleString()}</div>
          <div className="text-[11px] text-[#64748B] mt-1">
            <span>Due to IRD: 25th of month</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('inventory')}
          className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] hover:border-[#F59E0B]/60 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Spares Low Stock Alert</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-2">{lowStockParts.length} SKUs</div>
          <div className="text-[11px] text-[#64748B] mt-1">
            <span>Critical replenishment required</span>
          </div>
        </div>
      </div>

      {/* Second Row: Workshop Bay Occupancy & Ongoing Repairs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bay Allocation Grid */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-[#0284C7]" />
                <span>Live Workshop Bay Allocation &amp; Occupancy</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Real-time technician utilization across workshop bays.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[#0F3D5E]">
              6 Active Service Bays
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {BAYS.map((b, i) => {
              const occupyingJc = bayOccupantMap.get(i + 1);
              const isOccupied = !!occupyingJc;

              return (
                <div
                  key={b.bay}
                  onClick={() => occupyingJc && onSelectJobCard(occupyingJc)}
                  className={`p-3.5 rounded-xl border transition-all duration-150 ${
                    isOccupied 
                      ? 'border-sky-300 bg-gradient-to-b from-white to-sky-50/60 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5' 
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-[#0F172A]">Bay {i + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      isOccupied ? 'bg-[#0F3D5E] text-white' : 'bg-slate-200 text-slate-600'
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

          {/* Quick OEM Warranty badge */}
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
          </div>
        </div>
      </div>
    </div>
  );
};
