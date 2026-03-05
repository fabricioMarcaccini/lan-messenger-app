import { pgPool } from '../config/database.js';

async function deepDiag() {
    console.log('=== DEEP DIAGNOSTIC ===\n');

    try {
        // 1. ALL constraints on messages table
        console.log('1) ALL constraints on messages table:');
        const allConstraints = await pgPool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def, contype
            FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass
        `);
        allConstraints.rows.forEach(r => {
            console.log(`   [${r.contype}] ${r.conname}: ${r.def.substring(0, 200)}`);
        });

        // 2. Check if there are RLS policies blocking inserts
        console.log('\n2) Row Level Security policies on messages:');
        const rls = await pgPool.query(`
            SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as qual
            FROM pg_policy
            WHERE polrelid = 'messages'::regclass
        `);
        if (rls.rows.length === 0) {
            console.log('   None (RLS not active)');
        } else {
            rls.rows.forEach(r => console.log(`   ${r.polname} (${r.polcmd}): ${r.qual}`));
        }

        // 3. Check if RLS is enabled
        const rlsEnabled = await pgPool.query(`
            SELECT relrowsecurity, relforcerowsecurity
            FROM pg_class WHERE relname = 'messages'
        `);
        console.log(`   RLS enabled: ${rlsEnabled.rows[0]?.relrowsecurity}, forced: ${rlsEnabled.rows[0]?.relforcerowsecurity}`);

        // 4. Full column info for messages
        console.log('\n3) Messages table columns:');
        const cols = await pgPool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'messages'
            ORDER BY ordinal_position
        `);
        cols.rows.forEach(c => {
            console.log(`   ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : ''} ${c.column_default ? 'DEFAULT ' + c.column_default.substring(0, 30) : ''}`);
        });

        // 5. Direct test insert with FULL error details
        console.log('\n4) Direct INSERT test:');
        const user = (await pgPool.query('SELECT id FROM users LIMIT 1')).rows[0];
        const conv = (await pgPool.query("SELECT id FROM conversations WHERE id = '55fd70b4-cf3d-4c8e-9c8d-2bbc747e923d'")).rows[0];

        if (conv) {
            try {
                await pgPool.query('BEGIN');
                const result = await pgPool.query(
                    `INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url, reply_to, thread_id, expires_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     RETURNING id, created_at`,
                    [conv.id, user.id, 'https://cdn.jsdelivr.net/test.svg', 'sticker', null, null, null, null]
                );
                console.log('   ✅ SUCCESS:', result.rows[0]);
                await pgPool.query('ROLLBACK');
            } catch (e) {
                await pgPool.query('ROLLBACK');
                console.log('   ❌ FAILED');
                console.log('   Error:', e.message);
                console.log('   Code:', e.code);
                console.log('   Detail:', e.detail);
                console.log('   Schema:', e.schema);
                console.log('   Table:', e.table);
                console.log('   Constraint:', e.constraint);
                console.log('   Full:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2).substring(0, 500));
            }
        }

        // 6. Check the actual constraint value right now
        console.log('\n5) Current content_type constraint value:');
        const currentConstraint = await pgPool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass 
            AND conname LIKE '%content_type%'
        `);
        if (currentConstraint.rows.length === 0) {
            console.log('   ⚠️ NO content_type constraint found');
        } else {
            console.log('   Name:', currentConstraint.rows[0].conname);
            console.log('   Full definition:');
            console.log('   ', currentConstraint.rows[0].def);
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pgPool.end();
        process.exit(0);
    }
}

deepDiag();
