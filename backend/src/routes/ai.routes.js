import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware, requirePlan } from '../middlewares/auth.js';

const router = new Router();

// Helper genérico para conectar na OpenRouter
async function askOpenRouter(systemInstruction, prompt, apiKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://lan-messenger.local', // Required by OpenRouter
            'X-Title': 'Lanly App' // Required by OpenRouter
        },
        body: JSON.stringify({
            model: 'arcee-ai/trinity-large-preview:free',
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

// Helper para obter a chave de API (BYOK ou Fallback Server)
async function checkAndDeductAICredits(userId) {
    try {
        const uRes = await db.write('SELECT company_id FROM users WHERE id = $1', [userId]);
        const companyId = uRes.rows[0]?.company_id;

        if (companyId) {
            const cRes = await db.write('SELECT openrouter_api_key, ai_credits_balance FROM companies WHERE id = $1', [companyId]);
            const { openrouter_api_key, ai_credits_balance } = cRes.rows[0] || {};

            // If user has their own key, they don't consume credits, so we always approve.
            if (openrouter_api_key && openrouter_api_key.length > 10) {
                return { allowed: true, apiKey: openrouter_api_key };
            }

            // Otherwise, they need credits
            if (ai_credits_balance > 0) {
                await db.write('UPDATE companies SET ai_credits_balance = ai_credits_balance - 1 WHERE id = $1', [companyId]);
                return { allowed: true, apiKey: process.env.OPENROUTER_API_KEY };
            } else {
                return { allowed: false, error: 'Créditos de IA esgotados. Configure sua API Key no menu de Ajustes da Conta para usar modelos gratuitos de forma ilimitada.' };
            }
        }
    } catch (e) {
        console.error('Erro ao processar creditos', e);
    }
    return { allowed: false, error: 'Erro de validação ou Empresa não encontrada' };
}

// Helper para obter a chave de API de AUDIO (BYOK Groq ou Fallback Server)
async function checkAndDeductAIAudioCredits(userId) {
    try {
        const uRes = await db.write('SELECT company_id FROM users WHERE id = $1', [userId]);
        const companyId = uRes.rows[0]?.company_id;

        if (companyId) {
            const cRes = await db.write('SELECT groq_api_key, ai_credits_balance FROM companies WHERE id = $1', [companyId]);
            const { groq_api_key, ai_credits_balance } = cRes.rows[0] || {};

            // If user has their own Groq key, they don't consume credits.
            if (groq_api_key && groq_api_key.length > 10) {
                return { allowed: true, apiKey: groq_api_key };
            }

            // Otherwise, they need credits
            if (ai_credits_balance > 0) {
                await db.write('UPDATE companies SET ai_credits_balance = ai_credits_balance - 1 WHERE id = $1', [companyId]);
                const fallbackKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
                return { allowed: true, apiKey: fallbackKey };
            } else {
                return { allowed: false, error: 'Créditos de IA esgotados. Configure sua Chave do Groq LPU no menu de Ajustes da Conta para transcrições ilimitadas.' };
            }
        }
    } catch (e) {
        console.error('Erro ao processar creditos de audio', e);
    }
    return { allowed: false, error: 'Erro de validação ou Empresa não encontrada' };
}

// Endpoint para resposta do bot @lanly
router.post('/bot-reply', authMiddleware, async (ctx) => {
    const { message, context = [] } = ctx.request.body || {};

    if (!message || typeof message !== 'string') {
        ctx.status = 400;
        ctx.body = { success: false, message: 'message é obrigatório' };
        return;
    }

    const authIA = await checkAndDeductAICredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const apiKey = authIA.apiKey;
    if (!apiKey) {
        ctx.status = 500; ctx.body = { success: false, message: 'API Key do sistema não configurada' }; return;
    }

    const safeContext = Array.isArray(context) ? context.slice(-12) : [];
    const history = safeContext
        .map((item) => `- ${(item.senderName || item.senderUsername || 'User')}: ${item.content || ''}`)
        .join('\n');

    const systemInstruction =
        'Você é o bot corporativo Lanly. Responda em português-BR, de forma direta, útil e segura. ' +
        'Evite inventar dados. Se faltar contexto, faça uma sugestão objetiva.';

    const prompt =
        `Histórico recente da conversa:\n${history || '(sem histórico)'}\n\n` +
        `Mensagem atual com menção ao bot:\n${message}\n\n` +
        'Responda como @lanly em até 5 linhas.';

    try {
        const reply = await askOpenRouter(systemInstruction, prompt, apiKey);
        ctx.body = {
            success: true,
            data: {
                reply,
                bot: {
                    id: 'lanly-bot',
                    username: 'lanly',
                    fullName: 'Lanly Bot',
                },
                createdAt: new Date().toISOString(),
            },
        };
    } catch (error) {
        console.error('Bot Reply Error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao gerar resposta do bot' };
    }
});

// Endpoint para Respostas Rápidas (Smart Replies)
router.post('/smart-replies', authMiddleware, async (ctx) => {
    const { contextText } = ctx.request.body;
    if (!contextText) {
        ctx.status = 400; ctx.body = { success: false }; return;
    }
    const authIA = await checkAndDeductAICredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const apiKey = authIA.apiKey;
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
    const authIA = await checkAndDeductAICredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const apiKey = authIA.apiKey;
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

// Endpoint for Magic Text (Productivity feature) — REQUIRES MAX PLAN
router.post('/magic-text', authMiddleware, requirePlan('max'), async (ctx) => {
    const { text, action } = ctx.request.body;
    if (!text) {
        ctx.status = 400; ctx.body = { success: false, message: 'Texto obrigatório' }; return;
    }
    const authIA = await checkAndDeductAICredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const apiKey = authIA.apiKey;
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

// Endpoint para Tradução em Tempo Real (Babel)
router.post('/translate-message', authMiddleware, async (ctx) => {
    const { text, targetLanguage = 'pt' } = ctx.request.body;
    if (!text) {
        ctx.status = 400; ctx.body = { success: false, message: 'Texto obrigatório' }; return;
    }
    const authIA = await checkAndDeductAICredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const apiKey = authIA.apiKey;
    if (!apiKey) {
        ctx.status = 500; ctx.body = { success: false, message: 'API Key não configurada.' }; return;
    }

    const systemInstruction = `Você é um tradutor instantâneo super rápido e eficaz. Extraia o texto, entenda a gíria se houver, e TRADUZA tudo para o idioma: ${targetLanguage}. Responda APENAS E ESTRITAMENTE com o texto traduzido. Nada além disso.`;
    const prompt = `Traduza a seguinte mensagem:\n"${text}"`;

    try {
        const aiResponse = await askOpenRouter(systemInstruction, prompt, apiKey);
        ctx.body = { success: true, translation: aiResponse };
    } catch (error) {
        console.error('Translation Error:', error);
        ctx.status = 500; ctx.body = { success: false, message: 'Erro ao traduzir.' };
    }
});

// Endpoint para Transcrição Magnética de Áudios (Whisper via Groq) — REQUIRES MAX PLAN
router.post('/transcribe-audio', authMiddleware, requirePlan('max'), async (ctx) => {
    const { fileId } = ctx.request.body;
    if (!fileId) {
        ctx.status = 400; ctx.body = { success: false, message: 'ID do arquivo obrigatório' }; return;
    }

    // Verificar chave Groq do usuário e deduzir crédito
    const authIA = await checkAndDeductAIAudioCredits(ctx.state.user.id);
    if (!authIA.allowed) {
        ctx.status = 403; ctx.body = { success: false, message: authIA.error }; return;
    }
    const groqKey = authIA.apiKey;
    if (!groqKey) {
        ctx.status = 500; ctx.body = { success: false, message: 'Chave GROQ_API_KEY não configurada. Traga sua própria chave em Ajustes.' }; return;
    }

    try {
        const result = await db.write(
            'SELECT file_data, mime_type, original_name FROM file_uploads WHERE id = $1',
            [fileId]
        );

        if (result.rows.length === 0) {
            ctx.status = 404; ctx.body = { success: false, message: 'Áudio não encontrado no banco' }; return;
        }

        const fileRow = result.rows[0];
        const audioBuffer = Buffer.from(fileRow.file_data, 'base64');
        const filename = fileRow.original_name || 'audio.webm';

        // Em Node.js modernos blob e File globais existem
        const mime = fileRow.mime_type || 'audio/webm';
        // É essencial usar instancia da classe "File" para que o Nodejs (undici fetch) envie corretamente como um arquivo (e não como string Base64)
        const fileObj = new File([audioBuffer], filename, { type: mime });
        const formData = new FormData();
        formData.append('file', fileObj);
        // Se a chave fornecida começar com gsk_, é Groq, senão é OpenAI Fallback
        const isGroq = groqKey.startsWith('gsk_') || process.env.GROQ_API_KEY;
        formData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
        formData.append('response_format', 'json');

        const apiUrl = isGroq
            ? 'https://api.groq.com/openai/v1/audio/transcriptions'
            : 'https://api.openai.com/v1/audio/transcriptions';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq/Whisper API: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const fullTranscript = data.text;

        // Se o aúdio form muito grande, usamos a OpenRouter para resumir "📋 Resumo do áudio: ..."
        let summaryText;
        if (fullTranscript.length > 50) {
            const authIA = await checkAndDeductAICredits(ctx.state.user.id);
            const openRouterKey = authIA.allowed ? authIA.apiKey : null;
            if (openRouterKey) {
                const sys = 'Você é um assistente cirúrgico focado em resumos.';
                const prmpt = `Faça um resumo de no máximo 2 linhas do texto abaixo. Foque apenas no que importa. NÃO adicione saudações, não invente exemplos. Se não conseguir entender o texto, retorne o próprio texto.\n\nTexto a resumir:\n"${fullTranscript}"\n\nResumo direto:`;
                try {
                    const r = await askOpenRouter(sys, prmpt, openRouterKey);
                    if (r && !r.includes('Texto a resumir')) {
                        summaryText = `📋 Resumo do áudio: ${r}`;
                    }
                } catch (e) { }
            }
        }

        if (!summaryText) {
            summaryText = `📋 Transcrição: ${fullTranscript}`;
        }

        ctx.body = {
            success: true,
            transcript: fullTranscript,
            summary: summaryText
        };

    } catch (error) {
        console.error('Transcription Error:', error);
        ctx.status = 500; ctx.body = { success: false, message: 'Erro na IA de Transcrição: ' + error.message };
    }
});

export default router;
