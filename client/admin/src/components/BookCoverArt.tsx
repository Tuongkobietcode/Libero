import { bookInitials, bookVisual } from '@libero/shared';

interface BookCoverArtProps {
  src?: string | null;
  title: string;
  seed?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClassMap = {
  xs: {
    cover: 'h-14 w-10 rounded-md',
    padding: 'py-1.5 pl-2.5 pr-1.5',
    spine: 'w-1.5',
    label: 'text-[0.38rem] tracking-[0.08em]',
    title: 'text-[0.48rem] leading-[0.6rem] line-clamp-4',
    footer: 'text-[0.45rem]',
  },
  sm: {
    cover: 'h-16 w-11 rounded-md',
    padding: 'py-1.5 pl-2.5 pr-1.5',
    spine: 'w-1.5',
    label: 'text-[0.4rem] tracking-[0.08em]',
    title: 'text-[0.52rem] leading-[0.64rem] line-clamp-4',
    footer: 'text-[0.48rem]',
  },
  md: {
    cover: 'h-28 w-20 rounded-lg',
    padding: 'py-3 pl-5 pr-3',
    spine: 'w-2.5',
    label: 'text-[0.55rem] tracking-[0.14em]',
    title: 'text-[0.86rem] leading-[1rem] line-clamp-5',
    footer: 'text-[0.58rem]',
  },
  lg: {
    cover: 'aspect-[3/4] w-full rounded-xl',
    padding: 'py-8 pl-10 pr-7',
    spine: 'w-5',
    label: 'text-[0.72rem] tracking-[0.2em]',
    title: 'text-[2rem] leading-tight line-clamp-6',
    footer: 'text-sm',
  },
} as const;

export function BookCoverArt({ src, title, seed, size = 'sm', className }: BookCoverArtProps) {
  const visual = bookVisual(seed ?? title);
  const sizeClasses = sizeClassMap[size];
  const coverClassName = [
    'relative isolate shrink-0 overflow-hidden font-extrabold shadow-[0_14px_28px_rgba(15,23,42,0.16)] ring-1 ring-black/5',
    sizeClasses.cover,
    className ?? '',
  ].join(' ');

  if (src) {
    return <img src={src} alt={title} className={`${coverClassName} object-cover`} loading="lazy" />;
  }

  return (
    <div
      className={coverClassName}
      style={{ background: `linear-gradient(135deg, ${visual.bg}, ${visual.accent})`, color: visual.text }}
      aria-label={`Bìa sách ${title}`}
    >
      <div className={`relative flex h-full flex-col justify-between text-left ${sizeClasses.padding}`}>
        <span className={`absolute inset-y-0 left-0 ${sizeClasses.spine}`} style={{ backgroundColor: visual.spine }} aria-hidden="true" />
        <span className="absolute -right-6 top-7 h-16 w-16 rounded-full border border-white/25 opacity-55" aria-hidden="true" />
        <span className="absolute bottom-8 right-3 h-8 w-8 rounded-full border border-white/20 opacity-60" aria-hidden="true" />
        <span className={`relative z-10 font-black uppercase opacity-80 ${sizeClasses.label}`}>LIBERO</span>
        <strong className={`relative z-10 max-w-full break-words ${sizeClasses.title}`}>{title}</strong>
        <span className={`relative z-10 font-black uppercase opacity-75 ${sizeClasses.footer}`}>{bookInitials(title, size === 'lg' ? 4 : 2)}</span>
      </div>
    </div>
  );
}
