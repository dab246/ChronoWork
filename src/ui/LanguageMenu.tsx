import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '../i18n';
import { LANGUAGES, type Language } from '../types';
import { useDismiss } from './useDismiss';

const FLAGS: Record<Language, string> = { vi: '🇻🇳', en: '🇬🇧', fr: '🇫🇷' };

interface LanguageMenuProps {
  value: Language;
  onChange: (lang: Language) => void;
}

const LAST = LANGUAGES.length - 1;
const MOVES: Record<string, (i: number) => number> = {
  ArrowDown: (i) => (i >= LAST ? 0 : i + 1),
  ArrowUp: (i) => (i <= 0 ? LAST : i - 1),
  Home: () => 0,
  End: () => LAST,
};

interface LanguageOptionProps {
  id: string;
  lang: Language;
  selected: boolean;
  active: boolean;
  onChoose: () => void;
  onHover: () => void;
}

const LanguageOption: React.FC<LanguageOptionProps> = ({ id, lang, selected, active, onChoose, onHover }) => {
  const { t } = useI18n();
  return (
    <li
      id={id}
      role="option"
      aria-selected={selected}
      data-ripple
      onClick={onChoose}
      onMouseEnter={onHover}
      className={`relative overflow-hidden flex items-center gap-3 px-3.5 py-2.5 text-sm cursor-pointer select-none transition-colors ${
        active ? 'bg-indigo-50' : ''
      } ${selected ? 'font-bold text-indigo-700' : 'text-slate-800'}`}
    >
      <span className="text-base leading-none" aria-hidden="true">
        {FLAGS[lang]}
      </span>
      <span className="flex-1">{t.language.names[lang]}</span>
      {selected && <Check className="w-4 h-4" />}
    </li>
  );
};

interface LanguageTriggerProps {
  ref: React.Ref<HTMLButtonElement>;
  value: Language;
  open: boolean;
  menuId: string;
  onToggle: () => void;
  onOpen: () => void;
}

const LanguageTrigger: React.FC<LanguageTriggerProps> = ({ ref, value, open, menuId, onToggle, onOpen }) => {
  const { t } = useI18n();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onOpen();
    }
  };
  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      onKeyDown={onKeyDown}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={`${t.language.label}: ${t.language.names[value]}`}
      className="flex items-center gap-1.5 pl-2.5 pr-2 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
    >
      <Languages className="w-4 h-4 text-indigo-600" />
      {/* Full name only where the header has room (the desktop tab bar starts at xl) */}
      <span className="hidden sm:inline xl:hidden">{t.language.names[value]}</span>
      <span className="sm:hidden xl:inline uppercase">{value}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
};

/** Material dropdown menu for the interface language (keyboard: arrows, Home/End, Enter, Escape). */
export const LanguageMenu: React.FC<LanguageMenuProps> = ({ value, onChange }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => LANGUAGES.indexOf(value));
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, [buttonRef, menuRef], close);

  useEffect(() => {
    if (open) {
      setActive(LANGUAGES.indexOf(value));
      requestAnimationFrame(() => menuRef.current?.focus());
    }
  }, [open, value]);

  const choose = (lang: Language) => {
    onChange(lang);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (MOVES[e.key]) {
      e.preventDefault();
      setActive(MOVES[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(LANGUAGES[active]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <LanguageTrigger
        ref={buttonRef}
        value={value}
        open={open}
        menuId={menuId}
        onToggle={() => setOpen((o) => !o)}
        onOpen={() => setOpen(true)}
      />

      <AnimatePresence>
        {open && (
          <motion.ul
            ref={menuRef}
            id={menuId}
            role="listbox"
            tabIndex={-1}
            aria-label={t.language.label}
            aria-activedescendant={`${menuId}-${LANGUAGES[active]}`}
            onKeyDown={onMenuKey}
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -2 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-full mt-2 z-40 min-w-[180px] py-1.5 bg-white rounded-xl elevation-3 border border-slate-200 outline-none"
          >
            {LANGUAGES.map((lang, i) => (
              <LanguageOption
                key={lang}
                id={`${menuId}-${lang}`}
                lang={lang}
                selected={lang === value}
                active={i === active}
                onChoose={() => choose(lang)}
                onHover={() => setActive(i)}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};
