# ChatbotSaaS — Prompt Projet

Utilise ce document au début de chaque session pour donner le contexte complet à Claude.
À la fin de chaque session de travail, mets à jour la section "Dernières updates".


## 📋 PROMPT DE DÉBUT DE SESSION
Colle ce texte au début de chaque conversation :
Je travaille sur ChatbotSaaS, un SaaS de chatbots pour TPE/PME françaises.

**Repo GitHub :** ElliotNat12/chatbot-saas
**URL prod :** https://chatbot-saas-nine.vercel.app
**Stack :** HTML/JS statique + Vercel Serverless (Node.js) + Supabase + GitHub API

---

### Architecture des fichiers

- `admin/index.html` — Dashboard admin (protégé par mot de passe admin2026)
  - Onglets : Vue globale, Nouveau client, CRM, Tester & évaluer, Guide & outils
  - Fonctions clés : sendInvite(slug), onClientSelect(), generateSuggestionsForClient()

- `client/index.html` — Espace client (auth JWT par slug)
  - Sections : Stats semaine, Questions sans réponse, Infos contact, Éditeur FAQ, Test chatbot live
  - Parser FAQ : gère format Q:/R: ET texte libre
  - Auth : login mot de passe → JWT 24h stocké en localStorage

- `api/client-auth.js` — Auth client (lien magique + login + JWT)
  - GET ?slug=&token= → page activation (choisir mot de passe)
  - POST action=setup → hash mot de passe, invalide token
  - POST action=login → vérifie bcrypt, retourne JWT

- `api/client-data.js` — Lecture/écriture FAQ + stats
  - GET Bearer JWT → retourne FAQ, infos contact, stats
  - POST Bearer JWT → update FAQ ou infos contact sur GitHub
  - GET ?data=stats → conversations, leads, conversion_rate, unanswered (Supabase)

- `api/admin-deploy.js` — Actions admin
  - action=invite → génère setup_token, l'écrit en Supabase, retourne inviteUrl
  - action=deploy → redéploie un client

- `api/log.js` — Log des conversations
  - Enregistre en Supabase : messages, lead_score, converted, unanswered_questions
  - converted = lead qualifié notifié (PAS encore = clic Shopify pour ecommerce)
  - detectUnanswered() : patterns basiques (à améliorer)

- `api/chat.js` — Rate limiting + routing messages vers Claude API

- `widget/chatbot.js` — Widget chatbot embarquable (monolithique ~900 lignes)
  - config.ecommerce : mode boutique en ligne (sticky cart, addToCart)
  - sendLog() : déclenché à fermeture ou après 20 messages
  - notifySent → converted dans les logs

- `demo-{slug}/config.js` — Config de chaque client (ChatbotSaaS.init({...}))
  - Champs : businessName, botName, faq, phone, bookingUrl, accentColor, ecommerce, suggestions...

- `config/questionnaires.js` — Templates de questionnaires onboarding
- `config/suggestions-templates.js` — Templates de suggestions d'amélioration

---

### Clients actifs
- maison-bichonne (boutique en ligne, ecommerce=true)
- neokebo
- tankiste
- restaurant
- le-gou-pei
- onboarding (template)

---

### Supabase — Tables principales
- `conversations` : session_id, business_name, messages, lead_score, converted, unanswered_questions, created_at
- `client_auth` : slug, password_hash, setup_token, setup_token_expires_at
- Variables env : SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, GITHUB_TOKEN, ADMIN_SECRET, JWT_SECRET

---

### Ce qui est fait et fonctionnel
- ✅ Dashboard admin complet (stats, CRM, FAQ editor, test live, suggestions IA)
- ✅ Espace client : login JWT, stats (conversations/leads/taux conversion), questions sans réponse, éditeur FAQ structuré carte par carte, infos contact, test chatbot iframe
- ✅ Lien magique d'activation client (setup_token Supabase, 7 jours)
- ✅ Modal invite : lien magique + URL connexion permanente + bouton mailto pré-rempli
- ✅ Bouton "🔗 Lien d'activation" dans onglet "Tester & évaluer" du dashboard admin
- ✅ Parser FAQ : format Q:/R: ET texte libre dans une seule carte

---

### En cours / À faire
- 🔄 Tracking conversion Shopify (clic panier → converted=true, ecommerce only) — audit fait, pas encore implémenté
- ⬜ Onglet SEO dans espace client (PageSpeed Insights API)
- ⬜ Améliorer detectUnanswered() avec plus de patterns
- ⬜ Intégration partenaire SEO/analytics (ton ami dev)

---

### Conventions
- Commits en anglais : "feat:", "fix:", "docs:"
- Pas de framework JS — HTML/CSS/JS vanilla uniquement
- CSS : variables CSS (--accent, --border, --bg, --muted, --text, --radius)
- Auth admin : header x-admin-secret: admin2026
- Auth client : header Authorization: Bearer {jwt}
- GitHub API utilisée pour lire/écrire les config.js des clients

---

## 🔄 SECTION DERNIÈRES UPDATES

Mets à jour cette section à la fin de chaque session de travail.
Format : date — ce qui a été fait — ce qui reste


### 09 juin 2026
Session : Dashboard client + Dashboard admin

**Fait aujourd'hui :**
- ✅ Ajout stat "Taux de conversion" (3e colonne dans les stats client)
- ✅ Section "Questions sans réponse" avec bouton "+ FAQ" pour ajouter en 1 clic
- ✅ Éditeur FAQ structuré carte par carte (Q/R) avec parseFaq() + buildFaqText()
- ✅ Fix parser FAQ : gère texte libre (sans Q:/R:) en une seule carte "Informations générales"
- ✅ Bouton "🔗 Lien d'activation" ajouté dans onglet "Tester & évaluer" du dashboard admin
- ✅ Modal invite amélioré : URL de connexion permanente + bouton "📧 Envoyer par email" (mailto pré-rempli)
- ✅ Audit du tracking conversion : converted = lead notifié (pas clic Shopify) — à corriger

**Commits du jour :**
- `03d862e` feat: stats conversion rate + unanswered questions in client dashboard
- `364d60d` feat: structured FAQ editor in client dashboard
- `bb282db` fix: FAQ parser handles free-text format (no Q/R structure)
- `6e8c29b` feat: add magic link button in Tester & evaluer tab
- `524a83e` feat: add login URL + mailto in invite modal

**À faire en priorité prochaine session :**
- Implémenter tracking clic Shopify → converted=true (ecommerce only)
- Onglet SEO via PageSpeed Insights dans espace client

---

## 📝 PROMPT DE FIN DE SESSION
À la fin d'une session de travail (ou quand on a beaucoup avancé), colle ce prompt dans Claude.ai pour mettre à jour ce document :

> Mets à jour le fichier ChatbotSaaS_Prompt_Projet.md avec ce qu'on a fait aujourd'hui.
>
> Ajoute une nouvelle entrée dans "SECTION DERNIÈRES UPDATES" avec :
> - La date d'aujourd'hui
> - La liste de ce qui a été fait (avec les commits si possible)
> - Ce qui reste à faire en priorité
>
> Voici ce qu'on a fait : [DÉCRIS BRIÈVEMENT LA SESSION]

---

## 🚀 WORKFLOW CLAUDE CODE
Pour lancer une session de code :
```bash
cd ~/Desktop/chatbot-saas
claude
```
Claude Code lit automatiquement CLAUDE.md à la racine — pense à le maintenir à jour avec les mêmes infos que ce document.
