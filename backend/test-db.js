import { db } from './src/config/database.js';

console.log('🚀 Starting Database Test...');

async function run() {
    try {
        const companyId = '00000000-0000-0000-0000-000000000001';

        console.log('1️⃣ Checking Company...');
        const company = await db.write('SELECT * FROM companies WHERE id = $1', [companyId]);
        console.log('Company found:', company.rows.length > 0);

        console.log('2️⃣ Inserting Fake Device...');
        const device = {
            ip: '192.168.1.99',
            mac: '00:00:00:00:00:99',
            hostname: 'test-device',
            isAlive: true,
            latency: 10
        };

        await db.write(`
            INSERT INTO network_devices (company_id, ip_address, mac_address, hostname, is_online, latency_ms, last_seen_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (company_id, ip_address) 
            DO UPDATE SET mac_address = $3, hostname = $4, is_online = $5, latency_ms = $6, last_seen_at = NOW()
        `, [companyId, device.ip, device.mac, device.hostname, device.isAlive, device.latency]);

        console.log('✅ Device inserted successfully!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // process.exit(0);
    }
}

run();
