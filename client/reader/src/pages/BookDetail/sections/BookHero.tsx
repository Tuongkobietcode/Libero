import type { BookDetail } from '../../../types/models';
import { Badge } from '../../../components/ui/Badge';
import { RatingStars } from '../../../components/book/RatingStars';
import { formatList } from '../../../utils/format';

interface BookHeroProps {
  book: BookDetail;
}

export function BookHero({ book }: BookHeroProps) {
  const categories = book.categories.length > 0 ? book.categories : [{ _id: 'fallback', name: 'Đang cập nhật' }];

  return (
    <article className="min-w-0">
      <h1 className="text-3xl font-extrabold leading-tight text-slate-900">{book.title}</h1>
      <p className="mt-2 text-base font-bold text-brand-600">
        {formatList(book.authors, 'Chưa cập nhật tác giả')}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge key={cat._id} tone="info">{cat.name}</Badge>
        ))}
      </div>

      <dl className="mt-6 grid gap-4 border-b border-slate-100 pb-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Nhà xuất bản</dt>
          <dd className="mt-1 font-semibold text-slate-700">{book.publisher ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Năm xuất bản</dt>
          <dd className="mt-1 font-semibold text-slate-700">{book.publishYear ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">ISBN</dt>
          <dd className="mt-1 font-semibold text-slate-700">{book.isbn}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Ngôn ngữ</dt>
          <dd className="mt-1 font-semibold text-slate-700">{book.language ?? 'Đang cập nhật'}</dd>
        </div>
      </dl>

      <div className="mt-5">
        <RatingStars value={4.6} reviewCount={1234} showValue />
      </div>

      <p className="mt-5 max-w-[760px] text-[15px] leading-7 text-slate-600 whitespace-pre-line">
        {book.description ?? 'Chưa có mô tả cho đầu sách này.'}
      </p>
    </article>
  );
}
