import type { Booking, MonthlyAvailability, Room, RoomBlock, User } from '../types';

export const DEMO_USERS: User[] = [
  {
    id: 'u-customer',
    name: 'Aisha Mehta',
    email: 'customer@hotel.com',
    password: 'customer123',
    role: 'customer',
  },
  {
    id: 'u-manager',
    name: 'Rohan Kapoor',
    email: 'manager@hotel.com',
    password: 'manager123',
    role: 'manager',
  },
  {
    id: 'u-admin',
    name: 'Priya Sharma',
    email: 'admin@hotel.com',
    password: 'admin123',
    role: 'admin',
  },
];

export const SEED_ROOMS: Room[] = [
  {
    id: 'room-101',
    number: '101',
    name: 'Garden Standard',
    type: 'standard',
    description: 'Quiet courtyard view with crisp linens and a workspace for short stays.',
    capacity: 2,
    amenities: ['Wi-Fi', 'AC', 'Work desk', 'Tea kettle'],
    image:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    basePrice: 4500,
  },
  {
    id: 'room-102',
    number: '102',
    name: 'City Standard',
    type: 'standard',
    description: 'Street-facing room with soft lighting and a compact lounge corner.',
    capacity: 2,
    amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Mini fridge'],
    image:
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80',
    basePrice: 4800,
  },
  {
    id: 'room-201',
    number: '201',
    name: 'Palm Deluxe',
    type: 'deluxe',
    description: 'Spacious deluxe with balcony seating and rainfall shower.',
    capacity: 3,
    amenities: ['Wi-Fi', 'Balcony', 'Rain shower', 'Mini bar'],
    image:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    basePrice: 7200,
  },
  {
    id: 'room-202',
    number: '202',
    name: 'Harbour Deluxe',
    type: 'deluxe',
    description: 'Corner deluxe with seating alcove and curated local amenities.',
    capacity: 3,
    amenities: ['Wi-Fi', 'Lounge chair', 'Bathrobe', 'Coffee machine'],
    image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    basePrice: 7800,
  },
  {
    id: 'room-301',
    number: '301',
    name: 'Lotus Suite',
    type: 'suite',
    description: 'Separate living area, king bed, and panoramic evening light.',
    capacity: 4,
    amenities: ['Wi-Fi', 'Living room', 'Kitchenette', 'Bathtub'],
    image:
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    basePrice: 12500,
  },
  {
    id: 'room-401',
    number: '401',
    name: 'Aurora Presidential',
    type: 'presidential',
    description: 'Top-floor residence with dining space and private concierge access.',
    capacity: 5,
    amenities: ['Wi-Fi', 'Dining area', 'Butler service', 'Private lounge'],
    image:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    basePrice: 28000,
  },
];

function monthKeys(count = 12): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
  }
  return keys;
}

export function buildSeedAvailability(rooms: Room[] = SEED_ROOMS): MonthlyAvailability[] {
  const months = monthKeys(12);
  return rooms.flatMap((room) =>
    months.map((month) => ({
      roomId: room.id,
      month,
      available: true,
      priceOverride: undefined,
    })),
  );
}

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export const SEED_BOOKINGS: Booking[] = [
  {
    id: 'bk-1001',
    roomId: 'room-101',
    guestName: 'Aisha Mehta',
    guestEmail: 'customer@hotel.com',
    guestPhone: '+91 98765 43210',
    checkIn: iso(3),
    checkOut: iso(5),
    nights: 2,
    totalAmount: 9000,
    status: 'confirmed',
    source: 'online',
    paymentId: 'pay_demo_1001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bk-1002',
    roomId: 'room-201',
    guestName: 'Vikram Nair',
    guestEmail: 'vikram@example.com',
    guestPhone: '+91 99887 66554',
    checkIn: iso(7),
    checkOut: iso(10),
    nights: 3,
    totalAmount: 21600,
    status: 'confirmed',
    source: 'walk-in',
    createdAt: new Date().toISOString(),
    notes: 'Arriving late evening',
  },
];

export const SEED_BLOCKS: RoomBlock[] = [
  {
    id: 'bl-1',
    roomId: 'room-401',
    startDate: iso(12),
    endDate: iso(14),
    reason: 'Maintenance — HVAC service',
    createdAt: new Date().toISOString(),
  },
];
