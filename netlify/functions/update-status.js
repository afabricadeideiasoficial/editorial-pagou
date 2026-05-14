/**
 * POST /.netlify/functions/update-status
 * Body: { pageId: string, status: string }
 *
 * Atualiza o Status de um post no Notion.
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';

const VALID_STATUSES = [
  'Ideia',
  'Rascunho',
  'Aprovação',
  'Aprovado',
  'Agendado',
  'Publicado',
  'Arquivado',
];

export default async (request, context) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const token = Netlify.env.get('NOTION_TOKEN');
  if (!token) {
    return jsonResponse({
      error: 'Configuração ausente',
      detail: 'NOTION_TOKEN não está configurado.'
    }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'JSON inválido' }, 400);
  }

  const { pageId, status } = body;

  if (!pageId || !status) {
    return jsonResponse({ error: 'pageId e status são obrigatórios' }, 400);
  }

  if (!VALID_STATUSES.includes(status)) {
    return jsonResponse({
      error: 'Status inválido',
      validValues: VALID_STATUSES,
    }, 400);
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
        properties: {
          'Status': {
            select: { name: status }
          }
        }
      }),
    });

    if (!notionResponse.ok) {
      const errorBody = await notionResponse.text();
      console.error('Notion API error:', notionResponse.status, errorBody);
      return jsonResponse({
        error: 'Erro ao atualizar Notion',
        status: notionResponse.status,
        detail: errorBody.substring(0, 200),
      }, 500);
    }

    return jsonResponse({ success: true, pageId, newStatus: status });
  } catch (error) {
    console.error('Function error:', error);
    return jsonResponse({
      error: 'Erro interno',
      detail: error.message,
    }, 500);
  }
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
