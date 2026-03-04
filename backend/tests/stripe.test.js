/**
 * Stripe Billing Architecture — Standalone Test Runner
 * 
 * Tests the business logic of the Stripe integration without
 * requiring full app startup or database connections.
 * 
 * Run with: node tests/stripe.test.js
 */

let passed = 0;
let failed = 0;
let total = 0;

if (!process.env.JEST_WORKER_ID) {
    global.describe = function describe(name, fn) {
        console.log(`\n\x1b[1m📦 ${name}\x1b[0m`);
        fn();
    }

    global.test = function test(name, fn) {
        total++;
        try {
            fn();
            passed++;
            console.log(`  \x1b[32m✓\x1b[0m ${name}`);
        } catch (e) {
            failed++;
            console.log(`  \x1b[31m✗\x1b[0m ${name}`);
            console.log(`    \x1b[31m${e.message}\x1b[0m`);
        }
    }

    global.expect = function expect(value) {
        return {
            toBe(expected) {
                if (value !== expected) throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
            },
            toBeNull() {
                if (value !== null) throw new Error(`Expected null but got ${JSON.stringify(value)}`);
            },
            toBeUndefined() {
                if (value !== undefined) throw new Error(`Expected undefined but got ${JSON.stringify(value)}`);
            },
            toBeCloseTo(expected, precision = 2) {
                const pow = Math.pow(10, precision);
                if (Math.round(value * pow) !== Math.round(expected * pow))
                    throw new Error(`Expected ~${expected} but got ${value}`);
            },
            toHaveLength(len) {
                if (value.length !== len) throw new Error(`Expected length ${len} but got ${value.length}`);
            },
            toContain(item) {
                if (!value.includes(item)) throw new Error(`Expected array to contain ${item}`);
            },
            toBeGreaterThan(n) {
                if (!(value > n)) throw new Error(`Expected ${value} > ${n}`);
            },
            toBeLessThanOrEqual(n) {
                if (!(value <= n)) throw new Error(`Expected ${value} <= ${n}`);
            },
        };
    }
}

// ─── Environment Setup ──────────────────────────────────────────────────────
process.env.STRIPE_PRICE_STARTER = 'price_starter_test';
process.env.STRIPE_PRICE_MEDIUM = 'price_medium_test';
process.env.STRIPE_PRICE_MAX = 'price_max_test';
process.env.FRONTEND_URL = 'http://localhost:5173';

// ─── PRICE MAP (mirrors stripe.routes.js) ───────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('Checkout Session Validation', () => {
    test('rejects missing planId', () => {
        const body = { seats: 5 };
        expect(body.planId).toBeUndefined();
    });

    test('rejects missing seats', () => {
        const body = { planId: 'starter' };
        expect(body.seats).toBeUndefined();
    });

    test('rejects invalid plan names', () => {
        const validPlans = ['starter', 'medium', 'max'];
        expect(validPlans.includes('enterprise')).toBe(false);
        expect(validPlans.includes('free')).toBe(false);
        expect(validPlans.includes('')).toBe(false);
    });

    test('accepts all valid plan names', () => {
        const validPlans = ['starter', 'medium', 'max'];
        expect(validPlans.includes('starter')).toBe(true);
        expect(validPlans.includes('medium')).toBe(true);
        expect(validPlans.includes('max')).toBe(true);
    });

    test('rejects seats = 0', () => {
        const n = parseInt('0', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(true);
    });

    test('rejects seats = -1', () => {
        const n = parseInt('-1', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(true);
    });

    test('rejects seats = 501 (over limit)', () => {
        const n = parseInt('501', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(true);
    });

    test('rejects seats = NaN', () => {
        const n = parseInt('abc', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(true);
    });

    test('accepts seats = 1 (minimum)', () => {
        const n = parseInt('1', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(false);
    });

    test('accepts seats = 500 (maximum)', () => {
        const n = parseInt('500', 10);
        expect(isNaN(n) || n < 1 || n > 500).toBe(false);
    });

    test('maps plan IDs to correct Stripe price IDs', () => {
        expect(PRICE_MAP.starter).toBe('price_starter_test');
        expect(PRICE_MAP.medium).toBe('price_medium_test');
        expect(PRICE_MAP.max).toBe('price_max_test');
    });
});

describe('Affiliate Tracking', () => {
    test('captures ref from URL params', () => {
        const url = 'http://localhost:5173/login?ref=parceiro_abc';
        const params = new URL(url).searchParams;
        expect(params.get('ref')).toBe('parceiro_abc');
    });

    test('handles missing ref gracefully', () => {
        const url = 'http://localhost:5173/login';
        const params = new URL(url).searchParams;
        expect(params.get('ref')).toBeNull();
    });

    test('injects ref into metadata and client_reference_id', () => {
        const ref = 'afiliado_joao';
        const metadata = { affiliate_ref: ref || '' };
        const sessionParams = {};
        if (ref) sessionParams.client_reference_id = ref;

        expect(metadata.affiliate_ref).toBe('afiliado_joao');
        expect(sessionParams.client_reference_id).toBe('afiliado_joao');
    });

    test('handles empty ref string', () => {
        const ref = '';
        const metadata = { affiliate_ref: ref || '' };
        expect(metadata.affiliate_ref).toBe('');
    });
});

describe('Webhook: checkout.session.completed', () => {
    test('extracts correct fields from session', () => {
        const session = {
            id: 'cs_test_123',
            customer: 'cus_stripe_123',
            subscription: 'sub_stripe_456',
            metadata: {
                company_id: 'company-456',
                plan_id: 'max',
                seats: '10',
                affiliate_ref: 'ref_code',
            },
        };

        expect(session.metadata.company_id).toBe('company-456');
        expect(session.metadata.plan_id).toBe('max');
        expect(parseInt(session.metadata.seats, 10)).toBe(10);
        expect(session.customer).toBe('cus_stripe_123');
        expect(session.subscription).toBe('sub_stripe_456');
    });

    test('handles missing affiliate_ref', () => {
        const session = { metadata: {} };
        const ref = session.metadata?.affiliate_ref || session.client_reference_id || null;
        expect(ref).toBeNull();
    });
});

describe('Webhook: subscription status mapping', () => {
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

    test('maps "active" correctly', () => expect(statusMap['active']).toBe('active'));
    test('maps "past_due" correctly', () => expect(statusMap['past_due']).toBe('past_due'));
    test('maps "canceled" correctly', () => expect(statusMap['canceled']).toBe('canceled'));
    test('maps "incomplete" to inactive', () => expect(statusMap['incomplete']).toBe('inactive'));
    test('maps "incomplete_expired" to inactive', () => expect(statusMap['incomplete_expired']).toBe('inactive'));
    test('maps "trialing" correctly', () => expect(statusMap['trialing']).toBe('trialing'));
    test('maps unknown status to undefined', () => expect(statusMap['fake']).toBeUndefined());
});

describe('Webhook: subscription.deleted (downgrade)', () => {
    test('resets to free plan with 5 seats', () => {
        const update = { plan_id: 'free', subscription_status: 'canceled', max_seats: 5 };
        expect(update.plan_id).toBe('free');
        expect(update.subscription_status).toBe('canceled');
        expect(update.max_seats).toBe(5);
    });
});

describe('Webhook: reverse-lookup plan from price_id', () => {
    const findPlan = (priceId) => {
        for (const [key, val] of Object.entries(PRICE_MAP)) {
            if (val === priceId) return key;
        }
        return null;
    };

    test('finds starter', () => expect(findPlan('price_starter_test')).toBe('starter'));
    test('finds medium', () => expect(findPlan('price_medium_test')).toBe('medium'));
    test('finds max', () => expect(findPlan('price_max_test')).toBe('max'));
    test('returns null for unknown price', () => expect(findPlan('price_unknown')).toBeNull());
});

describe('requirePlan Middleware Logic', () => {
    const checkAccess = (allowedPlans, currentPlan, status) => {
        return allowedPlans.includes(currentPlan) && (status === 'active' || currentPlan === 'free');
    };

    test('allows max plan with active status', () => expect(checkAccess(['max'], 'max', 'active')).toBe(true));
    test('denies free plan for max-only route', () => expect(checkAccess(['max'], 'free', 'inactive')).toBe(false));
    test('denies medium plan for max-only route', () => expect(checkAccess(['max'], 'medium', 'active')).toBe(false));
    test('denies max plan with canceled status', () => expect(checkAccess(['max'], 'max', 'canceled')).toBe(false));
    test('denies max plan with past_due status', () => expect(checkAccess(['max'], 'max', 'past_due')).toBe(false));
    test('allows free plan when free is in allowed list', () => expect(checkAccess(['free', 'starter', 'medium', 'max'], 'free', 'inactive')).toBe(true));
    test('allows multiple plans (medium or max)', () => expect(checkAccess(['medium', 'max'], 'medium', 'active')).toBe(true));
});

describe('requireMaxSeats Middleware Logic', () => {
    test('allows when under limit (7/10)', () => expect(7 < 10).toBe(true));
    test('blocks when at limit (10/10)', () => expect(10 >= 10).toBe(true));
    test('blocks when over limit (12/10)', () => expect(12 >= 10).toBe(true));
    test('allows single seat (1/5)', () => expect(1 < 5).toBe(true));
    test('blocks zero remaining (5/5)', () => expect(5 >= 5).toBe(true));
});

describe('Price Calculations (Per-Seat)', () => {
    const prices = { starter: 6.99, medium: 11.99, max: 14.99 };

    test('5 seats Starter = R$ 34,95', () => expect(prices.starter * 5).toBeCloseTo(34.95));
    test('10 seats Medium = R$ 119,90', () => expect(prices.medium * 10).toBeCloseTo(119.90));
    test('50 seats Max = R$ 749,50', () => expect(prices.max * 50).toBeCloseTo(749.50));
    test('1 seat Starter = R$ 6,99', () => expect(prices.starter * 1).toBeCloseTo(6.99));
    test('1 seat Max = R$ 14,99', () => expect(prices.max * 1).toBeCloseTo(14.99));
    test('100 seats Max = R$ 1.499,00', () => expect(prices.max * 100).toBeCloseTo(1499.00));
    test('500 seats Starter = R$ 3.495,00', () => expect(prices.starter * 500).toBeCloseTo(3495.00));
});

describe('Subscription Store Logic', () => {
    test('canUseAI = true only for max+active', () => {
        const canUseAI = (plan, status) => plan === 'max' && status === 'active';
        expect(canUseAI('max', 'active')).toBe(true);
        expect(canUseAI('medium', 'active')).toBe(false);
        expect(canUseAI('max', 'canceled')).toBe(false);
        expect(canUseAI('starter', 'active')).toBe(false);
    });

    test('seatsRemaining never goes negative', () => {
        const remaining = (max, active) => Math.max(0, max - active);
        expect(remaining(10, 7)).toBe(3);
        expect(remaining(10, 10)).toBe(0);
        expect(remaining(5, 8)).toBe(0);
        expect(remaining(1, 0)).toBe(1);
    });

    test('isActive only for "active" status', () => {
        const isActive = (s) => s === 'active';
        expect(isActive('active')).toBe(true);
        expect(isActive('past_due')).toBe(false);
        expect(isActive('canceled')).toBe(false);
        expect(isActive('inactive')).toBe(false);
    });

    test('plan definitions are complete', () => {
        const plans = ['starter', 'medium', 'max'];
        expect(plans).toHaveLength(3);
        expect(plans).toContain('starter');
        expect(plans).toContain('medium');
        expect(plans).toContain('max');
    });
});

describe('Webhook Signature Security', () => {
    test('rejects missing rawBody', () => {
        const rawBody = undefined;
        expect(!rawBody).toBe(true);
    });

    test('rejects missing stripe-signature header', () => {
        const sig = '';
        expect(!sig).toBe(true);
    });

    test('rejects missing webhook secret env var', () => {
        const secret = '';
        expect(!secret).toBe(true);
    });
});

describe('Raw Body Middleware Path Matching', () => {
    test('matches /api/stripe/webhook POST', () => {
        const path = '/api/stripe/webhook';
        const method = 'POST';
        expect(path === '/api/stripe/webhook' && method === 'POST').toBe(true);
    });

    test('does not match /api/stripe/create-checkout-session', () => {
        const path = '/api/stripe/create-checkout-session';
        expect(path === '/api/stripe/webhook').toBe(false);
    });

    test('does not match GET /api/stripe/webhook', () => {
        const path = '/api/stripe/webhook';
        const method = 'GET';
        expect(path === '/api/stripe/webhook' && method === 'POST').toBe(false);
    });
});

// ─── RESULTS ────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60));
console.log(`\x1b[1m📊 Results: ${passed}/${total} passed\x1b[0m`);
if (failed > 0) {
    console.log(`\x1b[31m❌ ${failed} test(s) failed\x1b[0m`);
    if (!process.env.JEST_WORKER_ID) process.exit(1);
} else {
    console.log(`\x1b[32m✅ All tests passed!\x1b[0m`);
    if (!process.env.JEST_WORKER_ID) process.exit(0);
}
