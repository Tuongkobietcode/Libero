import type { BookDetail } from '../../../types/models';
import { BookCover } from '../../../components/book/BookCover';

interface BookSidebarProps {
  book: BookDetail;
}

export function BookSidebar({ book }: BookSidebarProps) {
  const primaryCategory = book.categories[0]?.name ?? 'Đang cập nhật';

  return (
    <div className="flex flex-col items-center gap-4">
      <BookCover
        src={book.coverImage}
        title={book.title}
        seed={book._id}
        size="lg"
        className="h-[292px] w-full max-w-[214px] rounded-lg"
        overlay={
          <span className="absolute left-3 top-3 rounded-md bg-white/[0.94] px-2.5 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
            {primaryCategory}
          </span>
        }
      />

      <span className="inline-flex rounded-full bg-sky-50 px-4 py-1.5 text-sm font-black text-brand-600">
        {primaryCategory}
      </span>
    </div>
  );
}
