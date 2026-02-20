import http from 'http';

function post(path, data, token = null) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const options = {
            hostname: '127.0.0.1',
            port: 3000,
            path: '/api' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length,
            }
        };

        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                try {
                    // Check if response is empty
                    if (!responseBody.trim()) {
                        resolve({ status: res.statusCode, data: {} });
                        return;
                    }
                    resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
                } catch (e) {
                    console.error('Failed to parse:', responseBody);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(body);
        req.end();
    });
}

// Test flow: Login -> Create User
async function test() {
    try {
        console.log('1️⃣ Logging in as admin...');
        const loginRes = await post('/auth/login', { username: 'admin', password: 'admin123' });

        if (!loginRes.data.success) {
            console.error('❌ Login failed:', loginRes.data);
            console.log('   Status Code:', loginRes.status);
            return;
        }
        console.log('✅ Login success. Token received.');
        const token = loginRes.data.data.accessToken;

        console.log('2️⃣ Creating new user as admin...');
        const createRes = await post('/users', {
            username: 'created_by_admin_' + Date.now(),
            email: `admin_${Date.now()}@lan.local`,
            password: 'password123',
            fullName: 'Admin Created User',
            role: 'user'
        }, token);

        console.log('RESPONSE:', JSON.stringify(createRes, null, 2));

        if (createRes.data.success) {
            console.log('✅ User created successfully via Admin API!');
        } else {
            console.error('❌ Failed to create user:', createRes.data.message);
        }

        console.log('3️⃣ Registering via public endpoint...');
        const publicRes = await post('/auth/register', {
            username: 'public_user_' + Date.now(),
            email: `public_${Date.now()}@lan.local`,
            password: 'password123',
            fullName: 'Public User'
        });

        console.log('PUBLIC REGISTER RESPONSE:', JSON.stringify(publicRes, null, 2));

        if (publicRes.data.success) {
            console.log('✅ User created successfully via Public Register!');
        } else {
            console.error('❌ Failed to create public user:', publicRes.data.message);
        }

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

test();
