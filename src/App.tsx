import React, { useState, useEffect } from 'react';
import { 
  storage, 
  AppDatabase 
} from './services/storageService';
import { 
  TabType, 
  Navigation 
} from './components/Navigation';
import { Navbar } from './components/Navbar';
import { WorkshopOverview } from './components/dashboard/WorkshopOverview';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { JobCardManagement } from './components/jobcards/JobCardManagement';
import { CustomerManagement } from './components/customers/CustomerManagement';
import { BillingManagement } from './components/billing/BillingManagement';
import { AccountingReports } from './components/accounting/AccountingReports';
import { WarrantyManagement } from './components/warranty/WarrantyManagement';
import { AdminMasterSettings } from './components/admin/AdminMasterSettings';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { PrintInvoiceModal } from './components/common/PrintInvoiceModal';
import { PrintGatePassModal } from './components/common/PrintGatePassModal';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { AuthScreen } from './components/auth/AuthScreen';
import {
  ensureGlobalEscapeListener,
  isEditableTarget,
  useEscapeKey,
} from './hooks/useKeyboardShortcuts';
import { 
  JobCard, 
  Invoice, 
  Appointment, 
  SparePart, 
  PurchaseOrder, 
  Customer, 
  NepalPaymentMethod,
  UserAccount,
  WarrantyClaim,
  WarrantyRecord,
  WorkshopProfile,
  Technician,
  ServicePriceItem,
  BayArea,
  PartsQuotation,
  PartsSalesOrder,
  PartsSalesReturn,
  GatePass,
  GLAccount,
  GLJournalEntry,
  CashierVoucher,
  ReadyNotificationLog
} from './types';
import { TaxInvoiceGenerationOptions } from './components/billing/GenerateTaxInvoiceModal';
import {
  applyJournalEntryToAccounts,
  buildCashierVoucherJournalEntry,
  buildCreditNoteJournalEntry,
  buildInvoiceJournalEntry,
  buildPaymentJournalEntry,
  buildPurchaseReceiptJournalEntry,
  getNepalFiscalYear,
  isCreditNoteInvoice,
  round2,
  toNepalBsDate,
} from './utils/accountingEngine';
import { adToBs } from './utils/nepaliDate';
import { Bell, MessageSquare, Send, X } from 'lucide-react';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => storage.getDatabase());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => storage.isAuthenticated());
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printGatePass, setPrintGatePass] = useState<GatePass | null>(null);
  const [activeReadyToast, setActiveReadyToast] = useState<ReadyNotificationLog | null>(null);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [quickIntakeTrigger, setQuickIntakeTrigger] = useState(0);

  // Register global ESC listener & close top-level overlays via LIFO stack
  useEscapeKey(isMobileNavOpen, () => setIsMobileNavOpen(false));
  useEscapeKey(isNewAccountModalOpen, () => setIsNewAccountModalOpen(false));
  useEscapeKey(Boolean(printGatePass), () => setPrintGatePass(null));

  useEffect(() => {
    ensureGlobalEscapeListener();

    const TAB_SHORTCUTS: Record<string, TabType> = {
      '1': 'dashboard',
      '2': 'jobcards',
      '3': 'customers',
      '4': 'inventory',
      '5': 'billing',
      '6': 'accounting',
      '7': 'warranty',
      '8': 'analytics',
      '9': 'admin_settings',
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;

      // Alt + K or Shift + ? (outside editable inputs) -> Keyboard Shortcuts dialog
      if ((e.altKey && e.key.toLowerCase() === 'k') || (e.key === '?' && !isEditableTarget(e.target))) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Alt + N -> Quick New Vehicle Intake (Job Cards)
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('jobcards');
        setQuickIntakeTrigger((n) => n + 1);
        return;
      }

      // Alt + 1..9 / 0 -> Switch primary modules
      if (e.altKey && !e.ctrlKey && !e.metaKey && TAB_SHORTCUTS[e.key]) {
        e.preventDefault();
        setActiveTab(TAB_SHORTCUTS[e.key]);
        setIsMobileNavOpen(false);
        return;
      }

      // "/" outside inputs -> Focus current module's search input
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !isEditableTarget(e.target)) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'main input[type="text"], main input[type="search"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isAuthenticated]);

  // Sync state changes with persistence
  const updateDb = (partial: Partial<AppDatabase>) => {
    storage.saveDatabase(partial);
    setDb(storage.getDatabase());
  };

  const currentUser = db.currentUser;

  // --- AUTHENTICATION HANDLERS ---
  const handleLoginSuccess = (user: UserAccount) => {
    setIsAuthenticated(true);
    setIsNewAccountModalOpen(false);
    setDb(storage.getDatabase());
  };

  const handleLogout = () => {
    storage.logout();
    setIsAuthenticated(false);
  };

  const handleOpenNewAccountModal = () => {
    setIsNewAccountModalOpen(true);
  };

  // Badges Calculation for Navigation
  const partsList = db.parts || [];
  const jobCardsList = db.jobCards || [];
  const invoicesList = db.invoices || [];
  const warrantyClaimsList = db.warrantyClaims || [];

  const lowStockCount = partsList.filter(p => p && p.currentStock <= p.minReorderLevel).length;
  const activeJobCardsCount = jobCardsList.filter(jc => jc && jc.status !== 'Delivered').length;
  const unpaidInvoicesCount = invoicesList.filter(i => i && i.status !== 'Paid').length;
  const pendingWarrantyCount = warrantyClaimsList.filter(w => w && (w.status === 'Submitted to OEM' || w.status === 'OEM Inspection / Under Review')).length;

  // --- USER SWITCHER ---
  const handleSwitchUser = (userId: string) => {
    storage.setCurrentUser(userId);
    setDb(storage.getDatabase());
  };

  // --- JOB CARDS HANDLERS ---
  const syncJobCardContactToCustomers = (jc: JobCard, customersList: Customer[]): Customer[] => {
    const cleanPhone = (jc.customerPhone || '').trim();
    const cleanName = (jc.customerName || '').trim();
    const cleanReg = (jc.vehicle?.registrationNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPhone && !cleanName) return customersList;

    return (customersList || []).map((cust) => {
      const matchesId = Boolean(jc.customerId && cust.id === jc.customerId);
      const matchesReg = Boolean(
        cleanReg &&
        (cust.vehicles || []).some(
          (v) =>
            (typeof v === 'string' ? v : v?.registrationNumber || '')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '') === cleanReg
        )
      );
      if (!matchesId && !matchesReg) return cust;
      return {
        ...cust,
        phone: cleanPhone || cust.phone,
        name: cleanName || cust.name,
      };
    });
  };

  const handleCreateJobCard = (newJc: JobCard) => {
    const updatedCards = [newJc, ...db.jobCards];
    const syncedCustomers = syncJobCardContactToCustomers(newJc, db.customers || []);
    updateDb({ jobCards: updatedCards, customers: syncedCustomers });
  };

  const handleUpdateJobCard = (updatedJc: JobCard) => {
    const updatedCards = db.jobCards.map(jc => jc.id === updatedJc.id ? updatedJc : jc);
    const syncedCustomers = syncJobCardContactToCustomers(updatedJc, db.customers || []);
    updateDb({ jobCards: updatedCards, customers: syncedCustomers });
  };

  const handleCreateAppointment = (newApt: Appointment) => {
    const updatedApts = [newApt, ...db.appointments];
    updateDb({ appointments: updatedApts });
  };

  // --- VEHICLE READY / PICKUP SMS & MESSAGE NOTIFICATION HANDLER ---
  const handleTriggerReadyNotification = (jc: JobCard) => {
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.slice(0, 10);
    const workshopName = db.profile?.name || 'Continental Auto Kraft';
    const workshopPhone = db.profile?.contactNumber || '+977-1-4378920';
    const customerContact = (jc.customerPhone || '').trim();
    const message = `Vehicle Ready for Pickup: ${jc.vehicle?.registrationNumber || ''} (${jc.vehicle?.brand || jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}) under ${jc.jobCardNumber} is Ready for Billing & Pickup at ${workshopName}. Customer: ${jc.customerName}. Workshop Helpline: ${workshopPhone}.`;

    const newLog: ReadyNotificationLog = {
      id: `NTF-${Date.now().toString().slice(-6)}`,
      jobCardId: jc.id,
      jobCardNumber: jc.jobCardNumber,
      vehicleReg: jc.vehicle?.registrationNumber || '',
      vehicleLabel: `${jc.vehicle?.brand || jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}`.trim() || 'Vehicle',
      customerName: jc.customerName,
      recipientPhone: customerContact,
      channel: 'SMS & Message',
      message,
      sentAt: nowIso,
      bsDate: adToBs(todayDate).formatted,
      isRead: false,
    };

    const updatedCards = (db.jobCards || []).map((card) =>
      card.id === jc.id ? { ...card, readyNotificationSentAt: nowIso } : card
    );

    updateDb({
      jobCards: updatedCards,
      readyNotifications: [newLog, ...(db.readyNotifications || [])],
    });
    setActiveReadyToast(newLog);
  };

  const handleMarkNotificationsRead = () => {
    const updated = (db.readyNotifications || []).map((n) => ({ ...n, isRead: true }));
    updateDb({ readyNotifications: updated });
  };

  // Convert Job Card to Nepal IRD Tax Invoice (13% VAT) — supports Individual/Company Billing & Separate Supplementary Invoices for Re-Opened Paid Job Cards
  const handleConvertJobCardToInvoice = (jc: JobCard, options?: TaxInvoiceGenerationOptions) => {
    // Check existing regular (non-credit-note) invoices for this Job Card
    const existingRegularInvoices = (db.invoices || []).filter(
      (inv) =>
        !isCreditNoteInvoice(inv) &&
        (inv.jobCardId === jc.id ||
          inv.jobCardNumber === jc.jobCardNumber ||
          (jc.invoiceId && inv.id === jc.invoiceId) ||
          (jc.invoiceNumber && inv.invoiceNumber === jc.invoiceNumber))
    );

    const hasExistingInvoice = existingRegularInvoices.length > 0;
    const allExistingPaid =
      hasExistingInvoice && existingRegularInvoices.every((inv) => inv.status === 'Paid');

    const billedLaborSet = new Set(jc.billedLaborIds || []);
    const billedPartSet = new Set(jc.billedPartIds || []);
    const allParts = jc.partsRequested || jc.partsItems || [];
    const allLabor = jc.laborItems || [];

    const isSupplementary =
      hasExistingInvoice && (Boolean(options?.onlyUnbilledItems) || allExistingPaid);

    // If an UNPAID invoice already exists for this job card, open it instead of duplicating
    if (hasExistingInvoice && !isSupplementary) {
      setActiveTab('billing');
      setPrintInvoice(existingRegularInvoices[0]);
      return;
    }

    // For a re-opened Paid Job Card, bill ONLY newly added unbilled items under a separate new Tax Invoice
    // while keeping the earlier Paid invoice permanently Paid and untouched
    const rawParts = isSupplementary
      ? allParts.filter((p) => !billedPartSet.has(p.id))
      : allParts;
    const rawLabor = isSupplementary
      ? allLabor.filter((l) => !billedLaborSet.has(l.id))
      : allLabor;

    if (isSupplementary && rawParts.length === 0 && rawLabor.length === 0) {
      setActiveTab('billing');
      setPrintInvoice(existingRegularInvoices[0]);
      return;
    }

    const partsSubtotal = rawParts.reduce(
      (acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))),
      0
    );
    const laborSubtotal = rawLabor.reduce(
      (acc, l) => acc + (l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour ?? 0))),
      0
    );
    const taxableAmount = round2(partsSubtotal + laborSubtotal);
    const vatAmount = round2(taxableAmount * 0.13);
    const grandTotal = round2(taxableAmount + vatAmount);
    const isZeroDue = grandTotal <= 0.01;

    const cb = options?.companyBilling;
    const isCompanyBill = Boolean(cb?.isCompanyBill && cb.companyName?.trim());
    const todayIso = new Date().toISOString();
    const todayDate = todayIso.slice(0, 10);
    const fiscalYear = getNepalFiscalYear(todayDate) || db.profile.fiscalYear || '2083/84';
    const fyPrefix = fiscalYear.slice(2, 4);

    const newInvoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-6)}`,
      invoiceNumber: `TAX-${fyPrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
      fiscalYear,
      date: todayDate,
      bsDate: toNepalBsDate(todayDate),
      jobCardId: jc.id,
      jobCardNumber: jc.jobCardNumber,
      customerId: jc.customerId,
      customerName: isCompanyBill ? cb!.companyName.trim() : jc.customerName,
      customerPhone: isCompanyBill ? cb!.phone.trim() : jc.customerPhone,
      customerAddress: isCompanyBill ? cb!.address.trim() : options?.customerAddress,
      customerPan: isCompanyBill ? cb!.panVatNumber.trim() : (options?.customerPan || jc.customerPan),
      customerPanVat: isCompanyBill ? cb!.panVatNumber.trim() : (options?.customerPan || jc.customerPan),
      billedToType: isCompanyBill ? 'Company' : 'Individual',
      companyName: isCompanyBill ? cb!.companyName.trim() : undefined,
      companyAddress: isCompanyBill ? cb!.address.trim() : undefined,
      companyPhone: isCompanyBill ? cb!.phone.trim() : undefined,
      buyerContactPerson: jc.customerName,
      vehicleReg: jc.vehicle?.registrationNumber || 'BA 01 PA 0001',
      vehicleBrand: jc.vehicle?.brand || 'Generic',
      vehicleModel: jc.vehicle?.model || 'Model',
      subTotal: taxableAmount,
      taxableAmount,
      discountTotal: 0,
      vatRate: 13,
      vatAmount,
      grandTotal,
      paidAmount: 0,
      amountPaid: 0,
      balanceDue: isZeroDue ? 0 : grandTotal,
      paymentMethod: options?.paymentMethod || 'Fonepay',
      status: isZeroDue ? 'Paid' : 'Unpaid',
      paymentStatus: isZeroDue ? 'Paid' : 'Unpaid',
      createdAt: todayIso,
      type: 'Tax Invoice',
      isLocked: false,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: todayIso,
        cbmsAckNumber: `CBMS-${Date.now().toString().slice(-6)}`,
        fiscalYear
      },
      items: [
        ...rawLabor.map((l, idx) => ({
          id: `ITEM-L-${idx}-${Date.now()}`,
          itemType: 'Labor' as const,
          description: l.description,
          hsnSacCode: '998714',
          quantity: l.hours || l.hoursEstimated || 1,
          unitPrice: l.ratePerHour ?? l.totalAmount ?? 0,
          taxableAmount: l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0)),
          vatRate: 13,
          vatAmount: round2((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0))) * 0.13),
          totalAmount: round2((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 0))) * 1.13)
        })),
        ...rawParts.map((p, idx) => ({
          id: `ITEM-P-${idx}-${Date.now()}`,
          itemType: 'Part' as const,
          description: `${p.partName || p.name || 'Spare Part'} (${p.partNumber || 'GEN'})`,
          hsnSacCode: '87082900',
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
          taxableAmount: p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0)),
          vatRate: 13,
          vatAmount: round2((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 0.13),
          totalAmount: round2((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 1.13)
        }))
      ]
    };

    const mergedBilledLaborIds = Array.from(
      new Set([...(jc.billedLaborIds || []), ...rawLabor.map((l) => l.id)])
    );
    const mergedBilledPartIds = Array.from(
      new Set([...(jc.billedPartIds || []), ...rawParts.map((p) => p.id)])
    );

    const existingHistory = jc.invoiceHistory || existingRegularInvoices.map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date || inv.createdAt?.slice(0, 10) || todayDate,
      amount: inv.grandTotal,
      status: inv.status,
    }));

    const updatedJc: JobCard = { 
      ...jc, 
      status: 'Delivered',
      isLocked: true,
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      billedLaborIds: mergedBilledLaborIds,
      billedPartIds: mergedBilledPartIds,
      invoiceHistory: [
        ...existingHistory,
        {
          invoiceId: newInvoice.id,
          invoiceNumber: newInvoice.invoiceNumber,
          date: todayDate,
          amount: newInvoice.grandTotal,
          status: newInvoice.status,
        },
      ],
    };
    const updatedCards = db.jobCards.map(c => c.id === jc.id ? updatedJc : c);
    const updatedInvoices = [newInvoice, ...db.invoices];

    // Release the assigned workshop bay automatically upon invoicing/delivery
    const updatedBays = (db.bays || []).map((b) =>
      b.currentJobCardId === jc.id || b.name === jc.bayNumber || b.bayNumber === jc.bayNumber
        ? { ...b, status: 'Available' as const, currentJobCardId: undefined, currentVehicleReg: undefined }
        : b
    );

    // User requirement: "once the invoice is generated, create a gate pass of individual vehicle with information."
    const now = new Date();
    const vehicleGatePass: GatePass = {
      id: `GP-${Date.now().toString().slice(-6)}`,
      passNumber: `GP-81-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      jobCardId: jc.id,
      jobCardNumber: newInvoice.jobCardNumber,
      vehicleReg: newInvoice.vehicleReg,
      vehicleMake: jc.vehicle?.brand || newInvoice.vehicleBrand,
      vehicleModel: jc.vehicle?.model || newInvoice.vehicleModel,
      vinNumber: jc.vehicle?.vinNumber || jc.vehicle?.chassisNumber || 'N/A',
      engineNumber: jc.vehicle?.engineNumber || 'N/A',
      odometerReading: jc.vehicle?.odometerReading || 0,
      arrivalDate: jc.arrivalDate || jc.createdAt.slice(0, 10),
      entryTime: jc.entryTime || '09:30 AM',
      customerName: newInvoice.customerName,
      customerPhone: newInvoice.customerPhone,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Workshop Manager',
      securityOfficerName: 'Main Gate Security',
      status: 'Cleared for Exit',
      totalInvoiceAmount: newInvoice.grandTotal,
      paymentStatus: newInvoice.status
    };
    const updatedGatePasses = [vehicleGatePass, ...(db.gatePasses || [])];

    // Automatically update customer directory: aggregate lifetime totalSpent, last visit date, and vehicle garage records
    const invoiceCustName = (jc.customerName || newInvoice.customerName || '').trim().toLowerCase();
    const invoiceVehReg = (newInvoice.vehicleReg || '').trim().toUpperCase();
    const updatedCustomers = (db.customers || []).map(cust => {
      const matchesId = newInvoice.customerId && cust.id === newInvoice.customerId;
      const matchesName = cust.name.trim().toLowerCase() === invoiceCustName;
      const matchesVeh = (cust.vehicles || []).some(v => (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase() === invoiceVehReg);
      if (!matchesId && !matchesName && !matchesVeh) return cust;

      const updatedVehicles = (cust.vehicles || []).map(v => {
        const reg = (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase();
        if (reg === invoiceVehReg) {
          return {
            ...(typeof v === 'object' ? v : {}),
            registrationNumber: typeof v === 'string' ? v : v?.registrationNumber || invoiceVehReg,
            totalServiceCount: ((typeof v === 'object' && v?.totalServiceCount) || 0) + 1,
            totalBilledAmount: ((typeof v === 'object' && v?.totalBilledAmount) || 0) + newInvoice.grandTotal,
            lastServiceDate: now.toISOString().slice(0, 10),
            nextServiceDueDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            nextServiceDueKm: (jc.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0) || 0) + 5000,
            lastJobCardNumber: newInvoice.jobCardNumber,
            odometerReading: jc.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0)
          };
        }
        return v;
      });

      return {
        ...cust,
        totalSpent: (cust.totalSpent || 0) + newInvoice.grandTotal,
        lastVisit: now.toISOString().slice(0, 10),
        vehicles: updatedVehicles
      };
    });

    // Post balanced Double-Entry GL Journal Entry for non-zero IRD Tax Invoices
    const invJv = grandTotal > 0.01
      ? buildInvoiceJournalEntry(newInvoice, (db.journalEntries || []).length)
      : null;
    const updatedJournalEntries = invJv ? [invJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = invJv ? applyJournalEntryToAccounts(db.glAccounts || [], invJv) : (db.glAccounts || []);

    updateDb({ 
      jobCards: updatedCards, 
      bays: updatedBays,
      invoices: updatedInvoices, 
      gatePasses: updatedGatePasses,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
    setActiveTab('billing');
    setPrintInvoice(newInvoice);
  };

  // --- INVOICE & PAYMENT HANDLERS ---
  const handleCreateInvoice = (newInv: Invoice) => {
    // Check if an invoice already exists for this job card
    if (newInv.jobCardId || newInv.jobCardNumber) {
      const duplicate = db.invoices.find(inv => 
        (newInv.jobCardId && inv.jobCardId === newInv.jobCardId) ||
        (newInv.jobCardNumber && inv.jobCardNumber === newInv.jobCardNumber)
      );
      if (duplicate) {
        alert(`An IRD Tax Invoice (#${duplicate.invoiceNumber}) already exists for this Job Card. Multiple invoices under the same Job Card are prohibited.`);
        setActiveTab('billing');
        setPrintInvoice(duplicate);
        return;
      }
    }

    const updated = [newInv, ...db.invoices];
    const now = new Date();
    // Automatically create vehicle gate pass upon invoice generation
    const correspondingJc = db.jobCards.find(jc => jc.id === newInv.jobCardId || jc.jobCardNumber === newInv.jobCardNumber);
    const vehicleGatePass: GatePass = {
      id: `GP-${Date.now().toString().slice(-6)}`,
      passNumber: `GP-81-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: newInv.id,
      invoiceNumber: newInv.invoiceNumber,
      jobCardId: newInv.jobCardId,
      jobCardNumber: newInv.jobCardNumber,
      vehicleReg: newInv.vehicleReg,
      vehicleMake: newInv.vehicleBrand || correspondingJc?.vehicle?.brand || 'Multi-Brand',
      vehicleModel: newInv.vehicleModel,
      vinNumber: correspondingJc?.vehicle?.vinNumber || correspondingJc?.vehicle?.chassisNumber || 'N/A',
      engineNumber: correspondingJc?.vehicle?.engineNumber || 'N/A',
      odometerReading: correspondingJc?.vehicle?.odometerReading || 0,
      arrivalDate: correspondingJc?.arrivalDate || newInv.createdAt.slice(0, 10),
      entryTime: correspondingJc?.entryTime || '09:30 AM',
      customerName: newInv.customerName,
      customerPhone: newInv.customerPhone,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Workshop Manager',
      securityOfficerName: 'Main Gate Security',
      status: 'Cleared for Exit',
      totalInvoiceAmount: newInv.grandTotal,
      paymentStatus: newInv.status
    };
    const updatedGatePasses = [vehicleGatePass, ...(db.gatePasses || [])];

    // Automatically complete and deliver the job card if linked
    let updatedCards = db.jobCards;
    if (newInv.jobCardId || newInv.jobCardNumber) {
      updatedCards = db.jobCards.map(jc => {
        if (jc.id === newInv.jobCardId || jc.jobCardNumber === newInv.jobCardNumber) {
          return {
            ...jc,
            status: 'Delivered',
            isLocked: true,
            invoiceId: newInv.id,
            invoiceNumber: newInv.invoiceNumber
          };
        }
        return jc;
      });
    }

    // Automatically update customer directory: aggregate lifetime totalSpent, last visit date, and vehicle garage records
    const invoiceCustName = (newInv.customerName || '').trim().toLowerCase();
    const invoiceVehReg = (newInv.vehicleReg || '').trim().toUpperCase();
    const updatedCustomers = (db.customers || []).map(cust => {
      const matchesId = newInv.customerId && cust.id === newInv.customerId;
      const matchesName = cust.name.trim().toLowerCase() === invoiceCustName;
      const matchesVeh = (cust.vehicles || []).some(v => (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase() === invoiceVehReg);
      if (!matchesId && !matchesName && !matchesVeh) return cust;

      const updatedVehicles = (cust.vehicles || []).map(v => {
        const reg = (typeof v === 'string' ? v : v?.registrationNumber || '').toUpperCase();
        if (reg === invoiceVehReg) {
          return {
            ...(typeof v === 'object' ? v : {}),
            registrationNumber: typeof v === 'string' ? v : v?.registrationNumber || invoiceVehReg,
            totalServiceCount: ((typeof v === 'object' && v?.totalServiceCount) || 0) + 1,
            totalBilledAmount: ((typeof v === 'object' && v?.totalBilledAmount) || 0) + newInv.grandTotal,
            lastServiceDate: now.toISOString().slice(0, 10),
            nextServiceDueDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            nextServiceDueKm: (correspondingJc?.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0) || 0) + 5000,
            lastJobCardNumber: newInv.jobCardNumber,
            odometerReading: correspondingJc?.vehicle?.odometerReading || (typeof v === 'object' ? v?.odometerReading : 0)
          };
        }
        return v;
      });

      return {
        ...cust,
        totalSpent: (cust.totalSpent || 0) + newInv.grandTotal,
        lastVisit: now.toISOString().slice(0, 10),
        vehicles: updatedVehicles
      };
    });

    // Post balanced Double-Entry GL Journal Entry
    const invJv = isCreditNoteInvoice(newInv)
      ? buildCreditNoteJournalEntry(newInv, (newInv.paidAmount ?? 0) !== 0, (db.journalEntries || []).length)
      : buildInvoiceJournalEntry(newInv, (db.journalEntries || []).length);
    const updatedJournalEntries = invJv ? [invJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = invJv ? applyJournalEntryToAccounts(db.glAccounts || [], invJv) : (db.glAccounts || []);

    updateDb({
      invoices: updated,
      gatePasses: updatedGatePasses,
      jobCards: updatedCards,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  const handleUpdateInvoice = (updatedInv: Invoice) => {
    const updated = db.invoices.map(i => i.id === updatedInv.id ? updatedInv : i);
    updateDb({ invoices: updated });
  };

  const handleRecordPayment = (invoiceId: string, amount: number, method: NepalPaymentMethod, ref: string) => {
    const inv = db.invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    if (isCreditNoteInvoice(inv)) return;

    const grandTotal = round2(inv.grandTotal ?? 0);
    const currentPaid = round2(inv.paidAmount ?? inv.amountPaid ?? 0);
    const currentDue = round2(Math.max(0, grandTotal - currentPaid));
    const appliedAmount = round2(Math.min(Math.max(0, Number(amount) || 0), currentDue));

    // If balance is already Rs. 0 (e.g., Free Service Rs. 0 invoice or settled bill still stuck on Unpaid), normalize to Paid
    if (appliedAmount <= 0 && currentDue > 0.01) return;

    const newPaid = round2(currentPaid + appliedAmount);
    const newBalance = round2(Math.max(0, grandTotal - newPaid));
    const newStatus: Invoice['status'] = newBalance <= 0.01 ? 'Paid' : 'Partially Paid';
    const nowIso = new Date().toISOString();

    const newPaymentRecord = appliedAmount > 0
      ? {
          id: `PAY-${Date.now().toString().slice(-6)}`,
          method: method as any,
          amount: appliedAmount,
          referenceNumber: ref || `RCPT-${Date.now().toString().slice(-5)}`,
          date: nowIso
        }
      : null;

    const updatedInv: Invoice = {
      ...inv,
      paidAmount: newPaid,
      amountPaid: newPaid,
      balanceDue: newBalance <= 0.01 ? 0 : newBalance,
      status: newStatus,
      paymentStatus: newStatus,
      paymentMethod: method,
      paymentReference: ref || newPaymentRecord?.referenceNumber || inv.paymentReference,
      payments: newPaymentRecord ? [...(inv.payments || []), newPaymentRecord] : (inv.payments || [])
    };

    const updatedInvoices = db.invoices.map(i => i.id === updatedInv.id ? updatedInv : i);

    // Sync corresponding Gate Pass payment status
    const updatedGatePasses = (db.gatePasses || []).map(gp =>
      gp.invoiceId === updatedInv.id || gp.invoiceNumber === updatedInv.invoiceNumber
        ? { ...gp, paymentStatus: newStatus }
        : gp
    );

    // Post balanced Double-Entry Receipt Voucher only when cash/bank movement > 0
    const payJv = appliedAmount > 0
      ? buildPaymentJournalEntry(
          updatedInv,
          appliedAmount,
          method,
          newPaymentRecord?.referenceNumber || `RCPT-${Date.now().toString().slice(-5)}`,
          nowIso.slice(0, 10),
          (db.journalEntries || []).length
        )
      : null;
    const updatedJournalEntries = payJv ? [payJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = payJv ? applyJournalEntryToAccounts(db.glAccounts || [], payJv) : (db.glAccounts || []);

    // Update customer lastVisit only (totalSpent was already aggregated on invoice generation — prevents double counting!)
    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === inv.customerId || c.name.trim().toLowerCase() === inv.customerName.trim().toLowerCase()) {
        return {
          ...c,
          lastVisit: nowIso.slice(0, 10)
        };
      }
      return c;
    });

    // Keep Job Card invoiceHistory status synchronized when invoice is paid
    const updatedJobCards = (db.jobCards || []).map((jc) => {
      if (jc.id !== updatedInv.jobCardId && jc.jobCardNumber !== updatedInv.jobCardNumber) return jc;
      if (!jc.invoiceHistory || jc.invoiceHistory.length === 0) return jc;
      return {
        ...jc,
        invoiceHistory: jc.invoiceHistory.map((h) =>
          h.invoiceId === updatedInv.id || h.invoiceNumber === updatedInv.invoiceNumber
            ? { ...h, status: newStatus }
            : h
        ),
      };
    });

    updateDb({
      invoices: updatedInvoices,
      jobCards: updatedJobCards,
      gatePasses: updatedGatePasses,
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  // Issue an IRD-compliant Credit Note (VAT Rule 20 Sales Adjustment / Return)
  const handleCreateCreditNote = (
    originalInv: Invoice,
    refundTaxable: number,
    reason: string,
    refundMethod: NepalPaymentMethod
  ) => {
    const cleanTaxable = round2(Math.max(0, refundTaxable));
    if (cleanTaxable <= 0) return;

    const vatAmount = round2(cleanTaxable * 0.13);
    const grandTotal = round2(cleanTaxable + vatAmount);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const fy = getNepalFiscalYear(todayStr) || db.profile.fiscalYear || '2083/84';
    const cnNumber = `CN-${fy.slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // If original invoice had paid amount, treat refund as settled via selected payment mode; otherwise adjust AR
    const refundViaCash = (originalInv.paidAmount ?? 0) > 0;

    const creditNote: Invoice = {
      id: `CN-${Date.now().toString().slice(-6)}`,
      invoiceNumber: cnNumber,
      fiscalYear: fy,
      jobCardId: originalInv.jobCardId || 'JC-CN',
      jobCardNumber: originalInv.jobCardNumber || 'TAX-ADJ',
      originalInvoiceId: originalInv.id,
      originalInvoiceNumber: originalInv.invoiceNumber,
      creditNoteReason: reason,
      customerId: originalInv.customerId,
      customerName: originalInv.customerName,
      customerPhone: originalInv.customerPhone,
      customerPan: originalInv.customerPan,
      customerPanVat: originalInv.customerPanVat || originalInv.customerPan,
      customerAddress: originalInv.customerAddress,
      billedToType: originalInv.billedToType,
      companyName: originalInv.companyName,
      companyAddress: originalInv.companyAddress,
      companyPhone: originalInv.companyPhone,
      vehicleReg: originalInv.vehicleReg,
      vehicleBrand: originalInv.vehicleBrand,
      vehicleModel: `Credit Note vs ${originalInv.invoiceNumber}`,
      type: 'Credit Note',
      date: todayStr,
      bsDate: toNepalBsDate(todayStr),
      createdAt: now.toISOString(),
      subTotal: -cleanTaxable,
      taxableAmount: -cleanTaxable,
      totalTaxableAmount: -cleanTaxable,
      vatRate: 13,
      vatAmount: -vatAmount,
      totalVatAmount: -vatAmount,
      grandTotal: -grandTotal,
      paidAmount: refundViaCash ? -grandTotal : 0,
      amountPaid: refundViaCash ? -grandTotal : 0,
      balanceDue: 0,
      status: 'Paid',
      paymentStatus: 'Paid',
      paymentMethod: refundMethod,
      paymentReference: `CN-REF-${originalInv.invoiceNumber}`,
      isLocked: true,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: now.toISOString(),
        cbmsAckNumber: `CBMS-CN-${Date.now().toString().slice(-6)}`,
        fiscalYear: fy
      },
      items: [
        {
          id: `CN-ITEM-${Date.now()}`,
          itemType: 'Part',
          description: `Credit Note Adjustment (${originalInv.invoiceNumber}): ${reason}`,
          hsnSacCode: '998714',
          quantity: 1,
          unitPrice: -cleanTaxable,
          taxableAmount: -cleanTaxable,
          vatRate: 13,
          vatAmount: -vatAmount,
          totalAmount: -grandTotal
        }
      ],
      payments: refundViaCash
        ? [
            {
              id: `PAY-CN-${Date.now().toString().slice(-5)}`,
              method: refundMethod as any,
              amount: -grandTotal,
              referenceNumber: cnNumber,
              date: now.toISOString()
            }
          ]
        : []
    };

    const cnJv = buildCreditNoteJournalEntry(creditNote, refundViaCash, (db.journalEntries || []).length);
    const updatedJournalEntries = cnJv ? [cnJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cnJv ? applyJournalEntryToAccounts(db.glAccounts || [], cnJv) : (db.glAccounts || []);

    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === originalInv.customerId || c.name.trim().toLowerCase() === originalInv.customerName.trim().toLowerCase()) {
        return {
          ...c,
          totalSpent: Math.max(0, round2((c.totalSpent || 0) - grandTotal))
        };
      }
      return c;
    });

    updateDb({
      invoices: [creditNote, ...(db.invoices || [])],
      customers: updatedCustomers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
    setPrintInvoice(creditNote);
  };

  // --- INVENTORY HANDLERS ---
  const handleAddPart = (newPart: SparePart) => {
    const updated = [newPart, ...(db.parts || [])];
    updateDb({ parts: updated });
  };

  const handleUpdatePart = (updatedPart: SparePart) => {
    const updated = (db.parts || []).map(p => p.id === updatedPart.id ? updatedPart : p);
    updateDb({ parts: updated });
  };

  const handleCreatePurchaseOrder = (newPO: PurchaseOrder) => {
    // Inventory rule: Creating a PO does NOT increase stock. Stock increases ONLY upon receipt.
    const updatedPOs = [newPO, ...(db.purchaseOrders || [])];
    updateDb({ purchaseOrders: updatedPOs });
  };

  const handleUpdatePurchaseOrder = (updatedPO: PurchaseOrder) => {
    const updatedPOs = (db.purchaseOrders || []).map(po => po.id === updatedPO.id ? updatedPO : po);
    updateDb({ purchaseOrders: updatedPOs });
  };

  const handleReceivePurchaseOrder = (receivedPO: PurchaseOrder) => {
    // Rule: Stock increases ONLY when spare parts are marked as received.
    const updatedPO: PurchaseOrder = {
      ...receivedPO,
      status: 'Received',
      updatedAt: new Date().toISOString()
    };

    const updatedPOs = (db.purchaseOrders || []).map(po => po.id === updatedPO.id ? updatedPO : po);
    if (!updatedPOs.some(po => po.id === updatedPO.id)) {
      updatedPOs.unshift(updatedPO);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const updatedParts = (db.parts || []).map(p => {
      const match = updatedPO.items.find(item => item.partId === p.id || item.partNumber === p.partNumber || item.partNumber === p.sku);
      if (match) {
        const qty = match.orderedQuantity || match.quantity || 1;
        const newStock = (p.currentStock || 0) + qty;
        const purchaseHistory = [
          ...(p.purchaseHistory || []),
          {
            date: todayStr,
            poNumber: updatedPO.poNumber,
            supplier: updatedPO.supplierName,
            quantity: qty,
            unitCost: match.unitCost || match.unitPrice || p.purchasePrice
          }
        ];
        const stockMovements = [
          ...(p.stockMovements || []),
          {
            id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            date: todayStr,
            type: 'IN' as const,
            quantity: qty,
            reference: `PO Received: ${updatedPO.poNumber}`,
            currentStockAfter: newStock
          }
        ];
        return {
          ...p,
          currentStock: newStock,
          purchasePrice: match.unitCost || match.unitPrice || p.purchasePrice,
          purchaseHistory,
          stockMovements
        };
      }
      return p;
    });

    // Check if any items in the PO were new and not in parts list
    const existingPartIds = new Set(updatedParts.map(p => p.id));
    const existingPartNumbers = new Set(updatedParts.map(p => p.partNumber));
    updatedPO.items.forEach(item => {
      const matchFound = updatedParts.some(p => p.id === item.partId || p.partNumber === item.partNumber || p.sku === item.partNumber);
      if (!matchFound) {
        const qty = item.orderedQuantity || item.quantity || 1;
        const unitCost = item.unitCost || item.unitPrice || 0;
        const newPart: any = {
          id: item.partId || `PART-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          sku: item.partNumber || `SKU-${Date.now().toString().slice(-4)}`,
          partNumber: item.partNumber || 'OEM-PART',
          oemNumber: item.partNumber || 'OEM-PART',
          name: item.partName,
          category: 'Filters & Fluids',
          compatibleModels: ['All Vehicles'],
          rackLocation: 'Rack-A-01',
          barcode: `890${Date.now().toString().slice(-9)}`,
          costPrice: unitCost,
          sellingPrice: Math.round(unitCost * 1.3),
          vatRate: 13,
          hsnSacCode: '8708',
          currentStock: qty,
          minReorderLevel: 2,
          maxStockLevel: 20,
          safetyStock: 1,
          monthlyConsumption: 2,
          unit: 'pcs',
          fmsClass: 'Fast',
          abcClass: 'B',
          substitutePartIds: [],
          leadTimeDays: 3,
          lastRestockedDate: todayStr,
          preferredVendor: updatedPO.supplierName,
          purchaseHistory: [
            {
              date: todayStr,
              poNumber: updatedPO.poNumber,
              supplier: updatedPO.supplierName,
              quantity: qty,
              unitCost
            }
          ],
          stockMovements: [
            {
              id: `SM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              date: todayStr,
              type: 'IN' as const,
              quantity: qty,
              reference: `PO Received: ${updatedPO.poNumber}`,
              currentStockAfter: qty
            }
          ]
        };
        updatedParts.push(newPart);
      }
    });

    // Post balanced GRN Purchase Voucher (Dr Inventory 1200 + Dr Input VAT 1250 / Cr Accounts Payable 2010)
    const alreadyReceived = (db.purchaseOrders || []).some(
      po => po.id === updatedPO.id && po.status === 'Received'
    );
    const poJv = !alreadyReceived
      ? buildPurchaseReceiptJournalEntry(updatedPO, (db.journalEntries || []).length)
      : null;
    const updatedJournalEntries = poJv ? [poJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = poJv ? applyJournalEntryToAccounts(db.glAccounts || [], poJv) : (db.glAccounts || []);

    updateDb({
      purchaseOrders: updatedPOs,
      parts: updatedParts,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  const handleCreateQuotation = (quotation: PartsQuotation) => {
    const updated = [quotation, ...(db.partsQuotations || [])];
    updateDb({ partsQuotations: updated });
  };

  const handleCreateSalesOrder = (order: PartsSalesOrder, deductStock: boolean = true) => {
    const updatedOrders = [order, ...(db.partsSalesOrders || [])];
    
    // Deduct stock for immediate dispatch
    let updatedParts = db.parts || [];
    if (deductStock || order.dispatchStatus === 'Fully Dispatched') {
      updatedParts = (db.parts || []).map(p => {
        const orderItem = order.items.find(item => item.partId === p.id || item.sku === p.sku);
        if (orderItem) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock - orderItem.quantity)
          };
        }
        return p;
      });
    }

    // If converted from quotation, update quotation status
    let updatedQuotations = db.partsQuotations || [];
    if (order.quotationId) {
      updatedQuotations = (db.partsQuotations || []).map(q => 
        q.id === order.quotationId ? { ...q, status: 'Converted to Order' as const } : q
      );
    }

    // Automatically generate OTC Invoice in billing (supports Company VAT Billing)
    const otcCb = order.companyBilling;
    const isOtcCompany = Boolean(otcCb?.isCompanyBill && otcCb.companyName?.trim());
    const otcDate = order.date || new Date().toISOString().slice(0, 10);

    const otcInvoice: Invoice = {
      id: `INV-OTC-${order.id}`,
      invoiceNumber: `INV-81-OTC-${Math.floor(1000 + Math.random() * 9000)}`,
      fiscalYear: db.profile.fiscalYear || '2081/82',
      jobCardId: 'JC-OTC',
      jobCardNumber: 'OTC-SALES',
      customerName: isOtcCompany ? otcCb!.companyName.trim() : order.customerName,
      customerPhone: isOtcCompany ? otcCb!.phone.trim() : '+977-9800000000',
      customerAddress: isOtcCompany ? otcCb!.address.trim() : undefined,
      customerPan: isOtcCompany ? otcCb!.panVatNumber.trim() : undefined,
      customerPanVat: isOtcCompany ? otcCb!.panVatNumber.trim() : undefined,
      billedToType: isOtcCompany ? 'Company' : 'Individual',
      companyName: isOtcCompany ? otcCb!.companyName.trim() : undefined,
      companyAddress: isOtcCompany ? otcCb!.address.trim() : undefined,
      companyPhone: isOtcCompany ? otcCb!.phone.trim() : undefined,
      buyerContactPerson: order.customerName,
      vehicleReg: 'OTC-WALKIN',
      vehicleModel: 'Direct Spares Sale',
      type: 'Tax Invoice',
      date: otcDate,
      bsDate: toNepalBsDate(otcDate),
      isLocked: false,
      items: order.items.map((item, idx) => ({
        id: `OTC-ITEM-${idx}`,
        itemType: 'Part' as const,
        description: item.partName,
        hsnSacCode: '87082900',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxableAmount: item.quantity * item.unitPrice,
        vatRate: 13,
        vatAmount: Math.round(item.quantity * item.unitPrice * 0.13),
        totalAmount: Math.round(item.quantity * item.unitPrice * 1.13)
      })),
      subTotal: order.subtotal,
      taxableAmount: order.subtotal,
      vatRate: 13,
      vatAmount: order.vatAmount,
      grandTotal: order.grandTotal,
      paidAmount: order.dispatchStatus === 'Fully Dispatched' ? order.grandTotal : 0,
      balanceDue: order.dispatchStatus === 'Fully Dispatched' ? 0 : order.grandTotal,
      status: order.dispatchStatus === 'Fully Dispatched' ? 'Paid' : 'Unpaid',
      paymentMethod: 'Cash',
      irdSyncDetails: {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        cbmsAckNumber: `CBMS-OTC-${Date.now().toString().slice(-6)}`,
        fiscalYear: db.profile.fiscalYear
      }
    };

    const now = new Date();
    const otcGatePass: GatePass = {
      id: `GP-${Date.now().toString().slice(-6)}`,
      passNumber: `GP-81-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceId: otcInvoice.id,
      invoiceNumber: otcInvoice.invoiceNumber,
      jobCardNumber: otcInvoice.jobCardNumber,
      vehicleReg: 'OTC-WALKIN',
      vehicleMake: 'Over-The-Counter',
      vehicleModel: 'Direct Spares Sale',
      odometerReading: 0,
      customerName: otcInvoice.customerName,
      customerPhone: otcInvoice.customerPhone,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorizedBy: currentUser?.name || 'Store Incharge',
      securityOfficerName: 'Main Store Gate',
      status: 'Cleared for Exit',
      totalInvoiceAmount: otcInvoice.grandTotal,
      paymentStatus: otcInvoice.status
    };

    const otcJv = buildInvoiceJournalEntry(otcInvoice, (db.journalEntries || []).length);
    const updatedJournalEntries = otcJv ? [otcJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = otcJv ? applyJournalEntryToAccounts(db.glAccounts || [], otcJv) : (db.glAccounts || []);

    updateDb({
      partsSalesOrders: updatedOrders,
      parts: updatedParts,
      partsQuotations: updatedQuotations,
      invoices: [otcInvoice, ...(db.invoices || [])],
      gatePasses: [otcGatePass, ...(db.gatePasses || [])],
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  const handleDispatchOrder = (orderId: string, isPartial: boolean) => {
    const targetOrder = (db.partsSalesOrders || []).find(o => o.id === orderId);
    if (!targetOrder) return;
    
    const updatedParts = (db.parts || []).map(p => {
      const orderItem = targetOrder.items.find(item => item.partId === p.id || item.sku === p.sku);
      if (orderItem) {
        return {
          ...p,
          currentStock: Math.max(0, p.currentStock - orderItem.quantity)
        };
      }
      return p;
    });

    const updatedOrders = (db.partsSalesOrders || []).map(o => 
      o.id === orderId 
        ? { 
            ...o, 
            dispatchStatus: isPartial ? ('Partially Dispatched' as const) : ('Fully Dispatched' as const),
            invoiceStatus: 'Invoiced' as const
          } 
        : o
    );

    updateDb({
      partsSalesOrders: updatedOrders,
      parts: updatedParts
    });
  };

  const handleAddJournalEntry = (newEntry: GLJournalEntry) => {
    const updatedEntries = [newEntry, ...(db.journalEntries || [])];
    
    // Auto-update GLAccount balances based on the double-entry debits and credits
    const accountBalances: Record<string, { debit: number; credit: number }> = {};
    newEntry.lines.forEach(line => {
      if (!accountBalances[line.accountCode]) {
        accountBalances[line.accountCode] = { debit: 0, credit: 0 };
      }
      accountBalances[line.accountCode].debit += line.debit;
      accountBalances[line.accountCode].credit += line.credit;
    });

    const updatedAccounts = (db.glAccounts || []).map(acc => {
      const change = accountBalances[acc.accountCode];
      if (!change) return acc;
      if (['Asset', 'Expense'].includes(acc.category)) {
        return { ...acc, currentBalance: acc.currentBalance + (change.debit - change.credit) };
      } else {
        return { ...acc, currentBalance: acc.currentBalance + (change.credit - change.debit) };
      }
    });

    updateDb({
      journalEntries: updatedEntries,
      glAccounts: updatedAccounts
    });
  };

  const handleAddGLAccount = (newAccount: GLAccount) => {
    const updatedAccounts = [...(db.glAccounts || []), newAccount];
    updateDb({ glAccounts: updatedAccounts });
  };

  const handleCreateSalesReturn = (returnData: PartsSalesReturn) => {
    const updatedReturns = [returnData, ...(db.partsSalesReturns || [])];

    // Re-stock inventory items: Add returned quantity back to stock
    const updatedParts = (db.parts || []).map(p => {
      const returnItem = returnData.items.find(item => item.partId === p.id || item.partName === p.name);
      if (returnItem) {
        return {
          ...p,
          currentStock: p.currentStock + returnItem.quantity
        };
      }
      return p;
    });

    // Update customer spending / credit if customer identified
    const matchingCustomer = (db.customers || []).find(c => 
      c.id === returnData.customerId || 
      c.name.toLowerCase().trim() === returnData.customerName.toLowerCase().trim()
    );

    const updatedCustomers = (db.customers || []).map(c => {
      if (c.id === returnData.customerId || c.name.toLowerCase().trim() === returnData.customerName.toLowerCase().trim()) {
        return {
          ...c,
          totalSpent: Math.max(0, (c.totalSpent || 0) - returnData.totalRefundAmount)
        };
      }
      return c;
    });

    // Update Sales Orders if return was logged against an order
    const updatedSalesOrders = (db.partsSalesOrders || []).map(o => {
      if (o.orderNumber === returnData.originalInvoiceNumber || o.id === returnData.originalInvoiceNumber) {
        return {
          ...o,
          dispatchStatus: 'Fully Dispatched' as const,
          invoiceStatus: 'Invoiced' as const
        };
      }
      return o;
    });

    // Create Credit Note Invoice entry in invoices
    const creditNoteInvoice: Invoice = {
      id: `CN-${returnData.id}`,
      invoiceNumber: returnData.creditNoteNumber,
      fiscalYear: db.profile.fiscalYear || '2081/82',
      jobCardId: 'JC-RETURN',
      jobCardNumber: 'SALES-RETURN',
      customerName: returnData.customerName,
      customerPhone: matchingCustomer?.phone || '+977-9800000000',
      vehicleReg: 'SALES-RETURN',
      vehicleModel: `Credit Note for ${returnData.originalInvoiceNumber}`,
      type: 'Credit Note',
      date: returnData.date || new Date().toISOString().slice(0, 10),
      isLocked: true,
      items: returnData.items.map((item, idx) => ({
        id: `CN-ITEM-${idx}`,
        itemType: 'Part' as const,
        description: `Credit Note / Restock: ${item.partName}`,
        hsnSacCode: '87082900',
        quantity: item.quantity,
        unitPrice: -item.unitPrice,
        taxableAmount: -item.quantity * item.unitPrice,
        vatRate: 13,
        vatAmount: -Math.round(item.quantity * item.unitPrice * 0.13),
        totalAmount: -Math.round(item.quantity * item.unitPrice * 1.13)
      })),
      subTotal: -Math.round(returnData.totalRefundAmount / 1.13),
      taxableAmount: -Math.round(returnData.totalRefundAmount / 1.13),
      vatRate: 13,
      vatAmount: -(returnData.totalRefundAmount - Math.round(returnData.totalRefundAmount / 1.13)),
      grandTotal: -returnData.totalRefundAmount,
      paidAmount: -returnData.totalRefundAmount,
      balanceDue: 0,
      status: 'Paid',
      paymentMethod: 'Cash',
      irdSyncDetails: {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        cbmsAckNumber: `CBMS-CN-${Date.now().toString().slice(-6)}`,
        fiscalYear: db.profile.fiscalYear
      }
    };

    const cnJv = buildCreditNoteJournalEntry(creditNoteInvoice, true, (db.journalEntries || []).length);
    const updatedJournalEntries = cnJv ? [cnJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cnJv ? applyJournalEntryToAccounts(db.glAccounts || [], cnJv) : (db.glAccounts || []);

    updateDb({
      partsSalesReturns: updatedReturns,
      parts: updatedParts,
      customers: updatedCustomers,
      partsSalesOrders: updatedSalesOrders,
      invoices: [creditNoteInvoice, ...(db.invoices || [])],
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts
    });
  };

  // --- CASHIER DAYBOOK VOUCHER HANDLER (CASH IN / CASH OUT + AUTO DOUBLE-ENTRY GL) ---
  const handleAddCashierVoucher = (voucher: CashierVoucher) => {
    const updatedVouchers = [voucher, ...(db.cashierVouchers || [])];
    const cbJv = buildCashierVoucherJournalEntry(voucher, (db.journalEntries || []).length);
    const updatedJournalEntries = cbJv ? [cbJv, ...(db.journalEntries || [])] : (db.journalEntries || []);
    const updatedGlAccounts = cbJv ? applyJournalEntryToAccounts(db.glAccounts || [], cbJv) : (db.glAccounts || []);

    updateDb({
      cashierVouchers: updatedVouchers,
      journalEntries: updatedJournalEntries,
      glAccounts: updatedGlAccounts,
    });
  };

  // --- CUSTOMER HANDLERS ---
  const handleAddCustomer = (customer: Customer) => {
    const updated = [customer, ...(db.customers || [])];
    updateDb({ customers: updated });
  };

  const handleUpdateCustomer = (customer: Customer) => {
    const updated = (db.customers || []).map(c => c.id === customer.id ? customer : c);
    updateDb({ customers: updated });
  };

  // --- WARRANTY HANDLERS ---
  const handleAddWarrantyRecord = (record: WarrantyRecord) => {
    const updated = [record, ...(db.warrantyRecords || [])];
    updateDb({ warrantyRecords: updated });
  };

  const handleAddWarrantyClaim = (claim: WarrantyClaim) => {
    const updated = [claim, ...(db.warrantyClaims || [])];
    updateDb({ warrantyClaims: updated });
  };

  const handleUpdateWarrantyClaim = (claim: WarrantyClaim) => {
    const updated = (db.warrantyClaims || []).map(w => w.id === claim.id ? claim : w);
    updateDb({ warrantyClaims: updated });
  };

  // --- ADMIN MASTER DATA HANDLERS ---
  const handleUpdateProfile = (profile: WorkshopProfile) => {
    updateDb({ profile });
  };

  const handleUpdateUsers = (users: UserAccount[]) => {
    updateDb({ users });
  };

  const handleUpdateTechnicians = (technicians: Technician[]) => {
    updateDb({ technicians });
  };

  const handleUpdateServicePriceList = (servicePriceList: ServicePriceItem[]) => {
    updateDb({ servicePriceList });
  };

  const handleUpdateBays = (bays: BayArea[]) => {
    updateDb({ bays });
  };

  // --- CLOUD SYNC & RESTORE ---
  const handleSyncCloud = async () => {
    const res = await storage.syncCloud();
    setDb(storage.getDatabase());
    return res;
  };

  const handleResetDemo = () => {
    const fresh = storage.resetToDemo();
    setDb(fresh);
  };

  const handleImportBackup = (json: string) => {
    const ok = storage.importBackupJson(json);
    if (ok) {
      setDb(storage.getDatabase());
    }
    return ok;
  };

  if (!isAuthenticated) {
    return (
      <AuthScreen
        workshopProfile={db.profile}
        onLoginSuccess={handleLoginSuccess}
        initialTab="login"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] font-sans">
      {/* Fixed Responsive Left Sidebar (Ungrouped Independent Buttons) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileNavOpen(false);
        }}
        userRole={currentUser.role}
        badges={{
          lowStockCount,
          activeJobCardsCount,
          unpaidInvoicesCount,
          pendingWarrantyCount
        }}
        profile={db.profile}
        currentUser={currentUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isCloudSynced={db.isCloudSynced}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main Content Area (Offset on desktop screens by fixed left sidebar) */}
      <div id="app-main-shell" className="lg:pl-64 xl:pl-72 flex flex-col min-h-screen transition-[padding] duration-200">
        {/* Top Universal Navbar */}
        <Navbar
          profile={db.profile}
          currentUser={currentUser}
          users={db.users}
          readyNotifications={db.readyNotifications || []}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onSwitchUser={handleSwitchUser}
          onLogout={handleLogout}
          onOpenNewAccountModal={handleOpenNewAccountModal}
          isCloudSynced={db.isCloudSynced}
          lastSyncTime={db.lastCloudSync}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileNavOpen(!isMobileNavOpen)}
          isMobileMenuOpen={isMobileNavOpen}
          activeTab={activeTab}
        />

        {/* View Routing */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-5 pb-20 md:pb-12">
          {/* TAB 1: Workshop Dashboard */}
          {activeTab === 'dashboard' && (
            <WorkshopOverview
              jobCards={db.jobCards}
              appointments={db.appointments}
              parts={db.parts}
              invoices={db.invoices}
              technicians={db.technicians}
              warrantyClaims={db.warrantyClaims}
              profile={db.profile}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectJobCard={() => setActiveTab('jobcards')}
              onNewIntake={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 2: Spares Inventory (ABC/FMS, Barcode, Reorder, OTC, Returns) */}
          {activeTab === 'inventory' && (
            <InventoryManagement
              parts={db.parts || []}
              customers={db.customers || []}
              quotations={db.partsQuotations || []}
              salesOrders={db.partsSalesOrders || []}
              salesReturns={db.partsSalesReturns || []}
              purchaseOrders={db.purchaseOrders || []}
              invoices={db.invoices || []}
              profile={db.profile}
              userRole={currentUser.role}
              onAddPart={handleAddPart}
              onUpdatePart={handleUpdatePart}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onReceivePurchaseOrder={handleReceivePurchaseOrder}
              onCreateQuotation={handleCreateQuotation}
              onCreateSalesOrder={handleCreateSalesOrder}
              onDispatchOrder={handleDispatchOrder}
              onCreateSalesReturn={handleCreateSalesReturn}
              onViewJobCard={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 3: Job Card Management & Bays (Locked & Immutable) */}
          {activeTab === 'jobcards' && (
            <JobCardManagement
              jobCards={db.jobCards}
              appointments={db.appointments}
              customers={db.customers}
              technicians={db.technicians}
              availableParts={db.parts}
              servicePrices={db.servicePriceBook || db.servicePriceList || []}
              bays={db.bays}
              invoices={db.invoices}
              gatePasses={db.gatePasses || []}
              currentUser={currentUser}
              profile={db.profile}
              onCreateJobCard={handleCreateJobCard}
              onUpdateJobCard={handleUpdateJobCard}
              onUpdatePart={handleUpdatePart}
              onUpdateBay={(bay) => updateDb({ bays: (db.bays || []).map(b => b.id === bay.id ? bay : b) })}
              onCreateAppointment={handleCreateAppointment}
              onConvertToInvoice={handleConvertJobCardToInvoice}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewInvoice={(invoice) => {
                setActiveTab('billing');
                setPrintInvoice(invoice);
              }}
              onCreateQuotation={handleCreateQuotation}
              onCreateCreditNote={handleCreateCreditNote}
              onTriggerReadyNotification={handleTriggerReadyNotification}
              openIntakeTrigger={quickIntakeTrigger}
            />
          )}

          {/* TAB 4: Billing & Invoicing (Fonepay, NepalPay, 13% VAT) */}
          {activeTab === 'billing' && (
            <BillingManagement
              invoices={db.invoices}
              jobCards={db.jobCards}
              customers={db.customers}
              availableParts={db.parts}
              cashierVouchers={db.cashierVouchers || []}
              userRole={currentUser.role}
              gatePasses={db.gatePasses || []}
              profile={db.profile}
              currentUserName={currentUser.name}
              onCreateInvoice={handleCreateInvoice}
              onConvertJobCardToInvoice={handleConvertJobCardToInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onRecordPayment={handleRecordPayment}
              onCreateCreditNote={handleCreateCreditNote}
              onAddCashierVoucher={handleAddCashierVoucher}
              onViewGatePass={(gp) => setPrintGatePass(gp)}
            />
          )}

          {/* TAB 5: Warranty Management & OEM Claims */}
          {activeTab === 'warranty' && (
            <WarrantyManagement
              warrantyRecords={db.warrantyRecords || []}
              warrantyClaims={db.warrantyClaims || []}
              jobCards={db.jobCards || []}
              customers={db.customers || []}
              userRole={currentUser.role}
              onAddWarrantyRecord={handleAddWarrantyRecord}
              onCreateWarrantyClaim={handleAddWarrantyClaim}
              onUpdateWarrantyClaim={handleUpdateWarrantyClaim}
            />
          )}

          {/* TAB 7: Customer Directory & Sales Reports */}
          {activeTab === 'customers' && (
            <CustomerManagement
              customers={db.customers}
              invoices={db.invoices}
              jobCards={db.jobCards}
              gatePasses={db.gatePasses || []}
              userRole={currentUser.role}
              profile={db.profile}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewJobCard={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 8: Complete Accounting, Nepal VAT & P&L */}
          {activeTab === 'accounting' && (
            <AccountingReports
              invoices={db.invoices || []}
              parts={db.parts || []}
              profile={db.profile}
              glAccounts={db.glAccounts || []}
              journalEntries={db.journalEntries || []}
              purchaseOrders={db.purchaseOrders || []}
              onAddJournalEntry={handleAddJournalEntry}
              onAddGLAccount={handleAddGLAccount}
              userRole={currentUser.role}
            />
          )}

          {/* TAB 8: BI & Performance Analytics */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              jobCards={db.jobCards || []}
              invoices={db.invoices || []}
              parts={db.parts || []}
              technicians={db.technicians || []}
              bays={db.bays || []}
              customers={db.customers || []}
              warrantyClaims={db.warrantyClaims || []}
              profile={db.profile}
              userRole={currentUser.role}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* TAB 10: Admin Master Settings (Staff, Rates, Bays, IRD) */}
          {(activeTab === 'admin_settings' || activeTab === 'admin') && (
            <AdminMasterSettings
              profile={db.profile}
              users={db.users || []}
              customers={db.customers || []}
              parts={db.parts || []}
              priceBook={db.servicePriceBook || db.servicePriceList || []}
              bays={db.bays || []}
              technicians={db.technicians || []}
              userRole={currentUser.role}
              onSwitchUser={handleSwitchUser}
              onUpdateProfile={handleUpdateProfile}
              onUpdateUsers={handleUpdateUsers}
              onUpdateCustomers={(customers) => updateDb({ customers })}
              onUpdateParts={(parts) => updateDb({ parts })}
              onUpdatePriceBook={(priceBook) => updateDb({ servicePriceBook: priceBook, servicePriceList: priceBook })}
              onUpdateBays={handleUpdateBays}
              onUpdateTechnicians={handleUpdateTechnicians}
            />
          )}
        </main>
      </div>

      {/* Global Cloud Sync & Storage Management Modal */}
      {isCloudModalOpen && (
        <CloudSyncModal
          isSynced={db.isCloudSynced}
          lastSyncTime={db.lastCloudSync}
          onClose={() => setIsCloudModalOpen(false)}
          onSyncNow={handleSyncCloud}
          onResetDemo={handleResetDemo}
          onExportData={() => storage.exportBackupJson()}
          onImportData={handleImportBackup}
        />
      )}

      {/* Global Printable Nepal IRD Tax Invoice Modal (Live-Resolved with Integrated Gate Pass Footer) */}
      {(() => {
        const activePrintInvoice = printInvoice
          ? (db.invoices || []).find((i) => i.id === printInvoice.id) || printInvoice
          : null;
        if (!activePrintInvoice) return null;
        return (
          <PrintInvoiceModal
            invoice={activePrintInvoice}
            jobCard={(db.jobCards || []).find(
              jc => jc.id === activePrintInvoice.jobCardId || jc.jobCardNumber === activePrintInvoice.jobCardNumber
            )}
            gatePass={(db.gatePasses || []).find(
              gp => gp.invoiceId === activePrintInvoice.id || gp.invoiceNumber === activePrintInvoice.invoiceNumber
            )}
            profile={db.profile}
            onClose={() => setPrintInvoice(null)}
            onCreateCreditNote={handleCreateCreditNote}
          />
        );
      })()}

      {/* Keyboard Shortcuts Reference Dialog */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Global Printable Nepal Vehicle Gate Pass Modal */}
      {printGatePass && (
        <PrintGatePassModal
          gatePass={printGatePass}
          profile={db.profile}
          onClose={() => setPrintGatePass(null)}
          onMarkExited={(gatePassId) => {
            const updated = (db.gatePasses || []).map(gp => gp.id === gatePassId ? { ...gp, status: 'Exited' as const, exitTimestamp: new Date().toISOString() } : gp);
            updateDb({ gatePasses: updated });
            setPrintGatePass(prev => prev && prev.id === gatePassId ? { ...prev, status: 'Exited', exitTimestamp: new Date().toISOString() } : prev);
          }}
        />
      )}

      {/* Non-Blocking Vehicle Ready & Pickup SMS Notification Banner */}
      {activeReadyToast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-md w-[calc(100%-2rem)] bg-white border border-[#16A34A] rounded-xl shadow-xl overflow-hidden">
          <div className="bg-[#0F3D5E] text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#0EA5E9]" />
              <span className="text-xs font-bold">Vehicle Ready for Pickup — SMS Alert</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveReadyToast(null)}
              className="text-slate-300 hover:text-white p-0.5"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#0F172A]">
                {activeReadyToast.vehicleReg} · {activeReadyToast.jobCardNumber}
              </span>
              <span className="text-[10px] font-mono text-[#0284C7] font-semibold">
                B.S. {activeReadyToast.bsDate}
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">{activeReadyToast.message}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <a
                href={`sms:${(activeReadyToast.recipientPhone || '').replace(/[^0-9+]/g, '')}?body=${encodeURIComponent(activeReadyToast.message)}`}
                className="px-3 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1.5 transition"
              >
                <Send className="w-3 h-3" />
                <span>SMS Customer ({activeReadyToast.recipientPhone})</span>
              </a>
              <a
                href={`https://wa.me/${(activeReadyToast.recipientPhone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(activeReadyToast.message)}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add User Account Modal (with Role Options) */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <AuthScreen
            workshopProfile={db.profile}
            onLoginSuccess={handleLoginSuccess}
            initialTab="signup"
            isModal={true}
            onClose={() => setIsNewAccountModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
