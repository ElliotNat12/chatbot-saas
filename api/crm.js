module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const base = `${process.env.SUPABASE_URL}/rest/v1/crm_leads`;
  const headers = {
    'apikey': process.env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${base}?select=*&order=created_at.desc`, { headers });
      if (!r.ok) {
        const err = await r.text();
        // Table may not exist yet — return empty array gracefully
        if (err.includes('does not exist') || r.status === 404) return res.status(200).json([]);
        return res.status(502).json({ error: 'Supabase error', detail: err });
      }
      return res.status(200).json(await r.json());
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { action, id, data } = req.body;

    if (action === 'create') {
      try {
        const r = await fetch(base, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            business_type: data.business_type || '',
            offer: data.offer || 'Starter',
            mrr: data.mrr || null,
            status: data.status || 'prospect',
            notes: data.notes || '',
            first_contact_date: data.first_contact_date || new Date().toISOString().split('T')[0],
            slug: data.slug || null
          })
        });
        if (!r.ok) { const e = await r.text(); return res.status(502).json({ error: 'Insert error', detail: e }); }
        const result = await r.json();
        return res.status(200).json({ ok: true, lead: Array.isArray(result) ? result[0] : result });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (action === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      try {
        const r = await fetch(`${base}?id=eq.${id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify(data)
        });
        if (!r.ok) { const e = await r.text(); return res.status(502).json({ error: 'Update error', detail: e }); }
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
