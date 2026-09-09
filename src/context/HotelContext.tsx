import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  buildSeedAvailability,
  SEED_BLOCKS,
  SEED_BOOKINGS,
  SEED_ROOMS,
} from '../data/seed';
import type {
  Booking,
  CartItem,
  HotelState,
  MonthlyAvailability,
  Room,
  RoomBlock,
} from '../types';
import { getStayQuote, isRoomAvailableForStay, nightsBetween } from '../utils/dates';

interface HotelContextValue {
  rooms: Room[];
  availability: MonthlyAvailability[];
  bookings: Booking[];
  blocks: RoomBlock[];
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'nights' | 'pricePerNight' | 'totalAmount'>) => {
    ok: boolean;
    error?: string;
  };
  removeFromCart: (roomId: string) => void;
  clearCart: () => void;
  createBooking: (input: {
    roomId: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    checkIn: string;
    checkOut: string;
    source: Booking['source'];
    paymentId?: string;
    notes?: string;
  }) => { ok: true; booking: Booking } | { ok: false; error: string };
  modifyBooking: (
    bookingId: string,
    patch: Partial<Pick<Booking, 'checkIn' | 'checkOut' | 'roomId' | 'guestName' | 'guestPhone' | 'notes'>>,
  ) => { ok: true; booking: Booking } | { ok: false; error: string };
  cancelBooking: (bookingId: string) => void;
  blockRoom: (input: {
    roomId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => { ok: true } | { ok: false; error: string };
  removeBlock: (blockId: string) => void;
  setRoomPrice: (roomId: string, month: string, price: number) => void;
  setRoomBasePrice: (roomId: string, price: number) => void;
  setMonthAvailability: (roomId: string, month: string, available: boolean) => void;
  getRoom: (roomId: string) => Room | undefined;
  resetDemoData: () => void;
}

const HotelContext = createContext<HotelContextValue | null>(null);
const STATE_KEY = 'hotel-os-state';
const CART_KEY = 'hotel-os-cart';

function buildInitialState(): HotelState {
  return {
    rooms: SEED_ROOMS,
    availability: buildSeedAvailability(SEED_ROOMS),
    bookings: SEED_BOOKINGS,
    blocks: SEED_BLOCKS,
  };
}

function readState(): HotelState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return buildInitialState();
    const parsed = JSON.parse(raw) as HotelState;
    if (!parsed.rooms?.length) return buildInitialState();
    return parsed;
  } catch {
    return buildInitialState();
  }
}

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function persistState(state: HotelState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function persistCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function ensureAvailabilityRow(
  availability: MonthlyAvailability[],
  roomId: string,
  month: string,
): MonthlyAvailability[] {
  const exists = availability.some((a) => a.roomId === roomId && a.month === month);
  if (exists) return availability;
  return [...availability, { roomId, month, available: true }];
}

export function HotelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HotelState>(() => readState());
  const [cart, setCart] = useState<CartItem[]>(() => readCart());

  const updateState = useCallback((updater: (prev: HotelState) => HotelState) => {
    setState((prev) => {
      const next = updater(prev);
      persistState(next);
      return next;
    });
  }, []);

  const updateCart = useCallback((updater: (prev: CartItem[]) => CartItem[]) => {
    setCart((prev) => {
      const next = updater(prev);
      persistCart(next);
      return next;
    });
  }, []);

  const getRoom = useCallback(
    (roomId: string) => state.rooms.find((r) => r.id === roomId),
    [state.rooms],
  );

  const addToCart = useCallback(
    (item: Omit<CartItem, 'nights' | 'pricePerNight' | 'totalAmount'>) => {
      const room = state.rooms.find((r) => r.id === item.roomId);
      if (!room) return { ok: false, error: 'Room not found' };

      const available = isRoomAvailableForStay(
        room,
        item.checkIn,
        item.checkOut,
        state.availability,
        state.bookings,
        state.blocks,
      );
      if (!available) {
        return { ok: false, error: 'Room is not available for the selected dates' };
      }

      const quote = getStayQuote(room, item.checkIn, item.checkOut, state.availability);
      if (quote.unavailable || quote.nights <= 0) {
        return { ok: false, error: 'Invalid stay dates or pricing unavailable' };
      }

      updateCart((prev) => {
        const without = prev.filter((c) => c.roomId !== item.roomId);
        return [
          ...without,
          {
            roomId: item.roomId,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            nights: quote.nights,
            pricePerNight: quote.pricePerNight,
            totalAmount: quote.total,
          },
        ];
      });

      return { ok: true };
    },
    [state, updateCart],
  );

  const removeFromCart = useCallback(
    (roomId: string) => updateCart((prev) => prev.filter((c) => c.roomId !== roomId)),
    [updateCart],
  );

  const clearCart = useCallback(() => updateCart(() => []), [updateCart]);

  const createBooking = useCallback(
    (input: {
      roomId: string;
      guestName: string;
      guestEmail: string;
      guestPhone: string;
      checkIn: string;
      checkOut: string;
      source: Booking['source'];
      paymentId?: string;
      notes?: string;
    }) => {
      let outcome: { ok: true; booking: Booking } | { ok: false; error: string } = {
        ok: false,
        error: 'Unable to create booking',
      };

      updateState((prev) => {
        const room = prev.rooms.find((r) => r.id === input.roomId);
        if (!room) {
          outcome = { ok: false, error: 'Room not found' };
          return prev;
        }

        const available = isRoomAvailableForStay(
          room,
          input.checkIn,
          input.checkOut,
          prev.availability,
          prev.bookings,
          prev.blocks,
        );
        if (!available) {
          outcome = { ok: false, error: 'Room is not available for those dates' };
          return prev;
        }

        const quote = getStayQuote(room, input.checkIn, input.checkOut, prev.availability);
        const booking: Booking = {
          id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          roomId: input.roomId,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          nights: quote.nights,
          totalAmount: quote.total,
          status: 'confirmed',
          source: input.source,
          paymentId: input.paymentId,
          createdAt: new Date().toISOString(),
          notes: input.notes,
        };

        outcome = { ok: true, booking };
        return { ...prev, bookings: [booking, ...prev.bookings] };
      });

      return outcome;
    },
    [updateState],
  );

  const modifyBooking = useCallback(
    (
      bookingId: string,
      patch: Partial<
        Pick<Booking, 'checkIn' | 'checkOut' | 'roomId' | 'guestName' | 'guestPhone' | 'notes'>
      >,
    ) => {
      const existing = state.bookings.find((b) => b.id === bookingId);
      if (!existing || existing.status === 'cancelled') {
        return { ok: false as const, error: 'Booking not found' };
      }

      const nextRoomId = patch.roomId ?? existing.roomId;
      const nextCheckIn = patch.checkIn ?? existing.checkIn;
      const nextCheckOut = patch.checkOut ?? existing.checkOut;
      const room = state.rooms.find((r) => r.id === nextRoomId);
      if (!room) return { ok: false as const, error: 'Room not found' };

      if (nightsBetween(nextCheckIn, nextCheckOut) <= 0) {
        return { ok: false as const, error: 'Check-out must be after check-in' };
      }

      const available = isRoomAvailableForStay(
        room,
        nextCheckIn,
        nextCheckOut,
        state.availability,
        state.bookings,
        state.blocks,
        bookingId,
      );
      if (!available) {
        return { ok: false as const, error: 'Room is not available for the updated dates' };
      }

      const quote = getStayQuote(room, nextCheckIn, nextCheckOut, state.availability);
      const updated: Booking = {
        ...existing,
        ...patch,
        roomId: nextRoomId,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        nights: quote.nights,
        totalAmount: quote.total,
        status: 'modified',
      };

      updateState((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) => (b.id === bookingId ? updated : b)),
      }));

      return { ok: true as const, booking: updated };
    },
    [state, updateState],
  );

  const cancelBooking = useCallback(
    (bookingId: string) => {
      updateState((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === bookingId ? { ...b, status: 'cancelled' as const } : b,
        ),
      }));
    },
    [updateState],
  );

  const blockRoom = useCallback(
    (input: { roomId: string; startDate: string; endDate: string; reason: string }) => {
      if (nightsBetween(input.startDate, input.endDate) < 0
        || input.startDate > input.endDate) {
        return { ok: false as const, error: 'Invalid block date range' };
      }

      const conflict = state.bookings.some(
        (b) =>
          b.roomId === input.roomId
          && b.status !== 'cancelled'
          && !(
            input.endDate <= b.checkIn
            || input.startDate >= b.checkOut
          ),
      );
      if (conflict) {
        return {
          ok: false as const,
          error: 'Cannot block: active booking overlaps this range',
        };
      }

      const block: RoomBlock = {
        id: `bl-${Date.now()}`,
        roomId: input.roomId,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        createdAt: new Date().toISOString(),
      };

      updateState((prev) => ({ ...prev, blocks: [block, ...prev.blocks] }));
      return { ok: true as const };
    },
    [state.bookings, updateState],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      updateState((prev) => ({
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId),
      }));
    },
    [updateState],
  );

  const setRoomPrice = useCallback(
    (roomId: string, month: string, price: number) => {
      updateState((prev) => {
        const availability = ensureAvailabilityRow(prev.availability, roomId, month).map((a) =>
          a.roomId === roomId && a.month === month
            ? { ...a, priceOverride: price }
            : a,
        );
        return { ...prev, availability };
      });
    },
    [updateState],
  );

  const setRoomBasePrice = useCallback(
    (roomId: string, price: number) => {
      updateState((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, basePrice: price } : r)),
      }));
    },
    [updateState],
  );

  const setMonthAvailability = useCallback(
    (roomId: string, month: string, available: boolean) => {
      updateState((prev) => {
        const availability = ensureAvailabilityRow(prev.availability, roomId, month).map((a) =>
          a.roomId === roomId && a.month === month ? { ...a, available } : a,
        );
        return { ...prev, availability };
      });
    },
    [updateState],
  );

  const resetDemoData = useCallback(() => {
    const fresh = buildInitialState();
    persistState(fresh);
    persistCart([]);
    setState(fresh);
    setCart([]);
  }, []);

  const value = useMemo(
    () => ({
      rooms: state.rooms,
      availability: state.availability,
      bookings: state.bookings,
      blocks: state.blocks,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      createBooking,
      modifyBooking,
      cancelBooking,
      blockRoom,
      removeBlock,
      setRoomPrice,
      setRoomBasePrice,
      setMonthAvailability,
      getRoom,
      resetDemoData,
    }),
    [
      state,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      createBooking,
      modifyBooking,
      cancelBooking,
      blockRoom,
      removeBlock,
      setRoomPrice,
      setRoomBasePrice,
      setMonthAvailability,
      getRoom,
      resetDemoData,
    ],
  );

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be used within HotelProvider');
  return ctx;
}
