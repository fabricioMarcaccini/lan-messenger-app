-- add_enterprise_features.sql
-- Script de hardening e auditoria para Tasks e Wiki no PostgreSQL

-- 1. Enumerador Estrito de Prioridade
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- 2. Auditoria de Atividades (Tasks)
-- Registra de forma imutável quem alterou o quê.
CREATE TABLE task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- ex: 'CREATED', 'UPDATED', 'DELETED', 'COMMENTED'
    previous_state JSONB,
    new_state JSONB,
    changed_fields TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_action CHECK (action IN ('CREATED', 'UPDATED', 'DELETED', 'COMMENTED'))
);

-- Índices GIN para consultas rápidas nos payloads JSONB
CREATE INDEX idx_task_activities_previous_state ON task_activities USING GIN (previous_state);
CREATE INDEX idx_task_activities_new_state ON task_activities USING GIN (new_state);
CREATE INDEX idx_task_activities_task_id ON task_activities (task_id);

-- 3. Sistema de Rollback da Wiki
-- Versionamento Append-Only. Não fazemos UPDATE no conteúdo, sempre inserimos nova versão.
CREATE TABLE wiki_page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL,
    author_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- Estrutura Delta / Editor.js Block format
    commit_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Sem updated_at: versões são registros imutáveis
);

CREATE INDEX idx_wiki_versions_content ON wiki_page_versions USING GIN (content);
CREATE INDEX idx_wiki_versions_page_id ON wiki_page_versions (page_id);

-- 4. Optimistic Locking na tabela principal de Wiki Pages
-- Evita a perda de dados entre edições simultâneas.
-- Descomente as linhas abaixo caso sua tabela `wiki_pages` já exista e você queira
-- adicionar os campos para Optimistic Locking.
-- ALTER TABLE wiki_pages ADD COLUMN version INTEGER DEFAULT 1;
-- ALTER TABLE wiki_pages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
