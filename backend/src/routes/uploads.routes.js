import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { randomUUID } from 'crypto';
import path from 'path';

const router = new Router();

router.use(authMiddleware);

// Block dangerous extensions
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.jar', '.scr', '.pif', '.sh'];

// POST /api/uploads - Upload a file (stores in DB as base64 for Render compatibility)
router.post('/', async (ctx) => {
    console.log('📤 Upload request received');

    // koa-body puts file in ctx.request.files
    let file = ctx.request.files?.file;
    if (!file && ctx.request.files) {
        const keys = Object.keys(ctx.request.files);
        if (keys.length > 0) file = ctx.request.files[keys[0]];
    }

    if (!file) {
        console.log('❌ No file found in request');
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nenhum arquivo enviado' };
        return;
    }

    const originalName = file.originalFilename || file.name || 'unknown';
    const ext = path.extname(originalName).toLowerCase();

    if (BLOCKED_EXTENSIONS.includes(ext)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Tipo de arquivo não permitido por segurança' };
        return;
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    const mimeType = file.mimetype || file.type || 'application/octet-stream';

    try {
        // Read file from tmp path
        const { readFile } = await import('fs/promises');
        const sourcePath = file.filepath || file.path;
        const fileBuffer = await readFile(sourcePath);

        if (fileBuffer.length > MAX_SIZE) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Arquivo muito grande. Máximo permitido: 20MB' };
            return;
        }

        // Determine content type for chat
        let contentType = 'file';
        if (mimeType.startsWith('image/')) contentType = 'image';
        else if (mimeType.startsWith('video/')) contentType = 'video';
        else if (mimeType.startsWith('audio/')) contentType = 'audio';
        else if (mimeType === 'application/pdf') contentType = 'pdf';

        const fileId = randomUUID();
        const base64Data = fileBuffer.toString('base64');

        // Save to database as base64 (persistent on Render - no filesystem dependency)
        await db.write(
            `INSERT INTO file_uploads (id, user_id, original_name, file_name, file_path, mime_type, file_size, content_type, file_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [fileId, ctx.state.user.id, originalName, `${fileId}${ext}`, `/api/uploads/${fileId}/file`, mimeType, fileBuffer.length, contentType, base64Data]
        );

        console.log('✅ File uploaded to DB:', originalName, fileBuffer.length, 'bytes');

        ctx.status = 201;
        ctx.body = {
            success: true,
            data: {
                id: fileId,
                originalName,
                fileName: `${fileId}${ext}`,
                url: `/api/uploads/${fileId}/file`,
                mimeType,
                fileSize: fileBuffer.length,
                contentType,
            },
        };
    } catch (error) {
        console.error('❌ Upload error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao fazer upload do arquivo: ' + error.message };
    }
});

// GET /api/uploads/:id/file - Serve file from DB
router.get('/:id/file', async (ctx) => {
    const { id } = ctx.params;
    try {
        const result = await db.write(
            'SELECT file_data, mime_type, original_name, file_size FROM file_uploads WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Arquivo não encontrado' };
            return;
        }

        const file = result.rows[0];
        const buffer = Buffer.from(file.file_data, 'base64');

        ctx.set('Content-Type', file.mime_type);
        ctx.set('Content-Length', String(buffer.length));
        ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
        ctx.set('Cache-Control', 'public, max-age=31536000');
        ctx.body = buffer;
    } catch (error) {
        console.error('❌ File serve error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao servir arquivo' };
    }
});

// GET /api/uploads/:id - Get file metadata
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;
    const result = await db.write(
        'SELECT id, original_name, file_name, file_path, mime_type, file_size, content_type, created_at FROM file_uploads WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Arquivo não encontrado' };
        return;
    }

    const f = result.rows[0];
    ctx.body = {
        success: true,
        data: {
            id: f.id,
            originalName: f.original_name,
            url: f.file_path || `/api/uploads/${f.id}/file`,
            mimeType: f.mime_type,
            fileSize: f.file_size,
            contentType: f.content_type,
            createdAt: f.created_at,
        },
    };
});

export default router;
