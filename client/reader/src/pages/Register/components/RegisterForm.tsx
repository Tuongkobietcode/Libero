import { useState, type FormEvent, type JSX } from 'react';
import { CreditCard, Mail, Phone, User } from 'lucide-react';

import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/forms/Checkbox';
import { FormField } from '../../../components/forms/FormField';
import { PasswordField } from '../../../components/forms/PasswordField';
import { useAuth } from '../../../hooks/useAuth';
import { useNotificationsStore } from '../../../store/notifications.store';
import { extractErrorMessage } from '../../../utils/format';

type FieldName = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'studentId' | 'phone' | 'terms';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\+?84|0)[0-9\s.-]{8,14}$/;

interface RegisterFormProps {
  onRegistered: (message: string) => void;
}

export function RegisterForm({ onRegistered }: RegisterFormProps): JSX.Element {
  const { register, registerState } = useAuth();
  const notify = useNotificationsStore((state) => state.push);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [registered, setRegistered] = useState(false);

  const trimmedFullName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedStudentId = studentId.trim();
  const trimmedPhone = phone.trim();

  const fullNameRuleError = trimmedFullName.length < 2 ? 'Vui lòng nhập họ và tên.' : undefined;
  const emailRuleError = !trimmedEmail
    ? 'Vui lòng nhập email.'
    : !emailPattern.test(trimmedEmail)
      ? 'Email không hợp lệ.'
      : undefined;
  const passwordRuleError = !password
    ? 'Vui lòng tạo mật khẩu.'
    : password.length < 8
      ? 'Mật khẩu cần tối thiểu 8 ký tự.'
      : !/[A-Z]/.test(password) || !/[0-9]/.test(password)
        ? 'Mật khẩu cần có chữ in hoa và số.'
        : undefined;
  const confirmPasswordRuleError = !confirmPassword
    ? 'Vui lòng nhập lại mật khẩu.'
    : confirmPassword !== password
      ? 'Mật khẩu xác nhận không khớp.'
      : undefined;
  const studentIdRuleError = !trimmedStudentId ? 'Vui lòng nhập mã sinh viên.' : undefined;
  const phoneRuleError = !trimmedPhone
    ? 'Vui lòng nhập số điện thoại.'
    : !phonePattern.test(trimmedPhone)
      ? 'Số điện thoại không hợp lệ.'
      : undefined;
  const termsRuleError = !termsAccepted ? 'Bạn cần đồng ý với điều khoản trước khi đăng ký.' : undefined;

  const errors: Partial<Record<FieldName, string | undefined>> = {
    fullName: touched.fullName ? fullNameRuleError : undefined,
    email: touched.email ? emailRuleError : undefined,
    password: touched.password ? passwordRuleError : undefined,
    confirmPassword: touched.confirmPassword ? confirmPasswordRuleError : undefined,
    studentId: touched.studentId ? studentIdRuleError : undefined,
    phone: touched.phone ? phoneRuleError : undefined,
    terms: touched.terms ? termsRuleError : undefined,
  };

  const isFormValid = !(
    fullNameRuleError ||
    emailRuleError ||
    passwordRuleError ||
    confirmPasswordRuleError ||
    studentIdRuleError ||
    phoneRuleError ||
    termsRuleError
  );

  function markTouched(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
      studentId: true,
      phone: true,
      terms: true,
    });
    if (!isFormValid) return;

    try {
      await register({
        fullName: trimmedFullName,
        email: trimmedEmail,
        phone: trimmedPhone,
        studentId: trimmedStudentId,
        password,
      });
      setRegistered(true);
      onRegistered(
        'Đăng ký thành công. Bạn có thể đăng nhập và sử dụng thư viện ngay.',
      );
    } catch (error) {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể đăng ký tài khoản mới.'),
      });
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <FormField
        label="Họ và tên"
        name="fullName"
        autoComplete="name"
        placeholder="Nhập họ và tên của bạn"
        leftIcon={<User className="h-[18px] w-[18px]" aria-hidden />}
        value={fullName}
        error={errors.fullName}
        onBlur={() => markTouched('fullName')}
        onChange={(e) => setFullName(e.target.value)}
      />
      <FormField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Nhập email của bạn"
        leftIcon={<Mail className="h-[18px] w-[18px]" aria-hidden />}
        value={email}
        error={errors.email}
        onBlur={() => markTouched('email')}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordField
        label="Mật khẩu"
        name="password"
        autoComplete="new-password"
        placeholder="Tạo mật khẩu"
        value={password}
        error={errors.password}
        hint="Tối thiểu 8 ký tự, có chữ hoa và số."
        onBlur={() => markTouched('password')}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordField
        label="Xác nhận mật khẩu"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Nhập lại mật khẩu"
        value={confirmPassword}
        error={errors.confirmPassword}
        onBlur={() => markTouched('confirmPassword')}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <FormField
        label="Mã sinh viên"
        name="studentId"
        autoComplete="off"
        placeholder="Nhập mã sinh viên"
        leftIcon={<CreditCard className="h-[18px] w-[18px]" aria-hidden />}
        value={studentId}
        error={errors.studentId}
        onBlur={() => markTouched('studentId')}
        onChange={(e) => setStudentId(e.target.value)}
      />
      <FormField
        label="Số điện thoại"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="Nhập số điện thoại"
        leftIcon={<Phone className="h-[18px] w-[18px]" aria-hidden />}
        value={phone}
        error={errors.phone}
        onBlur={() => markTouched('phone')}
        onChange={(e) => setPhone(e.target.value)}
      />

      <Checkbox
        checked={termsAccepted}
        error={errors.terms}
        onBlur={() => markTouched('terms')}
        onChange={(e) => {
          setTermsAccepted(e.target.checked);
          markTouched('terms');
        }}
        label={
          <span>
            Tôi đồng ý với{' '}
            <a className="font-semibold text-brand-600 hover:underline" href="#terms">
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a className="font-semibold text-brand-600 hover:underline" href="#privacy">
              Chính sách bảo mật
            </a>{' '}
            của LIBERO.
          </span>
        }
      />

      <Button
        type="submit"
        fullWidth
        size="lg"
        isLoading={registerState.isPending}
        disabled={!isFormValid || registered}
      >
        {registerState.isPending ? 'Đang đăng ký...' : registered ? 'Đã đăng ký' : 'Đăng ký'}
      </Button>
    </form>
  );
}
