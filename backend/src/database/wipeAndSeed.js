import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const usersToSeed = [
    { name: 'Marco Antônio', role: 'admin', email: 'marco@gestao21.com.br', pass: 'admin-123' },
    { name: 'Nathalia Brandao', role: 'moderator', email: 'nathalia.brandao@gestao21.com.br', pass: 'nathalia123' },
    { name: 'Fabricio', role: 'user', email: 'fabricio@gestao21.com.br', pass: 'fabricio123' },
    { name: 'julia', role: 'user', email: 'julia@gestao21.com.br', pass: 'julia123' },
    { name: 'aline', role: 'user', email: 'aline.machado@gestao21.com.br', pass: 'aline123' },
    { name: 'Guilherme', role: 'user', email: 'guilherme.kiom@gestao21.com.br', pass: 'guilherme123' }
];

async function wipeAndSeed() {
    try {
        console.log('🗑️ Apagando e zerando todo o banco de dados (Wipe)...');
        // Drop public schema to wipe all tables effectively
        await db.write(`
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO postgres;
            GRANT ALL ON SCHEMA public TO public;
        `);

        console.log('🏗️ Reconstruindo a estrutura do banco (init.sql)...');
        const initSql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf-8');
        await db.write(initSql);

        console.log('🌱 Iniciando deploy dos usuários Gestão 21...');

        let companyId;
        const result = await db.write(
            'INSERT INTO companies (name, cnpj) VALUES ($1, $2) RETURNING id',
            ['Gestão 21', '00000000000021']
        );
        companyId = result.rows[0].id;
        console.log(`✅ Empresa Gestão 21 criada do zero (ID: ${companyId})`);

        for (const u of usersToSeed) {
            const hash = await bcrypt.hash(u.pass, 12);
            // username based on prefix
            const username = u.email.split('@')[0];

            await db.write(`
                INSERT INTO users (company_id, username, email, full_name, password_hash, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [companyId, username, u.email, u.name, hash, u.role]);

            console.log(`✅ Usuário Registrado: ${u.name} | Role: ${u.role} | Login: ${username}`);
        }

        console.log('✨ Seed Finalizado com Sucesso Absoluto! Pode testar os painéis.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro no processo de Seed Refresco:', e);
        process.exit(1);
    }
}

wipeAndSeed();
