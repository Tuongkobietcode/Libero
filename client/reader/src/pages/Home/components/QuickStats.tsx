import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Bookmark, DollarSign, type LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '../../../components/ui/Card';
import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { cn } from '../../../utils/cn';
import { memberApi } from '../../../services/member.api';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuth } from '../../../hooks/useAuth';

type Tone = 'success' | 'warning' | 'danger';

interface QuickStatProps {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  tone: Tone;
  to: string;
}

const TONE: Record<Tone, { icon: string; value: string; cta: string }> = {
  success: {
    icon: 'bg-emerald-50 text-emerald-600',
    value: 'text-emerald-600',
    cta: 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  warning: {
    icon: 'bg-amber-50 text-amber-600',
    value: 'text-amber-600',
    cta: 'border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  danger: {
    icon: 'bg-red-50 text-red-600',
    value: 'text-red-600',
    cta: 'border-red-100 bg-red-50 text-red-600 hover:bg-red-100',
  },
};

function QuickStat({ icon: Icon, title, value, description, tone, to }: QuickStatProps) {
  const t = TONE[tone];

  return (
    <Card padding="sm" className="flex min-h-[148px] flex-col justify-between rounded-2xl border-stone-200 bg-white/95 shadow-[0_18px_44px_-34px_rgba(28,25,23,0.38)]">
      <div className="flex items-center gap-4">
        <div className={cn('grid h-14 w-14 shrink-0 place-items-center rounded-2xl md:h-16 md:w-16', t.icon)}>
          <Icon className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-black tracking-tight text-stone-700">{title}</h3>
          <strong className={cn('block font-mono text-3xl font-black leading-tight tracking-tight md:text-4xl', t.value)}>{value}</strong>
          <p className="line-clamp-1 text-sm font-medium text-stone-500">{description}</p>
        </div>
      </div>
      <Link
        to={to}
        className={cn(
          'mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-colors active:scale-[0.98]',
          t.cta,
        )}
      >
        Xem chi tiết
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  );
}

export function QuickStats() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.myStats(),
    queryFn: () => memberApi.getMyStats(),
    enabled: isAuthenticated,
    meta: { errorMessage: 'Không tải được số liệu tài khoản.' },
  });

  const placeholder = isLoading || !data;
  const loanCount = data?.activeLoans ?? 0;
  const overdueCount = data?.overdueLoans ?? 0;
  const reservationCount = data?.activeReservations ?? 0;
  const fineAmount = data?.unpaidFineTotal ?? 0;
  const fineCount = data?.unpaidFineCount ?? 0;

  const loanDescription = placeholder
    ? 'Đang tải...'
    : overdueCount > 0
      ? `${overdueCount} sách quá hạn`
      : 'Trong hạn trả';
  const reservationDescription = placeholder
    ? 'Đang tải...'
    : reservationCount > 0
      ? 'Đang chờ nhận sách'
      : 'Không có lượt đặt chỗ';
  const fineDescription = placeholder
    ? 'Đang tải...'
    : fineCount > 0
      ? `${fineCount} khoản phạt cần thanh toán`
      : 'Bạn không có khoản phạt nào';

  return (
    <StaggerContainer className="grid gap-4 md:grid-cols-3">
      <StaggerItem>
      <QuickStat
        icon={BookOpen}
        title="Đang mượn"
        value={String(loanCount)}
        description={loanDescription}
        tone="success"
        to="/my-loans"
      />
      </StaggerItem>
      <StaggerItem>
      <QuickStat
        icon={Bookmark}
        title="Đặt chỗ"
        value={String(reservationCount)}
        description={reservationDescription}
        tone="warning"
        to="/my-reservations"
      />
      </StaggerItem>
      <StaggerItem>
      <QuickStat
        icon={DollarSign}
        title="Tiền phạt"
        value={fineAmount > 0 ? `${fineAmount.toLocaleString('vi-VN')}đ` : '0đ'}
        description={fineDescription}
        tone="danger"
        to="/my-fines"
      />
      </StaggerItem>
    </StaggerContainer>
  );
}
