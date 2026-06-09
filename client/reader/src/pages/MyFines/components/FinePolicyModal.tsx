import { ReaderPolicyModal } from '../../../components/reader/ReaderPolicyModal';

const COMPACT_STAT_VALUE = 'text-lg font-black';

export function FinePolicyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <ReaderPolicyModal
      open={open}
      onClose={onClose}
      titleId="fine-policy-title"
      title="Chính sách tiền phạt"
      description="Áp dụng theo cấu hình nghiệp vụ hiện tại của LIBERO."
      stats={[
        { label: 'Phát sinh', value: 'Quá hạn / mất sách', valueClassName: COMPACT_STAT_VALUE },
        { label: 'Xác nhận', value: 'Thủ thư xử lý', valueClassName: COMPACT_STAT_VALUE },
        { label: 'Trạng thái', value: 'Chưa / đã thanh toán', valueClassName: COMPACT_STAT_VALUE },
      ]}
      contentTitle="Quy trình"
      items={[
        'Tiền phạt được ghi nhận khi khoản mượn quá hạn, mất sách hoặc phát sinh bồi thường theo nghiệp vụ.',
        'Khoản chưa thanh toán có thể ảnh hưởng đến quyền mượn tiếp theo và trạng thái tài khoản.',
        'Thanh toán hoặc miễn giảm hiện do thủ thư/quản trị viên xác nhận tại quầy ở thư viện.',
        'Sau khi xử lý, khoản phạt chuyển sang Đã thanh toán hoặc Đã miễn giảm và được lưu trong lịch sử.',
      ]}
      noticeTitle="Khi tài khoản bị khóa"
      notice="Vui lòng liên hệ thủ thư để kiểm tra các khoản chưa thanh toán. Sau khi khoản phạt được xử lý, trạng thái tài khoản sẽ được cập nhật theo chính sách hiện hành."
      noticeTone="red"
    />
  );
}
