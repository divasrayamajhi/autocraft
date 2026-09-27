import { AppThemeConfig, ThemeColorPreset, ThemeMode, ThemeFont, ThemeIconStyle, ThemeBorderRadius, ThemeSidebarStyle } from '../types';

const THEME_STORAGE_KEY = 'NEPAL_WORKSHOP_THEME_CONFIG';

export interface ThemePreset {
  id: string;
  name: string;
  nepaliName?: string;
  description: string;
  primaryColor: ThemeColorPreset;
  mode: ThemeMode;
  fontFamily: ThemeFont;
  iconStyle: ThemeIconStyle;
  borderRadius: ThemeBorderRadius;
  sidebarStyle: ThemeSidebarStyle;
  accentHex: string;
  previewBg: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sagarmatha',
    name: 'Sagarmatha Classic',
    description: 'Signature Royal Indigo with Slate 900 fixed sidebar and crisp light cards.',
    primaryColor: 'indigo',
    mode: 'light',
    fontFamily: 'Plus Jakarta Sans',
    iconStyle: 'stroke',
    borderRadius: 'rounded-xl',
    sidebarStyle: 'slate-dark',
    accentHex: '#4f46e5',
    previewBg: 'bg-indigo-600'
  },
  {
    id: 'himalayan_emerald',
    name: 'Himalayan Emerald',
    description: 'Fresh organic Emerald Green with clean slate canvas and high-contrast text.',
    primaryColor: 'emerald',
    mode: 'light',
    fontFamily: 'Outfit',
    iconStyle: 'badge',
    borderRadius: 'rounded-xl',
    sidebarStyle: 'slate-dark',
    accentHex: '#059669',
    previewBg: 'bg-emerald-600'
  },
  {
    id: 'kathmandu_crimson',
    name: 'Kathmandu Crimson',
    description: 'High-octane Automotive Racing Crimson paired with charcoal stealth borders.',
    primaryColor: 'crimson',
    mode: 'light',
    fontFamily: 'Plus Jakarta Sans',
    iconStyle: 'bold',
    borderRadius: 'rounded-xl',
    sidebarStyle: 'charcoal-dark',
    accentHex: '#e11d48',
    previewBg: 'bg-rose-600'
  },
  {
    id: 'pokhara_amber',
    name: 'Pokhara Amber Glow',
    description: 'Warm gold-amber accents with warm neutral background and soft curvature.',
    primaryColor: 'amber',
    mode: 'warm',
    fontFamily: 'DM Sans',
    iconStyle: 'badge',
    borderRadius: 'rounded-2xl',
    sidebarStyle: 'slate-dark',
    accentHex: '#d97706',
    previewBg: 'bg-amber-600'
  },
  {
    id: 'monsoon_ocean',
    name: 'Monsoon Blue & Navy',
    description: 'Deep Pacific Royal Blue with dark navy sidebar and crystal clarity.',
    primaryColor: 'blue',
    mode: 'light',
    fontFamily: 'Inter',
    iconStyle: 'stroke',
    borderRadius: 'rounded-xl',
    sidebarStyle: 'navy-dark',
    accentHex: '#2563eb',
    previewBg: 'bg-blue-600'
  },
  {
    id: 'midnight_luxury',
    name: 'Midnight Dark Luxury',
    description: 'Eye-friendly deep dark canvas with vibrant violet neon accents for service bays.',
    primaryColor: 'purple',
    mode: 'dark',
    fontFamily: 'JetBrains Mono',
    iconStyle: 'badge',
    borderRadius: 'rounded-xl',
    sidebarStyle: 'charcoal-dark',
    accentHex: '#9333ea',
    previewBg: 'bg-purple-600'
  },
  {
    id: 'stealth_titanium',
    name: 'Stealth Titanium',
    description: 'Executive monochrome slate palette with crisp typography and minimal noise.',
    primaryColor: 'slate',
    mode: 'slate',
    fontFamily: 'Plus Jakarta Sans',
    iconStyle: 'minimal',
    borderRadius: 'rounded-md',
    sidebarStyle: 'slate-dark',
    accentHex: '#334155',
    previewBg: 'bg-slate-700'
  },
  {
    id: 'devanagari_heritage',
    name: 'Modern Glacier Cyan',
    description: 'Crisp arctic cyan with high precision typography and modern rounded borders.',
    primaryColor: 'cyan',
    mode: 'light',
    fontFamily: 'Plus Jakarta Sans',
    iconStyle: 'badge',
    borderRadius: 'rounded-2xl',
    sidebarStyle: 'navy-dark',
    accentHex: '#0891b2',
    previewBg: 'bg-cyan-600'
  }
];

export const DEFAULT_THEME: AppThemeConfig = {
  preset: 'sagarmatha',
  primaryColor: 'indigo',
  mode: 'light',
  fontFamily: 'Plus Jakarta Sans',
  iconStyle: 'stroke',
  borderRadius: 'rounded-xl',
  sidebarStyle: 'slate-dark',
  fontSize: 'standard'
};

export const COLOR_CONFIG: Record<ThemeColorPreset, { name: string; hex: string; bgClass: string; textClass: string; ringClass: string }> = {
  indigo: { name: 'Royal Indigo', hex: '#4f46e5', bgClass: 'bg-indigo-600', textClass: 'text-indigo-600', ringClass: 'ring-indigo-500' },
  blue: { name: 'Pacific Blue', hex: '#2563eb', bgClass: 'bg-blue-600', textClass: 'text-blue-600', ringClass: 'ring-blue-500' },
  emerald: { name: 'Himalayan Emerald', hex: '#059669', bgClass: 'bg-emerald-600', textClass: 'text-emerald-600', ringClass: 'ring-emerald-500' },
  crimson: { name: 'Automotive Crimson', hex: '#e11d48', bgClass: 'bg-rose-600', textClass: 'text-rose-600', ringClass: 'ring-rose-500' },
  amber: { name: 'Sunset Amber', hex: '#d97706', bgClass: 'bg-amber-600', textClass: 'text-amber-600', ringClass: 'ring-amber-500' },
  purple: { name: 'Vibrant Violet', hex: '#7c3aed', bgClass: 'bg-purple-600', textClass: 'text-purple-600', ringClass: 'ring-purple-500' },
  cyan: { name: 'Glacier Cyan', hex: '#0891b2', bgClass: 'bg-cyan-600', textClass: 'text-cyan-600', ringClass: 'ring-cyan-500' },
  slate: { name: 'Stealth Slate', hex: '#334155', bgClass: 'bg-slate-700', textClass: 'text-slate-700', ringClass: 'ring-slate-500' },
};

export const FONT_CONFIG: Record<ThemeFont, { name: string; description: string; sample: string }> = {
  'Plus Jakarta Sans': { name: 'Plus Jakarta Sans', description: 'Clean geometric sans - modern automotive standard', sample: 'Sagarmatha Multi-Care Auto Workshop' },
  'Outfit': { name: 'Outfit', description: 'Contemporary rounded humanist sans - fresh & dynamic', sample: 'Sagarmatha Multi-Care Auto Workshop' },
  'Inter': { name: 'Inter', description: 'High-precision UI typeface with supreme data legibility', sample: 'Sagarmatha Multi-Care Auto Workshop' },
  'DM Sans': { name: 'DM Sans', description: 'Friendly, warm geometric sans with open apertures', sample: 'Sagarmatha Multi-Care Auto Workshop' },
  'JetBrains Mono': { name: 'JetBrains Mono', description: 'Technical monospace - ideal for VINs, part numbers & data', sample: 'VIN: MBH41-9820-KATH' },
  'Noto Sans Devanagari': { name: 'Noto Sans', description: 'Clean universal font paired with high-contrast UI', sample: 'Sagarmatha Auto Workshop - Tax Invoice Register' },
};

export const SIDEBAR_CONFIG: Record<ThemeSidebarStyle, { name: string; bgClass: string; hex: string }> = {
  'slate-dark': { name: 'Midnight Slate (900)', bgClass: 'bg-slate-900', hex: '#0f172a' },
  'navy-dark': { name: 'Deep Royal Navy', bgClass: 'bg-[#0b132b]', hex: '#0b132b' },
  'charcoal-dark': { name: 'Stealth Charcoal', bgClass: 'bg-[#121214]', hex: '#121214' },
  'clean-light': { name: 'Crisp Snow White', bgClass: 'bg-white border-r border-slate-200 text-slate-800', hex: '#ffffff' },
};

class ThemeService {
  private currentTheme: AppThemeConfig = DEFAULT_THEME;
  private listeners: ((theme: AppThemeConfig) => void)[] = [];

  constructor() {
    this.loadTheme();
  }

  public getTheme(): AppThemeConfig {
    return { ...this.currentTheme };
  }

  public loadTheme(): AppThemeConfig {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.currentTheme = { ...DEFAULT_THEME, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load theme config from localStorage', e);
      this.currentTheme = DEFAULT_THEME;
    }
    this.applyToDOM(this.currentTheme);
    return this.currentTheme;
  }

  public saveTheme(theme: AppThemeConfig): void {
    this.currentTheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
      console.error('Failed to save theme config', e);
    }
    this.applyToDOM(theme);
    this.notifyListeners();
  }

  public resetToDefault(): AppThemeConfig {
    this.saveTheme(DEFAULT_THEME);
    return DEFAULT_THEME;
  }

  public subscribe(fn: (theme: AppThemeConfig) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) {
      try {
        fn(this.currentTheme);
      } catch (err) {
        console.error('Error in theme listener', err);
      }
    }
  }

  public applyToDOM(theme: AppThemeConfig): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;

    // Apply dataset attributes
    root.setAttribute('data-theme-color', theme.primaryColor);
    root.setAttribute('data-theme-mode', theme.mode);
    root.setAttribute('data-theme-font', theme.fontFamily);
    root.setAttribute('data-icon-style', theme.iconStyle);
    root.setAttribute('data-sidebar-style', theme.sidebarStyle);
    root.setAttribute('data-border-radius', theme.borderRadius);
    root.setAttribute('data-font-size', theme.fontSize);

    // Apply primary color CSS variables
    const colorInfo = COLOR_CONFIG[theme.primaryColor] || COLOR_CONFIG.indigo;
    root.style.setProperty('--primary-color', colorInfo.hex);

    // Apply Font Family
    body.style.fontFamily = `"${theme.fontFamily}", system-ui, -apple-system, sans-serif`;

    // Apply Font Size scaling
    if (theme.fontSize === 'compact') {
      root.style.fontSize = '14px';
    } else if (theme.fontSize === 'spacious') {
      root.style.fontSize = '17px';
    } else {
      root.style.fontSize = '15px';
    }

    // Apply Canvas Mode (Light / Slate / Warm / Dark)
    if (theme.mode === 'dark') {
      body.classList.remove('bg-slate-50', 'bg-stone-50', 'bg-slate-100', 'text-slate-900');
      body.classList.add('bg-slate-950', 'text-slate-100', 'dark');
      root.classList.add('dark');
    } else if (theme.mode === 'warm') {
      body.classList.remove('bg-slate-950', 'text-slate-100', 'dark', 'bg-slate-50', 'bg-slate-100');
      body.classList.add('bg-stone-100', 'text-stone-900');
      root.classList.remove('dark');
    } else if (theme.mode === 'slate') {
      body.classList.remove('bg-slate-950', 'text-slate-100', 'dark', 'bg-stone-100', 'bg-slate-50');
      body.classList.add('bg-slate-200/70', 'text-slate-900');
      root.classList.remove('dark');
    } else {
      // Default light
      body.classList.remove('bg-slate-950', 'text-slate-100', 'dark', 'bg-stone-100', 'bg-slate-200/70');
      body.classList.add('bg-slate-100', 'text-slate-900');
      root.classList.remove('dark');
    }

    // Apply Sidebar Style CSS variable
    const sidebarInfo = SIDEBAR_CONFIG[theme.sidebarStyle] || SIDEBAR_CONFIG['slate-dark'];
    root.style.setProperty('--sidebar-bg', sidebarInfo.hex);
  }
}

export const themeService = new ThemeService();
