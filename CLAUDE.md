# ChatbotSaaS — Contexte projet pour Claude Code

## Identité du projet
- **Nom :** ChatbotSaaS
- **Statut :** EN PRODUCTION
- **URL prod :** https://chatbot-saas-nine.vercel.app
- **Repo :** ElliotNat12/chatbot-saas
- **Owner :** Elliot

## Stack technique
- **Frontend :** HTML / CSS / JS pur — zéro framework, zéro dépendance
- **Backend :** Vercel Serverless (Node.js dans /api/)
- **IA :** Anthropic Claude Haiku (via /api/chat, clé jamais exposée côté client)
- **Base de données :** Supabase (PostgreSQL)
- **Email :** Resend API
- **WhatsApp :** Twilio Sandbox
- **Deploy :** automatique sur chaque git push main (~1 min)

## Variables d'environnement Vercel
- ANTHROPIC_API_KEY — Appels Claude
- RESEND_API_KEY — Emails notifications leads
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_TO — WhatsApp
- SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_KEY — Base de données
- GITHUB_TOKEN — Lecture/écriture config clients GitHub
- ADMIN_SECRET — Mot de passe dashboard admin (admin2026)
- JWT_SECRET — Signature JWT espaces clients

## Architecture des fichiers

### Frontend
- admin/index.html — Dashboard admin (x-admin-secret: admin2026)
  Onglets : Vue globale | Nouveau client | CRM | Tester & évaluer | Guide & outils
  Fonctions clés : sendInvite(slug), onClientSelect(), generateSuggestionsForClient()

- client/index.html — Espace client par slug (/client/{slug})
  Auth : JWT 24h localStorage (clé: client-token-{slug})
  Sections : Stats | Questions sans réponse | Infos contact | FAQ editor | Test live
  Fonctions clés : parseFaq(), buildFaqText(), addFaqCard(), saveFaq(), saveContact()
  Parser FAQ : gère "Q: ...\nR: ..." ET texte libre (carte unique)

- widget/chatbot.js — Widget universel embarquable (monolithique, ~1119 lignes, IIFE)
  config.ecommerce = true → mode boutique (sticky cart, addToCart, trackConversion)
  trackConversion() : idempotente, ecommerce-only, fire-and-forget vers /api/log
  sendLog() : déclenché à fermeture ou après 20 messages
  converted = notifySent || cartConverted
  sessionId généré à l'init, envoyé dans tous les logs

- demo-{slug}/ — Un dossier par client
  config.js → ChatbotSaaS.init({businessName, botName, faq, phone, bookingUrl, accentColor, ecommerce, suggestions, avatar})
  index.html → faux site vitrine

### API Vercel Serverless
- api/chat.js — Rate limiting + routing → Anthropic API
- api/log.js — Log conversations Supabase
  action="cart_click" → PATCH converted=true sur session_id existant
  INSERT final : session_id, messages, lead_score, converted, unanswered_questions
  detectUnanswered() : patterns basiques (à améliorer)
- api/notify.js — Email Resend + WhatsApp Twilio si lead chaud
- api/client-auth.js — Auth client
  GET ?slug=&token= → page activation
  POST action=setup → hash bcrypt, invalide token
  POST action=login → vérifie bcrypt, retourne JWT
- api/client-data.js — CRUD FAQ + stats
  GET Bearer JWT → FAQ, infos contact, stats Supabase
  POST Bearer JWT → update FAQ ou contact sur GitHub
  GET ?data=stats → conversations, leads, conversion_rate, unanswered
- api/admin-deploy.js — action=invite (setup_token Supabase) | action=deploy
- api/crm.js — Données CRM
- api/onboarding-form.js — Formulaire onboarding
- api/scrape.js — Scraping site client pour pré-remplir FAQ
- api/suggest-improvements.js — Suggestions IA (Claude)
- api/weekly-report.js — Rapport hebdo (cron lundi 7h)

### Config
- config/questionnaires.js — Templates questionnaires onboarding
- config/suggestions-templates.js — Templates suggestions
- vercel.json — Rewrites /client/:slug + crons (lundi 7h rapport, lundi 9h suggestions)
- package.json — bcryptjs, resend, twilio

## Supabase — Tables
- conversations : id, session_id, business_name, messages JSONB, lead_score, converted, unanswered_questions, created_at
- client_auth : slug, password_hash, setup_token, setup_token_expires_at

## Clients actifs
- maison-bichonne → boutique vêtements allaitement, ecommerce=true
- neokebo, tankiste, restaurant, le-gou-pei → ecommerce=false
- onboarding → template démonstration

## Conventions
- Commits : feat: / fix: / docs: / refactor: en anglais
- CSS : variables --accent, --border, --bg, --muted, --text, --radius, --surface
- Auth admin : header x-admin-secret: admin2026
- Auth client : header Authorization: Bearer {jwt}
- JS vanilla uniquement — pas de framework, pas de bundler
- GitHub API pour lire/écrire config.js clients (pas de DB pour ça)

## Ajouter un client (15 min)
1. cp -r demo-restaurant demo-{slug}
2. Modifier config.js et index.html
3. git add . && git commit && git push
4. Dashboard admin → Nouveau client → remplir fiche
5. Tester & évaluer → 🔗 Lien d'activation → envoyer au client

## Ce qui est FAIT ✅
- Dashboard admin complet (stats, CRM, FAQ editor, test live, suggestions IA, crons)
- Espace client : JWT auth, stats 3 colonnes, questions sans réponse + ajout FAQ 1 clic, éditeur FAQ structuré, infos contact, test iframe
- Auth client : lien magique (7j) + login mot de passe + JWT
- Modal invite : lien magique + URL connexion permanente + mailto pré-rempli
- Bouton 🔗 dans "Tester & évaluer"
- Tracking conversion Shopify : clic panier → converted=true (ecommerce only, idempotent)
- Crons : rapport hebdo + suggestions auto

## À FAIRE ⬜
1. Onglet SEO PageSpeed Insights (espace client)
2. Améliorer detectUnanswered() patterns
3. Rate limiting Supabase-backed (remplacer in-memory Map)
4. Seuil cleanup Supabase → 2000 rows

## Dernières updates
### 09 juin 2026 — Audit & fixes
- e7719d0 docs: rewrite CLAUDE.md with proper technical architecture
- 3372c40 fix: hardcoded URL, XSS escaping, GitHub retry, sendLog on tab close
- Index Supabase créés : business_name, created_at, session_id + colonne session_id ajoutée

### 09 juin 2026
- 03d862e feat: stats conversion rate + unanswered questions in client dashboard
- 364d60d feat: structured FAQ editor in client dashboard
- bb282db fix: FAQ parser handles free-text format
- 6e8c29b feat: magic link button in Tester & evaluer tab
- 524a83e feat: login URL + mailto in invite modal
- 8086820 docs: add CLAUDE.md
- 1a0e581 feat: track Shopify cart click as conversion (ecommerce only)
