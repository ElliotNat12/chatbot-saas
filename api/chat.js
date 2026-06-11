const { createClient } = require('@supabase/supabase-js');

// INTENTION : Limite le nombre de requêtes par IP via Supabase (persistant entre cold starts).
// Fenêtre glissante d'1h, max 20 requêtes. Remplace l'ancien Map in-memory.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 heure

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (xff ? xff.split(',')[0] : req.socket?.remoteAddress || 'unknown').trim();
}

// INTENTION : Vérifie si l'IP dépasse la limite. Retourne true si bloquée, false si autorisée.
// Nettoie aussi les anciennes lignes (>2h) en fire-and-forget pour éviter le gonflement de la table.
async function isRateLimited(ip) {
  const supabase = getSupabase();
  const now = new Date();
  const windowCutoff = new Date(now.getTime() - RATE_WINDOW_MS).toISOString();

  // Nettoyage des lignes > 2h (fire-and-forget, ne bloque pas la réponse)
  supabase.from('rate_limits')
    .delete()
    .lt('window_start', new Date(now.getTime() - 2 * RATE_WINDOW_MS).toISOString())
    .then(() => {});

  const { data } = await supabase
    .from('rate_limits')
    .select('window_start, request_count')
    .eq('ip', ip)
    .maybeSingle();

  // Pas de ligne ou fenêtre expirée → démarrer une nouvelle fenêtre
  if (!data || data.window_start < windowCutoff) {
    await supabase.from('rate_limits').upsert(
      { ip, window_start: now.toISOString(), request_count: 1 },
      { onConflict: 'ip' }
    );
    return false;
  }

  if (data.request_count >= RATE_LIMIT) return true;

  // INTENTION : Incrément atomique du compteur pour l'IP dans la fenêtre courante.
  await supabase
    .from('rate_limits')
    .update({ request_count: data.request_count + 1 })
    .eq('ip', ip);

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
