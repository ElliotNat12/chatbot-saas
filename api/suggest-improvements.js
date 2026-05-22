const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';

// SQL to create table — run once in Supabase SQL editor:
// CREATE TABLE IF NOT EXISTS faq_suggestions (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   slug TEXT NOT NULL,
//   business_name TEXT,
//   suggestion TEXT NOT NULL,
//   question_source TEXT,
//   status TEXT DEFAULT 'pending',
//   faq_entry TEXT,
//   week_of DATE
// );

function getMondayOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date().setDate(diff)).toISOString().split('T')[0];
}

const sbH = () => ({
  'apikey': process.env.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

async function ghGet(path) {
  const r = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!r.ok) return null;
  return r.json();
}

function parseConfig(source) {
  const m = source.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function ghPut(path, content, sha, message) {
  const token = process.env.GITHUB_TOKEN;
  const body = { message, content: Buffer.from(content).toString('base64'), sha };
  const doPut = (b) => fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(b)
  });
  let r = await doPut(body);
  if (r.status === 409) {
    const fresh = await ghGet(path);
    r = await doPut({ ...body, sha: fresh?.sha });
  }
  if (!r.ok) throw new Error(`GitHub push error: ${await r.text()}`);
}

async function appendFaqToGithub(slug, entry) {
  const path = `demo-${slug}/config.js`;
  const file = await ghGet(path);
  if (!file) throw new Error(`Config not found: ${slug}`);
  const source = Buffer.from(file.content, 'base64').toString('utf-8');
  const config = parseConfig(source);
  if (!config) throw new Error('Could not parse config.js');
  config.faq = (config.faq || '').trimEnd() + '\n' + entry;
  await ghPut(path, `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`, file.sha, `faq suggestion approved: ${slug}`);
}

async function appendAllFaqToGithub(slug, entries) {
  const path = `demo-${slug}/config.js`;
  const file = await ghGet(path);
  if (!file) throw new Error(`Config not found: ${slug}`);
  const source = Buffer.from(file.content, 'base64').toString('utf-8');
  const config = parseConfig(source);
  if (!config) throw new Error('Could not parse config.js');
  config.faq = (config.faq || '').trimEnd() + '\n' + entries.join('\n');
  await ghPut(path, `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`, file.sha, `approve all FAQ suggestions: ${slug}`);
}

async function getExistingPending(slug, weekOf) {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?slug=eq.${slug}&status=eq.pending&week_of=eq.${weekOf}&select=*`,
    { headers: sbH() }
  );
  if (!r.ok) return [];
  return r.json();
}

async function generateForClient(slug, businessName, force) {
  const weekOf = getMondayOfWeek();

  if (!force) {
    const cached = await getExistingPending(slug, weekOf);
    if (cached.length > 0) return { suggestions: cached, count: cached.length, from_cache: true };
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [convRes, configFile] = await Promise.all([
    fetch(
      `${process.env.SUPABASE_URL}/rest/v1/conversations?business_name=eq.${encodeURIComponent(businessName)}&created_at=gte.${since}&select=messages,unanswered_questions`,
      { headers: sbH() }
    ),
    ghGet(`demo-${slug}/config.js`)
  ]);

  const conversations = convRes.ok ? await convRes.json() : [];
  const faq = configFile
    ? parseConfig(Buffer.from(configFile.content, 'base64').toString('utf-8'))?.faq || ''
    : '';

  const counts = {};
  for (const c of conversations) {
    for (const q of (c.unanswered_questions || [])) {
      const k = q.trim().toLowerCase();
      if (k) { if (!counts[k]) counts[k] = { question: q.trim(), count: 0 }; counts[k].count++; }
    }
  }
  const unanswered = Object.values(counts).sort((a, b) => b.count - a.count);

  const prompt = `Tu es un expert en optimisation de chatbots IA pour petites entreprises. Voici les données d'utilisation du chatbot de ${businessName} cette semaine :

FAQ ACTUELLE :
${faq || '(aucune FAQ configurée)'}

CONVERSATIONS COMPLÈTES (${conversations.length} cette semaine) :
${JSON.stringify(conversations.slice(0, 20), null, 2)}

QUESTIONS SANS RÉPONSE IDENTIFIÉES :
${unanswered.map(q => `- "${q.question}" (${q.count} fois)`).join('\n') || '(aucune)'}

Analyse ces données et génère entre 10 et 15 suggestions d'amélioration de la FAQ. Pour chaque suggestion, fournis :
1. La question ou le sujet manquant
2. La réponse suggérée à ajouter dans la FAQ
3. La source (quelle conversation ou question a révélé ce manque)

Réponds UNIQUEMENT en JSON valide, tableau d'objets avec ces champs :
[{"suggestion": "texte court décrivant ce qui manque", "faq_entry": "le texte exact à ajouter dans la FAQ", "question_source": "la question du visiteur qui a révélé ce manque"}]`;

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!aiRes.ok) throw new Error(`Claude API error: ${aiRes.status}`);
  const rawText = (await aiRes.json()).content?.[0]?.text || '';

  let parsed;
  try {
    const m = rawText.match(/\[[\s\S]*\]/);
    if (!m) throw new Error('No JSON array found');
    parsed = JSON.parse(m[0]);
  } catch (e) {
    console.error('Claude parse error:', e.message, rawText.slice(0, 300));
    return { error: 'Parse error', raw: rawText.slice(0, 1000) };
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    return { error: 'Empty suggestions array', raw: rawText.slice(0, 500) };
  }

  const rows = parsed.map(s => ({
    slug,
    business_name: businessName,
    suggestion: s.suggestion || '',
    faq_entry: s.faq_entry || '',
    question_source: s.question_source || null,
    status: 'pending',
    week_of: weekOf
  }));

  const insRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions`, {
    method: 'POST',
    headers: sbH(),
    body: JSON.stringify(rows)
  });

  if (!insRes.ok) {
    const e = await insRes.text();
    throw new Error(`Supabase insert error: ${e}`);
  }

  const inserted = await insRes.json();
  return { suggestions: Array.isArray(inserted) ? inserted : rows, count: rows.length, from_cache: false };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  // Cron auto mode — generate for all clients silently
  if (req.query.auto === 'true' && req.query.allClients === 'true') {
    try {
      const rootRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents`, {
        headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
      });
      if (!rootRes.ok) return res.status(502).json({ error: 'GitHub fetch failed' });
      const items = await rootRes.json();
      const demos = (Array.isArray(items) ? items : []).filter(
        f => f.type === 'dir' && f.name.startsWith('demo-') && f.name !== 'demo-onboarding'
      );

      const results = [];
      for (const d of demos) {
        const slug = d.name.replace(/^demo-/, '');
        try {
          const cf = await ghGet(`demo-${slug}/config.js`);
          if (!cf) { results.push({ slug, ok: false, error: 'No config' }); continue; }
          const config = parseConfig(Buffer.from(cf.content, 'base64').toString('utf-8'));
          const businessName = config?.businessName || slug;
          const r = await generateForClient(slug, businessName, false);
          results.push({ slug, ok: !r.error, count: r.count || 0, from_cache: !!r.from_cache });
        } catch (e) {
          results.push({ slug, ok: false, error: e.message });
        }
      }
      return res.status(200).json({ ok: true, processed: results.length, results });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'GET') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Missing slug' });
    try {
      const r = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?slug=eq.${slug}&select=*&order=created_at.desc`,
        { headers: sbH() }
      );
      if (!r.ok) {
        const t = await r.text();
        if (t.includes('does not exist')) return res.status(200).json({ pending: [], approved: [], rejected: [], modified: [] });
        return res.status(502).json({ error: t });
      }
      const all = await r.json();
      return res.status(200).json({
        pending: all.filter(s => s.status === 'pending'),
        approved: all.filter(s => s.status === 'approved'),
        rejected: all.filter(s => s.status === 'rejected'),
        modified: all.filter(s => s.status === 'modified')
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { action } = body;

    // Generate suggestions
    if (!action) {
      const { slug, businessName, force } = body;
      if (!slug || !businessName) return res.status(400).json({ error: 'Missing slug or businessName' });
      try {
        return res.status(200).json(await generateForClient(slug, businessName, !!force));
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'reject') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      try {
        const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...sbH(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'rejected' })
        });
        if (!r.ok) return res.status(502).json({ error: await r.text() });
        return res.status(200).json({ ok: true });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'approve' || action === 'modify') {
      const { id, faq_entry: customEntry } = body;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      try {
        const gr = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?id=eq.${id}&select=*`, { headers: sbH() });
        if (!gr.ok) throw new Error('Cannot fetch suggestion');
        const [s] = await gr.json();
        if (!s) return res.status(404).json({ error: 'Not found' });

        const entry = action === 'modify' ? customEntry : s.faq_entry;
        await appendFaqToGithub(s.slug, entry);

        const update = { status: action === 'modify' ? 'modified' : 'approved' };
        if (action === 'modify') update.faq_entry = customEntry;

        const pr = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...sbH(), 'Prefer': 'return=minimal' },
          body: JSON.stringify(update)
        });
        if (!pr.ok) return res.status(502).json({ error: await pr.text() });
        return res.status(200).json({ ok: true });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    if (action === 'approve_all') {
      const { slug } = body;
      if (!slug) return res.status(400).json({ error: 'Missing slug' });
      try {
        const weekOf = getMondayOfWeek();
        const pr = await fetch(
          `${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?slug=eq.${slug}&status=eq.pending&week_of=eq.${weekOf}&select=*`,
          { headers: sbH() }
        );
        if (!pr.ok) throw new Error('Cannot fetch pending');
        const pending = await pr.json();
        if (!pending.length) return res.status(200).json({ ok: true, approved: 0 });

        await appendAllFaqToGithub(slug, pending.map(s => s.faq_entry).filter(Boolean));

        const ids = pending.map(s => s.id).join(',');
        const patchRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?id=in.(${ids})`, {
          method: 'PATCH',
          headers: { ...sbH(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ status: 'approved' })
        });
        if (!patchRes.ok) console.error('Batch approve error:', await patchRes.text());

        return res.status(200).json({ ok: true, approved: pending.length });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
