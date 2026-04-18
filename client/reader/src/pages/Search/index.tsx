import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import BookCard from '../../components/BookCard';
import SearchBar from '../../components/SearchBar';
import { useDebounce } from '../../hooks/useDebounce';
import { catalogApi } from '../../services/catalog.api';
import { extractErrorMessage } from '../../utils/format';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('available') === 'true');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (debouncedQuery.trim()) {
      nextParams.set('q', debouncedQuery.trim());
    }

    if (availableOnly) {
      nextParams.set('available', 'true');
    }

    if (page > 1) {
      nextParams.set('page', String(page));
    }

    setSearchParams(nextParams, { replace: true });
  }, [availableOnly, debouncedQuery, page, setSearchParams]);

  const booksQuery = useQuery({
    queryKey: ['reader-search-books', debouncedQuery, availableOnly, page],
    queryFn: () =>
      catalogApi.listBooks({
        q: debouncedQuery.trim() || undefined,
        available: availableOnly ? true : undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const paginationLabel = useMemo(() => {
    if (!booksQuery.data) {
      return '';
    }

    return `Trang ${booksQuery.data.pagination.page} / ${booksQuery.data.pagination.totalPages || 1}`;
  }, [booksQuery.data]);
  const books = booksQuery.data;

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-header">
          <h1 className="page-title">Tim sach</h1>
          <p className="page-description">Loc nhanh theo tu khoa va chi xem nhung dau sach dang con ban sao available neu can.</p>
        </div>

        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onSubmit={() => setPage(1)}
          placeholder="Nhap tu khoa tim kiem..."
        >
          <label className="search-addon">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => {
                setAvailableOnly(event.target.checked);
                setPage(1);
              }}
            />
            <span>Chi hien sach con san</span>
          </label>
        </SearchBar>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Ket qua tim kiem</h2>
            <p className="card-subtitle">Tap trung vao workflow tim va xem thong tin sach de dat cho hoac den ke sach.</p>
          </div>
          {booksQuery.data ? <span className="reader-user-chip">{booksQuery.data.pagination.totalItems} ket qua</span> : null}
        </div>

        {booksQuery.isLoading ? <div className="loading-state">Dang tim sach...</div> : null}
        {booksQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(booksQuery.error, 'Khong the tim sach theo bo loc hien tai.')}</div>
        ) : null}
        {!booksQuery.isLoading && !booksQuery.isError ? (
          books && books.items.length > 0 ? (
            <>
              <div className="book-grid">
                {books.items.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
              <div className="pagination" style={{ marginTop: 20 }}>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                  Trang truoc
                </button>
                <span className="text-muted">{paginationLabel}</span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= (books.pagination.totalPages || 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Khong tim thay dau sach phu hop</h3>
              <p className="page-description">Hay thu doi tu khoa hoac bo loc de xem them ket qua.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
