# Hotel OS

React + TypeScript + Vite app for a single-property hotel with three portals:

| Role | Login | Features |
|------|-------|----------|
| **Customer** | `customer@hotel.com` / `customer123` | Browse rooms by date, add to cart, checkout, Razorpay payment |
| **Manager** | `manager@hotel.com` / `manager123` | Modify / cancel bookings, walk-in booking, block rooms |
| **Admin** | `admin@hotel.com` / `admin123` | Set base & monthly room prices, open/close rooms per month |

## Run

```bash
npm install
npm start
```

Open the URL Vite prints (usually `http://localhost:5173`).

Home page links:

- **Customer login** → `/login/customer` — `POST /api/auth/custlogin` + Google OAuth
- **Manager login** → `/login/manager` — `POST /api/auth/contolledlogin` (manager/admin only, no OAuth)

Point the frontend at the API with `VITE_API_BASE_URL` (default `http://localhost:8080`). Restart the API after enabling Google so OAuth routes load.

Google redirect URI on the API:

`http://localhost:8080/api/auth/custlogin/oauth2/code/google`

## Razorpay

1. Copy `.env.example` to `.env`
2. Set `VITE_RAZORPAY_KEY_ID` to your Razorpay **Key Id** (test or live)
3. Restart `npm run dev`

If the key is missing, checkout still works with a **simulated** successful payment so you can demo the flow offline.

> Production apps should create Razorpay orders on a backend and verify payment signatures server-side. This demo opens Checkout from the browser for integration illustration only.

## Data

Bookings, blocks, prices, availability, and cart are stored in `localStorage`. Use **Reset demo data** on the admin pricing page to restore seed inventory.

## Scripts

- `npm start` / `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
# hotel-os
