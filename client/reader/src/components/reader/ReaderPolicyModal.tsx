import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ReaderPolicyModalStat = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

type ReaderPolicyModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description: string;
  stats: ReaderPolicyModalStat[];
  contentTitle: string;
  items: string[];
  itemsVariant?: 'ordered' | 'plain';
  noticeTitle: string;
  notice: ReactNode;
  noticeTone?: 'amber' | 'red';
  closeLabel?: string;
};

const NOTICE_CLASS = {
  amber: {
    box: 'border-amber-100 bg-amber-50 text-amber-800',
    title: 'text-amber-800',
  },
  red: {
    box: 'border-red-100 bg-red-50 text-red-700',
    title: 'text-red-700',
  },
} as const;

export function ReaderPolicyModal({
  open,
  onClose,
  titleId,
  title,
  description,
  stats,
  contentTitle,
  items,
  itemsVariant = 'ordered',
  noticeTitle,
  notice,
  noticeTone = 'amber',
  closeLabel = 'Đóng hướng dẫn',
}: ReaderPolicyModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const noticeClass = NOTICE_CLASS[noticeTone];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label={closeLabel} onClick={onClose} />

      <section className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_34px_90px_-34px_rgba(2,8,23,0.75)]">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 id={titleId} className="m-0 font-display text-xl font-black tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="m-0 mt-1 text-sm font-medium text-slate-500">{description}</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={stat.label}>
                <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">{stat.label}</p>
                <strong className={`mt-2 block text-slate-950 ${stat.valueClassName ?? 'font-mono text-2xl'}`}>
                  {stat.value}
                </strong>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="m-0 text-sm font-black uppercase tracking-[0.08em] text-slate-500">{contentTitle}</h3>
            {itemsVariant === 'ordered' ? (
              <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {items.map((item, index) => (
                  <li className="flex gap-3" key={item}>
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 font-mono text-xs font-black text-brand-700">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={`rounded-xl border p-4 text-sm leading-6 ${noticeClass.box}`}>
            <strong className={`block text-sm font-black ${noticeClass.title}`}>{noticeTitle}</strong>
            {notice}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
