<template>
  <div class="min-h-screen bg-gray-50 dark:bg-background-dark transition-colors duration-300 p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ locale.t.analytics.title }}</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400">{{ locale.t.analytics.subtitle }}</p>
        </div>
        <router-link to="/admin/users" class="px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-700 dark:text-slate-200 hover:border-primary/40 transition-colors">
          {{ locale.t.analytics.backToAdmin }}
        </router-link>
      </header>

      <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.messages }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ overview.totalMessages }}</p>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.activeToday }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ overview.activeUsersToday }}</p>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.usersLabel }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ overview.totalUsers }}</p>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.conversations }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ overview.totalConversations }}</p>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.calls }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ overview.totalCalls }}</p>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <p class="text-[11px] uppercase tracking-wide text-gray-400">{{ locale.t.analytics.peakUsage }}</p>
          <p class="text-2xl font-black text-gray-900 dark:text-white">{{ peakHourLabel }}</p>
        </article>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <article class="xl:col-span-2 p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">{{ locale.t.analytics.messagesPerDay }}</h2>
          <canvas ref="messagesChartEl" height="130"></canvas>
        </article>
        <article class="p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">{{ locale.t.analytics.topUsers }}</h2>
          <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
            <div v-for="(user, idx) in topUsers" :key="user.id" class="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-black/20">
              <span class="text-xs font-bold text-gray-400 w-4">{{ idx + 1 }}</span>
              <div class="size-8 rounded-full bg-cover bg-center" :style="{ backgroundImage: `url(${user.avatar_url || defaultAvatar})` }"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{{ user.full_name || user.username }}</p>
                <p class="text-[11px] text-gray-400">@{{ user.username }}</p>
              </div>
              <span class="text-xs font-bold text-primary">{{ user.message_count }}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="mt-4 p-4 rounded-2xl bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">{{ locale.t.analytics.peakByHour }}</h2>
        <canvas ref="peakHoursChartEl" height="100"></canvas>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Chart } from 'chart.js/auto'
import { api } from '@/stores/auth'
import { useLocaleStore } from '@/stores/locale'

const locale = useLocaleStore()
const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'
const overview = ref({
  totalMessages: 0,
  activeUsersToday: 0,
  totalUsers: 0,
  totalConversations: 0,
  totalCalls: 0,
  peakHour: null,
})
const topUsers = ref([])

const messagesChartEl = ref(null)
const peakHoursChartEl = ref(null)
let messagesChart = null
let peakHoursChart = null

const peakHourLabel = computed(() => {
  if (!overview.value.peakHour) return '--'
  const hour = String(overview.value.peakHour.hour).padStart(2, '0')
  return `${hour}h`
})

async function loadAnalytics() {
  const [overviewRes, msgRes, topRes, peakRes] = await Promise.all([
    api.get('/analytics/overview'),
    api.get('/analytics/messages-over-time'),
    api.get('/analytics/top-users'),
    api.get('/analytics/peak-hours'),
  ])

  overview.value = overviewRes.data.data || overview.value
  topUsers.value = topRes.data.data || []

  const messagesSeries = msgRes.data.data || []
  const peakSeries = peakRes.data.data || []

  drawMessagesChart(messagesSeries)
  drawPeakHoursChart(peakSeries)
}

function drawMessagesChart(series) {
  if (!messagesChartEl.value) return
  if (messagesChart) messagesChart.destroy()

  const dateLocale = locale.currentLang === 'pt' ? 'pt-BR' : locale.currentLang === 'es' ? 'es-ES' : 'en-US'

  messagesChart = new Chart(messagesChartEl.value, {
    type: 'line',
    data: {
      labels: series.map((d) => new Date(d.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' })),
      datasets: [{
        label: locale.t.analytics.messages,
        data: series.map((d) => Number(d.count)),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.15)',
        fill: true,
        tension: 0.35,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  })
}

function drawPeakHoursChart(series) {
  if (!peakHoursChartEl.value) return
  if (peakHoursChart) peakHoursChart.destroy()

  peakHoursChart = new Chart(peakHoursChartEl.value, {
    type: 'bar',
    data: {
      labels: series.map((h) => `${String(h.hour).padStart(2, '0')}:00`),
      datasets: [{
        label: locale.t.analytics.messages,
        data: series.map((h) => Number(h.count)),
        backgroundColor: '#6366f1',
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  })
}

onMounted(async () => {
  try {
    await loadAnalytics()
  } catch (error) {
    console.error('Failed to load analytics:', error)
  }
})

onUnmounted(() => {
  if (messagesChart) messagesChart.destroy()
  if (peakHoursChart) peakHoursChart.destroy()
})
</script>
