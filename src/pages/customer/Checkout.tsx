import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import { formatDisplayDate, formatINR } from '../../utils/dates';
import { getRazorpayKey, openRazorpayCheckout } from '../../utils/razorpay';

export function CustomerCheckoutPage() {
  const { user } = useAuth();
  const { cart, rooms, createBooking, clearCart } = useHotel();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('+91 ');
  const [status, setStatus] = useState('');
  const [paying, setPaying] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.totalAmount, 0);
  const hasKey = Boolean(getRazorpayKey());

  if (cart.length === 0) {
    return (
      <div className="page">
        <div className="empty-panel">
          <p>Nothing to checkout.</p>
          <Link to="/customer" className="btn btn-primary">
            Browse rooms
          </Link>
        </div>
      </div>
    );
  }

  const onPay = async (e: FormEvent) => {
    e.preventDefault();
    setPaying(true);
    setStatus(hasKey ? 'Opening Razorpay…' : 'Simulating Razorpay test payment…');

    try {
      await openRazorpayCheckout({
        amountInr: total,
        name,
        email,
        contact: phone.replace(/\s/g, ''),
        description: `Hotel OS · ${cart.length} room booking`,
        onDismiss: () => {
          setPaying(false);
          setStatus('Payment dismissed');
        },
        onSuccess: (paymentId) => {
          const failures: string[] = [];
          for (const item of cart) {
            const result = createBooking({
              roomId: item.roomId,
              guestName: name,
              guestEmail: email,
              guestPhone: phone,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              source: 'online',
              paymentId,
            });
            if (!result.ok) failures.push(result.error);
          }

          if (failures.length) {
            setStatus(failures[0]);
            setPaying(false);
            return;
          }

          clearCart();
          setStatus('Payment successful');
          navigate('/customer/bookings', { state: { paid: true, paymentId } });
        },
      });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Payment failed');
      setPaying(false);
    }
  };

  return (
    <div className="page checkout-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Confirm & pay</h1>
          <p className="muted">
            {hasKey
              ? 'Live Razorpay Checkout will open with your configured key.'
              : 'No VITE_RAZORPAY_KEY_ID set — payment will be simulated for demo.'}
          </p>
        </div>
      </header>

      <div className="checkout-layout">
        <form className="panel-form" onSubmit={onPay}>
          <h2>Guest details</h2>
          <label>
            Full name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Phone
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          {status && <p className="toast">{status}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={paying}>
            {paying ? 'Processing…' : `Pay ${formatINR(total)} with Razorpay`}
          </button>
        </form>

        <aside className="order-summary">
          <h2>Order summary</h2>
          <ul>
            {cart.map((item) => {
              const room = rooms.find((r) => r.id === item.roomId);
              return (
                <li key={item.roomId}>
                  <div>
                    <strong>{room?.name ?? item.roomId}</strong>
                    <p className="muted">
                      {formatDisplayDate(item.checkIn)} → {formatDisplayDate(item.checkOut)}
                    </p>
                  </div>
                  <span>{formatINR(item.totalAmount)}</span>
                </li>
              );
            })}
          </ul>
          <div className="order-total">
            <span>Total</span>
            <strong>{formatINR(total)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
