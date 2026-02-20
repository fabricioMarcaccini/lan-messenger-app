import { db } from './src/config/database.js';

async function checkSchema() {
    try {
        console.log('🔍 Checking users table schema...');

        const result = await db.write(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);

        console.log('Found columns:', result.rows.map(r => r.column_name).join(', '));

        const hasDepartment = result.rows.some(r => r.column_name === 'department');
        const hasPosition = result.rows.some(r => r.column_name === 'position');

        console.log(`Department column exists: ${hasDepartment ? '✅' : '❌'}`);
        console.log(`Position column exists: ${hasPosition ? '✅' : '❌'}`);

        if (!hasDepartment || !hasPosition) {
            console.log('⚠️ Missing columns! Attempting to add them...');
            try {
                if (!hasDepartment) {
                    await db.write('ALTER TABLE users ADD COLUMN department VARCHAR(100)');
                    console.log('✅ Added department column');
                }
                if (!hasPosition) {
                    await db.write('ALTER TABLE users ADD COLUMN position VARCHAR(100)');
                    console.log('✅ Added position column');
                }
            } catch (err) {
                console.error('❌ Failed to add columns:', err.message);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

checkSchema();
