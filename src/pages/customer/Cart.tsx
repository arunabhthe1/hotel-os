import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { formatDisplayDate, formatINR } from '../../utils/dates';

export function CustomerCartPage() {
  const { cart, rooms, removeFromCart, clearCart } = useHotel();

  const total = cart.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Cart</p>
          <h1>Your stay selections</h1>
          <p className="muted">Review rooms before checkout and Razorpay payment.</p>
        </div>
        {cart.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={clearCart}>
            Clear cart
          </button>
        )}
      </header>

      {cart.length === 0 ? (
        <div className="empty-panel">
          <p>Your cart is empty.</p>
          <Link to="/customer" className="btn btn-primary">
            Browse rooms
          </Link>
        </div>
      ) : (
        <>
          <div className="stack-list">
            {cart.map((item) => {
              const room = rooms.find((r) => r.id === item.roomId);
              if (!room) return null;
              return (
                <article key={item.roomId} className="list-row">
                  <div
                    className="list-thumb"
                    style={{ backgroundImage: `url(${room.image})` }}
                  />
                  <div className="list-body">
                    <h2>{room.name}</h2>
                    <p className="muted">
                      {formatDisplayDate(item.checkIn)} → {formatDisplayDate(item.checkOut)} ·{' '}
                      {item.nights} night{item.nights === 1 ? '' : 's'}
                    </p>
                    <p className="price">{formatINR(item.totalAmount)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeFromCart(item.roomId)}
                    aria-label={`Remove ${room.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })}
          </div>

          <footer className="checkout-bar">
            <div>
              <p className="muted">Grand total</p>
              <p className="price xl">{formatINR(total)}</p>
            </div>
            <Link to="/customer/checkout" className="btn btn-primary">
              Proceed to checkout
            </Link>
          </footer>
        </>
      )}
    </div>
  );
}
