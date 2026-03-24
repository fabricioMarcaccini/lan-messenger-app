import { db } from '../config/database.js';

/**
 * Middleware Koa para Auditoria de Operações (Tasks e Wiki)
 * Intercepta a requisição, salva o estado anterior, aguarda o update, e registra a diferença.
 * @param {string} resourceType - Tipo de recurso sendo alterado (ex: 'task', 'wiki')
 */
export const auditMiddleware = (resourceType) => {
  return async (ctx, next) => {
    const resourceId = ctx.params.taskId || ctx.params.id;
    const userId = ctx.state.user?.id;

    if (!resourceId || !userId) {
        return next();
    }

    // 1. Captura do Estado Anterior (Pré-Update)
    let previousState = null;
    if (resourceType === 'task') {
       try {
           const res = await db.write('SELECT * FROM tasks WHERE id = $1', [resourceId]);
           previousState = res.rows[0];
       } catch(e) {
           console.error('[AUDIT_WARN] Could not fetch previous state:', e);
       }
    }
    
    // 2. Delegation (Chama o controlador principal que faz o update)
    await next();

    // 3. Audit Log (Pós-update)
    if (ctx.status >= 200 && ctx.status < 300 && previousState) {
        // Pega o estado novo da resposta (tasks.routes.js retorna { success: true, data: taskData })
        const newState = ctx.body?.data || ctx.body || {};
        
        // Identifica Diffs baseando-se no corpo da requisição enviada
        const changedFields = Object.keys(ctx.request.body).filter(
            key => {
                // Mapeando chaves do body em camelCase para snake_case do banco
                const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                return previousState[dbKey] != newState[dbKey];
            }
        );

        if (changedFields.length > 0) {
            // "Fire and Forget" log insertion
            db.write(
                `INSERT INTO task_activities 
                (task_id, user_id, action, previous_state, new_state, changed_fields) 
                VALUES ($1, $2, 'UPDATED', $3, $4, $5)`,
                [
                    resourceId, 
                    userId, 
                    JSON.stringify(previousState), 
                    JSON.stringify(newState), 
                    changedFields
                ]
            ).catch(err => console.error('[AUDIT_ERROR] Failed to save audit log:', err));
            console.log(`[AUDIT] Action: UPDATED | Task: ${resourceId} | By: ${userId} | Changes: ${changedFields.join(', ')}`);
        }
    }
  };
};
