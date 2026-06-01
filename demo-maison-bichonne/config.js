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
  "systemPromptExtra": "Quand une cliente pose une question sur les tailles ou mentionne sa taille habituelle ou son poids, TOUJOURS suivre ce flow en plusieurs étapes :\n1. Explique que la taille dépend des mesures du vêtement à plat, pas de la taille habituelle\n2. Demande son tour de poitrine en cm (mesure au point le plus fort)\n3. Une fois obtenu, demande son tour de sous-poitrine en cm (juste sous la poitrine)\n4. Avec ces deux mesures, compare avec le tableau : S(38/35), M(41/38), L(44/41), XL(47/44) en doublant les largeurs à plat pour obtenir le tour complet\n5. Recommande une taille précise en citant les chiffres exacts du guide\n6. Si hésitation entre deux tailles, recommande toujours la supérieure\n7. Propose d'envoyer le guide complet par email si elle le souhaite\nNe jamais recommander une taille sans avoir obtenu au minimum le tour de poitrine.",
  "suggestionsEn": [
    "What products do you offer?",
    "Shipping & delivery?",
    "Available sizes?",
    "How to order?",
    "Contact us"
  ]
});
