import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';

import type { BookListItem } from '../../../types/models';
import type { PaginatedResult } from '../../../types/api';
import { BookCard } from '../../../components/book/BookCard';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { cn } from '../../../utils/cn';

export type ViewMode = 'grid' | 'list';

interface SearchResultsProps {
  result?: PaginatedResult<BookListItem>;
  isLoading: boolean;
  isError: boolean;
  page: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPageChange: (next: number) => void;
}

export function SearchResults({
  result,
  isLoading,
  isError,
  page,
  viewMode,
  onViewModeChange,
  onPageChange,
}: SearchResultsProps) {
  const totalItems = result?.pagination.totalItems ?? 0;
  const totalPages = result?.pagination.totalPages ?? 1;
  const items = result?.items ?? [];

  return (
    <section className="min-w-0">
      <Card padding="md" className="mb-6 rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kết quả tìm kiếm</h2>
          {result ? (
            <p className="mt-0.5 text-sm text-slate-500">
              Tìm thấy <strong className="text-slate-700">{totalItems}</strong> đầu sách
            </p>
          ) : null}
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-sm font-semibold transition-colors',
              viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
            )}
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Lưới
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-sm font-semibold transition-colors',
              viewMode === 'list' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
            )}
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" aria-hidden />
            Danh sách
          </button>
        </div>
      </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16">
          <Spinner size="lg" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          Không thể tìm sách theo bộ lọc hiện tại. Vui lòng thử lại sau.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <h3 className="text-base font-bold text-slate-700">Không tìm thấy đầu sách phù hợp</h3>
          <p className="mt-1 text-sm text-slate-500">Hãy thử đổi từ khóa hoặc bỏ bớt bộ lọc.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((book) => (
            <BookCard key={book._id} book={book} variant="list" />
          ))}
        </div>
      )}

      {result && totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Trước
          </button>
          <span className="text-sm text-slate-600">
            Trang <strong className="text-slate-900">{page}</strong> / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Sau
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}
    </section>
  );
}
