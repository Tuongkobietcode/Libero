import { Link } from 'react-router-dom';

import type { BookListItem } from '../types/models';
import { formatList } from '../utils/format';

interface BookCardProps {
  book: BookListItem;
}

export default function BookCard({ book }: BookCardProps) {
  const initials = book.title
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  return (
    <Link to={`/books/${book._id}`} className="card book-card">
      <div className="book-card-cover">{book.coverImage ? <img src={book.coverImage} alt={book.title} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 18 }} /> : initials}</div>
      <div className="book-card-meta">
        <div className="badge-row">
          <span className={`badge ${book.availableCopies > 0 ? 'success' : 'warning'}`}>
            {book.availableCopies > 0 ? `${book.availableCopies} ban co san` : 'Tam het sach'}
          </span>
          <span className="badge muted">{book.totalCopies} ban sao</span>
        </div>
        <div>
          <h3 className="list-card-title">{book.title}</h3>
          <p className="list-card-subtitle">{formatList(book.authors, 'Chua cap nhat tac gia')}</p>
        </div>
        <div className="meta-list">
          <div className="meta-row">
            <span className="meta-label">ISBN</span>
            <span>{book.isbn}</span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Danh muc</span>
            <span>{formatList(book.categories, 'Dang cap nhat')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
