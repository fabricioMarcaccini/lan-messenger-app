import Router from 'koa-router';
import { db, cache } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/permissions - List all available permissions
router.get('/', async (ctx) => {
    const result = await db.write(`
        SELECT id, name, description, category 
        FROM permissions 
        ORDER BY category, name
    `);

    // Group by category
    const grouped = result.rows.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
    }, {});

    ctx.body = {
        success: true,
        data: grouped,
    };
});

// GET /api/permissions/roles/:role - Get permissions for a role
router.get('/roles/:role', async (ctx) => {
    const { role } = ctx.params;
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT p.id, p.name, p.description, p.category
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.company_id = $1 AND rp.role = $2
    `, [companyId, role]);

    ctx.body = {
        success: true,
        data: result.rows,
    };
});

// PUT /api/permissions/roles/:role - Update role permissions (Admin only)
router.put('/roles/:role', adminMiddleware, async (ctx) => {
    const { role } = ctx.params;
    const { permissionIds } = ctx.request.body;
    const companyId = ctx.state.user.companyId;

    if (!Array.isArray(permissionIds)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'permissionIds deve ser um array' };
        return;
    }

    // Start transaction
    await db.transaction(async (client) => {
        // Remove existing permissions for this role
        await client.query(
            'DELETE FROM role_permissions WHERE company_id = $1 AND role = $2',
            [companyId, role]
        );

        // Insert new permissions
        for (const permId of permissionIds) {
            await client.query(
                'INSERT INTO role_permissions (company_id, role, permission_id) VALUES ($1, $2, $3)',
                [companyId, role, permId]
            );
        }
    });

    // Clear cache
    await cache.del(`permissions:${companyId}:${role}`);

    ctx.body = {
        success: true,
        message: `Permissões do role ${role} atualizadas com sucesso`,
    };
});

// GET /api/permissions/users/:userId - Get user-specific permissions
router.get('/users/:userId', async (ctx) => {
    const { userId } = ctx.params;

    const result = await db.write(`
        SELECT p.id, p.name, p.description, p.category, up.granted
        FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = $1
    `, [userId]);

    ctx.body = {
        success: true,
        data: result.rows,
    };
});

// PUT /api/permissions/users/:userId - Update user-specific permissions (Admin only)
router.put('/users/:userId', adminMiddleware, async (ctx) => {
    const { userId } = ctx.params;
    const { permissions } = ctx.request.body; // [{ permissionId, granted }]

    if (!Array.isArray(permissions)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'permissions deve ser um array' };
        return;
    }

    await db.transaction(async (client) => {
        // Remove existing user permissions
        await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);

        // Insert new permissions
        for (const perm of permissions) {
            await client.query(
                'INSERT INTO user_permissions (user_id, permission_id, granted) VALUES ($1, $2, $3)',
                [userId, perm.permissionId, perm.granted]
            );
        }
    });

    // Clear cache
    await cache.del(`permissions:user:${userId}`);

    ctx.body = {
        success: true,
        message: 'Permissões do usuário atualizadas com sucesso',
    };
});

// GET /api/permissions/check/:permission - Check if current user has permission
router.get('/check/:permission', async (ctx) => {
    const { permission } = ctx.params;
    const userId = ctx.state.user.id;
    const role = ctx.state.user.role;
    const companyId = ctx.state.user.companyId;

    // Admin always has all permissions
    if (role === 'admin') {
        ctx.body = { success: true, data: { hasPermission: true } };
        return;
    }

    // Check cache first
    const cacheKey = `permissions:check:${userId}:${permission}`;
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
        ctx.body = { success: true, data: { hasPermission: cached } };
        return;
    }

    // Check user-specific override first
    const userPerm = await db.write(`
        SELECT up.granted
        FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = $1 AND p.name = $2
    `, [userId, permission]);

    if (userPerm.rows.length > 0) {
        const hasPermission = userPerm.rows[0].granted;
        await cache.set(cacheKey, hasPermission, 300);
        ctx.body = { success: true, data: { hasPermission } };
        return;
    }

    // Check role permission
    const rolePerm = await db.write(`
        SELECT 1
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.company_id = $1 AND rp.role = $2 AND p.name = $3
    `, [companyId, role, permission]);

    const hasPermission = rolePerm.rows.length > 0;
    await cache.set(cacheKey, hasPermission, 300);

    ctx.body = { success: true, data: { hasPermission } };
});

// GET /api/permissions/my - Get all permissions for current user
router.get('/my', async (ctx) => {
    const userId = ctx.state.user.id;
    const role = ctx.state.user.role;
    const companyId = ctx.state.user.companyId;

    // Admin gets all permissions
    if (role === 'admin') {
        const allPerms = await db.write('SELECT name FROM permissions');
        ctx.body = {
            success: true,
            data: allPerms.rows.map(p => p.name),
        };
        return;
    }

    // Get role permissions
    const rolePerms = await db.write(`
        SELECT p.name
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.company_id = $1 AND rp.role = $2
    `, [companyId, role]);

    // Get user overrides
    const userPerms = await db.write(`
        SELECT p.name, up.granted
        FROM user_permissions up
        JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = $1
    `, [userId]);

    // Merge permissions
    const permissions = new Set(rolePerms.rows.map(p => p.name));

    for (const perm of userPerms.rows) {
        if (perm.granted) {
            permissions.add(perm.name);
        } else {
            permissions.delete(perm.name);
        }
    }

    ctx.body = {
        success: true,
        data: Array.from(permissions),
    };
});

export default router;
