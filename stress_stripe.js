import http from 'http';
import https from 'https';

const BASE_URL = 'https://lan-messenger-backend.onrender.com';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function hitWebhook(payload, signature) {
    return new Promise((resolve) => {
        const req = https.request(`${BASE_URL}/api/stripe/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': signature || 't=1711234567,v1=fake_signature',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        
        req.on('error', (e) => resolve({ status: 500, body: e.message }));
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('🚀 INICIANDO BATERIA DE TESTES DE ESTRESSE DE PAGAMENTO (NUVEM)');
    console.log('Alvo:', BASE_URL);
    console.log('----------------------------------------------------');

    // 1. Tentar Crashar o Stream do Webhook (Buscando o antigo Erro 500)
    console.log('🧪 TESTE 1: Disparo de Carga Massiva Corrompida no Webhook (Sem Assinatura Válida)');
    const fakePayload = JSON.stringify({ id: "evt_fake123", type: "invoice.paid", data: { object: { customer: "cus_123" } } });
    
    // Dispara 5 vezes super rápido para stressar o body parser
    const promises = [];
    for(let i=0; i<5; i++) {
        promises.push(hitWebhook(fakePayload));
    }
    
    const results = await Promise.all(promises);
    
    const all400s = results.every(r => r.status === 400);
    const no500s = results.every(r => r.status !== 500);

    if (all400s && no500s) {
        console.log('✅ SUCESSO! O servidor barrou perfeitamente. NENHUM erro 500 de stream. O Koa-Body não consumiu nossa rota.');
        console.log(`   (Detalhe da Resposta Barrada: Status ${results[0].status} - ${results[0].body})`);
    } else {
        console.log('❌ FALHA! Recebemos respostas inesperadas:', results.map(r => r.status));
    }

    console.log('\n🧪 TESTE 2: Simulação de Ataque / Rate-Limit no Checkout Session (Sem estar logado)');
    const reqs = Array.from({length: 10}).map(() => {
        return fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: 'starter', seats: 10, ref: 'ataque' })
        }).then(r => r.status);
    });

    const statusCodes = await Promise.all(reqs);
    console.log('✅ Respostas das 10 tentativas simultâneas:', statusCodes);
    console.log('   (Esperado proteger a API com 401 Sem Autorização (JWT) em vez de criar 10 clientes)');

    console.log('----------------------------------------------------');
    console.log('🏁 TESTES CONCLUÍDOS.');
    console.log('Acesse a Stripe, vá em Eventos -> "Reenviar" em algum evento falhado e veja a maravilha do Status 200!');
}

runTests();
