import { Star } from 'lucide-react';

import { cn } from '../../utils/cn';

interface RatingStarsProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
} as const;

export function RatingStars({
  value,
  max = 5,
  size = 'sm',
  showValue,
  reviewCount,
  className,
}: RatingStarsProps) {
  const clamped = Math.max(0, Math.min(max, value));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.25 && clamped - full < 0.75;
  const stars = Array.from({ length: max }, (_, i) => {
    if (i < full) return 'full' as const;
    if (i === full && hasHalf) return 'half' as const;
    return 'empty' as const;
  });

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-amber-500', className)}
      aria-label={`Đánh giá ${clamped} trên ${max}`}
    >
      <span className="inline-flex">
        {stars.map((kind, i) => (
          <Star
            key={i}
            className={cn(SIZE_CLASSES[size], kind === 'empty' ? 'text-slate-200' : 'text-amber-500')}
            fill={kind === 'empty' ? 'none' : 'currentColor'}
            strokeWidth={1.5}
            aria-hidden
          />
        ))}
      </span>
      {showValue ? <span className="text-xs font-semibold text-slate-700">{clamped.toFixed(1)}</span> : null}
      {typeof reviewCount === 'number' ? (
        <span className="text-xs text-slate-400">({reviewCount})</span>
      ) : null}
    </span>
  );
}
