import { db } from './src/config/database.js';

async function runMigration() {
    try {
        console.log('Starting migration...');

        // Adicionar colunas para grupos
        await db.write(`
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description TEXT;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS creator_id UUID;
            -- Add index for performance on arrays
            CREATE INDEX IF NOT EXISTS idx_conversations_participants_gin ON conversations USING GIN (participant_ids);
        `);

        console.log('✅ Migration success!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    }
    process.exit(0);
}

runMigration();
