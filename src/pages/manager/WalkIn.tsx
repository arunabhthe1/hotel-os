import { type FormEvent, useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import {
  defaultCheckout,
  formatINR,
  getStayQuote,
  isRoomAvailableForStay,
  todayISO,
} from '../../utils/dates';

export function ManagerWalkInPage() {
  const { rooms, availability, bookings, blocks, createBooking } = useHotel();
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(defaultCheckout(todayISO()));
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  const openRooms = useMemo(
    () =>
      rooms.filter((room) =>
        isRoomAvailableForStay(room, checkIn, checkOut, availability, bookings, blocks),
      ),
    [rooms, checkIn, checkOut, availability, bookings, blocks],
  );

  const selected = openRooms.find((r) => r.id === roomId) ?? openRooms[0];
  const quote = selected
    ? getStayQuote(selected, checkIn, checkOut, availability)
    : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setMessage('No rooms available for this range');
      return;
    }
    const result = createBooking({
      roomId: selected.id,
      guestName,
      guestEmail: guestEmail || `${guestName.replace(/\s+/g, '.').toLowerCase()}@walkin.local`,
      guestPhone,
      checkIn,
      checkOut,
      source: 'walk-in',
      notes,
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`Walk-in booking created · ${result.booking.id} · ${formatINR(result.booking.totalAmount)}`);
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setNotes('');
    setRoomId('');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>Walk-in booking</h1>
          <p className="muted">Create a front-desk reservation for a date range without online payment.</p>
        </div>
      </header>

      {message && <p className="toast">{message}</p>}

      <form className="panel-form narrow" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            Check-in
            <input
              type="date"
              value={checkIn}
              min={todayISO()}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (checkOut <= e.target.value) setCheckOut(defaultCheckout(e.target.value));
              }}
              required
            />
          </label>
          <label>
            Check-out
            <input
              type="date"
              value={checkOut}
              min={defaultCheckout(checkIn)}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Available room
          <select
            value={selected?.id ?? ''}
            onChange={(e) => setRoomId(e.target.value)}
            required
            disabled={openRooms.length === 0}
          >
            {openRooms.length === 0 && <option value="">No rooms available</option>}
            {openRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.name} · from {formatINR(r.basePrice)}
              </option>
            ))}
          </select>
        </label>

        {quote && !quote.unavailable && (
          <p className="quote-line">
            {quote.nights} night{quote.nights === 1 ? '' : 's'} · {formatINR(quote.total)}
          </p>
        )}

        <label>
          Guest name
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
        </label>
        <label>
          Email (optional)
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
        </label>
        <label>
          Phone
          <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>

        <button type="submit" className="btn btn-primary" disabled={!selected}>
          Create walk-in booking
        </button>
      </form>
    </div>
  );
}
