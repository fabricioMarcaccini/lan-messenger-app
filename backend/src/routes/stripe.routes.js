import Router from 'koa-router';
import Stripe from 'stripe';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = new Router();

// ─── Stripe SDK Instance ────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
});

// ─── Price Map (env-based for production safety) ────────────────────────────
const PRICE_MAP = {
    starter: process.env.STRIPE_PRICE_STARTER,
    medium: process.env.STRIPE_PRICE_MEDIUM,
    max: process.env.STRIPE_PRICE_MAX,
};

const PLAN_NAMES = {
    starter: 'Starter',
    medium: 'Medium',
    max: 'Max (IA)',
};

// ─── POST /create-checkout-session ──────────────────────────────────────────
// Creates a Stripe Checkout Session for subscription (Per-Seat model)
router.post('/create-checkout-session', authMiddleware, async (ctx) => {
    try {
        const { planId, seats, ref } = ctx.request.body;

        // Validation
        if (!planId || !seats) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'planId e seats são obrigatórios.' };
            return;
        }

        if (!['starter', 'medium', 'max'].includes(planId)) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Plano inválido. Use: starter, medium ou max.' };
            return;
        }

        const seatsNum = parseInt(seats, 10);
        if (isNaN(seatsNum) || seatsNum < 1 || seatsNum > 500) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Quantidade de seats inválida (1-500).' };
            return;
        }

        const priceId = PRICE_MAP[planId];
        if (!priceId) {
            ctx.status = 500;
            ctx.body = { success: false, message: `Price ID não configurado para o plano "${planId}". Verifique as variáveis STRIPE_PRICE_* no .env.` };
            return;
        }

        const user = ctx.state.user;
        const companyId = user.companyId;

        if (!companyId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário não pertence a nenhuma empresa.' };
            return;
        }

        // Check if company already has a Stripe customer
        const companyResult = await db.write(
            'SELECT stripe_customer_id, name FROM companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Empresa não encontrada.' };
            return;
        }

        const company = companyResult.rows[0];
        let stripeCustomerId = company.stripe_customer_id;

        // Create Stripe Customer if it doesn't exist
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                name: company.name,
                email: user.email,
                metadata: {
                    company_id: companyId,
                    created_by: user.id,
                },
            });
            stripeCustomerId = customer.id;

            // Save immediately so we don't create duplicates on retry
            await db.write(
                'UPDATE companies SET stripe_customer_id = $1 WHERE id = $2',
                [stripeCustomerId, companyId]
            );
        }

        // Build Checkout Session params
        const sessionParams = {
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    price: priceId,
                    quantity: seatsNum,
                },
            ],
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?checkout=success&plan=${planId}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?checkout=cancel`,
            metadata: {
                company_id: companyId,
                plan_id: planId,
                seats: String(seatsNum),
                affiliate_ref: ref || '',
            },
            subscription_data: {
                metadata: {
                    company_id: companyId,
                    plan_id: planId,
                    seats: String(seatsNum),
                },
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            payment_method_types: ['card'],
            locale: 'pt-BR',
        };

        // Affiliate tracking
        if (ref) {
            sessionParams.client_reference_id = ref;
        }

        const session = await stripe.checkout.sessions.create(sessionParams);

        ctx.body = {
            success: true,
            url: session.url,
            sessionId: session.id,
        };
    } catch (error) {
        console.error('❌ Stripe Checkout Error:', error.message);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: 'Erro ao criar sessão de checkout.',
            detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        };
    }
});

// ─── POST /create-portal-session ────────────────────────────────────────────
// Creates a Stripe Customer Portal session for self-service management
router.post('/create-portal-session', authMiddleware, async (ctx) => {
    try {
        const user = ctx.state.user;
        const companyId = user.companyId;

        if (!companyId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário não pertence a nenhuma empresa.' };
            return;
        }

        const companyResult = await db.write(
            'SELECT stripe_customer_id FROM companies WHERE id = $1',
            [companyId]
        );

        const stripeCustomerId = companyResult.rows[0]?.stripe_customer_id;

        if (!stripeCustomerId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Nenhuma assinatura ativa. Faça o checkout primeiro.' };
            return;
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
        });

        ctx.body = {
            success: true,
            url: portalSession.url,
        };
    } catch (error) {
        console.error('❌ Stripe Portal Error:', error.message);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao abrir portal de assinatura.' };
    }
});

// ─── GET /subscription-status ───────────────────────────────────────────────
// Returns current plan info for the authenticated user's company
router.get('/subscription-status', authMiddleware, async (ctx) => {
    try {
        const companyId = ctx.state.user?.companyId;

        if (!companyId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário não pertence a nenhuma empresa.' };
            return;
        }

        const result = await db.write(
            'SELECT plan_id, subscription_status, max_seats, stripe_subscription_id FROM companies WHERE id = $1',
            [companyId]
        );

        if (result.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Empresa não encontrada.' };
            return;
        }

        const company = result.rows[0];

        // Count current active users in this company
        const usersResult = await db.write(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
            [companyId]
        );
        const activeUsers = parseInt(usersResult.rows[0].count, 10);

        ctx.body = {
            success: true,
            data: {
                planId: company.plan_id || 'free',
                planName: PLAN_NAMES[company.plan_id] || 'Gratuito',
                subscriptionStatus: company.subscription_status || 'inactive',
                maxSeats: company.max_seats || 5,
                activeUsers,
                hasSubscription: !!company.stripe_subscription_id,
            },
        };
    } catch (error) {
        console.error('❌ Subscription Status Error:', error.message);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao buscar status da assinatura.' };
    }
});

// ─── POST /webhook ──────────────────────────────────────────────────────────
// Stripe Webhook handler — processes subscription events
// IMPORTANT: This route uses raw body (set by middleware in app.js)
router.post('/webhook', async (ctx) => {
    const sig = ctx.get('stripe-signature');
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET não configurado no .env');
        ctx.status = 500;
        ctx.body = { error: 'Webhook secret não configurado.' };
        return;
    }

    let event;
    try {
        // rawBody is set by the middleware in app.js (before koaBody)
        const rawBody = ctx.request.rawBody;

        if (!rawBody) {
            console.error('❌ Webhook: rawBody is empty. Check raw body middleware in app.js.');
            ctx.status = 400;
            ctx.body = { error: 'Raw body não disponível.' };
            return;
        }

        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`❌ Webhook signature verification failed: ${err.message}`);
        ctx.status = 400;
        ctx.body = { error: `Webhook Error: ${err.message}` };
        return;
    }

    // Process each event type
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                await handleCheckoutCompleted(event.data.object);
                break;
            }
            case 'customer.subscription.updated': {
                await handleSubscriptionUpdated(event.data.object);
                break;
            }
            case 'customer.subscription.deleted': {
                await handleSubscriptionDeleted(event.data.object);
                break;
            }
            case 'invoice.payment_failed': {
                await handlePaymentFailed(event.data.object);
                break;
            }
            default:
                console.log(`ℹ️ Stripe event not handled: ${event.type}`);
        }
    } catch (error) {
        console.error(`❌ Webhook handler error for ${event.type}:`, error.message);
        // Return 200 to prevent Stripe from retrying — log the error for investigation
        // Stripe recommends returning 200 even on handler errors to avoid infinite retries
    }

    ctx.status = 200;
    ctx.body = { received: true };
});

// ─── Webhook Handler Functions ──────────────────────────────────────────────

async function handleCheckoutCompleted(session) {
    console.log('✅ Checkout Session Completed:', session.id);

    const companyId = session.metadata?.company_id;
    const planId = session.metadata?.plan_id;
    const seats = parseInt(session.metadata?.seats || '5', 10);
    const stripeCustomerId = session.customer;
    const subscriptionId = session.subscription;
    const affiliateRef = session.metadata?.affiliate_ref || session.client_reference_id || null;

    if (!companyId) {
        console.error('❌ Checkout completed but no company_id in metadata:', session.id);
        return;
    }

    // Update company with billing data
    await db.write(
        `UPDATE companies 
         SET plan_id = $1, 
             subscription_status = 'active',
             stripe_customer_id = $2,
             stripe_subscription_id = $3,
             max_seats = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [planId, stripeCustomerId, subscriptionId, seats, companyId]
    );

    console.log(`🎉 Company ${companyId} upgraded to "${planId}" with ${seats} seats (affiliate: ${affiliateRef || 'none'})`);
}

async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Subscription Updated:', subscription.id);

    const companyId = subscription.metadata?.company_id;
    if (!companyId) {
        // Try to find company by stripe_subscription_id
        const result = await db.write(
            'SELECT id FROM companies WHERE stripe_subscription_id = $1',
            [subscription.id]
        );
        if (result.rows.length === 0) {
            console.error('❌ Subscription updated but company not found:', subscription.id);
            return;
        }
        await updateCompanyFromSubscription(result.rows[0].id, subscription);
    } else {
        await updateCompanyFromSubscription(companyId, subscription);
    }
}

async function updateCompanyFromSubscription(companyId, subscription) {
    // Extract plan from subscription items
    const item = subscription.items?.data?.[0];
    const newQuantity = item?.quantity || 5;
    const priceId = item?.price?.id;

    // Reverse-lookup plan_id from price
    let planId = null;
    if (priceId) {
        for (const [key, val] of Object.entries(PRICE_MAP)) {
            if (val === priceId) { planId = key; break; }
        }
    }

    // Map Stripe status to our simplified status
    const statusMap = {
        active: 'active',
        past_due: 'past_due',
        unpaid: 'unpaid',
        canceled: 'canceled',
        incomplete: 'inactive',
        incomplete_expired: 'inactive',
        trialing: 'trialing',
        paused: 'paused',
    };
    const subscriptionStatus = statusMap[subscription.status] || 'inactive';

    const updateFields = [
        'subscription_status = $1',
        'max_seats = $2',
        'updated_at = NOW()',
    ];
    const params = [subscriptionStatus, newQuantity];
    let paramIdx = 3;

    if (planId) {
        updateFields.push(`plan_id = $${paramIdx}`);
        params.push(planId);
        paramIdx++;
    }

    params.push(companyId);
    await db.write(
        `UPDATE companies SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        params
    );

    console.log(`🔄 Company ${companyId} subscription updated: status=${subscriptionStatus}, seats=${newQuantity}, plan=${planId || 'unchanged'}`);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('🚨 Subscription Deleted:', subscription.id);

    const companyId = subscription.metadata?.company_id;

    let targetId = companyId;
    if (!targetId) {
        const result = await db.write(
            'SELECT id FROM companies WHERE stripe_subscription_id = $1',
            [subscription.id]
        );
        if (result.rows.length > 0) {
            targetId = result.rows[0].id;
        }
    }

    if (!targetId) {
        console.error('❌ Subscription deleted but company not found:', subscription.id);
        return;
    }

    // Downgrade to free
    await db.write(
        `UPDATE companies 
         SET plan_id = 'free',
             subscription_status = 'canceled',
             max_seats = 5,
             updated_at = NOW()
         WHERE id = $1`,
        [targetId]
    );

    console.log(`⬇️ Company ${targetId} downgraded to free plan (subscription cancelled)`);
}

async function handlePaymentFailed(invoice) {
    console.log('💳 Payment Failed for invoice:', invoice.id);

    const customerId = invoice.customer;
    if (!customerId) return;

    const result = await db.write(
        'SELECT id FROM companies WHERE stripe_customer_id = $1',
        [customerId]
    );

    if (result.rows.length > 0) {
        await db.write(
            `UPDATE companies SET subscription_status = 'past_due', updated_at = NOW() WHERE id = $1`,
            [result.rows[0].id]
        );
        console.log(`⚠️ Company ${result.rows[0].id} marked as past_due (payment failed)`);
    }
}

export default router;
