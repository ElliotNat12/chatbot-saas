const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';
const VERCEL_URL = 'https://chatbot-saas-nine.vercel.app';

function generateConfigJs(data) {
  const config = {
    apiEndpoint: '/api/chat',
    botName: data.botName || 'Assistant',
    avatar: data.avatar || '💬',
    businessName: data.businessName || '',
    businessDescription: data.businessDescription || '',
    accentColor: data.accentColor || '#2563eb',
    phone: data.phone || '',
    phoneHours: data.phoneHours || '',
    bookingUrl: data.bookingUrl || '',
    greeting: data.greeting || `Bonjour ! Je suis ${data.botName || 'votre assistant'}. Comment puis-je vous aider ?`,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [
      "C'est combien ?", "Comment réserver ?", "Vous êtes ouverts quand ?", "Prendre contact"
    ],
    faq: data.faq || '',
    poweredBy: 'ChatbotSaaS',
    badgeDelay: 4000,
    errorMessage: data.phone
      ? `Je rencontre un problème. Contactez-nous au ${data.phone}.`
      : 'Je rencontre un problème. Veuillez réessayer.'
  };
  return `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`;
}

function generateIndexHtml(data) {
  const color = data.accentColor || '#2563eb';
  const name = data.businessName || 'Mon entreprise';
  const desc = data.businessDescription || '';
  const phone = data.phone || '';
  const bookingUrl = data.bookingUrl || '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --green: ${color}; --cream: #f5f4f0; --warm: #eceae2; --text: #1c1c1c; --muted: #6b6b5f; }
    body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); line-height: 1.6; }
    nav { background: var(--green); padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 64px; }
    .nav-logo { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--cream); letter-spacing: .01em; }
    .nav-links { display: flex; gap: 2rem; list-style: none; }
    .nav-links a { color: rgba(255,255,255,.75); text-decoration: none; font-size: 14px; }
    .hero { background: var(--green); color: var(--cream); padding: 5rem 2rem 4rem; text-align: center; }
    .hero h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 600; line-height: 1.15; margin-bottom: 1rem; }
    .hero p { font-size: 16px; color: rgba(255,255,255,.65); max-width: 480px; margin: 0 auto 2rem; }
    .hero-cta { display: inline-block; background: var(--cream); color: var(--green); padding: 12px 24px; border-radius: 40px; text-decoration: none; font-weight: 500; font-size: 14px; }
    .section { padding: 3.5rem 2rem; max-width: 900px; margin: 0 auto; }
    h2 { font-family: 'Playfair Display', serif; font-size: 1.9rem; font-weight: 400; margin-bottom: 1.5rem; }
    .info-card { background: #fff; border-radius: 14px; padding: 1.75rem; border: 1px solid rgba(0,0,0,.06); }
    .info-card p { font-size: 14px; color: var(--muted); line-height: 1.65; }
    .info-card .contact { margin-top: 1.25rem; font-size: 14px; font-weight: 500; color: var(--text); }
    footer { background: var(--green); color: rgba(255,255,255,.6); text-align: center; padding: 2rem; font-size: 13px; }
    footer strong { color: rgba(255,255,255,.9); }
  </style>
</head>
<body>
  <nav>
    <span class="nav-logo">${name}</span>
    <ul class="nav-links">
      <li><a href="#">Accueil</a></li>
      <li><a href="#">Services</a></li>
      <li><a href="#">Contact</a></li>
    </ul>
  </nav>

  <section class="hero">
    <h1>${name}</h1>
    ${desc ? `<p>${desc}</p>` : ''}
    ${bookingUrl ? `<a href="${bookingUrl}" class="hero-cta">Réserver →</a>` : ''}
  </section>

  <section class="section">
    <h2>Nous contacter</h2>
    <div class="info-card">
      ${desc ? `<p>${desc}</p>` : ''}
      ${phone ? `<div class="contact">📞 ${phone}</div>` : ''}
      ${bookingUrl ? `<div class="contact"><a href="${bookingUrl}" style="color:var(--green);">Réserver en ligne →</a></div>` : ''}
    </div>
  </section>

  <footer><strong>${name}</strong>${phone ? ` — ${phone}` : ''}</footer>

  <script src="../widget/chatbot.js"></script>
  <script src="config.js"></script>
</body>
</html>
`;
}

async function getFileSha(path, token) {
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha || null;
}

async function pushFile(path, content, message, token) {
  const sha = await getFileSha(path, token);
  const body = { message, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;

  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub push error (${path}): ${err}`);
  }
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = req.body;
  const { clientSlug } = data;
  if (!clientSlug) return res.status(400).json({ error: 'Missing clientSlug' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'Missing GITHUB_TOKEN' });

  try {
    const configContent = generateConfigJs(data);
    const htmlContent = generateIndexHtml(data);

    await Promise.all([
      pushFile(`demo-${clientSlug}/config.js`, configContent, `deploy ${clientSlug} - config`, token),
      pushFile(`demo-${clientSlug}/index.html`, htmlContent, `deploy ${clientSlug} - index`, token)
    ]);

    const url = `${VERCEL_URL}/demo-${clientSlug}/`;
    return res.status(200).json({ ok: true, url, slug: clientSlug });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
