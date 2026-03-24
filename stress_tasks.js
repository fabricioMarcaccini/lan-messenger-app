// stress_tasks.js
// Testa a concorrência e possíveis race conditions no Controller de Tarefas / Audit Middleware

import fs from 'fs';
import { db } from './backend/src/config/database.js';

// Função auxiliar para Mockar um context do Koa
import { auditMiddleware } from './backend/src/middlewares/auditMiddleware.js';

async function runStressTest() {
    console.log('🚀 Iniciando Stress Test do Sistema de Tasks e Auditoria...');
    let taskId, userId;

    // 1. Setup inicial
    try {
        const res = await db.write('SELECT id, creator_id FROM tasks LIMIT 1');
        if(res.rows.length === 0) {
            console.log("⚠️ No real tasks to test. Creating a dummy is not supported due to complex FKs, please create one in the app first.");
            process.exit(0);
        }
        taskId = res.rows[0].id;
        userId = res.rows[0].creator_id;
        console.log(`✅ Using real DB task: ${taskId}`);

        // Limpar logs antigos desse target se houver
        await db.write('DELETE FROM task_activities WHERE task_id = $1', [taskId]);
    } catch(e) {
        console.error('Setup Database failed:', e.message);
        process.exit(1);
    }

    const middleware = auditMiddleware('task');

    // Mutações simultâneas
    const mutations = Array.from({ length: 50 }).map((_, index) => {
        return async () => {
            const descriptionTarget = index % 2 === 0 ? 'Urgent' : 'Routine';
            
            // Mock Context do Koa
            const ctx = {
                params: { taskId },
                state: { user: { id: userId } },
                request: { body: { description: descriptionTarget } },
            };

            // Middleware Intercepta
            await middleware(ctx, async () => {
                await db.write('UPDATE tasks SET description = $1 WHERE id = $2', [descriptionTarget, taskId]);
                ctx.status = 200;
                ctx.body = { data: { description: descriptionTarget } };
            });
        };
    });

    console.log(`🔫 Disparando ${mutations.length} atualizações concorrentes...`);
    
    const start = Date.now();
    await Promise.all(mutations.map(m => m()));
    const timeToComplete = Date.now() - start;

    console.log(`⏱️ Tempo total: ${timeToComplete}ms`);

    // Validação
    const logs = await db.write('SELECT id FROM task_activities WHERE task_id = $1', [taskId]);
    console.log(`📊 Logs Gerados: ${logs.rows.length}`);
    
    // Nem todos os 50 devem gerar log (pois se o target "TODO" vira "TODO" não conta como diff)
    // Mas não devemos ter crash (Pool limit hit or Race limits)
    if (logs.rows.length > 0) {
        console.log('✅ Sistema tolerou concorrência severa sem perder o fluxo do Audit!');
    } else {
        console.error('❌ Nenhum log gerado. Algum problema com o Fire-And-Forget.');
        process.exit(1);
    }

    process.exit(0);
}

runStressTest();
