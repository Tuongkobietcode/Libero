import { useQuery } from '@tanstack/react-query';
import { Alert, DatePicker, Empty, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { AdminPanel, AdminStack, AdminToolbar } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
import { reportApi } from '../../services/report.api';

export default function PopularBooksPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [limit, setLimit] = useState(10);

  const query = useQuery({
    queryKey: ['reports', 'popular-books', limit, range?.[0]?.toISOString(), range?.[1]?.toISOString()],
    queryFn: () =>
      reportApi.getPopularBooks({
        limit,
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      }),
  });

  return (
    <AdminStack>
      <AdminToolbar>
        <DatePicker.RangePicker
          value={range as [dayjs.Dayjs, dayjs.Dayjs] | null}
          onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
        />
        <InputNumber
          min={1}
          max={100}
          value={limit}
          onChange={(value) => setLimit(value ?? 10)}
          addonBefore="Số lượng"
        />
      </AdminToolbar>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <AdminPanel title="Sách mượn nhiều" description="Các đầu sách được mượn nhiều nhất trong khoảng thời gian đã chọn.">
        {query.data?.length ? (
          <DataTable
            rowKey={(record) => record.book._id}
            loading={query.isLoading}
            pagination={false}
            dataSource={query.data}
            columns={[
              { title: 'Sách', dataIndex: ['book', 'title'] },
              { title: 'ISBN', dataIndex: ['book', 'isbn'] },
              { title: 'Số lượt mượn', dataIndex: 'checkoutCount' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu sách mượn nhiều trong khoảng thời gian đã chọn." />
        )}
      </AdminPanel>
    </AdminStack>
  );
}
