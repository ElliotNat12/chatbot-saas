ChatbotSaaS.init({
  apiEndpoint: '/api/chat',
  botName: 'Tank',
  avatar: '🪖',
  businessName: 'Le Tankiste So Char Away',
  businessDescription: 'Centre de conduite de véhicules blindés historiques en forêt de Brotonne, Normandie.',
  accentColor: '#4a5e3a',
  phone: '+33 6 95 05 73 98',
  phoneHours: 'du lundi au dimanche, saison avril-septembre',
  bookingUrl: 'https://letankistesocharaway.fr/en/booking',
  greeting: 'Bonjour ! Je suis Tank, l\'assistant du Tankiste So Char Away. Vous souhaitez conduire ou monter à bord d\'un vrai blindé ?',
  suggestions: [
    'C\'est combien ?',
    'Comment réserver ?',
    'Vous êtes ouverts quand ?',
    'How much does it cost?',
    'Prendre contact',
  ],
  suggestionsEn: [
    'How much does it cost?',
    'How to book?',
    'When are you open?',
    'C\'est combien ?',
    'Contact us',
  ],
  faq: `CONTACT
Telephone: +33 6 95 05 73 98
Email: contact@letankistesocharaway.fr
Adresse: Route d'Aizier, 76940 Vatteville-la-Rue, France
Réservation: https://letankistesocharaway.fr/en/booking

SERVICES
Package Driving: conduire soi-même un véhicule blindé avec briefing professionnel
Package Ride: expérience passager à bord d'un blindé avec visite guidée
Véhicules: FV 432 APC et FV 434 ARV (véhicules militaires britanniques historiques)
Activités groupes: enterrements de vie de jeune fille/garçon, team building, séminaires
Cartes cadeaux disponibles

TARIFS
Driving 15 minutes: 80€ par personne
Driving 30 minutes: 140€ par personne
Ride 15 minutes: 30€ par personne
Ride 30 minutes: 40€ par personne
Maximum 8 passagers par véhicule, à partir de 5 ans avec adulte

HORAIRES
Saison: avril à septembre 2026
Vendredi, samedi, dimanche: 09h00 à 18h00
Juillet-août: créneaux supplémentaires sur demande
Sur réservation uniquement

CONDITIONS
Permis de conduire obligatoire pour le package Driving
Pas d'alcool avant l'activité
Âge minimum 5 ans pour les passagers (avec adulte)
Tout équipement de sécurité fourni sur place
Annulation +15 jours: remboursement intégral de l'acompte
Annulation 7-15 jours: remboursement 50%
Annulation -7 jours: pas de remboursement`,

  launcherText: 'Réserver votre expérience',
  homeSubtitle: 'Conduisez un vrai blindé · Normandie',
  poweredBy: 'ChatbotSaaS',
  badgeDelay: 4000,
  errorMessage: 'Je rencontre un problème. Contactez-nous au +33 6 95 05 73 98.',
});
