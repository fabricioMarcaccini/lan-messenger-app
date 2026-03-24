import Router from 'koa-router';
import Stripe from 'stripe';
import { db } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { writeAuditLog } from '../middlewares/audit.middleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = new Router();

// ─── Stripe SDK Instance ────────────────────────────────────────────────────
// [audit-fix] throw error if Stripe secret key missing
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY must be set");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16', // Or whatever version you prefer
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
// [audit-fix] rate limiter to prevent duplicate customer creation map
const checkoutRateLimits = new Map();

// ─── POST /create-checkout-session ──────────────────────────────────────────
// Creates a Stripe Checkout Session for subscription (Per-Seat model)
router.post('/create-checkout-session', authMiddleware, adminMiddleware, async (ctx) => {
    try {
        // [audit-fix] rate limiter to prevent duplicate customer creation
        const userId = ctx.state.user?.id;
        if (userId) {
            const now = Date.now();
            const lastReq = checkoutRateLimits.get(userId);
            if (lastReq && now - lastReq < 3000) {
                ctx.status = 429;
                ctx.body = { success: false, message: 'Processando, aguarde...' };
                return;
            }
            checkoutRateLimits.set(userId, now);
        }

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
        let companyId = user.companyId;

        // Fallback: fetch companyId from DB if not in JWT (old tokens)
        if (!companyId) {
            const userResult = await db.write('SELECT company_id FROM users WHERE id = $1', [user.id]);
            companyId = userResult.rows[0]?.company_id;
        }

        if (!companyId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário não pertence a nenhuma empresa. Faça logout e registre novamente.' };
            return;
        }

        // Check if company already has a Stripe customer
        let companyResult = await db.write(
            'SELECT stripe_customer_id, name FROM companies WHERE id = $1',
            [companyId]
        );

        // Auto-create company record if it doesn't exist (legacy users)
        if (companyResult.rows.length === 0) {
            await db.write(
                `INSERT INTO companies (id, name, plan_id, subscription_status, max_seats)
                 VALUES ($1, $2, 'free', 'inactive', 5)
                 ON CONFLICT (id) DO NOTHING`,
                [companyId, `Empresa de ${user.username || user.email}`]
            );
            companyResult = await db.write(
                'SELECT stripe_customer_id, name FROM companies WHERE id = $1',
                [companyId]
            );
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
            success_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/settings';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/settings';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'success');
                u.searchParams.set('plan', planId);
                return u.toString();
            })(),
            cancel_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/settings';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/settings';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'cancel');
                return u.toString();
            })(),
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
router.post('/create-portal-session', authMiddleware, adminMiddleware, async (ctx) => {
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
            return_url: (() => {
            const reqReturnPath = ctx.request.body.returnPath || '/settings';
            const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
            let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
            if (p.startsWith('//')) p = '/settings';
            return new URL(p, fUrl).toString();
        })(),
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

// ─── POST /upgrade-seats ────────────────────────────────────────────────────
// Smart upgrade: modifies existing subscription OR redirects to checkout
router.post('/upgrade-seats', authMiddleware, adminMiddleware, async (ctx) => {
    try {
        const { seats, planId: rawPlanId } = ctx.request.body;
        // Normalize: trial/free → starter (they don't have Stripe prices)
        const planId = (!rawPlanId || rawPlanId === 'trial' || rawPlanId === 'free') ? 'starter' : rawPlanId;
        const seatsNum = parseInt(seats, 10);

        if (!seatsNum || seatsNum < 1 || seatsNum > 500) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Quantidade de seats inválida (1-500).' };
            return;
        }

        const user = ctx.state.user;
        let companyId = user.companyId;
        if (!companyId) {
            const u = await db.write('SELECT company_id FROM users WHERE id = $1', [user.id]);
            companyId = u.rows[0]?.company_id;
        }

        if (!companyId) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário não pertence a nenhuma empresa.' };
            return;
        }

        const companyResult = await db.write(
            'SELECT stripe_subscription_id, stripe_customer_id, plan_id FROM companies WHERE id = $1',
            [companyId]
        );
        const company = companyResult.rows[0];

        // ═══ CASE 1: Has active subscription → update quantity directly ═══
        if (company?.stripe_subscription_id) {
            const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id);

            if (subscription.status === 'active' || subscription.status === 'trialing') {
                const itemId = subscription.items.data[0]?.id;

                if (!itemId) {
                    ctx.status = 500;
                    ctx.body = { success: false, message: 'Subscription item não encontrado.' };
                    return;
                }

                // Determine the price: keep current or switch to new plan
                const updateParams = {
                    items: [{
                        id: itemId,
                        quantity: seatsNum,
                    }],
                    proration_behavior: 'create_prorations', // Charges the diff immediately
                    metadata: {
                        company_id: companyId,
                        seats: String(seatsNum),
                    },
                };

                // If changing plan too (e.g. starter → max)
                if (planId && PRICE_MAP[planId] && planId !== company.plan_id) {
                    updateParams.items[0].price = PRICE_MAP[planId];
                }

                await stripe.subscriptions.update(company.stripe_subscription_id, updateParams);

                // [audit-fix] removed optimistic DB update to avoid exploit if payment fails.
                // The DB will ONLY be updated when customer.subscription.updated webhook arrives.

                await writeAuditLog({
                    companyId,
                    actorId: user.id,
                    action: 'billing.plan_or_seats.upgrade_requested',
                    targetType: 'company',
                    targetId: companyId,
                    metadata: {
                        fromPlan: company.plan_id,
                        toPlan: planId || company.plan_id,
                        seats: seatsNum,
                        source: 'api_upgrade_seats_pending',
                    },
                    ipAddress: ctx.ip,
                    userAgent: ctx.get('user-agent') || null,
                });

                console.log(`🔼 Company ${companyId} requested seats upgrade to ${seatsNum} (pending webhook)`);

                ctx.body = {
                    success: true,
                    method: 'direct_update',
                    message: `Solicitação enviada! Os novos limites estarão disponíveis após o processamento do pagamento.`,
                    newMaxSeats: company.max_seats, // Retain old max_seats
                    isPending: true
                };
                return;
            }
        }

        // ═══ CASE 2: No subscription → redirect to checkout ═══
        const effectivePlan = planId || company?.plan_id || 'starter';
        const priceId = PRICE_MAP[effectivePlan];

        if (!priceId) {
            ctx.status = 500;
            ctx.body = { success: false, message: `Price ID não configurado para o plano "${effectivePlan}".` };
            return;
        }

        let stripeCustomerId = company?.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { company_id: companyId },
            });
            stripeCustomerId = customer.id;
            await db.write('UPDATE companies SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, companyId]);
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [{ price: priceId, quantity: seatsNum }],
            success_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/admin/users';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/admin/users';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'success');
                u.searchParams.set('seats', seatsNum.toString());
                return u.toString();
            })(),
            cancel_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/admin/users';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/admin/users';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'cancel');
                return u.toString();
            })(),
            metadata: { company_id: companyId, plan_id: effectivePlan, seats: String(seatsNum) },
            subscription_data: { metadata: { company_id: companyId, plan_id: effectivePlan, seats: String(seatsNum) } },
            allow_promotion_codes: true,
            locale: 'pt-BR',
        });

        ctx.body = {
            success: true,
            method: 'checkout',
            url: session.url,
        };
    } catch (error) {
        console.error('❌ Upgrade Seats Error:', error.message);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao atualizar assinatura.', detail: process.env.NODE_ENV !== 'production' ? error.message : undefined };
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
            // [audit-fix] Retrieve cancel_at_period_end and current_period_end
            'SELECT plan_id, subscription_status, max_seats, stripe_subscription_id, cancel_at_period_end, current_period_end FROM companies WHERE id = $1',
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
                // [audit-fix] return cancel state for frontend banner
                cancelAtPeriodEnd: company.cancel_at_period_end || false,
                currentPeriodEnd: company.current_period_end || null,
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
        console.error('❌ ALERTA CRÍTICO DE CHECKOUT STRIPE:');
        console.error('O segredo do Webhook (STRIPE_WEBHOOK_SECRET) não foi encontrado no arquivo .env ou no painel do Render!');
        console.error('Sem ele, a API não consegue validar se o pagamento foi real ou forjado. Adicione a chave "whsec_..." da Stripe ao Render.');
        ctx.status = 500;
        ctx.body = { error: 'Webhook secret não configurado.' };
        return;
    }

    let event;
    try {
        // Raw body was captured by the middleware in app.js BEFORE koaBody consumed the stream
        const rawBody = ctx.request.rawBody;

        if (!rawBody || rawBody.length === 0) {
            console.error('❌ Webhook: rawBody is empty. Check raw body middleware in app.js.');
            ctx.status = 400;
            ctx.body = { error: 'Raw body não disponível.' };
            return;
        }

        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`❌ ALERTA CRÍTICO: Falha na assinatura do Webhook Stripe!`);
        console.error(`O STRIPE_WEBHOOK_SECRET configurado no servidor não coincide com a assinatura da requisição enviada.`);
        console.error(`Verifique se você copiou o segredo correto do Dashboard da Stripe. Detalhe do Erro: ${err.message}`);
        ctx.status = 400;
        ctx.body = { error: `Webhook Error: ${err.message}` };
        return;
    }

    // Return 200 immediately to prevent Stripe from retrying
    ctx.status = 200;
    ctx.body = { received: true };

    // Process event asynchronously in background
    (async () => {
        try {
            // Idempotency Check using DB
            await db.write(
                `CREATE TABLE IF NOT EXISTS stripe_events (
                    id VARCHAR(255) PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )`
            );
            const check = await db.write(
                'INSERT INTO stripe_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id',
                [event.id]
            );
            if (check.rowCount === 0) {
                console.log(`ℹ️ Skipping duplicate Stripe event: ${event.id}`);
                return;
            }

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
            console.error(`❌ Webhook handler background error for ${event.type}:`, error.message);
        }
    })();
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

    await writeAuditLog({
        companyId,
        actorId: null,
        action: 'billing.checkout.completed',
        targetType: 'company',
        targetId: companyId,
        metadata: {
            planId,
            seats,
            subscriptionId,
            affiliateRef: affiliateRef || null,
        },
    });

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

    // [audit-fix] save cancel state and period end from webhook
    const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
    const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null;

    const updateFields = [
        'subscription_status = $1',
        'max_seats = $2',
        'cancel_at_period_end = $3',
        'current_period_end = $4',
        'updated_at = NOW()',
    ];
    const params = [subscriptionStatus, newQuantity, cancelAtPeriodEnd, currentPeriodEnd];
    let paramIdx = 5;

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

    await writeAuditLog({
        companyId,
        actorId: null,
        action: 'billing.subscription.updated',
        targetType: 'company',
        targetId: companyId,
        metadata: {
            stripeStatus: subscription.status,
            mappedStatus: subscriptionStatus,
            seats: newQuantity,
            planId: planId || null,
        },
    });

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

    await writeAuditLog({
        companyId: targetId,
        actorId: null,
        action: 'billing.subscription.deleted',
        targetType: 'company',
        targetId,
        metadata: {
            subscriptionId: subscription.id,
            previousStatus: subscription.status,
        },
    });

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
