import { z } from 'zod';

export const createMessageSchema = z.object({
    content: z.string().min(1, 'Conteúdo obrigatório').max(10000, 'Conteúdo muito extenso'),
    contentType: z.enum(['text', 'file', 'image', 'video', 'audio', 'pdf', 'call', 'poll', 'meeting']).optional().default('text'),
    fileUrl: z.string().url('URL inválida').optional().nullable(),
    replyTo: z.string().uuid('ID inválido').optional().nullable(),
    threadId: z.string().uuid('ID inválido').optional().nullable(),
    expiresIn: z.number().int().positive().optional().nullable(),
}).strict(); // strict prevents mass-assignment of extraneous fields
