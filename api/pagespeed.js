const crypto = require('crypto');

// INTENTION : Vérifie le JWT client pour s'assurer que seuls les clients authentifiés peuvent lancer une analyse.
function verifyJWT(token) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  if (sig !== expected) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(body, 'base64').toString());
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired');
  return payload;
}

// INTENTION : Proxy vers Google PageSpeed Insights pour garder la clé API côté serveur.
// Le client envoie juste l'URL à analyser, la clé n'est jamais exposée dans le navigateur.
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // INTENTION : Vérifie que le client est connecté avant d'autoriser l'analyse.
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    verifyJWT(authHeader.slice(7));
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'URL must start with http:// or https://' });

  // INTENTION : Construit l'URL PageSpeed avec la clé API si elle est définie, sans clé sinon.
  const key = process.env.PAGESPEED_API_KEY;
  const apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
    + '?url=' + encodeURIComponent(url)
    + '&strategy=mobile'
    + (key ? '&key=' + key : '');

  try {
    const r = await fetch(apiUrl);
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: 'PageSpeed API error', detail: data });
    }
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
