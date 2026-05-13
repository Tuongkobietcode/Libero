import { Filter, X } from 'lucide-react';

import type { CatalogFacets } from '../../../types/models';
import { Card } from '../../../components/ui/Card';
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
  const hasActive = Boolean(category) || availableOnly;
  const categories = facets?.categories ?? [];

  return (
    <Card padding="md" className="h-fit">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-base font-bold text-slate-900">
          <Filter className="h-4 w-4 text-brand-600" aria-hidden />
          Bộ lọc
        </div>
        {hasActive ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Xóa lọc
          </button>
        ) : null}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-sm font-semibold text-slate-700">Tình trạng</p>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 h-10 hover:border-brand-300 transition-colors">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => onAvailableChange(e.target.checked)}
            className="h-4 w-4 accent-brand-600"
          />
          <span className="text-sm text-slate-700">Chỉ hiện sách còn sẵn</span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">Chủ đề</p>
        {facetsLoading ? (
          <p className="text-sm text-slate-500">Đang tải...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có dữ liệu chủ đề.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            <li>
              <button
                type="button"
                onClick={() => onCategoryChange('')}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 h-9 text-sm font-medium transition-colors',
                  category === ''
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <span>Tất cả</span>
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat._id}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(cat._id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 h-9 text-sm font-medium transition-colors',
                    category === cat._id
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50',
                  )}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{cat.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
