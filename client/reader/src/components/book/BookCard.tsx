import { Link, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { DEFAULT_BOOK_COVER_IMAGE } from '@libero/shared';

import type { BookListItem } from '../../types/models';
import { cn } from '../../utils/cn';
import { getBookDetailRouteState } from '../../utils/bookDetailRoute';
import { formatList } from '../../utils/format';
import { RatingStars } from './RatingStars';

interface BookCardProps {
  book: BookListItem;
  variant?: 'grid' | 'list';
  rating?: number;
  reviewCount?: number;
  className?: string;
}

function authorsLabel(book: BookListItem): string {
  return formatList(book.authors, 'Chưa cập nhật tác giả');
}

function categoryLabel(book: BookListItem): string {
  return book.categories[0]?.name ?? 'Đang cập nhật';
}

function getBookStatus(book: BookListItem, variant: 'grid' | 'list'): { label: string; className: string } {
  if (book.totalCopies === 0) {
    return {
      label: 'Chưa có bản',
      className: 'bg-slate-100 text-slate-600 ring-slate-200',
    };
  }

  if (book.availableCopies === 0) {
    return {
      label: variant === 'list' ? 'Đợi mượn / Giữ chỗ' : 'Chờ đặt hàng',
      className: 'bg-amber-50 text-amber-700 ring-amber-100',
    };
  }

  return {
    label: variant === 'list' ? `${book.availableCopies} cuốn sẵn sàng` : `${book.availableCopies} cuốn trên kệ`,
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };
}

function AvailabilityBadge({ book, variant }: { book: BookListItem; variant: 'grid' | 'list' }) {
  const status = getBookStatus(book, variant);

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${status.className}`}>
      {status.label}
    </span>
  );
}

function CoverImage({ book, className, children }: { book: BookListItem; className?: string; children?: ReactNode }) {
  const imageSrc = book.coverImage || DEFAULT_BOOK_COVER_IMAGE;

  return (
    <div className={cn('relative overflow-hidden bg-stone-100 shadow-[0_12px_28px_-22px_rgba(28,25,23,0.7)]', className)}>
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
      {children}
    </div>
  );
}

export function BookCard({ book, variant = 'grid', rating, reviewCount, className }: BookCardProps) {
  const location = useLocation();
  const bookDetailState = getBookDetailRouteState(location);

  if (variant === 'list') {
    return (
      <Link
        to={`/books/${book._id}`}
        state={bookDetailState}
        className={cn(
          'group grid min-h-[210px] grid-cols-[150px_minmax(0,1fr)] gap-6 rounded-3xl border-2 border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-[0_24px_56px_-38px_rgba(15,23,42,0.55)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
          className,
        )}
      >
        <CoverImage book={book} className="h-[170px] rounded-xl" />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-xl bg-brand-50 px-4 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-brand-700">
              {categoryLabel(book)}
            </span>
            <AvailabilityBadge book={book} variant="list" />
          </div>

          <h3 className="mt-4 line-clamp-2 font-display text-2xl font-black leading-tight tracking-tight text-slate-950 transition group-hover:text-brand-600">
            {book.title}
          </h3>
          <p className="mt-3 line-clamp-1 text-base font-medium text-slate-500">
            Tác giả khuyên đọc: <span className="font-black text-slate-700">{authorsLabel(book)}</span>
            <span className="mx-1 text-slate-300">|</span>
            ISBN: <span className="font-mono text-slate-400">{book.isbn}</span>
          </p>
          {book.description ? (
            <p className="mt-4 line-clamp-1 text-base italic leading-7 text-slate-400">"{book.description}"</p>
          ) : null}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="m-0 text-sm font-medium text-slate-400">
              Phân phối {book.totalCopies} ấn bản lưu hành thực địa.
            </p>
          </div>
          {typeof rating === 'number' ? (
            <div className="mt-3">
              <RatingStars value={rating} reviewCount={reviewCount} showValue />
            </div>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/books/${book._id}`}
      state={bookDetailState}
      className={cn(
        'group flex min-h-[410px] min-w-0 flex-col rounded-2xl border-2 border-slate-800/85 bg-white p-4 transition duration-300 hover:-translate-y-1 hover:border-brand-500 hover:shadow-[0_20px_44px_-30px_rgba(15,23,42,0.6)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        className,
      )}
    >
      <CoverImage book={book} className="h-[255px] rounded-lg sm:h-[265px]">
        <div className="absolute right-3 top-3">
          <AvailabilityBadge book={book} variant="grid" />
        </div>
      </CoverImage>

      <div className="flex flex-1 flex-col pt-7">
        <h3 className="line-clamp-2 font-display text-lg font-black leading-tight tracking-tight text-slate-950">
          {book.title}
        </h3>
        <p className="mt-3 line-clamp-1 text-sm font-semibold text-slate-400">{authorsLabel(book)}</p>
      </div>
    </Link>
  );
}
