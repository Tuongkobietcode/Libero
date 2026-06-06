import { ReaderPolicyModal } from '../../../components/reader/ReaderPolicyModal';
import type { LoanListItem } from '../../../types/models';

export function PolicyGuideModal({
  open,
  onClose,
  sampleLoan,
}: {
  open: boolean;
  onClose: () => void;
  sampleLoan?: LoanListItem;
}) {
  return (
    <ReaderPolicyModal
      open={open}
      onClose={onClose}
      titleId="loan-policy-title"
      title="Chính sách mượn và gia hạn"
      description="Áp dụng theo chính sách đang lưu trên từng phiếu mượn."
      stats={[
        {
          label: 'Hạn mượn',
          value: sampleLoan ? `${sampleLoan.policyLoanDays} ngày` : 'Theo vai trò',
        },
        {
          label: 'Gia hạn tối đa',
          value: sampleLoan ? `${sampleLoan.policyMaxRenewals} lần` : 'Theo vai trò',
        },
        {
          label: 'Mỗi lần cộng',
          value: sampleLoan ? `${sampleLoan.policyRenewDays} ngày` : 'Theo vai trò',
        },
      ]}
      contentTitle="Điều kiện được gia hạn"
      items={[
        'Phiếu mượn phải đang ở trạng thái đang mượn, chưa quá hạn và chưa trả.',
        'Tài khoản độc giả phải còn hoạt động, không bị khóa hoặc tạm ngưng.',
        'Số lần gia hạn đã dùng phải nhỏ hơn giới hạn gia hạn của phiếu mượn.',
        'Khi gia hạn thành công, hạn trả mới được cộng thêm số ngày gia hạn theo chính sách của phiếu.',
      ]}
      itemsVariant="plain"
      noticeTitle="Khi không đủ điều kiện"
      notice={
        <>
          Sách quá hạn, sách đã trả, tài khoản bị khóa hoặc phiếu đã dùng hết lượt gia hạn sẽ không thể gia hạn thêm.
          Các khoản quá hạn và phạt được xử lý theo cấu hình nghiệp vụ hiện tại của hệ thống.
        </>
      }
      noticeTone="red"
    />
  );
}
