import { useMutation } from '@tanstack/react-query';
import { Alert, Descriptions, Divider, Empty, List } from 'antd';
import { useState } from 'react';

import { AdminPanel, AdminStack } from '../../components/AdminSurface';
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
    <AdminStack>
      <Alert
        type="info"
        showIcon
        message="Quét barcode để xử lý trả sách"
        description="Thông tin khoản mượn và tiền phạt sẽ hiển thị ngay sau khi hệ thống ghi nhận trả sách."
      />

      <AdminPanel title="Barcode bản sao">
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
            className="mt-4"
            message={extractErrorMessage(returnMutation.error, 'Trả sách thất bại')}
          />
        ) : null}
      </AdminPanel>

      <AdminPanel title="Phiếu mượn đã xử lý">
        {result ? (
          <div className="space-y-4">
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
            <Divider className="!my-2" />
            <p className="m-0 text-sm font-extrabold text-slate-800">Chi tiết tiền phạt</p>
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
              <p className="m-0 text-sm font-semibold text-slate-500">Không phát sinh khoản phạt nào cho lần trả này.</p>
            )}
          </div>
        ) : (
          <Empty description="Chưa có giao dịch trả nào trong phiên này." />
        )}
      </AdminPanel>
    </AdminStack>
  );
}
