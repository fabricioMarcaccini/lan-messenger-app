import Router from 'koa-router';
import { db, cache } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { scanNetwork, getLocalNetworkInfo } from '../services/network.service.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/network/info - Get local network information
router.get('/info', async (ctx) => {
    try {
        const networkInfo = await getLocalNetworkInfo();
        ctx.body = {
            success: true,
            data: networkInfo,
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: error.message };
    }
});

// GET /api/network/scan - Trigger network scan
router.get('/scan', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    try {
        // Skip cache for fresh scan
        console.log(`📡 Starting network scan for company ${companyId}...`);

        // Perform network scan
        const devices = await scanNetwork();

        // Save to database
        for (const device of devices) {
            await db.write(`
                INSERT INTO network_devices (company_id, ip_address, mac_address, hostname, device_type, is_online, latency_ms, last_seen_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (company_id, ip_address) 
                DO UPDATE SET 
                    mac_address = COALESCE($3, network_devices.mac_address), 
                    hostname = COALESCE($4, network_devices.hostname), 
                    device_type = COALESCE($5, network_devices.device_type),
                    is_online = $6, 
                    latency_ms = $7, 
                    last_seen_at = NOW()
            `, [companyId, device.ip, device.mac, device.hostname, device.deviceType, device.isAlive, device.latency]);
        }

        // Mark offline devices that weren't found
        const foundIps = devices.map(d => d.ip);
        if (foundIps.length > 0) {
            await db.write(`
                UPDATE network_devices 
                SET is_online = false, last_seen_at = NOW() 
                WHERE company_id = $1 
                AND ip_address NOT IN (${foundIps.map((_, i) => `$${i + 2}`).join(',')})
            `, [companyId, ...foundIps]);
        }

        // Cache for 30 seconds
        await cache.set(`network:${companyId}:devices`, devices, 30);

        ctx.body = {
            success: true,
            data: {
                devices: devices.map(d => ({
                    ipAddress: d.ip,
                    macAddress: d.mac,
                    hostname: d.hostname,
                    deviceType: d.deviceType,
                    vendor: d.vendor,
                    isOnline: d.isAlive,
                    latencyMs: d.latency,
                })),
                count: devices.length,
                fromCache: false
            },
        };
    } catch (error) {
        console.error('Network scan error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: error.message };
    }
});

// GET /api/network/devices - Get discovered devices
router.get('/devices', async (ctx) => {
    const companyId = ctx.state.user.companyId;
    const { onlineOnly = 'false' } = ctx.query;

    let query = `
        SELECT nd.*, u.username as linked_username, u.full_name as linked_user_name
        FROM network_devices nd
        LEFT JOIN users u ON u.id = nd.linked_user_id
        WHERE nd.company_id = $1
    `;

    if (onlineOnly === 'true') {
        query += ' AND nd.is_online = true';
    }

    query += ' ORDER BY nd.is_online DESC, nd.ip_address ASC';

    const result = await db.write(query, [companyId]);

    ctx.body = {
        success: true,
        data: result.rows.map(d => ({
            id: d.id,
            ipAddress: d.ip_address,
            macAddress: d.mac_address,
            hostname: d.hostname,
            deviceType: d.device_type,
            isOnline: d.is_online,
            latencyMs: d.latency_ms,
            linkedUserId: d.linked_user_id,
            linkedUsername: d.linked_username,
            linkedUserName: d.linked_user_name,
            lastSeenAt: d.last_seen_at,
        })),
    };
});

// POST /api/network/devices/:id/link - Link device to user
router.post('/devices/:id/link', async (ctx) => {
    const { id } = ctx.params;
    const { userId } = ctx.request.body;

    const result = await db.write(
        'UPDATE network_devices SET linked_user_id = $2 WHERE id = $1 RETURNING id',
        [id, userId]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Dispositivo não encontrado' };
        return;
    }

    ctx.body = {
        success: true,
        message: 'Dispositivo vinculado ao usuário',
    };
});

// GET /api/network/stats - Get network statistics
router.get('/stats', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const [total, online, avgLatency] = await Promise.all([
        db.write('SELECT COUNT(*) as count FROM network_devices WHERE company_id = $1', [companyId]),
        db.write('SELECT COUNT(*) as count FROM network_devices WHERE company_id = $1 AND is_online = true', [companyId]),
        db.write('SELECT AVG(latency_ms) as avg FROM network_devices WHERE company_id = $1 AND is_online = true', [companyId]),
    ]);

    ctx.body = {
        success: true,
        data: {
            totalDevices: parseInt(total.rows[0].count),
            onlineDevices: parseInt(online.rows[0].count),
            avgLatencyMs: Math.round(parseFloat(avgLatency.rows[0].avg) || 0),
        },
    };
});

export default router;
