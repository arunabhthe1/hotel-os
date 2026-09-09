import { type FormEvent, useState } from 'react';
import { useHotel } from '../../context/HotelContext';
import { defaultCheckout, formatDisplayDate, todayISO } from '../../utils/dates';

export function ManagerBlocksPage() {
  const { rooms, blocks, blockRoom, removeBlock } = useHotel();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(defaultCheckout(todayISO()));
  const [reason, setReason] = useState('Maintenance');
  const [message, setMessage] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = blockRoom({ roomId, startDate, endDate, reason });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage('Room blocked for the selected range');
    setReason('Maintenance');
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>Block rooms</h1>
          <p className="muted">Take inventory offline for maintenance or private holds.</p>
        </div>
      </header>

      {message && <p className="toast">{message}</p>}

      <form className="panel-form narrow" onSubmit={onSubmit}>
        <h2>New block</h2>
        <label>
          Room
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Start
            <input
              type="date"
              value={startDate}
              min={todayISO()}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
              required
            />
          </label>
          <label>
            End
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Reason
          <input value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary">
          Block room
        </button>
      </form>

      <section className="section">
        <h2>Active blocks</h2>
        {blocks.length === 0 ? (
          <p className="empty-state">No rooms currently blocked.</p>
        ) : (
          <div className="stack-list">
            {blocks.map((b) => {
              const room = rooms.find((r) => r.id === b.roomId);
              return (
                <article key={b.id} className="list-row compact">
                  <div className="list-body">
                    <h3>{room?.name ?? b.roomId}</h3>
                    <p className="muted">
                      {formatDisplayDate(b.startDate)} → {formatDisplayDate(b.endDate)}
                    </p>
                    <p>{b.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => removeBlock(b.id)}
                  >
                    Remove
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
