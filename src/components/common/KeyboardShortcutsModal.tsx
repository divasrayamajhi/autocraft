import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Dialogs & Printing',
    items: [
      { keys: ['Esc'], description: 'Close active dialog box, modal, or dropdown' },
      { keys: ['Ctrl / ⌘', 'P'], description: 'Print / Save PDF when Invoice or Job Card preview is open' },
      { keys: ['Shift', '?'], description: 'Open this Keyboard Shortcuts guide' },
      { keys: ['Alt', 'K'], description: 'Toggle Keyboard Shortcuts guide' },
    ],
  },
  {
    title: 'Quick Actions',
    items: [
      { keys: ['Alt', 'N'], description: 'New Vehicle Intake / Create Job Card' },
      { keys: ['/'], description: 'Focus search bar on the current page' },
    ],
  },
  {
    title: 'Module Navigation',
    items: [
      { keys: ['Alt', '1'], description: 'Workshop Pulse (Dashboard)' },
      { keys: ['Alt', '2'], description: 'Job Cards & Bays' },
      { keys: ['Alt', '3'], description: 'Customer Garages' },
      { keys: ['Alt', '4'], description: 'Spare Parts Master' },
      { keys: ['Alt', '5'], description: 'Invoicing & IRD Tax (Daybook)' },
      { keys: ['Alt', '6'], description: 'Cashless Insurance' },
      { keys: ['Alt', '7'], description: 'Warranty & Claims' },
      { keys: ['Alt', '8'], description: 'GL & VAT Ledger' },
      { keys: ['Alt', '9'], description: 'Master Settings' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0F172A]/60 backdrop-blur-xs p-4">
      <div className="bg-[#FFFFFF] rounded-xl shadow-2xl max-w-lg w-full border border-[#E2E8F0] overflow-hidden">
        <div className="bg-[#0F3D5E] text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/20 border border-[#0EA5E9]/40 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-[#0EA5E9]" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Keyboard Shortcuts</h3>
              <p className="text-[11px] text-sky-200">
                Press Esc anytime to close open dialogs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="p-1.5 text-sky-200 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                {group.title}
              </h4>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden bg-[#F8FAFC]">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2 flex items-center justify-between gap-3 bg-[#FFFFFF]"
                  >
                    <span className="text-[#0F172A] font-medium">{item.description}</span>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && <span className="text-[#94A3B8] text-[10px]">+</span>}
                          <kbd className="px-2 py-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[11px] font-mono font-bold text-[#0F3D5E]">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Shortcuts automatically pause while typing in text fields (except Esc).</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#0F3D5E] hover:bg-[#0c314c] text-white font-semibold rounded-lg transition"
          >
            Done (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
