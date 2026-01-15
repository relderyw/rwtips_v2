# Guia de Deploy (GitHub + Netlify + Backend)

Para colocar o projeto no ar, precisamos entender que ele é dividido em duas partes:
1.  **Frontend (React/Vite):** O site que o usuário vê. Pode ser hospedado no Netlify.
2.  **Backend (Node.js/Bot):** O servidor que busca os dados, roda o bot do Telegram e serve a API. **Ele NÃO roda no Netlify** (hospedagem estática). Ele precisa de um servidor como Render, Railway ou VPS.

---

## 1. Preparar o Repositório (GitHub)

1.  Crie um repositório no GitHub.
2.  No seu computador, rode os comandos:
    ```bash
    git init
    git add .
    git commit -m "Primeiro commit - RWTips V2"
    git branch -M main
    git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
    git push -u origin main
    ```

---

## 2. Deploy do Backend (Render / Railway)

Você precisa de um serviço que rode Node.js 24/7. O **Render** tem um plano gratuito (que "dorme" após inatividade) ou pago. O **Railway** é pago mas muito estável.

1.  Crie uma conta no [Render](https://render.com/).
2.  Clique em **New +** -> **Web Service**.
3.  Conecte seu GitHub e escolha o repositório.
4.  **Configurações:**
    *   **Runtime:** Node
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm run start` (ou `tsx server-bot.ts`)
5.  **Variáveis de Ambiente (Environment Variables):**
    *   Adicione todas as variáveis do seu `.env` (FIREBASE_*, TELEGRAM_*, etc).
6.  Faça o deploy. O Render vai te dar uma URL (ex: `https://seu-backend.onrender.com`).

---

## 3. Deploy do Frontend (Netlify)

1.  Crie uma conta no [Netlify](https://www.netlify.com/).
2.  Clique em **Add new site** -> **Import from Git**.
3.  Escolha o repositório do GitHub.
4.  **Configurações de Build:**
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
5.  **Variáveis de Ambiente:**
    *   Clique em "Show advanced" ou vá nas configurações do site depois.
    *   Adicione `VITE_API_URL` com o valor da URL do seu backend (ex: `https://seu-backend.onrender.com`).
    *   **Importante:** Sem isso, o frontend vai tentar buscar em `localhost` e falhará.
6.  Clique em **Deploy site**.

---

## Resumo da Arquitetura

*   **Usuario** -> acessa -> **Netlify (Frontend)**
*   **Netlify** -> chama API -> **Render (Backend)**
*   **Render** -> busca dados -> **SokkerPro / APIs externas**

Se você tentar subir tudo no Netlify, o site vai abrir, mas o bot não vai rodar e os dados "ao vivo" não vão carregar.
