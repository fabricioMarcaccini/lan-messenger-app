import Router from 'koa-router';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = new Router();

// Endpoint for Magic Text (Productivity feature)
router.post('/magic-text', authMiddleware, async (ctx) => {
    const { text, action } = ctx.request.body;

    if (!text) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Texto é obrigatório' };
        return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        ctx.status = 500;
        ctx.body = { success: false, message: 'API Key da IA não configurada no servidor.' };
        return;
    }

    let prompt = '';
    let systemInstruction = '';

    switch (action) {
        case 'professional':
            systemInstruction = 'Você é um assistente corporativo útil. Seu objetivo é ajudar a reescrever mensagens para um tom profissional e amigável. Não adicione saudações ou despedidas longas, apenas reescreva a mensagem para o ambiente de trabalho.';
            prompt = `Reescreva a seguinte mensagem para um tom profissional:\n\n"${text}"`;
            break;
        case 'grammar':
            systemInstruction = 'Você é um corretor ortográfico. Corrija os erros gramaticais e de pontuação da frase a seguir. Responda APENAS com a frase corrigida, sem explicações.';
            prompt = `Corrija e melhore a gramática:\n\n"${text}"`;
            break;
        case 'english':
            systemInstruction = 'Você é um tradutor nativo de inglês. Traduza a mensagem a seguir do português para o inglês corporativo. Responda apenas com a tradução.';
            prompt = `Traduza para o inglês:\n\n"${text}"`;
            break;
        case 'summarize':
            systemInstruction = 'Você é um assistente eficiente. Resuma o texto fornecido em uma ou duas frases diretas.';
            prompt = `Resuma o seguinte texto:\n\n"${text}"`;
            break;
        default:
            ctx.status = 400;
            ctx.body = { success: false, message: 'Ação inválida' };
            return;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://lan-messenger.local', // Required by OpenRouter
                'X-Title': 'LAN Messenger App' // Required by OpenRouter
            },
            body: JSON.stringify({
                // Using Trinity Large Preview (Free) as requested
                model: 'arcee-ai/trinity-large-preview:free',
                messages: [
                    { role: 'system', content: systemInstruction },
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', response.status, errorText);
            throw new Error(`OpenRouter API erro: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();

        ctx.body = {
            success: true,
            data: {
                original: text,
                result: aiResponse
            }
        };
    } catch (error) {
        console.error('Magic Text Error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao processar a mensagem com IA.' };
    }
});

export default router;
