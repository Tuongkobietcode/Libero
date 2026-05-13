import { Bookmark, BookOpen, CheckCircle2, Share2 } from 'lucide-react';

import type { BookDetail } from '../../../types/models';
import { Card } from '../../../components/ui/Card';
import { BookCover } from '../../../components/book/BookCover';

interface BookSidebarProps {
  book: BookDetail;
}

interface InfoRow {
  label: string;
  value: string;
}

function buildInfo(book: BookDetail): InfoRow[] {
  return [
    { label: 'Ngôn ngữ', value: book.language ?? 'Đang cập nhật' },
    { label: 'Số trang', value: book.pageCount ? `${book.pageCount} trang` : 'Đang cập nhật' },
    { label: 'Khổ sách', value: book.bookSize ?? 'Đang cập nhật' },
    { label: 'Nhà xuất bản', value: book.publisher ?? '—' },
    { label: 'Năm xuất bản', value: book.publishYear ? String(book.publishYear) : '—' },
    { label: 'ISBN', value: book.isbn },
  ];
}

export function BookSidebar({ book }: BookSidebarProps) {
  const info = buildInfo(book);

  return (
    <aside className="flex flex-col gap-4">
      <div className="flex justify-center">
        <BookCover src={book.coverImage} title={book.title} seed={book._id} size="lg" />
      </div>

      <Card padding="md">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-3 text-left text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <BookOpen className="h-5 w-5" aria-hidden />
          Xem trước
        </button>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center gap-3 text-left text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <Bookmark className="h-5 w-5" aria-hidden />
          Thêm vào danh sách muốn đọc
        </button>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center gap-3 text-left text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Đánh dấu đã đọc
        </button>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center gap-3 text-left text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <Share2 className="h-5 w-5" aria-hidden />
          Chia sẻ
        </button>
      </Card>

      <Card padding="md">
        <h2 className="mb-4 text-base font-extrabold text-slate-900">Thông tin sách</h2>
        <dl className="grid gap-3 text-sm">
          {info.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-slate-500">{row.label}</dt>
              <dd className="font-semibold text-slate-700 text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </aside>
  );
}
