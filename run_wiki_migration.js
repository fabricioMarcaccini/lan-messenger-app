import fs from 'fs';
import { db } from './backend/src/config/database.js';

async function runMigration() {
    try {
        console.log('Running enterprise wiki schema migration...');
        const sql = fs.readFileSync('enterprise_wiki.sql', 'utf8');
        await db.write(sql);
        console.log('✅ Enterprise wiki migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
