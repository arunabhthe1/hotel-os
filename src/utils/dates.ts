import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { Booking, MonthlyAvailability, Room, RoomBlock } from '../types';

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(0, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)));
}

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  // End date is exclusive for hotel nights
  const aS = parseISO(aStart);
  const aE = addDays(parseISO(aEnd), -1);
  const bS = parseISO(bStart);
  const bE = addDays(parseISO(bEnd), -1);
  if (isBefore(aE, aS) || isBefore(bE, bS)) return false;
  return aS <= bE && bS <= aE;
}

export function getPriceForNight(
  room: Room,
  nightDate: string,
  availability: MonthlyAvailability[],
): number | null {
  const month = monthKeyFromDate(nightDate);
  const row = availability.find((a) => a.roomId === room.id && a.month === month);
  if (!row || !row.available) return null;
  return row.priceOverride ?? room.basePrice;
}

export function getStayQuote(
  room: Room,
  checkIn: string,
  checkOut: string,
  availability: MonthlyAvailability[],
): { nights: number; total: number; pricePerNight: number; unavailable: boolean } {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return { nights: 0, total: 0, pricePerNight: room.basePrice, unavailable: true };
  }

  let total = 0;
  const stayNights = eachDayOfInterval({
    start: parseISO(checkIn),
    end: addDays(parseISO(checkOut), -1),
  });

  for (const night of stayNights) {
    const price = getPriceForNight(room, toISODate(night), availability);
    if (price === null) {
      return { nights, total: 0, pricePerNight: room.basePrice, unavailable: true };
    }
    total += price;
  }

  return {
    nights,
    total,
    pricePerNight: Math.round(total / nights),
    unavailable: false,
  };
}

export function isRoomBlocked(
  roomId: string,
  checkIn: string,
  checkOut: string,
  blocks: RoomBlock[],
): boolean {
  return blocks.some(
    (b) => b.roomId === roomId && dateRangesOverlap(checkIn, checkOut, b.startDate, b.endDate),
  );
}

export function isRoomBooked(
  roomId: string,
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  excludeBookingId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.roomId === roomId &&
      b.status !== 'cancelled' &&
      b.id !== excludeBookingId &&
      dateRangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut),
  );
}

export function isRoomAvailableForStay(
  room: Room,
  checkIn: string,
  checkOut: string,
  availability: MonthlyAvailability[],
  bookings: Booking[],
  blocks: RoomBlock[],
  excludeBookingId?: string,
): boolean {
  if (nightsBetween(checkIn, checkOut) <= 0) return false;
  const quote = getStayQuote(room, checkIn, checkOut, availability);
  if (quote.unavailable) return false;
  if (isRoomBlocked(room.id, checkIn, checkOut, blocks)) return false;
  if (isRoomBooked(room.id, checkIn, checkOut, bookings, excludeBookingId)) return false;
  return true;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDisplayDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd MMM yyyy');
}

export function todayISO(): string {
  return toISODate(startOfDay(new Date()));
}

export function defaultCheckout(checkIn: string): string {
  return toISODate(addDays(parseISO(checkIn), 1));
}

export function isDateInMonth(dateStr: string, monthKey: string): boolean {
  return monthKeyFromDate(dateStr) === monthKey;
}

export function stayTouchesMonth(checkIn: string, checkOut: string, monthKey: string): boolean {
  const [y, m] = monthKey.split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);
  return isWithinInterval(parseISO(checkIn), { start: monthStart, end: monthEnd })
    || isWithinInterval(addDays(parseISO(checkOut), -1), { start: monthStart, end: monthEnd })
    || (parseISO(checkIn) <= monthStart && parseISO(checkOut) > monthEnd);
}
