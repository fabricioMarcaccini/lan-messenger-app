import { pgPool } from '../config/database.js';

async function check() {
    try {
        const r = await pgPool.query('SELECT COUNT(*) as cnt FROM stickers');
        console.log('Total stickers:', r.rows[0].cnt);

        const r2 = await pgPool.query('SELECT file_url FROM stickers LIMIT 3');
        console.log('Sample stickers:', r2.rows);

        const r3 = await pgPool.query(`
            SELECT conname, pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass 
            AND conname LIKE '%content_type%'
        `);
        console.log('Constraint:', r3.rows);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pgPool.end();
        process.exit(0);
    }
}
check();
