import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/format';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const fromPath = (location.state as LocationState | null)?.from?.pathname ?? '/';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    try {
      await login({ email, password });
      navigate(fromPath, { replace: true });
    } catch (error) {
      setFeedback(extractErrorMessage(error, 'Khong the dang nhap vao khu vuc ban doc.'));
    }
  }

  return (
    <div className="page-stack">
      <section className="auth-layout">
        <article className="hero">
          <div className="page-stack">
            <div className="page-header">
              <h1>Dang nhap khu vuc ban doc</h1>
              <p className="page-description">
                Sau khi dang nhap, ban co the xem sach dang muon, dat cho khi het sach va theo doi tien phat cua minh.
              </p>
            </div>
            <div className="notice">
              Tai khoan reader hop le bao gom sinh vien va giang vien. Neu tai khoan moi dang o trang thai cho duyet, hay doi thu vien kich hoat.
            </div>
          </div>
        </article>

        <article className="auth-panel">
          <h2>Nhap thong tin tai khoan</h2>
          <p className="page-description">Dang nhap bang email da dang ky voi thu vien.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="reader-email">Email</label>
              <input id="reader-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label htmlFor="reader-password">Mat khau</label>
              <input
                id="reader-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhap mat khau"
              />
            </div>
            {feedback ? <div className="error-banner">{feedback}</div> : null}
            <button className="button" type="submit" disabled={loginState.isPending}>
              {loginState.isPending ? 'Dang dang nhap...' : 'Dang nhap'}
            </button>
          </form>

          <p className="text-muted" style={{ marginTop: 16 }}>
            Chua co tai khoan? <Link className="inline-link" to="/register">Dang ky ngay</Link>
          </p>
        </article>
      </section>
    </div>
  );
}
