-- Script de Migração: Wiki Enterprise Features

-- Adicionando colunas de design e hierarquia
ALTER TABLE wiki_pages 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Otimizando buscas pela árvore de documentos
CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent ON wiki_pages(parent_id);

-- Para a funcionalidade da Máquina do Tempo/Commit de versão, vamos assegurar que a tabela de histórico (criada previamente) não será quebrada por cascateamento, caso exista uma dependência forte. Mas na fase anterior já garantimos que a tabela é isolada.
