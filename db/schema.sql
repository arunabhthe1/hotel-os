-- Hotel OS — MySQL 8.0+ schema
-- Charset/collation chosen for case-insensitive email uniqueness and INR text.

CREATE DATABASE IF NOT EXISTS hotel_os
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE hotel_os;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- Reference / auth
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     CHAR(26)        NOT NULL COMMENT 'ULID/UUID exposed to API',
  full_name     VARCHAR(120)    NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  phone         VARCHAR(32)     NULL,
  role          ENUM('customer', 'manager', 'admin') NOT NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_public_id (public_id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Inventory: rooms + amenities
-- ---------------------------------------------------------------------------

CREATE TABLE rooms (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     CHAR(26)        NOT NULL,
  room_number   VARCHAR(16)     NOT NULL,
  name          VARCHAR(120)    NOT NULL,
  room_type     ENUM('standard', 'deluxe', 'suite', 'presidential') NOT NULL,
  description   TEXT            NOT NULL,
  capacity      TINYINT UNSIGNED NOT NULL,
  image_url     VARCHAR(500)    NOT NULL,
  base_price    DECIMAL(12, 2)  NOT NULL COMMENT 'INR per night default',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                              ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_rooms_public_id (public_id),
  UNIQUE KEY uq_rooms_room_number (room_number),
  KEY idx_rooms_type (room_type),
  CONSTRAINT chk_rooms_capacity CHECK (capacity >= 1),
  CONSTRAINT chk_rooms_base_price CHECK (base_price > 0)
) ENGINE=InnoDB;

CREATE TABLE amenities (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code       VARCHAR(64)     NOT NULL,
  label      VARCHAR(120)    NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_amenities_code (code)
) ENGINE=InnoDB;

CREATE TABLE room_amenities (
  room_id     BIGINT UNSIGNED NOT NULL,
  amenity_id  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (room_id, amenity_id),
  CONSTRAINT fk_room_amenities_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_room_amenities_amenity
    FOREIGN KEY (amenity_id) REFERENCES amenities (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Admin portal: monthly open/close + optional price override
-- month_key uses first day of month (e.g. 2026-08-01) for clean DATE indexing.
CREATE TABLE room_month_settings (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id         BIGINT UNSIGNED NOT NULL,
  month_start     DATE            NOT NULL COMMENT 'Always day 1 of calendar month',
  is_available    TINYINT(1)      NOT NULL DEFAULT 1,
  price_override  DECIMAL(12, 2)  NULL COMMENT 'NULL => use rooms.base_price',
  updated_by      BIGINT UNSIGNED NULL,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_month (room_id, month_start),
  KEY idx_room_month_available (month_start, is_available),
  CONSTRAINT fk_room_month_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_room_month_updated_by
    FOREIGN KEY (updated_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_room_month_day
    CHECK (DAY(month_start) = 1),
  CONSTRAINT chk_room_month_price
    CHECK (price_override IS NULL OR price_override > 0)
) ENGINE=InnoDB;

-- Manager portal: take a room offline for a date range (inclusive dates)
CREATE TABLE room_blocks (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id     CHAR(26)        NOT NULL,
  room_id       BIGINT UNSIGNED NOT NULL,
  start_date    DATE            NOT NULL,
  end_date      DATE            NOT NULL COMMENT 'Inclusive last blocked night/day',
  reason        VARCHAR(255)    NOT NULL,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at    DATETIME(3)     NULL COMMENT 'Soft remove when manager unblocks',
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_blocks_public_id (public_id),
  KEY idx_room_blocks_range (room_id, start_date, end_date),
  KEY idx_room_blocks_active (room_id, deleted_at),
  CONSTRAINT fk_room_blocks_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_room_blocks_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_room_blocks_range CHECK (end_date >= start_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Customer cart (persisted per logged-in user)
-- ---------------------------------------------------------------------------

CREATE TABLE cart_items (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  room_id          BIGINT UNSIGNED NOT NULL,
  check_in         DATE            NOT NULL,
  check_out        DATE            NOT NULL COMMENT 'Exclusive end date (hotel night model)',
  nights           SMALLINT UNSIGNED NOT NULL,
  price_per_night  DECIMAL(12, 2)  NOT NULL COMMENT 'Snapshot at add-to-cart time',
  total_amount     DECIMAL(12, 2)  NOT NULL,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_user_room (user_id, room_id),
  KEY idx_cart_user (user_id),
  CONSTRAINT fk_cart_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cart_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_cart_dates CHECK (check_out > check_in),
  CONSTRAINT chk_cart_nights CHECK (nights >= 1),
  CONSTRAINT chk_cart_amounts CHECK (price_per_night > 0 AND total_amount > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Checkout / Razorpay
-- One order can contain multiple room stays (multi-item cart).
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id       CHAR(26)        NOT NULL,
  user_id         BIGINT UNSIGNED NULL COMMENT 'NULL for pure walk-in without account',
  guest_name      VARCHAR(120)    NOT NULL,
  guest_email     VARCHAR(255)    NOT NULL,
  guest_phone     VARCHAR(32)     NOT NULL,
  currency        CHAR(3)         NOT NULL DEFAULT 'INR',
  subtotal_amount DECIMAL(12, 2)  NOT NULL,
  total_amount    DECIMAL(12, 2)  NOT NULL,
  status          ENUM(
                    'pending_payment',
                    'paid',
                    'failed',
                    'cancelled',
                    'refunded'
                  ) NOT NULL DEFAULT 'pending_payment',
  source          ENUM('online', 'walk-in', 'manager') NOT NULL,
  notes           VARCHAR(500)    NULL,
  created_by      BIGINT UNSIGNED NULL COMMENT 'Manager user for walk-in/manager bookings',
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_public_id (public_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status),
  KEY idx_orders_guest_email (guest_email),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_orders_amounts CHECK (subtotal_amount >= 0 AND total_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id             CHAR(26)        NOT NULL,
  order_id              BIGINT UNSIGNED NOT NULL,
  provider              ENUM('razorpay', 'cash', 'card_at_desk', 'other')
                                          NOT NULL DEFAULT 'razorpay',
  amount                DECIMAL(12, 2)  NOT NULL,
  currency              CHAR(3)         NOT NULL DEFAULT 'INR',
  status                ENUM(
                          'created',
                          'authorized',
                          'captured',
                          'failed',
                          'refunded'
                        ) NOT NULL DEFAULT 'created',
  razorpay_order_id     VARCHAR(64)     NULL,
  razorpay_payment_id   VARCHAR(64)     NULL,
  razorpay_signature    VARCHAR(255)    NULL,
  failure_reason        VARCHAR(255)    NULL,
  raw_payload           JSON            NULL,
  paid_at               DATETIME(3)     NULL,
  created_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                      ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_public_id (public_id),
  UNIQUE KEY uq_payments_razorpay_payment_id (razorpay_payment_id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_razorpay_order (razorpay_order_id),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

-- One booking = one room stay. Linked to an order (online or walk-in).
CREATE TABLE bookings (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id        CHAR(26)        NOT NULL,
  order_id         BIGINT UNSIGNED NOT NULL,
  room_id          BIGINT UNSIGNED NOT NULL,
  user_id          BIGINT UNSIGNED NULL COMMENT 'Owning customer account when applicable',
  guest_name       VARCHAR(120)    NOT NULL,
  guest_email      VARCHAR(255)    NOT NULL,
  guest_phone      VARCHAR(32)     NOT NULL,
  check_in         DATE            NOT NULL,
  check_out        DATE            NOT NULL COMMENT 'Exclusive end date',
  nights           SMALLINT UNSIGNED NOT NULL,
  price_per_night  DECIMAL(12, 2)  NOT NULL,
  total_amount     DECIMAL(12, 2)  NOT NULL,
  status           ENUM('confirmed', 'modified', 'cancelled', 'checked_in', 'checked_out')
                                   NOT NULL DEFAULT 'confirmed',
  source           ENUM('online', 'walk-in', 'manager') NOT NULL,
  notes            VARCHAR(500)    NULL,
  cancelled_at     DATETIME(3)     NULL,
  cancelled_by     BIGINT UNSIGNED NULL,
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                                 ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_public_id (public_id),
  KEY idx_bookings_room_dates (room_id, check_in, check_out),
  KEY idx_bookings_user (user_id),
  KEY idx_bookings_guest_email (guest_email),
  KEY idx_bookings_status (status),
  KEY idx_bookings_order (order_id),
  CONSTRAINT fk_bookings_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_bookings_cancelled_by
    FOREIGN KEY (cancelled_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_bookings_dates CHECK (check_out > check_in),
  CONSTRAINT chk_bookings_nights CHECK (nights >= 1),
  CONSTRAINT chk_bookings_amounts CHECK (price_per_night > 0 AND total_amount > 0)
) ENGINE=InnoDB;

-- Audit trail for manager modify/cancel actions
CREATE TABLE booking_events (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id    BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  event_type    ENUM(
                  'created',
                  'modified',
                  'cancelled',
                  'payment_linked',
                  'checked_in',
                  'checked_out'
                ) NOT NULL,
  before_json   JSON            NULL,
  after_json    JSON            NULL,
  note          VARCHAR(500)    NULL,
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_booking_events_booking (booking_id, created_at),
  CONSTRAINT fk_booking_events_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_booking_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Optional helper: materialize occupied nights for overlap checks / reporting.
-- Populate from bookings (non-cancelled) and room_blocks in application or triggers.
CREATE TABLE room_night_occupancy (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id       BIGINT UNSIGNED NOT NULL,
  stay_date     DATE            NOT NULL COMMENT 'Occupied night (check_in inclusive, check_out exclusive)',
  source_type   ENUM('booking', 'block') NOT NULL,
  source_id     BIGINT UNSIGNED NOT NULL COMMENT 'bookings.id or room_blocks.id',
  created_at    DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_night (room_id, stay_date),
  KEY idx_occupancy_source (source_type, source_id),
  CONSTRAINT fk_occupancy_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Views used by UI screens
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_room_effective_price AS
SELECT
  r.id AS room_id,
  r.room_number,
  r.name,
  r.room_type,
  r.base_price,
  rms.month_start,
  rms.is_available,
  COALESCE(rms.price_override, r.base_price) AS effective_price
FROM rooms r
LEFT JOIN room_month_settings rms ON rms.room_id = r.id
WHERE r.is_active = 1;

CREATE OR REPLACE VIEW v_active_bookings AS
SELECT
  b.*,
  r.room_number,
  r.name AS room_name,
  o.public_id AS order_public_id
FROM bookings b
JOIN rooms r ON r.id = b.room_id
JOIN orders o ON o.id = b.order_id
WHERE b.status <> 'cancelled';
