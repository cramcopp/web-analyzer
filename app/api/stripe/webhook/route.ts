import { NextResponse } from 'next/server';
import { getStripe, type PlanType, verifyStripeSignature } from '@/lib/stripe';
import { updateStripeSubscription } from '@/lib/firestore-edge';
import { getMonthlyScanLimit } from '@/lib/plans';

export const runtime = 'nodejs';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: 'Missing signature or endpoint secret' }, { status: 400 });
  }

  const isValid = await verifyStripeSignature(body, sig, endpointSecret);
  if (!isValid) {
    console.error('Invalid Stripe signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const uid = session.client_reference_id || session.metadata?.uid;
        const plan = (session.metadata?.plan || 'free') as PlanType;

        if (uid) {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
          const maxScans = getMonthlyScanLimit(plan);
          
          await updateStripeSubscription(uid, {
            plan,
            subscriptionId: session.subscription as string,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            maxScans
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const uid = subscription.metadata.uid;

        if (uid) {
          await updateStripeSubscription(uid, {
            plan: 'free',
            subscriptionId: null,
            trialUntil: null,
            maxScans: getMonthlyScanLimit('free')
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const uid = subscription.metadata.uid;
        const plan = (subscription.metadata.plan || 'free') as PlanType;

        if (uid) {
          const maxScans = getMonthlyScanLimit(plan);
          await updateStripeSubscription(uid, {
            plan,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            subscriptionId: subscription.id,
            maxScans
          });
        }
        break;
      }

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Firestore Update Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Firestore Update Error' }, { status: 500 });
  }
}
