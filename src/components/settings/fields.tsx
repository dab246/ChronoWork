import React, { useEffect, useState } from 'react';

interface CommitFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  value: string;
  /** Called when editing ends (blur or Enter), only if the value changed */
  onCommit: (value: string) => void;
}

/**
 * Input saved when editing ends rather than on every key, so values are
 * trimmed / clamped once and typing is never interrupted by a save.
 */
export const CommitField: React.FC<CommitFieldProps> = ({ id, label, hint, value, onCommit, className = 'input-field', ...input }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        {...input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={className}
      />
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
};

/** Label + description row used inside a settings card. */
export const FieldGroup: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="space-y-3 py-5 first:pt-0 last:pb-0 border-t first:border-t-0 border-slate-100">
    <div>
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    {children}
  </div>
);
