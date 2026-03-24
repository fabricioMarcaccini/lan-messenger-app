const Koa = require('koa');
const request = require('supertest');

const app = new Koa();

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const status = err.status || err.statusCode || 500;
        const message = status === 500 ? 'Erro interno do servidor' : err.message;
        ctx.status = status;
        ctx.body = { success: false, message, errStack: err.stack };
    }
});

app.use(async (ctx, next) => {
    if (ctx.get('stripe-signature')) {
        ctx.request.body = {};
    }
    await next();
});

app.use(async (ctx) => {
    ctx.body = 'OK';
});

const server = app.listen();

request(server)
    .post('/')
    .set('stripe-signature', 'test-sig')
    .expect(200)
    .then(res => {
        console.log('App OK:', res.text);
        process.exit(0);
    })
    .catch(err => {
        console.error('App Failed:', err.message);
        process.exit(1);
    });
