import React from 'react';
import { motion } from 'motion/react';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

/** On / off switch with its label (role="switch"). */
export const Switch: React.FC<SwitchProps> = ({ id, checked, onChange, label, description, disabled }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between gap-3 text-left disabled:opacity-50"
  >
    <span className="min-w-0">
      <span className="block text-xs font-semibold text-slate-800">{label}</span>
      {description && <span className="block text-[11px] text-slate-500 mt-0.5">{description}</span>}
    </span>
    <span className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`} aria-hidden="true">
      <motion.span
        className="absolute top-1 w-4 h-4 rounded-full bg-white elevation-1"
        initial={false}
        animate={{ left: checked ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </span>
  </button>
);
