/**
 * Migration: Expand content_type CHECK constraint to support all message types
 * and add missing columns (is_deleted, edited_at, reply_to, reactions, expires_at)
 */
import { db } from './src/config/database.js';

async function migrate() {
    console.log('🔄 Running content_type migration...');
    try {
        const allowedTypes = ['text', 'file', 'image', 'audio', 'video', 'pdf', 'deleted', 'call', 'poll', 'meeting'];

        // 1. Drop the restrictive CHECK constraint on content_type
        await db.write(`
            ALTER TABLE messages 
            DROP CONSTRAINT IF EXISTS messages_content_type_check
        `);
        console.log('✅ Dropped old content_type CHECK constraint');

        // 2. Normalize legacy/invalid values before recreating CHECK constraint
        const normalizeResult = await db.write(`
            UPDATE messages
            SET content_type = 'text'
            WHERE content_type IS NULL
               OR content_type NOT IN (${allowedTypes.map((_, i) => `$${i + 1}`).join(',')})
        `, allowedTypes);
        console.log(`✅ Normalized invalid content_type rows: ${normalizeResult.rowCount}`);

        // 3. Add a CHECK covering all supported types
        await db.write(`
            ALTER TABLE messages
            ADD CONSTRAINT messages_content_type_check
            CHECK (content_type IN ('text','file','image','audio','video','pdf','deleted','call','poll','meeting'))
        `);
        console.log('✅ Added expanded content_type CHECK constraint');

        // 4. Ensure is_deleted column
        await db.write(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false
        `);
        console.log('✅ is_deleted column OK');

        // 5. Ensure edited_at column
        await db.write(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP
        `);
        console.log('✅ edited_at column OK');

        // 6. Ensure reply_to column
        await db.write(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL
        `);
        console.log('✅ reply_to column OK');

        // 7. Ensure reactions column
        await db.write(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'
        `);
        console.log('✅ reactions column OK');

        // 8. Ensure expires_at column
        await db.write(`
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
        `);
        console.log('✅ expires_at column OK');

        console.log('\n🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
    process.exit(0);
}

migrate();
