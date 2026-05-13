import { Link } from 'react-router-dom';

import type { BookListItem } from '../../types/models';
import { cn } from '../../utils/cn';
import { formatList } from '../../utils/format';
import { BookCover } from './BookCover';
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

  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>;
}

export function BookCard({ book, variant = 'grid', rating, reviewCount, className }: BookCardProps) {
  if (variant === 'list') {
    return (
      <Link
        to={`/books/${book._id}`}
        className={cn(
          'group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-[0_16px_34px_rgba(38,117,217,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
          className,
        )}
      >
        <BookCover src={book.coverImage} title={book.title} seed={book._id} size="sm" className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-950 transition group-hover:text-brand-600">{book.title}</h3>
              <p className="mt-1 line-clamp-1 text-sm font-semibold text-slate-500">{authorsLabel(book)}</p>
            </div>
            <AvailabilityBadge book={book} />
          </div>
          {typeof rating === 'number' ? (
            <RatingStars value={rating} reviewCount={reviewCount} showValue />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
            <span className="font-bold text-slate-600">ISBN: {book.isbn}</span>
            {book.publishYear ? <span>{book.publishYear}</span> : null}
            <span className="line-clamp-1">{categoriesLabel(book)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/books/${book._id}`}
      className={cn(
        'group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-[0_16px_34px_rgba(38,117,217,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        className,
      )}
    >
      <BookCover
        src={book.coverImage}
        title={book.title}
        seed={book._id}
        size="md"
        overlay={
          <div className="absolute right-2 top-2">
            <AvailabilityBadge book={book} />
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-1.5 px-1">
        <h3 className="line-clamp-2 min-h-[2.5em] text-sm font-extrabold leading-snug text-slate-950 transition group-hover:text-brand-600">
          {book.title}
        </h3>
        <p className="line-clamp-1 text-xs font-semibold text-slate-500">{authorsLabel(book)}</p>
        <p className="line-clamp-1 text-xs font-semibold text-slate-400">{categoriesLabel(book)}</p>
        {typeof rating === 'number' ? (
          <RatingStars value={rating} reviewCount={reviewCount} showValue />
        ) : null}
      </div>
    </Link>
  );
}
