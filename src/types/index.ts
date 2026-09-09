export type Role = 'customer' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  /** Present only for local demo seeds; API auth does not return passwords. */
  password?: string;
}

export type RoomType = 'standard' | 'deluxe' | 'suite' | 'presidential';

export interface Room {
  id: string;
  number: string;
  name: string;
  type: RoomType;
  description: string;
  capacity: number;
  amenities: string[];
  image: string;
  basePrice: number;
}

export interface MonthlyAvailability {
  roomId: string;
  /** YYYY-MM */
  month: string;
  available: boolean;
  priceOverride?: number;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'modified';
export type BookingSource = 'online' | 'walk-in' | 'manager';

export interface Booking {
  id: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  status: BookingStatus;
  source: BookingSource;
  paymentId?: string;
  createdAt: string;
  notes?: string;
}

export interface RoomBlock {
  id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export interface CartItem {
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
}

export type InvoiceChargeType =
  | 'food'
  | 'laundry'
  | 'room_service'
  | 'minibar'
  | 'other';

export type InvoiceLineKind = 'stay' | InvoiceChargeType;

export interface InvoiceLineItem {
  id: string;
  kind: InvoiceLineKind;
  /** Service / stay night date (YYYY-MM-DD) */
  date: string;
  description: string;
  /** Taxable amount before GST */
  amount: number;
  /** GST rate as fraction, e.g. 0.18 */
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

/** @deprecated Prefer InvoiceLineItem; kept for older stored invoices */
export interface InvoiceCharge {
  id: string;
  type: InvoiceChargeType;
  description: string;
  amount: number;
  date?: string;
}

export interface InvoiceDiscount {
  amount: number;
  comment: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomId: string;
  roomLabel: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Sum of stay line bases (pre-tax) */
  roomRent: number;
  lineItems: InvoiceLineItem[];
  /** Legacy field — empty when lineItems present */
  charges?: InvoiceCharge[];
  discount: InvoiceDiscount;
  stayTaxTotal: number;
  foodTaxTotal: number;
  taxTotal: number;
  subtotal: number;
  grandTotal: number;
  notes?: string;
  generatedBy: string;
  createdAt: string;
}

export interface HotelState {
  rooms: Room[];
  availability: MonthlyAvailability[];
  bookings: Booking[];
  blocks: RoomBlock[];
}
