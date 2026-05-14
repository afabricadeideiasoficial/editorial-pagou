/**
 * POST /api/update-status
 * Vercel API Route — atualiza o Status de um post no Notion
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';

const VALID_STATUSES = ['Ideia','Rascunho','Aprovação','Aprovado','Agendado','Publicado','Arquivado'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'NOTION_TOKEN não configurado' });
  }

  const { pageId, status } = req.body;

  if (!pageId || !status) {
    return res.status(400).json({ error: 'pageId e status são obrigatórios' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status inválido', validValues: VALID_STATUSES });
  }

  try {
    const notionResponse = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { 'Status': { select: { name: status } } }
      }),
    });

    if (!notionResponse.ok) {
      const errorBody = await notionResponse.text();
      return res.status(500).json({
        error: 'Erro ao atualizar Notion',
        status: notionResponse.status,
        detail: errorBody.substring(0, 200),
      });
    }

    return res.status(200).json({ success: true, pageId, newStatus: status });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}
