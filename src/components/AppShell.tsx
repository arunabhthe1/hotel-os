import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHotel } from '../context/HotelContext';
import type { Role } from '../types';

const NAV: Record<Role, { to: string; label: string }[]> = {
  customer: [
    { to: '/customer', label: 'Rooms' },
    { to: '/customer/cart', label: 'Cart' },
    { to: '/customer/bookings', label: 'My bookings' },
  ],
  manager: [
    { to: '/manager', label: 'Bookings' },
    { to: '/manager/invoice', label: 'Invoice' },
    { to: '/manager/walk-in', label: 'Walk-in' },
    { to: '/manager/blocks', label: 'Block rooms' },
  ],
  admin: [
    { to: '/admin', label: 'Pricing' },
    { to: '/admin/availability', label: 'Availability' },
  ],
};

export function AppShell() {
  const { user, logout } = useAuth();
  const { cart } = useHotel();
  const navigate = useNavigate();

  if (!user) return null;

  const links = NAV[user.role];

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={`/${user.role}`} className="brand">
          <span className="brand-mark">HO</span>
          <span className="brand-text">Hotel OS</span>
        </Link>

        <nav className="nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === `/${user.role}`}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          {user.role === 'customer' && (
            <Link to="/customer/cart" className="cart-chip" aria-label="Cart">
              <ShoppingBag size={16} />
              <span>{cart.length}</span>
            </Link>
          )}
          <div className="user-chip">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
