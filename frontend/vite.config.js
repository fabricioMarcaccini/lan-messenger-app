import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            registerType: 'autoUpdate',
            manifest: {
                name: 'Lanly',
                short_name: 'Lanly',
                description: 'Enterprise Lanly Web App',
                theme_color: '#0f2023',
                background_color: '#ffffff',
                icons: [
                    {
                        src: '/lanly-logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    }
                ]
            }
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
