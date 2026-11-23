import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  adToBs,
  bsToAd,
  BS_MONTH_NAMES,
  BS_YEAR_START,
  BS_YEAR_END,
  getBsMonthDays,
  formatAdDateReadable,
} from '../../utils/nepaliDate';

interface DualCalendarPickerProps {
  value: string; // AD YYYY-MM-DD
  onChange: (adDate: string) => void;
  label?: string;
  compact?: boolean;
  required?: boolean;
}

export const DualCalendarPicker: React.FC<DualCalendarPickerProps> = ({
  value,
  onChange,
  label,
  compact = false,
  required = false,
}) => {
  const [calendarMode, setCalendarMode] = useState<'AD' | 'BS'>('BS');
  const bs = adToBs(value);
  const daysInSelectedBsMonth = getBsMonthDays(bs.year, bs.month);

  const handleBsChange = (year: number, month: number, day: number) => {
    const maxDay = getBsMonthDays(year, month);
    const safeDay = Math.min(day, maxDay);
    const nextAd = bsToAd(year, month, safeDay);
    onChange(nextAd);
  };

  const bsYears: number[] = [];
  for (let y = BS_YEAR_START; y <= BS_YEAR_END; y++) {
    bsYears.push(y);
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block font-semibold text-[#0F172A] text-xs">
            {label} {required && <span className="text-[#DC2626]">*</span>}
          </label>
          <div className="inline-flex rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-0.5 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setCalendarMode('BS')}
              className={`px-2 py-0.5 rounded transition ${
                calendarMode === 'BS'
                  ? 'bg-[#0F3D5E] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              B.S.
            </button>
            <button
              type="button"
              onClick={() => setCalendarMode('AD')}
              className={`px-2 py-0.5 rounded transition ${
                calendarMode === 'AD'
                  ? 'bg-[#0EA5E9] text-white'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              A.D.
            </button>
          </div>
        </div>
      )}

      {!label && (
        <div className="inline-flex items-center space-x-1 mb-1">
          <button
            type="button"
            onClick={() => setCalendarMode('BS')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
              calendarMode === 'BS'
                ? 'bg-[#0F3D5E] text-white border-[#0F3D5E]'
                : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0]'
            }`}
          >
            B.S. Calendar
          </button>
          <button
            type="button"
            onClick={() => setCalendarMode('AD')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
              calendarMode === 'AD'
                ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0]'
            }`}
          >
            A.D. Calendar
          </button>
        </div>
      )}

      {calendarMode === 'AD' ? (
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-[#0284C7] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={value}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            required={required}
            className="w-full pl-8 pr-2.5 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          <select
            aria-label="Nepali B.S. Year"
            value={bs.year}
            onChange={(e) => handleBsChange(Number(e.target.value), bs.month, bs.day)}
            className="px-2 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          >
            {bsYears.map((y) => (
              <option key={y} value={y}>
                {y} BS
              </option>
            ))}
          </select>

          <select
            aria-label="Nepali B.S. Month"
            value={bs.month}
            onChange={(e) => handleBsChange(bs.year, Number(e.target.value), bs.day)}
            className="px-2 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          >
            {BS_MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {String(idx + 1).padStart(2, '0')} - {name}
              </option>
            ))}
          </select>

          <select
            aria-label="Nepali B.S. Day"
            value={bs.day}
            onChange={(e) => handleBsChange(bs.year, bs.month, Number(e.target.value))}
            className="px-2 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg font-mono text-xs font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          >
            {Array.from({ length: daysInSelectedBsMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#64748B] font-mono">
        <span>
          B.S.: <strong className="text-[#0F3D5E]">{bs.fullLabel}</strong>
        </span>
        <span>
          A.D.: <strong className="text-[#0284C7]">{formatAdDateReadable(value)} ({value})</strong>
        </span>
      </div>
    </div>
  );
};
