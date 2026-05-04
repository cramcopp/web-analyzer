import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSessionUser } from '@/lib/auth-server';
import { checkoutSchema } from '@/lib/validations';
import { getRuntimeEnv } from '@/lib/cloudflare-env';
import { getAddonConfig, normalizePlan, type AddonKey, type PlanType } from '@/lib/plans';
import { getCloudflareUserProfile } from '@/lib/cloudflare-storage';
export const runtime = 'nodejs';

function getPriceMatrix() {
  const env = getRuntimeEnv();
  return {
    pro: {
      monthly: env.STRIPE_PRICE_PRO_MONTHLY || '',
      yearly: env.STRIPE_PRICE_PRO_YEARLY || '',
    },
    agency: {
      monthly: env.STRIPE_PRICE_AGENCY_MONTHLY || '',
      yearly: env.STRIPE_PRICE_AGENCY_YEARLY || '',
    },
    business: {
      monthly: env.STRIPE_PRICE_BUSINESS_MONTHLY || '',
      yearly: env.STRIPE_PRICE_BUSINESS_YEARLY || '',
    },
  } satisfies Record<Exclude<PlanType, 'free'>, Record<string, string>>;
}

function getAddonPriceMatrix() {
  const env = getRuntimeEnv();
  return {
    keywords_100: env.STRIPE_PRICE_ADDON_KEYWORDS_100 || '',
    project_100_keywords: env.STRIPE_PRICE_ADDON_PROJECT_100_KEYWORDS || '',
    team_seat: env.STRIPE_PRICE_ADDON_TEAM_SEAT || '',
    white_label_domain: env.STRIPE_PRICE_ADDON_WHITE_LABEL_DOMAIN || '',
    backlinks: env.STRIPE_PRICE_ADDON_BACKLINKS || '',
    ai_visibility: env.STRIPE_PRICE_ADDON_AI_VISIBILITY || '',
  } satisfies Record<AddonKey, string>;
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const result = checkoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error.issues[0]?.message || 'Ungültige Daten' 
      }, { status: 400 });
    }

    const { checkoutType, priceId, planName, addonKey, interval = 'monthly', quantity } = result.data;
    const uid = user.uid;
    const userEmail = user.email;

    const env = getRuntimeEnv();
    const checkoutMode = checkoutType || 'plan';

    if (checkoutMode === 'addon') {
      const addon = getAddonConfig(addonKey);
      if (!addon || !addonKey) {
        return NextResponse.json({ error: 'Invalid add-on' }, { status: 400 });
      }

      const userProfile = await getCloudflareUserProfile(env, uid);
      if (normalizePlan(userProfile?.plan) === 'free') {
        return NextResponse.json({ error: 'Add-ons benötigen einen aktiven bezahlten Plan.' }, { status: 403 });
      }

      const stripePriceId = getAddonPriceMatrix()[addonKey] || priceId;
      if (!stripePriceId) {
        return NextResponse.json({ error: 'Add-on Price ID fehlt' }, { status: 400 });
      }

      const session = await getStripe().checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          metadata: {
            uid,
            checkoutType: 'addon',
            addonKey,
            quantity: String(quantity),
          },
        },
        client_reference_id: uid,
        customer_email: userEmail,
        success_url: `${env.APP_URL || new URL(req.url).origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL || new URL(req.url).origin}/`,
        metadata: {
          uid,
          checkoutType: 'addon',
          addonKey,
          quantity: String(quantity),
        },
      });

      return NextResponse.json({ url: session.url });
    }

    if (!planName) {
      return NextResponse.json({ error: 'Plan fehlt' }, { status: 400 });
    }

    const priceMatrix = getPriceMatrix();

    // Get the correct Price ID from matrix or fallback to provided priceId
    const stripePriceId = priceMatrix[planName]?.[interval] || priceId;

    if (!stripePriceId) {
      return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.create({
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
          checkoutType: 'plan',
          plan: planName,
          interval: interval
        }
      },
      client_reference_id: uid,
      customer_email: userEmail,
      success_url: `${env.APP_URL || new URL(req.url).origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL || new URL(req.url).origin}/`,
      metadata: {
        uid: uid,
        checkoutType: 'plan',
        plan: planName,
        interval: interval
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
