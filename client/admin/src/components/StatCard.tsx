import { Card, Skeleton, Statistic, Typography } from 'antd';
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
    <Card>
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
    </Card>
  );
}
