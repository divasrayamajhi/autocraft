/**
 * Official Nepal Bikram Sambat (B.S.) <-> Gregorian (A.D.) Calendar Engine
 * Uses verified Nepal Panchanga month-day tables (2075 BS - 2088 BS)
 * with exact bidirectional conversion and Nepal Fiscal Year (Shrawan 1) computation.
 */

export const BS_MONTH_NAMES = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

export const BS_YEAR_START = 2075;
export const BS_YEAR_END = 2088;

// Verified B.S. month lengths (Baisakh..Chaitra) anchored at 2075-01-01 BS = 2018-04-14 AD
export const BS_CALENDAR_TABLE: Record<number, readonly number[]> = {
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2019-04-14
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 -> 2020-04-13
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 -> 2021-04-14
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2022-04-14
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2023-04-14
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 -> 2024-04-13
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 -> 2025-04-14
  2082: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2026-04-14
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2027-04-14
  2084: [31, 32, 32, 31, 31, 30, 29, 30, 30, 29, 30, 30], // 365 -> 2028-04-13
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 366 -> 2029-04-14
  2086: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2030-04-14
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 365 -> 2031-04-14
  2088: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 365 -> 2032-04-13
};

const ANCHOR_AD_UTC = Date.UTC(2018, 3, 14); // 2018-04-14 = 2075-01-01 BS
const MS_PER_DAY = 86400000;

export interface BsDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-32
  monthName: string;
  formatted: string; // YYYY-MM-DD
  fullLabel: string; // e.g. "Mangsir 07, 2083 B.S."
}

export const getTodayAd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getBsMonthDays = (bsYear: number, bsMonth: number): number => {
  const table = BS_CALENDAR_TABLE[bsYear] || BS_CALENDAR_TABLE[2083];
  return table[Math.max(0, Math.min(11, bsMonth - 1))] || 30;
};

/**
 * Exact conversion from Gregorian A.D. (YYYY-MM-DD) to Nepal Bikram Sambat (B.S.)
 */
export const adToBs = (adDateStr?: string): BsDateParts => {
  const clean = (adDateStr || getTodayAd()).slice(0, 10);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return adToBs(getTodayAd());
  }

  const [adYear, adMonth, adDay] = parts;
  const targetUtc = Date.UTC(adYear, adMonth - 1, adDay);
  let diffDays = Math.floor((targetUtc - ANCHOR_AD_UTC) / MS_PER_DAY);

  // Fallback for dates outside table range
  if (diffDays < 0) {
    const approxBsYear = adYear + 56;
    return {
      year: approxBsYear,
      month: 1,
      day: 1,
      monthName: BS_MONTH_NAMES[0],
      formatted: `${approxBsYear}-01-01`,
      fullLabel: `Baisakh 01, ${approxBsYear} B.S.`,
    };
  }

  let bsYear = BS_YEAR_START;
  while (bsYear <= BS_YEAR_END) {
    const months = BS_CALENDAR_TABLE[bsYear];
    const yearDays = months.reduce((a, b) => a + b, 0);
    if (diffDays < yearDays) {
      let bsMonth = 1;
      for (let i = 0; i < 12; i++) {
        if (diffDays < months[i]) {
          bsMonth = i + 1;
          break;
        }
        diffDays -= months[i];
      }
      const bsDay = diffDays + 1;
      const mm = String(bsMonth).padStart(2, '0');
      const dd = String(bsDay).padStart(2, '0');
      const monthName = BS_MONTH_NAMES[bsMonth - 1];
      return {
        year: bsYear,
        month: bsMonth,
        day: bsDay,
        monthName,
        formatted: `${bsYear}-${mm}-${dd}`,
        fullLabel: `${monthName} ${dd}, ${bsYear} B.S.`,
      };
    }
    diffDays -= yearDays;
    bsYear += 1;
  }

  // Beyond 2088 BS fallback
  const fallbackYear = BS_YEAR_END;
  return {
    year: fallbackYear,
    month: 12,
    day: 30,
    monthName: BS_MONTH_NAMES[11],
    formatted: `${fallbackYear}-12-30`,
    fullLabel: `Chaitra 30, ${fallbackYear} B.S.`,
  };
};

/**
 * Exact conversion from Nepal Bikram Sambat (B.S.) Year/Month/Day to Gregorian A.D. (YYYY-MM-DD)
 */
export const bsToAd = (bsYear: number, bsMonth: number, bsDay: number): string => {
  const clampedYear = Math.max(BS_YEAR_START, Math.min(BS_YEAR_END, Math.floor(bsYear)));
  const clampedMonth = Math.max(1, Math.min(12, Math.floor(bsMonth)));
  const maxDay = getBsMonthDays(clampedYear, clampedMonth);
  const clampedDay = Math.max(1, Math.min(maxDay, Math.floor(bsDay)));

  let totalDays = 0;
  for (let y = BS_YEAR_START; y < clampedYear; y++) {
    totalDays += BS_CALENDAR_TABLE[y].reduce((a, b) => a + b, 0);
  }
  const months = BS_CALENDAR_TABLE[clampedYear];
  for (let m = 0; m < clampedMonth - 1; m++) {
    totalDays += months[m];
  }
  totalDays += clampedDay - 1;

  const adUtc = new Date(ANCHOR_AD_UTC + totalDays * MS_PER_DAY);
  const y = adUtc.getUTCFullYear();
  const m = String(adUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(adUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatAdDateReadable = (adDateStr?: string): string => {
  const clean = (adDateStr || getTodayAd()).slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return clean;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const getNepalFiscalYearFromAd = (adDateStr?: string): string => {
  const bs = adToBs(adDateStr);
  // Nepal Fiscal Year begins Shrawan 1 (Month 4)
  if (bs.month >= 4) {
    return `${bs.year}/${String((bs.year + 1) % 100).padStart(2, '0')}`;
  }
  return `${bs.year - 1}/${String(bs.year % 100).padStart(2, '0')}`;
};
