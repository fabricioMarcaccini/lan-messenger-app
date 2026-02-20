import { networkInterfaces, hostname as osHostname } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import ping from 'ping';

const execAsync = promisify(exec);

/**
 * Get local network information (IP, subnet, gateway)
 */
export async function getLocalNetworkInfo() {
    const interfaces = networkInterfaces();
    let localIp = null;
    let subnet = null;
    let interfaceName = null;

    // Find the first non-internal IPv4 address
    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            if (addr.family === 'IPv4' && !addr.internal) {
                localIp = addr.address;
                subnet = addr.netmask;
                interfaceName = name;
                break;
            }
        }
        if (localIp) break;
    }

    if (!localIp) {
        throw new Error('Unable to determine local IP address');
    }

    // Calculate subnet base
    const ipParts = localIp.split('.').map(Number);
    const maskParts = subnet.split('.').map(Number);
    const networkParts = ipParts.map((ip, i) => ip & maskParts[i]);
    const networkBase = networkParts.join('.');

    // Get gateway (Windows)
    let gateway = null;
    try {
        const { stdout } = await execAsync('route print 0.0.0.0', { timeout: 5000 });
        const match = stdout.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)/);
        if (match) gateway = match[1];
    } catch (e) {
        gateway = `${networkBase.split('.').slice(0, 3).join('.')}.1`;
    }

    return {
        localIp,
        subnet,
        networkBase,
        cidr: `${networkBase}/24`,
        gateway,
        interfaceName,
        hostname: osHostname(),
    };
}

/**
 * Scan network for active devices - OTIMIZADO
 */
export async function scanNetwork() {
    const networkInfo = await getLocalNetworkInfo();
    const baseIp = networkInfo.localIp.split('.').slice(0, 3).join('.');
    const devices = [];

    console.log(`🔍 Scanning network ${baseIp}.0/24...`);
    console.log(`📍 Local IP: ${networkInfo.localIp}`);
    console.log(`🚪 Gateway: ${networkInfo.gateway}`);

    // Primeiro, popular a tabela ARP fazendo ping broadcast
    try {
        await execAsync(`ping -n 1 -w 100 ${baseIp}.255`, { timeout: 2000 }).catch(() => { });
    } catch (e) { }

    // Ler tabela ARP existente primeiro
    const arpDevices = await getArpTable();
    console.log(`📋 Found ${arpDevices.length} devices in ARP table`);

    // Scan IPs 1-254 in parallel batches
    const batchSize = 30; // Reduzido para evitar sobrecarga
    const scannedIps = new Set();

    for (let start = 1; start <= 254; start += batchSize) {
        const batch = [];
        for (let i = start; i < Math.min(start + batchSize, 255); i++) {
            const ip = `${baseIp}.${i}`;
            batch.push(scanHost(ip, arpDevices));
        }

        const results = await Promise.all(batch);
        results.forEach(result => {
            if (result.isAlive && !scannedIps.has(result.ip)) {
                scannedIps.add(result.ip);
                devices.push(result);
            }
        });

        // Log progress
        const progress = Math.min(Math.floor((start / 254) * 100), 100);
        if (progress % 20 === 0 && progress > 0) {
            console.log(`   Progress: ${progress}%`);
        }
    }

    // Adicionar dispositivos da tabela ARP que não foram encontrados no ping
    for (const arpDevice of arpDevices) {
        if (!scannedIps.has(arpDevice.ip)) {
            const result = await scanHost(arpDevice.ip, arpDevices);
            if (result.isAlive) {
                devices.push(result);
            }
        }
    }

    console.log(`✅ Scan complete. Found ${devices.length} active devices.`);
    return devices;
}

/**
 * Get ARP table (Windows)
 */
async function getArpTable() {
    const devices = [];
    try {
        const { stdout } = await execAsync('arp -a', { timeout: 5000 });
        const lines = stdout.split('\n');

        for (const line of lines) {
            // Match IP and MAC from ARP output
            const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})/i);
            if (match) {
                const ip = match[1];
                const mac = match[2].toUpperCase().replace(/-/g, ':');

                // Ignore broadcast and multicast
                if (!ip.endsWith('.255') && !mac.startsWith('FF:FF')) {
                    devices.push({ ip, mac });
                }
            }
        }
    } catch (e) {
        console.error('Error reading ARP table:', e.message);
    }
    return devices;
}

/**
 * Scan a single host with improved detection
 */
async function scanHost(ip, arpDevices = []) {
    const result = {
        ip,
        isAlive: false,
        latency: null,
        mac: null,
        hostname: null,
        deviceType: 'unknown',
        vendor: null,
    };

    try {
        // Ping the host with shorter timeout
        const pingResult = await ping.promise.probe(ip, {
            timeout: 1,
            extra: process.platform === 'win32' ? ['-n', '1', '-w', '500'] : ['-c', '1', '-W', '1'],
        });

        result.isAlive = pingResult.alive;
        result.latency = pingResult.time === 'unknown' ? null : Math.round(parseFloat(pingResult.time));

        if (result.isAlive) {
            // Get MAC from ARP devices or query
            const arpEntry = arpDevices.find(d => d.ip === ip);
            if (arpEntry) {
                result.mac = arpEntry.mac;
            } else {
                result.mac = await getMacAddress(ip);
            }

            // Get hostname
            result.hostname = await getHostname(ip);

            // Detect device type based on hostname and MAC
            result.deviceType = detectDeviceType(result.hostname, result.mac);

            // Get vendor from MAC prefix
            if (result.mac) {
                result.vendor = getVendorFromMac(result.mac);
            }
        }
    } catch (error) {
        result.isAlive = false;
    }

    return result;
}

/**
 * Get hostname for an IP (Windows/Linux compatible)
 */
async function getHostname(ip) {
    // Try nbtstat first (Windows - faster for local network)
    if (process.platform === 'win32') {
        try {
            const { stdout } = await execAsync(`nbtstat -A ${ip}`, { timeout: 2000 });
            const match = stdout.match(/^\s*([A-Z0-9-]+)\s+<00>/m);
            if (match) return match[1].trim();
        } catch (e) { }
    }

    // Fallback to nslookup
    try {
        const { stdout } = await execAsync(`nslookup ${ip}`, { timeout: 2000 });
        const match = stdout.match(/Name:\s+(.+)/);
        if (match) {
            let hostname = match[1].trim();
            // Remove domain suffix if present
            if (hostname.includes('.')) {
                hostname = hostname.split('.')[0];
            }
            return hostname;
        }
    } catch (e) { }

    return null;
}

/**
 * Get MAC address for an IP using ARP table
 */
async function getMacAddress(ip) {
    try {
        const { stdout } = await execAsync(`arp -a ${ip}`, { timeout: 2000 });
        const lines = stdout.split('\n');
        for (const line of lines) {
            if (line.includes(ip)) {
                const match = line.match(/([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i);
                if (match) {
                    return match[0].toUpperCase().replace(/-/g, ':');
                }
            }
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Detect device type based on hostname and MAC
 */
function detectDeviceType(hostname, mac) {
    const name = (hostname || '').toLowerCase();
    const macPrefix = (mac || '').substring(0, 8).toUpperCase();

    // By hostname patterns
    if (name.includes('router') || name.includes('gateway') || name.includes('rt-') || name.includes('gw-')) {
        return 'router';
    }
    if (name.includes('switch') || name.includes('sw-')) {
        return 'switch';
    }
    if (name.includes('server') || name.includes('srv-') || name.includes('dc-')) {
        return 'server';
    }
    if (name.includes('printer') || name.includes('prn-') || name.includes('hp-') || name.includes('epson') || name.includes('brother')) {
        return 'printer';
    }
    if (name.includes('iphone') || name.includes('ipad') || name.includes('android') || name.includes('galaxy') || name.includes('pixel')) {
        return 'mobile';
    }
    if (name.includes('macbook') || name.includes('laptop') || name.includes('notebook') || name.includes('lt-')) {
        return 'laptop';
    }
    if (name.includes('pc-') || name.includes('desktop') || name.includes('ws-') || name.includes('workstation')) {
        return 'desktop';
    }
    if (name.includes('tv') || name.includes('smart') || name.includes('roku') || name.includes('chromecast') || name.includes('firestick')) {
        return 'smart_tv';
    }
    if (name.includes('camera') || name.includes('cam-') || name.includes('nvr') || name.includes('dvr')) {
        return 'camera';
    }
    if (name.includes('ap-') || name.includes('wap') || name.includes('unifi')) {
        return 'access_point';
    }

    // By MAC vendor prefixes
    const routerMacs = ['00:1A:2B', '00:1D:7E', '00:1E:58', 'C0:C1:C0', 'DC:9F:DB']; // Common router MACs
    const printerMacs = ['00:00:48', '00:1B:A9', '3C:2A:F4']; // HP, Brother, etc
    const appleMacs = ['00:03:93', '00:0A:95', '00:0D:93', '00:1C:B3', '28:6A:BA', 'AC:DE:48'];

    if (routerMacs.some(m => macPrefix.startsWith(m))) return 'router';
    if (printerMacs.some(m => macPrefix.startsWith(m))) return 'printer';
    if (appleMacs.some(m => macPrefix.startsWith(m))) return 'apple_device';

    return 'desktop'; // Default to desktop
}

/**
 * Get vendor name from MAC prefix (simplified)
 */
function getVendorFromMac(mac) {
    const prefix = mac.substring(0, 8).toUpperCase().replace(/:/g, '');

    const vendors = {
        '000C29': 'VMware',
        '005056': 'VMware',
        '001C42': 'Parallels',
        '080027': 'VirtualBox',
        '00155D': 'Microsoft Hyper-V',
        '001A2B': 'Cisco',
        '001D7E': 'Cisco-Linksys',
        'C0C1C0': 'Cisco',
        'DC9FDB': 'TP-Link',
        '001558': 'D-Link',
        '00E04C': 'Realtek',
        '00E018': 'Hewlett-Packard',
        '3C2AF4': 'Brother',
        '00000E': 'Fujitsu',
        '001B63': 'Apple',
        '28C68E': 'Netgear',
        '00248C': 'ASUSTek',
        '001E8C': 'Samsung',
        'B8:27:EB': 'Raspberry Pi',
        'DC:A6:32': 'Raspberry Pi',
    };

    for (const [p, vendor] of Object.entries(vendors)) {
        if (prefix.startsWith(p.replace(/:/g, ''))) {
            return vendor;
        }
    }
    return null;
}

/**
 * Measure latency to a specific IP
 */
export async function measureLatency(ip) {
    try {
        const result = await ping.promise.probe(ip, {
            timeout: 2,
            extra: process.platform === 'win32' ? ['-n', '3'] : ['-c', '3'],
        });
        return {
            isAlive: result.alive,
            latency: result.time === 'unknown' ? null : Math.round(parseFloat(result.time)),
            packetLoss: parseFloat(result.packetLoss),
            min: result.min,
            max: result.max,
            avg: result.avg,
        };
    } catch {
        return { isAlive: false, latency: null, packetLoss: 100 };
    }
}

/**
 * Quick scan - only ping common IPs
 */
export async function quickScan() {
    const networkInfo = await getLocalNetworkInfo();
    const baseIp = networkInfo.localIp.split('.').slice(0, 3).join('.');
    const devices = [];

    // Common IPs to check: gateway, DHCP range start, common servers
    const commonIps = [1, 2, 10, 100, 101, 150, 200, 254];

    for (const i of commonIps) {
        const ip = `${baseIp}.${i}`;
        const result = await scanHost(ip, []);
        if (result.isAlive) {
            devices.push(result);
        }
    }

    return devices;
}
