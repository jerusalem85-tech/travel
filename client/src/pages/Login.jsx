import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="card border-0 shadow-lg" style={{ width: '420px', maxWidth: '92%', borderRadius: '16px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="mx-auto mb-3 d-flex align-items-center justify-content-center" style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
              <i className="bi bi-airplane-engines text-white" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <h4 className="fw-bold mb-1">نظام إدارة السفر</h4>
            <small className="text-secondary">سجّل دخولك للمتابعة</small>
          </div>
          {error && <div className="alert alert-danger py-2 text-center" style={{ borderRadius: '8px', fontSize: '0.85rem' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">البريد الإلكتروني</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                <input type="email" className="form-control" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label">كلمة المرور</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-lock"></i></span>
                <input type={showPassword ? 'text' : 'password'} className="form-control" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                  <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-bold" disabled={loading} style={{ borderRadius: '10px', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>
              {loading ? <><span className="spinner-border spinner-border-sm ms-2"></span> جاري تسجيل الدخول...</> : <><i className="bi bi-box-arrow-in-right me-2"></i>تسجيل الدخول</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
