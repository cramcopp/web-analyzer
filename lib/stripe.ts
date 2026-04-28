
export type PlanType = 'free' | 'pro' | 'agency';

export const PLAN_CONFIG: Record<PlanType, { name: string; maxScans: number }> = {
  free: { name: 'Free', maxScans: 5 },
  pro: { name: 'Pro', maxScans: 50 },
  agency: { name: 'Agency', maxScans: 500 },
};

/**
 * Lightweight Stripe helper using fetch to avoid heavy SDK overhead.
 */
export const stripeRequest = async (path: string, options: RequestInit = {}) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY is missing');

  const url = `https://api.stripe.com/v1${path}`;
  const headers = {
    'Authorization': `Bearer ${secret}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Stripe API Error');
  }
  return response.json();
};

/**
 * SEC-11: Manual Webhook Signature Verification
 * Replaces Stripe SDK's constructEvent for Edge runtime.
 */
export async function verifyStripeSignature(body: string, sig: string, secret: string) {
  const parts = sig.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const signature = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    messageData
  );

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSignature === signature;
}

// Mocking the getStripe() structure for compatibility where possible
export const getStripe = () => ({
  checkout: {
    sessions: {
      create: (params: any) => stripeRequest('/checkout/sessions', {
        method: 'POST',
        body: new URLSearchParams(flattenStripeParams(params))
      })
    }
  },
  subscriptions: {
    retrieve: (id: string) => stripeRequest(`/subscriptions/${id}`)
  }
});

function flattenStripeParams(params: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenStripeParams(value, fullKey));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === 'object') {
          Object.assign(result, flattenStripeParams(v, `${fullKey}[${i}]`));
        } else {
          result[`${fullKey}[${i}]`] = String(v);
        }
      });
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}
