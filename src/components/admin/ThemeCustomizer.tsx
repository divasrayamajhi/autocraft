import React, { useState, useEffect } from 'react';
import { 
  AppThemeConfig, 
  ThemeColorPreset, 
  ThemeMode, 
  ThemeFont, 
  ThemeIconStyle, 
  ThemeBorderRadius, 
  ThemeSidebarStyle 
} from '../../types';
import { 
  themeService, 
  THEME_PRESETS, 
  COLOR_CONFIG, 
  FONT_CONFIG, 
  SIDEBAR_CONFIG, 
  DEFAULT_THEME,
  ThemePreset
} from '../../services/themeService';
import { 
  Palette, 
  Type, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Save, 
  Eye, 
  LayoutDashboard, 
  Wrench, 
  ShieldCheck, 
  CheckCircle2, 
  Sliders, 
  Sun, 
  Moon, 
  Layers, 
  Smartphone,
  CheckCheck
} from 'lucide-react';

interface ThemeCustomizerProps {
  onNotify?: (msg: string) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ onNotify }) => {
  const [theme, setTheme] = useState<AppThemeConfig>(() => themeService.getTheme());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = themeService.subscribe((updated) => {
      setTheme(updated);
    });
    return unsub;
  }, []);

  const handleApplyPreset = (preset: ThemePreset) => {
    const updated: AppThemeConfig = {
      preset: preset.id,
      primaryColor: preset.primaryColor,
      mode: preset.mode,
      fontFamily: preset.fontFamily,
      iconStyle: preset.iconStyle,
      borderRadius: preset.borderRadius,
      sidebarStyle: preset.sidebarStyle,
      fontSize: theme.fontSize
    };
    setTheme(updated);
    themeService.saveTheme(updated);
    setHasUnsavedChanges(false);
    triggerSuccess(`Applied "${preset.name}" Theme Preset`);
  };

  const handleUpdate = (partial: Partial<AppThemeConfig>) => {
    const updated = { ...theme, ...partial, preset: 'custom' };
    setTheme(updated);
    themeService.applyToDOM(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveTheme = () => {
    themeService.saveTheme(theme);
    setHasUnsavedChanges(false);
    triggerSuccess('Theme & UI customization saved successfully');
  };

  const handleResetDefault = () => {
    const def = themeService.resetToDefault();
    setTheme(def);
    setHasUnsavedChanges(false);
    triggerSuccess('Reset theme to Sagarmatha Classic Default');
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    if (onNotify) onNotify(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const activeColor = COLOR_CONFIG[theme.primaryColor] || COLOR_CONFIG.indigo;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Palette className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              UI Appearance & Styling Engine
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 mt-1">
            Custom Workshop Theme, Fonts & Icon System
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            Personalize the visual identity of the entire ERP workspace. Configure primary brand colors, typography scales, sidebar contrast, canvas atmosphere, and icon badge treatments.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="theme-btn-reset-default"
            onClick={handleResetDefault}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            id="theme-btn-save-changes"
            onClick={handleSaveTheme}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Theme</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. CURATED PRESETS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>One-Click Curated Theme Presets</span>
            </h4>
            <p className="text-xs text-slate-500">Pick an expertly crafted palette designed for automotive workshop operations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {THEME_PRESETS.map((p) => {
            const isSelected = theme.preset === p.id;
            return (
              <button
                key={p.id}
                id={`theme-preset-${p.id}`}
                onClick={() => handleApplyPreset(p)}
                className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between group ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20' 
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${p.previewBg} shadow-sm`} />
                      <span className="font-bold text-xs text-slate-900">{p.name}</span>
                    </div>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">{p.nepaliName}</div>
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{p.fontFamily}</span>
                  <span className="capitalize">{p.mode} Mode</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LIVE INTERACTIVE PREVIEW BOX */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Live Theme Preview Box
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Font: {theme.fontFamily} | Primary: {theme.primaryColor} | Mode: {theme.mode}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preview Card 1: Button & Navigation State */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Buttons & Controls</div>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button" 
                style={{ backgroundColor: activeColor.hex }} 
                className={`px-3 py-1.5 text-white text-xs font-bold shadow ${theme.borderRadius}`}
              >
                Primary Action
              </button>
              <button 
                type="button" 
                className={`px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium ${theme.borderRadius}`}
              >
                Secondary
              </button>
            </div>
            <div className="pt-1">
              <div 
                style={{ borderColor: activeColor.hex }} 
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between bg-slate-900/60`}
              >
                <div className="flex items-center space-x-2">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-semibold">Active Sidebar Tab</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Preview Card 2: Status Badges & Nepal Tax Indicator */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Badges & IRD Status</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ● CBMS Transmitted
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                13% VAT Included
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Admin Role
              </span>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-700 text-xs flex items-center justify-between">
              <span className="text-slate-400">Total Billed:</span>
              <span className="font-mono font-black text-emerald-400">Rs. 24,500.00</span>
            </div>
          </div>

          {/* Preview Card 3: Typography Specimen */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Typography Specimen</div>
            <div className="text-sm font-bold text-white">
              Sagarmatha Workshop ERP
            </div>
            <div className="text-xs text-slate-300">
              Multi-Brand Diagnostic & Nepal IRD E-Billing Suite
            </div>
            <div className="text-[11px] font-mono text-indigo-300">
              VIN: MBH41-9820-KATH | JC-81-0020
            </div>
          </div>
        </div>
      </div>

      {/* 3. DETAILED CUSTOMIZATION PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: COLOR PALETTE & ATMOSPHERE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Brand Accent Colors & Canvas Mode</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select primary highlight color and background canvas lighting.
            </p>
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Primary Brand Accent
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {(Object.keys(COLOR_CONFIG) as ThemeColorPreset[]).map((key) => {
                const conf = COLOR_CONFIG[key];
                const isCurrent = theme.primaryColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    id={`theme-color-${key}`}
                    onClick={() => handleUpdate({ primaryColor: key })}
                    className={`flex items-center space-x-2 p-2 rounded-xl border text-xs font-medium transition ${
                      isCurrent 
                        ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10 shadow-sm font-bold' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span 
                      style={{ backgroundColor: conf.hex }} 
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                    />
                    <span className="truncate">{conf.name.split(' ')[1] || conf.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canvas Mode */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              UI Canvas Atmosphere
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'light', label: 'Light Crisp', desc: 'Default bright', icon: Sun },
                { id: 'slate', label: 'Slate Executive', desc: 'Cool grey', icon: Layers },
                { id: 'warm', label: 'Warm Neutral', desc: 'Soft ivory', icon: Sparkles },
                { id: 'dark', label: 'Dark Luxury', desc: 'Deep night', icon: Moon }
              ].map((m) => {
                const isSelected = theme.mode === m.id;
                const MIcon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    id={`theme-mode-${m.id}`}
                    onClick={() => handleUpdate({ mode: m.id as ThemeMode })}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <MIcon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="font-bold text-xs text-slate-900">{m.label}</div>
                    <div className="text-[10px] text-slate-500">{m.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Style */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Fixed Left Sidebar Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SIDEBAR_CONFIG) as ThemeSidebarStyle[]).map((sb) => {
                const conf = SIDEBAR_CONFIG[sb];
                const isSelected = theme.sidebarStyle === sb;
                return (
                  <button
                    key={sb}
                    type="button"
                    id={`theme-sidebar-${sb}`}
                    onClick={() => handleUpdate({ sidebarStyle: sb })}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <span 
                      style={{ backgroundColor: conf.hex }} 
                      className="w-4 h-4 rounded-md border border-slate-400 shadow-sm flex-shrink-0"
                    />
                    <span className="truncate text-slate-800">{conf.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL B: TYPOGRAPHY & ICON SYSTEM */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Type className="w-4 h-4 text-indigo-600" />
              <span>Typography & Icon Customization</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tune typeface pairing, font sizing density, and icon badge treatments.
            </p>
          </div>

          {/* Font Family Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              UI Font Family
            </label>
            <div className="space-y-2">
              {(Object.keys(FONT_CONFIG) as ThemeFont[]).map((fontKey) => {
                const fontInfo = FONT_CONFIG[fontKey];
                const isCurrent = theme.fontFamily === fontKey;
                return (
                  <button
                    key={fontKey}
                    type="button"
                    id={`theme-font-${fontKey.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleUpdate({ fontFamily: fontKey })}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isCurrent 
                        ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span 
                          style={{ fontFamily: fontKey }} 
                          className="font-bold text-xs text-slate-900"
                        >
                          {fontInfo.name}
                        </span>
                        {fontKey === 'Plus Jakarta Sans' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold uppercase">
                            Default
                          </span>
                        )}
                        {fontKey === 'Noto Sans Devanagari' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                            English
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{fontInfo.description}</div>
                    </div>

                    <div 
                      style={{ fontFamily: fontKey }} 
                      className="text-xs text-slate-600 font-medium pl-3 hidden sm:block truncate max-w-[160px]"
                    >
                      {fontInfo.sample}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon System Styling */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Icon Visual Treatment
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'stroke', label: 'Modern Stroke', desc: 'Crisp outline icons' },
                { id: 'badge', label: 'Accent Badges', desc: 'Rounded color tiles' },
                { id: 'minimal', label: 'Minimalist Subtle', desc: 'Clean monochrome' },
                { id: 'bold', label: 'High-Contrast Bold', desc: 'High sunlight clarity' }
              ].map((styleItem) => {
                const isSelected = theme.iconStyle === styleItem.id;
                return (
                  <button
                    key={styleItem.id}
                    type="button"
                    id={`theme-icon-${styleItem.id}`}
                    onClick={() => handleUpdate({ iconStyle: styleItem.id as ThemeIconStyle })}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900">{styleItem.label}</div>
                    <div className="text-[10px] text-slate-500">{styleItem.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Border Curvature & Font Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Corner Curvature
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'rounded-md', label: 'Sharp (8px)' },
                  { id: 'rounded-xl', label: 'Balanced (12px)' },
                  { id: 'rounded-2xl', label: 'Soft (16px)' }
                ].map((rad) => (
                  <button
                    key={rad.id}
                    type="button"
                    onClick={() => handleUpdate({ borderRadius: rad.id as ThemeBorderRadius })}
                    className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      theme.borderRadius === rad.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {rad.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Workspace Text Density
              </label>
              <div className="space-y-1.5">
                {[
                  { id: 'compact', label: 'Compact (High Density)' },
                  { id: 'standard', label: 'Standard (Balanced)' },
                  { id: 'spacious', label: 'Spacious (Large Screen)' }
                ].map((den) => (
                  <button
                    key={den.id}
                    type="button"
                    onClick={() => handleUpdate({ fontSize: den.id as any })}
                    className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      theme.fontSize === den.id 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold' 
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {den.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
