# Sistema Editorial pagou.ai

App interno pra Lais e vendedores acessarem a agenda editorial conectada ao Notion.

## Como funciona

```
Lais/Vendedor (navegador)
    ↓ acessa app
Netlify (HTML estático)
    ↓ pede dados
Netlify Function (server-side, com token)
    ↓ chama API
Notion API (database Calendário Editorial)
```

**O token nunca aparece no navegador.** Fica apenas nas variáveis de ambiente do Netlify.

## Deploy passo a passo

### 1. Criar novo site no Netlify

- Acesse [app.netlify.com](https://app.netlify.com)
- "Add new site" → "Deploy manually"
- Arraste a pasta `sistema-editorial-app` inteira
- Renomeie o site (ex: `editorial-pagou`)

### 2. Configurar variáveis de ambiente

No painel do Netlify do novo site:
- "Site settings" → "Environment variables" → "Add a variable"

Adicione **2 variáveis**:

| Key | Value |
|---|---|
| `NOTION_TOKEN` | seu novo token Notion (começa com `ntn_`) |
| `NOTION_DATABASE_ID` | `35fc3965-efff-80c7-ab3b-d3274048d5e2` |

### 3. Redeploy

- "Deploys" → "Trigger deploy" → "Clear cache and deploy site"

Aguarde o build (~30 segundos).

### 4. Testar

Acesse a URL do novo site. Clica num perfil (Lais) e deve carregar os posts.

## Arquivos

- `index.html` — Tela de login (escolher perfil)
- `dashboard.html` — Dashboard com agenda
- `main.css` — Estilos (paleta pagou.ai)
- `app.js` — Lógica frontend
- `netlify/functions/get-posts.js` — Busca posts no Notion (servidor)
- `netlify/functions/update-status.js` — Atualiza status (servidor)
- `netlify.toml` — Configuração Netlify

## Próximos passos

Após confirmar que funciona:
- Adicionar domínio bonito (ex: `agenda.pagou.ai`)
- Implementar notificações via Zapier (lembrete 24h antes)
- Linhas editoriais customizadas pra Nadia, Bruno, Ruan
- View de calendário mensal
