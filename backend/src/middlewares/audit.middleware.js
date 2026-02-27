import { db } from '../config/database.js';

export async function writeAuditLog({
    companyId,
    actorId = null,
    action,
    targetType = null,
    targetId = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
}) {
    if (!companyId || !action) return;

    try {
        await db.write(
            `INSERT INTO audit_logs (company_id, actor_id, action, target_type, target_id, metadata, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
            [
                companyId,
                actorId,
                action,
                targetType,
                targetId,
                JSON.stringify(metadata || {}),
                ipAddress,
                userAgent,
            ]
        );
    } catch (error) {
        console.error('Audit log write failed:', error.message);
    }
}

export async function auditMiddleware(ctx, next) {
    ctx.audit = async ({
        action,
        targetType = null,
        targetId = null,
        metadata = {},
        companyId = null,
        actorId = null,
    }) => {
        const resolvedCompanyId = companyId || ctx.state.user?.companyId || null;
        const resolvedActorId = actorId !== null ? actorId : (ctx.state.user?.id || null);

        await writeAuditLog({
            companyId: resolvedCompanyId,
            actorId: resolvedActorId,
            action,
            targetType,
            targetId,
            metadata,
            ipAddress: ctx.ip,
            userAgent: ctx.get('user-agent') || null,
        });
    };

    await next();
}
