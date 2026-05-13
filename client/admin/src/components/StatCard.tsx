import { Skeleton, Statistic, Typography } from 'antd';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: ReactNode;
  suffix?: ReactNode;
  description?: string;
  loading?: boolean;
}

export function StatCard({ title, value, suffix, description, loading }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <>
          <Statistic title={title} value={value as string | number} suffix={suffix} />
          {description ? (
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {description}
            </Typography.Paragraph>
          ) : null}
        </>
      )}
    </section>
  );
}
