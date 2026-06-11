// INTENTION : Limite le nombre de requêtes par IP via Supabase (persistant entre cold starts).
// Fenêtre fixe d'1h, max 200 requêtes. Utilise fetch raw comme le reste du projet.
const RATE_LIMIT = 200;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 heure

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (xff ? xff.split(',')[0] : req.socket?.remoteAddress || 'unknown').trim();
}

// INTENTION : Vérifie si l'IP dépasse la limite. Retourne true si bloquée, false si autorisée.
// Nettoie aussi les anciennes lignes (>2h) en fire-and-forget pour éviter le gonflement de la table.
async function isRateLimited(ip) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` };
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - RATE_WINDOW_MS).toISOString();

  // Nettoyage des lignes > 2h (fire-and-forget)
  fetch(`${base}/rest/v1/rate_limits?window_start=lt.${new Date(now.getTime() - 2 * RATE_WINDOW_MS).toISOString()}`, {
    method: 'DELETE', headers: { ...headers, 'Prefer': 'return=minimal' }
  }).catch(() => {});

  const res = await fetch(
    `${base}/rest/v1/rate_limits?ip=eq.${encodeURIComponent(ip)}&select=window_start,request_count`,
    { headers: { ...headers, 'Accept': 'application/json' } }
  );
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;

  // Pas de ligne ou fenêtre expirée → démarrer une nouvelle fenêtre
  if (!row || row.window_start < windowCutoff) {
    await fetch(`${base}/rest/v1/rate_limits`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ ip, window_start: now.toISOString(), request_count: 1 })
    });
    return false;
  }

  if (row.request_count >= RATE_LIMIT) return true;

  // INTENTION : Incrémente le compteur pour l'IP dans la fenêtre courante.
  await fetch(`${base}/rest/v1/rate_limits?ip=eq.${encodeURIComponent(ip)}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ request_count: row.request_count + 1 })
  });

  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  try {
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: 'Europe/Paris'
    });
    const datePrefix = `Aujourd'hui nous sommes le ${dateStr}. Utilise cette date comme référence pour toutes les questions sur les disponibilités et les jours.\n\n`;
    const systemWithDate = datePrefix + (system || '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemWithDate,
        messages
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
