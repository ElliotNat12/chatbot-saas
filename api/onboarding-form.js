const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';
const QUESTIONNAIRES = require('../config/questionnaires');

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function parseConfig(source) {
  const wrapper = source.match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
  if (wrapper) {
    try { const c = JSON.parse(wrapper[1]); if (c) return c; } catch (_) {}
  }
  const btMatch = source.match(/faq\s*:\s*`([\s\S]*?)`/);
  if (btMatch) {
    if (wrapper) {
      try {
        const sm = source.replace(/faq\s*:\s*`[\s\S]*?`/, '"faq":"__FAQ__"').match(/ChatbotSaaS\.init\(([\s\S]*)\);\s*$/);
        if (sm) { const c = JSON.parse(sm[1]); c.faq = btMatch[1]; return c; }
      } catch (_) {}
    }
    return { faq: btMatch[1] };
  }
  const sqMatch = source.match(/faq\s*:\s*'([\s\S]*?)'/);
  if (sqMatch) return { faq: sqMatch[1] };
  const dqMatch = source.match(/"faq"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (dqMatch) return { faq: dqMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') };
  return null;
}

function detectSector(faq) {
  const t = (faq || '').toLowerCase();
  if (/restaurant|traiteur|menu|plat/.test(t))         return 'RESTAURANT';
  if (/coach|coaching|fitness|sport|séance/.test(t))   return 'COACH_SPORT';
  if (/travaux|artisan|chantier|devis|btp/.test(t))    return 'ARTISAN_BTP';
  if (/boutique|magasin|produit|stock/.test(t))        return 'COMMERCE';
  return 'GENERIQUE';
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
  if (r.status === 409) { const fresh = await ghGet(path); r = await doPut({ ...body, sha: fresh?.sha }); }
  if (!r.ok) throw new Error(`GitHub push error: ${await r.text()}`);
}

function formatAnswers(answers, questions) {
  if (!answers || typeof answers !== 'object') return '';
  const lines = ['INFORMATIONS COMPLÉMENTAIRES (questionnaire client)'];
  const longParts = [];
  for (const q of questions) {
    const v = answers[q.name];
    if (v === undefined || v === null || v === '') continue;
    if (q.type === 'checkbox') {
      const arr = Array.isArray(v) ? v : [v];
      const clean = arr.map(s => String(s).trim()).filter(Boolean);
      if (clean.length) lines.push(`${q.label} : ${clean.join(', ')}`);
    } else if (q.type === 'textarea') {
      const s = String(v).trim().slice(0, 1000);
      if (s) longParts.push(`${q.label} :\n${s}`);
    } else {
      const s = String(v).trim().slice(0, 300);
      if (s) lines.push(`${q.label} : ${s}`);
    }
  }
  return lines.join('\n') + (longParts.length ? '\n\n' + longParts.join('\n\n') : '');
}

function renderPage(businessName, accentColor, slug, sectorInfo) {
  const safeName  = esc(businessName);
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#2563eb';
  const safeSlug  = slug.replace(/[^a-z0-9-]/gi, '');
  const accentLt  = safeColor + '18';
  const { label: sectorLabel, timeMinutes, questions } = sectorInfo;

  const renderQ = (q, i) => {
    let input;
    if (q.type === 'text') {
      input = `<input type="text" name="${esc(q.name)}" placeholder="${esc(q.placeholder || '')}">`;
    } else if (q.type === 'textarea') {
      input = `<textarea name="${esc(q.name)}" placeholder="${esc(q.placeholder || '')}"></textarea>`;
    } else {
      input = `<div class="opts">${(q.options || []).map(o =>
        `<label class="opt"><input type="${q.type}" name="${esc(q.name)}" value="${esc(o)}"><span>${esc(o)}</span></label>`
      ).join('')}</div>`;
    }
    return `<div class="qb">
<div class="ql"><span class="qn">${i}</span>${esc(q.label)}</div>
${input}
</div>`;
  };

  const singleFields = JSON.stringify(
    questions.filter(q => q.type !== 'checkbox').map(q => q.name)
  );
  const multiFields = JSON.stringify(
    questions.filter(q => q.type === 'checkbox').map(q => q.name)
  );

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Questionnaire — ${safeName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--a:${safeColor};--al:${accentLt}}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f9;color:#111;line-height:1.6;min-height:100vh;padding-bottom:3rem}
.hd{background:var(--a);color:#fff;padding:2rem 1.25rem 1.75rem;text-align:center}
.hd h1{font-size:1.35rem;font-weight:700;margin-bottom:.4rem}
.hd p{font-size:13px;opacity:.85;max-width:460px;margin:0 auto}
.wrap{max-width:580px;margin:0 auto;padding:1.5rem 1.25rem}
.intro{font-size:12px;color:#6b7280;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1.25rem}
.qb{background:#fff;border-radius:12px;padding:1.25rem 1.375rem;margin-bottom:.875rem;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.ql{font-size:14px;font-weight:600;color:#111;margin-bottom:.75rem;display:flex;align-items:baseline;gap:.5rem}
.qn{display:inline-flex;align-items:center;justify-content:center;background:var(--a);color:#fff;font-size:11px;font-weight:700;border-radius:999px;min-width:20px;padding:0 6px;height:20px;flex-shrink:0;line-height:1}
input[type=text],textarea{width:100%;border:1px solid #dde2e8;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;color:#111;outline:none;background:#f9fafb;transition:border-color .15s}
input[type=text]:focus,textarea:focus{border-color:var(--a);background:#fff}
textarea{resize:vertical;min-height:80px}
.opts{display:flex;flex-direction:column;gap:.45rem}
.opt{display:flex;align-items:center;gap:.6rem;padding:.525rem .75rem;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:border-color .12s,background .12s;user-select:none}
.opt:hover{border-color:var(--a);background:var(--al)}
.opt input{accent-color:var(--a);width:15px;height:15px;flex-shrink:0}
.opt span{font-size:14px}
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
  <h1>${safeName}</h1>
  <p>Questionnaire ${esc(sectorLabel)} &bull; ${questions.length} questions &bull; ${timeMinutes} minutes</p>
</div>
<div class="wrap">
<div id="fp">
<p class="intro">${questions.length} questions · ${timeMinutes} minutes</p>
<form id="f">

${questions.map((q, i) => renderQ(q, i + 1)).join('\n')}

<button type="submit" class="sbtn">Envoyer mes réponses →</button>
</form>
</div>

<div id="ok">
  <div class="ok-c">✓</div>
  <h2>Merci !</h2>
  <p>Vos informations ont bien été transmises. Votre chatbot va être mis à jour dans quelques instants.</p>
</div>
</div>
<script>
document.getElementById('f').addEventListener('submit', async function(e) {
  e.preventDefault();
  var fd = new FormData(e.target);
  var answers = {};
  var singleFields = ${singleFields};
  var multiFields = ${multiFields};
  singleFields.forEach(function(k) {
    var v = fd.get(k);
    if (v && v.trim()) answers[k] = v.trim();
  });
  multiFields.forEach(function(k) {
    var v = fd.getAll(k);
    if (v.length) answers[k] = v;
  });
  var btn = document.querySelector('.sbtn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours…';
  try {
    var res = await fetch('/api/onboarding-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: '${safeSlug}', answers: answers })
    });
    if (!res.ok) throw new Error('err');
    document.getElementById('fp').style.display = 'none';
    document.getElementById('ok').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch(err) {
    btn.disabled = false;
    btn.textContent = 'Envoyer mes réponses →';
    alert('Une erreur est survenue. Veuillez réessayer ou contacter votre prestataire.');
  }
});
</script>
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
      const file = await ghGet(`demo-${slug}/config.js`);
      const source = file ? Buffer.from(file.content, 'base64').toString('utf-8') : null;
      const config = source ? parseConfig(source) : null;
      const businessName = config?.businessName || slug;
      const accentColor  = config?.accentColor  || '#2563eb';
      const sector       = detectSector(config?.faq || '');
      const sectorInfo   = QUESTIONNAIRES[sector];
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderPage(businessName, accentColor, slug, sectorInfo));
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
      const path = `demo-${slug}/config.js`;
      const file = await ghGet(path);
      if (!file) return res.status(404).json({ error: 'Client not found' });
      const source = Buffer.from(file.content, 'base64').toString('utf-8');
      const config = parseConfig(source);
      if (!config) return res.status(422).json({ error: 'Could not parse config' });
      const sector     = detectSector(config.faq || '');
      const sectorInfo = QUESTIONNAIRES[sector];
      const entry = formatAnswers(answers, sectorInfo.questions);
      if (entry) {
        config.faq = (config.faq || '').trimEnd() + '\n\n' + entry;
        await ghPut(path, `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`, file.sha, `onboarding: ${slug}`);
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
