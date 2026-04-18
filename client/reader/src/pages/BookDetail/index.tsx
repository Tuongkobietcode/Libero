import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { catalogApi } from '../../services/catalog.api';
import { reservationApi } from '../../services/reservation.api';
import { CopyStatus, ReservationStatus, Role } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate, formatDateTime, formatList } from '../../utils/format';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const bookQuery = useQuery({
    queryKey: ['reader-book-detail', id],
    queryFn: () => catalogApi.getBook(id),
    enabled: Boolean(id),
  });

  const myReservationsQuery = useQuery({
    queryKey: ['reader-book-detail-active-reservations', user?._id],
    queryFn: () => reservationApi.listMyReservations({ scope: 'active', page: 1, limit: 100 }),
    enabled: isAuthenticated,
  });

  const reserveMutation = useMutation({
    mutationFn: () => reservationApi.createReservation(id),
    onSuccess: () => {
      setFeedback('Dat cho thanh cong. Ban co the theo doi vi tri hang cho trong muc Dat cho.');
      void queryClient.invalidateQueries({ queryKey: ['reader-book-detail-active-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader-my-reservations'] });
    },
    onError: (error) => {
      setFeedback(extractErrorMessage(error, 'Khong the tao yeu cau dat cho luc nay.'));
    },
  });

  const activeReservation = useMemo(() => {
    return myReservationsQuery.data?.items.find(
      (reservation) =>
        reservation.book._id === id &&
        (reservation.status === ReservationStatus.Waiting || reservation.status === ReservationStatus.Notified),
    );
  }, [id, myReservationsQuery.data?.items]);

  const availableCopies = useMemo(
    () => bookQuery.data?.copies.filter((copy) => copy.status === CopyStatus.Available) ?? [],
    [bookQuery.data?.copies],
  );
  const book = bookQuery.data;

  const canReaderReserve = user?.role === Role.Student || user?.role === Role.Lecturer;
  const isBlocked = Boolean(user?.isBlocked);
  const canReserve = book
    ? book.availableCopies === 0 && !activeReservation && isAuthenticated && canReaderReserve && !isBlocked
    : false;

  return (
    <div className="page-stack">
      {bookQuery.isLoading ? <div className="loading-state">Dang tai chi tiet sach...</div> : null}
      {bookQuery.isError ? (
        <div className="error-banner">{extractErrorMessage(bookQuery.error, 'Khong the tai thong tin sach.')}</div>
      ) : null}
      {!bookQuery.isLoading && !bookQuery.isError && book ? (
        <>
          <section className="detail-grid">
            <article className="card">
              <div className="card-header">
                <div>
                  <h1 className="page-title">{book.title}</h1>
                  <p className="page-description">
                    {formatList(book.authors, 'Chua cap nhat tac gia')} • ISBN {book.isbn}
                  </p>
                </div>
                <span className={`badge ${book.availableCopies > 0 ? 'success' : 'warning'}`}>
                  {book.availableCopies > 0 ? `${book.availableCopies} ban con san` : 'Tat ca da duoc muon/giu cho'}
                </span>
              </div>

              <div className="meta-list">
                <div className="meta-row">
                  <span className="meta-label">Danh muc</span>
                  <span>{formatList(book.categories, 'Dang cap nhat')}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Nha xuat ban</span>
                  <span>{book.publisher ?? '-'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Nam xuat ban</span>
                  <span>{book.publishYear ?? '-'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Gia tri sach</span>
                  <span>{formatCurrency(book.bookValue)}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Mo ta</span>
                  <span>{book.description ?? 'Chua co mo ta cho dau sach nay.'}</span>
                </div>
              </div>
            </article>

            <aside className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Tinh trang muon</h2>
                  <p className="card-subtitle">Reader chi xem availability, khong tu muon tai giao dien nay.</p>
                </div>
              </div>

              {book.availableCopies > 0 ? (
                <div className="page-stack">
                  <div className="success-banner">
                    Sach dang con ban sao available. Ban co the den thu vien de lam thu tuc muon.
                  </div>
                  <div>
                    <strong>Vi tri ke goi y</strong>
                    <div className="shelf-list" style={{ marginTop: 10 }}>
                      {availableCopies.map((copy) => (
                        <span className="shelf-pill" key={copy._id}>
                          {copy.shelfLocation || 'Dang cap nhat ke'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeReservation ? (
                <div className="notice">
                  Ban da co yeu cau dat cho dang hieu luc cho dau sach nay. Vi tri hien tai: #{activeReservation.queuePosition}.
                </div>
              ) : canReserve ? (
                <div className="page-stack">
                  <div className="warning-banner">
                    Hien tai tat ca ban sao deu dang duoc muon hoac giu cho. Ban co the dat cho de xep hang.
                  </div>
                  <button className="button" type="button" onClick={() => reserveMutation.mutate()} disabled={reserveMutation.isPending}>
                    {reserveMutation.isPending ? 'Dang gui yeu cau...' : 'Dat cho sach nay'}
                  </button>
                </div>
              ) : isAuthenticated ? (
                <div className="notice">
                  {isBlocked
                    ? 'Tai khoan cua ban dang bi khoa nen khong the dat cho them. Vui long xu ly cac nghia vu con ton tai thu vien.'
                    : 'Chi sinh vien va giang vien moi duoc dat cho tren giao dien ban doc, hoac tai khoan hien tai khong du dieu kien.'}
                </div>
              ) : (
                <div className="page-stack">
                  <div className="warning-banner">
                    Dang nhap de dat cho khi dau sach khong con ban sao available.
                  </div>
                  <Link className="button" to="/login" state={{ from: location }}>
                    Dang nhap de dat cho
                  </Link>
                </div>
              )}

              {feedback ? (
                <div className={reserveMutation.isError ? 'error-banner' : 'success-banner'}>{feedback}</div>
              ) : null}
            </aside>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Trang thai tung ban sao</h2>
                <p className="card-subtitle">Thong tin nay giup ban doc uoc luong kha nang co sach tai thu vien.</p>
              </div>
            </div>

            {book.copies.length > 0 ? (
              <div className="status-list">
                {book.copies.map((copy, index) => (
                  <div key={copy._id} className="list-card">
                    <div className="card-header">
                      <div>
                        <h3 className="list-card-title">Ban sao {index + 1}</h3>
                        <p className="list-card-subtitle">Ke sach: {copy.shelfLocation || 'Dang cap nhat'}</p>
                      </div>
                      <span className={`badge ${copy.status === CopyStatus.Available ? 'success' : copy.status === CopyStatus.Borrowed ? 'warning' : 'muted'}`}>
                        {getStatusLabel(copy.status)}
                      </span>
                    </div>

                    <div className="meta-list">
                      <div className="meta-row">
                        <span className="meta-label">Ngay nhap</span>
                        <span>{formatDate(copy.acquiredDate)}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">Han tra hien tai</span>
                        <span>{formatDateTime(copy.currentDueDate)}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-label">Trang thai phieu muon</span>
                        <span>{getStatusLabel(copy.currentLoanStatus)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Chua co ban sao nao</h3>
                <p className="page-description">Thu vien chua cap nhat ban sao cho dau sach nay.</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
