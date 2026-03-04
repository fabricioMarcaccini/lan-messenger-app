import { pgPool } from '../config/database.js';

async function seedStickers() {
    console.log('🚀 Starting sticker fix + seed...');
    const client = await pgPool.connect();

    try {
        await client.query('BEGIN');

        // ============ STEP 1: Fix content_type constraint ============
        console.log('1️⃣  Fixing content_type constraint...');
        await client.query('ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check;');
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE messages
                ADD CONSTRAINT messages_content_type_check
                CHECK (content_type IN ('text', 'file', 'image', 'audio', 'video', 'pdf', 'deleted', 'call', 'poll', 'meeting', 'sticker'));
            EXCEPTION WHEN duplicate_object THEN
                RAISE NOTICE 'Constraint already exists';
            END $$;
        `);
        console.log('   ✅ Constraint updated');

        // ============ STEP 2: Ensure tables exist ============
        console.log('2️⃣  Ensuring sticker tables exist...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS sticker_packs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                author VARCHAR(100),
                is_official BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS stickers (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                pack_id UUID,
                company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                file_url TEXT NOT NULL,
                created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                is_animated BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`ALTER TABLE stickers ALTER COLUMN pack_id DROP NOT NULL;`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_favorite_stickers (
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                sticker_id UUID REFERENCES stickers(id) ON DELETE CASCADE,
                added_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, sticker_id)
            );
        `);
        console.log('   ✅ Tables ready');

        // ============ STEP 3: Seed default stickers for ALL companies ============
        console.log('3️⃣  Seeding default stickers...');

        // Get all companies
        const companiesResult = await client.query('SELECT id FROM companies');
        const companies = companiesResult.rows;

        // Default stickers using high-quality open emojis (Twemoji CDN - Twitter's open source emojis)
        const defaultStickers = [
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f600.svg', animated: false }, // 😀
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f602.svg', animated: false }, // 😂
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60d.svg', animated: false }, // 😍
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60e.svg', animated: false }, // 😎
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f917.svg', animated: false }, // 🤗
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44d.svg', animated: false }, // 👍
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f44f.svg', animated: false }, // 👏
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4aa.svg', animated: false }, // 💪
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f525.svg', animated: false }, // 🔥
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/2764.svg', animated: false },  // ❤️
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f389.svg', animated: false }, // 🎉
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f680.svg', animated: false }, // 🚀
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4af.svg', animated: false }, // 💯
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f62d.svg', animated: false }, // 😭
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f914.svg', animated: false }, // 🤔
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f60a.svg', animated: false }, // 😊
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f929.svg', animated: false }, // 🤩
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f64f.svg', animated: false }, // 🙏
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f48e.svg', animated: false }, // 💎
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f31f.svg', animated: false }, // 🌟
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f4a1.svg', animated: false }, // 💡
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f973.svg', animated: false }, // 🥳
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f90c.svg', animated: false }, // 🤌
            { url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f92f.svg', animated: false }, // 🤯
        ];

        let totalInserted = 0;

        for (const company of companies) {
            // Check if this company already has stickers
            const existingCount = await client.query(
                'SELECT COUNT(*) as cnt FROM stickers WHERE company_id = $1',
                [company.id]
            );

            if (parseInt(existingCount.rows[0].cnt) > 0) {
                console.log(`   ⏭️  Company ${company.id} already has stickers, skipping`);
                continue;
            }

            for (const sticker of defaultStickers) {
                await client.query(
                    `INSERT INTO stickers (company_id, file_url, is_animated)
                     VALUES ($1, $2, $3)`,
                    [company.id, sticker.url, sticker.animated]
                );
                totalInserted++;
            }
            console.log(`   ✅ Seeded ${defaultStickers.length} stickers for company ${company.id}`);
        }

        console.log(`   📊 Total stickers inserted: ${totalInserted}`);

        await client.query('COMMIT');
        console.log('\n🎉 All done! Sticker system is ready.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', err);
        process.exitCode = 1;
    } finally {
        client.release();
        await pgPool.end();
        process.exit(0);
    }
}

seedStickers();
