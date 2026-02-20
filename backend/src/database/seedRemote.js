import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const usersToSeed = [
    { name: 'Marco Antônio', role: 'admin', email: 'marco@gestao21.com.br', pass: 'admin-123' },
    { name: 'Nathalia Brandao', role: 'moderator', email: 'nathalia.brandao@gestao21.com.br', pass: 'nathalia123' },
    { name: 'Fabricio', role: 'user', email: 'fabricio@gestao21.com.br', pass: 'fabricio123' },
    { name: 'julia', role: 'user', email: 'julia@gestao21.com.br', pass: 'julia123' },
    { name: 'aline', role: 'user', email: 'aline.machado@gestao21.com.br', pass: 'aline123' },
    { name: 'Guilherme', role: 'user', email: 'guilherme.kiom@gestao21.com.br', pass: 'guilherme123' }
];

async function wipeAndSeedRemote() {
    const client = new pg.Client({
        connectionString: 'postgresql://landb_psr2_user:3aqBVNegUSPLUxEKCjtAcVARGNNS4doT@dpg-d6c68fa4d50c73d53vbg-a.ohio-postgres.render.com/landb_psr2',
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('🔗 Conectado ao banco de dados PostgreSQL na nuvem (Render/Supabase)...');

        console.log('🗑️ Construindo a estrutura limpa no banco remoto...');
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
        await client.query(initSql);

        console.log('🌱 Iniciando deploy dos usuários Gestão 21 na NUVEM...');

        let companyId;
        const result = await client.query(
            'INSERT INTO companies (name, cnpj) VALUES ($1, $2) ON CONFLICT(cnpj) DO UPDATE SET name=EXCLUDED.name RETURNING id',
            ['Gestão 21', '00000000000021']
        );
        companyId = result.rows[0].id;
        console.log(`✅ Empresa Gestão 21 garantida (ID: ${companyId})`);

        for (const u of usersToSeed) {
            const existing = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
            if (existing.rows.length > 0) {
                console.log(`User ${u.email} already exists remotely, skipping...`);
                continue;
            }

            const hash = await bcrypt.hash(u.pass, 12);
            const username = u.email.split('@')[0];

            await client.query(`
                INSERT INTO users (company_id, username, email, full_name, password_hash, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [companyId, username, u.email, u.name, hash, u.role]);

            console.log(`✅ Usuário Registrado na Nuvem: ${u.name}`);
        }

        console.log('✨ Seed Remoto Finalizado com Sucesso Absoluto!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no processo de Seed Remoto:', e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

wipeAndSeedRemote();
