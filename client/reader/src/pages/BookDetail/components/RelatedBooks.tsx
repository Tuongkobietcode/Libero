import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';

import type { BookListItem } from '../../../types/models';
import { Spinner } from '../../../components/ui/Spinner';
import { catalogApi } from '../../../services/catalog.api';
import { queryKeys } from '../../../lib/queryKeys';
import { getBookDetailRouteState } from '../../../utils/bookDetailRoute';
import { formatList } from '../../../utils/format';

interface RelatedBooksProps {
  currentBookId: string;
}

function authorsLabel(book: BookListItem): string {
  return formatList(book.authors, 'Chưa cập nhật tác giả');
}

function categoryLabel(book: BookListItem): string {
  return book.categories[0]?.name ?? 'Đang cập nhật';
}

function RelatedBookCard({ book }: { book: BookListItem }) {
  const location = useLocation();
  const imageSrc = book.coverImage || DEFAULT_BOOK_COVER_IMAGE;

  return (
    <Link
      to={`/books/${book._id}`}
      state={getBookDetailRouteState(location)}
      className="group flex min-h-[410px] min-w-0 flex-col rounded-2xl border-2 border-slate-800/85 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-[0_20px_44px_-30px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
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

export function RelatedBooks({ currentBookId }: RelatedBooksProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.popular(8, 30),
    queryFn: () => catalogApi.getPopular({ limit: 8, windowDays: 30 }),
    meta: { errorMessage: 'Không tải được sách liên quan.' },
  });

  const items = (data ?? []).filter((book) => book._id !== currentBookId).slice(0, 4);

  return (
    <section className="mt-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-brand-600">
            Sách liên quan
          </h2>
          <p className="mt-1 text-base font-medium text-slate-400">Một vài đầu sách khác có thể phù hợp với bạn</p>
        </div>
        <Link to="/search" className="mt-1 shrink-0 text-sm font-black text-brand-600 transition-colors hover:text-brand-700">
          Xem tất cả
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-2xl border border-stone-200 bg-white py-16">
          <Spinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white py-8 text-center text-sm font-semibold text-stone-500">
          Chưa có sách liên quan để gợi ý.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((book) => (
            <RelatedBookCard key={book._id} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}
