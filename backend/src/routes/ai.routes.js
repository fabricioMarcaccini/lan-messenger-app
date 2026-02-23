import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

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

// Endpoint for Magic Text (Productivity feature)
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

// Endpoint para Tradução em Tempo Real (Babel)
router.post('/translate-message', authMiddleware, async (ctx) => {
    const { text, targetLanguage = 'pt' } = ctx.request.body;
    if (!text) {
        ctx.status = 400; ctx.body = { success: false, message: 'Texto obrigatório' }; return;
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
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

// Endpoint para Transcrição Magnética de Áudios (Whisper via Groq)
router.post('/transcribe-audio', authMiddleware, async (ctx) => {
    const { fileId } = ctx.request.body;
    if (!fileId) {
        ctx.status = 400; ctx.body = { success: false, message: 'ID do arquivo obrigatório' }; return;
    }

    // Acessar por Groq (gratuito) ou OpenAI (pago) - Fallback
    const groqKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
    if (!groqKey) {
        ctx.status = 500; ctx.body = { success: false, message: 'Chave GROQ_API_KEY não configurada no .env do backend para transcrição.' }; return;
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
        formData.append('model', process.env.GROQ_API_KEY ? 'whisper-large-v3' : 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('language', 'pt'); // Força PT-BR para evitar sotaque/reconhecimento ruim

        const apiUrl = process.env.GROQ_API_KEY
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
            const openRouterKey = process.env.OPENROUTER_API_KEY;
            if (openRouterKey) {
                const sys = 'Você é um assistente cirúrgico focado em resumos.';
                const prmpt = `Resuma o áudio transcrito abaixo de forma absurdamente direta (máximo uma linha forte). Ex: "Fabrício pediu o relatório até as 18h".\n\nTranscrição:\n"${fullTranscript}"`;
                try {
                    const r = await askOpenRouter(sys, prmpt, openRouterKey);
                    if (r) summaryText = `📋 Resumo do áudio: ${r}`;
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
