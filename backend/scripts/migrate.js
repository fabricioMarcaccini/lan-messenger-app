import { db, pgPool, checkDatabaseConnections } from '../src/config/database.js';

const steps = [
    {
        name: 'enable-uuid-extension',
        run: () => db.write('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'),
    },
    {
        name: 'conversations-add-group-admins',
        run: () => db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_admins UUID[] DEFAULT '{}'"),
    },
    {
        name: 'conversations-add-description',
        run: () => db.write('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description TEXT'),
    },
    {
        name: 'conversations-add-creator-id',
        run: () => db.write('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS creator_id UUID'),
    },
    {
        name: 'conversations-add-is-group',
        run: () => db.write('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false'),
    },
    {
        name: 'messages-add-is-deleted',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false'),
    },
    {
        name: 'messages-add-edited-at',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP'),
    },
    {
        name: 'messages-add-reply-to',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id)'),
    },
    {
        name: 'messages-add-reactions',
        run: () => db.write("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'"),
    },
    {
        name: 'messages-add-expires-at',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP'),
    },
    {
        name: 'messages-add-search-vector',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector'),
    },
    {
        name: 'messages-index-search-vector',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING gin(search_vector)'),
    },
    {
        name: 'messages-search-vector-function',
        run: () => db.write(`
            CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
            BEGIN
                NEW.search_vector := to_tsvector('portuguese', COALESCE(NEW.content, ''));
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `),
    },
    {
        name: 'messages-search-vector-trigger-drop',
        run: () => db.write('DROP TRIGGER IF EXISTS messages_search_vector_update_trigger ON messages'),
    },
    {
        name: 'messages-search-vector-trigger-create',
        run: () => db.write(`
            CREATE TRIGGER messages_search_vector_update_trigger
            BEFORE INSERT OR UPDATE ON messages
            FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update()
        `),
    },
    {
        name: 'users-add-two-factor-secret',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)'),
    },
    {
        name: 'users-add-two-factor-enabled',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT false'),
    },
    {
        name: 'companies-add-enforce-two-factor',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS enforce_two_factor BOOLEAN DEFAULT false'),
    },
    {
        name: 'messages-add-thread-id',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES messages(id)'),
    },
    {
        name: 'messages-add-reply-count',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0'),
    },
    {
        name: 'messages-index-thread-id',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)'),
    },
    {
        name: 'messages-drop-content-type-check',
        run: async () => {
            try {
                await db.write('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check');
            } catch (error) {
                console.warn('[migrate] warning: failed to drop messages_content_type_check');
            }
        },
    },
    {
        name: 'messages-add-content-type-check',
        run: () => db.write("ALTER TABLE messages ADD CONSTRAINT messages_content_type_check CHECK (content_type IN ('text', 'file', 'image', 'video', 'audio', 'pdf', 'deleted', 'call', 'poll', 'meeting'))"),
    },
    {
        name: 'messages-add-is-pinned',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false'),
    },
    {
        name: 'messages-add-pinned-by',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by UUID'),
    },
    {
        name: 'messages-add-pinned-at',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP'),
    },
    {
        name: 'messages-add-read-at',
        run: () => db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP'),
    },
    {
        name: 'users-add-custom-status-emoji',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_emoji VARCHAR(10)'),
    },
    {
        name: 'users-add-custom-status-text',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_text VARCHAR(100)'),
    },
    {
        name: 'users-add-custom-status-expires-at',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_expires_at TIMESTAMP'),
    },
    {
        name: 'users-add-ooo-until',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS ooo_until TIMESTAMP'),
    },
    {
        name: 'users-add-ooo-message',
        run: () => db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS ooo_message VARCHAR(255)'),
    },
    {
        name: 'poll-votes-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS poll_votes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                option_index INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(message_id, user_id, option_index)
            )
        `),
    },
    {
        name: 'poll-votes-add-message-id',
        run: () => db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE'),
    },
    {
        name: 'poll-votes-add-user-id',
        run: () => db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE'),
    },
    {
        name: 'poll-votes-add-option-index',
        run: () => db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS option_index INTEGER'),
    },
    {
        name: 'poll-votes-add-created-at',
        run: () => db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'poll-votes-index-message',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_poll_votes_message ON poll_votes(message_id)'),
    },
    {
        name: 'meetings-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS meetings (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT DEFAULT '',
                start_at TIMESTAMP NOT NULL,
                end_at TIMESTAMP,
                meeting_link TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'meetings-add-company-id',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE'),
    },
    {
        name: 'meetings-add-conversation-id',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE'),
    },
    {
        name: 'meetings-add-creator-id',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL'),
    },
    {
        name: 'meetings-add-title',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title VARCHAR(255)'),
    },
    {
        name: 'meetings-add-description',
        run: () => db.write("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''"),
    },
    {
        name: 'meetings-add-start-at',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_at TIMESTAMP'),
    },
    {
        name: 'meetings-add-end-at',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_at TIMESTAMP'),
    },
    {
        name: 'meetings-add-meeting-link',
        run: () => db.write("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT DEFAULT ''"),
    },
    {
        name: 'meetings-add-created-at',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'meetings-add-updated-at',
        run: () => db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'meetings-sync-time-function',
        run: () => db.write(`
            CREATE OR REPLACE FUNCTION sync_meetings_time_columns()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $$
            BEGIN
                IF NEW.start_at IS NULL AND NEW.start_time IS NOT NULL THEN
                    NEW.start_at := NEW.start_time;
                END IF;

                IF NEW.start_time IS NULL AND NEW.start_at IS NOT NULL THEN
                    NEW.start_time := NEW.start_at;
                END IF;

                IF NEW.end_at IS NULL AND NEW.end_time IS NOT NULL THEN
                    NEW.end_at := NEW.end_time;
                END IF;

                IF NEW.end_time IS NULL THEN
                    NEW.end_time := COALESCE(NEW.end_at, NEW.start_time, NEW.start_at);
                END IF;

                IF NEW.end_at IS NULL THEN
                    NEW.end_at := NEW.end_time;
                END IF;

                RETURN NEW;
            END;
            $$;
        `),
    },
    {
        name: 'meetings-sync-time-trigger-drop',
        run: () => db.write('DROP TRIGGER IF EXISTS trg_sync_meetings_time_columns ON meetings'),
    },
    {
        name: 'meetings-sync-time-trigger-create',
        run: () => db.write(`
            CREATE TRIGGER trg_sync_meetings_time_columns
            BEFORE INSERT OR UPDATE ON meetings
            FOR EACH ROW
            EXECUTE FUNCTION sync_meetings_time_columns()
        `),
    },
    {
        name: 'meeting-rsvps-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS meeting_rsvps (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(meeting_id, user_id)
            )
        `),
    },
    {
        name: 'meeting-rsvps-add-meeting-id',
        run: () => db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE'),
    },
    {
        name: 'meeting-rsvps-add-user-id',
        run: () => db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE'),
    },
    {
        name: 'meeting-rsvps-add-status',
        run: () => db.write("ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'"),
    },
    {
        name: 'meeting-rsvps-add-created-at',
        run: () => db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'meetings-index-company-start',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_meetings_company_start ON meetings(company_id, start_at)'),
    },
    {
        name: 'meeting-rsvps-index-meeting',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_meeting_rsvps_meeting ON meeting_rsvps(meeting_id)'),
    },
    {
        name: 'audit-logs-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                target_type VARCHAR(50),
                target_id UUID,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'audit-logs-add-company-id',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE'),
    },
    {
        name: 'audit-logs-add-actor-id',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL'),
    },
    {
        name: 'audit-logs-add-action',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100)'),
    },
    {
        name: 'audit-logs-add-target-type',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50)'),
    },
    {
        name: 'audit-logs-add-target-id',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id UUID'),
    },
    {
        name: 'audit-logs-add-metadata',
        run: () => db.write("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'"),
    },
    {
        name: 'audit-logs-add-ip-address',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)'),
    },
    {
        name: 'audit-logs-add-user-agent',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT'),
    },
    {
        name: 'audit-logs-add-created-at',
        run: () => db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'audit-logs-index-company',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id)'),
    },
    {
        name: 'audit-logs-index-created',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)'),
    },
    {
        name: 'mentions-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS mentions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'mentions-add-message-id',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE'),
    },
    {
        name: 'mentions-add-conversation-id',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE'),
    },
    {
        name: 'mentions-add-mentioned-user-id',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE'),
    },
    {
        name: 'mentions-add-mentioner-id',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL'),
    },
    {
        name: 'mentions-add-is-read',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false'),
    },
    {
        name: 'mentions-add-created-at',
        run: () => db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()'),
    },
    {
        name: 'mentions-index-user',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id)'),
    },
    {
        name: 'file-uploads-add-file-data',
        run: () => db.write('ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS file_data TEXT'),
    },
    {
        name: 'companies-add-plan-id',
        run: () => db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id VARCHAR(20) DEFAULT 'free'"),
    },
    {
        name: 'companies-add-subscription-status',
        run: () => db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive'"),
    },
    {
        name: 'companies-add-stripe-customer-id',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)'),
    },
    {
        name: 'companies-add-stripe-subscription-id',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)'),
    },
    {
        name: 'companies-add-max-seats',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 5'),
    },
    {
        name: 'companies-add-trial-ends-at',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP'),
    },
    {
        name: 'companies-add-openrouter-api-key',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS openrouter_api_key VARCHAR(255)'),
    },
    {
        name: 'companies-add-groq-api-key',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS groq_api_key VARCHAR(255)'),
    },
    {
        name: 'companies-add-ai-credits-balance',
        run: () => db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_credits_balance INTEGER DEFAULT 50'),
    },
    {
        name: 'company-invites-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS company_invites (
                id SERIAL PRIMARY KEY,
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                code VARCHAR(50) UNIQUE NOT NULL,
                max_uses INTEGER DEFAULT 50,
                uses INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `),
    },
    {
        name: 'company-invites-index-code',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_company_invites_code ON company_invites(code)'),
    },
    {
        name: 'push-subscriptions-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL,
                auth_key VARCHAR(255) NOT NULL,
                p256dh_key VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(endpoint)
            )
        `),
    },
    {
        name: 'push-subscriptions-index-user',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)'),
    },
    {
        name: 'task-columns-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS task_columns (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                position INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'task-columns-index-conversation',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_task_columns_conversation ON task_columns(conversation_id)'),
    },
    {
        name: 'tasks-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS tasks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                column_id UUID REFERENCES task_columns(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                position INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'tasks-index-conversation',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id)'),
    },
    {
        name: 'wiki-pages-create-table',
        run: () => db.write(`
            CREATE TABLE IF NOT EXISTS wiki_pages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                author_id UUID REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                content TEXT,
                emoji VARCHAR(20) DEFAULT '📄',
                parent_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `),
    },
    {
        name: 'wiki-pages-index-conversation',
        run: () => db.write('CREATE INDEX IF NOT EXISTS idx_wiki_pages_conversation ON wiki_pages(conversation_id)'),
    },
];

const logStep = (name, durationMs) => {
    console.log(`[migrate] ok: ${name} (${durationMs}ms)`);
};

const logFailure = (name, err) => {
    console.error(`[migrate] failed: ${name}`);
    if (err?.stack) {
        console.error(err.stack);
    } else {
        console.error(err);
    }
};

async function runMigrations() {
    const dbStatus = await checkDatabaseConnections();
    if (!dbStatus.postgres) {
        throw new Error('PostgreSQL connection failed. Aborting migrations.');
    }

    let executed = 0;
    for (const step of steps) {
        const start = Date.now();
        try {
            await step.run();
            executed += 1;
            logStep(step.name, Date.now() - start);
        } catch (err) {
            logFailure(step.name, err);
            throw err;
        }
    }

    return executed;
}

const closePool = async () => {
    try {
        await pgPool.end();
    } catch (err) {
        console.error('[migrate] failed to close pg pool');
        console.error(err?.stack || err);
    }
};

process.on('unhandledRejection', (reason) => {
    console.error('[migrate] unhandled rejection');
    console.error(reason?.stack || reason);
    process.exitCode = 1;
});

process.on('uncaughtException', (err) => {
    console.error('[migrate] uncaught exception');
    console.error(err?.stack || err);
    process.exitCode = 1;
});

runMigrations()
    .then((count) => {
        console.log(`[migrate] completed ${count} steps`);
    })
    .catch((err) => {
        console.error('[migrate] migration run failed');
        console.error(err?.stack || err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closePool();
    });
