const { Resend } = require('resend');
const twilio = require('twilio');

const SCORE_LABELS = { froid: '🔵 Froid', tiede: '🟡 Tiède', chaud: '🔴 Chaud' };

function htmlEmail({ nom, email, tel, projet, budget, resume, score }) {
  const scoreLabel = SCORE_LABELS[score] || score;
  const rows = [
    ['Nom', nom],
    ['Email', email],
    ['Téléphone', tel],
    ['Projet', projet],
    ['Budget', budget],
    ['Score', scoreLabel],
  ].map(([label, value]) => `
    <tr>
      <td style="padding:10px 16px;font-weight:600;color:#374151;background:#f9fafb;width:140px;border-bottom:1px solid #e5e7eb;">${label}</td>
      <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;">${value || '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 28px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🚀</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Nouveau lead ChatbotSaaS</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:14px;">Score : ${scoreLabel}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px;">
            <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Un visiteur vient de se qualifier via le chatbot.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;border-collapse:collapse;">
              ${rows}
            </table>
          </td>
        </tr>
        ${resume ? `
        <tr>
          <td style="padding:20px 32px 8px;">
            <p style="margin:0 0 8px;font-weight:600;color:#374151;font-size:14px;">Résumé de la conversation :</p>
            <div style="background:#f9fafb;border-left:4px solid #6366f1;padding:14px 16px;border-radius:0 8px 8px 0;color:#4b5563;font-size:14px;line-height:1.6;">${resume}</div>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:28px 32px;text-align:center;">
            ${email ? `<a href="mailto:${email}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-right:8px;">Répondre par email</a>` : ''}
            ${tel ? `<a href="tel:${tel}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">Appeler</a>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">ChatbotSaaS — notification automatique</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nom, email, tel, projet, budget, resume, score } = req.body;
  const errors = [];

  // Email via Resend
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'ChatbotSaaS <onboarding@resend.dev>',
      to: 'benoit.dambrun.25@neoma-bs.com',
      subject: `🔴 Nouveau lead ${score === 'chaud' ? 'chaud' : score === 'tiede' ? 'tiède' : 'froid'} — ${nom || 'Anonyme'}`,
      html: htmlEmail({ nom, email, tel, projet, budget, resume, score }),
    });
  } catch (err) {
    errors.push('email: ' + err.message);
  }

  // Résumé IA de la conversation
  let resumeIA = resume || '';
  if (resume && process.env.ANTHROPIC_API_KEY) {
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `Voici une conversation entre un prospect et un chatbot commercial, les messages sont séparés par " | " :\n\n${resume}\n\nRésume cette conversation en exactement 3 lignes, en français, sans bullet points, sans gras, sans mise en forme. Préfixe chaque ligne par son label suivi de deux-points :\nIntention : ce que le prospect veut faire\nProjet : type de site, spécificités mentionnées\nContexte : taille, marché, situation actuelle\n\nSois concis. Réponds uniquement avec ces 3 lignes, rien d'autre.`,
          }],
        }),
      });
      const aiData = await aiRes.json();
      const text = aiData?.content?.[0]?.text?.trim();
      if (text) resumeIA = text;
    } catch (_) {
      // garde le résumé brut si l'appel IA échoue
    }
  }

  // WhatsApp via Twilio
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const scoreLabel = SCORE_LABELS[score] || score;
    const lines = [
      `${scoreLabel} — Nouveau lead ChatbotSaaS`,
      `👤 ${nom || 'Anonyme'}`,
      email ? `📧 ${email}` : null,
      tel ? `📞 ${tel}` : null,
      projet ? `💼 ${projet}` : null,
      budget ? `💰 ${budget}` : null,
      resumeIA ? `📝 ${resumeIA}` : null,
    ].filter(Boolean).join('\n');

    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: process.env.TWILIO_WHATSAPP_TO,
      body: lines,
    });
  } catch (err) {
    errors.push('whatsapp: ' + err.message);
  }

  if (errors.length === 2) return res.status(500).json({ error: errors.join(' | ') });
  return res.status(200).json({ ok: true, errors: errors.length ? errors : undefined });
};
