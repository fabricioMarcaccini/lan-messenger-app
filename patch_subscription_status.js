import fs from 'fs';

const file = 'backend/src/routes/stripe.routes.js';
let c = fs.readFileSync(file, 'utf8');

// Fix 1: Expand SELECT query
const oldQuery = `'SELECT plan_id, subscription_status, max_seats, stripe_subscription_id, cancel_at_period_end, current_period_end FROM companies WHERE id = $1'`;
const newQuery = `\`SELECT plan_id, subscription_status, max_seats, stripe_subscription_id,
                    cancel_at_period_end, current_period_end,
                    payment_failed_at, payment_failure_reason, requires_seat_reduction
             FROM companies WHERE id = $1\``;

if (c.includes(oldQuery)) {
    c = c.replace(oldQuery, newQuery);
    console.log('✅ Query updated');
} else {
    console.log('⚠️ Old query not found, checking if already updated...');
    if (c.includes('payment_failed_at, payment_failure_reason, requires_seat_reduction')) {
        console.log('✅ Query already updated');
    } else {
        console.log('❌ Query pattern not found');
    }
}

// Fix 2: Add enterprise fields to response payload
const oldPayload = `cancelAtPeriodEnd: company.cancel_at_period_end || false,
                currentPeriodEnd: company.current_period_end || null,`;

const newPayload = `cancelAtPeriodEnd: company.cancel_at_period_end || false,
                currentPeriodEnd: company.current_period_end || null,
                // [enterprise] dunning info for frontend payment failure banner
                paymentFailedAt: company.payment_failed_at || null,
                paymentFailureReason: company.payment_failure_reason || null,
                // [enterprise] seat over-limit flag after downgrade
                requiresSeatReduction: company.requires_seat_reduction || false,`;

if (c.includes(oldPayload) && !c.includes('paymentFailedAt:')) {
    c = c.replace(oldPayload, newPayload);
    console.log('✅ Response payload updated');
} else if (c.includes('paymentFailedAt:')) {
    console.log('✅ Response payload already updated');
} else {
    console.log('❌ Payload pattern not found');
}

// Fix 3: Update comment
c = c.replace(
    '// [audit-fix] Retrieve cancel_at_period_end and current_period_end',
    '// [enterprise] Retrieve all subscription state including dunning and seat-limit info'
);

fs.writeFileSync(file, c);
console.log('✅ All patches applied');
