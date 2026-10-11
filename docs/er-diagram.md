# Hotel OS — ER diagram

PostgreSQL entity-relationship diagram for [`../db/schema.sql`](../db/schema.sql).

## Full ERD

```mermaid
erDiagram
  users ||--o{ cart_items : "has cart"
  users ||--o{ orders : "places or staff-creates"
  users ||--o{ bookings : "owns"
  users ||--o{ room_blocks : "creates"
  users ||--o{ room_month_settings : "updates"
  users ||--o{ booking_events : "acts"

  rooms ||--o{ room_amenities : "has"
  amenities ||--o{ room_amenities : "tagged on"
  rooms ||--o{ room_month_settings : "monthly settings"
  rooms ||--o{ room_blocks : "blocked"
  rooms ||--o{ cart_items : "in cart"
  rooms ||--o{ bookings : "reserved"
  rooms ||--o{ room_night_occupancy : "occupied nights"

  orders ||--o{ payments : "paid via"
  orders ||--|{ bookings : "contains stays"

  bookings ||--o{ booking_events : "audit trail"

  users {
    BIGINT id PK
    CHAR public_id UK
    VARCHAR full_name
    VARCHAR email UK
    VARCHAR password_hash
    VARCHAR phone
    ENUM role
    TINYINT is_active
    DATETIME created_at
    DATETIME updated_at
  }

  rooms {
    BIGINT id PK
    CHAR public_id UK
    VARCHAR room_number UK
    VARCHAR name
    ENUM room_type
    TEXT description
    TINYINT capacity
    VARCHAR image_url
    DECIMAL base_price
    TINYINT is_active
  }

  amenities {
    BIGINT id PK
    VARCHAR code UK
    VARCHAR label
  }

  room_amenities {
    BIGINT room_id PK_FK
    BIGINT amenity_id PK_FK
  }

  room_month_settings {
    BIGINT id PK
    BIGINT room_id FK
    DATE month_start
    TINYINT is_available
    DECIMAL price_override
    BIGINT updated_by FK
  }

  room_blocks {
    BIGINT id PK
    CHAR public_id UK
    BIGINT room_id FK
    DATE start_date
    DATE end_date
    VARCHAR reason
    BIGINT created_by FK
    DATETIME deleted_at
  }

  cart_items {
    BIGINT id PK
    BIGINT user_id FK
    BIGINT room_id FK
    DATE check_in
    DATE check_out
    SMALLINT nights
    DECIMAL price_per_night
    DECIMAL total_amount
  }

  orders {
    BIGINT id PK
    CHAR public_id UK
    BIGINT user_id FK
    VARCHAR guest_name
    VARCHAR guest_email
    VARCHAR guest_phone
    CHAR currency
    DECIMAL subtotal_amount
    DECIMAL total_amount
    ENUM status
    ENUM source
    BIGINT created_by FK
  }

  payments {
    BIGINT id PK
    CHAR public_id UK
    BIGINT order_id FK
    ENUM provider
    DECIMAL amount
    ENUM status
    VARCHAR razorpay_order_id
    VARCHAR razorpay_payment_id UK
    VARCHAR razorpay_signature
    JSON raw_payload
    DATETIME paid_at
  }

  bookings {
    BIGINT id PK
    CHAR public_id UK
    BIGINT order_id FK
    BIGINT room_id FK
    BIGINT user_id FK
    VARCHAR guest_name
    VARCHAR guest_email
    DATE check_in
    DATE check_out
    SMALLINT nights
    DECIMAL total_amount
    ENUM status
    ENUM source
  }

  booking_events {
    BIGINT id PK
    BIGINT booking_id FK
    BIGINT actor_user_id FK
    ENUM event_type
    JSON before_json
    JSON after_json
    VARCHAR note
    DATETIME created_at
  }

  room_night_occupancy {
    BIGINT id PK
    BIGINT room_id FK
    DATE stay_date
    ENUM source_type
    BIGINT source_id
  }
```

## Domain groups

| Domain | Tables |
|---|---|
| Auth | `users` |
| Inventory | `rooms`, `amenities`, `room_amenities` |
| Admin | `room_month_settings` |
| Manager | `room_blocks` |
| Customer cart | `cart_items` |
| Checkout / payments | `orders`, `payments`, `bookings` |
| Audit | `booking_events` |
| Availability lock | `room_night_occupancy` |

## Cardinality highlights

- One **order** → many **bookings** (multi-room cart checkout)
- One **order** → many **payments** (retries / partials; usually one captured Razorpay payment)
- One **room** + one **stay_date** → at most one **room_night_occupancy** row (prevents double booking)
- **rooms** ↔ **amenities** via **room_amenities** (M:N)
