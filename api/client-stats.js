module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { businessName, days = '7' } = req.query;
  if (!businessName) return res.status(400).json({ error: 'Missing businessName' });

  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();

  try {
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
      return res.status(502).json({ error: 'Supabase error', detail: err });
    }

    const conversations = await convRes.json();
    const total = conversations.length;
    const leads = conversations.filter(c => c.lead_score === 'chaud').length;
    const converted = conversations.filter(c => c.converted).length;
    const conversion_rate = total > 0 ? parseFloat(((converted / total) * 100).toFixed(1)) : 0;

    // Aggregate unanswered questions — count occurrences of each unique question
    const counts = {};
    for (const conv of conversations) {
      for (const q of (conv.unanswered_questions || [])) {
        const key = q.trim().toLowerCase();
        if (key) counts[key] = (counts[key] || { question: q.trim(), count: 0 }), counts[key].count++;
      }
    }
    const unanswered = Object.values(counts).sort((a, b) => b.count - a.count);

    return res.status(200).json({ conversations: total, leads, conversion_rate, unanswered });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
