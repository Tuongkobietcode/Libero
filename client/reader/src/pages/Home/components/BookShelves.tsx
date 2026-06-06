import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';

import type { BookListItem } from '../../../types/models';
import { Spinner } from '../../../components/ui/Spinner';
import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { catalogApi } from '../../../services/catalog.api';
import { queryKeys } from '../../../lib/queryKeys';
import { getBookDetailRouteState } from '../../../utils/bookDetailRoute';
import { formatList } from '../../../utils/format';
import { cn } from '../../../utils/cn';

const VISIBLE_BOOKS = 8;
type ShelfTone = 'blue' | 'green' | 'red';

const SHELF_TONE_CLASS: Record<
  ShelfTone,
  { title: string; hoverBorder: string; focusRing: string; link: string; arrow: string; rank: string }
> = {
  blue: {
    title: 'text-brand-600',
    hoverBorder: 'hover:border-brand-500',
    focusRing: 'focus-visible:ring-brand-100',
    link: 'text-brand-600 hover:text-brand-700',
    arrow: 'hover:border-brand-200 hover:text-brand-600',
    rank: 'bg-brand-600',
  },
  green: {
    title: 'text-emerald-700',
    hoverBorder: 'hover:border-emerald-500',
    focusRing: 'focus-visible:ring-emerald-100',
    link: 'text-emerald-700 hover:text-emerald-800',
    arrow: 'hover:border-emerald-200 hover:text-emerald-700',
    rank: 'bg-emerald-600',
  },
  red: {
    title: 'text-red-600',
    hoverBorder: 'hover:border-red-500',
    focusRing: 'focus-visible:ring-red-100',
    link: 'text-red-600 hover:text-red-700',
    arrow: 'hover:border-red-200 hover:text-red-600',
    rank: 'bg-red-600',
  },
};

interface BookShelfProps {
  title: string;
  subtitle?: string;
  queryKey: readonly unknown[];
  fetcher: () => Promise<BookListItem[]>;
  emptyMessage?: string;
  errorLabel?: string;
  ranked?: boolean;
  tone?: ShelfTone;
}

function authorsLabel(book: BookListItem): string {
  return formatList(book.authors, 'Chưa cập nhật tác giả');
}

function categoryLabel(book: BookListItem): string {
  return book.categories[0]?.name ?? 'Đang cập nhật';
}

function BookShelfTile({ book, rank, tone = 'blue' }: { book: BookListItem; rank?: number; tone?: ShelfTone }) {
  const location = useLocation();
  const imageSrc = book.coverImage || DEFAULT_BOOK_COVER_IMAGE;
  const toneClass = SHELF_TONE_CLASS[tone];

  return (
    <Link
      to={`/books/${book._id}`}
      state={getBookDetailRouteState(location)}
      className={cn(
        'group flex min-h-[410px] min-w-0 flex-col rounded-2xl border-2 border-slate-800/85 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-30px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-4',
        toneClass.hoverBorder,
        toneClass.focusRing,
      )}
    >
      <div className="relative h-[255px] overflow-hidden rounded-lg bg-stone-100 shadow-[0_12px_28px_-22px_rgba(28,25,23,0.7)] sm:h-[265px]">
        <img
          src={imageSrc}
          alt={`Bìa sách ${book.title}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src !== DEFAULT_BOOK_COVER_IMAGE) {
              event.currentTarget.src = DEFAULT_BOOK_COVER_IMAGE;
            }
          }}
        />
        <span className="absolute left-3 top-3 rounded-md bg-white/[0.92] px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
          {categoryLabel(book)}
        </span>
        {rank ? (
          <span className={cn('absolute right-3 top-3 rounded-md px-2.5 py-1 text-xs font-black text-white shadow-sm', toneClass.rank)}>
            #{rank}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col pt-7">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-tight tracking-tight text-slate-950">
          {book.title}
        </h3>
        <p className="mt-3 line-clamp-1 text-sm font-semibold text-slate-400">{authorsLabel(book)}</p>
      </div>
    </Link>
  );
}

function ShelfHeader({ title, subtitle, tone = 'blue' }: Pick<BookShelfProps, 'title' | 'subtitle' | 'tone'>) {
  const toneClass = SHELF_TONE_CLASS[tone];

  return (
    <div className="mb-6">
      <h2 className={cn('font-display text-2xl font-black uppercase tracking-[0.08em]', toneClass.title)}>
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-base font-medium text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function BookShelf({ title, subtitle, queryKey, fetcher, emptyMessage = 'Chưa có sách phù hợp.', errorLabel, ranked, tone }: BookShelfProps) {
  const [pageStart, setPageStart] = useState(0);
  const activeTone = tone ?? 'blue';
  const toneClass = SHELF_TONE_CLASS[activeTone];
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: fetcher,
    meta: { errorMessage: errorLabel ?? `Không tải được ${title.toLowerCase()}.` },
  });
  const books = data ?? [];
  const visibleBooks = useMemo(() => books.slice(pageStart, pageStart + VISIBLE_BOOKS), [books, pageStart]);
  const hasPrevious = pageStart > 0;
  const hasNext = pageStart + VISIBLE_BOOKS < books.length;

  function showPreviousPage() {
    setPageStart((current) => Math.max(0, current - VISIBLE_BOOKS));
  }

  function showNextPage() {
    setPageStart((current) => (current + VISIBLE_BOOKS < books.length ? current + VISIBLE_BOOKS : current));
  }

  return (
    <section className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <ShelfHeader title={title} subtitle={subtitle} tone={activeTone} />
        <Link to="/search" className={cn('mt-1 shrink-0 text-sm font-black transition-colors', toneClass.link)}>
          Xem tất cả
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-stone-200 bg-white py-16">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 py-8 text-center text-sm font-bold text-red-600">{errorLabel ?? 'Không tải được dữ liệu.'}</p>
      ) : books.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white py-8 text-center text-sm font-semibold text-stone-500">{emptyMessage}</p>
      ) : (
        <div className="relative">
          <StaggerContainer className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {visibleBooks.map((book, index) => (
              <StaggerItem key={book._id}>
                <BookShelfTile book={book} rank={ranked ? pageStart + index + 1 : undefined} tone={activeTone} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {hasPrevious ? (
            <button
              type="button"
              onClick={showPreviousPage}
              className={cn('absolute left-0 top-1/2 z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-[0_12px_28px_rgba(28,25,23,0.16)] transition', toneClass.arrow)}
              aria-label={`Xem trang sách trước trong ${title}`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          {hasNext ? (
            <button
              type="button"
              onClick={showNextPage}
              className={cn('absolute right-0 top-1/2 z-10 grid h-11 w-11 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 shadow-[0_12px_28px_rgba(28,25,23,0.16)] transition', toneClass.arrow)}
              aria-label={`Xem thêm sách trong ${title}`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function NewBooks() {
  return (
    <BookShelf
      title="Gợi ý xuất sắc cho bạn"
      subtitle="Tuyển chọn các tựa sách được đánh giá cao bởi độc giả thân thiết"
      queryKey={['reader', 'home-new-books'] as const}
      fetcher={async () => {
        const result = await catalogApi.listBooks({ page: 1, limit: 12 });
        return result.items;
      }}
    />
  );
}

export function PopularBooks() {
  return (
    <BookShelf
      title="Tác phẩm được mượn nhiều"
      subtitle="Luôn nằm trong danh sách xếp hạng chờ mượn của Libero tuần này"
      queryKey={queryKeys.popular(12, 30)}
      fetcher={() => catalogApi.getPopular({ limit: 12, windowDays: 30 })}
      ranked
      tone="green"
    />
  );
}

export function Recommendations() {
  return (
    <BookShelf
      title="Có thể bạn sẽ thích"
      subtitle="Những lựa chọn liên quan đến lịch sử đọc và chủ đề bạn quan tâm"
      queryKey={queryKeys.recommendations(12)}
      fetcher={() => catalogApi.getRecommendations({ limit: 12 })}
      emptyMessage="Hãy mượn vài cuốn sách để chúng tôi gợi ý phù hợp."
      tone="red"
    />
  );
}
