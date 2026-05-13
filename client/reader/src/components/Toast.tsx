import { useEffect } from 'react';

import { useNotificationsStore, type NotificationLevel } from '../store/notifications.store';

const levelBorderClass: Record<NotificationLevel, string> = {
  success: 'border-l-emerald-500',
  info: 'border-l-blue-600',
  warning: 'border-l-amber-500',
  error: 'border-l-rose-600',
};

export default function Toast() {
  const entries = useNotificationsStore((state) => state.entries);
  const consume = useNotificationsStore((state) => state.consume);

  useEffect(() => {
    const timers = entries.map((entry) => window.setTimeout(() => consume(entry.id), 6000));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [consume, entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-3" role="status" aria-live="polite">
      {entries.map((entry) => (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border border-l-[5px] border-slate-200 bg-white p-3.5 shadow-[0_18px_42px_rgba(15,31,56,0.16)] ${levelBorderClass[entry.level]}`}
          key={entry.id}
        >
          <div>
            <strong className="mb-1 block font-bold text-slate-900">{entry.message}</strong>
            {entry.description ? <p className="m-0 text-sm text-slate-500">{entry.description}</p> : null}
          </div>
          <button
            className="rounded-md border-0 bg-transparent px-1 py-0.5 text-xl leading-none text-slate-500 transition-colors hover:text-slate-900"
            type="button"
            onClick={() => consume(entry.id)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
