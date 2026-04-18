import { useMutation } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Divider, List, Space, Typography } from 'antd';
import { useState } from 'react';

import { BarcodeInput } from '../../components/BarcodeInput';
import { StatusBadge } from '../../components/StatusBadge';
import { loanApi } from '../../services/loan.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { LoanDetail } from '../../types/models';
import { extractErrorMessage, formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function ReturnPage() {
  const [barcode, setBarcode] = useState('');
  const [result, setResult] = useState<LoanDetail | null>(null);
  const notify = useNotificationsStore((state) => state.push);

  const returnMutation = useMutation({
    mutationFn: (submittedBarcode: string) => loanApi.returnByBarcode(submittedBarcode),
    onSuccess: (loan) => {
      setResult(loan);
      setBarcode('');
      notify({
        level: 'success',
        message: 'Trả sách thành công',
        description: `${loan.book.title} đã được ghi nhận trả thành công.`,
      });
    },
  });

  const unpaidTotal = (result?.fines ?? []).filter((fine) => fine.status === 'UNPAID').reduce((sum, fine) => sum + fine.amount, 0);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Trả sách
        </Typography.Title>
        <Typography.Text type="secondary">
          Quét mã vạch bản sao để xử lý trả sách. Kết quả phiếu mượn và tiền phạt sẽ hiển thị ngay sau khi xác nhận.
        </Typography.Text>
      </div>

      <Alert
        type="info"
        showIcon
        message="Lưu ý về luồng trả sách"
        description="API backend hiện xử lý trả sách trực tiếp từ mã vạch, nên thông tin phiếu mượn chỉ hiển thị sau khi xác nhận trả."
      />

      <Card>
        <BarcodeInput
          label="Mã vạch bản sao"
          placeholder="Nhập hoặc quét mã vạch"
          buttonLabel="Xử lý trả"
          value={barcode}
          onChange={setBarcode}
          loading={returnMutation.isPending}
          onSubmit={(value) => returnMutation.mutate(value)}
        />

        {returnMutation.isError ? (
          <Alert
            type="error"
            showIcon
            style={{ marginTop: 16 }}
            message={extractErrorMessage(returnMutation.error, 'Trả sách thất bại')}
          />
        ) : null}
      </Card>

      <Card title="Phiếu mượn đã xử lý">
        {result ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Thành viên">{result.member.fullName}</Descriptions.Item>
              <Descriptions.Item label="Sách">{result.book.title}</Descriptions.Item>
              <Descriptions.Item label="Mã vạch">{result.copy.barcode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusBadge status={result.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Ngày mượn">{formatDateTime(result.checkoutDate)}</Descriptions.Item>
              <Descriptions.Item label="Hạn trả">{formatDate(result.dueDate)}</Descriptions.Item>
              <Descriptions.Item label="Ngày trả">{formatDateTime(result.returnDate)}</Descriptions.Item>
              <Descriptions.Item label="Phạt chưa thanh toán">{formatCurrency(unpaidTotal, '0')}</Descriptions.Item>
            </Descriptions>
            <Divider style={{ marginBlock: 8 }} />
            <Typography.Text strong>Chi tiết tiền phạt</Typography.Text>
            {result.fines.length ? (
              <List
                size="small"
                dataSource={result.fines}
                renderItem={(fine) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${formatDate(fine.overdueDate)} - ${formatCurrency(fine.amount)}`}
                      description={fine.note ?? 'Không có ghi chú'}
                    />
                    <StatusBadge status={fine.status} />
                  </List.Item>
                )}
              />
            ) : (
              <Typography.Text type="secondary">Không phát sinh khoản phạt nào cho lần trả này.</Typography.Text>
            )}
          </Space>
        ) : (
          <Typography.Text type="secondary">Chưa có giao dịch trả nào trong phiên này.</Typography.Text>
        )}
      </Card>
    </Space>
  );
}
