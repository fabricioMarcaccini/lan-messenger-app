import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

const usersToSeed = [
    { name: 'Marco Antônio', role: 'admin', email: 'marco@gestao21.com.br', pass: 'admin-123' },
    { name: 'Nathalia Brandao', role: 'moderator', email: 'nathalia.brandao@gestao21.com.br', pass: 'nathalia123' },
    { name: 'Fabricio', role: 'user', email: 'fabricio@gestao21.com.br', pass: 'fabricio123' },
    { name: 'julia', role: 'user', email: 'julia@gestao21.com.br', pass: 'julia123' },
    { name: 'aline', role: 'user', email: 'aline.machado@gestao21.com.br', pass: 'aline123' },
    { name: 'Guilherme', role: 'user', email: 'guilherme.kiom@gestao21.com.br', pass: 'guilherme123' }
];

async function seed() {
    try {
        console.log('🌱 Starting user deployment...');

        // Ensure company Gestão 21 exists
        let companyId;
        const companyExists = await db.read('SELECT id FROM companies WHERE name = $1', ['Gestão 21']);

        if (companyExists.rows && companyExists.rows.length > 0) {
            companyId = companyExists.rows[0].id;
            console.log(`Company Gestão 21 already exists (ID: ${companyId})`);
        } else {
            console.log('Found no Gestão 21 company, creating it...');
            const result = await db.write(
                'INSERT INTO companies (name, cnpj) VALUES ($1, $2) RETURNING id',
                ['Gestão 21', '00000000000021']
            );
            companyId = result.rows[0].id;
        }

        for (const u of usersToSeed) {
            // check if user exists
            const existing = await db.read('SELECT id FROM users WHERE email = $1', [u.email]);
            if (existing.rows && existing.rows.length > 0) {
                console.log(`User ${u.email} already exists, skipping...`);
                continue;
            }

            const hash = await bcrypt.hash(u.pass, 12);
            // using the prefix of email as username if needed, but username must be unique
            const username = u.email.split('@')[0];

            await db.write(`
                INSERT INTO users (company_id, username, email, full_name, password_hash, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [companyId, username, u.email, u.name, hash, u.role]);

            console.log(`✅ Created user: ${u.name} (${u.role}) - ${u.email}`);
        }
        console.log('✨ Seed completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Error seeding:', e);
        process.exit(1);
    }
}

seed();
