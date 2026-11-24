import { useEffect, useRef } from 'react';

type EscapeHandler = () => void;

// Global LIFO stack so pressing ESC closes only the topmost active dialog/modal
const escapeStack: { id: symbol; handler: EscapeHandler }[] = [];
let isGlobalListenerAttached = false;

function handleGlobalEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;

  // 1. If a React modal registered on the LIFO stack, close the topmost one
  if (escapeStack.length > 0) {
    e.preventDefault();
    e.stopPropagation();
    const top = escapeStack[escapeStack.length - 1];
    top.handler();
    return;
  }

  // 2. Universal fallback for any visible modal overlay (.fixed.inset-0) without an explicit hook
  const overlays = Array.from(document.querySelectorAll<HTMLElement>('.fixed.inset-0')).filter(
    (el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
    }
  );
  if (overlays.length === 0) return;

  const topOverlay = overlays[overlays.length - 1];
  const buttons = Array.from(topOverlay.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));

  // Priority: explicit aria-label close, then icon-only close button in header, then Cancel button
  const closeBtn =
    buttons.find((b) => /close/i.test(b.getAttribute('aria-label') || '')) ||
    buttons.find((b) => {
      const txt = (b.textContent || '').trim();
      return txt === '✕' || txt === '×' || txt.toLowerCase() === 'close';
    }) ||
    buttons.find((b) => {
      const txt = (b.textContent || '').trim();
      const hasXIcon = Boolean(b.querySelector('svg.lucide-x'));
      return hasXIcon && txt.length === 0;
    }) ||
    buttons.find((b) => /^cancel$/i.test((b.textContent || '').trim()));

  if (closeBtn) {
    e.preventDefault();
    closeBtn.click();
  }
}

export function ensureGlobalEscapeListener() {
  if (isGlobalListenerAttached || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleGlobalEscape, true);
  isGlobalListenerAttached = true;
}

/**
 * Registers a modal/dialog on the global LIFO ESC stack while open.
 * Pressing Escape closes only the most recently opened dialog.
 */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  const handlerRef = useRef(onClose);
  handlerRef.current = onClose;

  useEffect(() => {
    ensureGlobalEscapeListener();
    if (!isOpen) return;

    const id = Symbol('escape-modal');
    escapeStack.push({ id, handler: () => handlerRef.current() });

    return () => {
      const idx = escapeStack.findIndex((item) => item.id === id);
      if (idx !== -1) {
        escapeStack.splice(idx, 1);
      }
    };
  }, [isOpen]);
}

/**
 * Intercepts Ctrl+P / Cmd+P while a printable modal is open so it triggers clean document printing.
 */
export function usePrintShortcut(isOpen: boolean, onPrint: () => void) {
  const printRef = useRef(onPrint);
  printRef.current = onPrint;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        printRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable
  );
}
