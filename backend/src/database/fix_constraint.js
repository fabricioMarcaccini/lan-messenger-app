import { pgPool } from '../config/database.js';

async function removeConstraint() {
    console.log('Removing content_type constraint permanently...');
    const client = await pgPool.connect();

    try {
        // Try multiple approaches to make sure it's gone
        await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check');
        console.log('DROP executed');

        // Verify
        const check = await client.query(`
            SELECT COUNT(*) as cnt FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass AND conname = 'messages_content_type_check'
        `);
        console.log('Constraint count:', check.rows[0].cnt);

        // Also try via direct ALTER approach without transaction
        if (parseInt(check.rows[0].cnt) > 0) {
            console.log('Still exists, trying direct approach...');
            await client.query('ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_content_type_check');
        }

        // Final verify
        const final = await client.query(`
            SELECT COUNT(*) as cnt FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass AND conname LIKE '%content_type%'
        `);
        console.log('Final constraint count:', final.rows[0].cnt);

        // Test insert
        await client.query('BEGIN');
        const user = (await client.query('SELECT id FROM users LIMIT 1')).rows[0];
        const conv = (await client.query('SELECT id FROM conversations LIMIT 1')).rows[0];
        await client.query(
            `INSERT INTO messages (conversation_id, sender_id, content, content_type) VALUES ($1, $2, 'test', 'sticker')`,
            [conv.id, user.id]
        );
        await client.query('ROLLBACK');
        console.log('✅ INSERT test: SUCCESS');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}

removeConstraint();
