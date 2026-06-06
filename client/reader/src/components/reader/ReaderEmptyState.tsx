import type { LucideIcon } from 'lucide-react';

export function ReaderEmptyState({
  icon: Icon,
  title,
  description,
  iconClassName = 'text-slate-400',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <Icon className={`mx-auto h-9 w-9 ${iconClassName}`} aria-hidden="true" />
      <h3 className="m-0 mt-3 text-lg font-black text-slate-900">{title}</h3>
      <p className="m-0 mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}
