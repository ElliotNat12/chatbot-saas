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
  const m = source.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const token = process.env.GITHUB_TOKEN;
  const slug = req.method === 'GET' ? req.query.slug : req.body?.slug;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  if (req.method === 'GET') {
    try {
      const file = await getGithubFile(`demo-${slug}/config.js`, token);
      if (!file) return res.status(404).json({ error: 'Config not found' });
      const source = Buffer.from(file.content, 'base64').toString('utf-8');
      const config = parseConfig(source);
      if (!config) return res.status(422).json({ error: 'Could not parse config.js' });
      return res.status(200).json({ faq: config.faq || '', config });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { faq, faq_entry } = req.body;
    if (faq === undefined && faq_entry === undefined) return res.status(400).json({ error: 'Missing faq or faq_entry' });

    try {
      const file = await getGithubFile(`demo-${slug}/config.js`, token);
      if (!file) return res.status(404).json({ error: 'Config not found' });

      const source = Buffer.from(file.content, 'base64').toString('utf-8');
      const config = parseConfig(source);
      if (!config) return res.status(422).json({ error: 'Could not parse config.js' });

      if (faq !== undefined) {
        config.faq = faq;
      } else {
        config.faq = (config.faq || '').trimEnd() + '\n' + faq_entry;
      }
      const newSource = `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`;
      const encoded = Buffer.from(newSource).toString('base64');

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
