const UNANSWERED_PATTERNS = [
  /je ne comprends pas/i,
  /je n'ai pas/i,
  /je n'ai pas cette information/i,
  /je n'ai pas d'information/i,
  /i don't have/i,
  /i don't understand/i,
  /contactez.{0,20}directement/i,
  /appelez.{0,20}directement/i,
  /call.{0,20}directly/i,
];

function detectUnanswered(messages) {
  const unanswered = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const next = messages[i + 1];
    if (msg.role === 'user' && next?.role === 'assistant') {
      if (UNANSWERED_PATTERNS.some(p => p.test(next.content))) {
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

  const { businessName, messages, language, leadScore, converted, sessionDurationSeconds } = req.body;

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
