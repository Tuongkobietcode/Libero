import { Bell, BookmarkCheck, Clock3, HelpCircle, History, Hourglass } from 'lucide-react';

import { StaggerContainer } from '../../../components/motion/ReaderMotion';
import { ReaderSummaryCard } from '../../../components/reader/ReaderSummaryCard';
import type { AdvanceTab } from '../reservationView';

function ReservationSummaryHeader({
  activeTab,
  onOpenGuide,
}: {
  activeTab: AdvanceTab;
  onOpenGuide: () => void;
}) {
  const isHoldTab = activeTab === 'holds';

  return (
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)] md:flex-row md:items-center">
      <div>
        <h1 className="m-0 font-display text-[2rem] font-black leading-tight tracking-tight text-slate-950">
          {isHoldTab ? 'Đặt giữ của tôi' : 'Đặt chỗ của tôi'}
        </h1>
        <p className="m-0 mt-2 text-[1.02rem] font-medium text-slate-500">
          {isHoldTab
            ? 'Quản lý các yêu cầu đặt giữ sách của bạn tại LIBERO.'
            : 'Quản lý các yêu cầu đặt chỗ sách của bạn tại LIBERO.'}
        </p>
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        type="button"
        onClick={onOpenGuide}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
        {isHoldTab ? 'Hướng dẫn đặt giữ' : 'Hướng dẫn đặt chỗ'}
      </button>
    </section>
  );
}

export function ReservationOverviewSection({
  activeTab,
  holdSummary,
  reservationSummary,
  onOpenGuide,
}: {
  activeTab: AdvanceTab;
  holdSummary: { active: number; expiring: number; history: number };
  reservationSummary: { waiting: number; notified: number; history: number };
  onOpenGuide: () => void;
}) {
  const isHoldTab = activeTab === 'holds';

  return (
    <>
      <ReservationSummaryHeader activeTab={activeTab} onOpenGuide={onOpenGuide} />

      {isHoldTab ? (
        <StaggerContainer className="grid gap-5 lg:grid-cols-3">
          <ReaderSummaryCard icon={BookmarkCheck} title="Đang đặt giữ" value={String(holdSummary.active)} description="Sách đang chờ bạn đến nhận" tone="blue" />
          <ReaderSummaryCard icon={Clock3} title="Sắp hết hạn" value={String(holdSummary.expiring)} description="Còn dưới 6 giờ giữ sách" tone="amber" />
          <ReaderSummaryCard icon={History} title="Lịch sử đặt giữ" value={String(holdSummary.history)} description="Đã nhận, hủy hoặc hết hạn" tone="slate" />
        </StaggerContainer>
      ) : (
        <StaggerContainer className="grid gap-5 lg:grid-cols-3">
          <ReaderSummaryCard icon={Hourglass} title="Đang chờ" value={String(reservationSummary.waiting)} description="Bạn đang xếp hàng chờ sách" tone="amber" />
          <ReaderSummaryCard icon={Bell} title="Đã thông báo" value={String(reservationSummary.notified)} description="Sách đang chờ bạn đến nhận" tone="emerald" />
          <ReaderSummaryCard icon={History} title="Lịch sử đặt chỗ" value={String(reservationSummary.history)} description="Đã hoàn tất, hủy hoặc hết hạn" tone="slate" />
        </StaggerContainer>
      )}
    </>
  );
}
