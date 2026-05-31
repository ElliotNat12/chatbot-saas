const GLOBAL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1_500;
const CLAUDE_BUFFER_MS = 10_000; // reserve this much time for Claude at the end
const INDIVIDUAL_SCRAPE_TIMEOUT_MS = 15_000;
const PRIORITY_KEYWORDS = ['contact', 'faq', 'livraison', 'tarifs', 'about', 'a-propos', 'conditions', 'cgv', 'mentions'];

async function scrapeIndividual(pageUrl, apiKey) {
  try {
    const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ url: pageUrl, formats: ['markdown'] })
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data?.data?.markdown || data?.markdown || '';
  } catch {
    return '';
  }
}

function extractPriorityLinks(markdown, baseUrl) {
  let baseOrigin;
  try { baseOrigin = new URL(baseUrl).origin; } catch { return []; }
  const found = new Set();
  const urlRe = /(?:\]\(|href=["']?)(https?:\/\/[^\s"')>\n]+|\/[^\s"')>\n]+)/g;
  let match;
  while ((match = urlRe.exec(markdown)) !== null) {
    const raw = match[1];
    try {
      const full = new URL(raw, baseOrigin).href.split('?')[0].split('#')[0];
      if (full.startsWith(baseOrigin)) {
        const path = new URL(full).pathname.toLowerCase();
        if (PRIORITY_KEYWORDS.some(kw => path.includes(kw))) {
          found.add(full);
        }
      }
    } catch {}
  }
  return [...found];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, extraUrls = [] } = req.body;
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
        limit: 3,
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
    }

    // 3. Concatenate crawled pages
    const pages = crawlData?.data ?? [];
    const crawledUrls = new Set(
      pages.map(p => p?.metadata?.sourceURL || p?.url || '').filter(Boolean)
    );
    const mainMarkdown = pages
      .map(p => p?.markdown || '')
      .filter(Boolean)
      .join('\n\n---\n\n');

    if (!mainMarkdown) return res.status(502).json({ error: 'No content returned by Firecrawl' });

    // 4. Detect priority pages from crawled content and scrape if missing
    const priorityLinks = extractPriorityLinks(mainMarkdown, url);
    const validExtraUrls = Array.isArray(extraUrls)
      ? extraUrls.map(u => (u || '').trim()).filter(u => u.startsWith('http'))
      : [];

    const toScrape = [...new Set([
      ...priorityLinks.filter(u => !crawledUrls.has(u)),
      ...validExtraUrls.filter(u => !crawledUrls.has(u))
    ])];

    const scrapeWithTimeout = (pageUrl) => Promise.race([
      scrapeIndividual(pageUrl, process.env.FIRECRAWL_API_KEY),
      new Promise(r => setTimeout(() => r(''), INDIVIDUAL_SCRAPE_TIMEOUT_MS))
    ]);

    const extraMarkdowns = Date.now() + CLAUDE_BUFFER_MS < deadline
      ? (await Promise.all(toScrape.map(scrapeWithTimeout))).filter(Boolean)
      : [];

    const markdown = [mainMarkdown, ...extraMarkdowns].join('\n\n---\n\n');

    // 5. Extract structured business info with Claude
    if (Date.now() >= deadline) {
      return res.status(504).json({ error: 'Timeout before Claude call' });
    }

    const userPrompt = `Voici le contenu crawle d'un site web professionnel. Reponds UNIQUEMENT en francais.

Ta reponse doit commencer IMMEDIATEMENT par exactement ces 3 lignes, sans aucun texte avant :

ENTREPRISE: [nom exact tel qu'il apparait sur le site]
COULEUR: #[6 chiffres hex — couleur dominante boutons/header/logo. Si inconnue : restaurant=#8B4513, nature/outdoor=#4a5e3a, tech=#2563eb, beaute=#c0847a, sante=#2e8b7a, commerce=#c0392b]
EMOJI: [UN SEUL emoji unicode, rien d'autre sur cette ligne : restaurant/cafe=🍽️, sport/fitness=💪, aventure/militaire/vehicule=🪖, beaute/spa=💆, tech/web=💻, boutique=🛍️, sante=🏥, immobilier=🏠, education=📚, voyage=✈️, autre=💬]

Puis ces sections en francais (omets si absent) :

CONTACT : telephone (ex: Telephone: +33 6 XX XX XX XX), email, adresse, lien de reservation
SERVICES : liste des prestations
TARIFS : prix par formule
HORAIRES : jours et heures d'ouverture uniquement, format concis (ex: Lundi-Vendredi 9h-18h, Samedi 10h-17h)
CONDITIONS : restrictions, prerequis
FAQ : questions frequentes

Maximum 600 mots hors les 3 premieres lignes. Texte plain sans markdown.

${markdown}`;

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
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: 'ENTREPRISE:' }
        ]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return res.status(502).json({ error: 'Claude error', detail: err });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData?.content?.[0]?.text || '';
    const faq = 'ENTREPRISE:' + rawText;

    return res.status(200).json({ faq });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
