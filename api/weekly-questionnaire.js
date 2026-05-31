const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';

function getMondayOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date().setDate(diff)).toISOString().split('T')[0];
}

const sbH = () => ({
  'apikey': process.env.SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
});

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

async function ghGet(path) {
  const r = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    headers: { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
  });
  if (!r.ok) return null;
  return r.json();
}

async function ghPut(path, content, sha, message) {
  const body = { message, content: Buffer.from(content).toString('base64'), sha };
  const doPut = b => fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(b)
  });
  let r = await doPut(body);
  if (r.status === 409) {
    const fresh = await ghGet(path);
    r = await doPut({ ...body, sha: fresh?.sha });
  }
  if (!r.ok) throw new Error(`GitHub push error: ${await r.text()}`);
}

function parseConfig(source) {
  const wrapper = source.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
  if (wrapper) {
    try { const c = JSON.parse(wrapper[1]); if (c) return c; } catch (_) {}
  }
  const btMatch = source.match(/faq\s*:\s*`([\s\S]*?)`/);
  if (btMatch) return { faq: btMatch[1] };
  const sqMatch = source.match(/faq\s*:\s*'([\s\S]*?)'/);
  if (sqMatch) return { faq: sqMatch[1] };
  const dqMatch = source.match(/"faq"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (dqMatch) return { faq: dqMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
  return null;
}

function renderPage(businessName, accentColor, slug, suggestions) {
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#2563eb';
  const safeName = esc(businessName);
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '');
  const hasQuestions = suggestions.length > 0;

  const questionsHtml = !hasQuestions
    ? `<div style="background:#fff;border-radius:12px;padding:2.5rem;text-align:center;border:1px solid #e5e7eb">
        <div style="font-size:2.5rem;margin-bottom:.75rem">✅</div>
        <p style="font-size:15px;color:#374151;font-weight:600">Aucune question cette semaine</p>
        <p style="font-size:13px;color:#9ca3af;margin-top:.4rem">Votre chatbot répond bien à vos clients !</p>
      </div>`
    : suggestions.map(s => `
      <div class="qb">
        ${s.question_source ? `<p class="src">Un client a demandé : « ${esc(s.question_source)} »</p>` : ''}
        <div class="ql">${esc(s.suggestion)}</div>
        <textarea name="${esc(s.id)}" placeholder="Votre réponse…">${esc(s.faq_entry || '')}</textarea>
      </div>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mise à jour hebdomadaire — ${safeName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--a:${safeColor}}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f9;color:#111;line-height:1.6;min-height:100vh;padding-bottom:3rem}
.hd{background:var(--a);color:#fff;padding:2rem 1.25rem 1.75rem;text-align:center}
.hd h1{font-size:1.3rem;font-weight:700;margin-bottom:.4rem}
.hd p{font-size:13px;opacity:.85;max-width:460px;margin:0 auto}
.wrap{max-width:580px;margin:0 auto;padding:1.5rem 1.25rem}
.qb{background:#fff;border-radius:12px;padding:1.25rem 1.375rem;margin-bottom:.875rem;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.src{font-size:12.5px;color:#9ca3af;font-style:italic;margin-bottom:.5rem}
.ql{font-size:14px;font-weight:600;color:#111;margin-bottom:.75rem}
textarea{width:100%;border:1px solid #dde2e8;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;color:#111;outline:none;background:#f9fafb;transition:border-color .15s;resize:vertical;min-height:80px}
textarea:focus{border-color:var(--a);background:#fff}
.sbtn{width:100%;padding:13px;background:var(--a);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;margin-top:1.25rem;transition:opacity .15s;font-family:inherit}
.sbtn:hover:not(:disabled){opacity:.88}
.sbtn:disabled{opacity:.5;cursor:not-allowed}
#ok{display:none;padding:3rem 1.5rem;text-align:center}
.ok-c{width:68px;height:68px;background:var(--a);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;color:#fff;margin:0 auto 1.25rem;animation:pop .3s ease}
@keyframes pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
#ok h2{font-size:1.5rem;font-weight:700;margin-bottom:.75rem}
#ok p{font-size:15px;color:#6b7280;max-width:380px;margin:0 auto}
</style>
</head>
<body>
<div class="hd">
  <h1>Mise à jour hebdomadaire — ${safeName}</h1>
  <p>${hasQuestions ? 'Vos clients ont posé des questions cette semaine. Pouvez-vous nous aider à y répondre ?' : 'Résumé de la semaine pour votre chatbot'}</p>
</div>
<div class="wrap">
  <div id="fp">
    ${questionsHtml}
    ${hasQuestions ? `<button type="button" class="sbtn" id="send-btn" onclick="doSubmit()">Envoyer mes réponses →</button>` : ''}
  </div>
  <div id="ok">
    <div class="ok-c">✓</div>
    <h2>Merci !</h2>
    <p>Vos réponses ont bien été transmises. Votre chatbot va être mis à jour dans quelques instants.</p>
  </div>
</div>
${hasQuestions ? `<script>
async function doSubmit() {
  var answers = {};
  document.querySelectorAll('textarea[name]').forEach(function(ta) {
    var v = ta.value.trim();
    if (v) answers[ta.name] = v;
  });
  var btn = document.getElementById('send-btn');
  btn.disabled = true; btn.textContent = 'Envoi en cours…';
  try {
    var r = await fetch('/api/weekly-questionnaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: '${safeSlug}', answers: answers })
    });
    if (!r.ok) throw new Error('err');
    document.getElementById('fp').style.display = 'none';
    document.getElementById('ok').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(e) {
    btn.disabled = false; btn.textContent = 'Envoyer mes réponses →';
    alert('Une erreur est survenue. Veuillez réessayer.');
  }
}
</script>` : ''}
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { slug } = req.query;
    if (!slug) return res.status(400).send('<p style="font-family:sans-serif;padding:2rem">Paramètre slug manquant.</p>');
    if (!/^[a-z0-9-]+$/i.test(slug)) return res.status(400).send('<p style="font-family:sans-serif;padding:2rem">Slug invalide.</p>');

    try {
      const weekOf = getMondayOfWeek();
      const [sbRes, configFile] = await Promise.all([
        fetch(
          `${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?slug=eq.${slug}&status=eq.pending&week_of=eq.${weekOf}&select=*&order=created_at.asc`,
          { headers: sbH() }
        ),
        ghGet(`demo-${slug}/config.js`)
      ]);

      const suggestions = sbRes.ok ? await sbRes.json() : [];
      const source = configFile ? Buffer.from(configFile.content, 'base64').toString('utf-8') : null;
      const config = source ? parseConfig(source) : null;
      const businessName = config?.businessName || slug;
      const accentColor = config?.accentColor || '#2563eb';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderPage(businessName, accentColor, slug, suggestions));
    } catch (err) {
      return res.status(500).send('<p style="font-family:sans-serif;padding:2rem">Erreur serveur.</p>');
    }
  }

  if (req.method === 'POST') {
    const { slug, answers } = req.body || {};
    if (!slug || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'Missing or invalid slug/answers' });
    }
    if (!/^[a-z0-9-]+$/i.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

    try {
      const entries = [];
      const ids = [];
      for (const [id, text] of Object.entries(answers)) {
        const val = String(text || '').trim();
        if (val) { entries.push(val); ids.push(id); }
      }

      if (!entries.length) return res.status(200).json({ ok: true, approved: 0 });

      // Single GitHub write for all entries
      const path = `demo-${slug}/config.js`;
      const file = await ghGet(path);
      if (!file) return res.status(404).json({ error: 'Client not found' });
      const source = Buffer.from(file.content, 'base64').toString('utf-8');
      const config = parseConfig(source);
      if (!config) return res.status(422).json({ error: 'Could not parse config' });
      config.faq = (config.faq || '').trimEnd() + '\n' + entries.join('\n');
      await ghPut(path, `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`, file.sha, `weekly answers approved: ${slug}`);

      // Batch approve in Supabase
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/faq_suggestions?id=in.(${ids.join(',')})`, {
        method: 'PATCH',
        headers: { ...sbH(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'approved' })
      });

      return res.status(200).json({ ok: true, approved: ids.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
