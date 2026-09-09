import { addDays, eachDayOfInterval, parseISO } from 'date-fns';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Printer, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHotel } from '../../context/HotelContext';
import type {
  Booking,
  Invoice,
  InvoiceChargeType,
  InvoiceLineItem,
  InvoiceLineKind,
} from '../../types';
import { formatDisplayDate, formatINR, toISODate, todayISO } from '../../utils/dates';

const INVOICE_KEY = 'hotel-os-invoices';
const STAY_TAX_RATE = 0.18;
const FOOD_TAX_RATE = 0.05;

const KIND_LABELS: Record<InvoiceLineKind, string> = {
  stay: 'Hotel stay',
  food: 'Food & beverage',
  laundry: 'Laundry',
  room_service: 'Room service',
  minibar: 'Minibar',
  other: 'Other',
};

const EXTRA_KINDS: InvoiceChargeType[] = [
  'food',
  'laundry',
  'room_service',
  'minibar',
  'other',
];

function readInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(INVOICE_KEY);
    return raw ? (JSON.parse(raw) as Invoice[]) : [];
  } catch {
    return [];
  }
}

function persistInvoices(invoices: Invoice[]) {
  localStorage.setItem(INVOICE_KEY, JSON.stringify(invoices));
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function taxRateFor(kind: InvoiceLineKind): number {
  if (kind === 'stay') return STAY_TAX_RATE;
  if (kind === 'food') return FOOD_TAX_RATE;
  return 0;
}

function withTax(line: Omit<InvoiceLineItem, 'taxRate' | 'taxAmount' | 'lineTotal'>): InvoiceLineItem {
  const amount = roundMoney(Math.max(0, Number(line.amount) || 0));
  const taxRate = taxRateFor(line.kind);
  const taxAmount = roundMoney(amount * taxRate);
  return {
    ...line,
    amount,
    taxRate,
    taxAmount,
    lineTotal: roundMoney(amount + taxAmount),
  };
}

function stayNightDates(checkIn: string, checkOut: string): string[] {
  const nights = eachDayOfInterval({
    start: parseISO(checkIn),
    end: addDays(parseISO(checkOut), -1),
  });
  return nights.map((d) => toISODate(d));
}

function buildStayLines(booking: Booking, roomLabel: string): InvoiceLineItem[] {
  const dates = stayNightDates(booking.checkIn, booking.checkOut);
  const nights = Math.max(dates.length, 1);
  const perNight = roundMoney(booking.totalAmount / nights);
  let allocated = 0;

  return dates.map((date, index) => {
    const isLast = index === dates.length - 1;
    const amount = isLast ? roundMoney(booking.totalAmount - allocated) : perNight;
    allocated = roundMoney(allocated + amount);
    return withTax({
      id: `stay-${booking.id}-${date}`,
      kind: 'stay',
      date,
      description: `Room rent · ${roomLabel}`,
      amount,
    });
  });
}

function newExtraLine(kind: InvoiceChargeType, date = todayISO()): InvoiceLineItem {
  return withTax({
    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    date,
    description: KIND_LABELS[kind],
    amount: 0,
  });
}

function computeTotals(lines: InvoiceLineItem[], discountAmount: number) {
  const roomRent = roundMoney(
    lines.filter((l) => l.kind === 'stay').reduce((s, l) => s + l.amount, 0),
  );
  const stayTaxTotal = roundMoney(
    lines.filter((l) => l.kind === 'stay').reduce((s, l) => s + l.taxAmount, 0),
  );
  const foodTaxTotal = roundMoney(
    lines.filter((l) => l.kind === 'food').reduce((s, l) => s + l.taxAmount, 0),
  );
  const taxTotal = roundMoney(lines.reduce((s, l) => s + l.taxAmount, 0));
  const taxableBase = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  const subtotal = roundMoney(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discount = roundMoney(Math.min(Math.max(discountAmount, 0), subtotal));
  const grandTotal = roundMoney(subtotal - discount);
  return {
    roomRent,
    taxableBase,
    stayTaxTotal,
    foodTaxTotal,
    taxTotal,
    subtotal,
    discount,
    grandTotal,
  };
}

function taxPercentLabel(rate: number): string {
  if (rate <= 0) return '—';
  return `${roundMoney(rate * 100)}%`;
}

export function ManagerInvoicePage() {
  const { user } = useAuth();
  const { bookings, rooms } = useHotel();
  const [searchParams, setSearchParams] = useSearchParams();

  const billable = useMemo(
    () => bookings.filter((b) => b.status !== 'cancelled'),
    [bookings],
  );

  const [bookingId, setBookingId] = useState(searchParams.get('bookingId') ?? '');
  const [lines, setLines] = useState<InvoiceLineItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountComment, setDiscountComment] = useState('');
  const [notes, setNotes] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>(() => readInvoices());
  const [generated, setGenerated] = useState<Invoice | null>(null);
  const [message, setMessage] = useState('');

  const selected: Booking | undefined = billable.find((b) => b.id === bookingId);

  useEffect(() => {
    const fromQuery = searchParams.get('bookingId');
    if (fromQuery && billable.some((b) => b.id === fromQuery)) {
      setBookingId(fromQuery);
    }
  }, [searchParams, billable]);

  useEffect(() => {
    if (!selected) {
      setLines([]);
      setDiscountAmount(0);
      setDiscountComment('');
      setNotes('');
      setGenerated(null);
      return;
    }

    const room = rooms.find((r) => r.id === selected.roomId);
    const roomLabel = room ? `${room.number} · ${room.name}` : selected.roomId;
    const stayLines = buildStayLines(selected, roomLabel);
    setLines(stayLines);
    setDiscountAmount(0);
    setDiscountComment('');
    setNotes(selected.notes ?? '');
    setGenerated(null);
    setMessage(
      `${stayLines.length} stay night line${stayLines.length === 1 ? '' : 's'} prefilled · 18% GST on stay · 5% GST on food`,
    );
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(
    () => computeTotals(lines, discountAmount),
    [lines, discountAmount],
  );

  const onSelectBooking = (id: string) => {
    setBookingId(id);
    if (id) setSearchParams({ bookingId: id });
    else setSearchParams({});
  };

  const updateLine = (id: string, patch: Partial<Pick<InvoiceLineItem, 'date' | 'kind' | 'description' | 'amount'>>) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const nextKind = patch.kind ?? line.kind;
        return withTax({
          id: line.id,
          kind: nextKind,
          date: patch.date ?? line.date,
          description: patch.description ?? line.description,
          amount: patch.amount ?? line.amount,
        });
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id || l.kind === 'stay'));
  };

  const onGenerate = (e: FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setMessage('Select a customer booking first');
      return;
    }
    if (lines.length === 0) {
      setMessage('Invoice has no line items');
      return;
    }
    if (totals.grandTotal < 0) {
      setMessage('Grand total cannot be negative');
      return;
    }
    if (discountAmount > 0 && !discountComment.trim()) {
      setMessage('Add a comment when applying a discount');
      return;
    }

    const room = rooms.find((r) => r.id === selected.roomId);
    const normalized = lines
      .filter((l) => l.amount > 0 || l.kind === 'stay')
      .map((l) => withTax(l));

    const finalTotals = computeTotals(normalized, discountAmount);
    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      bookingId: selected.id,
      guestName: selected.guestName,
      guestEmail: selected.guestEmail,
      guestPhone: selected.guestPhone,
      roomId: selected.roomId,
      roomLabel: room ? `${room.number} · ${room.name}` : selected.roomId,
      checkIn: selected.checkIn,
      checkOut: selected.checkOut,
      nights: selected.nights,
      roomRent: finalTotals.roomRent,
      lineItems: normalized,
      discount: {
        amount: finalTotals.discount,
        comment: discountComment.trim(),
      },
      stayTaxTotal: finalTotals.stayTaxTotal,
      foodTaxTotal: finalTotals.foodTaxTotal,
      taxTotal: finalTotals.taxTotal,
      subtotal: finalTotals.subtotal,
      grandTotal: finalTotals.grandTotal,
      notes: notes.trim() || undefined,
      generatedBy: user?.name ?? 'Manager',
      createdAt: new Date().toISOString(),
    };

    const next = [invoice, ...invoices];
    persistInvoices(next);
    setInvoices(next);
    setGenerated(invoice);
    setMessage(`Invoice ${invoice.id} generated`);
  };

  const previewLines = generated?.lineItems?.length
    ? generated.lineItems
    : [];

  return (
    <div className="page invoice-page">
      <header className="page-header no-print">
        <div>
          <p className="eyebrow">Manager</p>
          <h1>Invoice generation</h1>
          <p className="muted">
            Tabular bill with one stay line per night (18% GST) and dated extras (5% GST on food).
          </p>
        </div>
        {generated && (
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} />
            Print invoice
          </button>
        )}
      </header>

      {message && <p className="toast no-print">{message}</p>}

      <form className="invoice-table-form no-print" onSubmit={onGenerate}>
        <div className="invoice-toolbar">
          <label className="invoice-booking-select">
            Customer booking
            <select
              value={bookingId}
              onChange={(e) => onSelectBooking(e.target.value)}
              required
            >
              <option value="">Choose a booking…</option>
              {billable.map((b) => {
                const room = rooms.find((r) => r.id === b.roomId);
                return (
                  <option key={b.id} value={b.id}>
                    {b.guestName} · {room?.name ?? b.roomId} ·{' '}
                    {formatDisplayDate(b.checkIn)} → {formatDisplayDate(b.checkOut)} ·{' '}
                    {b.nights} night{b.nights === 1 ? '' : 's'} · {formatINR(b.totalAmount)}
                  </option>
                );
              })}
            </select>
          </label>

          {selected && (
            <div className="invoice-guest-meta compact">
              <strong>{selected.guestName}</strong>
              <span className="muted">
                {selected.guestEmail} · {selected.guestPhone}
              </span>
            </div>
          )}
        </div>

        <div className="table-wrap invoice-editor-wrap">
          <table className="invoice-editor-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="num">Amount</th>
                <th className="num">GST %</th>
                <th className="num">GST</th>
                <th className="num">Line total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    Select a booking to load nightly stay lines.
                  </td>
                </tr>
              )}
              {lines.map((line) => (
                <tr key={line.id} className={line.kind === 'stay' ? 'stay-row' : undefined}>
                  <td>
                    <input
                      type="date"
                      value={line.date}
                      onChange={(e) => updateLine(line.id, { date: e.target.value })}
                      required
                    />
                  </td>
                  <td>
                    {line.kind === 'stay' ? (
                      <span className="pill">Hotel stay</span>
                    ) : (
                      <select
                        value={line.kind}
                        onChange={(e) => {
                          const kind = e.target.value as InvoiceChargeType;
                          updateLine(line.id, {
                            kind,
                            description: KIND_LABELS[kind],
                          });
                        }}
                      >
                        {EXTRA_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {KIND_LABELS[kind]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <input
                      value={line.description}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      required
                    />
                  </td>
                  <td className="num">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, { amount: Number(e.target.value) })}
                      required
                    />
                  </td>
                  <td className="num muted">{taxPercentLabel(line.taxRate)}</td>
                  <td className="num">{formatINR(line.taxAmount)}</td>
                  <td className="num">
                    <strong>{formatINR(line.lineTotal)}</strong>
                  </td>
                  <td>
                    {line.kind !== 'stay' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeLine(line.id)}
                        aria-label="Remove line"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-actions-bar">
          <div className="quick-charge-row">
            {EXTRA_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!selected}
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    newExtraLine(kind, selected?.checkIn ?? todayISO()),
                  ])
                }
              >
                <Plus size={14} />
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>

          <div className="invoice-discount-row">
            <label>
              Discount (INR)
              <input
                type="number"
                min={0}
                step={1}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
              />
            </label>
            <label className="grow">
              Discount comment
              <input
                value={discountComment}
                onChange={(e) => setDiscountComment(e.target.value)}
                placeholder="Required when discount &gt; 0"
              />
            </label>
            <label className="grow">
              Notes
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional invoice notes"
              />
            </label>
          </div>
        </div>

        <div className="invoice-summary-strip">
          <div>
            <span className="muted">Stay base</span>
            <strong>{formatINR(totals.roomRent)}</strong>
          </div>
          <div>
            <span className="muted">Stay GST 18%</span>
            <strong>{formatINR(totals.stayTaxTotal)}</strong>
          </div>
          <div>
            <span className="muted">Food GST 5%</span>
            <strong>{formatINR(totals.foodTaxTotal)}</strong>
          </div>
          <div>
            <span className="muted">Total GST</span>
            <strong>{formatINR(totals.taxTotal)}</strong>
          </div>
          <div>
            <span className="muted">Subtotal</span>
            <strong>{formatINR(totals.subtotal)}</strong>
          </div>
          <div>
            <span className="muted">Discount</span>
            <strong>− {formatINR(totals.discount)}</strong>
          </div>
          <div className="grand">
            <span className="muted">Payable</span>
            <strong>{formatINR(totals.grandTotal)}</strong>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!selected}>
            Generate final bill
          </button>
        </div>
      </form>

      <aside className="invoice-history-bar no-print">
        <h2>Recent invoices</h2>
        {invoices.length === 0 ? (
          <p className="muted">No invoices generated yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Guest</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 10).map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.id}</td>
                    <td>{inv.guestName}</td>
                    <td>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="num">{formatINR(inv.grandTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setGenerated(inv)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link to="/manager" className="btn btn-ghost btn-sm">
          Back to bookings
        </Link>
      </aside>

      {generated && (
        <section className="invoice-preview" id="invoice-print">
          <header className="invoice-preview-head">
            <div>
              <p className="eyebrow">Hotel OS</p>
              <h2>Tax invoice / final bill</h2>
            </div>
            <div className="invoice-preview-meta">
              <p>
                <strong>{generated.id}</strong>
              </p>
              <p className="muted">
                {new Date(generated.createdAt).toLocaleString('en-IN')}
              </p>
              <p className="muted">Prepared by {generated.generatedBy}</p>
            </div>
          </header>

          <div className="invoice-preview-parties">
            <div>
              <h3>Bill to</h3>
              <p>
                <strong>{generated.guestName}</strong>
              </p>
              <p className="muted">{generated.guestEmail}</p>
              <p className="muted">{generated.guestPhone}</p>
            </div>
            <div>
              <h3>Stay</h3>
              <p>{generated.roomLabel}</p>
              <p className="muted">
                {formatDisplayDate(generated.checkIn)} → {formatDisplayDate(generated.checkOut)}
              </p>
              <p className="muted">
                {generated.nights} night{generated.nights === 1 ? '' : 's'} · Booking{' '}
                {generated.bookingId}
              </p>
            </div>
          </div>

          <table className="invoice-lines">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th className="num">Amount</th>
                <th className="num">GST</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {previewLines.map((line) => (
                <tr key={line.id}>
                  <td>{formatDisplayDate(line.date)}</td>
                  <td>{line.description}</td>
                  <td>
                    {KIND_LABELS[line.kind]}
                    {line.taxRate > 0 ? ` (${taxPercentLabel(line.taxRate)})` : ''}
                  </td>
                  <td className="num">{formatINR(line.amount)}</td>
                  <td className="num">{formatINR(line.taxAmount)}</td>
                  <td className="num">{formatINR(line.lineTotal)}</td>
                </tr>
              ))}
              {generated.discount.amount > 0 && (
                <tr className="discount-line">
                  <td colSpan={3}>
                    Discount
                    {generated.discount.comment && (
                      <div className="muted">{generated.discount.comment}</div>
                    )}
                  </td>
                  <td className="num" colSpan={2} />
                  <td className="num">− {formatINR(generated.discount.amount)}</td>
                </tr>
              )}
            </tbody>
          </table>

          <footer className="invoice-preview-footer">
            {generated.notes && <p className="muted">Notes: {generated.notes}</p>}
            <div className="invoice-totals-box">
              <div>
                <span>Stay GST (18%)</span>
                <strong>{formatINR(generated.stayTaxTotal ?? 0)}</strong>
              </div>
              <div>
                <span>Food GST (5%)</span>
                <strong>{formatINR(generated.foodTaxTotal ?? 0)}</strong>
              </div>
              <div>
                <span>Total GST</span>
                <strong>{formatINR(generated.taxTotal ?? 0)}</strong>
              </div>
              <div>
                <span>Subtotal</span>
                <strong>{formatINR(generated.subtotal)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>− {formatINR(generated.discount.amount)}</strong>
              </div>
              <div className="grand">
                <span>Amount payable</span>
                <strong>{formatINR(generated.grandTotal)}</strong>
              </div>
            </div>
          </footer>
        </section>
      )}
    </div>
  );
}
