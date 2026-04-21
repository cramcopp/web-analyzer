import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

// Plan and Interval to Price ID mapping
const PRICE_MATRIX: Record<string, Record<string, string>> = {
  'pro': {
    'monthly': 'price_1TOWNMAiEzlpZspHdnioXyTY',
    'yearly': 'price_1TOWNyAiEzlpZspH4FazLWo1'
  },
  'agency': {
    'monthly': 'price_1TOWORAiEzlpZspH8oht4Gyz',
    'yearly': 'price_1TOWOyAiEzlpZspH400JzRjm'
  }
};

export async function POST(req: Request) {
  try {
    const { priceId, planName, interval = 'monthly', uid, userEmail } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the correct Price ID from matrix or fallback to provided priceId
    const stripePriceId = PRICE_MATRIX[planName]?.[interval] || priceId;

    if (!stripePriceId) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: planName === 'pro' ? 7 : undefined, // Trial applies to Pro regardless of interval
        metadata: {
          uid: uid,
          plan: planName,
          interval: interval
        }
      },
      client_reference_id: uid,
      customer_email: userEmail,
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/`,
      metadata: {
        uid: uid,
        plan: planName,
        interval: interval
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
