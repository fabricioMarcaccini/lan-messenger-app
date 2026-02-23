import Router from 'koa-router';
import { authMiddleware } from '../middlewares/auth.js';

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

    // Helper genérico para conectar na OpenRouter
    async function askOpenRouter(systemInstruction, prompt, apiKey) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://lan-messenger.local', // Required by OpenRouter
                'X-Title': 'LAN Messenger App' // Required by OpenRouter
            },
            body: JSON.stringify({
                model: 'arcee-ai/trinity-large-preview:free',
                // temperature: 0.3 for more deterministic results, especially for JSON
                temperature: 0.3,
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
        return data.choices[0].message.content.trim();
    }

    // Endpoint para Respostas Rápidas (Smart Replies)
    router.post('/smart-replies', authMiddleware, async (ctx) => {
        const { contextText } = ctx.request.body;
        if (!contextText) {
            ctx.status = 400; ctx.body = { success: false }; return;
        }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            ctx.status = 500; ctx.body = { success: false, message: 'API Key não configurada' }; return;
        }

        const systemInstruction = 'Você é um assistente que gera opções de respostas curtas para um chat corporativo. Retorne DE FORMA ESTRITA, APENAS, SEM MAIS NENHUMA LETRA, UM ARRAY VALIDO EM JSON no formato ["Resposta 1", "Resposta 2", "Resposta 3"] com 3 respostas plausíveis para a última mensagem.';
        const prompt = `Gere 3 respostas curtas (máximo 6 palavras cada) adequadas para a seguinte mensagem recebida no trabalho: "${contextText}"\nApenas JSON:`;

        try {
            const aiResponse = await askOpenRouter(systemInstruction, prompt, apiKey);

            // Remove blocos de markdown de codigo se a IA teimar em colocar
            const cleanJsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            const repliesArray = JSON.parse(cleanJsonStr);

            ctx.body = { success: true, replies: repliesArray };
        } catch (error) {
            console.error('Smart Replies Error:', error);
            ctx.status = 500; ctx.body = { success: false };
        }
    });

    // Endpoint para Resumo de Grupo e Extração de Tarefas
    router.post('/analyze-chat', authMiddleware, async (ctx) => {
        const { textLog, action } = ctx.request.body;
        if (!textLog) {
            ctx.status = 400; ctx.body = { success: false }; return;
        }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            ctx.status = 500; ctx.body = { success: false, message: 'API Key não configurada' }; return;
        }

        let systemInstruction = '';
        let prompt = '';

        if (action === 'summarize') {
            systemInstruction = 'Você é um assistente corporativo que resume logs de chat. Seu objetivo é resumir uma conversa e os tópicos discutidos de forma breve, direta e estruturada.';
            prompt = `Faça um breve resumo (em tópicos) do que acabou de ser dito no chat.\n\nLog da Conversa:\n${textLog}\n\nResumo:`;
        } else if (action === 'extract_tasks') {
            systemInstruction = 'Você é um planejador de projetos. Leia o log de um chat corporativo e extraia as principais Tarefas/Action Items que pessoas prometeram ou combinaram de fazer. Retorne uma checklist bonita e limpa.';
            prompt = `Extraia as tarefas prometidas do seguinte chat.\n\nLog da Conversa:\n${textLog}\n\nChecklist (To-do):`;
        }

        try {
            const aiResponse = await askOpenRouter(systemInstruction, prompt, apiKey);
            ctx.body = { success: true, result: aiResponse };
        } catch (error) {
            console.error('Analyze Chat Error:', error);
            ctx.status = 500; ctx.body = { success: false };
        }
    });

    // Rota original de Magic Text modificada para usar a helper function
    router.post('/magic-text', authMiddleware, async (ctx) => {
        const { text, action } = ctx.request.body;
        if (!text) {
            ctx.status = 400; ctx.body = { success: false, message: 'Texto obrigatório' }; return;
        }
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            ctx.status = 500; ctx.body = { success: false, message: 'API Key não configurada.' }; return;
        }

        let prompt = '';
        let systemInstruction = '';

        switch (action) {
            case 'professional':
                systemInstruction = 'Você é um assistente corporativo. Reescreva a mensagem para um tom profissional. Apenas reescreva a mensagem para o ambiente de trabalho, sem saudações desnecessárias.';
                prompt = `Reescreva para um tom profissional:\n\n"${text}"`;
                break;
            case 'grammar':
                systemInstruction = 'Você é um corretor ortográfico. Corrija a gramática e a pontuação da frase a seguir. Responda APENAS com a frase corrigida.';
                prompt = `Corrija:\n\n"${text}"`;
                break;
            case 'english':
                systemInstruction = 'Você é um tradutor nativo de inglês. Traduza do português para inglês corporativo. Responda apenas com a tradução.';
                prompt = `Traduza para o inglês:\n\n"${text}"`;
                break;
            case 'summarize':
                systemInstruction = 'Você é um assistente eficiente. Resuma o texto fornecido em uma frase.';
                prompt = `Resuma:\n\n"${text}"`;
                break;
            default:
                ctx.status = 400; ctx.body = { success: false }; return;
        }

        try {
            const aiResponse = await askOpenRouter(systemInstruction, prompt, apiKey);
            ctx.body = { success: true, data: { original: text, result: aiResponse } };
        } catch (error) {
            console.error('Magic Text Error:', error);
            ctx.status = 500; ctx.body = { success: false, message: 'Erro ao conectar na IA.' };
        }
    });

    export default router;
