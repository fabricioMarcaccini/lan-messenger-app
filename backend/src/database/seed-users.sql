-- ====================================
-- SEED: Usuários de Demonstração
-- LAN Messenger - Ambiente de Teste
-- ====================================

-- Limpar usuários existentes (exceto dados críticos)
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM sessions;
DELETE FROM network_devices;
DELETE FROM users;

-- Garantir que a empresa existe
INSERT INTO companies (id, name, cnpj)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Demo LTDA', '00.000.000/0001-00')
ON CONFLICT (id) DO UPDATE SET name = 'Empresa Demo LTDA';

-- ================================================
-- USUÁRIOS
-- Senha padrão para todos: "senha123"
-- Hash bcrypt de "senha123" (12 rounds)
-- ================================================

-- 1. ADMIN: Nathalia Brandão
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role, department, position, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'nathalia.brandao',
    'nathalia.brandao@empresa.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VttYI/pMdVGJVO',
    'Nathalia Brandão',
    'admin',
    'Diretoria',
    'Diretora de TI',
    true
);

-- 2. USUÁRIO: Fabricio
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role, department, position, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'fabricio',
    'fabricio@empresa.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VttYI/pMdVGJVO',
    'Fabricio Marcaccini',
    'user',
    'Desenvolvimento',
    'Desenvolvedor Sênior',
    true
);

-- 3. USUÁRIO: Julia
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role, department, position, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'julia',
    'julia@empresa.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VttYI/pMdVGJVO',
    'Julia Silva',
    'user',
    'Marketing',
    'Analista de Marketing',
    true
);

-- 4. USUÁRIO: Guilherme
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role, department, position, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'guilherme',
    'guilherme@empresa.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VttYI/pMdVGJVO',
    'Guilherme Santos',
    'user',
    'Comercial',
    'Executivo de Vendas',
    true
);

-- 5. USUÁRIO: Marco
INSERT INTO users (id, company_id, username, email, password_hash, full_name, role, department, position, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'marco',
    'marco@empresa.com.br',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VttYI/pMdVGJVO',
    'Marco Oliveira',
    'user',
    'Financeiro',
    'Analista Financeiro',
    true
);

-- ================================================
-- CONVERSAS DE EXEMPLO
-- ================================================

-- Conversa entre Nathalia e Fabricio
INSERT INTO conversations (id, participant_ids, name, is_group, last_message_at)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    ARRAY['a0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid],
    NULL,
    false,
    NOW()
);

-- Grupo "Equipe de TI"
INSERT INTO conversations (id, participant_ids, name, is_group, last_message_at)
VALUES (
    'c0000000-0000-0000-0000-000000000002',
    ARRAY[
        'a0000000-0000-0000-0000-000000000001'::uuid,
        'a0000000-0000-0000-0000-000000000002'::uuid,
        'a0000000-0000-0000-0000-000000000003'::uuid
    ],
    'Equipe de TI',
    true,
    NOW()
);

-- ================================================
-- MENSAGENS DE EXEMPLO
-- ================================================

INSERT INTO messages (conversation_id, sender_id, content, content_type, is_read, created_at)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Olá Fabricio! Tudo bem?', 'text', true, NOW() - INTERVAL '2 hours'),
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Oi Nathalia! Tudo ótimo, e você?', 'text', true, NOW() - INTERVAL '1 hour 55 minutes'),
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bem também! Podemos conversar sobre o projeto?', 'text', false, NOW() - INTERVAL '1 hour 50 minutes'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pessoal, reunião amanhã às 10h!', 'text', true, NOW() - INTERVAL '30 minutes');

-- Atualizar last_message_id nas conversas
UPDATE conversations SET last_message_id = (
    SELECT id FROM messages WHERE conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1
);

-- ================================================
-- DISPOSITIVOS DE REDE DE EXEMPLO
-- ================================================

INSERT INTO network_devices (company_id, ip_address, mac_address, hostname, device_type, is_online, latency_ms, last_seen_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '192.168.1.10', 'AA:BB:CC:DD:EE:01', 'PC-NATHALIA', 'desktop', true, 5, NOW()),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.11', 'AA:BB:CC:DD:EE:02', 'PC-FABRICIO', 'desktop', true, 8, NOW()),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.12', 'AA:BB:CC:DD:EE:03', 'NOTEBOOK-JULIA', 'laptop', true, 12, NOW()),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.13', 'AA:BB:CC:DD:EE:04', 'PC-GUILHERME', 'desktop', false, NULL, NOW() - INTERVAL '2 hours'),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.14', 'AA:BB:CC:DD:EE:05', 'NOTEBOOK-MARCO', 'laptop', true, 15, NOW()),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.1', 'AA:BB:CC:DD:EE:00', 'ROUTER-PRINCIPAL', 'router', true, 1, NOW()),
    ('00000000-0000-0000-0000-000000000001', '192.168.1.100', 'AA:BB:CC:DD:EE:10', 'SERVIDOR-WEB', 'server', true, 2, NOW())
ON CONFLICT (company_id, ip_address) DO UPDATE SET
    hostname = EXCLUDED.hostname,
    is_online = EXCLUDED.is_online,
    latency_ms = EXCLUDED.latency_ms,
    last_seen_at = EXCLUDED.last_seen_at;

-- ================================================
-- RESULTADO
-- ================================================
SELECT 'Seed executado com sucesso!' as status;
SELECT username, full_name, role, department FROM users ORDER BY role DESC, username;
