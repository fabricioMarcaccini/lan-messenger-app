import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['lanly-logo.png', 'manifest.json'],
            manifest: {
                name: 'Lanly',
                short_name: 'Lanly',
                description: 'Enterprise Lanly Web App',
                theme_color: '#0f2023',
                background_color: '#ffffff',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                icons: [
                    {
                        src: '/lanly-logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/lanly-logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,png,svg,ico,json,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /\/api\/messages\/conversations\/.*$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'lanly-messages-api',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24,
                            },
                        },
                    },
                ],
            },
        })
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            },
            '/socket.io': {
                target: 'http://localhost:3000',
                ws: true
            }
        }
    }
})
