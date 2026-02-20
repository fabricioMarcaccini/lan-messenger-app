module.exports = {
    apps: [
        {
            name: 'lan-messenger-api',
            script: 'src/app.js',
            instances: 'max', // or a specific number of instances like 2
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            }
        }
    ]
};
