import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

// Endpoint que carrega figurinhas da empresa e favoritas do usuário
router.get('/', authMiddleware, async (ctx) => {
    const { companyId, id: userId } = ctx.state.user;

    try {
        // Figurinhas da empresa (inclui as que os membros criaram, vamos listar todas por enquanto)
        // No futuro podemos agrupar por "pacotes"
        const companyStickersResult = await db.query(
            `SELECT id, file_url as url, is_animated as "isAnimated", created_at as "createdAt"
             FROM stickers
             WHERE company_id = $1
             ORDER BY created_at DESC`,
            [companyId]
        );

        // Figurinhas favoritas do usuário
        const favoritesResult = await db.query(
            `SELECT s.id, s.file_url as url, s.is_animated as "isAnimated"
             FROM user_favorite_stickers f
             JOIN stickers s ON s.id = f.sticker_id
             WHERE f.user_id = $1
             ORDER BY f.added_at DESC`,
            [userId]
        );

        ctx.body = {
            success: true,
            stickers: companyStickersResult.rows,
            favorites: favoritesResult.rows
        };
    } catch (error) {
        console.error('Error fetching stickers:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao buscar figurinhas' };
    }
});

// Adiciona uma figurinha aos favoritos
router.post('/:id/favorite', authMiddleware, async (ctx) => {
    const { id: stickerId } = ctx.params;
    const { id: userId } = ctx.state.user;

    try {
        await db.query(
            `INSERT INTO user_favorite_stickers (user_id, sticker_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [userId, stickerId]
        );
        ctx.body = { success: true };
    } catch (error) {
        console.error('Error favoriting sticker:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao favoritar figurinha' };
    }
});

// Remove uma figurinha dos favoritos
router.delete('/:id/favorite', authMiddleware, async (ctx) => {
    const { id: stickerId } = ctx.params;
    const { id: userId } = ctx.state.user;

    try {
        await db.query(
            `DELETE FROM user_favorite_stickers
             WHERE user_id = $1 AND sticker_id = $2`,
            [userId, stickerId]
        );
        ctx.body = { success: true };
    } catch (error) {
        console.error('Error unfavoriting sticker:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao desfavoritar figurinha' };
    }
});

// Cria uma nova figurinha para a empresa
router.post('/', authMiddleware, async (ctx) => {
    const { companyId, id: userId } = ctx.state.user;
    const { fileUrl, isAnimated } = ctx.request.body;

    if (!fileUrl) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'URL da figurinha obrigatória' };
        return;
    }

    try {
        const result = await db.query(
            `INSERT INTO stickers (company_id, file_url, created_by, is_animated)
             VALUES ($1, $2, $3, $4)
             RETURNING id, file_url as url, is_animated as "isAnimated", created_at as "createdAt"`,
            [companyId, fileUrl, userId, !!isAnimated]
        );

        ctx.body = {
            success: true,
            sticker: result.rows[0]
        };
    } catch (error) {
        console.error('Error creating sticker:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao criar figurinha' };
    }
});

export default router;
