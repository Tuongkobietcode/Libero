import { type ReactNode } from 'react';
import { bookInitials, bookVisual } from '@libero/shared';

import { cn } from '../../utils/cn';

interface BookCoverProps {
  src?: string | null;
  title: string;
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  overlay?: ReactNode;
}

const COVER_SIZES = {
  sm: 'h-16 w-11 rounded-md',
  md: 'w-full aspect-[3/4] rounded-lg',
  lg: 'w-48 h-72 rounded-xl',
} as const;

const CONTENT_SIZES = {
  sm: {
    label: 'text-[0.38rem] tracking-[0.08em]',
    title: 'text-[0.5rem] leading-[0.62rem] line-clamp-4',
    initials: 'text-[0.48rem]',
    padding: 'py-1.5 pl-2.5 pr-1.5',
    spine: 'w-1.5',
  },
  md: {
    label: 'text-[0.58rem] tracking-[0.14em]',
    title: 'text-[1.05rem] leading-tight line-clamp-5',
    initials: 'text-[0.68rem]',
    padding: 'py-4 pl-6 pr-4',
    spine: 'w-3',
  },
  lg: {
    label: 'text-[0.68rem] tracking-[0.18em]',
    title: 'text-[1.55rem] leading-tight line-clamp-6',
    initials: 'text-sm',
    padding: 'py-6 pl-8 pr-5',
    spine: 'w-4',
  },
} as const;

export function BookCover({ src, title, seed, size = 'md', className, overlay }: BookCoverProps) {
  const visual = bookVisual(seed ?? title);
  const contentSize = CONTENT_SIZES[size];

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden font-extrabold shadow-[0_14px_28px_rgba(15,31,56,0.16)] ring-1 ring-black/5',
        COVER_SIZES[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${visual.bg}, ${visual.accent})`, color: visual.text }}
    >
      {src ? (
        <img src={src} alt={title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className={cn('relative flex h-full flex-col justify-between text-left', contentSize.padding)}>
          <span className={cn('absolute inset-y-0 left-0 block', contentSize.spine)} style={{ backgroundColor: visual.spine }} aria-hidden />
          <span className="absolute -right-5 top-6 h-14 w-14 rounded-full border border-white/25 opacity-55" aria-hidden />
          <span className="absolute bottom-8 right-3 h-8 w-8 rounded-full border border-white/20 opacity-60" aria-hidden />
          <span className={cn('relative z-10 font-black uppercase opacity-80', contentSize.label)}>LIBERO</span>
          <strong className={cn('relative z-10 max-w-full break-words text-balance', contentSize.title)}>
            {title}
          </strong>
          <span className={cn('relative z-10 font-black uppercase opacity-75', contentSize.initials)}>
            {bookInitials(title, size === 'sm' ? 2 : 3)}
          </span>
        </div>
      )}
      {overlay}
    </div>
  );
}
