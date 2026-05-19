/**
 * CONFIG — Le Petit Lilas (Restaurant)
 * Copiez ce fichier et adaptez les valeurs pour chaque nouveau client.
 */
ChatbotSaaS.init({

  // Clé API Anthropic
  // ⚠️ En production : utiliser un backend, jamais exposer la clé en front
  apiKey: 'VOTRE_CLE_API_ICI',

  // Identité du bot
  botName: 'Lili',
  avatar: '🌸',
  businessName: 'Le Petit Lilas',
  businessDescription: 'Restaurant français de quartier, cuisine maison et de saison.',

  // Couleur principale (hex)
  accentColor: '#7c3aed',

  // Contact
  phone: '01 23 45 67 89',
  phoneHours: 'du lundi au samedi, 10h–22h',
  bookingUrl: 'https://lepetitlilas.fr/reservation',

  // Message d'accueil
  greeting: 'Bonjour ! Je suis Lili, l\'assistante du Petit Lilas. Une question sur nos horaires, menus ou réservations ?',

  // Suggestions cliquables (max 5)
  suggestions: [
    'Vous êtes ouverts ce soir ?',
    'C\'est combien le menu ?',
    'Are you open for lunch?',
    'Vous avez une terrasse ?',
    'Comment réserver ?',
  ],

  // Base de connaissances — texte libre, pas besoin de formatage
  faq: `
Horaires : Lun-Sam 12h-14h30 et 19h-22h30. Fermé dimanche.
Adresse : 12 rue des Lilas, Paris 11e. Métro Voltaire ligne 9.
Parking : pas de parking dédié — parking Voltaire à 200m.
Menus : Déjeuner 18€ (entrée+plat ou plat+dessert) ou 22€ (3 plats).
Soir : entrées 8-14€, plats 18-26€, desserts 7-9€. Menu enfant 10€.
Réservation : en ligne sur lepetitlilas.fr/reservation ou par téléphone.
Groupes +8 personnes : téléphone uniquement.
Terrasse : oui, cour intérieure chauffée, ~20 couverts. Animaux admis en terrasse uniquement.
Allergènes : carte disponible sur demande. Options végétariennes chaque jour.
Paiement : CB Visa Mastercard espèces. Pas de chèques. Wifi : non.
  `,

  badgeDelay: 3000,
  errorMessage: 'Je rencontre un problème technique. Appelez-nous au 01 23 45 67 89.',

});
