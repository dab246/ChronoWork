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

/** Escape closes, body scroll is locked, the first field is focused and focus returns to the opener on close. */
function useDialogBehavior(open: boolean, panelRef: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
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
  }, [open, panelRef]);
}

interface ModalHeaderProps extends Pick<ModalProps, 'title' | 'subtitle' | 'icon' | 'onClose'> {
  titleId: string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, subtitle, icon, onClose, titleId }) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 id={titleId} className="text-base font-bold text-slate-900 truncate">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        data-modal-close
        onClick={onClose}
        aria-label={t.common.close}
        className="p-2 -mr-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

/** Material dialog: scrim fade, container scale-in, Escape / scrim click to close, focus restore. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, icon, size = 'md', children, footer }) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, panelRef, onClose);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]" aria-hidden="true" />
          {/* min-h-full (not flex centering on the scroller) keeps the top of a tall dialog reachable */}
          <div className="relative flex min-h-full items-start sm:items-center justify-center p-4">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={`relative w-full ${WIDTHS[size]} my-4 sm:my-8 bg-white rounded-3xl elevation-3 outline-none`}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <ModalHeader title={title} subtitle={subtitle} icon={icon} onClose={onClose} titleId={titleId} />
              <div className="px-6 pb-6">{children}</div>
              {footer && <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">{footer}</div>}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
