import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkX,
  DollarSign,
  Headphones,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

import type { MemberActivityItem, MemberActivityKind } from '../../../types/models';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { SectionHeader } from '../../../components/layout/SectionHeader';
import { memberApi } from '../../../services/member.api';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuth } from '../../../hooks/useAuth';
import { cn } from '../../../utils/cn';

type Tone = 'green' | 'amber' | 'blue' | 'purple' | 'slate';

const TONE_CLASS: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
};

const KIND_META: Record<MemberActivityKind, { icon: LucideIcon; tone: Tone }> = {
  LOAN_CHECKOUT: { icon: BookOpen, tone: 'green' },
  LOAN_RETURNED: { icon: RotateCcw, tone: 'blue' },
  RESERVATION_CREATED: { icon: Bookmark, tone: 'amber' },
  RESERVATION_CANCELLED: { icon: BookmarkX, tone: 'slate' },
  FINE_PAID: { icon: DollarSign, tone: 'purple' },
};

function ActivityRow({ item }: { item: MemberActivityItem }) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <li className="flex gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', TONE_CLASS[meta.tone])}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">{item.title}</p>
        <p className="text-sm text-slate-500 truncate">{item.description}</p>
      </div>
      <time className="shrink-0 text-xs text-slate-400">{dayjs(item.occurredAt).format('DD/MM/YYYY')}</time>
    </li>
  );
}

export function RecentActivity() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.myActivities(8),
    queryFn: () => memberApi.getMyActivities(8),
    enabled: isAuthenticated,
    meta: { errorMessage: 'Không tải được hoạt động gần đây.' },
  });

  return (
    <Card padding="sm" className="h-fit rounded-xl xl:sticky xl:top-24">
      <SectionHeader title="Hoạt động của bạn" action={{ label: 'Xem tất cả', to: '/profile' }} />

      {!isAuthenticated ? (
        <p className="py-6 text-center text-sm text-slate-500">Đăng nhập để xem hoạt động gần đây.</p>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-sm text-red-600">Không tải được hoạt động.</p>
      ) : !data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Chưa có hoạt động nào.</p>
      ) : (
        <ul className="flex flex-col">
          {data.map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </ul>
      )}

      <Link
        to="/profile"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-100 bg-brand-50 h-9 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
      >
        Xem tất cả hoạt động
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand-600">
            <Headphones className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">Cần hỗ trợ?</p>
            <p className="text-sm text-slate-500">Liên hệ thủ thư trong giờ hành chính.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
