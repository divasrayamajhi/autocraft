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
import { CloudSyncModal } from './components/common/CloudSyncModal';
import { PrintInvoiceModal } from './components/common/PrintInvoiceModal';
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
  BayArea
} from './types';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(() => storage.getDatabase());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => storage.isAuthenticated());
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

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

    // Mark JC as ready for billing
    const updatedJc: JobCard = { ...jc, status: 'Ready for Billing' };
    const updatedCards = db.jobCards.map(c => c.id === jc.id ? updatedJc : c);
    const updatedInvoices = [newInvoice, ...db.invoices];

    updateDb({ jobCards: updatedCards, invoices: updatedInvoices });
    setActiveTab('billing');
    setPrintInvoice(newInvoice);
  };

  // --- INVOICE & PAYMENT HANDLERS ---
  const handleCreateInvoice = (newInv: Invoice) => {
    const updated = [newInv, ...db.invoices];
    updateDb({ invoices: updated });
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

          {/* TAB 2: Spares Inventory (ABC/FMS, Barcode, Reorder) */}
          {activeTab === 'inventory' && (
            <InventoryManagement
              parts={db.parts}
              purchaseOrders={db.purchaseOrders}
              userRole={currentUser.role}
              onAddPart={handleAddPart}
              onUpdatePart={handleUpdatePart}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
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
              currentUser={currentUser}
              onCreateJobCard={handleCreateJobCard}
              onUpdateJobCard={handleUpdateJobCard}
              onCreateAppointment={handleCreateAppointment}
              onConvertToInvoice={handleConvertJobCardToInvoice}
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
              onCreateInvoice={handleCreateInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onRecordPayment={handleRecordPayment}
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

          {/* TAB 9: Admin Master Settings (Staff, Rates, Bays, IRD) */}
          {activeTab === 'admin' && (
            <AdminMasterSettings
              profile={db.profile}
              users={db.users}
              technicians={db.technicians}
              servicePriceList={db.servicePriceList}
              bays={db.bays}
              onUpdateProfile={handleUpdateProfile}
              onUpdateUsers={handleUpdateUsers}
              onUpdateTechnicians={handleUpdateTechnicians}
              onUpdateServicePriceList={handleUpdateServicePriceList}
              onUpdateBays={handleUpdateBays}
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
          onClose={() => setPrintInvoice(null)}
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
