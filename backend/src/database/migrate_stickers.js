import { pgPool } from '../config/database.js';

async function runMigration() {
    console.log('Starting migration for Stickers...');
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        console.log('-- Content type normalization for stickers --');
        // Drop existing constraint safely
        await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check;');
        await client.query(`
            ALTER TABLE messages
            ADD CONSTRAINT messages_content_type_check
            CHECK (content_type IN ('text', 'file', 'image', 'audio', 'video', 'pdf', 'deleted', 'call', 'poll', 'meeting', 'sticker'));
        `);

        console.log('-- Create Sticker Packs table --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS sticker_packs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                author VARCHAR(100),
                is_official BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log('-- Create Stickers table --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS stickers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                is_animated BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Make pack_id nullable if it isn't already (fix for stickers without packs)
        await client.query(`ALTER TABLE stickers ALTER COLUMN pack_id DROP NOT NULL;`);

        console.log('-- Create User Favorite Stickers table --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_favorite_stickers (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                sticker_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
                added_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, sticker_id)
            );
        `);

        await client.query('COMMIT');
        console.log('✅ Sticker migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}

runMigration();
