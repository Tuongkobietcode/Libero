import { useQuery } from '@tanstack/react-query';
import { Alert, Card, DatePicker, Empty, InputNumber, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

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
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Sách mượn nhiều
        </Typography.Title>
        <Typography.Text type="secondary">Xem các đầu sách được mượn nhiều nhất trong khoảng thời gian đã chọn.</Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <DatePicker.RangePicker value={range as [dayjs.Dayjs, dayjs.Dayjs] | null} onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
          <InputNumber min={1} max={100} value={limit} onChange={(value) => setLimit(value ?? 10)} addonBefore="Số lượng" />
        </Space>
      </Card>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <Card>
        {query.data?.length ? (
          <Table
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
      </Card>
    </Space>
  );
}
