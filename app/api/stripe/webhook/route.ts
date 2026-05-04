import { NextResponse } from 'next/server';
import { getStripe, type PlanType, verifyStripeSignature } from '@/lib/stripe';
import { getMonthlyCrawlPageLimit, getMonthlyScanLimit, normalizeAddonKey, normalizePlan } from '@/lib/plans';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { updateCloudflareStripeAddonSubscription, updateCloudflareStripeSubscription } from '@/lib/cloudflare-storage';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

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

        if (session.metadata?.checkoutType === 'addon') {
          const addonKey = normalizeAddonKey(session.metadata?.addonKey);
          const quantity = Math.max(1, Math.floor(Number(session.metadata?.quantity) || 1));
          if (uid && addonKey && session.subscription) {
            const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
            const updated = await updateCloudflareStripeAddonSubscription(env, uid, {
              subscriptionId: subscription.id,
              addonKey,
              quantity,
              status: subscription.status,
              active: subscription.status === 'active' || subscription.status === 'trialing',
            });
            if (!updated) throw new Error('Cloudflare D1 Add-on Update ist nicht verfügbar');
          }
          break;
        }

        const plan = normalizePlan(session.metadata?.plan || 'free') as PlanType;

        if (uid) {
          const subscription = await getStripe().subscriptions.retrieve(session.subscription as string);
          const maxScans = getMonthlyScanLimit(plan);
          const maxCrawlPages = getMonthlyCrawlPageLimit(plan);
          
          const updated = await updateCloudflareStripeSubscription(env, uid, {
            plan,
            subscriptionId: session.subscription as string,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            maxScans,
            maxCrawlPages
          });
          if (!updated) throw new Error('Cloudflare D1 ist nicht verfügbar');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const uid = subscription.metadata.uid;

        if (uid) {
          if (subscription.metadata?.checkoutType === 'addon') {
            const addonKey = normalizeAddonKey(subscription.metadata?.addonKey);
            if (addonKey) {
              const updated = await updateCloudflareStripeAddonSubscription(env, uid, {
                subscriptionId: subscription.id,
                addonKey,
                quantity: Number(subscription.metadata?.quantity) || 1,
                status: subscription.status,
                active: false,
              });
              if (!updated) throw new Error('Cloudflare D1 Add-on Delete ist nicht verfügbar');
            }
            break;
          }

          const updated = await updateCloudflareStripeSubscription(env, uid, {
            plan: 'free',
            subscriptionId: null,
            trialUntil: null,
            maxScans: getMonthlyScanLimit('free'),
            maxCrawlPages: getMonthlyCrawlPageLimit('free')
          });
          if (!updated) throw new Error('Cloudflare D1 ist nicht verfügbar');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const uid = subscription.metadata.uid;

        if (uid && subscription.metadata?.checkoutType === 'addon') {
          const addonKey = normalizeAddonKey(subscription.metadata?.addonKey);
          if (addonKey) {
            const updated = await updateCloudflareStripeAddonSubscription(env, uid, {
              subscriptionId: subscription.id,
              addonKey,
              quantity: Number(subscription.metadata?.quantity) || 1,
              status: subscription.status,
              active: subscription.status === 'active' || subscription.status === 'trialing',
            });
            if (!updated) throw new Error('Cloudflare D1 Add-on Subscription Update ist nicht verfügbar');
          }
          break;
        }

        const plan = normalizePlan(subscription.metadata.plan || 'free') as PlanType;

        if (uid) {
          const maxScans = getMonthlyScanLimit(plan);
          const maxCrawlPages = getMonthlyCrawlPageLimit(plan);
          const updated = await updateCloudflareStripeSubscription(env, uid, {
            plan,
            trialUntil: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            subscriptionId: subscription.id,
            maxScans,
            maxCrawlPages
          });
          if (!updated) throw new Error('Cloudflare D1 ist nicht verfügbar');
        }
        break;
      }

      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Cloudflare subscription update error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Cloudflare subscription update error' }, { status: 500 });
  }
}
