import { db } from '../config/database.js';

export async function getInviteWithCompanyByCode(code) {
    const result = await db.query(
        `SELECT i.id, i.company_id, i.expires_at, i.max_uses, i.uses,
                c.name as company_name, c.logo_url
         FROM company_invites i
         JOIN companies c ON c.id = i.company_id
         WHERE i.code = $1`,
        [code]
    );
    return result.rows[0] || null;
}

export async function getInviteForJoin(code) {
    const result = await db.query(
        `SELECT i.id, i.company_id, i.expires_at, i.max_uses, i.uses
         FROM company_invites i
         WHERE i.code = $1 FOR UPDATE`,
        [code]
    );
    return result.rows[0] || null;
}

export async function incrementInviteUses(inviteId) {
    await db.query(
        'UPDATE company_invites SET uses = uses + 1 WHERE id = $1',
        [inviteId]
    );
}
