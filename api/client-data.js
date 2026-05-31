const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';

async function getGithubFile(path, token) {
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!res.ok) return null;
  return res.json();
}

function parseConfig(source) {
  const wrapper = source.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
  if (wrapper) {
    try {
      const config = JSON.parse(wrapper[1]);
      if (config) return config;
    } catch (_) {}
  }
  const btMatch = source.match(/faq\s*:\s*`([\s\S]*?)`/);
  if (btMatch) {
    if (wrapper) {
      try {
        const sanitized = source.replace(/faq\s*:\s*`[\s\S]*?`/, '"faq": "__FAQ__"');
        const sm = sanitized.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
        if (sm) { const config = JSON.parse(sm[1]); config.faq = btMatch[1]; return config; }
      } catch (_) {}
    }
    return { faq: btMatch[1] };
  }
  const sqMatch = source.match(/faq\s*:\s*'([\s\S]*?)'/);
  if (sqMatch) return { faq: sqMatch[1] };
  const dqMatch = source.match(/"faq"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (dqMatch) return { faq: dqMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
  return null;
}

async function getFaqData(slug, token) {
  const ghPath = `demo-${slug}/config.js`;
  const ghRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${ghPath}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!ghRes.ok) {
    const body = await ghRes.text();
    throw Object.assign(new Error('Config not found'), { status: 404, detail: body });
  }
  const file = await ghRes.json();
  const source = Buffer.from(file.content, 'base64').toString('utf-8');
  const config = parseConfig(source);
  if (!config) throw Object.assign(new Error('Could not parse config.js'), { status: 422 });
  return {
    faq: config.faq || '',
    botName: config.botName || '',
    ownerName: config.ownerName || '',
    phone: config.phone || '',
    bookingUrl: config.bookingUrl || '',
    launcherText: config.launcherText || '',
    homeSubtitle: config.homeSubtitle || '',
    greeting: config.greeting || '',
    ecommerce: config.ecommerce === true,
    suggestions: Array.isArray(config.suggestions) ? config.suggestions : [],
    config,
    _file: file
  };
}

async function getStatsData(businessName, days) {
  const daysNum = Math.min(Math.max(parseInt(days) || 7, 1), 90);
  const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
  const convRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/conversations?business_name=eq.${encodeURIComponent(businessName)}&created_at=gte.${since}&select=lead_score,converted,unanswered_questions`,
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    }
  );
  if (!convRes.ok) {
    const err = await convRes.text();
    throw Object.assign(new Error('Supabase error'), { status: 502, detail: err });
  }
  const conversations = await convRes.json();
  const total = conversations.length;
  const leads = conversations.filter(c => c.lead_score === 'chaud').length;
  const converted = conversations.filter(c => c.converted).length;
  const conversion_rate = total > 0 ? parseFloat(((converted / total) * 100).toFixed(1)) : 0;
  const counts = {};
  for (const conv of conversations) {
    for (const q of (conv.unanswered_questions || [])) {
      const key = q.trim().toLowerCase();
      if (key) counts[key] = (counts[key] || { question: q.trim(), count: 0 }), counts[key].count++;
    }
  }
  const unanswered = Object.values(counts).sort((a, b) => b.count - a.count);
  return { conversations: total, leads, conversion_rate, unanswered };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const dataParam = req.method === 'GET' ? req.query.data : 'faq';

  // ── Stats (no auth required) ─────────────────────────────────────────────
  if (req.method === 'GET' && dataParam === 'stats') {
    const { businessName, days = '7' } = req.query;
    if (!businessName) return res.status(400).json({ error: 'Missing businessName' });
    try {
      return res.status(200).json(await getStatsData(businessName, days));
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message, detail: err.detail });
    }
  }

  // ── All other routes require admin auth ──────────────────────────────────
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const token = process.env.GITHUB_TOKEN;
  const slug  = req.method === 'GET' ? req.query.slug : req.body?.slug;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  // ── GET ?data=faq ─────────────────────────────────────────────────────────
  if (req.method === 'GET' && dataParam === 'faq') {
    try {
      const faqData = await getFaqData(slug, token);
      const { _file, ...result } = faqData;
      return res.status(200).json(result);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message, detail: err.detail });
    }
  }

  // ── GET ?data=both ────────────────────────────────────────────────────────
  if (req.method === 'GET' && dataParam === 'both') {
    const { businessName, days = '7' } = req.query;
    if (!businessName) return res.status(400).json({ error: 'Missing businessName' });
    try {
      const [faqData, statsData] = await Promise.all([
        getFaqData(slug, token),
        getStatsData(businessName, days)
      ]);
      const { _file, ...faq } = faqData;
      return res.status(200).json({ faq, stats: statsData });
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message, detail: err.detail });
    }
  }

  // ── POST — update FAQ ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { faq, faq_entry } = req.body;
    if (faq === undefined && faq_entry === undefined) return res.status(400).json({ error: 'Missing faq or faq_entry' });
    try {
      const file = await getGithubFile(`demo-${slug}/config.js`, token);
      if (!file) return res.status(404).json({ error: 'Config not found' });
      const source = Buffer.from(file.content, 'base64').toString('utf-8');
      const config = parseConfig(source);
      if (!config) return res.status(422).json({ error: 'Could not parse config.js' });

      config.faq = faq !== undefined ? faq : (config.faq || '').trimEnd() + '\n' + faq_entry;
      const encoded = Buffer.from(`ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`).toString('base64');

      const putRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/demo-${slug}/config.js`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: `update FAQ for ${slug}`, content: encoded, sha: file.sha })
      });

      if (!putRes.ok) {
        const err = await putRes.text();
        return res.status(502).json({ error: 'GitHub push error', detail: err });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
