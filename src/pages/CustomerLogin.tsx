import { type FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchOAuthProviders, googleAuthorizeUrl, type OAuth2Provider } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export function CustomerLoginPage() {
  const { user, ready, customerLogin, acceptToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState('customer@hotel.com');
  const [password, setPassword] = useState('customer123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [providers, setProviders] = useState<OAuth2Provider[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchOAuthProviders()
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    const oauthError = searchParams.get('error');
    if (!token && !oauthError) return;

    if (oauthError) {
      setError(oauthError);
      setSearchParams({}, { replace: true });
      return;
    }

    if (token) {
      setOauthBusy(true);
      acceptToken(token).then((result) => {
        setSearchParams({}, { replace: true });
        setOauthBusy(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        navigate(`/${result.role}`, { replace: true });
      });
    }
  }, [searchParams, setSearchParams, acceptToken, navigate]);

  if (!ready || oauthBusy) {
    return (
      <div className="login-page">
        <div className="login-atmosphere" aria-hidden />
        <section className="login-panel">
          <p>Completing sign-in…</p>
        </section>
      </div>
    );
  }

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const googleEnabled = providers.some((p) => p.id === 'google');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await customerLogin(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate(`/${result.role}`);
  };

  return (
    <div className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <section className="login-hero">
        <p className="eyebrow">Guest portal</p>
        <h1 className="login-brand">Hotel OS</h1>
        <p className="login-lede">
          Customer login with email/password JWT, plus optional Google OAuth.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-copy">
          <h2>Customer login</h2>
          <p>Guests only. Manager and admin credentials are rejected.</p>
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

        {googleEnabled && (
          <>
            <div className="login-divider">
              <span>or</span>
            </div>
            <a className="btn btn-secondary btn-block oauth-btn" href={googleAuthorizeUrl()}>
              Continue with Google
            </a>
            <p className="demo-hint">
              Google returns to this app with <code>?token=…</code> after a successful customer JWT
              is issued.
            </p>
          </>
        )}

        {!googleEnabled && (
          <p className="demo-hint">
            Google OAuth is unavailable until the API has <code>GOOGLE_CLIENT_ID</code> and{' '}
            <code>GOOGLE_CLIENT_SECRET</code> configured.
          </p>
        )}

        <p className="demo-hint">
          <Link to="/">Back to home</Link>
          {' · '}
          <Link to="/login/manager">Manager login</Link>
        </p>
      </section>
    </div>
  );
}
