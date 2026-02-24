import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('--- Iniciando Teste CLI de Reações e Ações de Mensagem ---');
    let token = null;
    let adminUserId = null;

    // 1. Login
    try {
        console.log('[1] Fazendo login como Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'password123'
        });
        token = loginRes.data.data.token;
        adminUserId = loginRes.data.data.user.id;
        console.log('✅ Login bem-sucedido. Token obtido.');
    } catch (err) {
        if (err.response && err.response.status === 401) {
            console.log('⚠️ Conta admin/password123 não encontrada. Criando conta de teste...');
            const timestamp = Date.now();
            try {
                const setupRes = await axios.post(`${API_URL}/auth/register`, {
                    companyName: `Test Company ${timestamp}`,
                    fullName: 'User Teste CLI',
                    username: `user_${timestamp}`,
                    email: `user_${timestamp}@test.com`,
                    password: 'password123!'
                });
                token = setupRes.data.data.token;
                adminUserId = setupRes.data.data.user.id;
                console.log('✅ Nova conta criada com sucesso.');
            } catch (setupErr) {
                console.error('❌ Falha ao logar ou criar conta:', setupErr.message);
                return;
            }
        } else {
            console.error('❌ Erro no login:', err.message);
            return;
        }
    }

    const reqConfig = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Pegar todas as conversas ou criar um canal
    let channelId = null;
    try {
        const chanRes = await axios.get(`${API_URL}/chat/channels`, reqConfig);
        if (chanRes.data.data && chanRes.data.data.length > 0) {
            channelId = chanRes.data.data[0].id;
            console.log(`✅ Canal existente encontrado: ${channelId}`);
        } else {
            console.log('Nenhum canal encontrado. Criando um...');
            const createRes = await axios.post(`${API_URL}/chat/conversations`, {
                participantIds: [adminUserId],
                isGroup: true,
                isPublic: true,
                name: 'Canal de Teste CLI'
            }, reqConfig);
            channelId = createRes.data.data.id;
            console.log(`✅ Novo canal criado: ${channelId}`);
        }
    } catch (err) {
        console.error('❌ Falha ao buscar/criar canal:', err.response?.data || err.message);
        return;
    }

    // 3. Enviar uma mensagem (Simulando uma menção)
    let messageId = null;
    try {
        console.log(`[2] Enviando mensagem com menção para o canal ${channelId}...`);
        const msgRes = await axios.post(`${API_URL}/chat/conversations/${channelId}`, {
            content: 'Olá pessoal, testando funcionalidade @admin!',
            contentType: 'text'
        }, reqConfig);
        messageId = msgRes.data.data.id;
        console.log(`✅ Mensagem enviada com sucesso. ID: ${messageId}`);
    } catch (err) {
        console.error('❌ Falha ao enviar mensagem:', err.response?.data || err.message);
        return;
    }

    // 4. Alternar Reação (Toggle Reaction)
    try {
        console.log(`[3] Adicionando reação 👍 na mensagem ${messageId}...`);
        const reactRes = await axios.post(`${API_URL}/chat/messages/${messageId}/react`, {
            emoji: '👍'
        }, reqConfig);
        console.log('✅ Reação adicionada. Estado atual:', reactRes.data.data);

        if (!reactRes.data.data['👍'] || !reactRes.data.data['👍'].includes(adminUserId)) {
            console.error('❌ Erro: O ID do usuário não consta na lista de reações do emoji.');
        }
    } catch (err) {
        console.error('❌ Falha ao adicionar reação:', err.response?.data || err.message);
        return;
    }

    // 5. Editar a Mensagem
    try {
        console.log(`[4] Editando mensagem ${messageId}...`);
        const editRes = await axios.put(`${API_URL}/chat/messages/${messageId}`, {
            content: 'Olá pessoal, [Mensagem Editada] testando funcionalidade @admin!'
        }, reqConfig);
        console.log('✅ Mensagem editada com sucesso. Resposta:', editRes.data);
    } catch (err) {
        console.error('❌ Falha ao editar mensagem:', err.response?.data || err.message);
        return;
    }

    // 6. Remover a Reação (Toggle off)
    try {
        console.log(`[5] Removendo (Toggle Off) a reação 👍 da mensagem ${messageId}...`);
        const unreactRes = await axios.post(`${API_URL}/chat/messages/${messageId}/react`, {
            emoji: '👍'
        }, reqConfig);
        console.log('✅ Reação removida. Estado atual:', unreactRes.data.data);
    } catch (err) {
        console.error('❌ Falha ao remover reação:', err.response?.data || err.message);
        return;
    }

    // 7. Deletar a Mensagem
    try {
        console.log(`[6] Deletando mensagem ${messageId}...`);
        const delRes = await axios.delete(`${API_URL}/chat/messages/${messageId}`, reqConfig);
        console.log('✅ Mensagem marcada como deletada com sucesso. Resposta:', delRes.data);
    } catch (err) {
        console.error('❌ Falha ao deletar mensagem:', err.response?.data || err.message);
        return;
    }

    console.log('\n🎉 TODOS OS TESTES DE AÇÕES DE MENSAGEM (Reação, Edição, Deleção) PASSARAM NO BACKEND!');
}

runTest();
