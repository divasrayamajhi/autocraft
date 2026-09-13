import React from 'react';
import { GatePass, WorkshopProfile } from '../../types';
import { Printer, X, Share2, CheckCircle2, Shield, QrCode, Car, Clock, Calendar, User, Phone } from 'lucide-react';

interface PrintGatePassModalProps {
  gatePass: GatePass;
  profile: WorkshopProfile;
  onClose: () => void;
  onMarkExited?: (gatePassId: string) => void;
}

export const PrintGatePassModal: React.FC<PrintGatePassModalProps> = ({
  gatePass,
  profile,
  onClose,
  onMarkExited
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const message = `Namaste ${gatePass.customerName}! Vehicle Gate Pass ${gatePass.passNumber} has been issued for your vehicle ${gatePass.vehicleReg}. Invoice: ${gatePass.invoiceNumber}. Your vehicle is cleared for exit from ${profile.name}. Thank you!`;
    const cleanPhone = (gatePass.customerPhone || '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-100 text-emerald-800 uppercase tracking-wide flex items-center space-x-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Vehicle Security Gate Pass</span>
            </span>
            <h2 className="text-base font-bold text-slate-800">
              Pass #{gatePass.passNumber}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {gatePass.status === 'Cleared for Exit' && onMarkExited && (
              <button
                onClick={() => onMarkExited(gatePass.id)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark as Exited</span>
              </button>
            )}
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Pass Area */}
        <div className="p-8 overflow-y-auto print:p-0 text-slate-800 text-xs bg-white">
          {/* Workshop Header from Settings Profile */}
          <div className="text-center pb-4 border-b-2 border-slate-900">
            <h1 className="text-lg font-black text-slate-900 tracking-wide uppercase">
              {profile.legalEntityName || profile.name}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {profile.address}, {profile.city}, Nepal | Phone: {profile.contactNumber}
            </p>
            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
              PAN / VAT Registration No.: <span className="text-indigo-800 font-extrabold text-sm">{profile.panVatNumber}</span>
            </p>
            <div className="inline-block mt-3 px-5 py-1.5 border-2 border-slate-900 rounded font-black text-sm uppercase tracking-wider bg-slate-100">
              VEHICLE GATE PASS & EXIT PERMIT (सवारी साधन गेट पास)
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Authorized security exit voucher for vehicle and passenger dispatch
            </p>
          </div>

          {/* Pass Meta Header */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-200 bg-slate-50/70 px-4 rounded-xl mt-3">
            <div>
              <p><strong className="text-slate-500">Gate Pass No:</strong> <span className="font-mono font-bold text-slate-900 text-sm">{gatePass.passNumber}</span></p>
              <p><strong className="text-slate-500">Tax Invoice No:</strong> <span className="font-mono font-bold text-indigo-700">{gatePass.invoiceNumber}</span></p>
              {gatePass.jobCardNumber && (
                <p><strong className="text-slate-500">Job Card No:</strong> <span className="font-mono">{gatePass.jobCardNumber}</span></p>
              )}
            </div>
            <div className="text-right">
              <p><strong className="text-slate-500">Issue Date & Time:</strong> <span className="font-bold">{gatePass.issueDate} {gatePass.issueTime}</span></p>
              <p><strong className="text-slate-500">Authorized By:</strong> {gatePass.authorizedBy}</p>
              <p>
                <strong className="text-slate-500">Status: </strong> 
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  gatePass.status === 'Exited' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {gatePass.status.toUpperCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Vehicle & Customer Information Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Vehicle Box */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-200 pb-2">
                <Car className="w-4 h-4 text-indigo-600" />
                <span>Vehicle Identification</span>
              </div>
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-500">Registration #:</span>
                  <span className="font-mono font-black text-slate-900 text-sm uppercase">{gatePass.vehicleReg}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Make & Model:</span>
                  <span className="font-semibold text-slate-800">{gatePass.vehicleMake} {gatePass.vehicleModel}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">VIN / Chassis #:</span>
                  <span className="font-mono font-medium text-slate-700">{gatePass.vinNumber || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Engine #:</span>
                  <span className="font-mono font-medium text-slate-700">{gatePass.engineNumber || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Odometer Reading:</span>
                  <span className="font-mono font-bold text-slate-900">{gatePass.odometerReading?.toLocaleString() || 0} km</span>
                </p>
              </div>
            </div>

            {/* Customer & Visit Timeline */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-200 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Customer & Stay Timeline</span>
              </div>
              <div className="space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-bold text-slate-900">{gatePass.customerName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Contact Phone:</span>
                  <span className="font-mono text-slate-800">{gatePass.customerPhone}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Arrival Date & Time:</span>
                  <span className="text-slate-700">{gatePass.arrivalDate || 'N/A'} at {gatePass.entryTime || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Total Invoice (NPR):</span>
                  <span className="font-mono font-bold text-slate-900">रु. {gatePass.totalInvoiceAmount?.toLocaleString() || 'Cleared'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-bold text-emerald-700">{gatePass.paymentStatus || 'Cleared'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Security Clearance Checkpoints */}
          <div className="mt-4 p-4 border border-emerald-200 bg-emerald-50/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Security Inspection & Exit Clearance Criteria Verified</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                COMPLIANT
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-[11px] text-emerald-950">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Spare tyre & tools accounted</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Post-repair road test passed</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>IRD Tax Invoice generated</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Customer belongings intact</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Billing payment settlement</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Vehicle washed & clean</span>
              </div>
            </div>
            {gatePass.remarks && (
              <p className="mt-2 text-[11px] text-slate-600 italic border-t border-emerald-200/60 pt-1.5">
                <strong>Officer Remarks:</strong> {gatePass.remarks}
              </p>
            )}
          </div>

          {/* QR Verification and Sign-off */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-end justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 border border-slate-300 rounded-lg bg-white">
                <QrCode className="w-16 h-16 text-slate-900" />
              </div>
              <div>
                <p className="font-mono font-bold text-[11px] text-slate-800">
                  VERIFY GATE PASS
                </p>
                <p className="text-[10px] text-slate-500 max-w-[200px]">
                  Scan at security exit gate. Valid for 24 hours from invoice generation.
                </p>
                <p className="text-[9px] font-mono text-slate-400 mt-1">
                  SEC-HASH: {gatePass.id}-{gatePass.passNumber}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center text-[10px]">
              <div>
                <div className="border-b border-slate-400 w-32 mx-auto mb-1 h-8 flex items-end justify-center pb-1">
                  <span className="font-script text-xs text-slate-600 font-bold">{gatePass.authorizedBy}</span>
                </div>
                <p className="font-bold text-slate-700">Workshop In-Charge</p>
                <p className="text-slate-400">Authorized Signatory</p>
              </div>
              <div>
                <div className="border-b border-slate-400 w-32 mx-auto mb-1 h-8 flex items-end justify-center pb-1">
                  <span className="font-script text-xs text-slate-600">Signature</span>
                </div>
                <p className="font-bold text-slate-700">Security Gate Officer</p>
                <p className="text-slate-400">{gatePass.securityOfficerName || 'Main Gate Staff'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
