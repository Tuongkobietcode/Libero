import { useMutation } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Input, Space, Typography } from 'antd';
import { useState } from 'react';

import { BarcodeInput } from '../../components/BarcodeInput';
import { StatusBadge } from '../../components/StatusBadge';
import { memberApi } from '../../services/member.api';
import { loanApi } from '../../services/loan.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { MemberStatus, type LoanDetail, type MemberView } from '../../types/models';
import { getRoleLabel } from '../../utils/display';
import { extractErrorMessage, formatDate, formatDateTime } from '../../utils/format';

function canCheckout(member: MemberView | null): boolean {
  return Boolean(member && !member.isBlocked && member.status === MemberStatus.Active);
}

export default function CheckoutPage() {
  const [memberCardNo, setMemberCardNo] = useState('');
  const [barcode, setBarcode] = useState('');
  const [member, setMember] = useState<MemberView | null>(null);
  const [result, setResult] = useState<LoanDetail | null>(null);
  const notify = useNotificationsStore((state) => state.push);

  const memberLookupMutation = useMutation({
    mutationFn: async (cardNo: string) => {
      const response = await memberApi.listMembers({ memberCardNo: cardNo, limit: 1, page: 1 });
      return response.items[0] ?? null;
    },
    onSuccess: (selectedMember) => {
      setMember(selectedMember);

      if (!selectedMember) {
        notify({
          level: 'warning',
          message: 'Không tìm thấy thành viên',
          description: 'Không có thành viên nào khớp với mã thẻ vừa quét.',
        });
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (submittedBarcode: string) => {
      if (!member) {
        throw new Error('Vui lòng chọn thành viên hợp lệ trước khi lập phiếu mượn.');
      }

      return loanApi.checkout({
        memberId: member._id,
        barcode: submittedBarcode,
      });
    },
    onSuccess: (loan) => {
      setResult(loan);
      setBarcode('');
      notify({
        level: 'success',
        message: 'Mượn sách thành công',
        description: `${loan.book.title} đã được ghi nhận cho ${loan.member.fullName}.`,
      });
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Mượn sách
        </Typography.Title>
        <Typography.Text type="secondary">
          Quét hoặc nhập mã thẻ thành viên, sau đó quét mã vạch bản sao để tạo phiếu mượn.
        </Typography.Text>
      </div>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Input.Search
            allowClear
            placeholder="Nhập hoặc quét mã thẻ thành viên"
            enterButton="Tìm thành viên"
            value={memberCardNo}
            onChange={(event) => setMemberCardNo(event.target.value)}
            onSearch={(value) => memberLookupMutation.mutate(value.trim())}
            loading={memberLookupMutation.isPending}
          />

          {member ? (
            <Descriptions bordered column={2} title="Thành viên đã chọn">
              <Descriptions.Item label="Họ tên">{member.fullName}</Descriptions.Item>
              <Descriptions.Item label="Mã thẻ">{member.memberCardNo}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{getRoleLabel(member.role)}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusBadge status={member.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Bị khóa">{member.isBlocked ? 'Có' : 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Email">{member.email}</Descriptions.Item>
            </Descriptions>
          ) : null}

          {member && !canCheckout(member) ? (
            <Alert
              type="warning"
              showIcon
              message="Không thể mượn cho thành viên này"
              description="Thành viên phải ở trạng thái hoạt động và không bị khóa trước khi tạo phiếu mượn mới."
            />
          ) : null}

          <BarcodeInput
            label="Mã vạch bản sao"
            placeholder="Nhập hoặc quét mã vạch"
            buttonLabel="Xác nhận mượn"
            value={barcode}
            onChange={setBarcode}
            disabled={!canCheckout(member)}
            loading={checkoutMutation.isPending}
            onSubmit={(value) => {
              setBarcode(value);
              checkoutMutation.mutate(value);
            }}
          />

          {checkoutMutation.isError ? (
            <Alert type="error" showIcon message={extractErrorMessage(checkoutMutation.error, 'Mượn sách thất bại')} />
          ) : null}
        </Space>
      </Card>

      <Card title="Kết quả mượn gần nhất">
        {result ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Thành viên">{result.member.fullName}</Descriptions.Item>
            <Descriptions.Item label="Sách">{result.book.title}</Descriptions.Item>
            <Descriptions.Item label="Mã vạch">{result.copy.barcode}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <StatusBadge status={result.status} />
            </Descriptions.Item>
            <Descriptions.Item label="Ngày mượn">{formatDateTime(result.checkoutDate)}</Descriptions.Item>
            <Descriptions.Item label="Hạn trả">{formatDate(result.dueDate)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Typography.Text type="secondary">Chưa có giao dịch mượn nào trong phiên này.</Typography.Text>
        )}
      </Card>
    </Space>
  );
}
