import { pgPool } from '../config/database.js';

async function fixConstraint() {
    console.log('Fixing content_type constraint...');

    try {
        // Step 1: Drop the existing constraint
        await pgPool.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check;');
        console.log('✅ Dropped old constraint');

        // Step 2: Add the new constraint with 'sticker' included
        await pgPool.query(`
            ALTER TABLE messages 
            ADD CONSTRAINT messages_content_type_check 
            CHECK (content_type IN ('text', 'file', 'image', 'audio', 'video', 'pdf', 'deleted', 'call', 'poll', 'meeting', 'sticker'))
        `);
        console.log('✅ Added new constraint with sticker');

        // Step 3: Verify
        const verify = await pgPool.query(`
            SELECT pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass 
            AND conname = 'messages_content_type_check'
        `);

        if (verify.rows.length > 0) {
            const def = verify.rows[0].def;
            console.log('Constraint:', def.substring(0, 250));
            console.log('Has sticker:', def.includes('sticker') ? '✅ YES' : '❌ NO');
        }

        // Step 4: Test insert
        await pgPool.query('BEGIN');
        const user = (await pgPool.query('SELECT id FROM users LIMIT 1')).rows[0];
        const conv = (await pgPool.query('SELECT id FROM conversations WHERE $1 = ANY(participant_ids) LIMIT 1', [user.id])).rows[0];

        await pgPool.query(
            `INSERT INTO messages (conversation_id, sender_id, content, content_type) VALUES ($1, $2, 'test', 'sticker')`,
            [conv.id, user.id]
        );
        await pgPool.query('ROLLBACK');
        console.log('✅ Test INSERT with sticker: SUCCESS');

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await pgPool.end();
        process.exit(0);
    }
}

fixConstraint();
