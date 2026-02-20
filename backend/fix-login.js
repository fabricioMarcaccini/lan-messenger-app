import { db } from './src/config/database.js';
import bcrypt from 'bcrypt';

async function testLogin() {
    console.log('🔄 Starting login test...');

    const username = 'admin';
    const password = 'admin123';

    try {
        console.log(`1️⃣  Hashing password "${password}"...`);
        const newHash = await bcrypt.hash(password, 10);
        console.log(`✅ Generated hash: ${newHash}`);

        console.log('2️⃣  Updating user in database...');
        await db.write(
            'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, password_hash',
            [newHash, username]
        );
        console.log('✅ User updated successfully');

        console.log('3️⃣  Fetching user from database...');
        const result = await db.write('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            console.error('❌ User not found!');
            process.exit(1);
        }
        console.log(`✅ User found: ${user.username}`);
        console.log(`   Stored hash: ${user.password_hash}`);

        console.log('4️⃣  Comparing passwords...');
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            console.log('🎉 SUCCESS! Password matches.');
        } else {
            console.error('❌ FAILURE! Password does not match.');
            console.error(`   Input: ${password}`);
            console.error(`   Hash:  ${user.password_hash}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }

    process.exit(0);
}

testLogin();
