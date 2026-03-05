import { pgPool } from '../config/database.js';

async function fullDiagnostic() {
    console.log('=== FULL STICKER DIAGNOSTIC ===\n');
    const client = await pgPool.connect();

    try {
        // 1. Check tables exist
        console.log('1️⃣  Checking tables...');
        const tables = ['stickers', 'sticker_packs', 'user_favorite_stickers'];
        for (const table of tables) {
            const r = await client.query(`SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_name = $1`, [table]);
            const exists = parseInt(r.rows[0].cnt) > 0;
            console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
        }

        // 2. Check constraint
        console.log('\n2️⃣  Checking content_type constraint...');
        const constraints = await client.query(`
            SELECT pg_get_constraintdef(oid) as def 
            FROM pg_constraint 
            WHERE conrelid = 'messages'::regclass 
            AND conname LIKE '%content_type%'
        `);
        if (constraints.rows.length > 0) {
            const def = constraints.rows[0].def;
            const hasSticker = def.includes('sticker');
            console.log(`   ${hasSticker ? '✅' : '❌'} Constraint ${hasSticker ? 'includes' : 'MISSING'} sticker`);
            console.log(`   Full: ${def.substring(0, 200)}`);
        } else {
            console.log('   ⚠️  No content_type constraint found (all values allowed)');
        }

        // 3. Check sticker count
        console.log('\n3️⃣  Checking sticker data...');
        const stickerCount = await client.query('SELECT COUNT(*) as cnt FROM stickers');
        console.log(`   Total stickers: ${stickerCount.rows[0].cnt}`);

        const sample = await client.query('SELECT id, file_url, company_id FROM stickers LIMIT 3');
        sample.rows.forEach((s, i) => {
            console.log(`   Sample ${i + 1}: url=${s.file_url.substring(0, 60)}..., company=${s.company_id}`);
        });

        // 4. Check companies
        console.log('\n4️⃣  Companies with stickers...');
        const companyStickers = await client.query(`
            SELECT company_id, COUNT(*) as cnt 
            FROM stickers 
            GROUP BY company_id 
            ORDER BY cnt DESC 
            LIMIT 5
        `);
        companyStickers.rows.forEach(r => {
            console.log(`   Company ${r.company_id}: ${r.cnt} stickers`);
        });

        // 5. Test INSERT with sticker content_type
        console.log('\n5️⃣  Testing INSERT messages with sticker type...');
        const user = (await client.query('SELECT id FROM users LIMIT 1')).rows[0];
        const conv = (await client.query('SELECT id FROM conversations WHERE $1 = ANY(participant_ids) LIMIT 1', [user.id])).rows[0];

        if (user && conv) {
            await client.query('BEGIN');
            try {
                const insertResult = await client.query(
                    `INSERT INTO messages (conversation_id, sender_id, content, content_type)
                     VALUES ($1, $2, $3, $4)
                     RETURNING id`,
                    [conv.id, user.id, 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg', 'sticker']
                );
                console.log(`   ✅ INSERT succeeded: ${insertResult.rows[0].id}`);
                await client.query('ROLLBACK');
            } catch (e) {
                await client.query('ROLLBACK');
                console.log(`   ❌ INSERT FAILED: ${e.message}`);
                console.log(`   Detail: ${e.detail || 'none'}`);
                console.log(`   Hint: ${e.hint || 'none'}`);
            }
        } else {
            console.log('   ⚠️  No user/conversation found to test');
        }

        // 6. Test the specific conversation from the error
        console.log('\n6️⃣  Checking specific conversation 55fd70b4...');
        const specificConv = await client.query(
            `SELECT id, participant_ids, is_group FROM conversations WHERE id = '55fd70b4-cf3d-4c8e-9c8d-2bbc747e923d'`
        );
        if (specificConv.rows.length > 0) {
            const c = specificConv.rows[0];
            console.log(`   ✅ Found: is_group=${c.is_group}, participants=${c.participant_ids.length}`);

            // Try insert in this specific conversation
            await client.query('BEGIN');
            try {
                const testUser = c.participant_ids[0];
                await client.query(
                    `INSERT INTO messages (conversation_id, sender_id, content, content_type)
                     VALUES ($1, $2, $3, 'sticker')`,
                    ['55fd70b4-cf3d-4c8e-9c8d-2bbc747e923d', testUser, 'https://test.com/sticker.svg']
                );
                console.log(`   ✅ INSERT into this conversation WORKS`);
                await client.query('ROLLBACK');
            } catch (e) {
                await client.query('ROLLBACK');
                console.log(`   ❌ INSERT FAILED: ${e.message}`);
            }
        } else {
            console.log('   ❌ Conversation not found!');
        }

        // 7. Check triggers
        console.log('\n7️⃣  Message triggers...');
        const triggers = await client.query(`
            SELECT tgname, pg_get_triggerdef(oid) as def 
            FROM pg_trigger 
            WHERE tgrelid = 'messages'::regclass 
            AND NOT tgisinternal
        `);
        if (triggers.rows.length === 0) {
            console.log('   No custom triggers');
        } else {
            triggers.rows.forEach(t => {
                console.log(`   - ${t.tgname}`);
            });
        }

        console.log('\n=== DIAGNOSTIC COMPLETE ===');

    } catch (e) {
        console.error('Diagnostic error:', e.message);
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}

fullDiagnostic();
