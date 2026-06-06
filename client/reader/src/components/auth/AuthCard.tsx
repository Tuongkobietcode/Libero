import { type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

import { cn } from '../../utils/cn';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: 'md' | 'lg';
}

export function AuthCard({ title, subtitle, children, footer, className, size = 'md' }: AuthCardProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full',
        size === 'md' ? 'max-w-[540px]' : 'max-w-[600px]',
        className,
      )}
    >
      <article className="rounded-2xl border border-slate-900/10 bg-white/95 px-6 py-9 shadow-[0_22px_54px_rgba(16,24,40,0.11),0_2px_8px_rgba(16,24,40,0.05)] backdrop-blur-sm sm:px-10 sm:py-10">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-600 text-white shadow-[0_14px_30px_-18px_rgba(2,132,199,0.72)]">
            <BookOpen className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <span className="text-3xl font-extrabold leading-none text-brand-600">LIBERO</span>
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-3xl font-extrabold leading-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>

        {children}

        {footer ? <div className="mt-6 text-center text-sm text-slate-500">{footer}</div> : null}
      </article>
    </section>
  );
}
