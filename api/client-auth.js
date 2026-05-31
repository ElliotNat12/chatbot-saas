const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const VERCEL_URL = process.env.VERCEL_URL || 'https://chatbot-saas-nine.vercel.app';

function svcH() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

function b64u(obj) {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJWT(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const header = b64u('{"alg":"HS256","typ":"JWT"}');
  const body   = b64u(payload);
  const sig    = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${body}.${sig}`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function getAuthRow(slug) {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/client_auth?slug=eq.${encodeURIComponent(slug)}&select=*`,
    { headers: svcH() }
  );
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}

function renderSetupPage(slug, token) {
  const safe = (s) => s.replace(/[^a-z0-9-]/gi, '');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Activation — ChatbotSaaS</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:#fff;border-radius:16px;padding:2.5rem 2rem;width:100%;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.logo{font-size:17px;font-weight:700;color:#2563eb;margin-bottom:2rem;text-align:center;letter-spacing:-.01em}
h1{font-size:1.3rem;font-weight:700;text-align:center;margin-bottom:.4rem}
.sub{font-size:14px;color:#6b7280;text-align:center;margin-bottom:2rem;line-height:1.5}
label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:.4rem;margin-top:.9rem}
input{width:100%;border:1px solid #dde2e8;border-radius:8px;padding:10px 12px;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s}
input:focus{border-color:#2563eb}
button{width:100%;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:1.5rem;transition:opacity .15s}
button:hover:not(:disabled){opacity:.88}
button:disabled{opacity:.5;cursor:not-allowed}
.err{font-size:13px;color:#dc2626;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:.6rem .9rem;margin-top:1rem;display:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">ChatbotSaaS</div>
  <h1>Activez votre espace client</h1>
  <p class="sub">Choisissez un mot de passe pour accéder à votre tableau de bord.</p>
  <form id="f">
    <label>Nouveau mot de passe</label>
    <input type="password" id="pw" minlength="8" placeholder="Minimum 8 caractères" required>
    <label>Confirmer le mot de passe</label>
    <input type="password" id="pw2" placeholder="Répétez votre mot de passe" required>
    <button type="submit" id="btn">Activer mon compte →</button>
    <div class="err" id="err"></div>
  </form>
</div>
<script>
var SLUG = '${safe(slug)}';
var TOKEN = '${safe(token)}';
document.getElementById('f').addEventListener('submit', async function(e) {
  e.preventDefault();
  var pw = document.getElementById('pw').value;
  var pw2 = document.getElementById('pw2').value;
  var err = document.getElementById('err');
  var btn = document.getElementById('btn');
  err.style.display = 'none';
  if (pw !== pw2) { err.textContent = 'Les mots de passe ne correspondent pas.'; err.style.display = 'block'; return; }
  if (pw.length < 8) { err.textContent = 'Minimum 8 caractères.'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Activation…';
  try {
    var r = await fetch('/api/client-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', slug: SLUG, token: TOKEN, password: pw })
    });
    var data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Erreur');
    localStorage.setItem('client-token-' + SLUG, data.token);
    window.location.href = '/client/' + SLUG;
  } catch(e) {
    err.textContent = e.message;
    err.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Activer mon compte →';
  }
});
</script>
</body>
</html>`;
}

function renderErrorPage(msg) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lien invalide</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#f4f6f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem}
.card{background:#fff;border-radius:16px;padding:2.5rem 2rem;max-width:400px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
.logo{font-size:17px;font-weight:700;color:#2563eb;margin-bottom:2rem}
.icon{font-size:2.5rem;margin-bottom:1rem}
h1{font-size:1.15rem;font-weight:700;margin-bottom:.5rem}
p{font-size:14px;color:#6b7280;line-height:1.6}
</style>
</head>
<body>
<div class="card">
  <div class="logo">ChatbotSaaS</div>
  <div class="icon">⚠️</div>
  <h1>Lien expiré ou invalide</h1>
  <p>${esc(msg || "Ce lien d'activation n'est plus valide. Contactez votre prestataire pour en recevoir un nouveau.")}</p>
</div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: render setup page ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const { slug, token } = req.query;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!slug || !token) return res.status(400).send(renderErrorPage('Paramètres manquants.'));
    if (!/^[a-z0-9-]+$/i.test(slug)) return res.status(400).send(renderErrorPage('Slug invalide.'));
    try {
      const row = await getAuthRow(slug);
      if (!row || row.setup_token !== token || !row.setup_token_expires_at || new Date(row.setup_token_expires_at) < new Date()) {
        return res.status(400).send(renderErrorPage());
      }
      return res.status(200).send(renderSetupPage(slug, token));
    } catch (err) {
      return res.status(500).send(renderErrorPage('Erreur serveur.'));
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, slug, token, password } = req.body || {};
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

  // ── POST action=setup: activate account ─────────────────────────────────
  if (action === 'setup') {
    if (!token || !password) return res.status(400).json({ error: 'Missing token or password' });
    if (password.length < 8) return res.status(400).json({ error: 'Password too short (min 8)' });
    try {
      const row = await getAuthRow(slug);
      if (!row || row.setup_token !== token || !row.setup_token_expires_at || new Date(row.setup_token_expires_at) < new Date()) {
        return res.status(400).json({ error: 'Lien expiré ou invalide' });
      }
      const hash = await bcrypt.hash(password, 10);
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_auth?slug=eq.${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { ...svcH(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ password_hash: hash, setup_token: null, setup_token_expires_at: null })
      });
      const jwt = signJWT({ slug, exp: Math.floor(Date.now() / 1000) + 86400 });
      return res.status(200).json({ success: true, token: jwt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST action=login: verify password, return JWT ───────────────────────
  if (action === 'login') {
    if (!password) return res.status(400).json({ error: 'Missing password' });
    try {
      const row = await getAuthRow(slug);
      if (!row || !row.password_hash) return res.status(401).json({ error: 'Compte non activé. Utilisez le lien reçu par email.' });
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Mot de passe incorrect' });
      const jwt = signJWT({ slug, exp: Math.floor(Date.now() / 1000) + 86400 });
      return res.status(200).json({ token: jwt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
};
