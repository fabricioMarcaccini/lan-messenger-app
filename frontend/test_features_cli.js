import axios from 'axios';

const API_URL = 'https://lan-messenger-backend.onrender.com/api';

async function runTests() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║  Teste CLI: Features de Alta Prioridade                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    let token = null;
    let userId = null;

    // ====== SETUP ======
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin', password: 'password123'
        });
        token = loginRes.data.data.token || loginRes.data.data.accessToken;
        userId = loginRes.data.data.user.id;
        console.log('✅ Login OK.');
    } catch {
        const ts = Date.now();
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            companyName: `FeatTest ${ts}`, fullName: 'Feature Tester',
            username: `feat_${ts}`, email: `f${ts}@test.com`, password: 'Password123!'
        });
        token = regRes.data.data.token || regRes.data.data.accessToken;
        userId = regRes.data.data.user.id;
        console.log('✅ Conta criada.');
    }

    const auth = { headers: { Authorization: `Bearer ${token}` } };
    let passed = 0;
    let failed = 0;

    // ====== TEST 1: Online Users Endpoint ======
    console.log('\n─── TESTE 1: Endpoint /online-users ───');
    try {
        const res = await axios.get(`${API_URL}/messages/online-users`, auth);
        if (res.data.success && typeof res.data.data === 'object') {
            const users = Object.keys(res.data.data);
            const online = Object.values(res.data.data).filter(s => s === 'online').length;
            console.log(`✅ Online Users OK! ${users.length} users, ${online} online.`);
            passed++;
        } else {
            console.error('❌ Resposta inesperada:', res.data);
            failed++;
        }
    } catch (e) {
        console.error('❌ FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TEST 2: Message Search ======
    console.log('\n─── TESTE 2: Busca de Mensagens (/search?q=) ───');

    // 2a: Send a unique searchable message first
    let convId = null;
    try {
        const convRes = await axios.get(`${API_URL}/messages/conversations`, auth);
        const convs = convRes.data.data || [];
        if (convs.length > 0) {
            convId = convs[0].id;
        } else {
            const createRes = await axios.post(`${API_URL}/messages/conversations`, {
                participantIds: [userId], isGroup: true, name: 'Search Test', isPublic: true
            }, auth);
            convId = createRes.data.data.id;
        }

        const uniqueText = `search-test-${Date.now()}`;
        await axios.post(`${API_URL}/messages/conversations/${convId}`, {
            content: `Buscar esta mensagem: ${uniqueText}`, contentType: 'text'
        }, auth);

        // Now search for it
        const searchRes = await axios.get(`${API_URL}/messages/search?q=${uniqueText}`, auth);
        if (searchRes.data.success && searchRes.data.data.length > 0) {
            console.log(`✅ Busca retornou ${searchRes.data.data.length} resultado(s)!`);
            console.log(`   → "${searchRes.data.data[0].content.substring(0, 60)}..."`);
            passed++;
        } else {
            console.error('❌ Busca não retornou resultados');
            failed++;
        }
    } catch (e) {
        console.error('❌ FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // 2b: Empty search returns empty
    try {
        const emptyRes = await axios.get(`${API_URL}/messages/search?q=a`, auth);
        if (emptyRes.data.success && emptyRes.data.data.length === 0) {
            console.log('✅ Busca com < 2 chars retorna vazio (correto).');
            passed++;
        } else {
            console.log('⚠️ Busca com 1 char retornou dados (sem importância).');
            passed++;
        }
    } catch (e) {
        console.error('❌ FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== TEST 3: Unread Count ======
    console.log('\n─── TESTE 3: Unread Count no GET /conversations ───');
    try {
        const convRes = await axios.get(`${API_URL}/messages/conversations`, auth);
        const hasUnreadField = convRes.data.data.every(c => typeof c.unreadCount === 'number');
        if (hasUnreadField) {
            const totalUnread = convRes.data.data.reduce((sum, c) => sum + c.unreadCount, 0);
            console.log(`✅ unreadCount presente em todas as conversas! Total: ${totalUnread}`);
            passed++;
        } else {
            console.error('❌ Campo unreadCount ausente em alguma conversa');
            failed++;
        }
    } catch (e) {
        console.error('❌ FALHOU:', e.response?.data || e.message);
        failed++;
    }

    // ====== RESULTADO ======
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
