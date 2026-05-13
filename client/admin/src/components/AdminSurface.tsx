import type { ReactNode } from 'react';

export const primaryButtonClass =
  'inline-flex h-11 items-center gap-2 rounded-xl bg-[#4f46e5] px-5 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(79,70,229,0.24)] transition hover:-translate-y-0.5 hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-50';

export const primaryActionButtonClass =
  'inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:!text-[#0958d9] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 [&_.anticon]:!text-current [&_svg]:!text-current';

export const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-[#3157ff] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

export const dangerButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-sm font-extrabold text-red-600 transition hover:bg-red-100 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';

export function AdminStack({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.04)] ${className}`}>
      {title || description || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title ? <h2 className="m-0 text-lg font-extrabold text-slate-950">{title}</h2> : null}
            {description ? <p className="m-0 mt-1 text-sm font-semibold text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AdminEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <div>
        <p className="m-0 text-sm font-extrabold text-slate-700">{title}</p>
        {description ? <p className="m-0 mt-2 max-w-md text-sm font-semibold text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
