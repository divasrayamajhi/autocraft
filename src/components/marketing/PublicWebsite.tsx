import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Layers,
  Lock,
  Package,
  Receipt,
  Server,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import heroWorkshopImg from '../../assets/images/hero_autocraft_workshop_1795661323683.jpg';
import diagnosticBayImg from '../../assets/images/feature_diagnostic_bay_1795661326164.jpg';
import { APP_ROOT_DOMAIN, normalizeCompanySlug } from '../../services/apiClient';

interface PublicWebsiteProps {
  onOpenWorkspaceLogin: (companyHint?: string) => void;
  onOpenDeveloperLogin: () => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  onOpenWorkspaceLogin,
  onOpenDeveloperLogin,
}) => {
  const [inquiryForm, setInquiryForm] = useState({
    companyName: '',
    desiredSubdomain: '',
    adminEmail: '',
    city: 'Kathmandu',
    bayCount: '6–15 Service Bays',
  });
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquirySubmitted, setInquirySubmitted] = useState<{
    companyName: string;
    subdomain: string;
    adminEmail: string;
  } | null>(null);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError(null);

    const company = inquiryForm.companyName.trim();
    const email = inquiryForm.adminEmail.trim();
    const slug = normalizeCompanySlug(inquiryForm.desiredSubdomain || company);

    if (company.length < 2) {
      setInquiryError('Please enter your workshop or dealership company name.');
      return;
    }
    if (slug.length < 2) {
      setInquiryError('Please provide a valid subdomain prefix (at least 2 letters or digits).');
      return;
    }
    if (!email.includes('@') || email.length < 5) {
      setInquiryError('Please enter a valid primary administrator work email.');
      return;
    }

    setInquirySubmitted({
      companyName: company,
      subdomain: slug,
      adminEmail: email,
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A] font-sans selection:bg-[#0EA5E9] selection:text-white">
      {/* Top Navigation Bar (Strict Single-Row, Two Distinct Login Entry Points) */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center space-x-2.5 shrink-0 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0F3D5E] text-white flex items-center justify-center">
              <Wrench className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-bold tracking-tight text-[#0F172A] whitespace-nowrap">
                AutoCraft Pro
              </span>
              <span className="hidden md:inline text-xs font-mono text-[#64748B] whitespace-nowrap">
                {APP_ROOT_DOMAIN}
              </span>
            </div>
          </a>

          {/* Primary Website Navigation */}
          <nav className="hidden lg:flex items-center space-x-7 text-sm font-medium text-[#475569]">
            <a href="#modules" className="hover:text-[#0F3D5E] transition-colors whitespace-nowrap">
              Workshop Modules
            </a>
            <a href="#architecture" className="hover:text-[#0F3D5E] transition-colors whitespace-nowrap">
              Subdomain Isolation
            </a>
            <a href="#compliance" className="hover:text-[#0F3D5E] transition-colors whitespace-nowrap">
              Nepal IRD &amp; B.S.
            </a>
            <a href="#onboarding" className="hover:text-[#0F3D5E] transition-colors whitespace-nowrap">
              Client Onboarding
            </a>
          </nav>

          {/* Distinct Login Controls: Developer Login + Workspace Account Login */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              id="nav-btn-developer-login"
              type="button"
              onClick={onOpenDeveloperLogin}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0F3D5E] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Server className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>Developer Login</span>
            </button>

            <button
              id="nav-btn-workspace-login"
              type="button"
              onClick={() => onOpenWorkspaceLogin()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Workspace Login</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#0EA5E9]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Editorial Copy (5 columns) */}
            <div className="lg:col-span-5 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
                Multi-Brand Service Center ERP · Nepal
              </p>

              <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A] tracking-tight leading-[1.08]">
                Every bay, spare part, and IRD tax invoice under one roof.
              </h1>

              <p className="text-base text-[#475569] leading-relaxed">
                AutoCraft Pro gives multi-brand automotive workshops and EV service centers a dedicated cloud workspace on their own{' '}
                <span className="font-mono text-sm text-[#0F3D5E] font-semibold">
                  &lt;company&gt;.{APP_ROOT_DOMAIN}
                </span>{' '}
                subdomain — connecting job cards, parts inventory, gate passes, and double-entry B.S. accounting in real time.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenWorkspaceLogin()}
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Login to Your Workspace</span>
                  <ArrowRight className="w-4 h-4 text-[#0EA5E9]" />
                </button>

                <a
                  href="#onboarding"
                  className="inline-flex items-center space-x-2 px-5 py-3 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Request Onboarding</span>
                </a>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#64748B]">
                <span className="inline-flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>13% Nepal IRD VAT &amp; CBMS Ready</span>
                </span>
                <span className="inline-flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Tenant-Isolated Cloud Storage</span>
                </span>
              </div>
            </div>

            {/* Bespoke Workshop Visual (7 columns) */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#0F3D5E] shadow-xl">
                <img
                  src={heroWorkshopImg}
                  alt="Modern multi-brand automotive service center bay running AutoCraft Pro operations"
                  className="w-full h-[320px] sm:h-[420px] object-cover object-center block"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quantified Proof Strip */}
      <section className="bg-[#FFFFFF] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x lg:divide-[#E2E8F0]">
            <div className="lg:pr-6">
              <p className="text-2xl sm:text-3xl font-bold text-[#0F3D5E] font-mono tabular-nums">
                13% VAT
              </p>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Sequential IRD tax invoices, credit notes, and automatic GL posting
              </p>
            </div>
            <div className="lg:px-6">
              <p className="text-2xl sm:text-3xl font-bold text-[#0F3D5E] font-mono tabular-nums">
                B.S. / A.D.
              </p>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Synchronized Nepali Bikram Sambat dates and fiscal year numbering
              </p>
            </div>
            <div className="lg:px-6">
              <p className="text-2xl sm:text-3xl font-bold text-[#0F3D5E] font-mono tabular-nums">
                5 Roles
              </p>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Admin, Advisor, Technician, Parts Manager, and Billing Cashier RBAC
              </p>
            </div>
            <div className="lg:pl-6">
              <p className="text-2xl sm:text-3xl font-bold text-[#0F3D5E] font-mono tabular-nums">
                100% Isolated
              </p>
              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                Dedicated company subdomain with tenant-scoped Firestore security
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workshop Modules (01–04 Asymmetric Grid) */}
      <section id="modules" className="py-20 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
              Integrated Service Operations
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight">
              Built for real floor traffic, from vehicle intake to gate exit.
            </h2>
            <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
              Eliminate disconnected spreadsheets across reception, spare parts counters, and accounts. Every stage feeds the next with immutable audit trails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {/* Module 01 */}
            <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0284C7]">01</span>
                  <Wrench className="w-5 h-5 text-[#0F3D5E]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">
                  Job Cards, Bay Allocation &amp; Vehicle Gate Passes
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Capture multi-brand vehicle intake, assign service bays and technicians, request spare parts directly to the job, and auto-lock delivered cards once the tax invoice and security gate pass are issued.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A] block">Bay Dispatch</span>
                  <span className="text-[#64748B]">Live lift occupancy</span>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">Closure Lock</span>
                  <span className="text-[#64748B]">Admin-only reopen</span>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">Pickup SMS</span>
                  <span className="text-[#64748B]">Ready alerts &amp; WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Module 02 */}
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0284C7]">02</span>
                  <Package className="w-5 h-5 text-[#0F3D5E]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">
                  Spare Parts Master &amp; OTC Counter
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Track OEM SKUs with barcode lookup, ABC/FMS velocity alerts, vendor purchase orders, parts quotations, over-the-counter invoicing, and controlled stock returns.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
                <span>Real-time stock deduction on issue</span>
                <span className="font-mono font-semibold text-[#0F3D5E]">SKU + HSN</span>
              </div>
            </div>

            {/* Module 03 */}
            <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0284C7]">03</span>
                  <Receipt className="w-5 h-5 text-[#0F3D5E]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">
                  Nepal IRD 13% VAT Billing &amp; Double-Entry GL
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Generate IRD-compliant tax invoices with individual or company PAN/VAT details, % or NPR discounts, Fonepay/connectIPS/cash settlements, sales VAT registers, and automated Profit &amp; Loss reports.
                </p>
              </div>
              <div className="pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B] flex items-center justify-between">
                <span>Trial Balance, P&amp;L &amp; VAT Ledger</span>
                <span className="font-mono font-semibold text-[#0F3D5E]">FY 2081/82</span>
              </div>
            </div>

            {/* Module 04 */}
            <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#0284C7]">04</span>
                  <ShieldCheck className="w-5 h-5 text-[#0F3D5E]" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A]">
                  Customer Garages, Warranty Claims &amp; BI Analytics
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  Maintain complete service history per registration plate, manage OEM warranty claims and insurance approvals, and monitor technician efficiency, parts margin, and daily cash collection.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E2E8F0] text-xs">
                <div>
                  <span className="font-semibold text-[#0F172A] block">Vehicle History</span>
                  <span className="text-[#64748B]">Odometer &amp; reminders</span>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">OEM Claims</span>
                  <span className="text-[#64748B]">Approval lifecycle</span>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A] block">Workshop BI</span>
                  <span className="text-[#64748B]">Revenue &amp; bay metrics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Subdomain Isolation & Diagnostic Showcase */}
      <section id="architecture" className="py-20 bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-lg">
                <img
                  src={diagnosticBayImg}
                  alt="Organized spare parts management and vehicle diagnostic inspection terminal"
                  className="w-full h-[340px] sm:h-[400px] object-cover object-center block"
                />
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
                Multi-Tenant Subdomain Architecture
              </p>
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight leading-tight">
                Your workshop runs on its own dedicated subdomain.
              </h2>
              <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                When your company is onboarded by our platform engineering team, you receive a private URL such as{' '}
                <span className="font-mono font-semibold text-[#0F3D5E]">
                  lavish.{APP_ROOT_DOMAIN}
                </span>
                . Your company identity, PAN/VAT number, staff roles, customers, and financial ledgers remain strictly isolated from every other workshop on the platform.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start space-x-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0F3D5E] text-[#0EA5E9] flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Company-Scoped Workspace Sign-In
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Enter your Company Name, Work Email, and Password on the workspace sign-in portal to launch directly into your tenant subdomain.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0F3D5E] text-[#0EA5E9] flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Tenant Admin Controls Staff Profiles
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Once onboarded, your assigned Workshop Admin manages staff profiles, role permissions, service rates, and bay setup directly inside Master Settings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0F3D5E] text-[#0EA5E9] flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">
                      Monitored Cloud Storage &amp; Bandwidth Quotas
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                      Real-time Cloud Firestore synchronization with dedicated storage and network throughput plans for Starter, Professional, and Enterprise service groups.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nepal Compliance & Accounting Highlight */}
      <section id="compliance" className="py-16 bg-[#0F3D5E] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0EA5E9]">
                Engineered for Nepali Workshops
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                IRD CBMS Tax Invoicing, Bikram Sambat Calendar &amp; Local Digital Payments
              </h2>
              <p className="text-sm text-sky-100/85 leading-relaxed max-w-2xl">
                Every invoice prints with verified PAN/VAT registration, 13% VAT breakdown, B.S. &amp; A.D. dates, Fonepay / connectIPS / Cash settlement logging, and integrated vehicle exit gate passes.
              </p>
            </div>
            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
              <button
                type="button"
                onClick={() => onOpenWorkspaceLogin()}
                className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-lg bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Try Interactive Demo</span>
              </button>
              <a
                href="#onboarding"
                className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-lg border border-white/25 hover:bg-white/10 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span>Onboard Your Workshop</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Client Onboarding Inquiry Section */}
      <section id="onboarding" className="py-20 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
                Managed Provisioning
              </p>
              <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">
                Ready to onboard your service center?
              </h2>
              <p className="text-sm text-[#475569] leading-relaxed">
                New client workspaces are provisioned directly by the AutoCraft Pro engineering team to guarantee clean subdomain routing, PAN/VAT setup, and isolated cloud database quotas.
              </p>
              <div className="pt-3 space-y-2.5 text-xs text-[#475569]">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-[#0284C7]" />
                  <span>Typical workspace provisioning completed within 1 business day</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-[#0284C7]" />
                  <span>
                    Includes dedicated <span className="font-mono text-[#0F3D5E]">&lt;company&gt;.{APP_ROOT_DOMAIN}</span> workspace URL
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8">
              {inquirySubmitted ? (
                <div className="space-y-4 py-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Onboarding Request Recorded
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    We have logged your onboarding request for{' '}
                    <strong className="text-[#0F172A]">{inquirySubmitted.companyName}</strong> at{' '}
                    <span className="font-mono font-semibold text-[#0284C7]">
                      {inquirySubmitted.subdomain}.{APP_ROOT_DOMAIN}
                    </span>
                    . Our platform developer will provision your tenant and notify{' '}
                    <strong className="text-[#0F172A]">{inquirySubmitted.adminEmail}</strong>.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenWorkspaceLogin()}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Open Workspace Login</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInquirySubmitted(null);
                        setInquiryForm({
                          companyName: '',
                          desiredSubdomain: '',
                          adminEmail: '',
                          city: 'Kathmandu',
                          bayCount: '6–15 Service Bays',
                        });
                      }}
                      className="px-4 py-2.5 rounded-lg border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-semibold text-[#0F172A] cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Company / Workshop Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={inquiryForm.companyName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInquiryForm((prev) => ({
                            ...prev,
                            companyName: val,
                            desiredSubdomain: prev.desiredSubdomain || normalizeCompanySlug(val),
                          }));
                        }}
                        placeholder="e.g. Lavish Mobility Pvt. Ltd."
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Preferred Workspace Subdomain *
                      </label>
                      <div className="flex items-center rounded-lg border border-[#CBD5E1] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#0EA5E9]">
                        <input
                          type="text"
                          required
                          value={inquiryForm.desiredSubdomain}
                          onChange={(e) =>
                            setInquiryForm((prev) => ({
                              ...prev,
                              desiredSubdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                            }))
                          }
                          placeholder="lavish"
                          className="flex-1 px-3.5 py-2.5 font-mono text-[#0F172A] outline-none bg-transparent"
                        />
                        <span className="px-3 py-2.5 bg-[#F1F5F9] border-l border-[#CBD5E1] font-mono text-[#64748B]">
                          .{APP_ROOT_DOMAIN}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        Primary Admin Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={inquiryForm.adminEmail}
                        onChange={(e) =>
                          setInquiryForm((prev) => ({ ...prev, adminEmail: e.target.value }))
                        }
                        placeholder="admin@yourworkshop.com.np"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0F172A] mb-1.5">
                        City / Service Capacity
                      </label>
                      <select
                        value={inquiryForm.bayCount}
                        onChange={(e) =>
                          setInquiryForm((prev) => ({ ...prev, bayCount: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                      >
                        <option value="1–5 Service Bays">1–5 Service Bays (Starter)</option>
                        <option value="6–15 Service Bays">6–15 Service Bays (Professional)</option>
                        <option value="16+ Bays / Multi-Branch">16+ Bays / Multi-Branch (Enterprise)</option>
                      </select>
                    </div>
                  </div>

                  {inquiryError && (
                    <p className="text-xs font-semibold text-[#DC2626]">{inquiryError}</p>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[11px] text-[#64748B]">
                      Already onboarded? Use Workspace Login in the top bar.
                    </span>
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#0F3D5E] hover:bg-[#0c314c] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <span>Request Tenant Provisioning</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0EA5E9]" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Platform Footer */}
      <footer className="bg-[#F8FAFC] border-t border-[#E2E8F0] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <div className="flex items-center space-x-2">
            <Wrench className="w-3.5 h-3.5 text-[#0F3D5E]" />
            <span className="font-semibold text-[#0F172A]">AutoCraft Pro</span>
            <span>·</span>
            <span className="font-mono">{APP_ROOT_DOMAIN}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Kathmandu, Nepal</span>
          </div>

          <div className="flex items-center space-x-5">
            <button
              type="button"
              onClick={() => onOpenWorkspaceLogin()}
              className="hover:text-[#0F3D5E] font-medium transition-colors cursor-pointer"
            >
              Workspace Login
            </button>
            <button
              type="button"
              onClick={onOpenDeveloperLogin}
              className="hover:text-[#0F3D5E] font-medium transition-colors cursor-pointer"
            >
              Developer Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
