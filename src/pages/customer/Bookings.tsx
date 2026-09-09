import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import { formatDisplayDate, formatINR } from '../../utils/dates';

export function CustomerBookingsPage() {
  const { user } = useAuth();
  const { bookings, rooms } = useHotel();
  const location = useLocation();
  const paidState = location.state as { paid?: boolean; paymentId?: string } | null;

  const mine = bookings.filter(
    (b) => b.guestEmail.toLowerCase() === user?.email.toLowerCase(),
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">My bookings</p>
          <h1>Stay history</h1>
          <p className="muted">Confirmed online reservations for your account.</p>
        </div>
      </header>

      {paidState?.paid && (
        <p className="toast success">
          Payment received{paidState.paymentId ? ` · ${paidState.paymentId}` : ''}. Booking confirmed.
        </p>
      )}

      {mine.length === 0 ? (
        <p className="empty-state">No bookings yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Room</th>
                <th>Dates</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((b) => {
                const room = rooms.find((r) => r.id === b.roomId);
                return (
                  <tr key={b.id}>
                    <td>{room?.name ?? b.roomId}</td>
                    <td>
                      {formatDisplayDate(b.checkIn)} → {formatDisplayDate(b.checkOut)}
                    </td>
                    <td>{formatINR(b.totalAmount)}</td>
                    <td>
                      <span className={`status status-${b.status}`}>{b.status}</span>
                    </td>
                    <td className="muted">{b.paymentId ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
