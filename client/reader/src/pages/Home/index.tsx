import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import BookCard from '../../components/BookCard';
import SearchBar from '../../components/SearchBar';
import { catalogApi } from '../../services/catalog.api';
import { extractErrorMessage } from '../../utils/format';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const latestBooksQuery = useQuery({
    queryKey: ['reader-home-latest-books'],
    queryFn: () => catalogApi.listBooks({ page: 1, limit: 6 }),
  });

  const availableBooksQuery = useQuery({
    queryKey: ['reader-home-available-books'],
    queryFn: () => catalogApi.listBooks({ available: true, page: 1, limit: 6 }),
  });
  const latestBooks = latestBooksQuery.data;
  const availableBooks = availableBooksQuery.data;

  function submitSearch() {
    const params = new URLSearchParams();

    if (searchTerm.trim()) {
      params.set('q', searchTerm.trim());
    }

    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div className="page-stack">
      <section className="hero">
        <div className="page-stack">
          <div className="page-header">
            <h1>Tim sach, dat cho va theo doi tai khoan thu vien tai mot noi.</h1>
            <p className="page-description">
              Ban doc co the tra cuu tai lieu, xem tinh trang hien co, theo doi sach dang muon,
              dat cho khi het sach va kiem tra tien phat ngay trong mot giao dien don gian.
            </p>
          </div>
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={submitSearch}
            placeholder="Nhap ten sach, tac gia hoac ISBN..."
            buttonLabel="Bat dau tim"
          />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Sach moi cap nhat</h2>
            <p className="card-subtitle">Danh sach nay lay tu catalog hien co de ban doc bat dau tra cuu nhanh.</p>
          </div>
        </div>
        {latestBooksQuery.isLoading ? <div className="loading-state">Dang tai danh muc sach...</div> : null}
        {latestBooksQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(latestBooksQuery.error, 'Khong the tai sach moi.')}</div>
        ) : null}
        {!latestBooksQuery.isLoading && !latestBooksQuery.isError ? (
          latestBooks && latestBooks.items.length > 0 ? (
            <div className="book-grid">
              {latestBooks.items.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Chua co sach nao trong he thong</h3>
              <p className="page-description">Thu vien chua cap nhat dau sach moi trong danh muc.</p>
            </div>
          )
        ) : null}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Sach con san de tim tai ke</h2>
            <p className="card-subtitle">Neu sach con ban sao available, ban doc se thay ngay khu vuc ke sach trong chi tiet dau sach.</p>
          </div>
        </div>
        {availableBooksQuery.isLoading ? <div className="loading-state">Dang tai sach co san...</div> : null}
        {availableBooksQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(availableBooksQuery.error, 'Khong the tai sach co san.')}</div>
        ) : null}
        {!availableBooksQuery.isLoading && !availableBooksQuery.isError ? (
          availableBooks && availableBooks.items.length > 0 ? (
            <div className="book-grid">
              {availableBooks.items.map((book) => (
                <BookCard key={book._id} book={book} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Khong co dau sach nao dang san sang</h3>
              <p className="page-description">Hay thu lai sau hoac tim kiem dau sach khac trong thu vien.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
