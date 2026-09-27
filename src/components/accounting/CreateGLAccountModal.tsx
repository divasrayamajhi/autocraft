import React, { useState } from 'react';
import { GLAccount } from '../../types';
import { X, Plus, CheckCircle2, BookOpen } from 'lucide-react';

interface CreateGLAccountModalProps {
  existingAccounts: GLAccount[];
  onSave: (account: GLAccount) => void;
  onClose: () => void;
}

export const CreateGLAccountModal: React.FC<CreateGLAccountModalProps> = ({
  existingAccounts,
  onSave,
  onClose
}) => {
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [category, setCategory] = useState<'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'>('Expense');
  const [subCategory, setSubCategory] = useState('Operating Expenses');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  const isCodeTaken = existingAccounts.some(a => a.accountCode.trim() === accountCode.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode.trim() || !accountName.trim() || isCodeTaken) return;

    const newAccount: GLAccount = {
      accountCode: accountCode.trim(),
      accountName: accountName.trim(),
      category,
      subCategory: subCategory.trim() || category,
      currentBalance: Number(openingBalance) || 0
    };

    onSave(newAccount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Add New GL Account
              </h3>
              <p className="text-xs text-slate-300">
                Chart of Accounts Ledger Definition
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-900">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Account Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 1050, 2030, 6020"
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              required
              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl font-mono font-bold text-xs focus:bg-white focus:outline-none focus:ring-2 ${
                isCodeTaken ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-900 focus:ring-indigo-500'
              }`}
            />
            {isCodeTaken && (
              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                This account code is already registered. Please use a unique code.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              GL Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Global IME Bank Ltd. - Current A/C"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Sub-Category
              </label>
              <input
                type="text"
                placeholder="e.g. Current Assets, Bank"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Opening Balance (NPR)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
              disabled={!accountCode.trim() || !accountName.trim() || isCodeTaken}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md transition text-xs flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
