import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { Modal } from './Modal';

type Tone = 'success' | 'error' | 'info';

interface Snack {
  id: number;
  message: string;
  detail?: string;
  tone: Tone;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface FeedbackValue {
  notify: (message: string, options?: { tone?: Tone; detail?: string }) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONE_CLASS = { success: 'text-emerald-300', error: 'text-rose-300', info: 'text-sky-300' };

/** Material snackbar + confirm dialog, replacing window.alert / window.confirm. */
export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const nextId = useRef(1);

  const notify = useCallback<FeedbackValue['notify']>((message, options) => {
    const id = nextId.current++;
    setSnacks((prev) => [...prev.slice(-2), { id, message, detail: options?.detail, tone: options?.tone ?? 'success' }]);
    setTimeout(() => setSnacks((prev) => prev.filter((s) => s.id !== id)), options?.detail ? 7000 : 4000);
  }, []);

  const confirm = useCallback<FeedbackValue['confirm']>((options) => {
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => ({ notify, confirm }), [notify, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="no-print fixed bottom-4 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        <AnimatePresence initial={false}>
          {snacks.map((snack) => {
            const Icon = ICONS[snack.tone];
            return (
              <motion.div
                key={snack.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                role={snack.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto max-w-md w-full sm:w-auto bg-neutral-900 text-white rounded-xl elevation-3 px-4 py-3 flex items-start gap-3"
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${TONE_CLASS[snack.tone]}`} />
                <div className="text-sm">
                  <p className="font-semibold">{snack.message}</p>
                  {snack.detail && <p className="text-xs text-neutral-300 mt-0.5">{snack.detail}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Modal
        open={dialog !== null}
        onClose={() => settle(false)}
        size="sm"
        title={dialog?.title}
        icon={dialog?.danger ? <AlertTriangle className="w-5 h-5 text-rose-600" /> : <Info className="w-5 h-5" />}
      >
        <p className="text-sm text-neutral-600 leading-relaxed">{dialog?.message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={() => settle(false)} className="btn-text">
            {t.common.cancel}
          </button>
          <button type="button" onClick={() => settle(true)} className={dialog?.danger ? 'btn-danger' : 'btn-filled'}>
            {dialog?.confirmLabel ?? t.common.confirm}
          </button>
        </div>
      </Modal>
    </FeedbackContext.Provider>
  );
};

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
