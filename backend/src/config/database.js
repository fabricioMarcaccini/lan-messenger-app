import pg from 'pg';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend root
dotenv.config({ path: join(__dirname, '../../.env') });

// Debug: Log connection parameters
console.log('🔧 Database Configuration:');
console.log(`   PG_HOST: ${process.env.PG_HOST || 'localhost (default)'}`);
console.log(`   PG_PORT: ${process.env.PG_PORT || '5432 (default)'}`);
console.log(`   PG_DATABASE: ${process.env.PG_DATABASE || 'lanmessenger (default)'}`);
console.log(`   PG_USER: ${process.env.PG_USER || 'lanmessenger (default)'}`);
console.log(`   PG_PASSWORD: ${process.env.PG_PASSWORD ? '***SET***' : 'lanmessenger123 (default)'}`);

// PostgreSQL Pool (Primary - Write Operations)
const pgPool = new pg.Pool({
    host: process.env.PG_HOST || '127.0.0.1',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'lanmessenger',
    user: process.env.PG_USER || 'lanmessenger',
    password: process.env.PG_PASSWORD || 'lanmessenger123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});


// MySQL Pool (Secondary - Read Operations)
const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    database: process.env.MYSQL_DATABASE || 'lanmessenger',
    user: process.env.MYSQL_USER || 'lanmessenger',
    password: process.env.MYSQL_PASSWORD || 'lanmessenger123',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
});

// Redis Client (Cache & Sessions fallback)
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1, // Minimize retry attempts in production
});

// Memory Cache Fallback for free-tier Render deployments
const memoryCache = new Map();
const fallbackEnabled = process.env.NODE_ENV === 'production' || process.env.REDIS_HOST === 'localhost';

// Database utility functions
export const db = {
    // PostgreSQL write operations
    async write(query, params = []) {
        const client = await pgPool.connect();
        try {
            const result = await client.query(query, params);
            return result;
        } finally {
            client.release();
        }
    },

    // Read from MySQL (fallback to PostgreSQL)
    async read(query, params = []) {
        try {
            const [rows] = await mysqlPool.execute(query, params);
            return { rows };
        } catch (error) {
            console.warn('MySQL read failed, falling back to PostgreSQL:', error.message);
            return this.write(query, params);
        }
    },

    // Transaction support (PostgreSQL only)
    async transaction(callback) {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
};

// Redis cache utilities
export const cache = {
    async get(key) {
        if (fallbackEnabled) return memoryCache.get(key) || null;
        try { const value = await redis.get(key); return value ? JSON.parse(value) : null; } catch (e) { return memoryCache.get(key) || null; }
    },

    async set(key, value, ttlSeconds = 3600) {
        if (fallbackEnabled) { memoryCache.set(key, value); setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000); return; }
        try { await redis.setex(key, ttlSeconds, JSON.stringify(value)); } catch (e) { memoryCache.set(key, value); }
    },

    async del(key) {
        if (fallbackEnabled) { memoryCache.delete(key); return; }
        try { await redis.del(key); } catch (e) { memoryCache.delete(key); }
    },

    async keys(pattern) {
        if (fallbackEnabled) return [];
        try { return await redis.keys(pattern); } catch (e) { return []; }
    },

    async setPresence(userId, status) {
        if (fallbackEnabled) { memoryCache.set(`presence:${userId}`, { status, lastSeen: Date.now() }); return; }
        try {
            await redis.hset(`presence:${userId}`, { status, lastSeen: Date.now() });
            await redis.expire(`presence:${userId}`, 300);
        } catch (e) { }
    },

    async getPresence(userId) {
        if (fallbackEnabled) return memoryCache.get(`presence:${userId}`) || null;
        try { return await redis.hgetall(`presence:${userId}`); } catch (e) { return null; }
    },

    async setTyping(conversationId, userId) {
        if (fallbackEnabled) { memoryCache.set(`typing:${conversationId}:${userId}`, '1'); setTimeout(() => memoryCache.delete(`typing:${conversationId}:${userId}`), 3000); return; }
        try { await redis.setex(`typing:${conversationId}:${userId}`, 3, '1'); } catch (e) { }
    },

    async getTyping(conversationId) {
        if (fallbackEnabled) return [];
        try { const keys = await redis.keys(`typing:${conversationId}:*`); return keys.map(k => k.split(':')[2]); } catch (e) { return []; }
    },
};

// Health check
export async function checkDatabaseConnections() {
    const results = { postgres: false, mysql: false, redis: false };

    try {
        await pgPool.query('SELECT 1');
        results.postgres = true;
    } catch (e) {
        console.error('PostgreSQL connection failed:', e.message);
    }

    try {
        await mysqlPool.query('SELECT 1');
        results.mysql = true;
    } catch (e) {
        console.error('MySQL connection failed:', e.message);
    }

    try {
        await redis.ping();
        results.redis = true;
    } catch (e) {
        console.error('Redis connection failed:', e.message);
    }

    return results;
}

export { pgPool, mysqlPool, redis };
