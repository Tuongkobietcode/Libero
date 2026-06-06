import { BookMarked, CalendarDays, Hash, Layers3 } from 'lucide-react';

import type { BookDetail } from '../../../types/models';
import { formatList } from '../../../utils/format';

interface BookHeroProps {
  book: BookDetail;
}

interface MetaItemProps {
  icon: typeof Hash;
  label: string;
  value: string | number;
}

function MetaItem({ icon: Icon, label, value }: MetaItemProps) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</dt>
        <dd className="mt-1 truncate text-sm font-black text-slate-700">{value}</dd>
      </div>
    </div>
  );
}

export function BookHero({ book }: BookHeroProps) {
  const authors = formatList(book.authors, 'Chưa cập nhật tác giả');
  const bookCode = book.copies[0]?.barcode ?? `B-${book._id.slice(-4).toUpperCase()}`;
  const language = book.language ?? 'Đang cập nhật';
  const publishYear = book.publishYear ?? '—';

  return (
    <article className="min-w-0">
      <h1 className="max-w-[640px] text-balance font-display text-2xl font-black leading-tight tracking-tight text-slate-950 xl:text-3xl">
        {book.title}
      </h1>
      <p className="mt-2 text-base font-medium text-slate-500">
        Bởi <span className="font-black text-brand-600">{authors}</span>
        <span className="mx-2 text-slate-400">•</span>
        Năm xuất bản: {publishYear}
      </p>

      <dl className="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetaItem icon={Hash} label="ISBN" value={book.isbn} />
        <MetaItem icon={BookMarked} label="Mã sách" value={bookCode} />
        <MetaItem icon={CalendarDays} label="Xuất bản" value={publishYear} />
        <MetaItem icon={Layers3} label="Ngôn ngữ" value={language} />
      </dl>

      <section className="mt-6">
        <h2 className="font-display text-base font-black uppercase tracking-[0.08em] text-slate-800">
          Tóm tắt tác phẩm
        </h2>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="m-0 max-w-[680px] whitespace-pre-line text-sm font-medium leading-6 text-slate-600">
            {book.description ?? 'Chưa có mô tả cho đầu sách này.'}
          </p>
        </div>
      </section>
    </article>
  );
}
