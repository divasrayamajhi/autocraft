import React, { useState, useMemo } from 'react';
import { 
  Customer, 
  Vehicle, 
  Invoice, 
  JobCard, 
  UserRole,
  GatePass,
  WorkshopProfile
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
  X,
  Bell,
  Clock,
  AlertTriangle,
  MessageCircle,
  Share2,
  ExternalLink,
  Copy,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown
} from 'lucide-react';
import { VehicleServiceHistoryModal } from '../common/VehicleServiceHistoryModal';

interface CustomerManagementProps {
  customers: Customer[];
  invoices: Invoice[];
  jobCards: JobCard[];
  gatePasses?: GatePass[];
  userRole: UserRole;
  profile?: WorkshopProfile;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onViewJobCard: (jcNumber: string) => void;
}

interface ServiceReminderItem {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerType: string;
  vehicleId: string;
  registrationNumber: string;
  brand: string;
  model: string;
  year?: number;
  fuelType?: string;
  vinNumber?: string;
  engineNumber?: string;
  currentOdometer: number;
  lastServiceDate: string;
  lastServiceKm: number;
  lastServiceType: string;
  nextServiceDueDate: string;
  nextServiceDueKm: number;
  daysRemaining: number;
  kmRemaining: number;
  isKmExceeded: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean;
  isRecentlyServiced: boolean;
  matchingJobCardsCount: number;
  totalBilledAmount: number;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers = [],
  invoices = [],
  jobCards = [],
  gatePasses = [],
  userRole,
  profile,
  onAddCustomer,
  onUpdateCustomer,
  onViewJobCard
}) => {
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const [activeTab, setActiveTab] = useState<'profiles' | 'reminders' | 'sales_reports'>('reminders');
  
  // Search and Advanced Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomerType, setFilterCustomerType] = useState<string>('All');
  const [filterServiceStatus, setFilterServiceStatus] = useState<string>('All');
  const [filterSpendingTier, setFilterSpendingTier] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'spending' | 'recent'>('urgency');
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(safeCustomers[0] || null);
  const [historyModalTarget, setHistoryModalTarget] = useState<{
    vehicleReg: string;
    chassis?: string;
    customerName: string;
    customerPhone?: string;
  } | null>(null);

  // Copied feedback tooltip state
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Today reference for date calculations (normalized to midnight)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Compute Service Reminders for all vehicles across all customer garages
  const allServiceReminders: ServiceReminderItem[] = useMemo(() => {
    const reminders: ServiceReminderItem[] = [];

    safeCustomers.forEach(cust => {
      const vehList = cust.vehicles || [];
      vehList.forEach((veh, vIdx) => {
        const reg = (typeof veh === 'string' ? veh : veh?.registrationNumber || '').toUpperCase().trim();
        const vin = (typeof veh === 'object' && veh ? (veh.vinNumber || veh.chassisNumber || '') : '').toUpperCase().trim();
        const brand = typeof veh === 'object' && veh ? (veh.brand || veh.make || 'Generic') : 'Generic';
        const model = typeof veh === 'object' && veh ? (veh.model || 'Model') : 'Car';
        const year = typeof veh === 'object' && veh ? veh.year : undefined;
        const fuel = typeof veh === 'object' && veh ? veh.fuelType : 'Petrol';
        const engine = typeof veh === 'object' && veh ? veh.engineNumber : undefined;
        const odo = typeof veh === 'object' && veh ? (veh.odometerReading || 0) : 0;
        const vehId = (typeof veh === 'object' && veh && veh.id) || `veh-${cust.id}-${vIdx}`;

        // Match past job cards for this vehicle
        const cleanR = reg.replace(/[^A-Z0-9]/g, '');
        const cleanV = vin.replace(/[^A-Z0-9]/g, '');
        const matchingJobCards = jobCards.filter(jc => {
          const jcR = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const jcV = (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return (cleanR && jcR === cleanR) || (cleanV && jcV === cleanV);
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Match past invoices for this vehicle
        const matchingInvoices = invoices.filter(inv => {
          const invR = (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const isJcMatch = matchingJobCards.some(jc => jc.id === inv.jobCardId || jc.jobCardNumber === inv.jobCardNumber);
          return (cleanR && invR === cleanR) || isJcMatch;
        });

        const totalBilled = matchingInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0) || 
          (typeof veh === 'object' && veh?.totalBilledAmount ? veh.totalBilledAmount : 0);

        // Determine last service date and last odometer
        const latestJc = matchingJobCards[0];
        const lastServiceDate = (typeof veh === 'object' && veh?.lastServiceDate) ||
          latestJc?.arrivalDate ||
          latestJc?.createdAt?.slice(0, 10) ||
          matchingInvoices[0]?.date?.slice(0, 10) ||
          new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const lastServiceKm = latestJc?.vehicle?.odometerReading || 
          (typeof veh === 'object' && veh?.odometerReading) || 
          25000;

        const currentOdometer = odo || lastServiceKm;

        const lastServiceType = latestJc?.serviceType || 
          (typeof veh === 'object' && veh?.lastServiceType) || 
          'Scheduled PMS Inspection';

        // Check if service was performed today
        const todayStr = today.toISOString().slice(0, 10);
        const isServicedToday = lastServiceDate === todayStr;

        // RULE: Every 4 months (120 days) OR every 5,000 km — whichever comes first.
        // When service is recorded today:
        // 1. Day-based countdown resets to exactly 120 days
        // 2. Odometer-based countdown resets to Current Odometer + 5,000 km
        let nextServiceDueDate: string;
        if (isServicedToday) {
          nextServiceDueDate = new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        } else if (typeof veh === 'object' && veh?.nextServiceDueDate) {
          // If stored due date was previously set beyond 120 days from lastServiceDate, clamp it
          const lastDateObj = new Date(lastServiceDate);
          const maxAllowedTime = lastDateObj.getTime() + 120 * 24 * 60 * 60 * 1000;
          const storedTime = new Date(veh.nextServiceDueDate).getTime();
          if (storedTime > maxAllowedTime) {
            nextServiceDueDate = new Date(maxAllowedTime).toISOString().slice(0, 10);
          } else {
            nextServiceDueDate = veh.nextServiceDueDate;
          }
        } else if (latestJc?.nextServiceDueDate) {
          const lastDateObj = new Date(lastServiceDate);
          const maxAllowedTime = lastDateObj.getTime() + 120 * 24 * 60 * 60 * 1000;
          const storedTime = new Date(latestJc.nextServiceDueDate).getTime();
          if (storedTime > maxAllowedTime) {
            nextServiceDueDate = new Date(maxAllowedTime).toISOString().slice(0, 10);
          } else {
            nextServiceDueDate = latestJc.nextServiceDueDate;
          }
        } else {
          const lastDateObj = new Date(lastServiceDate);
          nextServiceDueDate = new Date(lastDateObj.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        }

        // Calculate next service due km (Current/Last Odometer + 5000 km)
        let nextServiceDueKm: number;
        if (isServicedToday) {
          nextServiceDueKm = currentOdometer + 5000;
        } else if (typeof veh === 'object' && veh?.nextServiceDueKm) {
          nextServiceDueKm = veh.nextServiceDueKm;
        } else if (latestJc?.nextServiceDueKm) {
          nextServiceDueKm = latestJc.nextServiceDueKm;
        } else {
          nextServiceDueKm = lastServiceKm + 5000;
        }

        // Calculate days remaining with strict maximum cap of 120 days
        const dueDateObj = new Date(nextServiceDueDate);
        dueDateObj.setHours(0, 0, 0, 0);
        const diffMs = dueDateObj.getTime() - today.getTime();
        const rawDaysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const daysRemaining = isServicedToday ? 120 : Math.min(120, rawDaysRemaining);

        // Calculate km remaining
        const kmRemaining = Math.max(0, nextServiceDueKm - currentOdometer);
        const isKmExceeded = currentOdometer >= nextServiceDueKm;

        // System determines next service based on whichever threshold is reached first:
        // - Overdue if daysRemaining < 0 OR isKmExceeded
        // - Due today if daysRemaining === 0 OR (kmRemaining === 0 && !isKmExceeded)
        // - Due soon if daysRemaining <= 15 OR kmRemaining <= 500
        const isDueToday = daysRemaining === 0 || (kmRemaining === 0 && !isKmExceeded);
        const isOverdue = daysRemaining < 0 || isKmExceeded;
        const isDueSoon = !isOverdue && !isDueToday && (daysRemaining <= 15 || kmRemaining <= 500);
        const isRecentlyServiced = isServicedToday || (daysRemaining >= 115 && !isOverdue);

        reminders.push({
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone,
          customerType: cust.customerType || 'Individual',
          vehicleId: vehId,
          registrationNumber: reg,
          brand,
          model,
          year,
          fuelType: fuel,
          vinNumber: vin,
          engineNumber: engine,
          currentOdometer,
          lastServiceDate,
          lastServiceKm,
          lastServiceType,
          nextServiceDueDate,
          nextServiceDueKm,
          daysRemaining,
          kmRemaining,
          isKmExceeded,
          isOverdue,
          isDueToday,
          isDueSoon,
          isRecentlyServiced,
          matchingJobCardsCount: matchingJobCards.length,
          totalBilledAmount: totalBilled
        });
      });
    });

    // Sort: user requirement:
    // "the newer one with less day remaining will be on top and those who recently serviced with high number will be on the bottom"
    return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [safeCustomers, jobCards, invoices, today]);

  // Overall Reminder Statistics
  const overdueCount = allServiceReminders.filter(r => r.isOverdue).length;
  const dueTodayCount = allServiceReminders.filter(r => r.isDueToday).length;
  const dueSoonCount = allServiceReminders.filter(r => r.isDueSoon).length;
  const safeCount = allServiceReminders.filter(r => r.daysRemaining > 15).length;

  // Multi-dataset Comprehensive Search & Filtering for Customers
  const filteredCustomers = useMemo(() => {
    return safeCustomers.filter(c => {
      // 1. Text Search across every data set field
      const q = searchQuery.toLowerCase().trim();
      let matchesQuery = true;
      if (q) {
        const nameMatch = c.name.toLowerCase().includes(q);
        const phoneMatch = c.phone.toLowerCase().includes(q);
        const emailMatch = (c.email || '').toLowerCase().includes(q);
        const addressMatch = (c.address || '').toLowerCase().includes(q);
        const panMatch = (c.panNumber || c.panVatNumber || '').toLowerCase().includes(q);
        const typeMatch = (c.customerType || '').toLowerCase().includes(q);
        
        // Match in vehicles
        const vehicleMatch = (c.vehicles || []).some(v => {
          const reg = (typeof v === 'string' ? v : v?.registrationNumber || '').toLowerCase();
          const make = (typeof v === 'object' && v?.make || '').toLowerCase();
          const brand = (typeof v === 'object' && v?.brand || '').toLowerCase();
          const model = (typeof v === 'object' && v?.model || '').toLowerCase();
          const vin = (typeof v === 'object' && (v?.vinNumber || v?.chassisNumber || '')).toLowerCase();
          const eng = (typeof v === 'object' && (v?.engineNumber || '')).toLowerCase();
          return reg.includes(q) || make.includes(q) || brand.includes(q) || model.includes(q) || vin.includes(q) || eng.includes(q);
        });

        // Match in invoices for this customer
        const invoiceMatch = invoices.some(inv => 
          (inv.customerId === c.id || inv.customerName.toLowerCase().includes(q)) &&
          (inv.invoiceNumber.toLowerCase().includes(q) || (inv.vehicleReg || '').toLowerCase().includes(q))
        );

        // Match in job cards for this customer
        const jobCardMatch = jobCards.some(jc => 
          (jc.customerId === c.id || jc.customerName.toLowerCase().includes(q)) &&
          (jc.jobCardNumber.toLowerCase().includes(q) || (jc.vehicle?.registrationNumber || '').toLowerCase().includes(q))
        );

        matchesQuery = nameMatch || phoneMatch || emailMatch || addressMatch || panMatch || typeMatch || vehicleMatch || invoiceMatch || jobCardMatch;
      }

      // 2. Customer Type Filter
      let matchesType = true;
      if (filterCustomerType !== 'All') {
        matchesType = c.customerType === filterCustomerType;
      }

      // 3. Service Status Filter
      let matchesServiceStatus = true;
      if (filterServiceStatus !== 'All') {
        const customerReminders = allServiceReminders.filter(r => r.customerId === c.id);
        if (filterServiceStatus === 'Overdue') {
          matchesServiceStatus = customerReminders.some(r => r.isOverdue);
        } else if (filterServiceStatus === 'DueToday') {
          matchesServiceStatus = customerReminders.some(r => r.isDueToday);
        } else if (filterServiceStatus === 'DueSoon') {
          matchesServiceStatus = customerReminders.some(r => r.isDueSoon);
        } else if (filterServiceStatus === 'Safe') {
          matchesServiceStatus = customerReminders.some(r => r.daysRemaining > 15);
        }
      }

      // 4. Spending Tier Filter
      let matchesSpending = true;
      if (filterSpendingTier !== 'All') {
        const spent = c.totalSpent || 0;
        if (filterSpendingTier === 'High') {
          matchesSpending = spent >= 50000;
        } else if (filterSpendingTier === 'Mid') {
          matchesSpending = spent >= 15000 && spent < 50000;
        } else if (filterSpendingTier === 'Low') {
          matchesSpending = spent < 15000;
        }
      }

      return matchesQuery && matchesType && matchesServiceStatus && matchesSpending;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'spending') {
        return (b.totalSpent || 0) - (a.totalSpent || 0);
      }
      if (sortBy === 'recent') {
        return new Date(b.lastVisit || b.createdAt).getTime() - new Date(a.lastVisit || a.createdAt).getTime();
      }
      // Default: urgency (customer with least days remaining on their vehicles first)
      const minDaysA = Math.min(...allServiceReminders.filter(r => r.customerId === a.id).map(r => r.daysRemaining), 999);
      const minDaysB = Math.min(...allServiceReminders.filter(r => r.customerId === b.id).map(r => r.daysRemaining), 999);
      return minDaysA - minDaysB;
    });
  }, [safeCustomers, searchQuery, filterCustomerType, filterServiceStatus, filterSpendingTier, sortBy, invoices, jobCards, allServiceReminders]);

  // Filtered Service Reminders for the Reminders Tab
  const filteredReminders = useMemo(() => {
    return allServiceReminders.filter(r => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        matchesSearch = 
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          r.registrationNumber.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q) ||
          r.model.toLowerCase().includes(q) ||
          (r.vinNumber || '').toLowerCase().includes(q) ||
          (r.engineNumber || '').toLowerCase().includes(q);
      }

      // Customer Type
      let matchesType = true;
      if (filterCustomerType !== 'All') {
        matchesType = r.customerType === filterCustomerType;
      }

      // Service Urgency Status
      let matchesStatus = true;
      if (filterServiceStatus === 'Overdue') {
        matchesStatus = r.isOverdue;
      } else if (filterServiceStatus === 'DueToday') {
        matchesStatus = r.isDueToday;
      } else if (filterServiceStatus === 'DueSoon') {
        matchesStatus = r.isDueSoon;
      } else if (filterServiceStatus === 'Safe') {
        matchesStatus = r.daysRemaining > 15;
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [allServiceReminders, searchQuery, filterCustomerType, filterServiceStatus]);

  const totalInvoicedSales = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);

  // Helper to generate official WhatsApp Reminder message using centralized Trading Workshop Name
  const getWhatsAppMessage = (item: ServiceReminderItem) => {
    const tradingName = profile?.name || 'Multi-Brand Auto Workshop';
    const contactPhone = profile?.contactNumber || '+977-9851087654';
    const addressStr = profile?.address 
      ? `${profile.address}, ${profile.city || 'Kathmandu'}`
      : 'Ring Road, Sukedhara-04, Kathmandu';

    const statusNote = item.daysRemaining < 0
      ? `⚠️ OVERDUE by ${Math.abs(item.daysRemaining)} Days (Exceeded 120 Days / 5,000 km interval)`
      : item.daysRemaining === 0
        ? `🚨 SERVICE DUE TODAY (0 Days Remaining • 120-Day / 5,000 km threshold)`
        : `⏳ Service Due in ${item.daysRemaining} Days (${item.nextServiceDueDate})`;

    return `Namaste ${item.customerName} ji,\n\nThis is a periodic service reminder from ${tradingName} regarding your vehicle:\n\n🚗 Vehicle: ${item.brand} ${item.model} (${item.registrationNumber})\n📅 Scheduled Due Date: ${item.nextServiceDueDate}\n🛣️ Target Service Odometer: ${(item.nextServiceDueKm || 0).toLocaleString()} km\n⏱️ Current Status: ${statusNote}\n\nOur standard PMS service interval is 5,000 km or 4 months (120 days) whichever comes first to maintain optimal safety, fuel efficiency, and vehicle health.\n\nPlease visit our workshop or reply to book your priority service bay slot.\n\n📍 ${addressStr}\n📞 ${contactPhone}`;
  };

  const handleSendWhatsApp = (item: ServiceReminderItem) => {
    let cleanPhone = item.customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && cleanPhone.startsWith('9')) {
      cleanPhone = `977${cleanPhone}`;
    } else if (cleanPhone.length === 9 && cleanPhone.startsWith('1')) {
      cleanPhone = `977${cleanPhone}`;
    }
    const message = getWhatsAppMessage(item);
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopyReminder = (item: ServiceReminderItem) => {
    const text = getWhatsAppMessage(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.vehicleId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Quick action: record service performed today -> resets to exactly 120 days & currentOdo + 5,000 km
  const handleRecordServiceToday = (item: ServiceReminderItem) => {
    const cust = customers.find(c => c.id === item.customerId);
    if (!cust) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const nextDueDateStr = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const nextDueKm = item.currentOdometer + 5000;

    const updatedVehicles = cust.vehicles.map(v => {
      const vId = typeof v === 'object' ? v.id : v;
      if (vId === item.vehicleId) {
        if (typeof v === 'object') {
          return {
            ...v,
            lastServiceDate: todayStr,
            lastServiceKm: item.currentOdometer,
            lastServiceType: 'PMS Scheduled Inspection & Servicing',
            nextServiceDueDate: nextDueDateStr,
            nextServiceDueKm: nextDueKm
          };
        }
      }
      return v;
    });

    const updatedCustomer: Customer = {
      ...cust,
      lastVisit: todayStr,
      vehicles: updatedVehicles
    };

    onUpdateCustomer(updatedCustomer);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone || !newVehReg) {
      alert('Customer name, phone, and vehicle registration are required.');
      return;
    }

    const cleanReg = newVehReg.trim().toUpperCase();
    const createdDate = new Date().toISOString().slice(0, 10);
    // Interval rule: 120 days or 5000 km
    const nextDue = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const created: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || 'customer@nepalmail.com',
      address: newCustAddress.trim() || 'Kathmandu, Nepal',
      panNumber: newCustPan.trim() || undefined,
      customerType: newCustType,
      createdAt: createdDate,
      totalSpent: 0,
      lastVisit: createdDate,
      vehicles: [
        {
          id: `VEH-${Date.now().toString().slice(-4)}`,
          registrationNumber: cleanReg,
          make: newVehBrand.trim(),
          brand: newVehBrand.trim(),
          model: newVehModel.trim() || 'Standard Variant',
          fuelType: 'Petrol',
          year: newVehYear,
          vinNumber: `VIN${cleanReg.replace(/[^A-Z0-9]/g, '')}`,
          engineNumber: `ENG${cleanReg.replace(/[^A-Z0-9]/g, '')}`,
          odometerReading: 25000,
          color: 'Pearl White',
          lastServiceDate: createdDate,
          nextServiceDueDate: nextDue,
          nextServiceDueKm: 30000
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
    <div className="space-y-5">
      {/* Top Banner: Service Interval Policy & Global Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-indigo-900/50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                SYSTEM STANDARD INTERVAL
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Nepal Automotive Engineering Policy
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <span>Standard Service Interval: 5,000 km or 4 Months (120 Days)</span>
              <span className="text-xs text-indigo-300 font-normal hidden sm:inline">(Whichever Comes First)</span>
            </h2>
            <p className="text-[11px] text-slate-400 max-w-2xl">
              All client garage vehicles track scheduled maintenance countdowns. When serviced, the timer resets to 120 days. Vehicles past 120 days turn red until serviced.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-center min-w-[90px]">
              <span className="text-[10px] font-bold text-rose-300 block uppercase">Overdue (&gt;120d)</span>
              <span className="text-lg font-mono font-black text-rose-400">{overdueCount}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-amber-300 block uppercase">Due Soon</span>
              <span className="text-lg font-mono font-black text-amber-400">{dueTodayCount + dueSoonCount}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-center min-w-[85px]">
              <span className="text-[10px] font-bold text-emerald-300 block uppercase">Safe / Active</span>
              <span className="text-lg font-mono font-black text-emerald-400">{safeCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Primary Actions */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'reminders'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Service Reminders & Upcoming Services ({allServiceReminders.length})</span>
            {overdueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-700 font-black">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'profiles'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customer Garages & Profiles ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales_reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition whitespace-nowrap ${
              activeTab === 'sales_reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Sales & LTV Reports</span>
          </button>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition shrink-0 w-full sm:w-auto justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Customer Garage</span>
        </button>
      </div>

      {/* Universal Search & Multi-Dataset Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          {/* Main Search Input: across every dataset field */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search across all data: customer name, phone, email, PAN, reg, chassis, engine, brand, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dataset Filters */}
          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto text-xs">
            {/* Customer Type Filter */}
            <select
              value={filterCustomerType}
              onChange={(e) => setFilterCustomerType(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-xs shrink-0"
            >
              <option value="All">All Client Types</option>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate / Fleet</option>
              <option value="Insurance Partner">Insurance Partner</option>
            </select>

            {/* Service Status Filter */}
            <select
              value={filterServiceStatus}
              onChange={(e) => setFilterServiceStatus(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-xs shrink-0"
            >
              <option value="All">All Service Statuses</option>
              <option value="Overdue">⚠️ Overdue (&gt; 120 Days)</option>
              <option value="DueToday">🚨 Due Today (0 Days)</option>
              <option value="DueSoon">⏳ Due Soon (1-15 Days)</option>
              <option value="Safe">✅ Safe / Recently Serviced</option>
            </select>

            {/* Spending Tier Filter */}
            <select
              value={filterSpendingTier}
              onChange={(e) => setFilterSpendingTier(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-xs shrink-0"
            >
              <option value="All">All Spend Tiers</option>
              <option value="High">High Spend (&gt; NPR 50k)</option>
              <option value="Mid">Mid Spend (15k - 50k)</option>
              <option value="Low">Standard (&lt; 15k)</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-indigo-900 text-xs shrink-0"
            >
              <option value="urgency">Sort: Service Urgency (Least Days Left)</option>
              <option value="name">Sort: Customer Name (A-Z)</option>
              <option value="spending">Sort: Highest Lifetime Spend</option>
              <option value="recent">Sort: Most Recent Visit</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Tags */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <span>
              Showing <strong>{activeTab === 'reminders' ? filteredReminders.length : filteredCustomers.length}</strong> matching records
            </span>
            {(searchQuery || filterCustomerType !== 'All' || filterServiceStatus !== 'All' || filterSpendingTier !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterCustomerType('All');
                  setFilterServiceStatus('All');
                  setFilterSpendingTier('All');
                  setSortBy('urgency');
                }}
                className="text-indigo-600 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Rule: 5,000 km or 120 days interval • Red threshold &gt; 120 days
          </span>
        </div>
      </div>

      {/* TAB 1: SERVICE REMINDERS & UPCOMING SERVICES SECTION */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {/* Header Description */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Upcoming Services & Fleet Maintenance Reminders</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Sorted by Urgency: Less Days Remaining on Top
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Vehicles due for service sorted from lowest days remaining to highest. Vehicles exceeding 120 days without service are highlighted in red.
              </p>
            </div>
          </div>

          {filteredReminders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Car className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">No Upcoming Vehicle Services Matching Criteria</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No vehicles matched your search filter or selected service status. Try clearing filters or searching by a different customer name or registration number.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredReminders.map((item) => {
                // Determine styling based on threshold
                // Overdue (> 120 days / negative days remaining OR km exceeded): RED
                // 0 Days remaining / Due Today: URGENT AMBER/RED
                // 1-15 days: AMBER
                // > 15 days: NORMAL / SAFE
                const isOverdue = item.isOverdue;
                const isDueToday = item.isDueToday;

                return (
                  <div
                    key={item.vehicleId}
                    className={`rounded-2xl p-4 sm:p-5 border transition shadow-xs ${
                      isOverdue
                        ? 'bg-rose-50/80 border-2 border-rose-500 shadow-md shadow-rose-100 ring-1 ring-rose-400'
                        : isDueToday
                          ? 'bg-amber-50/90 border-2 border-amber-500 shadow-md shadow-amber-100 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Vehicle & Days Remaining Badge */}
                      <div className="flex items-start space-x-3.5 min-w-0">
                        {/* Status Icon */}
                        <div className={`p-3 rounded-xl shrink-0 ${
                          isOverdue 
                            ? 'bg-rose-600 text-white animate-pulse' 
                            : isDueToday
                              ? 'bg-amber-500 text-white animate-bounce'
                              : item.isDueSoon
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isOverdue ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>

                        {/* Core Details */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-slate-900 shadow-2xs">
                              {item.registrationNumber}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {item.brand} {item.model}
                            </h4>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.fuelType} • {item.year || '2022'}
                            </span>
                          </div>

                          {/* Customer info */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                            <span className="font-semibold text-slate-800 flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.customerName}</span>
                            </span>
                            <span className="font-mono text-slate-500 flex items-center space-x-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.customerPhone}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Chassis: {item.vinNumber || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Days Remaining & Urgency Meter */}
                      <div className="flex flex-col items-start lg:items-end space-y-1 shrink-0">
                        {isOverdue ? (
                          <div className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              {item.daysRemaining < 0 
                                ? `OVERDUE BY ${Math.abs(item.daysRemaining)} DAYS • SERVICE REQUIRED`
                                : `OVERDUE • 5,000 KM EXCEEDED (+${(item.currentOdometer - item.nextServiceDueKm).toLocaleString()} km)`}
                            </span>
                          </div>
                        ) : isDueToday ? (
                          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span>0 Days Remaining • Service Due Today!</span>
                          </div>
                        ) : item.daysRemaining === 120 || item.isRecentlyServiced ? (
                          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center space-x-1.5 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.daysRemaining} Days Remaining • Recently Serviced</span>
                          </div>
                        ) : (
                          <div className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${
                            item.isDueSoon
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.daysRemaining} Days Remaining</span>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-500 font-mono">
                          Interval Rule: 120 Days (4 Mos) / 5,000 km (Whichever First)
                        </span>
                      </div>
                    </div>

                    {/* Technical Milestone Grid */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Service Date</span>
                        <span className="font-semibold text-slate-800">{item.lastServiceDate}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{item.lastServiceType}</span>
                      </div>

                      <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Odometer</span>
                        <span className="font-mono font-semibold text-slate-800">{(item.lastServiceKm || 0).toLocaleString()} km</span>
                        <span className="text-[10px] text-slate-500 block">Baseline PMS mark</span>
                      </div>

                      <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Due Date</span>
                        <span className={`font-mono font-bold block ${isOverdue ? 'text-rose-700' : 'text-indigo-900'}`}>
                          {item.nextServiceDueDate}
                        </span>
                        <span className="text-[10px] text-slate-500 block">120-Day Limit</span>
                      </div>

                      <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Odometer</span>
                        <span className="font-mono font-bold text-emerald-700 block">
                          {(item.nextServiceDueKm || 0).toLocaleString()} km
                        </span>
                        <span className="text-[10px] text-slate-500 block">+5,000 km PMS</span>
                      </div>
                    </div>

                    {/* Action Bar: WhatsApp Share Button & History */}
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                        <span className="font-mono">History: {item.matchingJobCardsCount} Job Cards</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-700 font-semibold">Total Spent: NPR {(item.totalBilledAmount || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Quick Action: Record Service Performed Today */}
                        <button
                          type="button"
                          onClick={() => handleRecordServiceToday(item)}
                          className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                          title="Record service performed today: resets interval to exactly 120 days & Odometer + 5,000 km"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Record Service Today</span>
                        </button>

                        {/* Copy Pre-made Text */}
                        <button
                          type="button"
                          onClick={() => handleCopyReminder(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                          title="Copy pre-made reminder message to clipboard"
                        >
                          {copiedId === item.vehicleId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        {/* WHATSAPP SHARE BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(item)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          <span>WhatsApp Reminder</span>
                          <ExternalLink className="w-3 h-3 text-emerald-200" />
                        </button>

                        {/* View Service History */}
                        <button
                          type="button"
                          onClick={() => setHistoryModalTarget({
                            vehicleReg: item.registrationNumber,
                            chassis: item.vinNumber,
                            customerName: item.customerName,
                            customerPhone: item.customerPhone
                          })}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>Service History</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER PROFILES & GARAGE VEHICLES */}
      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Customer List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Registered Clients ({filteredCustomers.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Sorted by {sortBy}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {filteredCustomers.map(cust => {
                const isSelected = selectedCustomer?.id === cust.id;
                const custReminders = allServiceReminders.filter(r => r.customerId === cust.id);
                const hasOverdue = custReminders.some(r => r.isOverdue);
                const hasDueToday = custReminders.some(r => r.isDueToday);

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    className={`p-4 cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold text-slate-900">{cust.name}</h4>
                        {hasOverdue && (
                          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" title="Vehicle service overdue (>120d)" />
                        )}
                        {hasDueToday && !hasOverdue && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Service due today" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {cust.customerType}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono mt-1">{cust.phone}</div>

                    <div className="mt-2 flex items-center space-x-1 text-[11px] text-slate-600">
                      <Car className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-mono font-medium">
                        {(cust.vehicles || []).map(v => (typeof v === 'string' ? v : v?.registrationNumber || '')).filter(Boolean).join(', ')}
                      </span>
                    </div>

                    {/* Spend & Service countdown preview */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-emerald-700 font-bold">
                        रु. {(cust.totalSpent || 0).toLocaleString()}
                      </span>
                      {custReminders[0] && (
                        <span className={`font-medium ${
                          custReminders[0].isOverdue 
                            ? 'text-rose-600 font-bold' 
                            : custReminders[0].isDueToday
                              ? 'text-amber-600 font-bold'
                              : 'text-slate-500'
                        }`}>
                          {custReminders[0].isOverdue 
                            ? `Overdue (${Math.abs(custReminders[0].daysRemaining)}d)` 
                            : `${custReminders[0].daysRemaining}d to service`}
                        </span>
                      )}
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
                        {(() => {
                          const customerInvoices = (invoices || []).filter(inv => {
                            const matchesId = inv.customerId && inv.customerId === selectedCustomer.id;
                            const matchesName = inv.customerName && inv.customerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim();
                            const matchesVeh = (selectedCustomer.vehicles || []).some(v => {
                              const regStr = typeof v === 'string' ? v : v.registrationNumber || '';
                              return regStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                            });
                            return matchesId || matchesName || matchesVeh;
                          });
                          const invoiceTotal = customerInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
                          const total = Math.max(selectedCustomer.totalSpent || 0, invoiceTotal);
                          return `रु. ${(total || 0).toLocaleString()}`;
                        })()}
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
                      <span className="font-mono font-bold text-slate-800">{selectedCustomer.panNumber || selectedCustomer.panVatNumber || 'None (Consumer)'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">Member Since</span>
                      <span className="font-mono text-slate-800">{selectedCustomer.createdAt}</span>
                    </div>
                  </div>

                  {/* Customer Garage / Registered Fleet */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <Car className="w-4 h-4 text-indigo-600" />
                          <span>Customer Garage ({(selectedCustomer.vehicles || []).length} Vehicles Managed)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Fleet vehicles registered to this customer account with service interval countdown (5,000 km / 120 Days).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {(selectedCustomer.vehicles || []).map((veh, vehIdx) => {
                        const vehReg = (typeof veh === 'string' ? veh : veh?.registrationNumber || '').toUpperCase().trim();
                        const vehVin = (typeof veh === 'object' && veh ? (veh.vinNumber || veh.chassisNumber || '') : '').toUpperCase().trim();
                        const vehEngine = typeof veh === 'object' && veh ? veh.engineNumber || 'N/A' : 'N/A';
                        const vehBrand = typeof veh === 'object' && veh ? (veh.brand || veh.make || 'Generic') : 'Generic';
                        const vehModel = typeof veh === 'object' && veh ? veh.model || 'Model' : '';
                        const vehYear = typeof veh === 'object' && veh ? veh.year || 2022 : 2022;
                        const vehFuel = typeof veh === 'object' && veh ? veh.fuelType || 'Petrol' : 'Petrol';
                        const vehOdo = typeof veh === 'object' && veh ? (veh.odometerReading || 0) : 0;
                        const vehId = (typeof veh === 'object' && veh && veh.id) || `veh-${vehIdx}`;

                        // Look up reminder status for this specific vehicle
                        const reminder = allServiceReminders.find(r => 
                          r.customerId === selectedCustomer.id && 
                          r.registrationNumber.replace(/[^A-Z0-9]/g, '') === vehReg.replace(/[^A-Z0-9]/g, '')
                        );

                        // Match past job cards for this specific vehicle
                        const matchingJobCards = jobCards.filter(jc => {
                          const jcReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                          const jcVin = (jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                          const cleanR = vehReg.replace(/[^A-Z0-9]/g, '');
                          const cleanV = vehVin.replace(/[^A-Z0-9]/g, '');
                          return (cleanR && jcReg === cleanR) || (cleanV && jcVin === cleanV);
                        });

                        // Match all past invoices/bills for this specific vehicle
                        const matchingInvoices = invoices.filter(inv => {
                          const invReg = (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                          const cleanR = vehReg.replace(/[^A-Z0-9]/g, '');
                          const isJcMatch = matchingJobCards.some(jc => jc.id === inv.jobCardId || jc.jobCardNumber === inv.jobCardNumber);
                          return (cleanR && invReg === cleanR) || isJcMatch;
                        });

                        // Calculate total billed amount for this vehicle
                        const totalBilledOnVehicle = matchingInvoices.length > 0
                          ? matchingInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
                          : (typeof veh === 'object' && veh ? (veh.totalBilledAmount || 0) : 0);

                        const totalVisitsOnVehicle = Math.max(matchingJobCards.length, (typeof veh === 'object' && veh && veh.totalServiceCount) || (matchingInvoices.length > 0 ? matchingInvoices.length : 1));
                        const lastServiceDate = reminder?.lastServiceDate || (typeof veh === 'object' && veh && veh.lastServiceDate) || matchingJobCards[0]?.arrivalDate || matchingJobCards[0]?.createdAt?.slice(0, 10) || 'Active';
                        const lastServiceType = reminder?.lastServiceType || (typeof veh === 'object' && veh && veh.lastServiceType) || matchingJobCards[0]?.serviceType || 'Scheduled Inspection';

                        const isOverdue = reminder?.isOverdue ?? false;
                        const isDueToday = reminder?.isDueToday ?? false;
                        const daysRemaining = reminder?.daysRemaining ?? 120;

                        return (
                          <div 
                            key={vehId} 
                            className={`p-4 rounded-xl border space-y-3 transition ${
                              isOverdue 
                                ? 'bg-rose-50/70 border-rose-300' 
                                : isDueToday
                                  ? 'bg-amber-50/70 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            {/* Vehicle Header & Urgency Countdown */}
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-900 shadow-2xs">
                                  {vehReg || 'Unregistered'}
                                </span>
                                <h5 className="text-xs text-slate-800 font-bold mt-1">
                                  {vehBrand} {vehModel}
                                </h5>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Bill Total</span>
                                <span className="font-mono text-xs font-bold text-emerald-700">
                                  रु. {(totalBilledOnVehicle || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Key Technical Specs */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-white p-2 rounded-lg border border-slate-200 font-mono">
                              <div>
                                <span className="text-slate-400 block font-sans">VIN / Chassis:</span>
                                <span className="text-slate-700 font-semibold truncate block" title={vehVin || 'N/A'}>
                                  {vehVin || 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-sans">Engine No:</span>
                                <span className="text-slate-700 font-semibold truncate block" title={vehEngine}>
                                  {vehEngine}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-sans">Odometer:</span>
                                <span className="text-slate-700 font-semibold">
                                  {(vehOdo || 0).toLocaleString()} km
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-sans">Fuel & Year:</span>
                                <span className="text-slate-700 font-semibold">
                                  {vehFuel} • {vehYear}
                                </span>
                              </div>
                            </div>

                            {/* Upcoming Service Interval Countdown Card */}
                            <div className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 ${
                              isOverdue
                                ? 'bg-rose-100/70 border-rose-300 text-rose-900'
                                : isDueToday
                                  ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                                  : 'bg-indigo-50/70 border-indigo-100 text-indigo-900'
                            }`}>
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Service Interval: 120 Days / 5,000 km</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOverdue 
                                    ? 'bg-rose-600 text-white' 
                                    : isDueToday 
                                      ? 'bg-amber-500 text-white' 
                                      : 'bg-indigo-200 text-indigo-900'
                                }`}>
                                  {isOverdue 
                                    ? `Overdue (${Math.abs(daysRemaining)}d)` 
                                    : isDueToday 
                                      ? 'Due Today (0d)' 
                                      : `${daysRemaining}d remaining`}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[10px]">
                                <div>
                                  <span className="text-slate-500">Last Service:</span>{' '}
                                  <span className="font-semibold">{lastServiceDate}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Next Target Due:</span>{' '}
                                  <span className="font-semibold font-mono">{reminder?.nextServiceDueDate || 'Within 120d'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions: WhatsApp & History */}
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
                              {reminder && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(reminder)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 transition"
                                  title="Send WhatsApp Service Reminder"
                                >
                                  <MessageCircle className="w-3 h-3 fill-current" />
                                  <span>WhatsApp</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setHistoryModalTarget({
                                  vehicleReg: vehReg,
                                  chassis: vehVin,
                                  customerName: selectedCustomer.name,
                                  customerPhone: selectedCustomer.phone
                                })}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-2xs transition ml-auto"
                              >
                                <History className="w-3 h-3" />
                                <span>Display Service History</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Past Service Invoices & Visits Across Garage */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <History className="w-4 h-4 text-indigo-600" />
                          <span>Customer Billing History & Service Invoices</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          All IRD tax invoices and workshop service bills across all garage vehicles.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const primaryVeh = selectedCustomer.vehicles?.[0];
                          setHistoryModalTarget({
                            vehicleReg: primaryVeh?.registrationNumber || '',
                            chassis: primaryVeh?.vinNumber || primaryVeh?.chassisNumber,
                            customerName: selectedCustomer.name,
                            customerPhone: selectedCustomer.phone
                          });
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-xs transition"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Display Full Service History</span>
                      </button>
                    </div>

                    {(() => {
                      const customerInvoices = (invoices || []).filter(inv => {
                        const matchesId = inv.customerId && inv.customerId === selectedCustomer.id;
                        const matchesName = inv.customerName && inv.customerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim();
                        const matchesVeh = (selectedCustomer.vehicles || []).some(v => {
                          const regStr = typeof v === 'string' ? v : v.registrationNumber || '';
                          return regStr.toUpperCase().replace(/[^A-Z0-9]/g, '') === (inv.vehicleReg || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                        });
                        return matchesId || matchesName || matchesVeh;
                      });

                      if (customerInvoices.length === 0) {
                        return (
                          <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                            No historical service bills or invoices recorded yet for this customer garage.
                          </div>
                        );
                      }

                      return (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Invoice #</th>
                                <th className="p-2.5">Vehicle Reg</th>
                                <th className="p-2.5 text-right">Bill Amount (NPR)</th>
                                <th className="p-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {customerInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                                  <td className="p-2.5 font-mono text-slate-600">{(inv.createdAt || inv.date || '').slice(0, 10)}</td>
                                  <td className="p-2.5 font-mono font-bold text-indigo-700">{inv.invoiceNumber}</td>
                                  <td className="p-2.5 font-mono font-semibold text-slate-800">{inv.vehicleReg}</td>
                                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                    रु. {(inv.grandTotal || 0).toLocaleString()}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {inv.status || inv.paymentStatus || 'Paid'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
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

      {/* TAB 3: SALES REPORTS & LTV RANKINGS */}
      {activeTab === 'sales_reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Customer Lifetime Value (LTV) & Sales Rankings</h3>
              <p className="text-xs text-slate-500">Ranked by total historical workshop turnover</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Workshop Billed</span>
              <span className="font-mono text-lg font-black text-slate-900">रु. {(totalInvoicedSales || 0).toLocaleString()}</span>
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
              {[...safeCustomers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-900">{c.name}</td>
                  <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                  <td className="p-3 font-mono font-bold text-slate-800">
                    {(c.vehicles || []).map(v => (typeof v === 'string' ? v : v?.registrationNumber || '')).filter(Boolean).join(', ') || 'None'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {c.customerType}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">
                    रु. {(c.totalSpent || 0).toLocaleString()}
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
                    <option value="Corporate">Fleet / Corporate Company</option>
                    <option value="Insurance Partner">Insurance Co. Partner</option>
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

      {/* Modal: Service History */}
      {historyModalTarget && (
        <VehicleServiceHistoryModal
          vehicleReg={historyModalTarget.vehicleReg}
          vehicleChassis={historyModalTarget.chassis}
          customerName={historyModalTarget.customerName}
          customerPhone={historyModalTarget.customerPhone}
          jobCards={jobCards}
          invoices={invoices}
          gatePasses={gatePasses}
          onClose={() => setHistoryModalTarget(null)}
          onSelectJobCard={(jc) => {
            setHistoryModalTarget(null);
            onViewJobCard(jc.jobCardNumber);
          }}
        />
      )}
    </div>
  );
};
