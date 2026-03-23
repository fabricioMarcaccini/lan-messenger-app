import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/stores/auth'

export const useSubscriptionStore = defineStore('subscription', () => {
    // ─── State ────────────────────────────────────────────────────────────────
    const currentPlan = ref('free')
    const subscriptionStatus = ref('inactive')
    const maxSeats = ref(5)
    const activeUsers = ref(0)
    const hasSubscription = ref(false)
    const loading = ref(false)
    const checkoutLoading = ref(false)
    const error = ref(null)

    // ─── Plans Definition ─────────────────────────────────────────────────────
    const plans = ref([
        {
            id: 'starter',
            name: 'Starter',
            price: 6.99,
            currency: 'BRL',
            period: '/usuário/mês',
            description: 'Ideal para equipes pequenas que buscam eficiência.',
            badge: null,
            icon: 'rocket_launch',
            color: 'from-blue-500 to-cyan-500',
            borderColor: 'border-blue-500/30',
            features: [
                { text: 'Chat em tempo real ilimitado', included: true },
                { text: 'Compartilhamento de arquivos (50MB)', included: true },
                { text: 'Histórico de 30 dias', included: true },
                { text: 'Chamadas de voz e vídeo', included: true },
                { text: 'Suporte por e-mail', included: true },
                { text: 'Varinha Mágica (IA)', included: false },
                { text: 'Transcrição de áudio (IA)', included: false },
                { text: 'Tradução em tempo real', included: false },
            ],
        },
        {
            id: 'medium',
            name: 'Medium',
            price: 11.99,
            currency: 'BRL',
            period: '/usuário/mês',
            description: 'Para empresas em crescimento com necessidades avançadas.',
            badge: 'Popular',
            icon: 'trending_up',
            color: 'from-violet-500 to-purple-600',
            borderColor: 'border-violet-500/30',
            features: [
                { text: 'Tudo do Starter', included: true },
                { text: 'Histórico ilimitado', included: true },
                { text: 'Armazenamento 100GB', included: true },
                { text: 'Tradução em tempo real', included: true },
                { text: 'Suporte prioritário', included: true },
                { text: 'Varinha Mágica (IA)', included: false },
                { text: 'Transcrição de áudio (IA)', included: false },
            ],
        },
        {
            id: 'max',
            name: 'Max',
            price: 14.99,
            currency: 'BRL',
            period: '/usuário/mês',
            description: 'Poder total com Inteligência Artificial integrada.',
            badge: '✨ IA',
            icon: 'auto_awesome',
            color: 'from-amber-500 to-orange-600',
            borderColor: 'border-amber-500/30',
            features: [
                { text: 'Tudo do Medium', included: true },
                { text: 'Varinha Mágica (IA)', included: true },
                { text: 'Transcrição de áudio (IA)', included: true },
                { text: 'Resumo inteligente de chats', included: true },
                { text: 'Extração de tarefas com IA', included: true },
                { text: 'Armazenamento ilimitado', included: true },
                { text: 'Suporte VIP 24/7', included: true },
            ],
        },
    ])

    // ─── Computed ──────────────────────────────────────────────────────────────
    const currentPlanData = computed(() => {
        return plans.value.find(p => p.id === currentPlan.value) || null
    })

    const seatsRemaining = computed(() => {
        return Math.max(0, maxSeats.value - activeUsers.value)
    })

    const isActive = computed(() => {
        return subscriptionStatus.value === 'active'
    })

    const canUseAI = computed(() => {
        return currentPlan.value === 'max' && isActive.value
    })

    // ─── Actions ──────────────────────────────────────────────────────────────

    async function fetchSubscriptionStatus() {
        loading.value = true
        error.value = null
        try {
            const response = await api.get('/stripe/subscription-status')
            const data = response.data.data
            currentPlan.value = data.planId || 'free'
            subscriptionStatus.value = data.subscriptionStatus || 'inactive'
            maxSeats.value = data.maxSeats || 5
            activeUsers.value = data.activeUsers || 0
            hasSubscription.value = data.hasSubscription || false
        } catch (err) {
            // If company has no billing columns yet, treat as free
            if (err.response?.status === 404 || err.response?.status === 400) {
                currentPlan.value = 'free'
                subscriptionStatus.value = 'inactive'
            } else {
                error.value = err.response?.data?.message || 'Erro ao buscar assinatura'
            }
        } finally {
            loading.value = false
        }
    }

    async function createCheckout(planId, seats) {
        checkoutLoading.value = true
        error.value = null
        try {
            const affiliateRef = localStorage.getItem('affiliate_ref') || ''
            const returnPath = window.location.pathname
            const response = await api.post('/stripe/create-checkout-session', {
                planId,
                seats,
                ref: affiliateRef,
                returnPath
            })

            if (response.data.success && response.data.url) {
                // Redirect to Stripe Checkout
                window.location.href = response.data.url
            } else {
                error.value = response.data.message || 'Erro ao criar checkout'
            }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao criar sessão de pagamento'
        } finally {
            checkoutLoading.value = false
        }
    }

    async function openPortal() {
        loading.value = true
        error.value = null
        try {
            const returnPath = window.location.pathname
            const response = await api.post('/stripe/create-portal-session', { returnPath })
            if (response.data.success && response.data.url) {
                window.location.href = response.data.url
            }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao abrir portal'
        } finally {
            loading.value = false
        }
    }

    return {
        // State
        currentPlan,
        subscriptionStatus,
        maxSeats,
        activeUsers,
        hasSubscription,
        loading,
        checkoutLoading,
        error,
        plans,
        // Computed
        currentPlanData,
        seatsRemaining,
        isActive,
        canUseAI,
        // Actions
        fetchSubscriptionStatus,
        createCheckout,
        openPortal,
    }
})
