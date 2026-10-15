# Hotel OS — data model

Mapped from the current UI portals (customer / manager / admin) for **PostgreSQL 15+**.

Canonical DDL: [`../db/schema.sql`](../db/schema.sql)

Full ER diagram (Mermaid + attributes): [`er-diagram.md`](./er-diagram.md)

## UI → table map

| UI surface | Tables |
|---|---|
| Login (customer / manager / admin) | `users.role` |
| Customer · room list + filters | `rooms`, `room_amenities`, `amenities`, `room_month_settings`, `bookings`, `room_blocks` |
| Customer · add to cart | `cart_items` |
| Customer · checkout + Razorpay | `orders`, `payments`, `bookings` |
| Customer · my bookings | `bookings` (+ `orders` / `payments`) |
| Manager · modify / cancel | `bookings`, `booking_events` |
| Manager · walk-in | `orders` (`source=walk-in`), `bookings` (`provider` often `cash`) |
| Manager · block rooms | `room_blocks` (+ `room_night_occupancy`) |
| Admin · base + monthly price | `rooms.base_price`, `room_month_settings.price_override` |
| Admin · monthly availability | `room_month_settings.is_available` |

## Design notes

### Date convention
- `check_in` inclusive, `check_out` **exclusive** (standard hotel-night model).
- A 2-night stay `2026-08-10` → `2026-08-12` occupies nights `10` and `11`.
- `room_blocks.end_date` is stored **inclusive** of the last blocked day (matches the manager UI range). Convert carefully when writing occupancy rows.

### Money
- All amounts are `DECIMAL(12,2)` in **INR**.
- Cart and booking rows store **price snapshots** (`price_per_night`, `total_amount`) so later admin price changes do not rewrite history.

### Monthly admin settings
- One row per `(room_id, month_start)` where `month_start` is always the 1st.
- Missing row ⇒ treat as **available** at `rooms.base_price` (same as the React seed defaults).
- `price_override IS NULL` ⇒ use base price.

### Overlap prevention
MySQL cannot express “no overlapping ranges” with a simple UNIQUE constraint. Use either:

1. **`room_night_occupancy`** (recommended) — one row per occupied night; `UNIQUE (room_id, stay_date)` makes double-booking impossible, or  
2. Application checks + transaction (`SELECT … FOR UPDATE` on the room) matching the current React logic.

When creating/modifying a booking or block, insert/replace occupancy nights inside the same transaction.

### Razorpay flow (online)
1. Create `orders` (`pending_payment`) + draft `bookings` **or** hold cart until payment succeeds.  
2. Create `payments` row + Razorpay order (`razorpay_order_id`).  
3. On verified webhook/checkout success: set `payments.status=captured`, `orders.status=paid`, confirm `bookings`, clear `cart_items`, write `room_night_occupancy`.

Walk-ins skip Razorpay: `orders.source='walk-in'`, `payments.provider='cash'` (or no payment row if you settle at desk later).

### IDs
- Internal `BIGINT` PKs for joins.
- `public_id CHAR(26)` (ULID) for API/UI URLs so you do not expose auto-increment ids.

## Suggested indexes already in DDL
- Room search: `rooms(room_type)`, month grid: `room_month_settings(month_start, is_available)`
- Availability scans: `bookings(room_id, check_in, check_out)`, `room_blocks(room_id, start_date, end_date)`
- Customer history: `bookings(guest_email)`, `bookings(user_id)`
- Payment idempotency: unique `payments.razorpay_payment_id`

## Apply

```bash
psql -U hotel_os -d hotel_os -f db/schema.sql
```
