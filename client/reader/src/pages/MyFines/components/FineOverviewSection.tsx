import { AlertTriangle, CheckCircle2, HelpCircle, ShieldCheck } from 'lucide-react';

import { StaggerContainer } from '../../../components/motion/ReaderMotion';
import { ReaderSummaryCard } from '../../../components/reader/ReaderSummaryCard';
import { formatAmount } from '../fineView';

function FineSummaryHeader({ onOpenGuide }: { onOpenGuide: () => void }) {
  return (
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)] md:flex-row md:items-center">
      <div>
        <h1 className="m-0 font-display text-[2rem] font-black leading-tight tracking-tight text-slate-950">Tiền phạt của tôi</h1>
        <p className="m-0 mt-2 text-[1.02rem] font-medium text-slate-500">Quản lý các khoản phạt, bồi thường và miễn giảm của bạn tại LIBERO.</p>
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        type="button"
        onClick={onOpenGuide}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
        Chính sách phạt
      </button>
    </section>
  );
}

function BlockedNotice() {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-[0_12px_28px_rgba(239,68,68,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-red-600">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="m-0 text-base font-black text-red-700">Tài khoản của bạn đang bị khóa do còn khoản phạt chưa xử lý.</h2>
          <p className="m-0 mt-2 max-w-3xl text-sm font-semibold leading-6 text-red-700/80">
            Vui lòng liên hệ thủ thư để thanh toán hoặc đối soát khoản phạt. Reader hiện chỉ hiển thị dữ liệu tiền phạt, xác nhận thanh toán được thực hiện ở backoffice.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FineOverviewSection({
  showBlockedWarning,
  unpaidTotal,
  unpaidCount,
  paidTotal,
  paidCount,
  waivedTotal,
  waivedCount,
  onOpenGuide,
}: {
  showBlockedWarning: boolean;
  unpaidTotal: number;
  unpaidCount: number;
  paidTotal: number;
  paidCount: number;
  waivedTotal: number;
  waivedCount: number;
  onOpenGuide: () => void;
}) {
  return (
    <>
      <FineSummaryHeader onOpenGuide={onOpenGuide} />

      {showBlockedWarning ? <BlockedNotice /> : null}

      <StaggerContainer className="grid gap-5 lg:grid-cols-3">
        <ReaderSummaryCard
          icon={AlertTriangle}
          title="Chưa thanh toán"
          value={formatAmount(unpaidTotal)}
          description={`${unpaidCount} khoản cần xử lý`}
          tone="red"
          valueSize="compact"
        />
        <ReaderSummaryCard
          icon={CheckCircle2}
          title="Đã thanh toán"
          value={formatAmount(paidTotal)}
          description={`${paidCount} khoản đã xác nhận`}
          tone="emerald"
          valueSize="compact"
        />
        <ReaderSummaryCard
          icon={ShieldCheck}
          title="Đã miễn giảm"
          value={formatAmount(waivedTotal)}
          description={`${waivedCount} khoản đã lưu lịch sử`}
          tone="blue"
          valueSize="compact"
        />
      </StaggerContainer>
    </>
  );
}
