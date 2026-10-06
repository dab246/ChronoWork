import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Material dialog: scrim fade, container scale-in, Escape / scrim click to close, focus restore. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', children, footer }) => {
  const { t } = useI18n();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-modal-close])');
      (first ?? panelRef.current)?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`relative w-full ${WIDTHS[size]} my-8 bg-white rounded-3xl elevation-3 outline-none`}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 id={titleId} className="text-base font-bold text-neutral-900 truncate">
                    {title}
                  </h3>
                  {subtitle && <p className="text-xs text-neutral-500 font-medium">{subtitle}</p>}
                </div>
              </div>
              <button
                type="button"
                data-modal-close
                onClick={onClose}
                aria-label={t.common.close}
                className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-6">{children}</div>
            {footer && <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 rounded-b-3xl">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
