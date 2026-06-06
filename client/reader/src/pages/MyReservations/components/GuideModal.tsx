import { ReaderPolicyModal } from '../../../components/reader/ReaderPolicyModal';
import type { AdvanceTab } from '../reservationView';

export function GuideModal({
  type,
  onClose,
}: {
  type: AdvanceTab | null;
  onClose: () => void;
}) {
  if (!type) {
    return null;
  }

  const isHold = type === 'holds';
  const title = isHold ? 'Chính sách đặt giữ' : 'Chính sách đặt chỗ';
  const description = isHold
    ? 'Áp dụng cho đầu sách đang còn bản sao có sẵn tại thư viện.'
    : 'Áp dụng cho đầu sách đã hết bản sao có sẵn và cần xếp hàng chờ.';
  const stats = isHold
    ? [
        { label: 'Thời hạn giữ', value: '24 giờ' },
        { label: 'Giới hạn', value: '3 sách' },
        { label: 'Xử lý', value: 'Admin xác nhận' },
      ]
    : [
        { label: 'Thứ tự', value: 'Theo hàng chờ' },
        { label: 'Khi đến lượt', value: 'Có thông báo' },
        { label: 'Thời hạn nhận', value: '24 giờ' },
      ];
  const steps = isHold
    ? [
        'Khi sách còn bản sẵn có, bạn có thể đặt giữ trực tiếp từ trang chi tiết sách.',
        'Hệ thống tạm giữ một bản sao cụ thể và chuyển trạng thái yêu cầu sang Đang chờ lấy.',
        'Bạn cần đến thư viện trong 24 giờ. Nếu quá hạn hoặc hủy, bản sao được trả lại vào kho hoặc chuyển cho hàng chờ đặt chỗ.',
        'Khi bạn đến nhận sách, thủ thư xác nhận để tạo khoản mượn và yêu cầu đặt giữ chuyển sang Đã nhận.',
      ]
    : [
        'Khi sách đã hết bản sẵn có, bạn có thể đặt chỗ để vào hàng chờ.',
        'Vị trí hàng chờ được cập nhật theo dữ liệu đặt chỗ thật của hệ thống.',
        'Khi có bản sao được trả hoặc được giải phóng, hệ thống thông báo người tiếp theo đến nhận sách.',
        'Nếu bạn không còn nhu cầu, có thể hủy yêu cầu đang chờ hoặc đã được thông báo.',
      ];

  return (
    <ReaderPolicyModal
      open={Boolean(type)}
      onClose={onClose}
      titleId="advance-guide-title"
      title={title}
      description={description}
      stats={stats}
      contentTitle="Quy trình"
      items={steps}
      noticeTitle="Lưu ý"
      notice={
        isHold
          ? 'Đặt giữ chỉ áp dụng khi còn bản sao có sẵn. Nếu sách đã hết bản, hệ thống sẽ chuyển sang nghiệp vụ đặt chỗ hàng chờ.'
          : 'Đặt chỗ không trừ ngay bản sao trong kho. Bạn chỉ cần đến thư viện khi nhận được thông báo sách đã đến lượt.'
      }
      noticeTone="amber"
    />
  );
}
