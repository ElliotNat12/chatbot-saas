'use strict';

module.exports = {
  RESTAURANT: {
    label: 'Restaurant',
    timeMinutes: 8,
    questions: [
      { name: 'price',            label: 'Prix moyen par personne au restaurant',                                                     type: 'text',     placeholder: 'Ex : 25€ par personne' },
      { name: 'private_room',     label: 'Salle privatisable ? Capacité maximum ?',                                                   type: 'text',     placeholder: 'Ex : Oui, jusqu\'à 40 personnes' },
      { name: 'minimum_catering', label: 'Minimum de personnes pour un service traiteur',                                             type: 'text',     placeholder: 'Ex : 20 personnes minimum' },
      { name: 'delay_catering',   label: 'Délai de commande minimum pour un traiteur',                                                type: 'text',     placeholder: 'Ex : 48h à l\'avance' },
      { name: 'delay_takeaway',   label: 'Délai de commande pour les plats à emporter',                                               type: 'text',     placeholder: 'Ex : 30 minutes à l\'avance' },
      { name: 'daily_menu',       label: 'Les menus du jour changent-ils chaque jour ? À quelle heure sont-ils disponibles ?',        type: 'text',     placeholder: 'Ex : Oui, changent chaque jour, disponibles dès 11h30' },
      { name: 'delivery',         label: 'Zone de livraison couverte et frais approximatifs',                                         type: 'text',     placeholder: 'Ex : 5 km autour du restaurant, frais : 3€' },
      { name: 'payment',          label: 'Modes de paiement acceptés',                                                                type: 'checkbox', options: ['CB', 'Espèces', 'Chèque', 'Ticket resto', 'PayPal', 'Virement'] },
      { name: 'parking',          label: 'Y a-t-il un parking ? Gratuit ou payant ?',                                                 type: 'radio',    options: ['Oui gratuit', 'Oui payant', 'Non', 'À proximité'] },
      { name: 'animals',          label: 'Animaux acceptés ?',                                                                        type: 'radio',    options: ['Oui', 'Non', 'Terrasse uniquement'] },
      { name: 'pmr',              label: 'Accès PMR (personnes à mobilité réduite) ?',                                                type: 'radio',    options: ['Oui', 'Non', 'Partiel'] },
      { name: 'diet',             label: 'Options végétarienne / vegan / sans gluten disponibles ?',                                  type: 'checkbox', options: ['Végétarien', 'Vegan', 'Sans gluten', 'Autre'] },
      { name: 'allergies',        label: 'Comment gérez-vous les allergies ?',                                                        type: 'textarea', placeholder: 'Décrivez votre politique allergènes…' },
      { name: 'kids',             label: 'Menu enfant ? Si oui, quel prix ?',                                                         type: 'text',     placeholder: 'Ex : Menu enfant à 12€ (moins de 12 ans)' },
      { name: 'social',           label: 'Réseaux sociaux (Instagram, Facebook — lien)',                                              type: 'text',     placeholder: 'Ex : instagram.com/monrestaurant' },
      { name: 'extra',            label: 'Infos supplémentaires importantes pour vos clients',                                        type: 'textarea', placeholder: 'Événements spéciaux, promotions, conditions particulières…' },
      { name: 'faq',              label: 'Questions que vos clients posent souvent',                                                  type: 'textarea', placeholder: 'Ex : "Peut-on privatiser la salle ?" — "Acceptez-vous les chèques cadeaux ?"' },
    ]
  },

  COACH_SPORT: {
    label: 'Coach sportif',
    timeMinutes: 7,
    questions: [
      { name: 'specialties',      label: 'Spécialités et types de coaching proposés',                                                 type: 'textarea', placeholder: 'Ex : Musculation, cardio, yoga, crossfit, préparation physique…' },
      { name: 'levels',           label: 'Niveaux acceptés',                                                                          type: 'checkbox', options: ['Débutant', 'Intermédiaire', 'Expert', 'Tous niveaux'] },
      { name: 'session_format',   label: 'Séances individuelles ou en groupe ? Si groupe, taille maximum ?',                          type: 'text',     placeholder: 'Ex : Les deux — groupe jusqu\'à 8 personnes maximum' },
      { name: 'session_duration', label: 'Durée d\'une séance standard',                                                              type: 'text',     placeholder: 'Ex : 1 heure' },
      { name: 'trial_price',      label: 'Tarif séance découverte',                                                                   type: 'text',     placeholder: 'Ex : 30€ ou gratuite' },
      { name: 'location',         label: 'Lieu des séances',                                                                          type: 'checkbox', options: ['Salle de sport', 'Extérieur', 'Domicile client', 'En ligne'] },
      { name: 'equipment',        label: 'Équipements fournis ou à apporter ?',                                                       type: 'text',     placeholder: 'Ex : Tapis fourni, chaussures de sport à apporter' },
      { name: 'medical',          label: 'Conditions médicales ou contre-indications à signaler ?',                                   type: 'textarea', placeholder: 'Ex : Certificat médical requis, blessures à déclarer…' },
      { name: 'first_session',    label: 'Comment se déroule la première séance ?',                                                   type: 'textarea', placeholder: 'Décrivez le déroulement de la première séance…' },
      { name: 'cancellation',     label: 'Politique d\'annulation et remboursement',                                                  type: 'textarea', placeholder: 'Ex : Annulation gratuite jusqu\'à 24h avant, sinon séance décomptée…' },
      { name: 'packages',         label: 'Forfaits ou abonnements disponibles ?',                                                     type: 'textarea', placeholder: 'Ex : Pack 10 séances à 250€, abonnement mensuel à 120€…' },
      { name: 'social',           label: 'Réseaux sociaux (Instagram, YouTube — lien)',                                               type: 'text',     placeholder: 'Ex : instagram.com/moncoach' },
      { name: 'faq',              label: 'Questions que vos clients posent souvent',                                                  type: 'textarea', placeholder: 'Ex : "Faut-il être sportif pour commencer ?" — "Comment progresser rapidement ?"' },
    ]
  },

  ARTISAN_BTP: {
    label: 'Artisan / BTP',
    timeMinutes: 5,
    questions: [
      { name: 'work_types',    label: 'Types de travaux réalisés',                                                                    type: 'textarea', placeholder: 'Ex : Plomberie, électricité, carrelage, peinture…' },
      { name: 'area',          label: 'Zone géographique d\'intervention',                                                            type: 'text',     placeholder: 'Ex : Bordeaux et 30 km alentour' },
      { name: 'quote_delay',   label: 'Délai moyen pour obtenir un devis',                                                            type: 'text',     placeholder: 'Ex : Sous 48h après visite' },
      { name: 'work_delay',    label: 'Délai moyen d\'intervention après acceptation du devis',                                       type: 'text',     placeholder: 'Ex : 2 à 3 semaines' },
      { name: 'certifications',label: 'Certifications et assurances (RGE, décennale, etc.)',                                         type: 'text',     placeholder: 'Ex : Certifié RGE, assurance décennale Allianz' },
      { name: 'quote_price',   label: 'Le devis est-il gratuit ou payant ?',                                                          type: 'radio',    options: ['Gratuit', 'Payant', 'Gratuit sous conditions'] },
      { name: 'deposit',       label: 'Acompte demandé à la commande ? Quel pourcentage ?',                                           type: 'text',     placeholder: 'Ex : 30% à la signature du devis' },
      { name: 'weekend',       label: 'Travaux réalisés le week-end ?',                                                               type: 'radio',    options: ['Semaine uniquement', 'Week-end aussi', 'Sur demande'] },
      { name: 'materials',     label: 'Fournissez-vous les matériaux ou le client les achète ?',                                      type: 'radio',    options: ['Fournis par nous', 'À la charge du client', 'Les deux selon les cas'] },
      { name: 'warranty',      label: 'Garanties proposées',                                                                          type: 'textarea', placeholder: 'Ex : Garantie décennale, garantie de parfait achèvement 1 an…' },
      { name: 'faq',           label: 'Questions que vos clients posent souvent',                                                     type: 'textarea', placeholder: 'Ex : "Faites-vous des petits travaux ?" — "Intervenez-vous en urgence ?"' },
    ]
  },

  COMMERCE: {
    label: 'Commerce',
    timeMinutes: 4,
    questions: [
      { name: 'hours',         label: 'Horaires d\'ouverture complets',                                                               type: 'textarea', placeholder: 'Ex : Lundi–Samedi 9h–19h, dimanche 10h–13h' },
      { name: 'delivery',      label: 'Livraison disponible ? Zone et délais ?',                                                      type: 'textarea', placeholder: 'Ex : Livraison France entière sous 3–5 jours ouvrés, offerte dès 50€' },
      { name: 'click_collect', label: 'Click & collect disponible ?',                                                                 type: 'radio',    options: ['Oui', 'Non', 'En cours de mise en place'] },
      { name: 'returns',       label: 'Politique de retour et remboursement',                                                         type: 'textarea', placeholder: 'Ex : Retour gratuit sous 30 jours, remboursement sous 5 jours ouvrés…' },
      { name: 'loyalty',       label: 'Programme de fidélité ?',                                                                      type: 'text',     placeholder: 'Ex : Carte de fidélité, 1 point par euro dépensé' },
      { name: 'installments',  label: 'Paiement en plusieurs fois disponible ?',                                                      type: 'radio',    options: ['Oui', 'Non', 'À partir d\'un certain montant'] },
      { name: 'reservation',   label: 'Réservation de produits possible ?',                                                           type: 'radio',    options: ['Oui', 'Non'] },
      { name: 'faq',           label: 'Questions que vos clients posent souvent',                                                     type: 'textarea', placeholder: 'Ex : "Proposez-vous des cartes cadeaux ?" — "Puis-je essayer en boutique ?"' },
    ]
  },

  GENERIQUE: {
    label: 'Général',
    timeMinutes: 5,
    questions: [
      { name: 'price',    label: 'Prix moyen par personne',                             type: 'text',     placeholder: 'Ex : 25€ par personne' },
      { name: 'minimum',  label: 'Minimum de personnes pour groupe / traiteur',         type: 'text',     placeholder: 'Ex : 10 personnes minimum' },
      { name: 'delay',    label: 'Délai de commande minimum',                           type: 'text',     placeholder: 'Ex : 48h à l\'avance' },
      { name: 'payment',  label: 'Modes de paiement acceptés',                         type: 'checkbox', options: ['CB', 'Espèces', 'Chèque', 'Virement', 'PayPal'] },
      { name: 'parking',  label: 'Y a-t-il un parking ?',                              type: 'radio',    options: ['Oui gratuit', 'Oui payant', 'Non', 'À proximité'] },
      { name: 'animals',  label: 'Animaux acceptés ?',                                 type: 'radio',    options: ['Oui', 'Non', 'Terrasse uniquement'] },
      { name: 'pmr',      label: 'Accès PMR (personnes à mobilité réduite) ?',         type: 'radio',    options: ['Oui', 'Non', 'Partiel'] },
      { name: 'diet',     label: 'Options végétarienne / vegan disponibles ?',         type: 'checkbox', options: ['Végétarien', 'Vegan', 'Sans gluten', 'Autre'] },
      { name: 'allergies',label: 'Comment gérez-vous les allergies ?',                 type: 'textarea', placeholder: 'Décrivez votre politique allergènes…' },
      { name: 'kids',     label: 'Menu enfant ? Si oui, quel prix ?',                  type: 'text',     placeholder: 'Ex : Menu enfant à 12€ (moins de 12 ans)' },
      { name: 'extra',    label: 'Infos supplémentaires importantes pour vos clients', type: 'textarea', placeholder: 'Événements spéciaux, promotions, conditions particulières…' },
      { name: 'faq',      label: 'Questions que vos clients posent souvent',           type: 'textarea', placeholder: 'Ex : "Peut-on privatiser la salle ?" — "Acceptez-vous les chèques cadeaux ?"' },
    ]
  }
};
