import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ManagerLoginPage() {
  const { user, ready, controlledLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('manager@hotel.com');
  const [password, setPassword] = useState('manager123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <div className="login-page">
        <section className="login-panel">
          <p>Loading session…</p>
        </section>
      </div>
    );
  }

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await controlledLogin(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/${result.role}`);
  };

  const fillAdmin = () => {
    setEmail('admin@hotel.com');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <section className="login-hero">
        <p className="eyebrow">Staff portal</p>
        <h1 className="login-brand">Hotel OS</h1>
        <p className="login-lede">
          Manager and admin access via email/password JWT. OAuth is not available here.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-copy">
          <h2>Manager login</h2>
          <p>Staff only. Customer credentials are rejected. No Google sign-in on this path.</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button type="button" className="btn btn-ghost btn-block" onClick={fillAdmin}>
          Use admin demo credentials
        </button>

        <p className="demo-hint">
          API: <code>POST /api/auth/contolledlogin</code>
        </p>
        <p className="demo-hint">
          <Link to="/">Back to home</Link>
          {' · '}
          <Link to="/login/customer">Customer login</Link>
        </p>
      </section>
    </div>
  );
}
