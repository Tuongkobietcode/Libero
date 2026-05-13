import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { SearchBar } from '../../components/book/SearchBar';
import { Card } from '../../components/ui/Card';
import { useDebounce } from '../../hooks/useDebounce';
import { catalogApi } from '../../services/catalog.api';
import { queryKeys } from '../../lib/queryKeys';

import { SearchFilters } from './sections/SearchFilters';
import { SearchResults, type ViewMode } from './sections/SearchResults';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === 'true');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1') || 1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim());
    if (category) next.set('category', category);
    if (availableOnly) next.set('available', 'true');
    if (page > 1) next.set('page', String(page));
    setSearchParams(next, { replace: true });
  }, [availableOnly, category, debouncedQuery, page, setSearchParams]);

  const facetsQuery = useQuery({
    queryKey: queryKeys.facets(),
    queryFn: () => catalogApi.getFacets(),
    meta: { errorMessage: 'Không tải được danh sách chủ đề.' },
  });

  const trimmedQuery = debouncedQuery.trim();
  const booksQuery = useQuery({
    queryKey: ['reader', 'search-books', trimmedQuery, category, availableOnly, page] as const,
    queryFn: () =>
      catalogApi.listBooks({
        q: trimmedQuery || undefined,
        category: category || undefined,
        available: availableOnly ? true : undefined,
        page,
        limit: PAGE_SIZE,
      }),
    meta: { errorMessage: 'Không thể tìm sách theo bộ lọc hiện tại.' },
  });

  const heading = useMemo(() => {
    if (trimmedQuery) return `Kết quả cho "${trimmedQuery}"`;
    if (category) {
      const cat = facetsQuery.data?.categories.find((c) => c._id === category);
      return cat ? `Chủ đề: ${cat.name}` : 'Tìm kiếm sách';
    }
    return 'Tìm kiếm sách';
  }, [trimmedQuery, category, facetsQuery.data]);

  return (
    <div className="flex flex-col gap-6">
      <Card padding="md">
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold text-slate-900">{heading}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lọc theo chủ đề, tình trạng và từ khóa để tìm đầu sách phù hợp.
          </p>
        </div>
        <SearchBar
          defaultValue={query}
          placeholder="Tìm sách theo tên, tác giả, ISBN..."
          size="lg"
          onSubmit={(value) => {
            setQuery(value);
            setPage(1);
            navigate(`/search${value ? `?q=${encodeURIComponent(value)}` : ''}`, { replace: true });
          }}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SearchFilters
          facets={facetsQuery.data}
          facetsLoading={facetsQuery.isLoading}
          category={category}
          availableOnly={availableOnly}
          onCategoryChange={(next) => {
            setCategory(next);
            setPage(1);
          }}
          onAvailableChange={(next) => {
            setAvailableOnly(next);
            setPage(1);
          }}
          onReset={() => {
            setCategory('');
            setAvailableOnly(false);
            setPage(1);
          }}
        />

        <SearchResults
          result={booksQuery.data}
          isLoading={booksQuery.isLoading}
          isError={booksQuery.isError}
          page={page}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
