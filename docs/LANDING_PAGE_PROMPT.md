# 🚀 PROMPT — LANDING PAGE DE ALTA CONVERSÃO: LAN MESSENGER ENTERPRISE

## CONTEXTO COMPLETO DO PRODUTO

**Nome do produto:** LAN Messenger Enterprise  
**URL do app:** https://lan-messenger-web-br.vercel.app  
**Proposta de valor:** Plataforma de comunicação corporativa completa — substitui Slack, Teams e WhatsApp Business em uma única solução com IA integrada, chamadas de vídeo e monitoramento de rede.  
**Preços:** Starter $6.99/usuário/mês | Medium $11.99 | Max (IA) $14.99 | Trial grátis 7 dias  
**Público-alvo:** PMEs (5–200 funcionários), TI corporativa, gestores de equipe, donos de empresa  
**Idioma da LP:** Português do Brasil (pt-BR)  

---

## FUNCIONALIDADES REAIS DO PRODUTO (baseadas no código-fonte)

### 💬 Chat em tempo real
- Mensagens instantâneas via WebSocket (Socket.IO)
- Agrupamento visual de mensagens consecutivas
- Separadores de data automáticos (Hoje, Ontem, dia da semana)
- Indicadores de digitação em tempo real
- Status de presença (Online / Ausente / Ocupado / Offline)
- Reações com emoji em mensagens
- Responder específicas mensagens (reply com contexto visual)
- Editar e excluir mensagens enviadas
- Mensagens temporárias (auto-destruct)
- Botão flutuante de "Novas Mensagens"

### 📎 Compartilhamento de arquivos
- Upload de imagens, vídeos, documentos  
- Mensagens de áudio gravadas diretamente no chat  
- Preview de imagem inline  
- Download de arquivos com nome original  
- Armazenamento: 50GB (Starter), 100GB (Medium), Ilimitado (Max)

### 📹 Chamadas de voz e vídeo (WebRTC P2P)
- Chamadas 1:1 de voz e vídeo sem intermediários
- Chamadas em grupo (grid responsivo)
- Controles: mute, câmera on/off, encerrar
- Log de chamadas no histórico do chat (duração, horário)
- Chamada diretamente do chat com 1 clique

### 🤖 Inteligência Artificial (Plano Max)
- **Varinha Mágica:** reescreve texto com tom profissional, corrige gramática, traduz para inglês, resume
- **Transcrição de áudio:** converte mensagens de voz em texto via Whisper AI (Groq)
- **Smart Replies:** 3 sugestões de resposta inteligente baseadas no contexto
- **Resumo de chat:** resume grupos longos e conversas em tópicos
- **Extração de tarefas:** identifica e lista tarefas prometidas no chat (action items)

### 🌐 Tradução em tempo real (Plano Medium+)
- Traduz qualquer mensagem com 1 clique para o idioma do usuário
- Suporte: Português, Inglês, Espanhol, e outros
- Bandeira do idioma detectado visível na mensagem

### 📡 Network Discovery (Diferencial único)
- Scan automático de dispositivos na rede local
- Mapa de topologia com todos IPs, MACs e latências
- Identificação de fabricante (Apple, Cisco, HP, Samsung, Dell…)
- Ping on-demand de qualquer dispositivo
- Vincular dispositivos a usuários da empresa
- Exportar relatório CSV
- Filtros por status (online/offline) e tipo (roteador, servidor, impressora, celular, câmera…)
- Visualização em grid ou tabela

### 👥 Painel Admin
- Gerenciamento completo de usuários (criar, editar, desativar, filtrar)
- Controle de papéis (admin, moderador, usuário)
- Barra de progresso de uso de licenças
- Reset de senha por e-mail
- Estatísticas: total de usuários, ativos, mensagens hoje, dispositivos
- Upsell modal automático ao atingir limite de seats

### 🔐 Segurança & Gestão
- Autenticação JWT com refresh token automático
- Proteção de rotas por papel (admin/user)
- Isolamento por empresa (multi-tenant)
- Criptografia nas comunicações
- Dados nunca saem da infraestrutura da empresa

### 🌍 Internacionalização
- Interface em Português (BR), Inglês e Espanhol
- Auto-detecção de idioma

### 🎨 UX/UI
- Dark mode e Light mode
- Glassmorphism + efeitos neon no dark
- Responsivo (desktop, tablet, mobile)
- PWA (instalável como app)
- Animações suaves, micro-interações premium

### 💳 Planos e Monetização
- Trial grátis 7 dias (sem cartão)
- Starter: $6.99/usuário/mês — Chat completo, arquivos 50GB, voz/vídeo
- Medium: $11.99/usuário/mês — Tudo do Starter + histórico ilimitado, 100GB, tradução IA
- Max: $14.99/usuário/mês — Tudo + IA completa (varinha, transcrição, resumos, extração de tarefas), suporte VIP 24/7
- Checkout via Stripe com cupons e código de afiliado
- Portal de self-service (cancelar, mudar plano, baixar faturas)
- Upgrade instantâneo de licenças sem sair da plataforma

---

## ESPECIFICAÇÕES TÉCNICAS DA LANDING PAGE

### 🎯 Objetivo principal
Captar leads e converter visitantes em trials gratuitos (7 dias) com CTA "Criar conta grátis". Foco em SEO orgânico no Google Brasil para termos de communication interna corporativa.

### 🛠️ Stack obrigatória
- **HTML5 semântico puro** (um único arquivo index.html autocontido)
- **CSS3 puro** (inline ou `<style>` — sem frameworks externos)  
- **JavaScript Vanilla** (sem frameworks — máximo performance)
- **Zero dependências externas** exceto: Uma fonte do Google Fonts (Inter ou Plus Jakarta Sans) e ícones SVG inline
- **Hospedagem:** GitHub Pages, Netlify ou Vercel (gratuito)

### 📊 Metas de performance (Core Web Vitals)
- **LCP ≤ 1.5s** (Largest Contentful Paint)
- **CLS = 0** (Cumulative Layout Shift)
- **FID / INP ≤ 50ms**
- **PageSpeed Insights: ≥ 98/100** mobile e desktop
- **Lighthouse: 100/100** em Performance, Acessibilidade, SEO
- Imagens: somente SVG inline ou CSS gradients (zero imagens pesadas)
- CSS crítico inline no `<head>`, resto diferido
- Sem render-blocking resources

### 🔍 SEO On-Page obrigatório
- **Title tag:** `LAN Messenger Enterprise — Chat Corporativo com IA | Teste Grátis 7 Dias`
- **Meta description:** `Substitua Slack e Teams por R$6,99/usuário. Chat, vídeo, IA e monitoramento de rede em uma plataforma. Experimente grátis por 7 dias.`
- **H1 único:** focado na proposta de valor principal
- **H2-H6:** hierarquia semântica completa
- **Open Graph tags** (og:image, og:url, og:title, og:description)
- **Twitter Card tags**
- **Schema.org JSON-LD:** `SoftwareApplication` com `applicationCategory`, `offers`, `aggregateRating`
- **Canonical URL**
- **sitemap.xml** e **robots.txt** inline no HTML como comentário
- **Alt text** em todas as imagens/ícones
- **Breadcrumb Schema**
- **FAQ Schema** com 5 perguntas reais

### 🎨 Design (Visual)
- Paleta principal: `#00d4ff` (cyan primário) com dark `#0e1a1e` e gradientes profundos
- Efeito glassmorphism em cards
- Gradientes dramáticos de fundo (não estáticos)
- Micro-animações CSS puras (sem JavaScript para animações)
- Particles/grid animado no hero (CSS apenas)
- Modo: Dark by default, profissional e tecnológico
- Tipografia: Plus Jakarta Sans — bold nos headlines, regular no corpo

---

## ESTRUTURA DA LANDING PAGE (SEÇÕES OBRIGATÓRIAS — na ordem exata)

### 1. `<header>` — Navbar Sticky
- Logo (SVG inline do hub icon + "LAN Messenger") + badge "Enterprise"
- Links: Funcionalidades | Preços | Segurança | FAQ
- CTA botão: "Testar Grátis →" (destaque máximo, animado)
- Responsivo: hamburger menu mobile

### 2. `<section id="hero">` — Hero Principal (above the fold)
- Supertítulo pequeno: "🔒 Comunicação corporativa segura e inteligente"
- **H1 principal:** `O chat da sua empresa com IA integrada por R$6,99/usuário`
- Subtítulo: `Chat em tempo real, chamadas de vídeo, tradução automática e IA que resume conversas e extrai suas tarefas — tudo em uma plataforma.`
- 2 CTAs: `[🚀 Criar conta grátis — 7 dias]` (primário) e `[▶ Ver demonstração]` (secundário)
- Trust badges abaixo: "✓ Sem cartão de crédito" | "✓ Setup em 2 minutos" | "✓ Cancele quando quiser"
- Mockup animado (CSS puro): janela de chat estilizada, dark mode, com mensagens aparecendo sequencialmente via CSS animation
- Social proof: "Usado por +200 empresas brasileiras"

### 3. `<section id="stats">` — Números de Impacto
- Cards numerados animados (counter animation CSS):
  - **47%** redução no tempo de resposta interno
  - **3.2x** mais produtividade com IA
  - **100%** das mensagens criptografadas
  - **99.9%** de uptime garantido
  - **2min** setup completo do zero

### 4. `<section id="features">` — Funcionalidades em Tabs ou Grid
- Tab 1: 💬 **Chat Inteligente** — agrupamento visual, reações, edição, temporários, dark mode nativo
- Tab 2: 🤖 **IA Integrada** — varinha mágica, transcrição de voz, smart replies, resumo de chat, extração de tarefas
- Tab 3: 📹 **Chamadas HD** — WebRTC P2P, vídeo em grupo, voz cristalina, log de chamadas
- Tab 4: 📡 **Mapa de Rede** — scan automático, mapa de topologia, identificação de dispositivos, exportar CSV
- Tab 5: 👥 **Painel Admin** — controle de usuários, papéis, licenças, estatísticas em tempo real
- Cada tab: ícone SVG + título + 4 bullets + mockup estilizado (CSS)

### 5. `<section id="ai">` — Destaque da IA (Diferencial máximo)
- Título chamativo: `A IA que trabalha enquanto você conversa`
- 4 cards com animação hover:
  1. 🪄 Varinha Mágica — "Escreva informalmente, a IA profissionaliza"
  2. 🎙️ Transcrição — "Áudios viram texto automaticamente com Whisper AI"
  3. 💡 Smart Replies — "3 sugestões de resposta inteligentes a 1 clique"
  4. 📋 Resumo de Chat — "Chegou tarde? Peça o resumo do que foi combinado"
- Sub-headline: "Disponível no plano Max. IA sobre sua comunicação, não sobre seus dados."

### 6. `<section id="network">` — Diferencial Único: Monitoramento de Rede
- Título: `Além do chat: veja tudo que está na sua rede`
- Destaque do Network Discovery como diferencial competitivo que Slack e Teams não têm
- 3 bullets: Mapa de dispositivos em tempo real | Ping e latência | Vinculação usuário-dispositivo
- Visual: representação de topologia animada em CSS (nodes conectados)

### 7. `<section id="compare">` — Comparação com Concorrentes
- Tabela comparativa (mobile scroll horizontal):

| Funcionalidade | LAN Messenger | Slack | Microsoft Teams |
|---|---|---|---|
| Chat tempo real | ✅ | ✅ | ✅ |
| IA integrada nativa | ✅ | 🟡 Pago extra | 🟡 Copilot +$30 |
| Transcrição de áudio IA | ✅ | ❌ | 🟡 Pago |
| Monitoramento de rede | ✅ | ❌ | ❌ |
| Preço por usuário | R$6,99 | R$38+ | R$52+ |
| Trial sem cartão | ✅ | ❌ | ❌ |
| Self-hosted option | ✅ | ❌ | ❌ |

### 8. `<section id="pricing">` — Preços
- Toggle anual/mensal com desconto (anual = 2 meses grátis)
- 3 cards de planos (Starter, Medium, Max):
  - **Starter $6.99/usuário/mês** — bullets reais das features
  - **Medium $11.99** — badge "Mais Popular" — bullets completos
  - **Max $14.99** — badge "✨ Com IA" — destaque visual
- Calculator inline: "Para X usuários = R$XX/mês total"
- Sub-copy: "Experimente grátis 7 dias. Sem cartão. Cancele quando quiser."
- Link: "Precisa de um plano personalizado? [Fale conosco]"

### 9. `<section id="security">` — Segurança
- Título: `Seus dados ficam com você`
- 3 colunas: 🔒 Criptografia ponta-a-ponta | 🏢 Isolamento por empresa | 🛡️ Autenticação JWT
- Copy: "Ao contrário de ferramentas SaaS genéricas, o LAN Messenger foi construído para privacidade corporativa."

### 10. `<section id="testimonials">` — Prova Social
- 3 depoimentos fictícios mas realistas com:
  - Avatar (iniciais em círculo colorido)
  - Nome, cargo, empresa (PME brasileira)
  - Estrelas rating (5★)
  - Citação específica sobre o produto

### 11. `<section id="faq">` — FAQ (Schema structured data)
- 5 perguntas com accordion:
  1. Preciso de cartão de crédito para o trial?
  2. O que acontece quando o trial acaba?
  3. Posso ter quantos usuários quiser?
  4. A IA tem acesso ao conteúdo das minhas mensagens?
  5. Posso hospedar o LAN Messenger no meu próprio servidor?

### 12. `<section id="cta-final">` — CTA Final (Urgência)
- Título: `Sua equipe já perdeu tempo suficiente em ferramentas caras e complicadas`
- Subtítulo: `Setup em 2 minutos. 7 dias grátis. Sem burocracia.`
- Botão grande: `🚀 Começar agora — É grátis`
- Link para: `https://lan-messenger-web-br.vercel.app/register`

### 13. `<footer>`
- Logo + tagline
- Links: Funcionalidades | Preços | Segurança | FAQ | Contato
- Copyright 2025 LAN Messenger Enterprise
- "Feito no Brasil 🇧🇷"

---

## REGRAS DE CONVERSÃO (OBRIGATÓRIAS)

1. **CTA primário:** sempre "Criar conta grátis" apontando para `https://lan-messenger-web-br.vercel.app/register`
2. **Urgência sutil:** badge "Trial grátis encerra em breve para novos cadastros" no hero
3. **Ancoragem de preço:** sempre mostrar comparação com Slack/Teams antes do preço próprio
4. **Exit-intent:** popup leve ao tentar sair (CSS :hover no `<html>` border top)
5. **Sticky CTA mobile:** botão flutuante fixo no bottom em mobile
6. **Scroll-triggered animations:** elementos aparecem com `@keyframes fadeInUp` ao entrar na viewport (IntersectionObserver JS leve)
7. **Contador animado:** números nas stats com counter animation ao scroll
8. **Copys em benefício** (não feature): ao invés de "tem IA", use "economize 2h/dia com IA"

---

## PALAVRAS-CHAVE ALVO (SEO)

- Primárias: `chat corporativo`, `mensageiro empresarial`, `comunicação interna empresa`
- Secundárias: `alternativa slack gratuito brasil`, `chat com ia para empresas`, `substituir whatsapp no trabalho`
- Long-tail: `melhor app de chat para pequenas empresas`, `plataforma de comunicação corporativa com inteligência artificial`
- Locais: adicionar "para empresas brasileiras" em subtítulos estratégicos

---

## SCHEMA.ORG — JSON-LD OBRIGATÓRIO

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "LAN Messenger Enterprise",
  "description": "Plataforma de comunicação corporativa com chat, vídeo, IA e monitoramento de rede.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, PWA",
  "url": "https://lan-messenger-web-br.vercel.app",
  "offers": {
    "@type": "Offer",
    "price": "6.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "87"
  },
  "featureList": [
    "Chat em tempo real",
    "Chamadas de vídeo WebRTC",
    "IA integrada",
    "Transcrição de áudio",
    "Monitoramento de rede",
    "Painel administrativo"
  ]
}
```

---

## PERFORMANCE — CHECKLIST TÉCNICO

```
✅ Fonte carregada com font-display: swap e preconnect
✅ CSS crítico inline (above-the-fold)
✅ Imagens: apenas SVG inline (zero JPG/PNG)
✅ Sem JavaScript de terceiros (zero GTM, zero analytics externos)
✅ Lazy loading em seções abaixo do fold (IntersectionObserver)
✅ preload do hero font
✅ meta viewport correto
✅ rel="noopener noreferrer" em links externos
✅ aria-label em todos os botões
✅ lang="pt-BR" no HTML
✅ Favicon SVG inline (base64)
✅ manifest.json inline (PWA)
✅ Cache headers via <meta http-equiv>
✅ Sem iframes no critical path
✅ Contraste de cor WCAG AA mínimo
✅ Focus states visíveis (keyboard navigation)
✅ Reduced motion @media query
```

---

## ENTREGA FINAL ESPERADA

**Um único arquivo `index.html`** completamente autocontido com:
- Todo HTML semântico e estruturado nas 13 seções acima
- CSS completo no `<style>` (dark mode por default, responsivo, animado)
- JavaScript mínimo no `<script>` (apenas: counter animation, tabs, accordion FAQ, IntersectionObserver, sticky CTA mobile, exit popup)
- Todos os Schema.org JSON-LD corretos
- Todas as meta tags de SEO
- Open Graph e Twitter Card
- Zero dependências externas exceto Google Fonts (1 font)
- Pronto para deploy em GitHub Pages, Netlify ou Vercel (free tier)
- Lighthouse ≥ 98 em todos os critérios

**O resultado deve ser visualmente impressionante, extremamente focado em conversão, com copys persuasivos em português do Brasil, e tecnicamente otimizado para rankear no Google.**
