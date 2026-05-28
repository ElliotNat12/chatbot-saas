const REPORT_EMAIL = process.env.REPORT_EMAIL || 'elliotnaturel@gmail.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.query.secret || req.headers['x-report-secret'];
  if (!process.env.REPORT_SECRET || !token || token !== process.env.REPORT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Fetch this week's conversations from Supabase
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const convRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/conversations?created_at=gte.${since}&order=created_at.asc`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!convRes.ok) {
      const err = await convRes.text();
      return res.status(502).json({ error: 'Supabase fetch error', detail: err });
    }

    const conversations = await convRes.json();

    if (!conversations.length) {
      return res.status(200).json({ ok: true, message: 'No conversations this week, no report sent.' });
    }

    // 2. Build summary for Claude
    const allUnanswered = conversations.flatMap(c => c.unanswered_questions || []);
    const converted = conversations.filter(c => c.converted).length;
    const conversionRate = ((converted / conversations.length) * 100).toFixed(1);
    const avgDuration = Math.round(
      conversations.reduce((s, c) => s + (c.session_duration_seconds || 0), 0) / conversations.length
    );
    const byBusiness = conversations.reduce((acc, c) => {
      acc[c.business_name || 'Unknown'] = (acc[c.business_name || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    const summary = JSON.stringify({
      total_conversations: conversations.length,
      converted,
      conversion_rate_pct: conversionRate,
      avg_duration_seconds: avgDuration,
      by_business: byBusiness,
      unanswered_questions: allUnanswered,
      sample_messages: conversations.slice(0, 10).map(c => ({
        business: c.business_name,
        language: c.language,
        lead_score: c.lead_score,
        messages: (c.messages || []).slice(0, 6)
      }))
    }, null, 2);

    // 3. Claude analysis
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: `Tu es un analyste produit. Voici les données des conversations chatbot de la semaine. Génère un rapport hebdomadaire structuré en français avec ces sections :

1. RÉSUMÉ CHIFFRÉ — statistiques clés (total, taux de conversion, durée moyenne, langues)
2. QUESTIONS SANS RÉPONSE — liste les questions fréquentes sans réponse satisfaisante, groupe les similaires
3. SUJETS POPULAIRES — quels sujets reviennent le plus dans les conversations
4. PROBLÈMES RÉCURRENTS — patterns inquiétants ou friction identifiée
5. RECOMMANDATIONS — 3 actions concrètes pour améliorer le chatbot cette semaine

Sois concis, factuel, orienté action. Max 600 mots.

Données :
${summary}`
        }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      return res.status(502).json({ error: 'Claude error', detail: err });
    }

    const claudeData = await claudeRes.json();
    const reportText = claudeData?.content?.[0]?.text || '';

    // 4. Send email via Resend
    const weekLabel = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const htmlReport = reportText
      .split('\n')
      .map(line => {
        if (/^\d+\./.test(line.trim())) return `<h3 style="margin:20px 0 6px;color:#1a1a1a;">${line.trim()}</h3>`;
        if (line.trim() === '') return '<br>';
        return `<p style="margin:4px 0;line-height:1.6;color:#333;">${line}</p>`;
      })
      .join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;padding:32px 0;margin:0;">
  <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
    <div style="background:#1a1a1a;padding:28px 32px;">
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin:0 0 4px;">Rapport hebdomadaire</p>
      <h1 style="color:#fff;font-size:22px;margin:0;">ChatbotSaaS Analytics</h1>
      <p style="color:rgba(255,255,255,.6);font-size:13px;margin:6px 0 0;">Semaine du ${weekLabel}</p>
    </div>
    <div style="padding:28px 32px;">
      <div style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;background:#f9f9f9;border-radius:8px;padding:14px 18px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#1a1a1a;">${conversations.length}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Conversations</div>
        </div>
        <div style="flex:1;min-width:120px;background:#f9f9f9;border-radius:8px;padding:14px 18px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#16a34a;">${conversionRate}%</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Taux de conversion</div>
        </div>
        <div style="flex:1;min-width:120px;background:#f9f9f9;border-radius:8px;padding:14px 18px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#1a1a1a;">${allUnanswered.length}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">Questions sans réponse</div>
        </div>
      </div>
      ${htmlReport}
    </div>
    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee;font-size:12px;color:#aaa;text-align:center;">
      ChatbotSaaS — rapport automatique généré le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
    </div>
  </div>
</body>
</html>`;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'ChatbotSaaS <onboarding@resend.dev>',
        to: [REPORT_EMAIL],
        subject: `Rapport hebdomadaire ChatbotSaaS — ${weekLabel}`,
        html: emailHtml
      })
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return res.status(502).json({ error: 'Resend error', detail: err });
    }

    // 5. Cleanup: if table exceeds 400 rows, archive insights then delete oldest
    const countRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/conversations?select=id&order=created_at.asc`,
      {
        headers: {
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'count=exact',
          'Range': '0-0'
        }
      }
    );

    const totalCount = parseInt(countRes.headers.get('Content-Range')?.split('/')[1] || '0', 10);

    if (totalCount > 400) {
      const toDelete = totalCount - 300;

      // Fetch oldest rows to archive
      const oldRes = await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/conversations?select=*&order=created_at.asc&limit=${toDelete}`,
        {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          }
        }
      );
      const oldRows = await oldRes.json();

      // Ask Claude to extract insights from old data before deleting
      const archiveRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [{
            role: 'user',
            content: `Ces conversations vont être supprimées de la base. Extrais en 300 mots max les insights essentiels à conserver : questions récurrentes sans réponse, sujets populaires, patterns de conversion, anomalies. Données : ${JSON.stringify(oldRows.map(c => ({ business: c.business_name, unanswered: c.unanswered_questions, lead_score: c.lead_score, converted: c.converted })))}`
          }]
        })
      });
      const archiveData = await archiveRes.json();
      const archiveInsight = archiveData?.content?.[0]?.text || '';

      // Store archived insights
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/archived_insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ insight: archiveInsight, rows_deleted: toDelete, archived_at: new Date().toISOString() })
      });

      // Delete oldest rows
      const oldestIds = oldRows.map(r => r.id);
      await fetch(
        `${process.env.SUPABASE_URL}/rest/v1/conversations?id=in.(${oldestIds.join(',')})`,
        {
          method: 'DELETE',
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          }
        }
      );
    }

    return res.status(200).json({ ok: true, conversations: conversations.length, conversionRate, archived: totalCount > 400 });

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
