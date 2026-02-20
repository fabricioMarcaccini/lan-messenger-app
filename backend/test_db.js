import { db } from './src/config/database.js';
import bcrypt from 'bcrypt';

async function test() {
    try {
        const passwordHash = await bcrypt.hash('test1234', 10);
        await db.write(`
            INSERT INTO users (username, email, password_hash, full_name, is_active)
            VALUES ('testuser', 'test@test.com', $1, 'Test User', true)
            ON CONFLICT (username) DO UPDATE SET password_hash = $1
        `, [passwordHash]);
        console.log('Test user created/updated: testuser / test1234');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

test();
