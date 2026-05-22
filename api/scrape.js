const GLOBAL_TIMEOUT_MS = 45_000;
const POLL_INTERVAL_MS = 2_000;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  const deadline = Date.now() + GLOBAL_TIMEOUT_MS;

  try {
    // 1. Start Firecrawl crawl job
    const crawlRes = await fetch('https://api.firecrawl.dev/v2/crawl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        url,
        limit: 10,
        scrapeOptions: { formats: ['markdown'] }
      })
    });

    if (!crawlRes.ok) {
      const err = await crawlRes.text();
      return res.status(502).json({ error: 'Firecrawl crawl start error', detail: err });
    }

    const { id: crawlId } = await crawlRes.json();
    if (!crawlId) return res.status(502).json({ error: 'No crawl ID returned by Firecrawl' });

    // 2. Poll until completed or timeout
    let crawlData = null;
    while (true) {
      if (Date.now() + POLL_INTERVAL_MS > deadline) {
        return res.status(504).json({ error: 'Timeout waiting for crawl to complete' });
      }

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

      const pollRes = await fetch(`https://api.firecrawl.dev/v2/crawl/${crawlId}`, {
        headers: { 'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}` }
      });

      if (!pollRes.ok) {
        const err = await pollRes.text();
        return res.status(502).json({ error: 'Firecrawl poll error', detail: err });
      }

      const pollData = await pollRes.json();

      if (pollData.status === 'completed') {
        crawlData = pollData;
        break;
      }
      if (pollData.status === 'failed') {
        return res.status(502).json({ error: 'Firecrawl crawl failed', detail: pollData.error || '' });
      }
      // status === 'scraping' or 'crawling' → keep polling
    }

    // 3. Concatenate all page markdowns
    const pages = crawlData?.data ?? [];
    const markdown = pages
      .map(p => p?.markdown || '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!markdown) return res.status(502).json({ error: 'No content returned by Firecrawl' });

    // 4. Extract structured business info with Claude
    if (Date.now() >= deadline) {
      return res.status(504).json({ error: 'Timeout before Claude call' });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Voici le contenu crawlé d'un site web professionnel (plusieurs pages). Réponds TOUJOURS en français, quelle que soit la langue du site.

Retourne un texte plain (sans markdown, sans astérisques, sans caractères spéciaux) structuré EXACTEMENT ainsi, dans cet ordre :

ENTREPRISE: [nom exact de l'entreprise tel qu'il apparaît sur le site]
COULEUR: [couleur principale dominante du site — boutons, header ou logo — en format #rrggbb. Si inconnue, déduis-la du secteur : restaurant → #8B4513, nature/outdoor → #4a5e3a, tech → #2563eb, etc.]

Puis ces sections (omets une section si l'info est absente) :

CONTACT : téléphone, email, adresse, lien de réservation
SERVICES : liste des services ou prestations proposés
TARIFS : prix par service ou formule
HORAIRES : jours et heures d'ouverture
CONDITIONS : conditions d'accès, restrictions, prérequis
FAQ : questions/réponses fréquentes si présentes

Maximum 600 mots au total. Sois concis et factuel.

${markdown}`
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
