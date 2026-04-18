import { Tag } from 'antd';

import { getStatusLabel } from '../utils/display';

const statusColorMap: Record<string, string> = {
  ACTIVE: 'blue',
  OVERDUE: 'red',
  RETURNED: 'green',
  LOST: 'volcano',
  WAITING: 'gold',
  NOTIFIED: 'cyan',
  FULFILLED: 'green',
  CANCELLED: 'default',
  EXPIRED: 'magenta',
  UNPAID: 'red',
  PAID: 'green',
  WAIVED: 'purple',
  available: 'green',
  borrowed: 'blue',
  reserved: 'gold',
  damaged: 'orange',
  lost: 'volcano',
  active: 'green',
  suspended: 'volcano',
  expired: 'orange',
  pending: 'gold',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Tag color={statusColorMap[status] ?? 'default'}>{getStatusLabel(status)}</Tag>;
}
