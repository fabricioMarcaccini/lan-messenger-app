const fs = require('fs');
const path = require('path');

function replaceOrThrow(str, regex, replacement, name) {
    if (!regex.test(str)) {
        throw new Error(`Failed to match regex for: ${name}`);
    }
    return str.replace(regex, replacement);
}

try {
    // APP.JS
    const appJsPath = path.join(__dirname, 'backend', 'src', 'app.js');
    let appJs = fs.readFileSync(appJsPath, 'utf8');

    appJs = replaceOrThrow(
        appJs,
        /\/\/ ⚡ CRITICAL: Skip koaBody[\s\S]*?await next\(\);\r?\n\}\);/,
        `// ⚡ CRITICAL: Skip koaBody for Stripe webhooks so the raw body can be parsed directly in the route
// This relies on the stripe-signature header instead of string path matching
app.use(async (ctx, next) => {
    // [audit-fix] Enforce HTTPS on webhook endpoints in production
    if (ctx.path.startsWith('/api/stripe') && !ctx.secure && process.env.NODE_ENV === 'production') {
        ctx.throw(400, 'HTTPS required');
    }

    if (ctx.get('stripe-signature')) {
        ctx.request.body = {};
    }
    await next();
});`,
        'app.js HTTPS enforcement'
    );
    fs.writeFileSync(appJsPath, appJs);

    // STRIPE.ROUTES.JS
    const stripePath = path.join(__dirname, 'backend', 'src', 'routes', 'stripe.routes.js');
    let stripeJs = fs.readFileSync(stripePath, 'utf8');

    stripeJs = replaceOrThrow(
        stripeJs,
        /const stripe = new Stripe\(process\.env\.STRIPE_SECRET_KEY \|\| 'sk_test_dummy_key_for_local_dev', \{/,
        `// [audit-fix] throw error if Stripe secret key missing
if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY must be set");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {`,
        'Stripe fallback key removal'
    );

    stripeJs = replaceOrThrow(
        stripeJs,
        /router\.post\('\/create-checkout-session', authMiddleware, adminMiddleware, async \(ctx\) => \{\r?\n\s+try \{\r?\n\s+const \{ planId, seats, ref \} = ctx\.request\.body;/,
        `// [audit-fix] rate limiter to prevent duplicate customer creation map
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

        const { planId, seats, ref } = ctx.request.body;`,
        'Checkout rate limit race condition'
    );

    stripeJs = replaceOrThrow(
        stripeJs,
        /\/\/ Update DB immediately[\s\S]*?return;\r?\n\s+\}/,
        `// [audit-fix] removed optimistic DB update to avoid exploit if payment fails.
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

                console.log(\`🔼 Company \${companyId} requested seats upgrade to \${seatsNum} (pending webhook)\`);

                ctx.body = {
                    success: true,
                    method: 'direct_update',
                    message: \`Solicitação enviada! Os novos limites estarão disponíveis após o processamento do pagamento.\`,
                    newMaxSeats: company.max_seats, // Retain old max_seats
                    isPending: true
                };
                return;
            }`,
        'Optimistic DB Update removal'
    );

    stripeJs = replaceOrThrow(
        stripeJs,
        /'SELECT plan_id, subscription_status, max_seats, stripe_subscription_id FROM companies WHERE id = \$1',/,
        `// [audit-fix] Retrieve cancel_at_period_end and current_period_end
            'SELECT plan_id, subscription_status, max_seats, stripe_subscription_id, cancel_at_period_end, current_period_end FROM companies WHERE id = $1',`,
        'SELECT subscription fields'
    );

    stripeJs = replaceOrThrow(
        stripeJs,
        /hasSubscription: !!company\.stripe_subscription_id,/,
        `hasSubscription: !!company.stripe_subscription_id,
                // [audit-fix] return cancel state for frontend banner
                cancelAtPeriodEnd: company.cancel_at_period_end || false,
                currentPeriodEnd: company.current_period_end || null,`,
        'Return cancel state payload'
    );

    stripeJs = replaceOrThrow(
        stripeJs,
        /const updateFields = \[\r?\n\s+'subscription_status = \$1',\r?\n\s+'max_seats = \$2',\r?\n\s+'updated_at = NOW\(\)',\r?\n\s+\];\r?\n\s+const params = \[subscriptionStatus, newQuantity\];\r?\n\s+let paramIdx = 3;/,
        `// [audit-fix] save cancel state and period end from webhook
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
    let paramIdx = 5;`,
        'Save cancel state from webhook payload'
    );

    fs.writeFileSync(stripePath, stripeJs);

    // AUTH.JS
    const authPath = path.join(__dirname, 'backend', 'src', 'middlewares', 'auth.js');
    let authJs = fs.readFileSync(authPath, 'utf8');

    authJs = replaceOrThrow(
        authJs,
        /\/\/ Allow access if plan matches and subscription is active \(or free tier\)\r?\n\s+if \(allowedPlans\.includes\(currentPlan\) && \(status === 'active' \|\| currentPlan === 'free'\)\) \{/,
        `// [audit-fix] past_due, incomplete, canceled must all block access to paid features
            // Allow access if plan matches and subscription is active/trialing (or free tier)
            if (allowedPlans.includes(currentPlan) && (status === 'active' || status === 'trialing' || currentPlan === 'free')) {`,
        'Auth middleware status block'
    );

    fs.writeFileSync(authPath, authJs);

    console.log('STDOUT_SUCCESS');
} catch (e) {
    console.error('STDOUT_ERROR: ' + e.message);
}
