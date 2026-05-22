const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';
const VERCEL_URL = 'https://chatbot-saas-nine.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;

  try {
    const listRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      return res.status(502).json({ error: 'GitHub API error', detail: err });
    }

    const items = await listRes.json();
    const demoDirs = items.filter(item => item.type === 'dir' && item.name.startsWith('demo-'));

    // For each demo dir, try to fetch businessName from config.js
    const clients = await Promise.all(demoDirs.map(async item => {
      const slug = item.name.replace('demo-', '');
      let name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      try {
        const cfgRes = await fetch(`${GITHUB_API}/repos/${REPO}/contents/demo-${slug}/config.js`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Accept': 'application/vnd.github+json'
          }
        });
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          const source = Buffer.from(cfgData.content, 'base64').toString('utf-8');
          const match = source.match(/"businessName"\s*:\s*"([^"]+)"/);
          if (match) name = match[1];
        }
      } catch (_) {}

      return { slug, name, url: `${VERCEL_URL}/demo-${slug}/` };
    }));

    return res.status(200).json(clients);

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
