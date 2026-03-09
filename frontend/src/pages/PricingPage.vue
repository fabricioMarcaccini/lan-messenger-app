<template>
  <div class="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Background effects -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] bg-secondary/10 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 4s;"></div>
    </div>

    <div class="relative z-10 w-full max-w-5xl">
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="relative">
            <div class="absolute -inset-2 bg-primary/30 rounded-full blur-xl opacity-40"></div>
            <div class="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-[#13181b] border border-gray-200 dark:border-white/10 shadow-lg">
              <img src="/lanly-logo.png" alt="Lanly Logo" class="h-8 w-8 object-contain" />
            </div>
          </div>
        </div>
        <h1 class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-3">{{ locale.t.pricing.title }}</h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          {{ locale.t.pricing.subtitle }}
        </p>

        <!-- Trial expired badge -->
        <div v-if="isTrialExpired" class="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-red-50 dark:bg-red-400/10 rounded-full border border-red-200 dark:border-red-400/20">
          <span class="material-symbols-outlined text-red-500 text-sm">timer_off</span>
          <span class="text-sm font-medium text-red-600 dark:text-red-400">{{ locale.t.pricing.trialExpired }}</span>
        </div>
      </div>

      <!-- Seats Selector -->
      <div class="max-w-md mx-auto mb-8 p-4 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
        <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 text-center">{{ locale.t.pricing.seatsLabel }}</label>
        <div class="flex items-center justify-center gap-4">
          <button @click="selectedSeats = Math.max(1, selectedSeats - 1)"
            class="size-10 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-white">
            <span class="material-symbols-outlined">remove</span>
          </button>
          <input v-model.number="selectedSeats" type="number" min="1" max="500"
            class="w-20 text-center text-3xl font-black bg-transparent border-b-2 border-primary text-gray-900 dark:text-white focus:outline-none" />
          <button @click="selectedSeats = Math.min(500, selectedSeats + 1)"
            class="size-10 rounded-xl bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-white">
            <span class="material-symbols-outlined">add</span>
          </button>
          <span class="text-sm text-gray-500 dark:text-slate-400">{{ locale.t.pricing.users }}</span>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="plan in localizedPlans" :key="plan.id"
          class="relative flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl group bg-white dark:bg-glass-surface"
          :class="plan.badge ? `${plan.borderColor} shadow-lg ring-2 ring-primary/10` : 'border-gray-200 dark:border-white/10 hover:border-primary/30'">
          
          <!-- Badge -->
          <div v-if="plan.badge" class="absolute -top-3 left-1/2 -translate-x-1/2">
            <span class="px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-lg"
              :class="plan.id === 'medium' ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'">
              {{ plan.badge }}
            </span>
          </div>

          <!-- Plan Icon & Name -->
          <div class="flex items-center gap-3 mb-4 mt-1">
            <div class="size-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md" :class="plan.color">
              <span class="material-symbols-outlined text-2xl" style="font-variation-settings: 'FILL' 1;">{{ plan.icon }}</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ plan.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-slate-400">{{ plan.description }}</p>
            </div>
          </div>

          <!-- Price -->
          <div class="mb-5">
            <div class="flex items-baseline gap-1">
              <span class="text-sm text-gray-500 dark:text-slate-400">$</span>
              <span class="text-4xl font-black text-gray-900 dark:text-white">{{ plan.price.toFixed(2) }}</span>
              <span class="text-sm text-gray-500 dark:text-slate-400">{{ locale.t.pricing.month }}</span>
            </div>
            <p v-if="selectedSeats > 1" class="text-xs text-primary font-medium mt-1">
              {{ locale.t.pricing.total }}: ${{ (plan.price * selectedSeats).toFixed(2) }}{{ locale.t.pricing.month }} ({{ selectedSeats }} {{ locale.t.pricing.users }})
            </p>
          </div>

          <!-- Features -->
          <ul class="flex-1 space-y-2.5 mb-6">
            <li v-for="(feat, fi) in plan.features" :key="fi" class="flex items-center gap-2 text-sm">
              <span class="material-symbols-outlined text-base" :class="feat.included ? 'text-green-500' : 'text-gray-300 dark:text-white/20'">
                {{ feat.included ? 'check_circle' : 'cancel' }}
              </span>
              <span :class="feat.included ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-white/30 line-through'">{{ feat.text }}</span>
            </li>
          </ul>

          <!-- Action Button -->
          <button @click="handleCheckout(plan.id)"
            :disabled="subStore.checkoutLoading"
            class="w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            :class="`bg-gradient-to-r ${plan.color} hover:opacity-90`">
            <span v-if="subStore.checkoutLoading" class="material-symbols-outlined animate-spin text-base">progress_activity</span>
            <span class="material-symbols-outlined text-base" v-else>credit_card</span>
            {{ locale.t.pricing.subscribe }} {{ plan.name }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="subStore.error" class="mt-6 max-w-md mx-auto text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20 flex items-center gap-2">
        <span class="material-symbols-outlined text-base">error</span>
        {{ subStore.error }}
      </div>

      <!-- Footer Actions -->
      <div class="mt-8 flex flex-col items-center gap-4">
        <!-- Skip to Dashboard (Trial Active) -->
        <button v-if="subStore.currentPlan === 'trial' && !isTrialExpired" @click="router.push('/')" class="text-sm font-bold text-gray-900 dark:text-white hover:text-primary transition-colors flex items-center gap-2 bg-white dark:bg-white/5 px-6 py-2.5 rounded-full shadow-sm border border-gray-200 dark:border-white/10 hover:shadow-md">
          Continuar Teste Grátis (7 dias)
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </button>

        <button @click="handleLogout" class="text-sm text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center">
          <span class="material-symbols-outlined text-sm align-middle mr-1.5">logout</span>
          {{ locale.t.pricing.logout }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { useLocaleStore } from '@/stores/locale'

const router = useRouter()
const authStore = useAuthStore()
const subStore = useSubscriptionStore()
const locale = useLocaleStore()

const selectedSeats = ref(5)

const isTrialExpired = computed(() => {
  const user = authStore.user
  if (!user?.trialEndsAt) return false
  return new Date(user.trialEndsAt) < new Date()
})

// Build localized plan list using subscription store + locale
const localizedPlans = computed(() => {
  const t = locale.t
  return subStore.plans.map(plan => ({
    ...plan,
    name: t.pricing[`plan${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}`] || plan.name,
    description: t.pricing[`desc${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}`] || plan.description,
    badge: plan.id === 'medium' ? t.pricing.badgeMostPopular : plan.id === 'max' ? t.pricing.badgeBestAI : null,
  }))
})

onMounted(() => {
  subStore.fetchSubscriptionStatus()
})

async function handleCheckout(planId) {
  await subStore.createCheckout(planId, selectedSeats.value)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
