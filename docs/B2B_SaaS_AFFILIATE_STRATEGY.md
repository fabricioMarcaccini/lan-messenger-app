# Arquitetura B2B SaaS + Máquina de Afiliados (LAN Messenger)

Esta é a blueprint definitiva (Documento de Design de Sistema) para construir uma solução de pagamentos recorrente nível "Big Tech" (escalável) unida a uma mecânica agressiva de **Info-Produto (Marketing de Afiliados)**. 

---

## 1. A Nova Precificação (Micro-SaaS Agressivo)
A sua nova estratégia abaixa a barreira de entrada e ganha na quantidade absurda de licenças ("Per Seat"). Bater de frente com gigantes exige um modelo Freemium brilhante. Eis a matriz de produtos:

1.  **Plano STARTER (R$ 6,99 / Usuário / Mês):**
    -   *Foco:* Volume. Ideal para MEIs e pequenas clínicas.
    -   *Recursos:* Chat básico, transferência de arquivos simples, sem acesso à Varinha Mágica (IA).
2.  **Plano MEDIUM (R$ 11,99 / Usuário / Mês):**
    -   *Foco:* Aumento de Ticket (Upsell).
    -   *Recursos:* Histórico ilimitado, melhor retenção de mídias, prioridade no painel.
3.  **Plano MAX - IA Freemium (R$ 14,99 / Usuário / Mês):**
    -   *Foco:* O Motor de Vendas (Vaca Leiteira).
    -   *Recursos:* Acesso Total ao Groq (Whisper Áudio -> Texto) e OpenRouter (Tradução). Por R$ 14,99, uma empresa substitui dezenas de horas de RH. É irrecusável.

---

## 2. A Engenharia de Afiliados (O Motor "Info-Produto")
Para fazer o LAN Messenger ser vendido por influenciadores ou afiliados (como na Hotmart/Eduzz, mas via Stripe SaaS):

*   **A Abordagem Stripe + Rewardful / Stripe Partner:**
    Ao gerar o Checkout (Link de Pagamento da Stripe), seu backend Node.js vai injetar um código de referência chamado `client_reference_id` (Ex: `afiliado_joao123`).
*   **A Captura via Link (Frontend):**
    O usuário entra no seu site pelo link: `lanmessenger.com/?ref=joao123`.
    O seu Vue.js salva `joao123` nos Cookies. Quando a empresa vai pro Checkout pagar os 14,99 daquele plano para 10 funcionários, a Stripe registra que aquela venda pertence ao "João" para sempre, pagando comissões recorrentes a ele.

---

## 3. O PROMPT DE ENGENHARIA (Copie e cole na Claude/Antigravity)

Para implementar isso em código real agora (Frontend, Backend e Permissões), copie exatamente a caixa abaixo e envie para a IA desenvolver o código modular por você:

```text
Atue como um Engenheiro de Software Sênior especializado em Stripe Billing e SaaS B2B. 
Temos um software de mensageria corporativa (Vue.js 3 + Tailwind e Node.js/Koa + PostgreSQL no Supabase).

Eu preciso criar a arquitetura de Checkout da Stripe e o bloqueio de permissões. 
O modelo de cobrança é "Per Seat" (Por usuário por mês) em 3 tiers:
- Starter: R$ 6,99 / usário
- Medium: R$ 11,99 / usário
- Max (com Inteligência Artificial): R$ 14,99 / usuário

**REQUISITOS DA ARQUITETURA:**
1. **Afiliados (Info-Produto):** Quando o usuário entra via URL `?ref=codigo_afiliado`, o Vue.js deve salvar nos cookies/localStorage. Na hora que o usuário clicar em "Assinar o Plano", o Node.js deve criar a Stripe Checkout Session injetando esse código no `metadata` e no `client_reference_id`, para que possamos rastrear a comissão do afiliado no painel da Stripe (ou usar o app Rewardful/PromoterTies da Stripe).
2. **Backend (Node.js):** Crie o arquivo `src/routes/stripe.routes.js` contendo:
   - Rota `POST /create-checkout-session`: Para gerar a URL hospedada da Stripe. Recebe o `plan_id`, `quantidade_de_usuarios` (seats) e o `ref` (afiliado).
   - Rota `POST /webhook`: Para escutar o `checkout.session.completed` e o `customer.subscription.updated` do Stripe. Este Webhook deve pegar o `stripe_customer_id` e salvar na minha tabela `companies` do PostgreSQL/Supabase, mudando o `plan_id` real da empresa e o `subscription_status` para 'active'.
3. **Frontend (Vue.js):** Na tela de 'ProfileSettings.vue', eu preciso de uma UI profissional ("Pricing Cards") mostrando os 3 planos. Um botão "Fazer Upgrade" que chame o endpoint `/create-checkout-session` passando os dados.
4. **Middlewares de Permissão:** Modifique o código do Node.js (`src/routes/ai.routes.js`) para que a funcionalidade "Varinha Mágica" e "Anotar Áudio com IA" só funcione se a `company.plan_id` for igual a `max`. Caso contrário, retorne 403 Forbidden com uma mensagem amigável "Faça upgrade para o plano Max para liberar a Inteligência Artificial".

Gere as rotas, o store no Vue.js e o SQL Webhook handler usando a SDK oficial do Stripe. Considere o ambiente em produção na Render, por isso não esqueça do bypass de assinatura bruta (raw body) no webhook do Koa para evitar erros.
```

---

## 4. Por que essa solução é Profissional/Gigante?
1.  **Checkout Hospedado:** Você zero o risco de fraudes de cartão e PCI Compliance no seu servidor. Tudo corre nos servidores bancários da Stripe.
2.  **Affiliate Tracking Nativo:** Associando o `client_reference_id` aos pagamentos, o repasse da comissão se torna automático. Você entra na área "Connect" da Stripe e programa para que a Stripe repasse 30% do pagamento pro Afiliado e te dê 70%. Você sequer paga boletos manuais de comissões. Isso vira uma **Máquina Passiva de Dinheiro**.
3.  **Upsell Contínuo:** No modelo SaaS, se eles adorarem a AI e a empresa contratar mais 5 funcionários, a Stripe puxa do cartão o valor proporcional desses +5 automaticamente. Você dorme, a grana sobe.
