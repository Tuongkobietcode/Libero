import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/format';

export default function RegisterPage() {
  const { register, registerState } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    try {
      await register({
        fullName,
        email,
        studentId: studentId.trim() || undefined,
        password,
      });
      setRegistered(true);
      setFeedback('Dang ky thanh cong. Tai khoan cua ban dang o trang thai cho duyet va can thu vien kich hoat.');
    } catch (error) {
      setFeedback(extractErrorMessage(error, 'Khong the dang ky tai khoan moi.'));
    }
  }

  return (
    <div className="page-stack">
      <section className="auth-layout">
        <article className="hero">
          <div className="page-stack">
            <div className="page-header">
              <h1>Tao tai khoan ban doc</h1>
              <p className="page-description">
                Dang ky de nhan ma the thu vien, theo doi sach dang muon va dat cho cac dau sach khong con ban sao available.
              </p>
            </div>
            <div className="notice">
              Backend hien tai tao tai khoan reader voi trang thai pending approval. Sau khi duoc thu vien duyet, ban co the dang nhap va su dung day du chuc nang.
            </div>
          </div>
        </article>

        <article className="auth-panel">
          <h2>Thong tin dang ky</h2>
          <p className="page-description">Mat khau can toi thieu 8 ky tu, co chu in hoa va so.</p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="register-name">Ho va ten</label>
              <input id="register-name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nguyen Van A" />
            </div>
            <div className="field">
              <label htmlFor="register-email">Email</label>
              <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label htmlFor="register-student-id">Ma sinh vien (neu co)</label>
              <input id="register-student-id" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="SV20260001" />
            </div>
            <div className="field">
              <label htmlFor="register-password">Mat khau</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="ToiThieu8KyTu1"
              />
            </div>
            {feedback ? <div className={registered ? 'success-banner' : 'error-banner'}>{feedback}</div> : null}
            <button className="button" type="submit" disabled={registerState.isPending || registered}>
              {registerState.isPending ? 'Dang gui dang ky...' : registered ? 'Da dang ky' : 'Dang ky'}
            </button>
          </form>

          <p className="text-muted" style={{ marginTop: 16 }}>
            Da co tai khoan? <Link className="inline-link" to="/login">Dang nhap tai day</Link>
          </p>
        </article>
      </section>
    </div>
  );
}
