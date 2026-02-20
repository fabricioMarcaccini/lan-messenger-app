# LAN Messenger 🚀

Um sistema de mensagens corporativo moderno para redes locais, construído com Vue.js 3 e Node.js.

## 🎯 Visão Geral

O LAN Messenger é uma aplicação de chat empresarial projetada para comunicação segura em redes locais (LAN). Oferece funcionalidades de mensagens em tempo real, descoberta de dispositivos na rede e gerenciamento de usuários.

## 🛠️ Stack Tecnológica

### Frontend
- **Vue.js 3** - Framework JavaScript progressivo
- **Vite** - Build tool rápido
- **Tailwind CSS** - Framework CSS utility-first
- **Pinia** - Gerenciamento de estado
- **Socket.io-client** - Comunicação em tempo real
- **Vue Router** - Roteamento SPA

### Backend
- **Node.js 22** - Runtime JavaScript
- **Koa.js** - Framework web minimalista
- **Socket.IO** - WebSockets para tempo real
- **JWT** - Autenticação via tokens

### Databases
- **PostgreSQL** - Banco de dados principal (write)
- **MySQL** - Réplica de leitura (read)
- **Redis** - Cache e presença de usuários

### DevOps
- **Docker Compose** - Orquestração de containers

## 📁 Estrutura do Projeto

```
lan/
├── frontend/               # Aplicação Vue.js
│   ├── src/
│   │   ├── pages/          # Componentes de página
│   │   ├── stores/         # Pinia stores
│   │   ├── styles/         # CSS global
│   │   └── router/         # Configuração de rotas
│   └── package.json
├── backend/                # API Node.js
│   ├── src/
│   │   ├── routes/         # Endpoints da API
│   │   ├── socket/         # Handlers Socket.IO
│   │   ├── services/       # Serviços de negócio
│   │   ├── middlewares/    # Middlewares (auth, etc)
│   │   ├── config/         # Configurações (DB, etc)
│   │   └── database/       # Scripts SQL
│   └── package.json
└── docker-compose.yml      # Configuração dos containers
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 22+
- Docker e Docker Compose
- npm ou yarn

### 1. Iniciar os containers de banco de dados
```bash
docker-compose up -d
```

### 2. Configurar variáveis de ambiente
```bash
# No diretório backend, copie o arquivo de exemplo
cp backend/.env.example backend/.env
```

### 3. Instalar dependências e iniciar o backend
```bash
cd backend
npm install
npm run dev
```

### 4. Instalar dependências e iniciar o frontend
```bash
cd frontend
npm install
npm run dev
```

### 5. Acessar a aplicação
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🔐 Credenciais Padrão

| Usuário | Senha | Função |
|---------|-------|--------|
| admin | admin123 | Administrador |

## 📱 Funcionalidades

### ✅ Autenticação
- Login com JWT tokens
- Refresh tokens automático
- Proteção de rotas

### ✅ Chat em Tempo Real
- Mensagens instantâneas via WebSocket
- Indicadores de digitação
- Status de presença (online/offline/away)
- Histórico de conversas

### ✅ Gerenciamento de Usuários (Admin)
- Listagem com busca e paginação
- Criar novos usuários
- Editar informações
- Desativar usuários
- Controle de funções (admin/moderator/user)

### ✅ Descoberta de Rede
- Scan automático da rede local
- Visualização de dispositivos conectados
- Latência e status de cada dispositivo
- Vincular dispositivos a usuários

### ✅ Configurações
- Perfil do usuário
- Alterar tema (claro/escuro)
- Seleção de idioma (PT/EN/ES)

## 🎨 Design

O projeto utiliza um design moderno com:
- **Glassmorphism** - Efeitos de vidro fosco
- **Dark/Light Mode** - Temas adaptáveis
- **Animações suaves** - Transições e micro-interações
- **Responsividade** - Adaptação para diferentes telas
- **Neon effects** - Brilhos sutis no modo escuro

## 📡 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Dados do usuário atual

### Usuários
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário (admin)
- `PUT /api/users/:id` - Atualizar usuário
- `DELETE /api/users/:id` - Desativar usuário (admin)

### Mensagens
- `GET /api/messages/conversations` - Listar conversas
- `POST /api/messages/conversations` - Criar conversa
- `GET /api/messages/conversations/:id` - Mensagens de uma conversa
- `POST /api/messages/conversations/:id` - Enviar mensagem

### Rede
- `GET /api/network/info` - Informações da rede local
- `GET /api/network/scan` - Escanear dispositivos
- `GET /api/network/devices` - Listar dispositivos
- `GET /api/network/stats` - Estatísticas

## 🔌 Eventos Socket.IO

### Cliente → Servidor
- `authenticate` - Autenticar conexão
- `message:send` - Enviar mensagem
- `conversation:join` - Entrar em conversa
- `typing:start/stop` - Indicador de digitação
- `presence:update` - Atualizar status

### Servidor → Cliente
- `authenticated` - Confirmação de auth
- `message:new` - Nova mensagem recebida
- `typing:update` - Status de digitação
- `presence:change` - Mudança de presença

## 🌐 Internacionalização (i18n)

O projeto suporta múltiplos idiomas:
- 🇧🇷 Português (Brasil)
- 🇺🇸 English
- 🇪🇸 Español

Para adicionar novos idiomas, edite o arquivo `frontend/src/stores/locale.js`.

## 📝 Licença

Este projeto é proprietário e destinado ao uso corporativo interno.

---

**Desenvolvido com ❤️ para comunicação empresarial segura**
