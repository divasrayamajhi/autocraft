import React, { useState } from 'react';
import { 
  JobCard, 
  Appointment, 
  Customer, 
  Technician, 
  SparePart, 
  JobCardStatus,
  UserAccount 
} from '../../types';
import { 
  Wrench, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  ArrowRight,
  Lock,
  FileText
} from 'lucide-react';
import { JobCardDetailModal } from './JobCardDetailModal';

interface JobCardManagementProps {
  jobCards: JobCard[];
  appointments: Appointment[];
  customers: Customer[];
  technicians: Technician[];
  availableParts: SparePart[];
  currentUser: UserAccount;
  onCreateJobCard: (newJc: JobCard) => void;
  onUpdateJobCard: (updatedJc: JobCard) => void;
  onCreateAppointment: (newApt: Appointment) => void;
  onConvertToInvoice: (jc: JobCard) => void;
}

const KANBAN_COLUMNS: { id: JobCardStatus; title: string; color: string }[] = [
  { id: 'Vehicle Check-in', title: 'Vehicle Check-in', color: 'border-slate-400 text-slate-700 bg-slate-50' },
  { id: 'Bay Assigned (In Progress)', title: 'In Bay (Repairs)', color: 'border-indigo-400 text-indigo-700 bg-indigo-50/50' },
  { id: 'Awaiting Spares', title: 'Awaiting Spares', color: 'border-amber-400 text-amber-700 bg-amber-50/50' },
  { id: 'Quality Check', title: 'Quality Check', color: 'border-purple-400 text-purple-700 bg-purple-50/50' },
  { id: 'Ready for Billing', title: 'Ready for Billing', color: 'border-emerald-400 text-emerald-700 bg-emerald-50/50' },
  { id: 'Delivered', title: 'Delivered Vehicles', color: 'border-slate-300 text-slate-500 bg-slate-50' }
];

const NEPAL_INSURERS = [
  'Shikhar Insurance Co. Ltd.',
  'Siddhartha Premier Insurance',
  'Himalayan Everest Insurance',
  'NLG Insurance Co. Ltd.',
  'Nepal Insurance Co. Ltd.',
  'United Ajod Insurance'
];

export const JobCardManagement: React.FC<JobCardManagementProps> = ({
  jobCards = [],
  appointments = [],
  customers = [],
  technicians = [],
  availableParts = [],
  currentUser,
  onCreateJobCard,
  onUpdateJobCard,
  onCreateAppointment,
  onConvertToInvoice
}) => {
  const safeJobCards = jobCards || [];
  const safeAppointments = appointments || [];
  const safeCustomers = customers || [];
  const safeTechnicians = technicians || [];
  const safeAvailableParts = availableParts || [];

  const [activeSubTab, setActiveSubTab] = useState<'kanban' | 'list' | 'appointments'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);

  // New Job Card Intake Modal State
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [intakeReg, setIntakeReg] = useState('');
  const [intakeBrand, setIntakeBrand] = useState('Hyundai');
  const [intakeModel, setIntakeModel] = useState('Creta SX');
  const [intakeCustName, setIntakeCustName] = useState('');
  const [intakeCustPhone, setIntakeCustPhone] = useState('+977-98');
  const [intakeServiceType, setIntakeServiceType] = useState<JobCard['serviceType']>('Periodic Maintenance Service');
  const [intakeOdo, setIntakeOdo] = useState(38000);
  const [intakeFuel, setIntakeFuel] = useState(60);
  const [intakeComplaints, setIntakeComplaints] = useState('Periodic 40,000 km general service, brake inspection, engine oil replacement.');
  const [intakeBay, setIntakeBay] = useState('Bay 1 (Mechanical Lift)');
  const [intakeTechId, setIntakeTechId] = useState(safeTechnicians[0]?.id || '');
  const [intakeIsCashless, setIntakeIsCashless] = useState(false);
  const [intakeInsuranceCo, setIntakeInsuranceCo] = useState(NEPAL_INSURERS[0]);

  // New Appointment Modal State
  const [isNewAptModalOpen, setIsNewAptModalOpen] = useState(false);
  const [aptName, setAptName] = useState('');
  const [aptPhone, setAptPhone] = useState('+977-98');
  const [aptReg, setAptReg] = useState('');
  const [aptMake, setAptMake] = useState('Toyota');
  const [aptModel, setAptModel] = useState('RAV4 Hybrid');
  const [aptDate, setAptDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
  const [aptService, setAptService] = useState('Periodic Maintenance Service');

  // Filter job cards
  const filteredCards = jobCards.filter((jc) => {
    const matchesSearch = 
      jc.jobCardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jc.vehicle.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jc.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      jc.customerPhone.includes(searchQuery);

    return matchesSearch;
  });

  // Handle New Job Card Submit
  const handleCreateJobCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeReg || !intakeCustName) {
      alert('Vehicle registration and customer name are required.');
      return;
    }

    const tech = technicians.find(t => t.id === intakeTechId);

    const newJc: JobCard = {
      id: `JC-${Date.now().toString().slice(-6)}`,
      jobCardNumber: `JC-81-${Math.floor(100 + Math.random() * 900)}`,
      customerId: `CUST-${Date.now().toString().slice(-4)}`,
      customerName: intakeCustName,
      customerPhone: intakeCustPhone,
      vehicle: {
        id: `VEH-${Date.now().toString().slice(-4)}`,
        registrationNumber: intakeReg.toUpperCase(),
        make: intakeBrand,
        brand: intakeBrand,
        model: intakeModel,
        fuelType: 'Petrol',
        year: 2022,
        vinNumber: `MAL${intakeReg.replace(/[^A-Z0-9]/g, '')}9812`,
        engineNumber: `ENG${intakeReg.replace(/[^A-Z0-9]/g, '')}`,
        odometerReading: intakeOdo,
        color: 'Pearl White',
        insuranceCompany: intakeIsCashless ? intakeInsuranceCo : undefined
      },
      serviceType: intakeServiceType,
      assignedTechnicianId: intakeTechId,
      assignedTechnicianName: tech?.name,
      bayNumber: intakeBay,
      status: 'Bay Assigned (In Progress)',
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      isInsuranceClaim: intakeIsCashless,
      insuranceClaimNumber: intakeIsCashless ? `CLM-${Date.now().toString().slice(-4)}` : undefined,
      isWarrantyClaim: false,
      isLocked: false,
      inspection: {
        fuelLevel: intakeFuel,
        odometer: intakeOdo,
        inventoryBelongings: {
          spareWheel: true,
          toolKit: true,
          jack: true,
          mats: true,
          stereo: true,
          penDriveOrCd: false
        },
        damages: [],
        customerVoiceComplaints: intakeComplaints.split('.').filter(s => s.trim().length > 0),
        advisorsObservations: ['Vehicle admitted via express intake. Standard safety checks initiated.', intakeComplaints]
      },
      laborItems: [
        {
          id: `LBR-${Date.now().toString().slice(-4)}`,
          description: `${intakeServiceType} Standard Labor Check`,
          hours: 2.0,
          hoursEstimated: 2.0,
          ratePerHour: 1000,
          vatRate: 13,
          totalAmount: 2000,
          technicianId: intakeTechId,
          technicianName: tech?.name,
          status: 'In Progress'
        }
      ],
      partsRequested: []
    };

    onCreateJobCard(newJc);
    setIsIntakeModalOpen(false);
  };

  // Convert Appointment to Job Card
  const handleConvertAppointment = (apt: Appointment) => {
    setIntakeReg(apt.vehicleReg);
    setIntakeBrand(apt.brand || apt.make || 'Hyundai');
    setIntakeModel(apt.model);
    setIntakeCustName(apt.customerName);
    setIntakeCustPhone(apt.customerPhone);
    setIntakeComplaints(apt.complaintsSummary);
    setIsIntakeModalOpen(true);
  };

  // Advance Stage in Kanban
  const handleAdvanceStage = (jc: JobCard, e: React.MouseEvent) => {
    e.stopPropagation();
    if (jc.isLocked) return;

    const stages: JobCardStatus[] = [
      'Vehicle Check-in',
      'Bay Assigned (In Progress)',
      'Awaiting Spares',
      'Quality Check',
      'Ready for Billing',
      'Delivered'
    ];
    const currentIdx = stages.indexOf(jc.status);
    if (currentIdx < stages.length - 1) {
      const nextStage = stages[currentIdx + 1];
      const updated = { ...jc, status: nextStage };
      onUpdateJobCard(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'kanban' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Agile Kanban Board</span>
          </button>

          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'list' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Job Card Register ({safeJobCards.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('appointments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
              activeSubTab === 'appointments' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments ({safeAppointments.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Reg, Job Card, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52 sm:w-64"
            />
          </div>

          {activeSubTab === 'appointments' ? (
            <button
              onClick={() => setIsNewAptModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          ) : (
            <button
              onClick={() => setIsIntakeModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Job Card</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: AGILE KANBAN BOARD */}
      {activeSubTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const columnCards = filteredCards.filter((jc) => jc.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-3 min-w-[240px] flex flex-col h-[calc(100vh-280px)] min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">{col.title}</span>
                  <span className="text-xs font-mono font-bold bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                    {columnCards.length}
                  </span>
                </div>

                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {columnCards.map((jc) => {
                    const totalLabor = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                    const partsList = jc.partsRequested || jc.partsItems || [];
                    const totalParts = partsList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                    const totalEstimate = totalLabor + totalParts;

                    return (
                      <div
                        key={jc.id}
                        onClick={() => setSelectedJobCard(jc)}
                        className={`bg-white rounded-xl p-3 border shadow-2xs hover:shadow-md transition cursor-pointer relative group ${
                          jc.isLocked ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-bold text-indigo-700">
                            {jc.jobCardNumber}
                          </span>
                          {jc.isLocked ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {jc.serviceType.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-900 truncate">
                          {jc.vehicle.registrationNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {jc.vehicle.brand} {jc.vehicle.model}
                        </div>

                        <div className="mt-2 text-[11px] text-slate-600 truncate flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{jc.customerName}</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                            {jc.bayNumber}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            रु. {totalEstimate.toLocaleString()}
                          </span>
                        </div>

                        {!jc.isLocked && col.id !== 'Delivered' && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={(e) => handleAdvanceStage(jc, e)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 p-1 rounded hover:bg-indigo-50"
                              title="Advance to next repair stage"
                            >
                              <span>Next Stage</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUBTAB 2: LIST VIEW */}
      {activeSubTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Job Card #</th>
                <th className="p-3.5">Vehicle Reg & Model</th>
                <th className="p-3.5">Customer Details</th>
                <th className="p-3.5">Bay & Lead Tech</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Record Lock</th>
                <th className="p-3.5 text-right">Estimate (NPR)</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCards.map((jc) => {
                const totalLabor = (jc.laborItems || []).reduce((acc, l) => acc + (l.totalAmount || 0), 0);
                const partsList = jc.partsRequested || jc.partsItems || [];
                const totalParts = partsList.reduce((acc, p) => acc + (p.totalAmount ?? ((p.quantity || 1) * (p.unitPrice || 0) - (p.discount || 0))), 0);
                const totalEstimate = totalLabor + totalParts;

                return (
                  <tr key={jc.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-indigo-700">
                      {jc.jobCardNumber}
                    </td>
                    <td className="p-3.5">
                      <div className="font-mono font-bold text-slate-900">{jc.vehicle.registrationNumber}</div>
                      <div className="text-[11px] text-slate-500">{jc.vehicle.brand} {jc.vehicle.model}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800">{jc.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{jc.customerPhone}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-700">{jc.bayNumber}</div>
                      <div className="text-[11px] text-slate-500">{jc.assignedTechnicianName || 'Unassigned'}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {jc.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {jc.isLocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Sealed</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Open</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      रु. {totalEstimate.toLocaleString()}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedJobCard(jc)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition"
                      >
                        Inspect & Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SUBTAB 3: APPOINTMENTS */}
      {activeSubTab === 'appointments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3.5">Booking ID</th>
                <th className="p-3.5">Customer & Phone</th>
                <th className="p-3.5">Vehicle Reg & Model</th>
                <th className="p-3.5">Scheduled Date & Time</th>
                <th className="p-3.5">Service Requested</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {safeAppointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 font-mono font-bold text-indigo-700">{apt.id}</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-900">{apt.customerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{apt.customerPhone}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="font-mono font-bold text-slate-800">{apt.vehicleReg}</div>
                    <div className="text-[11px] text-slate-500">{apt.brand} {apt.model}</div>
                  </td>
                  <td className="p-3.5 text-slate-700">{new Date(apt.scheduledDate).toLocaleString()}</td>
                  <td className="p-3.5 text-slate-600">{apt.serviceType}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleConvertAppointment(apt)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                    >
                      Convert to Job Card
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: DETAIL INSPECTION */}
      {selectedJobCard && (
        <JobCardDetailModal
          jobCard={selectedJobCard}
          availableParts={availableParts}
          technicians={technicians}
          currentUser={currentUser}
          onClose={() => setSelectedJobCard(null)}
          onUpdateJobCard={(upd) => {
            onUpdateJobCard(upd);
            setSelectedJobCard(upd);
          }}
          onConvertToInvoice={(jc) => {
            setSelectedJobCard(null);
            onConvertToInvoice(jc);
          }}
        />
      )}

      {/* MODAL: INTAKE JOB CARD */}
      {isIntakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h4 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Vehicle Check-in & Job Card Intake
            </h4>

            <form onSubmit={handleCreateJobCardSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Registration #</label>
                  <input
                    value={intakeReg}
                    onChange={e => setIntakeReg(e.target.value)}
                    placeholder="BA 02 CHA 8892"
                    className="w-full font-mono font-bold uppercase border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vehicle Make & Model</label>
                  <input
                    value={`${intakeBrand} ${intakeModel}`}
                    onChange={e => {
                      const parts = e.target.value.split(' ');
                      setIntakeBrand(parts[0] || 'Car');
                      setIntakeModel(parts.slice(1).join(' ') || 'Model');
                    }}
                    placeholder="Hyundai Creta SX"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Customer Full Name</label>
                  <input
                    value={intakeCustName}
                    onChange={e => setIntakeCustName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    value={intakeCustPhone}
                    onChange={e => setIntakeCustPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Workshop Bay</label>
                  <select
                    value={intakeBay}
                    onChange={e => setIntakeBay(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    <option value="Bay 1 (Mechanical Lift)">Bay 1 (Mechanical Lift)</option>
                    <option value="Bay 2 (Express Service)">Bay 2 (Express Service)</option>
                    <option value="Bay 3 (3D Wheel Alignment)">Bay 3 (3D Wheel Alignment)</option>
                    <option value="Bay 4 (Diagnostics)">Bay 4 (Diagnostics)</option>
                    <option value="Bay 5 (Body & Paint)">Bay 5 (Body & Paint)</option>
                    <option value="Bay 6 (Wash & Detailing)">Bay 6 (Wash & Detailing)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Technician</label>
                  <select
                    value={intakeTechId}
                    onChange={e => setIntakeTechId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    {safeTechnicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialization})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                <select
                  value={intakeServiceType}
                  onChange={e => setIntakeServiceType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                >
                  <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                  <option value="Running Repair">Running Repair</option>
                  <option value="Brake & Suspension Overhaul">Brake & Suspension Overhaul</option>
                  <option value="Engine Diagnostics & Tuning">Engine Diagnostics & Tuning</option>
                  <option value="Accidental Repair">Accidental Repair</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Reported Complaints</label>
                <textarea
                  value={intakeComplaints}
                  onChange={e => setIntakeComplaints(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="cashlessCheck"
                  checked={intakeIsCashless}
                  onChange={e => setIntakeIsCashless(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <label htmlFor="cashlessCheck" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Cashless Insurance Claim (Nepal Insurer)
                </label>
              </div>

              {intakeIsCashless && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Insurance Company</label>
                  <select
                    value={intakeInsuranceCo}
                    onChange={e => setIntakeInsuranceCo(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-medium"
                  >
                    {NEPAL_INSURERS.map(ins => (
                      <option key={ins} value={ins}>{ins}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsIntakeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold"
                >
                  Generate Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
