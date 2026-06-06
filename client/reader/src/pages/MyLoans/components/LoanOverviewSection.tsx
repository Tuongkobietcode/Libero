import { AlertTriangle, BookOpen, Calendar, HelpCircle } from 'lucide-react';

import { StaggerContainer } from '../../../components/motion/ReaderMotion';
import { ReaderSummaryCard } from '../../../components/reader/ReaderSummaryCard';

function LoanSummaryHeader({ onOpenGuide }: { onOpenGuide: () => void }) {
  return (
    <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)] md:flex-row md:items-center">
      <div>
        <h1 className="m-0 font-display text-[2rem] font-black leading-tight tracking-tight text-slate-950">Khoản mượn của tôi</h1>
        <p className="m-0 mt-2 text-[1.02rem] font-medium text-slate-500">Quản lý các cuốn sách bạn đang mượn và lịch sử mượn.</p>
      </div>

      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        type="button"
        onClick={onOpenGuide}
      >
        <HelpCircle className="h-5 w-5" aria-hidden="true" />
        Hướng dẫn mượn và gia hạn
      </button>
    </section>
  );
}

export function LoanOverviewSection({
  activeCount,
  dueSoonCount,
  overdueCount,
  onOpenGuide,
}: {
  activeCount: number;
  dueSoonCount: number;
  overdueCount: number;
  onOpenGuide: () => void;
}) {
  return (
    <>
      <LoanSummaryHeader onOpenGuide={onOpenGuide} />

      <StaggerContainer className="grid gap-5 lg:grid-cols-3">
        <ReaderSummaryCard icon={BookOpen} title="Tổng số đang mượn" value={String(activeCount)} description={`${activeCount} cuốn sách`} tone="blue" />
        <ReaderSummaryCard icon={Calendar} title="Sắp đến hạn" value={String(dueSoonCount)} description="Trong 3 ngày tới" tone="amber" />
        <ReaderSummaryCard icon={AlertTriangle} title="Quá hạn" value={String(overdueCount)} description="Vui lòng trả sách sớm" tone="red" />
      </StaggerContainer>
    </>
  );
}
