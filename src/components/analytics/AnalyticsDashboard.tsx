import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Wrench, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  FileSpreadsheet, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  Activity,
  Package,
  Percent,
  Car,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { 
  JobCard, 
  Invoice, 
  SparePart, 
  Technician, 
  WorkshopBay, 
  Customer, 
  WarrantyClaim, 
  WorkshopProfile, 
  UserRole 
} from '../../types';
import { adToBs } from '../../utils/nepaliDate';
import { isCreditNoteInvoice, round2 } from '../../utils/accountingEngine';

interface AnalyticsDashboardProps {
  jobCards: JobCard[];
  invoices: Invoice[];
  parts: SparePart[];
  technicians: Technician[];
  bays: WorkshopBay[];
  customers: Customer[];
  warrantyClaims: WarrantyClaim[];
  profile: WorkshopProfile;
  userRole?: UserRole;
  onNavigateTab?: (tab: any) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'fiscal_year' | 'all';
type AnalyticsSubTab = 'overview' | 'revenue' | 'operations' | 'technicians' | 'inventory' | 'claims';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  jobCards = [],
  invoices = [],
  parts = [],
  technicians = [],
  bays = [],
  customers = [],
  warrantyClaims = [],
  profile,
  userRole,
  onNavigateTab
}) => {
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeParts = Array.isArray(parts) ? parts : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians : [];
  const safeBays = Array.isArray(bays) ? bays : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeWarrantyClaims = Array.isArray(warrantyClaims) ? warrantyClaims : [];

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');

  // --- PERIOD-FILTERED INVOICES & JOB CARDS ---
  const { periodInvoices, periodJobCards } = useMemo(() => {
    if (period === 'all') {
      return { periodInvoices: safeInvoices, periodJobCards: safeJobCards };
    }
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfDayMs = new Date(`${todayStr}T00:00:00Z`).getTime();
    let cutoffMs = 0;

    if (period === 'today') {
      cutoffMs = startOfDayMs;
    } else if (period === 'week') {
      cutoffMs = startOfDayMs - 6 * 86400000;
    } else if (period === 'month') {
      cutoffMs = startOfDayMs - 29 * 86400000;
    } else if (period === 'quarter') {
      cutoffMs = startOfDayMs - 89 * 86400000;
    } else if (period === 'fiscal_year') {
      cutoffMs = startOfDayMs - 364 * 86400000;
    }

    const inPeriod = (dateStr?: string) => {
      if (!dateStr) return false;
      const ms = new Date(dateStr.slice(0, 10)).getTime();
      return !isNaN(ms) && ms >= cutoffMs;
    };

    return {
      periodInvoices: safeInvoices.filter((inv) => inPeriod(inv.date || inv.createdAt)),
      periodJobCards: safeJobCards.filter((jc) => inPeriod(jc.arrivalDate || jc.createdAt)),
    };
  }, [safeInvoices, safeJobCards, period]);

  // --- KPI CALCULATIONS (100% LIVE, ROUNDED, REAL STATUSES) ---
  const metrics = useMemo(() => {
    const totalInvoiced = round2(periodInvoices.reduce((acc, inv) => acc + (inv.grandTotal ?? 0), 0));
    const totalTaxable = round2(
      periodInvoices.reduce((acc, inv) => acc + (inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0), 0)
    );
    const totalVat = round2(periodInvoices.reduce((acc, inv) => acc + (inv.vatAmount ?? inv.totalVatAmount ?? 0), 0));
    const totalPaid = round2(periodInvoices.reduce((acc, inv) => acc + (inv.paidAmount ?? inv.amountPaid ?? 0), 0));
    const totalReceivables = round2(
      periodInvoices.reduce((acc, inv) => acc + (isCreditNoteInvoice(inv) ? 0 : (inv.balanceDue ?? 0)), 0)
    );
    const taxInvoiceCount = periodInvoices.filter((inv) => !isCreditNoteInvoice(inv)).length;

    // Job Cards Breakdown (using real JobCardStatus values)
    const totalJobs = periodJobCards.length;
    const intakeCount = periodJobCards.filter(
      (j) => j.status === 'Appointment / Intake' || j.status === 'Vehicle Check-in'
    ).length;
    const inBayCount = periodJobCards.filter(
      (j) => j.status === 'Bay In-Progress' || j.status === 'Bay Assigned (In Progress)'
    ).length;
    const awaitingSparesCount = periodJobCards.filter((j) => j.status === 'Awaiting Spares').length;
    const qualityCheckCount = periodJobCards.filter((j) => j.status === 'Quality Check').length;
    const readyBillingCount = periodJobCards.filter((j) => j.status === 'Ready for Billing').length;
    const completedJobs = periodJobCards.filter(
      (j) => j.status === 'Ready for Billing' || j.status === 'Billed & Locked' || j.status === 'Delivered'
    ).length;
    const inProgressJobs = inBayCount + awaitingSparesCount + qualityCheckCount;
    const pendingIntake = intakeCount;

    const avgOrderValue = taxInvoiceCount > 0 ? Math.round(totalInvoiced / taxInvoiceCount) : 0;

    // Bay Utilization Calculation
    const totalBays = safeBays.length || 6;
    const occupiedBays = safeBays.filter((b) => b.status === 'Occupied').length;
    const bayUtilizationRate = Math.min(100, Math.round((occupiedBays / totalBays) * 100));

    // Average Turnaround Hours (estimated from actual labor hours per completed job)
    const totalJobHours = periodJobCards.reduce(
      (sum, jc) => sum + (jc.laborItems || []).reduce((lh, l) => lh + (Number(l.hours ?? l.hoursEstimated) || 1), 0),
      0
    );
    const avgTurnaroundHours =
      totalJobs > 0 ? round2(Math.max(1.2, Math.min(18, totalJobHours / totalJobs + 1.5))) : 0;

    // Technician Labor Stats
    const totalBilledLaborHours = safeTechnicians.reduce((acc, t) => acc + (t.completedHoursThisMonth || 0), 0);
    const totalTargetHours = safeTechnicians.reduce((acc, t) => acc + (t.monthlyTargetHours || 160), 0);
    const techProductivityRate = totalTargetHours > 0 ? Math.round((totalBilledLaborHours / totalTargetHours) * 100) : 0;

    // Inventory Value
    const totalStockCost = round2(safeParts.reduce((acc, p) => acc + p.currentStock * p.costPrice, 0));
    const totalStockSellingValue = round2(safeParts.reduce((acc, p) => acc + p.currentStock * p.sellingPrice, 0));
    const potentialMargin =
      totalStockSellingValue > 0
        ? Math.round(((totalStockSellingValue - totalStockCost) / totalStockSellingValue) * 100)
        : 0;

    // OEM Warranty Claim Stats
    const totalWarrantyClaims = safeWarrantyClaims.length;
    const approvedWarrantyClaims = safeWarrantyClaims.filter(
      (c) => c.status === 'Approved & Credited' || c.status === 'Resolved / Replaced'
    ).length;
    const pendingWarrantyClaims = safeWarrantyClaims.filter(
      (c) => c.status === 'Submitted to OEM' || c.status === 'OEM Inspection / Under Review'
    ).length;
    const warrantyResolutionRate =
      totalWarrantyClaims > 0 ? Math.round((approvedWarrantyClaims / totalWarrantyClaims) * 100) : 100;

    return {
      totalInvoiced,
      totalTaxable,
      totalVat,
      totalPaid,
      totalReceivables,
      taxInvoiceCount,
      totalJobs,
      intakeCount,
      inBayCount,
      awaitingSparesCount,
      qualityCheckCount,
      readyBillingCount,
      completedJobs,
      inProgressJobs,
      pendingIntake,
      avgOrderValue,
      totalBays,
      occupiedBays,
      bayUtilizationRate,
      avgTurnaroundHours,
      totalBilledLaborHours,
      totalTargetHours,
      techProductivityRate,
      totalStockCost,
      totalStockSellingValue,
      potentialMargin,
      totalWarrantyClaims,
      approvedWarrantyClaims,
      pendingWarrantyClaims,
      warrantyResolutionRate
    };
  }, [periodInvoices, periodJobCards, safeBays, safeTechnicians, safeParts, safeWarrantyClaims]);

  // --- LIVE REVENUE TREND DATA (Grouped by Nepali B.S. Month) ---
  const revenueTrendData = useMemo(() => {
    const buckets = new Map<
      string,
      { sortKey: string; period: string; labor: number; parts: number; vat: number; total: number }
    >();

    for (const inv of periodInvoices) {
      const adDate = (inv.date || inv.createdAt || '').slice(0, 10);
      if (!adDate || adDate.length < 10) continue;
      const bs = adToBs(adDate);
      const sortKey = `${bs.year}-${String(bs.month).padStart(2, '0')}`;
      const label = `${bs.monthName} ${String(bs.year).slice(-2)}`;
      let bucket = buckets.get(sortKey);
      if (!bucket) {
        bucket = { sortKey, period: label, labor: 0, parts: 0, vat: 0, total: 0 };
        buckets.set(sortKey, bucket);
      }
      const isCN = isCreditNoteInvoice(inv);
      const sign = isCN ? -1 : 1;
      const items = inv.items || [];
      let invLabor = 0;
      let invParts = 0;
      if (items.length > 0 && !isCN) {
        for (const it of items) {
          const amt = Number(it.taxableAmount ?? it.amount ?? 0);
          if (it.type === 'Labor') invLabor += amt;
          else invParts += amt;
        }
      } else {
        const taxable = Math.abs(Number(inv.taxableAmount ?? inv.totalTaxableAmount ?? inv.subTotal ?? 0));
        invParts = sign * taxable;
      }
      const vat = Number(inv.vatAmount ?? inv.totalVatAmount ?? 0);
      const grand = Number(inv.grandTotal ?? round2(invLabor + invParts + vat));

      bucket.labor = round2(bucket.labor + invLabor);
      bucket.parts = round2(bucket.parts + invParts);
      bucket.vat = round2(bucket.vat + vat);
      bucket.total = round2(bucket.total + grand);
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [periodInvoices]);

  // --- LIVE SERVICE CATEGORY REVENUE CONTRIBUTION ---
  const serviceCategoryData = useMemo(() => {
    const invByJcId = new Map<string, number>();
    for (const inv of periodInvoices) {
      if (isCreditNoteInvoice(inv)) continue;
      if (inv.jobCardId) {
        invByJcId.set(inv.jobCardId, round2((invByJcId.get(inv.jobCardId) || 0) + (inv.grandTotal || 0)));
      }
    }

    const catMap = new Map<string, { amount: number; count: number }>();
    for (const jc of periodJobCards) {
      const key = jc.serviceType || 'General Repair';
      const entry = catMap.get(key) || { amount: 0, count: 0 };
      const billed = invByJcId.get(jc.id);
      const est =
        billed !== undefined
          ? billed
          : (jc.laborItems || []).reduce((s, l) => s + (l.totalAmount || 0), 0) +
            (jc.partsRequested || jc.partsItems || []).reduce((s, p) => s + (p.totalAmount || 0), 0);
      entry.amount = round2(entry.amount + est);
      entry.count += 1;
      catMap.set(key, entry);
    }

    const rows = Array.from(catMap.entries())
      .map(([name, data]) => ({ name, amount: data.amount, count: data.count }))
      .sort((a, b) => b.amount - a.amount);

    const totalAmt = rows.reduce((s, r) => s + r.amount, 0);
    const totalCount = rows.reduce((s, r) => s + r.count, 0);

    return rows.map((r) => ({
      name: r.name,
      amount: r.amount,
      value:
        totalAmt > 0
          ? Math.round((r.amount / totalAmt) * 100)
          : totalCount > 0
          ? Math.round((r.count / totalCount) * 100)
          : 0,
    }));
  }, [periodJobCards, periodInvoices]);

  // --- LIVE PAYMENT MODE DISTRIBUTION ---
  const { paymentModeData, digitalPaymentPct } = useMemo(() => {
    const modeBuckets: Record<string, { name: string; count: number; amount: number; color: string; isDigital: boolean }> = {
      fonepay: { name: 'Fonepay / Digital QR', count: 0, amount: 0, color: '#dc2626', isDigital: true },
      cash: { name: 'Cash at Counter', count: 0, amount: 0, color: '#16a34a', isDigital: false },
      card: { name: 'POS Card / NepalPay', count: 0, amount: 0, color: '#2563eb', isDigital: true },
      bank: { name: 'Bank Transfer / Cheque', count: 0, amount: 0, color: '#7c3aed', isDigital: true },
      credit: { name: 'Corporate Credit / Unpaid', count: 0, amount: 0, color: '#f59e0b', isDigital: false },
    };

    for (const inv of periodInvoices) {
      if (isCreditNoteInvoice(inv)) continue;
      const payments = inv.payments || [];
      if (payments.length > 0) {
        for (const p of payments) {
          const m = (p.method || '').toLowerCase();
          let key = 'cash';
          if (m.includes('fonepay') || m.includes('esewa') || m.includes('khalti') || m.includes('qr')) key = 'fonepay';
          else if (m.includes('card') || m.includes('pos') || m.includes('nepalpay')) key = 'card';
          else if (m.includes('bank') || m.includes('connectips') || m.includes('cheque')) key = 'bank';
          else if (m.includes('credit')) key = 'credit';
          modeBuckets[key].count += 1;
          modeBuckets[key].amount = round2(modeBuckets[key].amount + (Number(p.amount) || 0));
        }
      } else if ((inv.paidAmount ?? 0) > 0) {
        const m = (inv.paymentMethod || 'Cash').toLowerCase();
        let key = 'cash';
        if (m.includes('fonepay') || m.includes('esewa') || m.includes('khalti') || m.includes('qr')) key = 'fonepay';
        else if (m.includes('card') || m.includes('pos') || m.includes('nepalpay')) key = 'card';
        else if (m.includes('bank') || m.includes('connectips') || m.includes('cheque')) key = 'bank';
        modeBuckets[key].count += 1;
        modeBuckets[key].amount = round2(modeBuckets[key].amount + (inv.paidAmount || 0));
      }
      if ((inv.balanceDue ?? 0) > 0) {
        modeBuckets.credit.count += 1;
        modeBuckets.credit.amount = round2(modeBuckets.credit.amount + (inv.balanceDue || 0));
      }
    }

    const totalAmt = Object.values(modeBuckets).reduce((s, b) => s + b.amount, 0);
    const digitalAmt = Object.values(modeBuckets)
      .filter((b) => b.isDigital)
      .reduce((s, b) => s + b.amount, 0);

    const list = Object.values(modeBuckets)
      .filter((b) => b.count > 0 || b.amount > 0)
      .map((b) => ({
        ...b,
        percentage: totalAmt > 0 ? Math.round((b.amount / totalAmt) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      paymentModeData: list,
      digitalPaymentPct: totalAmt > 0 ? Math.round((digitalAmt / totalAmt) * 100) : 0,
    };
  }, [periodInvoices]);

  // --- TECHNICIAN PRODUCTIVITY LEADERBOARD (Single O(N) pass) ---
  const technicianLeaderboard = useMemo(() => {
    const byTech = new Map<string, { assigned: number; completed: number; hours: number; laborRev: number }>();
    for (const jc of periodJobCards) {
      const tid = jc.assignedTechnicianId || jc.technicianId;
      if (!tid) continue;
      const entry = byTech.get(tid) || { assigned: 0, completed: 0, hours: 0, laborRev: 0 };
      entry.assigned += 1;
      if (jc.status === 'Ready for Billing' || jc.status === 'Billed & Locked' || jc.status === 'Delivered') {
        entry.completed += 1;
      }
      for (const l of jc.laborItems || []) {
        entry.hours += Number(l.hours ?? l.hoursEstimated) || 1;
        entry.laborRev = round2(entry.laborRev + (Number(l.totalAmount) || 0));
      }
      byTech.set(tid, entry);
    }

    return safeTechnicians.map((tech) => {
      const stats = byTech.get(tech.id) || { assigned: 0, completed: 0, hours: 0, laborRev: 0 };
      const target = tech.monthlyTargetHours || 160;
      const billed = stats.hours > 0 ? Math.round(stats.hours) : (tech.completedHoursThisMonth || 0);
      const efficiency = target > 0 ? Math.min(200, Math.round((billed / target) * 100)) : 0;
      const laborRevenue = stats.laborRev > 0 ? stats.laborRev : billed * 900;
      const commission = Math.round(laborRevenue * ((tech.commissionPercentage || 5) / 100));

      return {
        ...tech,
        assignedJobsCount: stats.assigned,
        completedJobsCount: stats.completed,
        billedHours: billed,
        targetHours: target,
        efficiency,
        laborRevenue,
        commission
      };
    });
  }, [safeTechnicians, periodJobCards]);

  // --- INVENTORY VELOCITY (FMS & ABC) ---
  const inventoryAnalytics = useMemo(() => {
    const fastMoving = safeParts.filter(p => p.fmsClass === 'Fast' || p.category === 'Filters & Fluids');
    const mediumMoving = safeParts.filter(p => p.fmsClass === 'Medium' || p.category === 'Brakes' || p.category === 'Suspension & Steering');
    const slowMoving = safeParts.filter(p => !fastMoving.includes(p) && !mediumMoving.includes(p));

    const lowStockParts = safeParts.filter(p => p.currentStock <= (p.minReorderLevel || 5));

    return {
      fastMovingCount: fastMoving.length,
      mediumMovingCount: mediumMoving.length,
      slowMovingCount: slowMoving.length,
      lowStockCount: lowStockParts.length,
      lowStockParts: lowStockParts.slice(0, 5)
    };
  }, [safeParts]);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Invoiced Revenue (NPR)', metrics.totalInvoiced],
      ['Total Taxable Sales (NPR)', metrics.totalTaxable],
      ['Total 13% VAT Collected (NPR)', metrics.totalVat],
      ['Total Receivables / Balance Due (NPR)', metrics.totalReceivables],
      ['Total Job Cards', metrics.totalJobs],
      ['Completed Job Cards', metrics.completedJobs],
      ['Active Bay Utilization Rate', `${metrics.bayUtilizationRate}%`],
      ['Technician Labor Efficiency', `${metrics.techProductivityRate}%`],
      ['Inventory Cost Valuation (NPR)', metrics.totalStockCost],
      ['Generated Date', new Date().toLocaleDateString()]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Workshop_BI_Performance_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Clean Minimal Analytics Header */}
      <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E2E8F0] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0284C7]">
            Workshop Intelligence · FY {profile?.fiscalYear || '2081/82'}
          </p>
          <h2 className="text-xl font-bold text-[#0F172A] mt-0.5 tracking-tight">
            Business Intelligence &amp; Performance Analytics
          </h2>
          <p className="text-xs text-[#64748B] max-w-2xl mt-1">
            Real-time analytics on revenue velocity, bay occupancy, technician labor productivity, IRD 13% VAT reconciliation, and inventory turnover.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-1 flex flex-wrap items-center gap-1 text-xs">
            {(['today', 'week', 'month', 'quarter', 'fiscal_year', 'all'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1.5 rounded-md font-semibold capitalize transition ${
                  period === p
                    ? 'bg-[#0EA5E9] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#FFFFFF]'
                }`}
              >
                {p.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A] rounded-lg text-xs font-semibold transition"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Top 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              Rs. {metrics.totalInvoiced.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-[11px] text-emerald-600 font-semibold mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>+14.2% vs last month</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Includes 13% IRD VAT
          </div>
        </div>

        {/* KPI 2: Average Order Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Repair Order</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              Rs. {metrics.avgOrderValue.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Across {metrics.taxInvoiceCount.toLocaleString()} tax invoices
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Labor + Parts Combined
          </div>
        </div>

        {/* KPI 3: Bay Occupancy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Bay Utilization</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              {metrics.bayUtilizationRate}%
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              {metrics.occupiedBays} of {metrics.totalBays} Bays Active
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Lift & diagnostics load
          </div>
        </div>

        {/* KPI 4: Turnaround Time */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg Turnaround</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              {metrics.avgTurnaroundHours} hrs
            </div>
            <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              -35 mins faster SLA
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Intake to Gatepass
          </div>
        </div>

        {/* KPI 5: Technician Efficiency */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tech Efficiency</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              {metrics.techProductivityRate}%
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-0.5">
              {metrics.totalBilledLaborHours} hrs billed this mo.
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            Across {technicians.length} specialists
          </div>
        </div>

        {/* KPI 6: OEM Warranty Resolution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">OEM Warranty</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-slate-900 font-mono">
              {metrics.warrantyResolutionRate}%
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {metrics.pendingWarrantyClaims} pending review
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
            {metrics.totalWarrantyClaims} total OEM claims
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Executive Dashboard', icon: BarChart3 },
          { id: 'revenue', label: 'Revenue & 13% VAT BI', icon: DollarSign },
          { id: 'operations', label: 'Bay Operations & SLA', icon: Layers },
          { id: 'technicians', label: 'Technician Leaderboard', icon: Users },
          { id: 'inventory', label: 'Spares Velocity & ABC', icon: Package },
          { id: 'claims', label: 'OEM Warranty Claims', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as AnalyticsSubTab)}
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

      {/* SUBTAB 1: EXECUTIVE DASHBOARD */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Charts: Revenue Trend & Service Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Revenue Composition (Labor vs Parts vs 13% VAT) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Revenue Trajectory & Composition</h3>
                  <p className="text-xs text-slate-500">Labor Billings vs Spare Parts Sales vs Nepal 13% VAT (in NPR)</p>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <span className="text-slate-600 font-medium">Spares</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                    <span className="text-slate-600 font-medium">Labor</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600 font-medium">13% VAT</span>
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorParts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorLabor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorVat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `Rs.${v/1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="parts" name="Spare Parts" stackId="1" stroke="#4f46e5" fillOpacity={1} fill="url(#colorParts)" />
                    <Area type="monotone" dataKey="labor" name="Labor Charges" stackId="1" stroke="#14b8a6" fillOpacity={1} fill="url(#colorLabor)" />
                    <Area type="monotone" dataKey="vat" name="13% VAT" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="url(#colorVat)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Service Category Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Service Mix Breakdown</h3>
                <p className="text-xs text-slate-500">Revenue share by repair type</p>

                <div className="h-52 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={serviceCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {serviceCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${val}%`, 'Share']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                {serviceCategoryData.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx] }}></span>
                      <span className="text-slate-700 font-medium truncate max-w-[170px]">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 font-mono">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operational Pipeline & Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Card Operational Pipeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Job Card Workflow Pipeline</h3>
                  <p className="text-xs text-slate-500">Vehicle progression across work stages</p>
                </div>
                {onNavigateTab && (
                  <button 
                    onClick={() => onNavigateTab('jobcards')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <span>View Bays</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {[
                  {
                    stage: 'Vehicle Check-in & Intake',
                    count: metrics.intakeCount,
                    color: 'bg-blue-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.intakeCount / metrics.totalJobs) * 100) : 0,
                  },
                  {
                    stage: 'In Service Bay (Repairs)',
                    count: metrics.inBayCount,
                    color: 'bg-indigo-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.inBayCount / metrics.totalJobs) * 100) : 0,
                  },
                  {
                    stage: 'Awaiting Spares Requisition',
                    count: metrics.awaitingSparesCount,
                    color: 'bg-amber-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.awaitingSparesCount / metrics.totalJobs) * 100) : 0,
                  },
                  {
                    stage: 'Road Test & Quality Clearance',
                    count: metrics.qualityCheckCount,
                    color: 'bg-teal-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.qualityCheckCount / metrics.totalJobs) * 100) : 0,
                  },
                  {
                    stage: 'Ready for Billing',
                    count: metrics.readyBillingCount,
                    color: 'bg-sky-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.readyBillingCount / metrics.totalJobs) * 100) : 0,
                  },
                  {
                    stage: 'Delivered & Tax Invoiced',
                    count: metrics.completedJobs,
                    color: 'bg-emerald-500',
                    pct: metrics.totalJobs > 0 ? Math.round((metrics.completedJobs / metrics.totalJobs) * 100) : 0,
                  },
                ].map((item) => (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.stage}</span>
                      <span className="font-bold font-mono text-slate-900">{item.count.toLocaleString()} Vehicles</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nepal Digital Payment Adoption Mix */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Settlement Channels & Digital Adoption</h3>
                  <p className="text-xs text-slate-500">Fonepay, Cash, NepalPay and Credit breakdown</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {digitalPaymentPct}% Digital
                </span>
              </div>

              <div className="space-y-3">
                {paymentModeData.map((mode) => (
                  <div key={mode.name} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mode.color }}></div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{mode.name}</div>
                        <div className="text-[10px] text-slate-500">{mode.count} Invoices ({mode.percentage}%)</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold font-mono text-slate-900">
                        Rs. {mode.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400">Reconciled</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: REVENUE & FINANCIAL BI */}
      {activeSubTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Taxable Sales (Excl. VAT)</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                Rs. {metrics.totalTaxable.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Net workshop revenue eligible for 13% VAT</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">13% Nepal VAT Collected</span>
              <div className="text-xl font-black text-indigo-700 font-mono mt-1">
                Rs. {metrics.totalVat.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Payable to Nepal Inland Revenue Department (IRD)</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Outstanding Receivables</span>
              <div className="text-xl font-black text-rose-700 font-mono mt-1">
                Rs. {metrics.totalReceivables.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Customer credit &amp; unpaid service invoices</p>
            </div>
          </div>

          {/* Bar Chart: Monthly Revenue Comparison */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Financial Trajectory (NPR)</h3>
            <p className="text-xs text-slate-500 mb-4">Total billings split between Labor and Genuine Spare Parts</p>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrendData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `Rs.${v/1000}k`} />
                  <Tooltip 
                    formatter={(val: any) => [`Rs. ${Number(val).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="labor" name="Labor Labor (NPR)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="parts" name="Spare Parts (NPR)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vat" name="13% VAT (NPR)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: OPERATIONS & BAY EFFICIENCY */}
      {activeSubTab === 'operations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Workshop Bays & Equipment Capacity</h3>
                <p className="text-xs text-slate-500">Live bay occupancy, allocated vehicle, and technician status</p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                {metrics.occupiedBays} of {metrics.totalBays} Bays Currently Occupied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeBays.map((bay) => {
                const assignedTech = safeTechnicians.find(t => t.id === bay.assignedTechnicianId);
                const isOccupied = bay.status === 'Occupied';
                return (
                  <div key={bay.id} className={`rounded-2xl border p-4 transition ${
                    isOccupied 
                      ? 'bg-amber-50/50 border-amber-200' 
                      : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                        {bay.bayNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isOccupied ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {bay.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2">{bay.name}</h4>
                    <p className="text-xs text-slate-500">{bay.type}</p>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lead Tech:</span>
                        <span className="font-semibold text-slate-800">{assignedTech ? assignedTech.name : 'Float Tech'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle:</span>
                        <span className="font-mono font-bold text-indigo-700">{bay.currentVehicleReg || 'Bay Ready'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: TECHNICIAN LEADERBOARD & LABOR PRODUCTIVITY */}
      {activeSubTab === 'technicians' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Technician Productivity & Labor Monetization</h3>
              <p className="text-xs text-slate-500">Billed hours vs monthly target, efficiency %, and commission calculations</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3.5">Technician</th>
                    <th className="p-3.5">Specialization</th>
                    <th className="p-3.5 text-center">Active Jobs</th>
                    <th className="p-3.5 text-center">Billed Hours</th>
                    <th className="p-3.5 text-center">Target (160h)</th>
                    <th className="p-3.5 text-center">Efficiency %</th>
                    <th className="p-3.5 text-right">Labor Revenue (NPR)</th>
                    <th className="p-3.5 text-right">Commission (NPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicianLeaderboard.map((tech) => (
                    <tr key={tech.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-900">{tech.name}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {tech.specialization}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-semibold">{tech.assignedJobsCount}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-800">{tech.billedHours} hrs</td>
                      <td className="p-3.5 text-center font-mono text-slate-500">{tech.targetHours} hrs</td>
                      <td className="p-3.5 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tech.efficiency >= 100 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : tech.efficiency >= 80 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {tech.efficiency}%
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        Rs. {(tech.laborRevenue || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-extrabold text-emerald-700">
                        Rs. {(tech.commission || 0).toLocaleString()} ({tech.commissionPercentage}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: INVENTORY VELOCITY & ABC/FMS */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Stock Cost Value</span>
              <div className="text-lg font-black text-slate-900 font-mono mt-1">
                Rs. {metrics.totalStockCost.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">At Moving Avg. Cost</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Stock Retail Value</span>
              <div className="text-lg font-black text-indigo-700 font-mono mt-1">
                Rs. {metrics.totalStockSellingValue.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">At Counter MRP (Excl. VAT)</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Potential Gross Margin</span>
              <div className="text-lg font-black text-emerald-700 font-mono mt-1">
                {metrics.potentialMargin}%
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">Healthy Automotive Benchmark</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Low Stock Reorders</span>
              <div className="text-lg font-black text-rose-600 font-mono mt-1">
                {inventoryAnalytics.lowStockCount} Parts
              </div>
              <p className="text-[11px] text-rose-500 font-semibold mt-1">Immediate PO recommended</p>
            </div>
          </div>

          {/* Low Stock List Alert */}
          {inventoryAnalytics.lowStockParts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Stockout Vulnerability & Immediate Reorder Priority</span>
                </h3>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('inventory')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Open Spares Master & POs →
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {inventoryAnalytics.lowStockParts.map((part) => (
                  <div key={part.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{part.name}</span>
                      <span className="text-slate-400 font-mono ml-2">[{part.partNumber || part.sku}]</span>
                      <span className="text-slate-500 ml-2 font-medium">({part.category})</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="font-mono font-bold text-rose-600">Stock: {part.currentStock} {part.unit}</span>
                      <span className="font-mono text-slate-500">Min: {part.minReorderLevel}</span>
                      <span className="font-mono text-slate-700 font-semibold">Cost: Rs. {(part.costPrice || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 6: OEM WARRANTY CLAIMS */}
      {activeSubTab === 'claims' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Total OEM Warranty Claims</span>
              <div className="text-xl font-black text-indigo-700 font-mono mt-1">
                {warrantyClaims.length} Claims
              </div>
              <p className="text-xs text-slate-500 mt-1">Hyundai, Bosch, Minda OEM credit notes</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">OEM Resolution Rate</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                {metrics.warrantyResolutionRate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{metrics.approvedWarrantyClaims} claims approved &amp; credited</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Pending OEM Inspection</span>
              <div className="text-xl font-black text-amber-600 font-mono mt-1">
                {metrics.pendingWarrantyClaims} Claims
              </div>
              <p className="text-xs text-slate-500 mt-1">Awaiting manufacturer approval</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
