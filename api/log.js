// INTENTION : Patterns textuels FR/EN qui signalent que le bot n'a pas su répondre.
const UNANSWERED_PATTERNS = [
  // FR — ignorance directe
  /je ne comprends pas/i,
  /je n'ai pas/i,
  /je n'ai pas cette information/i,
  /je n'ai pas d'information/i,
  /je ne suis pas en mesure de/i,
  /malheureusement/i,
  /cette information n'est pas disponible/i,
  /je vous invite à contacter/i,
  /je ne dispose pas/i,
  /hors de mes connaissances/i,
  /je ne peux pas vous dire/i,
  /difficile à confirmer/i,
  /je vous recommande de contacter/i,
  /contactez.{0,20}directement/i,
  /appelez.{0,20}directement/i,
  // EN — direct ignorance phrases
  /i don't have/i,
  /i don't understand/i,
  /i'm not sure/i,
  /i'm unable to/i,
  /i don't have that information/i,
  /you might want to check/i,
  /i'd recommend contacting/i,
  /beyond my knowledge/i,
  /i cannot confirm/i,
  /please reach out/i,
  /i'm afraid i don't/i,
  /i don't know/i,
  /call.{0,20}directly/i,
];

const DATE_WORDS = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

// INTENTION : Détecte structurellement les réponses trop courtes ou purement interrogatives
// qui indiquent que le bot n'a pas fourni de vraie réponse.
function isStructurallyUnanswered(reply) {
  const text = (typeof reply === 'string' ? reply : '').trim();
  if (!text) return false;

  if (text.length < 20) return true;

  if (text.includes('?')) {
    // Réponse composée uniquement de questions (aucune phrase déclarative)
    if (!/[.!](\s|$)/.test(text)) return true;

    // Contient "?" mais aucun contenu factuel (pas de chiffre, pas de date)
    if (!/\d/.test(text) && !DATE_WORDS.test(text)) return true;
  }

  return false;
}

function detectUnanswered(messages) {
  const unanswered = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const next = messages[i + 1];
    if (msg.role === 'user' && next?.role === 'assistant') {
      const reply = typeof next.content === 'string' ? next.content : '';
      if (UNANSWERED_PATTERNS.some(p => p.test(reply)) || isStructurallyUnanswered(reply)) {
        unanswered.push(msg.content);
      }
    }
  }
  return unanswered;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, businessName, messages, language, leadScore, converted, sessionDurationSeconds, sessionId } = req.body;

  // INTENTION : Mise à jour ponctuelle converted=true quand le visiteur clique sur le panier, avant le log final.
  if (action === 'cart_click') {
    if (sessionId && businessName) {
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/conversations?session_id=eq.${encodeURIComponent(sessionId)}&business_name=eq.${encodeURIComponent(businessName)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ converted: true })
        }
      ).catch(() => {});
    }
    return res.status(200).json({ ok: true });
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing or invalid messages' });
  }

  const unanswered_questions = detectUnanswered(messages);

  try {
    const insertRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        business_name: businessName || null,
        messages,
        language: language || null,
        lead_score: leadScore || null,
        converted: converted || false,
        session_duration_seconds: sessionDurationSeconds || null,
        unanswered_questions,
        session_id: sessionId || null,
      })
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return res.status(502).json({ error: 'Supabase insert error', detail: err });
    }

    return res.status(200).json({ ok: true, unanswered: unanswered_questions.length });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
