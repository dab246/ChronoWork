import React from 'react';
import { motion, type Variants } from 'motion/react';

type Icon = React.ComponentType<{ className?: string }>;

const EASE = [0.2, 0, 0, 1] as const;

/** Children marked with `fadeUp` appear one after another. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

/** Page body whose sections (wrapped in `Reveal` or `SectionCard`) fade in one after another. */
export const PageStack: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = 'space-y-6' }) => (
  <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
    {children}
  </motion.div>
);

export const Reveal: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <motion.div variants={fadeUp} className={className}>
    {children}
  </motion.div>
);

interface PageHeaderProps {
  icon: Icon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Extra content next to the title, e.g. a help button */
  titleExtra?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Title block of a tab: icon tile, title, subtitle and the navigation on the right. */
export const PageHeader: React.FC<PageHeaderProps> = ({ icon: HeaderIcon, title, subtitle, titleExtra, actions, className = '' }) => (
  <motion.div variants={fadeUp} className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${className}`}>
    <div className="flex items-start gap-3.5 min-w-0">
      <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center elevation-2">
        <HeaderIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">{title}</h2>
          {titleExtra}
        </div>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="shrink-0">{actions}</div>}
  </motion.div>
);

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
} as const;

export type Tone = keyof typeof TONES;

/** Rounded square holding an icon, tinted by tone. */
export const IconTile: React.FC<{ icon: Icon; tone?: Tone; size?: 'sm' | 'md' }> = ({ icon: TileIcon, tone = 'indigo', size = 'md' }) => (
  <span className={`shrink-0 inline-flex items-center justify-center rounded-xl ring-1 ring-inset ${TONES[tone]} ${size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'}`}>
    <TileIcon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} />
  </span>
);

interface SectionCardProps {
  icon?: Icon;
  tone?: Tone;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Rendered between the header and the body without padding, e.g. a table */
  flush?: boolean;
}

/** Card with a clear header (icon, title, description, actions) separated from its content. */
export const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  tone = 'indigo',
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = 'p-5',
  flush = false,
}) => (
  <motion.section variants={fadeUp} className={`card overflow-hidden ${className}`}>
    <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <IconTile icon={icon} tone={tone} />}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 leading-tight">{title}</h3>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </header>
    {flush ? children : <div className={bodyClassName}>{children}</div>}
  </motion.section>
);
