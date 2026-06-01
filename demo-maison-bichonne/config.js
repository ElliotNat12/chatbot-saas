ChatbotSaaS.init({
  "apiEndpoint": "/api/chat",
  "botName": "Maison Bichonne",
  "avatar": "💆",
  "businessName": "Maison Bichonne",
  "businessDescription": "",
  "accentColor": "#c0847a",
  "phone": "+33 6 63 77 06 91",
  "phoneHours": "",
  "bookingUrl": "",
  "greeting": "Bonjour ! Je suis Maison Bichonne. Comment puis-je vous aider ?",
  "suggestions": [
    "Quels sont vos produits ?",
    "Livraison et délais ?",
    "Tailles disponibles ?",
    "Comment commander ?",
    "Nous contacter"
  ],
  "faq": "ENTREPRISE: Maison Bichonne\nCOULEUR: #c0847a\nEMOJI: 💆\n\nCONTACT: Telephone: +33 6 63 77 06 91, Email: contact@maisonbichonne.com, Adresse: 11 Place Georges Renon, 79000 Niort, France\n\nSERVICES: Chemisiers d'allaitement avec système intégré (débardeur, pads absorbants amovibles, ouverture magnétique), débardeurs d'allaitement, pads absorbants, collection Les Rayonnantes avec 4 coloris (Orange brique, Framboise, Vert émeraude, Noir)\n\nTARIFS: Chemisier allaitement 198 euros, Débardeur 129 euros, Pads (lot de 2) 30 euros\n\nCONDITIONS: Produits en précommande exclusivement avec délai de livraison d'environ 3 mois (réception prévue février 2026). Délai indicatif d'expédition 1 à 2 jours puis livraison 3 à 7 jours en France métropolitaine. Droit de rétractation 30 jours après réception. Produits acceptés au retour s'ils sont neufs, non portés, non lavés, non détériorés, dans emballage d'origine. Frais de retour à charge du client. Remboursement dans 14 jours après vérification. Aucun échange proposé. Tailles disponibles: S, M, L, XL avec guide des tailles détaillé fourni. Matières: lin, coton biologique, fibres Tencel. Fabrication française (Deux-Sèvres et Vienne). Frais de livraison inclus dans le prix.\n\nFAQ: Comment fonctionne l'absorption? Est-ce que ça se voit sous les vêtements? Est-ce respirant? Est-ce que ça tient toute la journée? À quoi ça sert vraiment, au-delà de l'aspect pratique?",
  "poweredBy": "ChatbotSaaS",
  "badgeDelay": 4000,
  "errorMessage": "Je rencontre un problème. Contactez-nous au +33 6 63 77 06 91.",
  "ecommerce": true,
  "shopify": {
    "chemisier": {
      "orange-brique": { "S": 52876810125645, "M": 52876810158413, "L": 52876810191181, "XL": 52876810223949 },
      "framboise": { "S": 52876809994573, "M": 52876810027341, "L": 52876810060109, "XL": 52876810092877 },
      "vert-emeraude": { "S": 52876810256717, "M": 52876810289485, "L": 52876810322253, "XL": 52876810355021 },
      "noir": { "S": 52876810387789, "M": 52876810420557, "L": 52876810453325, "XL": 52876810486093 }
    },
    "debardeur": {
      "S": 53854824399181,
      "M": 53854824431949,
      "L": 53854824464717,
      "XL": 53854824366413
    },
    "pads": {
      "lot-2": { "id": 52918255944013, "price": 30 },
      "lot-4": { "id": 52918255976781, "price": 58 }
    }
  },
  "systemPromptExtra": "## GUIDE FLOW PRODUITS — BOUTONS PANIER SHOPIFY\n\n### CHEMISIER D'ALLAITEMENT (198€)\nQuand une cliente exprime de l'intérêt pour le chemisier :\nÉtape 1 — Couleur : réponds en une phrase et émets [COULEURS] seul sur la ligne suivante.\nÉtape 2 — Taille : quand la cliente a choisi un coloris, émets [TAILLES:coloris] (coloris exact parmi orange-brique, framboise, vert-emeraude, noir) seul sur la ligne suivante.\nÉtape 3 — Panier : quand la cliente a choisi une taille, émets [PANIER:ID:Chemisier Coloris - Taille - 198€] seul sur la ligne suivante selon ce tableau :\norange-brique : S=52876810125645 M=52876810158413 L=52876810191181 XL=52876810223949\nframboise : S=52876809994573 M=52876810027341 L=52876810060109 XL=52876810092877\nvert-emeraude : S=52876810256717 M=52876810289485 L=52876810322253 XL=52876810355021\nnoir : S=52876810387789 M=52876810420557 L=52876810453325 XL=52876810486093\n\n### DÉBARDEUR D'ALLAITEMENT (129€)\nQuand une cliente exprime de l'intérêt pour le débardeur :\nÉtape 1 — Taille directement (pas de choix de couleur) : réponds en une phrase et émets [TAILLES:debardeur] seul sur la ligne suivante.\nÉtape 2 — Panier : quand la cliente a choisi une taille, émets [PANIER:ID:Débardeur - Taille - 129€] seul sur la ligne suivante selon : S=53854824399181 M=53854824431949 L=53854824464717 XL=53854824366413\n\n### PADS ABSORBANTS\nQuand une cliente exprime de l'intérêt pour les pads, émets directement les deux options sur deux lignes séparées :\n[PANIER:52918255944013:Pads — Lot de 2 — 30€]\n[PANIER:52918255976781:Pads — Lot de 4 — 58€]\n\n### UPSELL PADS APRÈS VÊTEMENT\nAprès qu'une cliente ait sélectionné un vêtement (chemisier ou débardeur), propose les pads en une phrase puis émets les deux options pads ci-dessus.\n\n### PADS SEULS → SUGGÉRER LES VÊTEMENTS\nSi une cliente demande uniquement les pads sans mentionner de vêtement, mentionne en une phrase que le chemisier (198€) et le débardeur (129€) se complètent parfaitement, et demande si elle souhaite les découvrir.\n\n### RÈGLE TAGS\n[COULEURS], [TAILLES:x], [PANIER:id:label] doivent toujours apparaître seuls sur leur propre ligne, jamais intégrés dans une phrase. Ces tags sont des commandes invisibles traitées par le widget.",
  "suggestionsEn": [
    "What products do you offer?",
    "Shipping & delivery?",
    "Available sizes?",
    "How to order?",
    "Contact us"
  ]
});
