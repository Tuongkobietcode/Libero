import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

import { staggerItemVariants } from '../motion/ReaderMotion';

export type ReaderSummaryTone = 'blue' | 'amber' | 'emerald' | 'red' | 'slate';

const TONE_CLASS: Record<
  ReaderSummaryTone,
  {
    icon: string;
    value: string;
    watermark: string;
  }
> = {
  blue: {
    icon: 'bg-blue-50 text-[#2675d9]',
    value: 'text-[#2675d9]',
    watermark: 'text-blue-100',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600',
    value: 'text-amber-600',
    watermark: 'text-amber-100',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600',
    value: 'text-emerald-600',
    watermark: 'text-emerald-100',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    value: 'text-red-600',
    watermark: 'text-red-100',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-500',
    value: 'text-slate-700',
    watermark: 'text-slate-100',
  },
};

export function ReaderSummaryCard({
  icon: Icon,
  title,
  value,
  description,
  tone,
  valueSize = 'default',
}: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  description: string;
  tone: ReaderSummaryTone;
  valueSize?: 'default' | 'compact';
}) {
  const toneClass = TONE_CLASS[tone];
  const valueClass = valueSize === 'compact' ? 'text-[1.75rem]' : 'text-[2rem]';

  return (
    <motion.article
      variants={staggerItemVariants}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,31,56,0.04)]"
    >
      <div className="flex items-center gap-5">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${toneClass.icon}`}>
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <p className="m-0 text-sm font-bold text-slate-500">{title}</p>
          <strong className={`block font-mono ${valueClass} leading-tight ${toneClass.value}`}>{value}</strong>
          <p className="m-0 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <Icon className={`absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 ${toneClass.watermark}`} aria-hidden="true" />
    </motion.article>
  );
}
