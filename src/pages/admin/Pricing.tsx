import { type FormEvent, useMemo, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { formatINR } from '../../utils/dates';

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
    month: 'long',
    year: 'numeric',
  });
}

export function AdminPricingPage() {
  const { rooms, availability, setRoomBasePrice, setRoomPrice, resetDemoData } = useHotel();
  const months = useMemo(() => upcomingMonths(12), []);
  const [month, setMonth] = useState(months[0]);
  const [message, setMessage] = useState('');

  const onBasePrice = (e: FormEvent<HTMLFormElement>, roomId: string) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = Number(fd.get('basePrice'));
    if (!Number.isFinite(price) || price <= 0) {
      setMessage('Enter a valid base price');
      return;
    }
    setRoomBasePrice(roomId, price);
    setMessage('Base price updated');
  };

  const onMonthPrice = (e: FormEvent<HTMLFormElement>, roomId: string) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = Number(fd.get('monthPrice'));
    if (!Number.isFinite(price) || price <= 0) {
      setMessage('Enter a valid monthly price');
      return;
    }
    setRoomPrice(roomId, month, price);
    setMessage(`Price for ${monthLabel(month)} updated`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Room pricing</h1>
          <p className="muted">Set default rates and optional monthly overrides per room.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            resetDemoData();
            setMessage('Demo data reset');
          }}
        >
          Reset demo data
        </button>
      </header>

      {message && <p className="toast">{message}</p>}

      <label className="inline-field">
        Monthly override target
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </label>

      <div className="admin-grid">
        {rooms.map((room) => {
          const row = availability.find((a) => a.roomId === room.id && a.month === month);
          const effective = row?.priceOverride ?? room.basePrice;
          return (
            <article key={room.id} className="admin-tile">
              <div className="admin-tile-head">
                <div>
                  <p className="pill">{room.type}</p>
                  <h2>
                    {room.number} · {room.name}
                  </h2>
                </div>
                <p className="price">{formatINR(effective)}</p>
              </div>

              <form className="mini-form" onSubmit={(e) => onBasePrice(e, room.id)}>
                <label>
                  Base price (INR)
                  <input
                    name="basePrice"
                    type="number"
                    min={1}
                    step={100}
                    defaultValue={room.basePrice}
                    key={`${room.id}-base-${room.basePrice}`}
                  />
                </label>
                <button type="submit" className="btn btn-secondary btn-sm">
                  Save base
                </button>
              </form>

              <form className="mini-form" onSubmit={(e) => onMonthPrice(e, room.id)}>
                <label>
                  {monthLabel(month)} override
                  <input
                    name="monthPrice"
                    type="number"
                    min={1}
                    step={100}
                    defaultValue={row?.priceOverride ?? room.basePrice}
                    key={`${room.id}-${month}-${row?.priceOverride ?? 'base'}`}
                  />
                </label>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save month price
                </button>
              </form>
            </article>
          );
        })}
      </div>
    </div>
  );
}
