/**
 * Migration: Add file_data (base64 TEXT) column to file_uploads
 * This enables storing files in the DB (persistent on Render)
 * Also updates file_path URLs for existing rows
 */
import { db } from './src/config/database.js';

async function migrate() {
    console.log('🔄 Running file_data migration...');
    try {
        // Add file_data column if not exists
        await db.write(`
            ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS file_data TEXT
        `);
        console.log('✅ file_data column added to file_uploads');

        // Update file_path for existing rows to point to new route
        await db.write(`
            UPDATE file_uploads 
            SET file_path = '/api/uploads/' || id || '/file'
            WHERE file_path NOT LIKE '/api/uploads%'
        `);
        console.log('✅ Existing file paths updated');

        // Expand content_type CHECK constraint
        await db.write(`ALTER TABLE file_uploads DROP CONSTRAINT IF EXISTS file_uploads_content_type_check`);
        await db.write(`
            ALTER TABLE file_uploads ADD CONSTRAINT file_uploads_content_type_check
            CHECK (content_type IN ('text','file','image','audio','video','pdf','call'))
        `);
        console.log('✅ file_uploads content_type constraint expanded');

        console.log('\n🎉 file_data migration completed!');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
    process.exit(0);
}

migrate();
