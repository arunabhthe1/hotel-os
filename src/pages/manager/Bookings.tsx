import { type FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useHotel } from '../../context/HotelContext';
import { formatDisplayDate, formatINR, todayISO } from '../../utils/dates';
import type { Booking } from '../../types';

export function ManagerBookingsPage() {
  const { bookings, rooms, modifyBooking, cancelBooking } = useHotel();
  const [editing, setEditing] = useState<Booking | null>(null);
  const [message, setMessage] = useState('');

  const active = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled'),
    [bookings],
  );

  const onSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const result = modifyBooking(editing.id, {
      roomId: String(fd.get('roomId')),
      checkIn: String(fd.get('checkIn')),
      checkOut: String(fd.get('checkOut')),
      guestName: String(fd.get('guestName')),
      guestPhone: String(fd.get('guestPhone')),
      notes: String(fd.get('notes') || ''),
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`Booking ${result.booking.id} updated`);
    setEditing(null);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>Modify & cancel bookings</h1>
          <p className="muted">Adjust dates, reassign rooms, or cancel confirmed stays.</p>
        </div>
      </header>

      {message && <p className="toast">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Guest</th>
              <th>Room</th>
              <th>Dates</th>
              <th>Source</th>
              <th>Status</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const room = rooms.find((r) => r.id === b.roomId);
              return (
                <tr key={b.id}>
                  <td>
                    <strong>{b.guestName}</strong>
                    <div className="muted">{b.guestEmail}</div>
                  </td>
                  <td>{room?.name ?? b.roomId}</td>
                  <td>
                    {formatDisplayDate(b.checkIn)} → {formatDisplayDate(b.checkOut)}
                  </td>
                  <td>{b.source}</td>
                  <td>
                    <span className={`status status-${b.status}`}>{b.status}</span>
                  </td>
                  <td>{formatINR(b.totalAmount)}</td>
                  <td className="row-actions">
                    {b.status !== 'cancelled' && (
                      <>
                        <Link
                          to={`/manager/invoice?bookingId=${encodeURIComponent(b.id)}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Invoice
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditing(b);
                            setMessage('');
                          }}
                        >
                          Modify
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            if (window.confirm('Cancel this booking?')) {
                              cancelBooking(b.id);
                              setMessage(`Cancelled ${b.id}`);
                              setEditing(null);
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {active.length === 0 && <p className="empty-state">No active bookings.</p>}

      {editing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <form
            className="modal panel-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSave}
          >
            <h2>Modify booking</h2>
            <label>
              Guest name
              <input name="guestName" defaultValue={editing.guestName} required />
            </label>
            <label>
              Phone
              <input name="guestPhone" defaultValue={editing.guestPhone} required />
            </label>
            <label>
              Room
              <select name="roomId" defaultValue={editing.roomId}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number} · {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Check-in
                <input
                  type="date"
                  name="checkIn"
                  defaultValue={editing.checkIn}
                  min={todayISO()}
                  required
                />
              </label>
              <label>
                Check-out
                <input
                  type="date"
                  name="checkOut"
                  defaultValue={editing.checkOut}
                  required
                />
              </label>
            </div>
            <label>
              Notes
              <textarea name="notes" defaultValue={editing.notes ?? ''} rows={3} />
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Close
              </button>
              <button type="submit" className="btn btn-primary">
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
