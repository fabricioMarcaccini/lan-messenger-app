import { pgPool } from '../config/database.js';

async function testInsert() {
    const client = await pgPool.connect();
    try {
        // Get a real user and conversation for testing
        const userRes = await client.query('SELECT id, company_id FROM users LIMIT 1');
        const user = userRes.rows[0];
        console.log('Test user:', user.id);

        const convRes = await client.query(
            `SELECT id FROM conversations WHERE $1 = ANY(participant_ids) LIMIT 1`,
            [user.id]
        );

        if (convRes.rows.length === 0) {
            console.log('No conversations found for user');
            return;
        }

        const convId = convRes.rows[0].id;
        console.log('Test conversation:', convId);

        // Try to insert a sticker message
        console.log('\nAttempting INSERT with contentType=sticker...');
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO messages (conversation_id, sender_id, content, content_type)
             VALUES ($1, $2, $3, $4)
             RETURNING id, created_at`,
            [convId, user.id, 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg', 'sticker']
        );

        console.log('✅ INSERT successful:', result.rows[0]);

        // Rollback so we don't create a real message
        await client.query('ROLLBACK');
        console.log('(Rolled back - no data modified)');

        // Check triggers on messages table
        console.log('\nChecking triggers on messages table:');
        const triggers = await client.query(`
            SELECT tgname, tgtype, pg_get_triggerdef(oid) as def 
            FROM pg_trigger 
            WHERE tgrelid = 'messages'::regclass 
            AND NOT tgisinternal
        `);
        triggers.rows.forEach(t => console.log(`  - ${t.tgname}: ${t.def.substring(0, 120)}`));

    } catch (e) {
        console.error('❌ Error:', e.message);
        console.error('Detail:', e.detail || e.hint || 'none');
        try { await client.query('ROLLBACK'); } catch (_) { }
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}
testInsert();
