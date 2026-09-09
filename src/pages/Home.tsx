import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <div className="login-page"><p className="login-panel">Loading session…</p></div>;
  }

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-atmosphere" aria-hidden />
      <section className="login-hero">
        <p className="eyebrow">Hospitality operations</p>
        <h1 className="login-brand">Hotel OS</h1>
        <p className="login-lede">
          Choose how you enter — guests book stays; managers and admins run the property.
        </p>
      </section>

      <section className="login-panel home-panel">
        <h2>Sign in</h2>
        <p className="muted">Select a portal to continue.</p>

        <div className="home-login-links">
          <Link to="/login/customer" className="home-login-card">
            <span className="pill">Guest</span>
            <strong>Customer login</strong>
            <span className="muted">
              Email/password or Google OAuth. Browse rooms, cart, and Razorpay checkout.
            </span>
          </Link>

          <Link to="/login/manager" className="home-login-card">
            <span className="pill">Staff</span>
            <strong>Manager login</strong>
            <span className="muted">
              Manager and admin email/password only. No OAuth on this portal.
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
