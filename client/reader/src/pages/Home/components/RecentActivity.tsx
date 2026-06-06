import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkX,
  Clock3,
  DollarSign,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import type { MemberActivityItem, MemberActivityKind } from '../../../types/models';
import { StaggerContainer, StaggerItem, StaggerList, StaggerListItem } from '../../../components/motion/ReaderMotion';
import { Spinner } from '../../../components/ui/Spinner';
import { memberApi } from '../../../services/member.api';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../utils/cn';

type Tone = 'green' | 'amber' | 'blue' | 'red' | 'slate';

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  red: 'bg-red-50 text-red-600 ring-red-100',
  slate: 'bg-stone-100 text-stone-600 ring-stone-200',
};

const KIND_META: Record<MemberActivityKind, { icon: LucideIcon; tone: Tone }> = {
  LOAN_CHECKOUT: { icon: BookOpen, tone: 'green' },
  LOAN_RETURNED: { icon: RotateCcw, tone: 'blue' },
  RESERVATION_CREATED: { icon: Bookmark, tone: 'amber' },
  RESERVATION_CANCELLED: { icon: BookmarkX, tone: 'slate' },
  FINE_PAID: { icon: DollarSign, tone: 'red' },
};

function ActivityRow({ item }: { item: MemberActivityItem }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  return (
    <StaggerListItem className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 border-b border-stone-100 py-4 last:border-b-0">
      <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1', TONE_CLASS[meta.tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="m-0 line-clamp-1 text-sm font-black text-stone-800">{item.title}</p>
        <p className="m-0 mt-1 line-clamp-1 text-sm font-medium text-stone-500">{item.description}</p>
      </div>
      <time className="font-mono text-xs font-bold text-stone-400">{dayjs(item.occurredAt).format('DD/MM')}</time>
    </StaggerListItem>
  );
}

export function RecentActivity() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.myActivities(6),
    queryFn: () => memberApi.getMyActivities(6),
    enabled: isAuthenticated,
    meta: { errorMessage: 'Không tải được hoạt động gần đây.' },
  });

  return (
    <section>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-black uppercase tracking-[0.08em] text-indigo-600">Hoạt động của tôi</h2>
        <p className="mt-1 text-base font-medium text-slate-400">Những tín hiệu quan trọng từ tài khoản đọc của bạn</p>
      </div>

      <StaggerContainer className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <StaggerItem>
        <article className="rounded-2xl border-2 border-slate-800/85 bg-white p-5 transition duration-300 hover:border-indigo-500">
          <div className="mb-2 flex items-center justify-between gap-4">
            <h3 className="m-0 font-display text-xl font-black tracking-tight text-stone-950">Nhịp đọc gần đây</h3>
            <Link to="/profile" className="inline-flex items-center gap-1 text-sm font-black text-indigo-600 hover:text-indigo-700">
              Xem hồ sơ
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {!isAuthenticated ? (
            <p className="py-8 text-center text-sm font-semibold text-stone-500">Đăng nhập để xem hoạt động gần đây.</p>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm font-bold text-red-600">Không tải được hoạt động.</p>
          ) : !data || data.length === 0 ? (
            <p className="py-8 text-center text-sm font-semibold text-stone-500">Chưa có hoạt động nào.</p>
          ) : (
            <StaggerList className="flex flex-col">
              {data.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </StaggerList>
          )}
        </article>
        </StaggerItem>

        <StaggerItem>
        <aside className="rounded-2xl border-2 border-slate-800/85 bg-[#f8fafc] p-5 transition duration-300 hover:border-indigo-500">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-indigo-600 ring-1 ring-indigo-100">
              <Clock3 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="m-0 font-display text-xl font-black tracking-tight text-stone-950">Việc cần nhớ</h3>
              <p className="m-0 mt-2 text-sm font-medium leading-6 text-stone-500">
                Kiểm tra hạn trả trước khi đặt thêm sách. Nếu reservation được thông báo, hãy đến quầy trong thời gian giữ chỗ.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Link to="/my-loans" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-stone-700 ring-1 ring-stone-200 transition hover:text-indigo-600">
              Khoản mượn của tôi
            </Link>
            <Link to="/my-reservations" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-stone-700 ring-1 ring-stone-200 transition hover:text-indigo-600">
              Hàng chờ đặt chỗ
            </Link>
            <Link to="/my-fines" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-stone-700 ring-1 ring-stone-200 transition hover:text-indigo-600">
              Khoản phạt cần xử lý
            </Link>
          </div>
        </aside>
        </StaggerItem>
      </StaggerContainer>
    </section>
  );
}
