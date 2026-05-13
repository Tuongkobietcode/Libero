import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, DatePicker, Empty } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { AdminPanel, AdminStack, AdminToolbar, secondaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { reportApi } from '../../services/report.api';
import { getStatusLabel } from '../../utils/display';
import { downloadBlob, formatCurrency } from '../../utils/format';

export default function FineStatsPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const query = useQuery({
    queryKey: ['reports', 'fine-stats', range?.[0]?.toISOString(), range?.[1]?.toISOString()],
    queryFn: () =>
      reportApi.getFineSummary({
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      }),
  });

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    const file = await reportApi.exportReport({
      type: 'fines',
      format,
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
    });
    downloadBlob(file.blob, file.fileName);
  };

  return (
    <AdminStack>
      <AdminToolbar>
        <DatePicker.RangePicker
          value={range as [dayjs.Dayjs, dayjs.Dayjs] | null}
          onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
        />
        <button className={secondaryButtonClass} onClick={() => void handleExport('xlsx')} type="button">
          <DownloadOutlined />
          Xuất XLSX
        </button>
        <button className={secondaryButtonClass} onClick={() => void handleExport('pdf')} type="button">
          Xuất PDF
        </button>
      </AdminToolbar>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <div className="grid gap-5 md:grid-cols-3">
        {(query.data?.summary ?? []).map((item) => (
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]"
            key={item.status}
          >
            <p className="m-0 text-sm font-extrabold text-slate-500">{getStatusLabel(item.status)}</p>
            <p className="m-0 mt-3 text-3xl font-black text-slate-950">{formatCurrency(item.totalAmount)}</p>
            <p className="m-0 mt-2 text-sm font-semibold text-slate-500">{item.count} bản ghi</p>
          </section>
        ))}
      </div>

      <AdminPanel title="Xu hướng" description="Tổng tiền phạt và số bản ghi theo kỳ.">
        {query.data?.trend.length ? (
          <DataTable
            rowKey="period"
            pagination={false}
            dataSource={query.data.trend}
            columns={[
              { title: 'Kỳ', dataIndex: 'period' },
              { title: 'Tổng số tiền', render: (_, record) => formatCurrency(record.totalAmount) },
              { title: 'Số bản ghi', dataIndex: 'count' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu xu hướng." />
        )}
      </AdminPanel>

      <AdminPanel title="Công nợ thành viên" description="Các độc giả còn khoản phạt chưa thanh toán.">
        {query.data?.memberDebts.length ? (
          <DataTable
            rowKey={(record) => record.member._id}
            pagination={false}
            dataSource={query.data.memberDebts}
            columns={[
              { title: 'Thành viên', dataIndex: ['member', 'fullName'] },
              { title: 'Trạng thái tài khoản', render: (_, record) => <StatusBadge status={record.member.status} /> },
              { title: 'Tổng chưa thanh toán', render: (_, record) => formatCurrency(record.unpaidTotal) },
              { title: 'Số khoản phạt', dataIndex: 'fineCount' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu công nợ thành viên." />
        )}
      </AdminPanel>
    </AdminStack>
  );
}
