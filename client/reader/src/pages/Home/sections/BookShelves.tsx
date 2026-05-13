import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

import type { BookListItem } from '../../../types/models';
import { BookCover } from '../../../components/book/BookCover';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { catalogApi } from '../../../services/catalog.api';
import { queryKeys } from '../../../lib/queryKeys';
import { formatList } from '../../../utils/format';

const VISIBLE_BOOKS = 8;

interface BookShelfProps {
  title: string;
  subtitle?: string;
  queryKey: readonly unknown[];
  fetcher: () => Promise<BookListItem[]>;
  emptyMessage?: string;
  errorLabel?: string;
  ranked?: boolean;
}

function authorsLabel(book: BookListItem): string {
  return formatList(book.authors, 'Chưa cập nhật tác giả');
}

function categoriesLabel(book: BookListItem): string {
  return formatList(book.categories, 'Đang cập nhật');
}

function getBookStatus(book: BookListItem): { label: string; className: string } {
  if (book.totalCopies === 0) {
    return {
      label: 'Chưa có bản',
      className: 'bg-slate-100 text-slate-600',
    };
  }

  if (book.availableCopies === 0) {
    return {
      label: 'Hết bản',
      className: 'bg-rose-50 text-rose-600',
    };
  }

  return {
    label: `Có sẵn ${book.availableCopies}/${book.totalCopies}`,
    className: 'bg-emerald-50 text-emerald-600',
  };
}

function AvailabilityBadge({ book }: { book: BookListItem }) {
  const status = getBookStatus(book);

  return <span className={`mt-auto inline-flex w-fit rounded-md px-2 py-1 text-[0.7rem] font-extrabold ${status.className}`}>{status.label}</span>;
}

function BookShelfTile({ book, rank }: { book: BookListItem; rank?: number }) {
  return (
    <Link
      to={`/books/${book._id}`}
      className="group relative flex min-h-[168px] min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,31,56,0.04)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-[0_14px_28px_rgba(38,117,217,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
    >
      {rank ? (
        <span className="absolute -left-1.5 -top-1.5 z-10 grid h-6 min-w-6 place-items-center rounded-md bg-brand-600 px-1.5 text-xs font-extrabold text-white shadow-sm">
          {rank}
        </span>
      ) : null}
      <BookCover
        src={book.coverImage}
        title={book.title}
        seed={book._id}
        size="sm"
        className="h-[136px] w-[92px] rounded-lg shadow-[0_10px_18px_rgba(15,31,56,0.14)]"
      />
      <div className="flex min-w-0 flex-1 flex-col py-1.5">
        <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-950 transition group-hover:text-brand-600">{book.title}</h3>
        <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-slate-500">{authorsLabel(book)}</p>
        <p className="mt-1 line-clamp-1 text-sm text-slate-500">{categoriesLabel(book)}</p>
        <AvailabilityBadge book={book} />
      </div>
    </Link>
  );
}

function BookShelf({ title, subtitle, queryKey, fetcher, emptyMessage = 'Chưa có sách phù hợp.', errorLabel, ranked }: BookShelfProps) {
  const [pageStart, setPageStart] = useState(0);
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
    <Card padding="sm" className="min-w-0 rounded-xl">
      <SectionHeader title={title} subtitle={subtitle} action={{ label: 'Xem tất cả', to: '/search' }} className="mb-3" />

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">{errorLabel ?? 'Không tải được dữ liệu.'}</p>
      ) : books.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleBooks.map((book, index) => (
              <BookShelfTile key={book._id} book={book} rank={ranked ? pageStart + index + 1 : undefined} />
            ))}
          </div>

          {hasPrevious ? (
            <button
              type="button"
              onClick={showPreviousPage}
              className="absolute left-0 top-1/2 z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_12px_28px_rgba(15,31,56,0.16)] transition hover:border-brand-200 hover:text-brand-600"
              aria-label={`Xem trang sách trước trong ${title}`}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          {hasNext ? (
            <button
              type="button"
              onClick={showNextPage}
              className="absolute right-0 top-1/2 z-10 grid h-11 w-11 translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_12px_28px_rgba(15,31,56,0.16)] transition hover:border-brand-200 hover:text-brand-600"
              aria-label={`Xem thêm sách trong ${title}`}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export function NewBooks() {
  return (
    <BookShelf
      title="Sách mới"
      subtitle="Cập nhật mới nhất từ thư viện"
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
      title="Sách phổ biến"
      subtitle="Được mượn nhiều trong 30 ngày qua"
      queryKey={queryKeys.popular(12, 30)}
      fetcher={() => catalogApi.getPopular({ limit: 12, windowDays: 30 })}
      ranked
    />
  );
}

export function Recommendations() {
  return (
    <BookShelf
      title="Gợi ý cho bạn"
      subtitle="Dựa trên lịch sử mượn của bạn"
      queryKey={queryKeys.recommendations(12)}
      fetcher={() => catalogApi.getRecommendations({ limit: 12 })}
      emptyMessage="Hãy mượn vài cuốn sách để chúng tôi gợi ý phù hợp."
    />
  );
}
