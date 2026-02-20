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

// Redis Client (Cache & Sessions)
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
});

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
        const value = await redis.get(key);
        return value ? JSON.parse(value) : null;
    },

    async set(key, value, ttlSeconds = 3600) {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    },

    async del(key) {
        await redis.del(key);
    },

    async keys(pattern) {
        return redis.keys(pattern);
    },

    async setPresence(userId, status) {
        await redis.hset(`presence:${userId}`, {
            status,
            lastSeen: Date.now(),
        });
        await redis.expire(`presence:${userId}`, 300); // 5 min expiry
    },

    async getPresence(userId) {
        return redis.hgetall(`presence:${userId}`);
    },

    async setTyping(conversationId, userId) {
        await redis.setex(`typing:${conversationId}:${userId}`, 3, '1');
    },

    async getTyping(conversationId) {
        const keys = await redis.keys(`typing:${conversationId}:*`);
        return keys.map(k => k.split(':')[2]);
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
