import React, { useState } from 'react';
import { GLAccount, GLJournalEntry } from '../../types';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';

interface CreateJournalVoucherModalProps {
  glAccounts: GLAccount[];
  existingEntriesCount: number;
  onSave: (entry: GLJournalEntry) => void;
  onClose: () => void;
}

interface JournalLineDraft {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export const CreateJournalVoucherModal: React.FC<CreateJournalVoucherModalProps> = ({
  glAccounts,
  existingEntriesCount,
  onSave,
  onClose
}) => {
  const nextNumber = `JV-2081-${(existingEntriesCount + 1).toString().padStart(3, '0')}`;
  const [entryNumber, setEntryNumber] = useState(nextNumber);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceDocument, setSourceDocument] = useState('');
  const [narration, setNarration] = useState('');
  
  const [lines, setLines] = useState<JournalLineDraft[]>([
    {
      accountCode: glAccounts[0]?.accountCode || '1010',
      accountName: glAccounts[0]?.accountName || 'Cash in Hand',
      debit: 0,
      credit: 0
    },
    {
      accountCode: glAccounts[1]?.accountCode || '1020',
      accountName: glAccounts[1]?.accountName || 'Bank Account',
      debit: 0,
      credit: 0
    }
  ]);

  const handleAccountChange = (index: number, code: string) => {
    const acc = glAccounts.find(a => a.accountCode === code);
    if (!acc) return;
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      accountCode: acc.accountCode,
      accountName: acc.accountName
    };
    setLines(updated);
  };

  const handleAmountChange = (index: number, field: 'debit' | 'credit', value: number) => {
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value),
      // If debit is entered, credit should be 0, and vice versa
      ...(field === 'debit' && value > 0 ? { credit: 0 } : {}),
      ...(field === 'credit' && value > 0 ? { debit: 0 } : {})
    };
    setLines(updated);
  };

  const handleAddLine = () => {
    const defaultAcc = glAccounts[0];
    setLines([
      ...lines,
      {
        accountCode: defaultAcc ? defaultAcc.accountCode : '',
        accountName: defaultAcc ? defaultAcc.accountName : '',
        debit: 0,
        credit: 0
      }
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
  const difference = Math.abs(totalDebit - totalCredit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;
    if (!narration.trim()) return;

    const newEntry: GLJournalEntry = {
      id: `JV-${Date.now()}`,
      entryNumber,
      date,
      sourceDocument: sourceDocument.trim() || 'MANUAL-VOUCHER',
      narration: narration.trim(),
      totalAmount: totalDebit,
      lines: lines.map(l => ({
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0
      }))
    };

    onSave(newEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                New General Journal Voucher
              </h3>
              <p className="text-xs text-slate-300">
                Double-Entry Accounting • Total Debits must equal Total Credits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-900">
          {/* Voucher Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Voucher #
              </label>
              <input
                type="text"
                value={entryNumber}
                onChange={(e) => setEntryNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-indigo-700 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Voucher Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Source Document #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-01, PO-02, NEA-081"
                value={sourceDocument}
                onChange={(e) => setSourceDocument(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Narration / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Paid workshop electricity bill via Nabil Bank Cheque"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Journal Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                Debit & Credit Ledger Lines
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="px-2.5 py-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2.5">GL Account</th>
                    <th className="p-2.5 text-right w-32">Debit (NPR)</th>
                    <th className="p-2.5 text-right w-32">Credit (NPR)</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleAccountChange(idx, e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {glAccounts.map((acc) => (
                            <option key={acc.accountCode} value={acc.accountCode}>
                              {acc.accountCode} - {acc.accountName} ({acc.category})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={line.debit || ''}
                          onChange={(e) => handleAmountChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                          className="w-full text-right p-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={line.credit || ''}
                          onChange={(e) => handleAmountChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                          className="w-full text-right p-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300">
                    <td className="p-2.5 text-right uppercase text-slate-700">Totals (NPR):</td>
                    <td className="p-2.5 text-right font-mono font-black text-indigo-900">
                      Rs. {totalDebit.toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-indigo-900">
                      Rs. {totalCredit.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Balance Status Banner */}
            <div className={`p-3 rounded-xl flex items-center justify-between text-xs font-semibold ${
              isBalanced 
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center space-x-2">
                {isBalanced ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>
                  {isBalanced 
                    ? 'Voucher is Balanced (Total Debits = Total Credits)'
                    : `Voucher is Out of Balance! Difference: Rs. ${difference.toLocaleString()} (Total Debits must equal Total Credits)`}
                </span>
              </div>
              <span className="font-mono text-xs">
                Net: Rs. {difference.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced || !narration.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md transition text-xs flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Post Journal Voucher</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
