import { db } from '../config/database.js';

export async function createTrialCompany({ name, trialEndsAt, maxSeats = 5 }) {
    const result = await db.write(
        `INSERT INTO companies (name, plan_id, subscription_status, max_seats, trial_ends_at)
         VALUES ($1, 'trial', 'trialing', $2, $3)
         RETURNING id`,
        [name, maxSeats, trialEndsAt.toISOString()]
    );
    return result.rows[0];
}

export async function getPlanInfo(companyId) {
    if (!companyId) {
        return null;
    }
    const result = await db.write(
        'SELECT plan_id, subscription_status, trial_ends_at FROM companies WHERE id = $1',
        [companyId]
    );
    return result.rows[0] || null;
}
