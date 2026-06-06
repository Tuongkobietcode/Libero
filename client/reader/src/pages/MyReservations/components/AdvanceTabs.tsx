import { BookmarkCheck, Hourglass, type LucideIcon } from 'lucide-react';

import type { AdvanceTab } from '../reservationView';

export function AdvanceTabs({
  activeTab,
  onChange,
}: {
  activeTab: AdvanceTab;
  onChange: (tab: AdvanceTab) => void;
}) {
  const tabs: Array<{ id: AdvanceTab; label: string; icon: LucideIcon; description: string }> = [
    {
      id: 'holds',
      label: 'Đặt giữ',
      icon: BookmarkCheck,
      description: 'Giữ bản sách còn sẵn trong 24 giờ',
    },
    {
      id: 'reservations',
      label: 'Đặt chỗ',
      icon: Hourglass,
      description: 'Xếp hàng khi sách đã hết bản',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="grid gap-2 md:grid-cols-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`flex min-h-[78px] items-center gap-4 rounded-xl px-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${
                isActive
                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-pressed={isActive}
            >
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${isActive ? 'bg-white text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span>
                <strong className="block text-base font-black">{tab.label}</strong>
                <span className="mt-1 block text-sm font-medium">{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
