import { useNavigate } from 'react-router-dom';
import { BookOpen, Bookmark, Calendar, SlidersHorizontal } from 'lucide-react';

import heroBackground from '../../../assets/Bg2.png';
import { SearchBar } from '../../../components/book/SearchBar';

const QUICK_LINKS = [
  { icon: SlidersHorizontal, label: 'Tìm kiếm nâng cao', to: '/search' },
  { icon: BookOpen, label: 'Sách mới', to: '/search?sort=new' },
  { icon: Bookmark, label: 'Sách điện tử', to: '/search?type=ebook' },
  { icon: Calendar, label: 'Tài liệu học tập', to: '/search?type=academic' },
] as const;

export function HeroSearch() {
  const navigate = useNavigate();

  function go(query: string) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-brand-50 shadow-sm">
      <img
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        src={heroBackground}
        alt=""
        aria-hidden
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,246,255,0.97)_0%,rgba(239,246,255,0.9)_42%,rgba(239,246,255,0.2)_100%)]" />
      <div className="relative max-w-[760px] px-6 py-9 sm:px-12 sm:py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900">
          Khám phá thư viện dễ dàng
        </h1>
        <p className="mt-2 text-base text-slate-600">
          Tìm kiếm sách, đặt chỗ và quản lý tài khoản của bạn tại LIBERO.
        </p>

        <div className="mt-6 max-w-[680px]">
          <SearchBar
            size="lg"
            placeholder="Tìm sách, tác giả, chủ đề hoặc ISBN..."
            onSubmit={go}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.to)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 h-9 text-sm font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-600 transition-colors"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
