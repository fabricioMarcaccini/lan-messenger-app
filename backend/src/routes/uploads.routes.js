import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const router = new Router();

// Pasta para uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Garantir que a pasta existe
async function ensureUploadsDir() {
    try {
        await fs.access(UPLOADS_DIR);
    } catch {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
}

router.use(authMiddleware);

// Blocked file extensions for security
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.jar', '.scr', '.pif', '.sh'];

// POST /api/uploads - Upload a file
router.post('/', async (ctx) => {
    await ensureUploadsDir();

    console.log('📤 Upload request received');
    console.log('   Files:', ctx.request.files);
    console.log('   Body:', ctx.request.body);

    // koa-body pode colocar o file em ctx.request.files com qualquer nome
    let file = ctx.request.files?.file;

    // Se não encontrou como 'file', procura qualquer arquivo
    if (!file && ctx.request.files) {
        const fileKeys = Object.keys(ctx.request.files);
        if (fileKeys.length > 0) {
            file = ctx.request.files[fileKeys[0]];
        }
    }

    if (!file) {
        console.log('❌ No file found in request');
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nenhum arquivo enviado' };
        return;
    }

    console.log('   File object:', file);

    try {
        const originalName = file.originalFilename || file.name || 'unknown';
        const ext = path.extname(originalName).toLowerCase();

        // Security: Block dangerous extensions
        if (BLOCKED_EXTENSIONS.includes(ext)) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Tipo de arquivo não permitido por segurança' };
            return;
        }

        const fileId = randomUUID();
        const fileName = `${fileId}${ext}`;
        const filePath = path.join(UPLOADS_DIR, fileName);

        // Read and save file - try filepath first (formidable v3), then path (older versions)
        const sourcePath = file.filepath || file.path;
        console.log('   Source path:', sourcePath);

        const data = await fs.readFile(sourcePath);
        await fs.writeFile(filePath, data);

        // Get file info
        const stats = await fs.stat(filePath);
        const mimeType = file.mimetype || file.type || 'application/octet-stream';

        // Determine content type for chat
        let contentType = 'file';
        if (mimeType.startsWith('image/')) contentType = 'image';
        else if (mimeType.startsWith('video/')) contentType = 'video';
        else if (mimeType.startsWith('audio/')) contentType = 'audio';
        else if (mimeType === 'application/pdf') contentType = 'pdf';

        // Save to database
        const result = await db.write(
            `INSERT INTO file_uploads (id, user_id, original_name, file_name, file_path, mime_type, file_size, content_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, original_name, file_name, mime_type, file_size, content_type, created_at`,
            [fileId, ctx.state.user.id, originalName, fileName, `/uploads/${fileName}`, mimeType, stats.size, contentType]
        );

        console.log('✅ File uploaded successfully:', fileName);

        ctx.status = 201;
        ctx.body = {
            success: true,
            data: {
                id: result.rows[0].id,
                originalName: result.rows[0].original_name,
                fileName: result.rows[0].file_name,
                url: `/uploads/${fileName}`,
                mimeType: result.rows[0].mime_type,
                fileSize: result.rows[0].file_size,
                contentType: result.rows[0].content_type,
            },
        };
    } catch (error) {
        console.error('❌ Upload error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao fazer upload do arquivo: ' + error.message };
    }
});

// GET /api/uploads/:id - Get file info
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;

    const result = await db.write(
        'SELECT * FROM file_uploads WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Arquivo não encontrado' };
        return;
    }

    const file = result.rows[0];
    ctx.body = {
        success: true,
        data: {
            id: file.id,
            originalName: file.original_name,
            url: file.file_path,
            mimeType: file.mime_type,
            fileSize: file.file_size,
            contentType: file.content_type,
            createdAt: file.created_at,
        },
    };
});

export default router;
