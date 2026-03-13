import { db } from '../config/database.js';

const runQuery = async (client, query, params = []) => {
    if (client) {
        return client.query(query, params);
    }
    return db.write(query, params);
};

export async function findByUsernameOrEmail(username, email, client = null) {
    const result = await runQuery(
        client,
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
    );
    return result.rows[0] || null;
}

export async function findActiveByUsernameOrEmail(usernameOrEmail, client = null) {
    const result = await runQuery(
        client,
        'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
        [usernameOrEmail]
    );
    return result.rows[0] || null;
}

export async function findActiveByEmail(email, client = null) {
    const result = await runQuery(
        client,
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
    );
    return result.rows[0] || null;
}

export async function findById(userId, client = null) {
    const result = await runQuery(
        client,
        'SELECT * FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

export async function findActiveById(userId, client = null) {
    const result = await runQuery(
        client,
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [userId]
    );
    return result.rows[0] || null;
}

export async function findProfileById(userId, client = null) {
    const result = await runQuery(
        client,
        `SELECT id, username, email, full_name, avatar_url, role, department, company_id,
                custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message, is_two_factor_enabled
         FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows[0] || null;
}

export async function findActiveBasicByUsernameOrEmail(usernameOrEmail, client = null) {
    const result = await runQuery(
        client,
        'SELECT id, username, email, full_name FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
        [usernameOrEmail]
    );
    return result.rows[0] || null;
}

export async function createAdminUser({
    companyId,
    username,
    email,
    passwordHash,
    fullName,
    avatarUrl = null,
}, client = null) {
    const result = await runQuery(
        client,
        `INSERT INTO users (company_id, username, email, password_hash, full_name, role, avatar_url)
         VALUES ($1, $2, $3, $4, $5, 'admin', $6)
         RETURNING id, company_id, username, email, full_name, role, avatar_url`,
        [companyId, username, email, passwordHash, fullName, avatarUrl]
    );
    return result.rows[0];
}

export async function createUser({
    companyId,
    username,
    email,
    passwordHash,
    fullName,
    role = 'user',
    department = null,
    position = null,
}, client = null) {
    const result = await runQuery(
        client,
        `INSERT INTO users (company_id, username, email, password_hash, full_name, role, department, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, username, email, full_name, role`,
        [companyId, username, email, passwordHash, fullName || username, role, department, position]
    );
    return result.rows[0];
}

export async function updateLastSeen(userId, client = null) {
    await runQuery(
        client,
        'UPDATE users SET last_seen_at = NOW() WHERE id = $1',
        [userId]
    );
}

export async function updatePassword(userId, passwordHash, client = null) {
    await runQuery(
        client,
        'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
        [userId, passwordHash]
    );
}

export async function setTwoFactorSecret(userId, secret, client = null) {
    await runQuery(
        client,
        'UPDATE users SET two_factor_secret = $2 WHERE id = $1',
        [userId, secret]
    );
}

export async function getTwoFactorInfo(userId, client = null) {
    const result = await runQuery(
        client,
        'SELECT two_factor_secret, is_two_factor_enabled FROM users WHERE id = $1',
        [userId]
    );
    return result.rows[0] || null;
}

export async function enableTwoFactor(userId, client = null) {
    await runQuery(
        client,
        'UPDATE users SET is_two_factor_enabled = true WHERE id = $1',
        [userId]
    );
}

export async function disableTwoFactor(userId, client = null) {
    await runQuery(
        client,
        'UPDATE users SET is_two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
        [userId]
    );
}

export async function listAdminsByCompany(companyId, client = null) {
    const result = await runQuery(
        client,
        "SELECT id FROM users WHERE company_id = $1 AND role = 'admin'",
        [companyId]
    );
    return result.rows;
}

export async function createUserWithSeatLock(companyId, userData) {
    return db.transaction(async (client) => {
        const companyResult = await client.query(
            'SELECT max_seats FROM companies WHERE id = $1 FOR UPDATE',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            throw Object.assign(new Error('Empresa não encontrada'), { status: 404, code: 'COMPANY_NOT_FOUND' });
        }

        const maxSeats = companyResult.rows[0].max_seats || 5;

        const usersResult = await client.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
            [companyId]
        );
        const activeUsers = parseInt(usersResult.rows[0].count, 10);

        if (activeUsers >= maxSeats) {
            throw Object.assign(
                new Error(`Limite de ${maxSeats} usuários atingido (${activeUsers}/${maxSeats}). Faça upgrade do plano.`),
                { status: 403, code: 'SEAT_LIMIT_REACHED', maxSeats, activeUsers }
            );
        }

        const { username, email, passwordHash, fullName, role, department, position } = userData;
        const insertResult = await client.query(
            `INSERT INTO users (company_id, username, email, password_hash, full_name, role, department, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, email, full_name, role`,
            [companyId, username, email, passwordHash, fullName || username, role || 'user', department || null, position || null]
        );

        return {
            user: insertResult.rows[0],
            seatInfo: { maxSeats, activeUsers: activeUsers + 1, seatsRemaining: maxSeats - activeUsers - 1 }
        };
    });
}

export async function createBulkUsersWithSeatLock(companyId, usersData) {
    return db.transaction(async (client) => {
        const companyResult = await client.query(
            'SELECT max_seats FROM companies WHERE id = $1 FOR UPDATE',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            throw Object.assign(new Error('Empresa não encontrada'), { status: 404, code: 'COMPANY_NOT_FOUND' });
        }

        const maxSeats = companyResult.rows[0].max_seats || 5;

        const usersResult = await client.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
            [companyId]
        );
        const activeUsers = parseInt(usersResult.rows[0].count, 10);

        const attemptingToAdd = usersData.length;
        if (activeUsers + attemptingToAdd > maxSeats) {
            throw Object.assign(
                new Error(`Limite de ${maxSeats} usuários seria excedido. Você tem ${activeUsers} ativos e está tentando adicionar ${attemptingToAdd}.`),
                { status: 403, code: 'SEAT_LIMIT_REACHED', maxSeats, activeUsers, attemptingToAdd }
            );
        }

        const emails = usersData.map((user) => user.email);
        const usernames = usersData.map((user) => user.username);

        const existingResult = await client.query(
            'SELECT username, email FROM users WHERE company_id = $1 AND (email = ANY($2::text[]) OR username = ANY($3::text[]))',
            [companyId, emails, usernames]
        );

        if (existingResult.rows.length > 0) {
            const conflicts = existingResult.rows.map((row) => row.email).join(', ');
            throw Object.assign(
                new Error(`Os seguintes e-mails/usuários já existem: ${conflicts}`),
                { status: 409, code: 'USERS_ALREADY_EXIST', conflicts: existingResult.rows }
            );
        }

        const createdUsers = [];
        for (const userData of usersData) {
            const { username, email, passwordHash, fullName, role, department, position } = userData;
            const insertResult = await client.query(
                `INSERT INTO users (company_id, username, email, password_hash, full_name, role, department, position)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, username, email, full_name, role`,
                [companyId, username, email, passwordHash, fullName || username, role || 'user', department || null, position || null]
            );
            createdUsers.push(insertResult.rows[0]);
        }

        return {
            users: createdUsers,
            seatInfo: {
                maxSeats,
                activeUsers: activeUsers + attemptingToAdd,
                seatsRemaining: maxSeats - (activeUsers + attemptingToAdd)
            }
        };
    });
}
