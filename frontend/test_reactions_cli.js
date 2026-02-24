import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Teste CLI: Call Log, Group Call Banner e Notificações   ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let token = null;
    let userId = null;
    let conversationId = null;

    // ====== SETUP: Login ou Register ======
    try {
        console.log('[SETUP] Tentando login com admin/password123...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin', password: 'password123'
        });
        token = loginRes.data.data.token;
        userId = loginRes.data.data.user.id;
        console.log('✅ Login OK.');
    } catch {
        console.log('⚠️ Login falhou. Criando nova conta...');
        const ts = Date.now();
        try {
            const regRes = await axios.post(`${API_URL}/auth/register`, {
                companyName: `TestCo ${ts}`, fullName: 'Teste CLI',
                username: `tester_${ts}`, email: `t${ts}@test.com`, password: 'password123!'
            });
            token = regRes.data.data.token;
            userId = regRes.data.data.user.id;
            console.log('✅ Conta criada OK.');
        } catch (e) {
            console.error('❌ FATAL: Não foi possível autenticar:', e.response?.data || e.message);
            process.exit(1);
        }
    }

    const auth = { headers: { Authorization: `Bearer ${token}` } };

    // ====== SETUP: Buscar ou criar uma conversa ======
    try {
        console.log('\n[SETUP] Buscando conversas...');
        const convRes = await axios.get(`${API_URL}/messages/conversations`, auth);
        const convs = convRes.data.data || [];
        if (convs.length > 0) {
            conversationId = convs[0].id;
            console.log(`✅ Conversa encontrada: ${conversationId}`);
        } else {
            console.log('Nenhuma conversa. Criando auto-conversa...');
            const createRes = await axios.post(`${API_URL}/messages/conversations`, {
                participantIds: [userId], isGroup: true, name: 'Test Channel CLI', isPublic: true
            }, auth);
            conversationId = createRes.data.data.id;
            console.log(`✅ Canal criado: ${conversationId}`);
        }
    } catch (e) {
        console.error('❌ FATAL: Erro ao buscar/criar conversa:', e.response?.data || e.message);
        process.exit(1);
    }

    let passed = 0;
    let failed = 0;

    // ====== TESTE 1: Salvar Call Log (BUG: content_type 'call' violava constraint) ======
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('TESTE 1: Registro de Chamada (Call Log)');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const callRes = await axios.post(`${API_URL}/messages/conversations/${conversationId}/call-log`, {
            callType: 'audio',
            duration: 125,
            status: 'completed',
            isGroup: false
        }, auth);

        if (callRes.data.success && callRes.data.data.contentType === 'call') {
            console.log('✅ Call Log salvo com sucesso!');
            console.log('   ID:', callRes.data.data.id);
            console.log('   ContentType:', callRes.data.data.contentType);
            const parsedContent = JSON.parse(callRes.data.data.content);
            console.log('   Dados:', JSON.stringify(parsedContent));
            passed++;
        } else {
            console.error('❌ Call Log retornou resposta inesperada:', callRes.data);
            failed++;
        }
    } catch (e) {
        console.error('❌ Call Log FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TESTE 1b: Video Call Log ======
    try {
        console.log('\n   → Testando Video Call Log...');
        const vCallRes = await axios.post(`${API_URL}/messages/conversations/${conversationId}/call-log`, {
            callType: 'video', duration: 60, status: 'completed', isGroup: true
        }, auth);
        if (vCallRes.data.success) {
            console.log('   ✅ Video Call Log (grupo) OK!');
            passed++;
        } else {
            console.error('   ❌ Video Call Log falhou:', vCallRes.data);
            failed++;
        }
    } catch (e) {
        console.error('   ❌ Video Call Log FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TESTE 1c: Missed Call Log ======
    try {
        console.log('   → Testando Missed Call Log...');
        const mCallRes = await axios.post(`${API_URL}/messages/conversations/${conversationId}/call-log`, {
            callType: 'audio', duration: 0, status: 'missed', isGroup: false
        }, auth);
        if (mCallRes.data.success) {
            console.log('   ✅ Missed Call Log OK!');
            passed++;
        } else {
            console.error('   ❌ Missed Call Log falhou:', mCallRes.data);
            failed++;
        }
    } catch (e) {
        console.error('   ❌ Missed Call Log FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TESTE 2: Enviar mensagem com menção @username (para conferir highlight) ======
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('TESTE 2: Enviar mensagem com @menção');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const msgRes = await axios.post(`${API_URL}/messages/conversations/${conversationId}`, {
            content: 'Olá @admin, a reunião será às 15h! Confirma @tester?',
            contentType: 'text'
        }, auth);
        if (msgRes.data.success) {
            console.log('✅ Mensagem com menção enviada OK!');
            console.log('   Conteúdo:', msgRes.data.data.content);
            passed++;
        } else {
            console.error('❌ Mensagem falhou:', msgRes.data);
            failed++;
        }
    } catch (e) {
        console.error('❌ Mensagem FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TESTE 3: Verificar se mensagens retornam com tipo 'call' ======
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('TESTE 3: Verificar mensagens call log no GET');
    console.log('───────────────────────────────────────────────────────────');
    try {
        const msgsRes = await axios.get(`${API_URL}/messages/conversations/${conversationId}/messages`, auth);
        const messages = msgsRes.data.data || [];
        const callMessages = messages.filter(m => m.contentType === 'call');
        if (callMessages.length > 0) {
            console.log(`✅ Encontradas ${callMessages.length} mensagens de chamada no histórico!`);
            callMessages.forEach(cm => {
                const data = JSON.parse(cm.content);
                console.log(`   → ${data.callType} | ${data.status} | ${data.duration}s | grupo: ${data.isGroup}`);
            });
            passed++;
        } else {
            console.error('❌ Nenhuma mensagem de chamada encontrada no histórico.');
            failed++;
        }
    } catch (e) {
        console.error('❌ GET mensagens FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TESTE 4: Reação (para confirmar que não quebrou) ======
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('TESTE 4: Toggle Reação (sanidade)');
    console.log('───────────────────────────────────────────────────────────');
    try {
        // Send a fresh message to react on
        const freshMsg = await axios.post(`${API_URL}/messages/conversations/${conversationId}`, {
            content: 'Mensagem para reagir 🧪', contentType: 'text'
        }, auth);
        const msgId = freshMsg.data.data.id;

        const reactRes = await axios.post(`${API_URL}/messages/${msgId}/react`, { emoji: '🔥' }, auth);
        if (reactRes.data.success && reactRes.data.data['🔥']) {
            console.log('✅ Reação 🔥 adicionada:', JSON.stringify(reactRes.data.data));
            passed++;
        } else {
            console.error('❌ Reação falhou:', reactRes.data);
            failed++;
        }

        // Toggle off
        const unreactRes = await axios.post(`${API_URL}/messages/${msgId}/react`, { emoji: '🔥' }, auth);
        if (unreactRes.data.success && (!unreactRes.data.data['🔥'] || unreactRes.data.data['🔥'].length === 0)) {
            console.log('✅ Reação 🔥 removida (toggle off) OK!');
            passed++;
        } else {
            console.error('❌ Toggle off falhou:', unreactRes.data);
            failed++;
        }
    } catch (e) {
        console.error('❌ Reação FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== RESULTADO FINAL ======
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  RESULTADO: ${passed} passou | ${failed} falhou                        ║`);
    if (failed === 0) {
        console.log('║  🎉 TODOS OS TESTES PASSARAM!                            ║');
    } else {
        console.log('║  ⚠️ ALGUNS TESTES FALHARAM                               ║');
    }
    console.log('╚═══════════════════════════════════════════════════════════╝');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
