import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';

import { useNotificationsStore, type NotificationLevel } from '../store/notifications.store';

const levelConfig: Record<NotificationLevel, { border: string; icon: string; Icon: LucideIcon }> = {
  success: { border: 'border-l-emerald-600', icon: 'text-emerald-600 bg-emerald-50', Icon: CheckCircle2 },
  info: { border: 'border-l-brand-600', icon: 'text-brand-600 bg-brand-50', Icon: Info },
  warning: { border: 'border-l-amber-600', icon: 'text-amber-600 bg-amber-50', Icon: AlertCircle },
  error: { border: 'border-l-red-600', icon: 'text-red-600 bg-red-50', Icon: AlertCircle },
};

export default function Toast() {
  const entries = useNotificationsStore((state) => state.entries);
  const consume = useNotificationsStore((state) => state.consume);

  useEffect(() => {
    const timers = entries.map((entry) => window.setTimeout(() => consume(entry.id), 4000));

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [consume, entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-5 top-5 z-50 flex w-[min(380px,calc(100vw-32px))] flex-col gap-3" role="status" aria-live="polite">
      {entries.map((entry) => {
        const config = levelConfig[entry.level];
        const Icon = config.Icon;

        return (
          <div
            className={`animate-[toast-in_220ms_cubic-bezier(0.16,1,0.3,1)] rounded-2xl border border-l-[5px] border-stone-200 bg-white/95 p-4 shadow-[0_22px_56px_-28px_rgba(28,25,23,0.5)] backdrop-blur ${config.border}`}
            key={entry.id}
          >
            <div className="flex items-start gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${config.icon}`}>
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="mb-1 block text-sm font-black tracking-tight text-stone-950">{entry.message}</strong>
                {entry.description ? <p className="m-0 text-sm leading-6 text-stone-500">{entry.description}</p> : null}
              </div>
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-0 bg-transparent text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
                type="button"
                onClick={() => consume(entry.id)}
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
