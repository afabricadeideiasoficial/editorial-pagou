/**
 * GET /api/get-posts?user=Lais
 * Vercel API Route — busca posts no Notion filtrando por Responsável
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API = 'https://api.notion.com/v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token || !databaseId) {
    return res.status(500).json({
      error: 'Configuração ausente',
      detail: 'Verifique NOTION_TOKEN e NOTION_DATABASE_ID nas variáveis de ambiente do Vercel.'
    });
  }

  const { user } = req.query;

  if (!user) {
    return res.status(400).json({ error: 'Parâmetro "user" obrigatório' });
  }

  try {
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
        sorts: [{ property: 'Data', direction: 'ascending' }],
        page_size: 100,
      }),
    });

    if (!notionResponse.ok) {
      const errorBody = await notionResponse.text();
      return res.status(500).json({
        error: 'Erro ao consultar Notion',
        status: notionResponse.status,
        detail: errorBody.substring(0, 200),
      });
    }

    const data = await notionResponse.json();
    const posts = (data.results || []).map(extractPostFields);

    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    return res.status(500).json({ error: 'Erro interno', detail: error.message });
  }
}

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
    pilar: extractSelect(props['Pilar']),
    legenda: extractRichText(props['Legenda']),
    hashtags: extractRichText(props['Hashtags']),
    cta: extractRichText(props['CTA']),
    origem: extractSelect(props['Origem']),
    observacoes: extractRichText(props['Observações']),
    linkMidia: extractUrl(props['Link Mídia (Comum)']) || extractUrl(props['Link Mídia']),
  };
}

function extractTitle(prop) {
  if (!prop?.title) return '';
  return prop.title.map(t => t.plain_text).join('');
}
function extractRichText(prop) {
  if (!prop?.rich_text) return '';
  return prop.rich_text.map(t => t.plain_text).join('');
}
function extractSelect(prop) {
  if (!prop) return '';
  if (prop.select) return prop.select.name;
  if (prop.status) return prop.status.name;
  return '';
}
function extractDate(prop) {
  if (!prop?.date) return null;
  return prop.date.start;
}
function extractUrl(prop) {
  if (!prop?.url) return null;
  return prop.url;
}
