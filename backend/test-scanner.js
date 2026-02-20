import { scanNetwork, getLocalNetworkInfo } from './src/services/network.service.js';

console.log('🚀 Starting Network Scanner Test...');

async function run() {
    try {
        console.log('1️⃣ Getting Local Network Info...');
        const info = await getLocalNetworkInfo();
        console.log('✅ Network Info:', info);

        console.log('2️⃣ Running Full Scan...');
        const start = Date.now();
        const devices = await scanNetwork();
        const duration = (Date.now() - start) / 1000;

        console.log(`✅ Scan Complete in ${duration}s`);
        console.log(`📱 Devices Found: ${devices.length}`);
        console.log(JSON.stringify(devices, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
        console.error('Stack:', error.stack);
    }
}

run();
