/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#00d4ff",
                "primary-dark": "#00a3cc",
                "secondary": "#8B5CF6",
                "accent": "#d946ef",
                "background-dark": "#0f2023",
                "background-darker": "#0A0A0F",
                "surface-dark": "#151a1e",
                "glass-surface": "rgba(15, 32, 35, 0.7)",
                "glass-surface-lighter": "rgba(20, 40, 45, 0.6)",
                "glass-border": "rgba(255, 255, 255, 0.08)",
                "glass-bg": "rgba(15, 32, 35, 0.7)",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "body": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "2xl": "1rem",
                "full": "9999px"
            },
            boxShadow: {
                "neon": "0 0 10px rgba(0, 212, 255, 0.3), 0 0 20px rgba(0, 212, 255, 0.1)",
                "neon-sm": "0 0 5px rgba(0, 212, 255, 0.5)",
                "neon-purple": "0 0 10px rgba(217, 70, 239, 0.3)",
                "glow-red": "0 0 15px rgba(239, 68, 68, 0.2)",
            },
            animation: {
                'pulse-slow': 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
            }
        },
    },
    plugins: [],
}
