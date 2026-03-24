import fs from 'fs';
import { db } from './backend/src/config/database.js';

async function runMigration() {
    try {
        console.log('Running enterprise billing migration...');
        const sql = fs.readFileSync('backend/src/database/add_enterprise_billing_fields.sql', 'utf8');
        await db.write(sql);
        console.log('✅ Enterprise billing migration completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
