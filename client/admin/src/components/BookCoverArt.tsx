import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';

interface BookCoverArtProps {
  src?: string | null;
  title: string;
  seed?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClassMap = {
  xs: 'h-14 w-10 rounded-md',
  sm: 'h-16 w-11 rounded-md',
  md: 'h-28 w-20 rounded-lg',
  lg: 'aspect-[3/4] w-full rounded-xl',
} as const;

export function BookCoverArt({ src, title, seed, size = 'sm', className }: BookCoverArtProps) {
  void seed;
  const imageSrc = src || DEFAULT_BOOK_COVER_IMAGE;
  const coverClassName = [
    'relative isolate shrink-0 overflow-hidden bg-stone-100 shadow-[0_14px_28px_rgba(28,25,23,0.16)] ring-1 ring-black/5',
    sizeClassMap[size],
    className ?? '',
  ].join(' ');

  return (
    <div className={coverClassName}>
      <img
        src={imageSrc}
        alt={`Bìa sách ${title}`}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== DEFAULT_BOOK_COVER_IMAGE) {
            event.currentTarget.src = DEFAULT_BOOK_COVER_IMAGE;
          }
        }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-stone-950/18 via-transparent to-white/5" aria-hidden="true" />
    </div>
  );
}
