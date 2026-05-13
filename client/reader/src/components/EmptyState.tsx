import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        {icon}
        <h2 className="m-0 text-lg font-extrabold text-slate-900">{title}</h2>
        {description ? <p className="m-0 max-w-md text-sm text-slate-500">{description}</p> : null}
        {action}
      </div>
    </div>
  );
}

export default EmptyState;
