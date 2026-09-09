import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, Users } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  defaultCheckout,
  formatINR,
  getStayQuote,
  isRoomAvailableForStay,
  todayISO,
} from '../../utils/dates';

export function CustomerRoomsPage() {
  const { rooms, availability, bookings, blocks, addToCart, cart } = useHotel();
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(defaultCheckout(todayISO()));
  const [typeFilter, setTypeFilter] = useState('all');
  const [message, setMessage] = useState('');

  const availableRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (typeFilter !== 'all' && room.type !== typeFilter) return false;
      return isRoomAvailableForStay(
        room,
        checkIn,
        checkOut,
        availability,
        bookings,
        blocks,
      );
    });
  }, [rooms, typeFilter, checkIn, checkOut, availability, bookings, blocks]);

  const onDatesChange = (nextIn: string, nextOut: string) => {
    setCheckIn(nextIn);
    setCheckOut(nextOut <= nextIn ? defaultCheckout(nextIn) : nextOut);
    setMessage('');
  };

  const handleAdd = (roomId: string) => {
    const result = addToCart({ roomId, checkIn, checkOut });
    if (!result.ok) {
      setMessage(result.error ?? 'Could not add to cart');
      return;
    }
    setMessage('Added to cart');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Guest portal</p>
          <h1>Select your room</h1>
          <p className="muted">Pick dates, compare inventory, and add stays to your cart.</p>
        </div>
        <Link to="/customer/cart" className="btn btn-secondary">
          View cart ({cart.length})
        </Link>
      </header>

      <form
        className="filter-bar"
        onSubmit={(e: FormEvent) => e.preventDefault()}
      >
        <label>
          <CalendarRange size={16} />
          Check-in
          <input
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => onDatesChange(e.target.value, checkOut)}
          />
        </label>
        <label>
          <CalendarRange size={16} />
          Check-out
          <input
            type="date"
            value={checkOut}
            min={defaultCheckout(checkIn)}
            onChange={(e) => onDatesChange(checkIn, e.target.value)}
          />
        </label>
        <label>
          Room type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All types</option>
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
            <option value="presidential">Presidential</option>
          </select>
        </label>
      </form>

      {message && <p className="toast">{message}</p>}

      <div className="room-grid">
        {availableRooms.map((room) => {
          const quote = getStayQuote(room, checkIn, checkOut, availability);
          return (
            <article key={room.id} className="room-tile">
              <div
                className="room-media"
                style={{ backgroundImage: `url(${room.image})` }}
                role="img"
                aria-label={room.name}
              />
              <div className="room-body">
                <div className="room-meta">
                  <span className="pill">{room.type}</span>
                  <span className="muted">#{room.number}</span>
                </div>
                <h2>{room.name}</h2>
                <p>{room.description}</p>
                <div className="room-footer">
                  <div>
                    <p className="price">{formatINR(quote.pricePerNight)}<span>/night</span></p>
                    <p className="muted">
                      {quote.nights} night{quote.nights === 1 ? '' : 's'} · {formatINR(quote.total)}
                    </p>
                    <p className="capacity">
                      <Users size={14} /> Up to {room.capacity} guests
                    </p>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => handleAdd(room.id)}>
                    Add to cart
                  </button>
                </div>
                <ul className="amenity-list">
                  {room.amenities.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>

      {availableRooms.length === 0 && (
        <p className="empty-state">No rooms available for these dates. Try another range.</p>
      )}
    </div>
  );
}
