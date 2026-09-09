import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { HotelProvider } from './context/HotelContext';
import { CustomerLoginPage } from './pages/CustomerLogin';
import { HomePage } from './pages/Home';
import { ManagerLoginPage } from './pages/ManagerLogin';
import { AdminAvailabilityPage } from './pages/admin/Availability';
import { AdminPricingPage } from './pages/admin/Pricing';
import { CustomerBookingsPage } from './pages/customer/Bookings';
import { CustomerCartPage } from './pages/customer/Cart';
import { CustomerCheckoutPage } from './pages/customer/Checkout';
import { CustomerRoomsPage } from './pages/customer/Rooms';
import { ManagerBlocksPage } from './pages/manager/Blocks';
import { ManagerBookingsPage } from './pages/manager/Bookings';
import { ManagerInvoicePage } from './pages/manager/Invoice';
import { ManagerWalkInPage } from './pages/manager/WalkIn';

/** Legacy OAuth redirect target from API default: /login?token=... */
function OAuthCallbackRedirect() {
  const [params] = useSearchParams();
  const { user, ready } = useAuth();
  const token = params.get('token');
  const error = params.get('error');

  if (token || error) {
    const qs = params.toString();
    return <Navigate to={`/login/customer?${qs}`} replace />;
  }

  if (!ready) return null;
  if (user) return <Navigate to={`/${user.role}`} replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <HotelProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<OAuthCallbackRedirect />} />
          <Route path="/login/customer" element={<CustomerLoginPage />} />
          <Route path="/login/manager" element={<ManagerLoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route element={<ProtectedRoute roles={['customer']} />}>
                <Route path="/customer" element={<CustomerRoomsPage />} />
                <Route path="/customer/cart" element={<CustomerCartPage />} />
                <Route path="/customer/checkout" element={<CustomerCheckoutPage />} />
                <Route path="/customer/bookings" element={<CustomerBookingsPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={['manager']} />}>
                <Route path="/manager" element={<ManagerBookingsPage />} />
                <Route path="/manager/invoice" element={<ManagerInvoicePage />} />
                <Route path="/manager/walk-in" element={<ManagerWalkInPage />} />
                <Route path="/manager/blocks" element={<ManagerBlocksPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin" element={<AdminPricingPage />} />
                <Route path="/admin/availability" element={<AdminAvailabilityPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HotelProvider>
    </AuthProvider>
  );
}
