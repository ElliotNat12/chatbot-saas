const REPO = 'ElliotNat12/chatbot-saas';
const GITHUB_API = 'https://api.github.com';
const QUESTIONNAIRES = require('../config/questionnaires');

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

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
  if (/allaitement|vêtement|vetement|taille|mode|collection/.test(t)) return 'COMMERCE';
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

const COVERAGE_PATTERNS = {
  sizes_guide:            /taille|guide des tailles|S,\s*M,\s*L|XL|mesure/i,
  materials:              /mati[eè]re|coton|lin|tencel|soie|composition|fibre/i,
  made_in:                /fabricat|fabriqu[eé]|made in|france|oeko|label|bio/i,
  stock:                  /pr[eé]commande|en stock|stock|disponib/i,
  delivery_delay:         /d[eé]lai.{0,25}livraison|livraison.{0,25}(jour|semaine)|exp[eé]dition/i,
  delivery_price:         /frais de (livraison|port)|port offert|livraison (gratuite|inclus|offerte)/i,
  delivery_international: /international|[eé]tranger|europe|monde|pays/i,
  tracking:               /suivi|tracking|num[eé]ro de (suivi|colis)/i,
  return_delay:           /r[eé]tractation|retour.{0,30}(jour|jours)/i,
  return_conditions:      /retour.{0,60}(neuf|emballage|condition|non port[eé]|non lav[eé])/i,
  exchange:               /[eé]change/i,
  payment_methods:        /(mode|moyen).{0,20}paiement|carte bancaire|paypal|virement|apple pay|google pay/i,
  payment_security:       /s[eé]curi.{0,20}paiement|ssl|stripe|payplug|3d secure/i,
  promo:                  /promo|code promo|r[eé]duction|fid[eé]lit[eé]|newsletter.{0,20}code/i,
  sav_contact:            /contact|email|mail|t[eé]l[eé]phone/i,
  faq_frequent:           /\?/,
};

function detectCoveredQuestions(faq, questions) {
  const covered = new Set();
  const text = faq || '';
  for (const q of questions) {
    const pattern = COVERAGE_PATTERNS[q.name];
    if (pattern && pattern.test(text)) covered.add(q.name);
  }
  return covered;
}

function renderOnboardingPage(businessName, accentColor, slug, sectorInfo, existingFaq) {
  const safeName  = esc(businessName);
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#2563eb';
  const safeSlug  = slug.replace(/[^a-z0-9-]/gi, '');
  const accentLt  = safeColor + '18';
  const { label: sectorLabel, timeMinutes, questions } = sectorInfo;
  const covered   = detectCoveredQuestions(existingFaq, questions);
  const activeQuestions = questions.filter(q => !covered.has(q.name));

  const renderQ = (q, i, isCovered) => {
    if (isCovered) {
      return `<div class="qb qb-covered">
<div class="ql"><span class="qn qn-ok">✓</span>${esc(q.label)}<span class="covered-badge">Déjà renseigné</span></div>
</div>`;
    }
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

  const singleFields = JSON.stringify(activeQuestions.filter(q => q.type !== 'checkbox').map(q => q.name));
  const multiFields  = JSON.stringify(activeQuestions.filter(q => q.type === 'checkbox').map(q => q.name));

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
.qb-covered{background:#f9fafb;border-color:#d1fae5;box-shadow:none;opacity:.75}
.qb-covered .ql{margin-bottom:0;color:#6b7280}
.covered-badge{font-size:11px;font-weight:500;color:#059669;background:#d1fae5;border-radius:999px;padding:1px 8px;margin-left:auto;white-space:nowrap;flex-shrink:0}
.ql{font-size:14px;font-weight:600;color:#111;margin-bottom:.75rem;display:flex;align-items:center;gap:.5rem}
.qn{display:inline-flex;align-items:center;justify-content:center;background:var(--a);color:#fff;font-size:11px;font-weight:700;border-radius:999px;min-width:20px;padding:0 6px;height:20px;flex-shrink:0;line-height:1}
.qn-ok{background:#059669}
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
  <p>Questionnaire ${esc(sectorLabel)} &bull; ${activeQuestions.length} question${activeQuestions.length > 1 ? 's' : ''} à remplir${covered.size ? ` · ${covered.size} déjà renseignée${covered.size > 1 ? 's' : ''}` : ''}</p>
</div>
<div class="wrap">
<div id="fp">
<p class="intro">${activeQuestions.length} question${activeQuestions.length > 1 ? 's' : ''} restante${activeQuestions.length > 1 ? 's' : ''} · ~${Math.ceil(activeQuestions.length / questions.length * timeMinutes)} minutes</p>
<form id="f">

${questions.map((q, i) => renderQ(q, i + 1, covered.has(q.name))).join('\n')}

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

function renderWeeklyPage(businessName, accentColor, slug, suggestions) {
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#2563eb';
  const safeName  = esc(businessName);
  const safeSlug  = slug.replace(/[^a-z0-9-]/gi, '');
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
    var r = await fetch('/api/onboarding-form?type=weekly', {
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

  const type = req.method === 'GET' ? req.query.type : req.body?.type;
  const isWeekly = type === 'weekly';

  // ── Weekly questionnaire (type=weekly) ──────────────────────────────────
  if (isWeekly) {
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
        const suggestions  = sbRes.ok ? await sbRes.json() : [];
        const source       = configFile ? Buffer.from(configFile.content, 'base64').toString('utf-8') : null;
        const config       = source ? parseConfig(source) : null;
        const businessName = config?.businessName || slug;
        const accentColor  = config?.accentColor  || '#2563eb';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderWeeklyPage(businessName, accentColor, slug, suggestions));
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

        const path = `demo-${slug}/config.js`;
        const file = await ghGet(path);
        if (!file) return res.status(404).json({ error: 'Client not found' });
        const source = Buffer.from(file.content, 'base64').toString('utf-8');
        const config = parseConfig(source);
        if (!config) return res.status(422).json({ error: 'Could not parse config' });
        config.faq = (config.faq || '').trimEnd() + '\n' + entries.join('\n');
        await ghPut(path, `ChatbotSaaS.init(${JSON.stringify(config, null, 2)});\n`, file.sha, `weekly answers approved: ${slug}`);

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
  }

  // ── Onboarding questionnaire (type=onboarding or default) ───────────────
  if (req.method === 'GET') {
    console.log('[onboarding] QUESTIONNAIRES keys=', Object.keys(QUESTIONNAIRES));
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
      console.log('[onboarding] sector=', sector, 'questions=', sectorInfo.questions.length);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(renderOnboardingPage(businessName, accentColor, slug, sectorInfo, config?.faq || ''));
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
