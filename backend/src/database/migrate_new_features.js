import { pgPool } from '../config/database.js';

async function runMigration() {
    console.log('Starting migration for Lanly differentiated features...');
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        console.log('-- Base message columns --');
        await client.query(`
            ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
        `);

        console.log('-- Feature 2: Pinned messages --');
        await client.query(`
            ALTER TABLE messages
            ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP;
        `);

        console.log('-- Feature 3: Polls --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS poll_votes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                option_index INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_id, option_index)
            );
        `);
        await client.query('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS option_index INTEGER;');
        await client.query('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();');
        await client.query('CREATE INDEX IF NOT EXISTS idx_poll_votes_message ON poll_votes(message_id);');

        console.log('-- Feature 4: Mentions --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS mentions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL;');
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;');
        await client.query('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();');
        await client.query('CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id, is_read, created_at DESC);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_mentions_conversation ON mentions(conversation_id);');

        console.log('-- Feature 5: Custom status + OOO --');
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS custom_status_text VARCHAR(100),
            ADD COLUMN IF NOT EXISTS custom_status_emoji VARCHAR(10),
            ADD COLUMN IF NOT EXISTS custom_status_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ooo_until TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ooo_message VARCHAR(255);
        `);

        console.log('-- Feature 7: Meetings Agenda --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS meetings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_at TIMESTAMP NOT NULL,
                end_at TIMESTAMP,
                meeting_link TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL;');
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title VARCHAR(255);');
        await client.query("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT;");
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_at TIMESTAMP;');
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_at TIMESTAMP;');
        await client.query("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT DEFAULT '';");
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();');
        await client.query('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();');
        await client.query(`
            CREATE TABLE IF NOT EXISTS meeting_rsvps (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('accepted', 'declined', 'maybe', 'pending')),
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(meeting_id, user_id)
            );
        `);
        await client.query('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;');
        await client.query("ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';");
        await client.query('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();');
        await client.query('CREATE INDEX IF NOT EXISTS idx_meetings_company_start ON meetings(company_id, start_at);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_meeting_rsvps_meeting ON meeting_rsvps(meeting_id);');

        console.log('-- Feature 9: Audit Logs --');
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id UUID,
                metadata JSONB DEFAULT '{}'::jsonb,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100);');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50);');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id UUID;');
        await client.query("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;");
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;');
        await client.query('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();');
        await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);');
        await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);');

        console.log('-- Content type normalization --');
        try {
            await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check;');
        } catch (err) {
            console.warn('messages_content_type_check drop warning:', err.message);
        }
        await client.query(`
            ALTER TABLE messages
            ADD CONSTRAINT messages_content_type_check
            CHECK (content_type IN ('text', 'file', 'image', 'audio', 'video', 'pdf', 'deleted', 'call', 'poll', 'meeting'));
        `);

        await client.query('COMMIT');
        console.log('Migration completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pgPool.end();
    }
}

runMigration();
