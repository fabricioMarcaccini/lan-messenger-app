const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, 'backend', 'src', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

const appReplacement = `// ⚡ CRITICAL: Skip koaBody for Stripe webhooks so the raw body can be parsed directly in the route
// This relies on the stripe-signature header instead of string path matching
app.use(async (ctx, next) => {
    if (ctx.get('stripe-signature')) {
        ctx.request.body = {};
    }
    await next();
});`;

appJs = appJs.replace(/\/\/ ⚡ CRITICAL: Raw body capture for Stripe webhook[\s\S]*?app\.use\(async \(ctx, next\) => \{[\s\S]*?await next\(\);\r?\n\}\);/, appReplacement);

fs.writeFileSync(appJsPath, appJs);

const stripePath = path.join(__dirname, 'backend', 'src', 'routes', 'stripe.routes.js');
let stripeJs = fs.readFileSync(stripePath, 'utf8');

const stripeChunk1 = `        // Parse raw body directly in the route definition
        const chunks = [];
        for await (const chunk of ctx.req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks);

        if (!rawBody || rawBody.length === 0) {
            console.error('❌ Webhook: rawBody is empty.');
            ctx.status = 400;
            ctx.body = { error: 'Raw body não disponível.' };
            return;
        }

        event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);`;

stripeJs = stripeJs.replace(/        \/\/ rawBody is set by the middleware in app\.js \(before koaBody\)[\s\S]*?event = stripe\.webhooks\.constructEvent\(rawBody, sig, endpointSecret\);/, stripeChunk1);

const stripeChunk2 = `    // Return 200 immediately to prevent Stripe from retrying
    ctx.status = 200;
    ctx.body = { received: true };

    // Process event asynchronously in background
    (async () => {
        try {
            // Idempotency Check using DB
            await db.write(
                \`CREATE TABLE IF NOT EXISTS stripe_events (
                    id VARCHAR(255) PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )\`
            );
            const check = await db.write(
                'INSERT INTO stripe_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING RETURNING id',
                [event.id]
            );
            if (check.rowCount === 0) {
                console.log(\`ℹ️ Skipping duplicate Stripe event: \${event.id}\`);
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
                    console.log(\`ℹ️ Stripe event not handled: \${event.type}\`);
            }
        } catch (error) {
            console.error(\`❌ Webhook handler background error for \${event.type}:\`, error.message);
        }
    })();
});`;

stripeJs = stripeJs.replace(/    \/\/ Process each event type[\s\S]*?ctx\.body = \{ received: true \};\r?\n\}\);/, stripeChunk2);

fs.writeFileSync(stripePath, stripeJs);

console.log('Successfully patched files!');
