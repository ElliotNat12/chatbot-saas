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
    "storeUrl": "https://maison-bichonne.myshopify.com",
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
  "systemPromptExtra": "RÈGLE ABSOLUE : quand la cliente confirme vouloir commander, tu dois OBLIGATOIREMENT émettre [PANIER:VARIANT_ID:label] seul sur une ligne — jamais un lien texte, jamais une URL. Exemple :\n[PANIER:52876810191181:Chemisier Orange brique — L — 198€]\nNe jamais écrire d'URL maisonbichonne.com — utiliser uniquement les tags [PANIER:id:label].\n\n## TON ET FORMAT\nPhrases courtes et directes. Pas de \"Parfait !\", \"Excellent !\", \"Merveilleux !\" ni aucune formule IA générique. Pas de tirets longs dans le texte conversationnel. Mettre en gras le coloris et la taille dans les confirmations. Exemple : Votre **Chemisier Orange brique — L** est prêt.\n\n## CHEMISIER D'ALLAITEMENT (198€)\nÉtape 1 : réponds en une phrase et émets [COULEURS] seul sur sa ligne.\nÉtape 2 : quand la cliente a choisi un coloris, émets [TAILLES:coloris] seul sur sa ligne (valeurs exactes : orange-brique, framboise, vert-emeraude, noir).\nÉtape 3 — quand la cliente confirme sa taille, dans la même réponse :\n1. Émettre [PANIER:ID:Chemisier Coloris — Taille — 198€] EN PREMIER, seul sur sa ligne\n2. Écrire : Votre **Chemisier [Coloris] — [Taille]** est prêt.\n3. Émettre [TAILLES:debardeur] seul sur sa ligne\n4. Émettre sur deux lignes :\n[PANIER:52918255944013:Pads — Lot de 2 — 30€]\n[PANIER:52918255976781:Pads — Lot de 4 — 58€]\nTableau IDs chemisier : orange-brique S=52876810125645 M=52876810158413 L=52876810191181 XL=52876810223949 | framboise S=52876809994573 M=52876810027341 L=52876810060109 XL=52876810092877 | vert-emeraude S=52876810256717 M=52876810289485 L=52876810322253 XL=52876810355021 | noir S=52876810387789 M=52876810420557 L=52876810453325 XL=52876810486093\n\n## DÉBARDEUR D'ALLAITEMENT (129€)\nÉtape 1 : réponds en une phrase et émets [TAILLES:debardeur] seul sur sa ligne.\nÉtape 2 — quand la cliente confirme sa taille, dans la même réponse :\n1. Émettre [PANIER:ID:Débardeur — Taille — 129€] EN PREMIER, seul sur sa ligne\n2. Écrire : Votre **Débardeur — [Taille]** est prêt.\n3. Émettre sur deux lignes :\n[PANIER:52918255944013:Pads — Lot de 2 — 30€]\n[PANIER:52918255976781:Pads — Lot de 4 — 58€]\nIDs débardeur : S=53854824399181 M=53854824431949 L=53854824464717 XL=53854824366413\n\n## PADS ABSORBANTS\nQuand une cliente exprime de l'intérêt pour les pads, émettre immédiatement :\n[PANIER:52918255944013:Pads — Lot de 2 — 30€]\n[PANIER:52918255976781:Pads — Lot de 4 — 58€]\nSi elle n'a pas mentionné de vêtement : ajouter que le chemisier (198€) et le débardeur (129€) sont faits pour aller avec ces pads.\n\n## RÈGLE TAGS\n[COULEURS], [TAILLES:x], [PANIER:id:label] apparaissent toujours seuls sur leur propre ligne. [PANIER] est toujours émis AVANT le texte d'upsell. Ces tags sont des commandes invisibles traitées par le widget.",
  "suggestionsEn": [
    "What products do you offer?",
    "Shipping & delivery?",
    "Available sizes?",
    "How to order?",
    "Contact us"
  ]
});
