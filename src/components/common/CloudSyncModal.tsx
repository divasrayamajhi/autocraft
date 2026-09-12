import React, { useState } from 'react';
import { Cloud, RefreshCw, Download, Upload, RotateCcw, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { storage, AppDatabase } from '../../services/storageService';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: () => void;
  lastCloudSync: string;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
  lastCloudSync
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    try {
      await storage.syncCloud();
      setSyncStatus('success');
      onDataUpdated();
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (err) {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = () => {
    const jsonStr = storage.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multibrand_dms_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = storage.importBackupJson(content);
        if (success) {
          setImportError(null);
          onDataUpdated();
          alert('Database successfully restored from JSON backup!');
          onClose();
        } else {
          setImportError('Invalid backup file structure.');
        }
      } catch (err) {
        setImportError('Failed to read or parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Are you sure you want to reset all DMS records back to default demo data? All custom records will be replaced.')) {
      storage.resetToDemo();
      onDataUpdated();
      alert('DMS database restored to demo state.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Cloud Sync & Data Storage</h3>
              <p className="text-xs text-slate-500">Local-First Storage with Cloud Replication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="my-5 space-y-4 text-sm">
          {/* Active status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold text-slate-800 text-xs">Local Storage Active</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Last Cloud Sync: <span className="font-mono">{new Date(lastCloudSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </p>
            </div>
            <button
              onClick={handleCloudSync}
              disabled={isSyncing}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {syncStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cloud replica synced successfully with all workshop tables.</span>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Backup & Restore controls */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Data Portability & Backup
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center justify-center space-x-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition shadow-sm"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center justify-center space-x-2 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:border-slate-300 transition shadow-sm cursor-pointer">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                onClick={handleResetDemo}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Demo Workshop Records</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
