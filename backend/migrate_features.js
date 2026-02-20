import { db } from './src/config/database.js';

async function migrate() {
    try {
        console.log('🔄 Iniciando migrações...');
        await db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_admins UUID[] DEFAULT '{}'");
        console.log('✅ Coluna group_admins adicionada');
        await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false');
        console.log('✅ Coluna is_deleted adicionada');
        await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP');
        console.log('✅ Coluna edited_at adicionada');

        try {
            await db.write("ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check");
        } catch (e) { console.log('Constraint check drop failed:', e.message); }

        // Allow deleted as content type safely
        await db.write("ALTER TABLE messages ADD CONSTRAINT messages_content_type_check CHECK (content_type IN ('text', 'file', 'image', 'video', 'audio', 'pdf', 'deleted'))");
        console.log('✅ Constraint atualizada');

        console.log('🎉 Todas as migrações aplicadas com sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
