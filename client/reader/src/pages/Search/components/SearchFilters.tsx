import { useState } from 'react';
import { Check, ChevronDown, Filter, X } from 'lucide-react';

import type { CatalogFacets } from '../../../types/models';
import { cn } from '../../../utils/cn';

interface SearchFiltersProps {
  facets?: CatalogFacets;
  facetsLoading?: boolean;
  category: string;
  availableOnly: boolean;
  onCategoryChange: (categoryId: string) => void;
  onAvailableChange: (next: boolean) => void;
  onReset: () => void;
}

export function SearchFilters({
  facets,
  facetsLoading,
  category,
  availableOnly,
  onCategoryChange,
  onAvailableChange,
  onReset,
}: SearchFiltersProps) {
  const [open, setOpen] = useState(false);
  const hasActive = Boolean(category) || availableOnly;
  const categories = facets?.categories ?? [];
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-black transition active:scale-[0.98]',
          open || hasActive
            ? 'border-brand-300 bg-brand-50 text-brand-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-600',
        )}
        aria-expanded={open}
      >
        <Filter className="h-4 w-4" aria-hidden />
        Bộ lọc
        {hasActive ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-xs text-white">{Number(Boolean(category)) + Number(availableOnly)}</span> : null}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-30 w-[340px] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)]">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="inline-flex items-center gap-2 text-base font-black text-slate-950">
              <Filter className="h-4 w-4 text-brand-600" aria-hidden />
              Bộ lọc
            </div>
            {hasActive ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Xóa lọc
              </button>
            ) : null}
          </div>

          <div className="mb-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.08em] text-slate-400">Tình trạng</p>
            <button
              type="button"
              onClick={() => onAvailableChange(!availableOnly)}
              className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 px-4 text-left text-sm font-semibold text-slate-700 transition hover:border-brand-300"
            >
              Chỉ hiện sách còn sẵn
              <span className={cn('grid h-5 w-5 place-items-center rounded-md border', availableOnly ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white')}>
                {availableOnly ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              </span>
            </button>
          </div>

          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.08em] text-slate-400">Chủ đề</p>
            {facetsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p>
            ) : (
              <div className="grid gap-1.5">
                <button
                  type="button"
                  onClick={() => onCategoryChange('')}
                  className={cn(
                    'flex h-10 items-center justify-between rounded-xl px-4 text-sm font-bold transition',
                    category === '' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
                  )}
                >
                  <span>Tất cả</span>
                  <span className={category === '' ? 'text-brand-100' : 'rounded-full bg-slate-100 px-2 py-0.5 text-slate-500'}>{totalCount}</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => onCategoryChange(cat._id)}
                    className={cn(
                      'flex h-10 items-center justify-between gap-3 rounded-xl px-4 text-sm font-bold transition',
                      category === cat._id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700',
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className={category === cat._id ? 'text-brand-100' : 'rounded-full bg-slate-100 px-2 py-0.5 text-slate-500'}>{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
