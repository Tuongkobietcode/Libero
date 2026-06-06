import { useQuery } from '@tanstack/react-query';

import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';
import { catalogApi } from '../../services/catalog.api';

const SIZE_CLASS = {
  compact:
    'h-[188px] max-w-[132px] shadow-[0_22px_42px_rgba(15,23,42,0.15)] md:h-[214px] md:max-w-[150px]',
  large:
    'h-[220px] max-w-[160px] shadow-[0_24px_44px_rgba(15,23,42,0.16)] md:h-[245px] md:max-w-[178px]',
} as const;

export function ReaderBookCover({
  bookId,
  title,
  coverImage,
  queryScope,
  size = 'compact',
}: {
  bookId?: string;
  title: string;
  coverImage?: string;
  queryScope: string;
  size?: keyof typeof SIZE_CLASS;
}) {
  const shouldFetchCanonicalCover = !coverImage && Boolean(bookId);
  const canonicalBookQuery = useQuery({
    queryKey: ['reader', queryScope, bookId] as const,
    queryFn: () => catalogApi.getBook(bookId as string),
    enabled: shouldFetchCanonicalCover,
    staleTime: 5 * 60_000,
    meta: { silent: true },
  });
  const imageSrc = canonicalBookQuery.data?.coverImage || coverImage || DEFAULT_BOOK_COVER_IMAGE;

  return (
    <div className={`relative isolate w-full shrink-0 overflow-hidden rounded-2xl bg-stone-100 ring-1 ring-black/5 ${SIZE_CLASS[size]}`}>
      <img
        src={imageSrc}
        alt={title}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={(event) => {
          if (event.currentTarget.src !== DEFAULT_BOOK_COVER_IMAGE) {
            event.currentTarget.src = DEFAULT_BOOK_COVER_IMAGE;
          }
        }}
      />
      <span className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-white/10" aria-hidden="true" />
    </div>
  );
}
