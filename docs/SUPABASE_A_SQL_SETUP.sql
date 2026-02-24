-- LAN Messenger Database Schema (Otimizado para Supabase + Stripe)
-- Execute isso no SQL Editor do seu Painel do Supabase

-- Habilita geração de UUIDs e crypto-tools
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 1. COMPANIES (Agora B2B SaaS Ready p/ Stripe)
-- ==========================================================
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    logo_url TEXT,
    address JSONB,
    settings JSONB DEFAULT '{}',
    -- [NOVO] Colunas Stripe SaaS
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan_id VARCHAR(50) DEFAULT 'free', -- 'free', 'starter', 'pro_ai'
    subscription_status VARCHAR(50) DEFAULT 'incomplete', -- 'active', 'past_due', 'canceled'
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 2. USERS
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'user')),
    department VARCHAR(100),
    position VARCHAR(100),
    status_message VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 3. CONVERSATIONS & MESSAGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_ids UUID[] NOT NULL,
    name VARCHAR(255),
    is_group BOOLEAN DEFAULT false,
    last_message_id UUID,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text',
    file_url TEXT,
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    expires_in INTEGER, -- Para mensagens temporarias
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 4. INFRAESTRUTURA EXTRA (Uploads, Sessões, Network)
-- ==========================================================
CREATE TABLE IF NOT EXISTS network_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    mac_address MACADDR,
    hostname VARCHAR(255),
    device_type VARCHAR(50),
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT network_devices_company_ip_unique UNIQUE (company_id, ip_address)
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    mime_type VARCHAR(100),
    file_size BIGINT,
    content_type VARCHAR(50) DEFAULT 'file',
    file_data TEXT, -- Base64 Data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 5. INDEXES PARA PERFORMANCE MAXIMA
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_devices_company ON network_devices(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
-- Index do Stripe
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);

-- ==========================================================
-- 6. INSERIR EMPRESA DEFAULT E ADMIN (Master Account)
-- ==========================================================
INSERT INTO companies (id, name, cnpj, plan_id, subscription_status) 
VALUES (
    '00000000-0000-0000-0000-000000000001', 
    'Nfert Tech Master', 
    '00000000000000',
    'pro_ai', -- Já deixa a conta master como PRO
    'active'
)
ON CONFLICT DO NOTHING;

-- O Hash abaixo equivale à senha: admin123
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@lan.local',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.nSgDrCc0vjK.P6',
    'System Administrator',
    'admin'
)
ON CONFLICT DO NOTHING;
