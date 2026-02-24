import { pgPool } from '../config/database.js';

async function runMigration() {
    console.log('Starting message_reactions migration...');
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        console.log('Altering messages table to add reactions column...');
        await client.query(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
        `);

        console.log('Dropping message_reactions table if exists...');
        await client.query(`
            DROP TABLE IF EXISTS message_reactions CASCADE;
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}

runMigration();
