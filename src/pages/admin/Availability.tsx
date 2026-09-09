import { useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';

function upcomingMonths(count = 12): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

export function AdminAvailabilityPage() {
  const { rooms, availability, setMonthAvailability } = useHotel();
  const months = useMemo(() => upcomingMonths(12), []);
  const [message, setMessage] = useState('');

  const isAvailable = (roomId: string, month: string) => {
    const row = availability.find((a) => a.roomId === roomId && a.month === month);
    return row?.available ?? true;
  };

  const toggle = (roomId: string, month: string) => {
    const next = !isAvailable(roomId, month);
    setMonthAvailability(roomId, month, next);
    setMessage(
      `${rooms.find((r) => r.id === roomId)?.name ?? roomId} · ${monthLabel(month)} marked ${
        next ? 'available' : 'unavailable'
      }`,
    );
  };

  const setAllForMonth = (month: string, available: boolean) => {
    rooms.forEach((room) => setMonthAvailability(room.id, month, available));
    setMessage(
      `All rooms ${available ? 'opened' : 'closed'} for ${monthLabel(month)}`,
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Monthly availability</h1>
          <p className="muted">
            Open or close each room for the next twelve months. Closed months cannot be booked.
          </p>
        </div>
      </header>

      {message && <p className="toast">{message}</p>}

      <div className="availability-scroll">
        <table className="availability-table">
          <thead>
            <tr>
              <th>Room</th>
              {months.map((month) => (
                <th key={month}>
                  <div className="month-head">
                    <span>{monthLabel(month)}</span>
                    <div className="month-actions">
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => setAllForMonth(month, true)}
                      >
                        All on
                      </button>
                      <button
                        type="button"
                        className="linkish"
                        onClick={() => setAllForMonth(month, false)}
                      >
                        All off
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>
                  <strong>
                    {room.number} · {room.name}
                  </strong>
                </td>
                {months.map((month) => {
                  const on = isAvailable(room.id, month);
                  return (
                    <td key={`${room.id}-${month}`}>
                      <button
                        type="button"
                        className={on ? 'avail-toggle on' : 'avail-toggle off'}
                        onClick={() => toggle(room.id, month)}
                        aria-pressed={on}
                      >
                        {on ? 'Open' : 'Closed'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
