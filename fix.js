const fs = require('fs');
let content = fs.readFileSync('backend/src/routes/stripe.routes.js', 'utf8');

// Replace create-checkout-session urls
content = content.replace(
    /success_url:\s*`\$\{process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5173'\}\/settings\?checkout=success&plan=\$\{planId\}`,\s*cancel_url:\s*`\$\{process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5173'\}\/settings\?checkout=cancel`,/,
    `success_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/settings';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/settings';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'success');
                u.searchParams.set('plan', planId);
                return u.toString();
            })(),
            cancel_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/settings';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/settings';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'cancel');
                return u.toString();
            })(),`
);

// Replace portal url
content = content.replace(
    /return_url:\s*`\$\{process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5173'\}\/settings`,/,
    `return_url: (() => {
            const reqReturnPath = ctx.request.body.returnPath || '/settings';
            const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '');
            let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
            if (p.startsWith('//')) p = '/settings';
            return new URL(p, fUrl).toString();
        })(),`
);

// Replace upgrade-seats urls
content = content.replace(
    /success_url:\s*`\$\{process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5173'\}\/admin\/users\?checkout=success&seats=\$\{seatsNum\}`,\s*cancel_url:\s*`\$\{process\.env\.FRONTEND_URL\s*\|\|\s*'http:\/\/localhost:5173'\}\/admin\/users\?checkout=cancel`,/,
    `success_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/admin/users';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/admin/users';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'success');
                u.searchParams.set('seats', seatsNum.toString());
                return u.toString();
            })(),
            cancel_url: (() => {
                const reqReturnPath = ctx.request.body.returnPath || '/admin/users';
                const fUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\\/$/, '');
                let p = reqReturnPath.startsWith('/') ? reqReturnPath : '/' + reqReturnPath;
                if (p.startsWith('//')) p = '/admin/users';
                const u = new URL(p, fUrl);
                u.searchParams.set('checkout', 'cancel');
                return u.toString();
            })(),`
);

fs.writeFileSync('backend/src/routes/stripe.routes.js', content, 'utf8');
console.log('Regex replace done!');
