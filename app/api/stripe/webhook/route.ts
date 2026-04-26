import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { updateStripeSubscription } from '@/lib/firestore-edge';
import Stripe from 'stripe';

export const runtime = 'edge';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing signature or endpoint secret');
    }
    event = getStripe().webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.client_reference_id || session.metadata?.uid;
        const plan = session.metadata?.plan;

        if (uid && plan) {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
          
          const maxScans = plan === 'agency' ? 500 : plan === 'pro' ? 50 : 5;
          
          await updateStripeSubscription(uid, {
            plan: plan,
            subscriptionId: session.subscription as string,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            maxScans: maxScans
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const uid = subscription.metadata.uid;

        if (uid) {
          await updateStripeSubscription(uid, {
            plan: 'free',
            subscriptionId: null,
            trialUntil: null,
            maxScans: 5
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const uid = subscription.metadata.uid;
        const plan = subscription.metadata.plan;

        if (uid && plan) {
          const maxScans = plan === 'agency' ? 500 : plan === 'pro' ? 50 : 5;
          await updateStripeSubscription(uid, {
            plan: plan,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            subscriptionId: subscription.id,
            maxScans: maxScans
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Firestore Update Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Firestore Update Error' }, { status: 500 });
  }
}
