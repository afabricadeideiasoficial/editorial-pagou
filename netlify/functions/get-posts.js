/**
 * GET /.netlify/functions/get-posts?user=Lais
 *
 * Busca posts no Notion filtrando por Responsável.
 * Token fica seguro nas variáveis de ambiente do Netlify.
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';

export default async (request, context) => {
  // Apenas GET
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Validar env vars
  const token = Netlify.env.get('NOTION_TOKEN');
  const databaseId = Netlify.env.get('NOTION_DATABASE_ID');

  if (!token || !databaseId) {
    return jsonResponse({
      error: 'Configuração ausente',
      detail: 'Verifique NOTION_TOKEN e NOTION_DATABASE_ID nas variáveis de ambiente do Netlify.'
    }, 500);
  }

  // Pegar user da query string
  const url = new URL(request.url);
  const user = url.searchParams.get('user');

  if (!user) {
    return jsonResponse({ error: 'Parâmetro "user" obrigatório' }, 400);
  }

  try {
    // Buscar posts no Notion filtrando por Responsável
    const notionResponse = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Responsável',
          select: { equals: user }
        },
        sorts: [
          { property: 'Data', direction: 'ascending' }
        ],
        page_size: 100,
      }),
    });

    if (!notionResponse.ok) {
      const errorBody = await notionResponse.text();
      console.error('Notion API error:', notionResponse.status, errorBody);
      return jsonResponse({
        error: 'Erro ao consultar Notion',
        status: notionResponse.status,
        detail: errorBody.substring(0, 200),
      }, 500);
    }

    const data = await notionResponse.json();

    // Mapear pra estrutura simples
    const posts = (data.results || []).map(extractPostFields);

    return jsonResponse({ posts, count: posts.length });
  } catch (error) {
    console.error('Function error:', error);
    return jsonResponse({
      error: 'Erro interno',
      detail: error.message,
    }, 500);
  }
};

function extractPostFields(page) {
  const props = page.properties || {};

  return {
    id: page.id,
    url: page.url,
    tema: extractTitle(props['TEMA']),
    data: extractDate(props['Data']),
    plataforma: extractSelect(props['Plataforma']),
    responsavel: extractSelect(props['Responsável']),
    status: extractSelect(props['Status']),
    formato: extractSelect(props['Formato']),
    funil: extractSelect(props['Funil']),
    objetivo: extractSelect(props['Objetivo']),
    pilar: extractSelect(props['Pilar']),
    legenda: extractRichText(props['Legenda']),
    hashtags: extractRichText(props['Hashtags']),
    cta: extractRichText(props['CTA']),
    origem: extractSelect(props['Origem']),
    observacoes: extractRichText(props['Observações']),
    linkMidia: extractUrl(props['Link Mídia Comum']) || extractUrl(props['Link Mídia']),
  };
}

function extractTitle(prop) {
  if (!prop || !prop.title) return '';
  return prop.title.map(t => t.plain_text).join('');
}

function extractRichText(prop) {
  if (!prop || !prop.rich_text) return '';
  return prop.rich_text.map(t => t.plain_text).join('');
}

function extractSelect(prop) {
  if (!prop) return '';
  if (prop.select) return prop.select.name;
  if (prop.status) return prop.status.name;
  return '';
}

function extractDate(prop) {
  if (!prop || !prop.date) return null;
  return prop.date.start;
}

function extractUrl(prop) {
  if (!prop || !prop.url) return null;
  return prop.url;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
