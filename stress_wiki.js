import { db } from './backend/src/config/database.js';

async function runWikiStressTest() {
    console.log('--- Iniciando Stress Test do Optimistic Lock da Wiki ---');

    console.log('1. Preparando base de Teste...');
    // Fetch a real user and conversation to pass foreign keys
    const userRes = await db.write('SELECT id, company_id FROM users LIMIT 1');
    const convRes = await db.write('SELECT id FROM conversations WHERE company_id = $1 LIMIT 1', [userRes.rows[0].company_id]);
    
    if (userRes.rows.length === 0 || convRes.rows.length === 0) {
        console.error('Nenhum usuário/conversa encontrado no banco para teste.');
        process.exit(1);
    }
    
    const companyId = userRes.rows[0].company_id;
    const authorId = userRes.rows[0].id;
    const conversationId = convRes.rows[0].id;

    const insertRes = await db.write(`
        INSERT INTO wiki_pages (company_id, conversation_id, author_id, title, content, emoji, version)
        VALUES ($1, $2, $3, 'Página de Estresse', '{"blocks":[]}', '🔥', 1)
        RETURNING id
    `, [companyId, conversationId, authorId]);

    const pageId = insertRes.rows[0].id;
    console.log('Página criada:', pageId);

    console.log('2. Disparando 25 atualizações simultâneas do mesmo conteúdo com a Versão 1...');
    let success = 0;
    let conflicts = 0;
    let errors = 0;

    const baseVersion = 1;
    
    // Simular que 25 usuários deram "Ctrl+S" quase no mesmo milissegundo com a mesma versão local (1)
    const requests = Array.from({ length: 25 }).map((_, index) => {
        return async () => {
            const updates = ['updated_at = NOW()', 'version = version + 1', 'content = $1'];
            
            // Simula latência de rede aleatória (0 a 100ms)
            await new Promise(r => setTimeout(r, Math.random() * 100));

            try {
                const res = await db.write(`
                    UPDATE wiki_pages
                    SET ${updates.join(', ')}
                    WHERE id = $2 AND version = $3
                    RETURNING *
                `, [`{"status": "Update By Racer ${index}"}`, pageId, baseVersion]);

                if (res.rows.length === 0) {
                    conflicts++;
                } else {
                    success++;
                }
            } catch (err) {
                errors++;
            }
        };
    });

    await Promise.all(requests.map(fn => fn()));

    console.log('--- Resultado do Benchmark (Optimistic Locking) ---');
    console.log(`✅ Sucessos Obtidos: ${success} (Deveria ser exatamente 1)`);
    console.log(`🔒 Conflitos Bloqueados (Avoided Overwrites): ${conflicts} (Deveria ser exatamente 24)`);
    console.log(`❌ Erros Inesperados: ${errors}`);

    if (success !== 1 || conflicts !== 24) {
        console.error('ALERTA: O Optimistic Locking falhou em segurar as transações paralelas.');
        process.exit(1);
    } else {
        console.log('SUCESSO TOTAL! O banco negou adequadamente 24 commits obsoletos.');
    }

    // Clean up
    await db.write('DELETE FROM wiki_pages WHERE id = $1', [pageId]);
    console.log('Lixo de teste apagado.');
    process.exit(0);
}

runWikiStressTest();
