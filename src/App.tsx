import React, { useState } from 'react';
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
import { InsuranceBilling } from './components/insurance/InsuranceBilling';
import { BillingManagement } from './components/billing/BillingManagement';
import { AccountingReports } from './components/accounting/AccountingReports';
import { WarrantyManagement } from './components/warranty/WarrantyManagement';
import { AdminMasterSettings } from './components/admin/AdminMasterSettings';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { PrintInvoiceModal } from './components/common/PrintInvoiceModal';
import { PrintGatePassModal } from './components/common/PrintGatePassModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { 
  JobCard, 
  Invoice, 
  InsuranceClaim, 
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
  GatePass
} from './types';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => storage.getDatabase());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => storage.isAuthenticated());
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printGatePass, setPrintGatePass] = useState<GatePass | null>(null);

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
  const insuranceClaimsList = db.insuranceClaims || [];
  const invoicesList = db.invoices || [];
  const warrantyClaimsList = db.warrantyClaims || [];
  const warrantyRecordsList = db.warrantyRecords || [];

  const lowStockCount = partsList.filter(p => p && p.currentStock <= p.minReorderLevel).length;
  const activeJobCardsCount = jobCardsList.filter(jc => jc && jc.status !== 'Delivered').length;
  const pendingInsuranceCount = insuranceClaimsList.filter(c => c && c.status !== 'Settled').length;
  const unpaidInvoicesCount = invoicesList.filter(i => i && i.status !== 'Paid').length;
  const pendingWarrantyCount = warrantyClaimsList.filter(w => w && (w.status === 'Submitted to OEM' || w.status === 'OEM Inspection / Under Review')).length;

  // --- USER SWITCHER ---
  const handleSwitchUser = (userId: string) => {
    storage.setCurrentUser(userId);
    setDb(storage.getDatabase());
  };

  // --- JOB CARDS HANDLERS ---
  const handleCreateJobCard = (newJc: JobCard) => {
    const updatedCards = [newJc, ...db.jobCards];
    updateDb({ jobCards: updatedCards });
  };

  const handleUpdateJobCard = (updatedJc: JobCard) => {
    const updatedCards = db.jobCards.map(jc => jc.id === updatedJc.id ? updatedJc : jc);
    updateDb({ jobCards: updatedCards });
  };

  const handleCreateAppointment = (newApt: Appointment) => {
    const updatedApts = [newApt, ...db.appointments];
    updateDb({ appointments: updatedApts });
  };

  // Convert Job Card to Nepal IRD Tax Invoice (13% VAT)
  const handleConvertJobCardToInvoice = (jc: JobCard) => {
    const rawParts = jc.partsRequested || jc.partsItems || [];
    const rawLabor = jc.laborItems || [];
    const partsSubtotal = rawParts.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
    const laborSubtotal = rawLabor.reduce((acc, l) => acc + (l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 1000))), 0);
    const taxableAmount = partsSubtotal + laborSubtotal;
    const vatRate = 13;
    const vatAmount = Math.round(taxableAmount * 0.13);
    const grandTotal = taxableAmount + vatAmount;

    const newInvoice: Invoice = {
      id: `INV-${Date.now().toString().slice(-5)}`,
      invoiceNumber: `TAX-81-${Math.floor(100 + Math.random() * 900)}`,
      jobCardId: jc.id,
      jobCardNumber: jc.jobCardNumber,
      customerId: jc.customerId,
      customerName: jc.customerName,
      customerPhone: jc.customerPhone,
      customerPan: undefined,
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
      balanceDue: grandTotal,
      paymentMethod: 'Fonepay',
      status: 'Unpaid',
      createdAt: new Date().toISOString(),
      type: jc.isInsuranceClaim ? 'Split Invoice - Customer Share' : 'Tax Invoice (कर बिजक)',
      isLocked: false,
      irdSyncDetails: {
        isSynced: true,
        syncedAt: new Date().toISOString(),
        cbmsAckNumber: `CBMS-${Date.now().toString().slice(-6)}`,
        fiscalYear: db.profile.fiscalYear
      },
      items: [
        ...rawLabor.map((l, idx) => ({
          id: `ITEM-L-${idx}`,
          itemType: 'Labor' as const,
          description: l.description,
          hsnSacCode: '998714',
          quantity: l.hours || l.hoursEstimated || 1,
          unitPrice: l.ratePerHour || 1000,
          taxableAmount: l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 1000)),
          vatRate: 13,
          vatAmount: Math.round((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 1000))) * 0.13),
          totalAmount: Math.round((l.totalAmount ?? ((l.hours || 1) * (l.ratePerHour || 1000))) * 1.13)
        })),
        ...rawParts.map((p, idx) => ({
          id: `ITEM-P-${idx}`,
          itemType: 'Part' as const,
          description: `${p.partName || p.name || 'Spare Part'} (${p.partNumber || 'GEN'})`,
          hsnSacCode: '87082900',
          quantity: p.quantity || 1,
          unitPrice: p.unitPrice || 0,
          taxableAmount: p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0)),
          vatRate: 13,
          vatAmount: Math.round((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 0.13),
          totalAmount: Math.round((p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0))) * 1.13)
        }))
      ]
    };

    // Prevent generating multiple bills for the same job card
    const existingInvoice = db.invoices.find(inv => 
      inv.jobCardId === jc.id || 
      inv.jobCardNumber === jc.jobCardNumber ||
      (jc.invoiceId && inv.id === jc.invoiceId) ||
      (jc.invoiceNumber && inv.invoiceNumber === jc.invoiceNumber)
    );

    if (existingInvoice) {
      alert(`An IRD Tax Invoice (#${existingInvoice.invoiceNumber}) already exists for this Job Card. Multiple invoices for the same Job Card are prohibited to avoid daily ledger discrepancies.`);
      setActiveTab('billing');
      setPrintInvoice(existingInvoice);
      return;
    }

    // User requirement: "When the job card is ready for billing and process to ird tax invoice, complete and delivered the job card automatically when the invoice is generated."
    const updatedJc: JobCard = { 
      ...jc, 
      status: 'Delivered',
      isLocked: true,
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber
    };
    const updatedCards = db.jobCards.map(c => c.id === jc.id ? updatedJc : c);
    const updatedInvoices = [newInvoice, ...db.invoices];

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
    const invoiceCustName = (newInvoice.customerName || '').trim().toLowerCase();
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

    updateDb({ 
      jobCards: updatedCards, 
      invoices: updatedInvoices, 
      gatePasses: updatedGatePasses,
      customers: updatedCustomers
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

    updateDb({ invoices: updated, gatePasses: updatedGatePasses, jobCards: updatedCards, customers: updatedCustomers });
  };

  const handleUpdateInvoice = (updatedInv: Invoice) => {
    const updated = db.invoices.map(i => i.id === updatedInv.id ? updatedInv : i);
    updateDb({ invoices: updated });
  };

  const handleRecordPayment = (invoiceId: string, amount: number, method: NepalPaymentMethod, ref: string) => {
    const inv = db.invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const newPaid = inv.paidAmount + amount;
    const newBalance = Math.max(0, inv.grandTotal - newPaid);
    const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';

    const updatedInv: Invoice = {
      ...inv,
      paidAmount: newPaid,
      balanceDue: newBalance,
      status: newStatus,
      paymentMethod: method,
      paymentReference: ref
    };

    // Update customer spend
    const updatedCustomers = db.customers.map(c => {
      if (c.name === inv.customerName) {
        return {
          ...c,
          totalSpent: c.totalSpent + amount,
          lastVisit: new Date().toISOString().slice(0, 10)
        };
      }
      return c;
    });

    handleUpdateInvoice(updatedInv);
    updateDb({ customers: updatedCustomers });
  };

  const handleCreateSplitInvoices = (customerInv: Invoice, insurerInv: Invoice) => {
    const updated = [customerInv, insurerInv, ...(db.invoices || [])];
    updateDb({ invoices: updated });
    setActiveTab('billing');
  };

  // --- INSURANCE CLAIMS HANDLERS ---
  const handleUpdateClaim = (claim: InsuranceClaim) => {
    const updated = (db.insuranceClaims || []).map(c => c.id === claim.id ? claim : c);
    updateDb({ insuranceClaims: updated });
  };

  const handleCreateClaim = (claim: InsuranceClaim) => {
    const updated = [claim, ...(db.insuranceClaims || [])];
    updateDb({ insuranceClaims: updated });
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
    const updatedPOs = [newPO, ...(db.purchaseOrders || [])];
    updateDb({ purchaseOrders: updatedPOs });
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

    // Automatically generate OTC Invoice in billing
    const otcInvoice: Invoice = {
      id: `INV-OTC-${order.id}`,
      invoiceNumber: `INV-81-OTC-${Math.floor(1000 + Math.random() * 9000)}`,
      fiscalYear: db.profile.fiscalYear || '2081/82',
      jobCardId: 'JC-OTC',
      jobCardNumber: 'OTC-SALES',
      customerName: order.customerName,
      customerPhone: '+977-9800000000',
      vehicleReg: 'OTC-WALKIN',
      vehicleModel: 'Direct Spares Sale',
      type: 'Tax Invoice (कर बिजक)',
      date: order.date || new Date().toISOString().slice(0, 10),
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

    updateDb({
      partsSalesOrders: updatedOrders,
      parts: updatedParts,
      partsQuotations: updatedQuotations,
      invoices: [otcInvoice, ...(db.invoices || [])],
      gatePasses: [otcGatePass, ...(db.gatePasses || [])]
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

    // Create Credit Note Invoice entry in invoices
    const creditNoteInvoice: Invoice = {
      id: `CN-${returnData.id}`,
      invoiceNumber: returnData.creditNoteNumber,
      fiscalYear: db.profile.fiscalYear || '2081/82',
      jobCardId: 'JC-RETURN',
      jobCardNumber: 'SALES-RETURN',
      customerName: returnData.customerName,
      customerPhone: '+977-9800000000',
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

    updateDb({
      partsSalesReturns: updatedReturns,
      parts: updatedParts,
      invoices: [creditNoteInvoice, ...(db.invoices || [])]
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
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans pb-24 md:pb-12">
      {/* Top Universal Navbar */}
      <Navbar
        profile={db.profile}
        currentUser={currentUser}
        users={db.users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenNewAccountModal={handleOpenNewAccountModal}
        isCloudSynced={db.isCloudSynced}
        lastSyncTime={db.lastCloudSync}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
      />

      {/* Main Responsive Layout */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 flex-1 flex flex-col space-y-4">
        {/* Role-Based Navigation Tabs */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={currentUser.role}
          badges={{
            lowStockCount,
            activeJobCardsCount,
            pendingInsuranceCount,
            unpaidInvoicesCount,
            pendingWarrantyCount
          }}
        />

        {/* View Routing */}
        <main className="flex-1">
          {/* TAB 1: Workshop Dashboard */}
          {activeTab === 'dashboard' && (
            <WorkshopOverview
              jobCards={db.jobCards}
              appointments={db.appointments}
              parts={db.parts}
              invoices={db.invoices}
              claims={db.insuranceClaims}
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
              userRole={currentUser.role}
              onAddPart={handleAddPart}
              onUpdatePart={handleUpdatePart}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
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
              invoices={db.invoices}
              gatePasses={db.gatePasses || []}
              currentUser={currentUser}
              onCreateJobCard={handleCreateJobCard}
              onUpdateJobCard={handleUpdateJobCard}
              onCreateAppointment={handleCreateAppointment}
              onConvertToInvoice={handleConvertJobCardToInvoice}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewInvoice={(invoice) => {
                setActiveTab('billing');
                setPrintInvoice(invoice);
              }}
              onCreateQuotation={handleCreateQuotation}
            />
          )}

          {/* TAB 4: Billing & Invoicing (Fonepay, NepalPay, 13% VAT) */}
          {activeTab === 'billing' && (
            <BillingManagement
              invoices={db.invoices}
              jobCards={db.jobCards}
              customers={db.customers}
              availableParts={db.parts}
              userRole={currentUser.role}
              gatePasses={db.gatePasses || []}
              profile={db.profile}
              onCreateInvoice={handleCreateInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onRecordPayment={handleRecordPayment}
              onViewGatePass={(gp) => setPrintGatePass(gp)}
            />
          )}

          {/* TAB 5: Cashless Insurance & Split Billing */}
          {activeTab === 'insurance' && (
            <InsuranceBilling
              claims={db.insuranceClaims}
              jobCards={db.jobCards}
              invoices={db.invoices}
              customers={db.customers}
              onUpdateClaim={handleUpdateClaim}
              onCreateClaim={handleCreateClaim}
              onCreateSplitInvoices={handleCreateSplitInvoices}
            />
          )}

          {/* TAB 6: Warranty Management & OEM Claims */}
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
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onViewJobCard={() => setActiveTab('jobcards')}
            />
          )}

          {/* TAB 8: Complete Accounting, Nepal VAT & P&L */}
          {activeTab === 'accounting' && (
            <AccountingReports
              invoices={db.invoices}
              parts={db.parts}
              profile={db.profile}
              glAccounts={db.glAccounts}
              journalEntries={db.journalEntries}
              userRole={currentUser.role}
            />
          )}

          {/* TAB 9: BI & Performance Analytics */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              jobCards={db.jobCards || []}
              invoices={db.invoices || []}
              parts={db.parts || []}
              technicians={db.technicians || []}
              bays={db.bays || []}
              customers={db.customers || []}
              insuranceClaims={db.insuranceClaims || []}
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

      {/* Global Printable Nepal IRD Tax Invoice Modal */}
      {printInvoice && (
        <PrintInvoiceModal
          invoice={printInvoice}
          profile={db.profile}
          onClose={() => setPrintInvoice(null)}
          onOpenGatePass={(inv) => {
            const now = new Date();
            const pass = (db.gatePasses || []).find(gp => gp.invoiceNumber === inv.invoiceNumber || gp.invoiceId === inv.id) || {
              id: `GP-${Date.now().toString().slice(-6)}`,
              passNumber: `GP-81-${Math.floor(1000 + Math.random() * 9000)}`,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              jobCardNumber: inv.jobCardNumber,
              vehicleReg: inv.vehicleReg,
              vehicleMake: inv.vehicleBrand || 'Multi-Brand',
              vehicleModel: inv.vehicleModel,
              odometerReading: 0,
              customerName: inv.customerName,
              customerPhone: inv.customerPhone,
              issueDate: now.toISOString().slice(0, 10),
              issueTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              authorizedBy: currentUser?.name || 'Workshop Manager',
              securityOfficerName: 'Main Gate Security',
              status: 'Cleared for Exit' as const,
              totalInvoiceAmount: inv.grandTotal,
              paymentStatus: inv.status
            };
            setPrintInvoice(null);
            setPrintGatePass(pass);
          }}
        />
      )}

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
