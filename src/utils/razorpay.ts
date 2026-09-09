export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Razorpay failed to load'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export function getRazorpayKey(): string {
  return import.meta.env.VITE_RAZORPAY_KEY_ID?.trim() || '';
}

/** Opens Razorpay Checkout when a key is set; otherwise simulates a successful test payment. */
export async function openRazorpayCheckout(params: {
  amountInr: number;
  name: string;
  email: string;
  contact: string;
  description: string;
  onSuccess: (paymentId: string) => void;
  onDismiss?: () => void;
}): Promise<'opened' | 'simulated'> {
  const key = getRazorpayKey();

  if (!key) {
    const paymentId = `pay_sim_${Date.now()}`;
    await new Promise((r) => setTimeout(r, 600));
    params.onSuccess(paymentId);
    return 'simulated';
  }

  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error('Razorpay SDK unavailable');
  }

  const rzp = new window.Razorpay({
    key,
    amount: Math.round(params.amountInr * 100),
    currency: 'INR',
    name: 'Hotel OS',
    description: params.description,
    handler: (response) => params.onSuccess(response.razorpay_payment_id),
    prefill: {
      name: params.name,
      email: params.email,
      contact: params.contact,
    },
    theme: { color: '#1a5c45' },
    modal: { ondismiss: params.onDismiss },
  });

  rzp.open();
  return 'opened';
}
