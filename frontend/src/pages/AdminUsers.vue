<template>
  <div class="min-h-screen bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Header -->
    <header class="glass-header sticky top-0 z-50 flex items-center justify-between whitespace-nowrap px-6 py-4 lg:px-10 bg-white dark:bg-transparent border-b border-gray-200 dark:border-white/10">
      <div class="flex items-center gap-8">
        <router-link to="/" class="flex items-center gap-3 text-gray-900 dark:text-white">
          <div class="size-8 flex items-center justify-center text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]">
            <span class="material-symbols-outlined text-3xl">hub</span>
          </div>
          <h2 class="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-tight">LAN <span class="text-primary">Messenger</span></h2>
        </router-link>
        
        <nav class="hidden md:flex items-center gap-6">
          <router-link to="/" class="text-gray-500 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium">Dashboard</router-link>
          <a class="text-gray-900 dark:text-white text-sm font-medium" href="#">{{ locale.t.admin?.title || 'Users' }}</a>
          <router-link to="/settings" class="text-gray-500 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium">{{ locale.t.nav.settings }}</router-link>
        </nav>
      </div>
      
      <div class="flex items-center gap-4">
        <button 
          @click="handleLogout"
          class="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm"
        >
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span class="hidden sm:inline">{{ locale.t.auth?.logout || 'Sign Out' }}</span>
        </button>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex-1 flex justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div class="w-full max-w-[1280px] flex flex-col gap-8">
        <!-- Breadcrumbs & Heading -->
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mb-1">
              <router-link to="/" class="hover:text-primary transition-colors">Dashboard</router-link>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              <span class="text-primary font-medium">{{ locale.t.admin?.title || 'User Management' }}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">{{ locale.t.admin?.title || 'User Management' }}</h1>
            <p class="text-gray-500 dark:text-slate-400">{{ locale.t.admin?.subtitle || 'Manage access, roles, and permissions for enterprise users.' }}</p>
          </div>
          
          <button 
            @click="showCreateModal = true"
            class="group relative flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/50 text-primary hover:text-white hover:border-primary rounded-lg px-5 py-2.5 transition-all duration-300 shadow-sm hover:shadow-lg"
          >
            <span class="material-symbols-outlined text-[20px]">add</span>
            <span class="font-bold text-sm tracking-wide">{{ locale.t.admin?.addNewUser || 'Add New User' }}</span>
          </button>
        </div>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div class="bg-white dark:bg-glass-surface p-5 rounded-xl border border-gray-200 dark:border-white/10 border-l-4 border-l-primary/50 hover:border-l-primary hover:shadow-lg transition-all duration-300 group">
            <div class="flex justify-between items-start mb-4">
              <div class="p-2 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined">group</span>
              </div>
            </div>
            <p class="text-gray-500 dark:text-slate-400 text-sm font-medium">{{ locale.t.admin?.totalUsers || 'Total Users' }}</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ usersStore.stats.totalUsers }}</h3>
          </div>
          
          <div class="bg-white dark:bg-glass-surface p-5 rounded-xl border border-gray-200 dark:border-white/10 border-l-4 border-l-emerald-400/50 hover:border-l-emerald-400 hover:shadow-lg transition-all duration-300 group">
            <div class="flex justify-between items-start mb-4">
              <div class="p-2 bg-emerald-400/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined">wifi</span>
              </div>
            </div>
            <p class="text-gray-500 dark:text-slate-400 text-sm font-medium">{{ locale.t.admin?.activeNow || 'Active Now' }}</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ usersStore.stats.activeUsers }}</h3>
          </div>
          
          <div class="bg-white dark:bg-glass-surface p-5 rounded-xl border border-gray-200 dark:border-white/10 border-l-4 border-l-purple-400/50 hover:border-l-purple-400 hover:shadow-lg transition-all duration-300 group">
            <div class="flex justify-between items-start mb-4">
              <div class="p-2 bg-purple-400/10 rounded-lg text-purple-500 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined">chat</span>
              </div>
            </div>
            <p class="text-gray-500 dark:text-slate-400 text-sm font-medium">{{ locale.t.admin?.messagesToday || 'Messages Today' }}</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ formatNumber(usersStore.stats.messagesToday) }}</h3>
          </div>
          
          <div class="bg-white dark:bg-glass-surface p-5 rounded-xl border border-gray-200 dark:border-white/10 border-l-4 border-l-amber-400/50 hover:border-l-amber-400 hover:shadow-lg transition-all duration-300 group">
            <div class="flex justify-between items-start mb-4">
              <div class="p-2 bg-amber-400/10 rounded-lg text-amber-500 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined">devices</span>
              </div>
            </div>
            <p class="text-gray-500 dark:text-slate-400 text-sm font-medium">{{ locale.t.admin?.networkDevices || 'Network Devices' }}</p>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ usersStore.stats.networkDevices }}</h3>
          </div>
        </div>
        
        <!-- Password Reset Requests Alert -->
        <div v-if="passwordResetRequests.length > 0" class="bg-amber-50 dark:bg-amber-400/10 border border-amber-200 dark:border-amber-400/30 rounded-xl p-5 animate-pulse-slow">
          <div class="flex items-start gap-4">
            <div class="p-2 bg-amber-100 dark:bg-amber-400/20 rounded-lg shrink-0">
              <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">lock_reset</span>
            </div>
            <div class="flex-1">
              <h3 class="font-bold text-amber-800 dark:text-amber-300 mb-1">Solicitações de Reset de Senha</h3>
              <p class="text-amber-700 dark:text-amber-400/80 text-sm mb-4">{{ passwordResetRequests.length }} usuário(s) solicitaram reset de senha.</p>
              
              <div class="space-y-2">
                <div v-for="request in passwordResetRequests" :key="request.userId" 
                  class="flex items-center justify-between bg-white dark:bg-black/30 rounded-lg p-3 border border-amber-200 dark:border-amber-400/20 shadow-sm"
                >
                  <div class="flex items-center gap-3">
                    <div class="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold">
                      {{ (request.fullName || request.username).charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-medium text-gray-900 dark:text-white">{{ request.fullName || request.username }}</div>
                      <div class="text-xs text-gray-500 dark:text-slate-400">{{ request.email }} • Solicitado {{ formatResetDate(request.requestedAt) }}</div>
                    </div>
                  </div>
                  <button 
                    @click="openResetPasswordModal(request)"
                    class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-sm shadow-md"
                  >
                    <span class="material-symbols-outlined text-lg">key</span>
                    Resetar Senha
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-[#152326]/50 p-2 rounded-lg border border-gray-200 dark:border-transparent">
          <div class="relative w-full sm:w-96">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="material-symbols-outlined text-gray-400 dark:text-slate-500">search</span>
            </div>
            <input 
              v-model="searchQuery"
              @input="handleSearch"
              class="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-white/10 rounded-lg leading-5 bg-gray-50 dark:bg-[#1a2c30] text-gray-900 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-all shadow-sm" 
              :placeholder="locale.t.admin?.searchUsers || 'Search users by name, email or role...'"
            />
          </div>
        </div>
        
        <!-- Data Table -->
        <div class="bg-white dark:bg-glass-surface rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                  <th class="px-6 py-5">{{ locale.t.admin?.user || 'User' }}</th>
                  <th class="px-6 py-5">{{ locale.t.admin?.role || 'Role' }}</th>
                  <th class="px-6 py-5">{{ locale.t.admin?.status || 'Status' }}</th>
                  <th class="px-6 py-5">{{ locale.t.admin?.lastActive || 'Last Active' }}</th>
                  <th class="px-6 py-5 text-right">{{ locale.t.admin?.actions || 'Actions' }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                <tr 
                  v-for="user in usersStore.users" 
                  :key="user.id"
                  class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-4">
                      <div class="relative">
                        <div 
                          class="size-10 rounded-full bg-cover bg-center border border-gray-200 dark:border-white/10"
                          :style="{ backgroundImage: `url(${user.avatarUrl || defaultAvatar})` }"
                        ></div>
                        <div :class="[
                          'absolute bottom-0 right-0 size-3 border-2 border-white dark:border-[#152326] rounded-full',
                          user.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-400 dark:bg-slate-500'
                        ]"></div>
                      </div>
                      <div>
                        <div class="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">{{ user.fullName }}</div>
                        <div class="text-xs text-gray-500 dark:text-slate-500">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getRoleBadgeClass(user.role)">{{ user.role }}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                      <span :class="user.isActive ? 'status-online animate-pulse' : 'status-offline'"></span>
                      <span class="text-gray-700 dark:text-slate-300">{{ user.isActive ? (locale.t.admin?.active || 'Active') : (locale.t.admin?.inactive || 'Inactive') }}</span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-slate-400">
                    {{ formatDate(user.lastSeenAt) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        @click="openEditModal(user)"
                        class="p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-gray-500 dark:text-slate-400" 
                        :title="locale.t.admin?.editUser || 'Edit User'"
                      >
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        @click="handleDelete(user.id)"
                        class="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors text-gray-500 dark:text-slate-400" 
                        :title="'Delete User'"
                      >
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
            <div class="text-xs text-gray-500 dark:text-slate-400">
              {{ locale.t.admin?.showing || 'Showing' }} <span class="text-gray-900 dark:text-white font-medium">1</span> {{ locale.t.admin?.to || 'to' }} <span class="text-gray-900 dark:text-white font-medium">{{ usersStore.users.length }}</span> {{ locale.t.admin?.of || 'of' }} <span class="text-gray-900 dark:text-white font-medium">{{ usersStore.pagination.total }}</span> {{ locale.t.admin?.users || 'users' }}
            </div>
            <div class="flex gap-2">
              <button 
                @click="usersStore.fetchUsers(usersStore.pagination.page - 1)"
                :disabled="usersStore.pagination.page <= 1"
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <button class="w-7 h-7 flex items-center justify-center rounded bg-primary/20 text-primary text-xs font-medium border border-primary/30">
                {{ usersStore.pagination.page }}
              </button>
              <button 
                @click="usersStore.fetchUsers(usersStore.pagination.page + 1)"
                :disabled="usersStore.pagination.page * usersStore.pagination.limit >= usersStore.pagination.total"
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
              >
                <span class="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Create User Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white dark:bg-[#131c1e] w-full max-w-md rounded-2xl p-8 relative border border-gray-200 dark:border-white/10 shadow-xl">
        <button @click="showCreateModal = false" class="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          <span class="material-symbols-outlined">close</span>
        </button>
        
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ locale.t.admin?.addNewUser || 'Add New User' }}</h2>
        
        <form @submit.prevent="handleCreateUser" class="flex flex-col gap-4">
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.username || 'Username' }}</label>
            <input v-model="newUser.username" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" required />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.email || 'Email' }}</label>
            <input v-model="newUser.email" type="email" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" required />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.fullName || 'Full Name' }}</label>
            <input v-model="newUser.fullName" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.password || 'Password' }}</label>
            <input v-model="newUser.password" type="password" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.department || 'Department' }}</label>
              <input v-model="newUser.department" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.role || 'Role' }}</label>
              <select v-model="newUser.role" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20">
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          
          <button type="submit" class="btn-primary mt-4" :disabled="loadingCreate">
            {{ loadingCreate ? (locale.t.admin?.creating || 'Creating...') : (locale.t.admin?.createUser || 'Create User') }}
          </button>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white dark:bg-[#131c1e] w-full max-w-md rounded-2xl p-8 relative border border-gray-200 dark:border-white/10 shadow-xl">
        <button @click="showEditModal = false" class="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          <span class="material-symbols-outlined">close</span>
        </button>
        
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ locale.t.admin?.editUser || 'Edit User' }}</h2>
        
        <form @submit.prevent="handleUpdateUser" class="flex flex-col gap-4">
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.username || 'Username' }}</label>
            <input v-model="editUser.username" type="text" disabled class="input-glass mt-1 bg-gray-100 dark:bg-black/40 text-gray-500 dark:text-slate-500 cursor-not-allowed border-gray-200 dark:border-white/10" />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.email || 'Email' }}</label>
            <input v-model="editUser.email" type="email" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" required />
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.fullName || 'Full Name' }}</label>
            <input v-model="editUser.fullName" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.department || 'Department' }}</label>
              <input v-model="editUser.department" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">{{ locale.t.admin?.position || 'Position' }}</label>
              <input v-model="editUser.position" type="text" class="input-glass mt-1 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" />
            </div>
          </div>
          
          <button type="submit" class="btn-primary mt-4" :disabled="loadingEdit">
            {{ loadingEdit ? (locale.t.admin?.saving || 'Saving...') : (locale.t.admin?.saveChanges || 'Save Changes') }}
          </button>
        </form>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="showResetModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white dark:bg-[#131c1e] w-full max-w-md rounded-2xl p-8 relative border border-gray-200 dark:border-white/10 shadow-xl">
        <button @click="showResetModal = false" class="absolute top-4 right-4 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          <span class="material-symbols-outlined">close</span>
        </button>
        
        <div class="flex items-center gap-3 mb-6">
          <div class="p-3 bg-amber-100 dark:bg-amber-400/20 rounded-xl">
            <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">lock_reset</span>
          </div>
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">Resetar Senha</h2>
            <p class="text-sm text-gray-500 dark:text-slate-400">{{ resetUser.fullName || resetUser.username }}</p>
          </div>
        </div>
        
        <form @submit.prevent="handleResetPassword" class="flex flex-col gap-4">
          <div>
            <label class="text-xs font-medium text-gray-500 dark:text-white/60 uppercase tracking-wider">Nova Senha</label>
            <div class="relative mt-1">
              <input 
                v-model="resetNewPassword"
                :type="showResetPassword ? 'text' : 'password'" 
                class="input-glass pr-12 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-200 dark:border-white/20" 
                placeholder="Digite a nova senha..."
                required 
              />
              <button 
                type="button"
                @click="showResetPassword = !showResetPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <span class="material-symbols-outlined text-[20px]">{{ showResetPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <div v-if="resetError" class="text-red-500 text-sm bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20">
            {{ resetError }}
          </div>
          
          <div v-if="resetSuccess" class="text-green-600 text-sm bg-green-50 dark:bg-green-400/10 py-2 px-4 rounded-lg border border-green-200 dark:border-green-400/20 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">check_circle</span>
            {{ resetSuccess }}
          </div>
          
          <button type="submit" class="btn-primary mt-2" :disabled="loadingReset || !resetNewPassword">
            <span v-if="loadingReset" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
            <span class="material-symbols-outlined" v-else>key</span>
            {{ loadingReset ? 'Resetando...' : 'Confirmar Reset' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, api } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useLocaleStore } from '@/stores/locale'
import { useSocketStore } from '@/stores/socket'

const router = useRouter()
const authStore = useAuthStore()
const usersStore = useUsersStore()
const locale = useLocaleStore()
const socketStore = useSocketStore()

const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'
const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const loadingCreate = ref(false)
const loadingEdit = ref(false)

// Password Reset
const passwordResetRequests = ref([])
const showResetModal = ref(false)
const resetUser = reactive({ userId: '', username: '', fullName: '', email: '' })
const resetNewPassword = ref('')
const showResetPassword = ref(false)
const loadingReset = ref(false)
const resetError = ref('')
const resetSuccess = ref('')

const newUser = reactive({
  username: '',
  email: '',
  fullName: '',
  password: '',
  role: 'user',
  department: ''
})

const editUser = reactive({
  id: '',
  username: '',
  email: '',
  fullName: '',
  department: '',
  position: ''
})

function getRoleBadgeClass(role) {
  const classes = {
    admin: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-400/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-400/20',
    moderator: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-400/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-400/20',
    user: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-400/10 text-gray-700 dark:text-slate-400 border border-gray-200 dark:border-slate-400/20'
  }
  return classes[role] || classes.user
}

function formatDate(dateStr) {
  if (!dateStr) return locale.t.admin?.never || 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return locale.t.admin?.justNow || 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} ${locale.t.admin?.minsAgo || 'mins ago'}`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${locale.t.admin?.hoursAgo || 'hours ago'}`
  return `${Math.floor(diff / 86400000)} ${locale.t.admin?.daysAgo || 'days ago'}`
}

function formatResetDate(dateStr) {
  if (!dateStr) return 'agora'
  return formatDate(dateStr)
}

function formatNumber(num) {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
  return num
}

function handleSearch() {
  usersStore.fetchUsers(1, searchQuery.value)
}

function openEditModal(user) {
  editUser.id = user.id
  editUser.username = user.username
  editUser.email = user.email
  editUser.fullName = user.fullName
  editUser.department = user.department || ''
  editUser.position = user.position || ''
  showEditModal.value = true
}

function openResetPasswordModal(request) {
  resetUser.userId = request.userId
  resetUser.username = request.username
  resetUser.fullName = request.fullName
  resetUser.email = request.email
  resetNewPassword.value = ''
  resetError.value = ''
  resetSuccess.value = ''
  showResetModal.value = true
}

async function handleCreateUser() {
  loadingCreate.value = true
  const result = await usersStore.createUser(newUser)
  if (result.success) {
    showCreateModal.value = false
    Object.assign(newUser, { username: '', email: '', fullName: '', password: '', role: 'user', department: '' })
  }
  loadingCreate.value = false
}

async function handleUpdateUser() {
  loadingEdit.value = true
  try {
    const result = await usersStore.updateUser(editUser.id, {
      email: editUser.email,
      fullName: editUser.fullName,
      department: editUser.department,
      position: editUser.position
    })
    if (result.success) {
      showEditModal.value = false
    } else {
      alert(result.message || 'Erro ao atualizar usuário')
    }
  } catch (error) {
    console.error('Update error:', error)
    alert('Erro ao atualizar usuário')
  } finally {
    loadingEdit.value = false
  }
}

async function handleResetPassword() {
  if (!resetNewPassword.value || resetNewPassword.value.length < 6) {
    resetError.value = 'A senha deve ter pelo menos 6 caracteres'
    return
  }
  
  loadingReset.value = true
  resetError.value = ''
  resetSuccess.value = ''
  
  try {
    const response = await api.put('/auth/admin-reset-password', {
      userId: resetUser.userId,
      newPassword: resetNewPassword.value
    })
    
    if (response.data.success) {
      resetSuccess.value = 'Senha resetada com sucesso!'
      // Remove from local list
      passwordResetRequests.value = passwordResetRequests.value.filter(r => r.userId !== resetUser.userId)
      // Close modal after a moment
      setTimeout(() => {
        showResetModal.value = false
      }, 1500)
    } else {
      resetError.value = response.data.message || 'Erro ao resetar senha'
    }
  } catch (err) {
    resetError.value = err.response?.data?.message || 'Erro ao resetar senha'
  } finally {
    loadingReset.value = false
  }
}

async function handleDelete(userId) {
  if (confirm(locale.t.admin?.confirmDelete || 'Are you sure you want to deactivate this user?')) {
    await usersStore.deleteUser(userId)
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Handle password reset requests from socket
function handlePasswordResetRequest(event) {
  const request = event.detail
  if (request && request.userId) {
    // Add to list if not already present
    if (!passwordResetRequests.value.find(r => r.userId === request.userId)) {
      passwordResetRequests.value.unshift(request)
    }
  }
}

onMounted(async () => {
  await usersStore.fetchUsers()
  await usersStore.fetchStats(authStore.user?.companyId)
  
  console.log('👤 Current user role:', authStore.user?.role)
  
  // Fetch existing password reset requests
  try {
    console.log('🔍 Fetching password reset requests...')
    const response = await api.get('/auth/password-reset-requests')
    console.log('📋 Password reset response:', response.data)
    if (response.data.success && response.data.data) {
      passwordResetRequests.value = response.data.data
      console.log('✅ Loaded', response.data.data.length, 'password reset requests')
    }
  } catch (err) {
    console.log('❌ Error fetching password reset requests:', err.response?.data || err.message)
  }
  
  // Listen for password reset requests via socket
  const socket = socketStore.socket
  if (socket) {
    socket.on('admin:password-reset-request', (request) => {
      console.log('📬 Password reset request received:', request)
      if (request && request.userId) {
        if (!passwordResetRequests.value.find(r => r.userId === request.userId)) {
          passwordResetRequests.value.unshift(request)
        }
      }
    })
  }
})

onUnmounted(() => {
  const socket = socketStore.socket
  if (socket) {
    socket.off('admin:password-reset-request')
  }
})
</script>

<style scoped>
.status-online {
  @apply size-2 rounded-full bg-emerald-500;
}

.status-offline {
  @apply size-2 rounded-full bg-gray-400 dark:bg-slate-500;
}

.input-glass {
  @apply w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all;
}

.btn-primary {
  @apply bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4);
  }
  50% {
    opacity: 0.95;
    box-shadow: 0 0 0 4px rgba(251, 191, 36, 0);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s ease-in-out infinite;
}
</style>

