import { type ReactNode } from 'react';
import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';

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

export function BookCover({ src, title, seed, size = 'md', className, overlay }: BookCoverProps) {
  void seed;
  const imageSrc = src || DEFAULT_BOOK_COVER_IMAGE;

  return (
    <div
      className={cn(
        'group relative isolate overflow-hidden bg-stone-100 shadow-[0_14px_28px_rgba(28,25,23,0.16)] ring-1 ring-black/5',
        COVER_SIZES[size],
        className,
      )}
    >
      <img
        src={imageSrc}
        alt={`Bìa sách ${title}`}
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== DEFAULT_BOOK_COVER_IMAGE) {
            event.currentTarget.src = DEFAULT_BOOK_COVER_IMAGE;
          }
        }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-stone-950/18 via-transparent to-white/5" aria-hidden />
      {overlay}
    </div>
  );
}
