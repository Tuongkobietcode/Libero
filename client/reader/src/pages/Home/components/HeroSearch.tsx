import { Link } from 'react-router-dom';
import { BookMarked, BookOpen, Clock3, Coins, Library, ListChecks, Sparkles } from 'lucide-react';

const FEATURED_BOOK = {
  title: 'Sapiens: Lược sử loài người',
  author: 'Yuval Noah Harari',
  category: 'Lịch sử & Triết học',
  image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
  quote: 'Một hành trình đi qua lịch sử loài người, từ những gốc rễ tiến hóa đến xã hội hiện đại.',
};

const HERO_BACKGROUND_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4';

const FEATURES = [
  {
    icon: Clock3,
    title: 'Đặt giữ trực tuyến',
    description: 'Giữ sách còn trên kệ trước khi đến quầy thủ thư.',
  },
  {
    icon: Library,
    title: 'Hàng chờ tự động',
    description: 'Khi sách bận, hệ thống xếp hàng và báo khi có bản trả.',
  },
  {
    icon: ListChecks,
    title: 'Kỷ luật minh bạch',
    description: 'Theo dõi hạn trả, khoản phạt và trạng thái tài khoản rõ ràng.',
  },
] as const;

const FEATURE_ICONS = [Clock3, BookMarked, Coins] as const;
const FEATURE_ICON_BOX_CLASSES = [
  'bg-sky-500/10 text-sky-300',
  'bg-emerald-500/10 text-emerald-400',
  'bg-amber-500/10 text-amber-400',
] as const;

export function HeroSearch() {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/40 bg-white px-6 py-10 text-white shadow-[0_28px_90px_-52px_rgba(2,8,23,0.45)] sm:px-10 lg:px-14 lg:pb-12 lg:pt-16">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={HERO_BACKGROUND_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_28%,rgba(14,165,233,0.16),transparent_30%),radial-gradient(circle_at_78%_18%,rgba(20,184,166,0.14),transparent_26%)]" aria-hidden />
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(500px,0.82fr)] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200">
            <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
            Trải nghiệm độc giả số Libero
          </span>

          <h1 className="mt-8 max-w-[820px] font-display text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Nơi khai mở tri thức{' '}
            <span className="block bg-gradient-to-r from-sky-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              đồng hành cùng ý tưởng
            </span>
          </h1>

          <p className="mt-7 max-w-[720px] text-lg font-medium leading-8 text-slate-200">
            Libero Smart Network giúp bạn tìm sách, đặt giữ, theo dõi hàng chờ và kiểm soát khoản mượn trong một không gian đọc rõ ràng.
          </p>

        </div>

        <article className="relative rounded-3xl border border-white/[0.12] bg-white/[0.06] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:p-7 lg:p-8">
          <div className="absolute right-0 top-0 rounded-bl-3xl rounded-tr-3xl bg-sky-500 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white">
            Đề xuất hàng đầu
          </div>
          <div className="flex flex-col gap-7 pt-10 sm:flex-row sm:items-stretch">
            <div className="relative h-[300px] w-full shrink-0 overflow-hidden rounded-[1.35rem] border border-white/20 bg-slate-900 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.85)] sm:h-auto sm:w-[205px] sm:self-stretch">
              <img src={FEATURED_BOOK.image} alt={`Bìa sách ${FEATURED_BOOK.title}`} className="h-full w-full object-cover" />
              <span className="absolute left-4 top-4 max-w-[132px] rounded-xl bg-white/[0.92] px-3 py-1.5 text-xs font-bold leading-5 text-slate-800">
                {FEATURED_BOOK.category}
              </span>
            </div>
            <div className="min-w-0 pt-1">
              <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-sky-300">{FEATURED_BOOK.category}</p>
              <h2 className="mt-4 font-display text-2xl font-black leading-tight text-white lg:text-3xl">{FEATURED_BOOK.title}</h2>
              <p className="mt-3 text-sm font-semibold text-slate-200">Tác giả: {FEATURED_BOOK.author}</p>
              <p className="mt-4 line-clamp-4 text-sm italic leading-7 text-slate-300">{FEATURED_BOOK.quote}</p>
              <Link
                to="/search?q=Sapiens"
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4" aria-hidden />
                Xem chi tiết ngay
              </Link>
            </div>
          </div>
        </article>
      </div>

      <div className="relative mt-14 grid gap-x-20 gap-y-8 border-t border-white/[0.12] pt-10 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const Icon = FEATURE_ICONS[index] ?? feature.icon;
          const iconBoxClass = FEATURE_ICON_BOX_CLASSES[index] ?? FEATURE_ICON_BOX_CLASSES[0];
          return (
            <div key={feature.title} className="grid max-w-[560px] grid-cols-[auto_minmax(0,1fr)] gap-5">
              <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl ${iconBoxClass}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h3 className="m-0 text-[17px] font-black leading-6 text-slate-100">{feature.title}</h3>
                <p className="m-0 mt-1 max-w-[440px] text-[15px] font-medium leading-6 text-slate-400">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
