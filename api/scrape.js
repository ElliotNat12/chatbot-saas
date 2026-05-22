module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    // 1. Scrape with Firecrawl
    const firecrawlRes = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({ url, formats: ['markdown'] })
    });

    if (!firecrawlRes.ok) {
      const err = await firecrawlRes.text();
      return res.status(502).json({ error: 'Firecrawl error', detail: err });
    }

    const firecrawlData = await firecrawlRes.json();
    const markdown = firecrawlData?.data?.markdown || firecrawlData?.markdown || '';

    if (!markdown) return res.status(502).json({ error: 'No content returned by Firecrawl' });

    // 2. Extract business info with Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [
          {
            role: 'user',
            content: `Voici le contenu d'un site web professionnel. Extrais uniquement les informations utiles pour configurer un chatbot : nom de l'entreprise, description courte, services proposés, tarifs, horaires, adresse, téléphone, email, FAQ si présente. Retourne un texte simple et structuré, sans markdown, sans titres, juste les infos clés. Maximum 500 mots.\n\n${markdown}`
          }
        ]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return res.status(502).json({ error: 'Claude error', detail: err });
    }

    const claudeData = await claudeRes.json();
    const faq = claudeData?.content?.[0]?.text || '';

    return res.status(200).json({ faq });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
