import fs from 'fs';
import { db } from './backend/src/config/database.js';

async function runMigration() {
    try {
        console.log('Running enterprise features migration (Tasks & Wiki)...');
        const sql = fs.readFileSync('add_enterprise_features.sql', 'utf8');
        await db.write(sql);
        console.log('✅ Enterprise tasks migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
