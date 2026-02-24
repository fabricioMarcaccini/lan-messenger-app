import { pgPool } from '../config/database.js';

async function runMigration() {
    console.log('Starting channels migration for conversations table...');
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        console.log('Altering conversations table...');

        // Add company_id
        await client.query(`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
        `);

        // Add description
        await client.query(`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS description VARCHAR(500);
        `);

        // Add is_public
        await client.query(`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
        `);

        // Add creator_id
        await client.query(`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);

        // Add group_admins
        await client.query(`
            ALTER TABLE conversations 
            ADD COLUMN IF NOT EXISTS group_admins UUID[] DEFAULT '{}';
        `);

        console.log('Updating existing conversations to have default group_admins if necessary...');

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
