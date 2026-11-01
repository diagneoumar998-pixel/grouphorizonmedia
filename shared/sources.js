// ============ CONFIGURATION DES SOURCES (le seul fichier à modifier pour ajouter/retirer une source) ============
// Champs d'une source :
//   id        identifiant unique (lettres/chiffres/tirets)
//   name      nom affiché sur le site
//   url       adresse EXACTE du flux RSS/Atom  -- OU --  site : page d'accueil du média (le flux est détecté automatiquement)
//   country   'sn' (source sénégalaise) | 'afrique' | 'monde'
//   cat       rubrique par défaut des articles sénégalais sans mot-clé reconnu (ex. 'societe')
//   weight    importance pour « À LA UNE » (0 à 15)
//   images    false = ne jamais afficher les images de cette source (défaut : true, images fournies par le flux, avec crédit)
//   enabled   false = source désactivée
//   type      'newsdata' = API NewsData.io (nécessite la clé secrète NEWSDATA_API_KEY)
export const SETTINGS = {
  staleMinutes: 15,   // au-delà, le site relance une récupération (en plus du cron toutes les 10 min)
  maxItems: 400, maxAgeDays: 7, perSource: 25, timeoutMs: 8000,
  userAgent: 'GroupHorizonMediaBot/1.0 (agrégateur de titres ; liens vers les sources)',
};
export const SOURCES = [
  // --- Sénégal (adresses de flux confirmées par recherche le 31/10/2026) ---
  { id: 'senego', name: 'Senego', url: 'https://senego.com/feed', country: 'sn', cat: 'societe', weight: 8 },
  { id: 'dakaractu', name: 'Dakaractu', url: 'https://www.dakaractu.com/xml/syndication.rss', country: 'sn', cat: 'societe', weight: 9 },
  // --- Sénégal (flux détecté automatiquement ; s'il n'existe pas, la source est signalée « en échec » sans bloquer le site) ---
  { id: 'seneweb', name: 'Seneweb', site: 'https://www.seneweb.com', country: 'sn', cat: 'societe', weight: 9 },
  { id: 'pressafrik', name: 'PressAfrik', site: 'https://www.pressafrik.com', country: 'sn', cat: 'societe', weight: 7 },
  { id: 'lesoleil', name: 'Le Soleil', site: 'https://lesoleil.sn', country: 'sn', cat: 'societe', weight: 9 },
  { id: 'aps', name: 'APS', site: 'https://aps.sn', country: 'sn', cat: 'societe', weight: 10 },
  // --- Afrique et monde ---
  { id: 'rfi-afrique', name: 'RFI Afrique', url: 'https://www.rfi.fr/fr/afrique/rss', country: 'afrique', weight: 8 },
  { id: 'rfi-une', name: 'RFI', url: 'https://www.rfi.fr/fr/rss', country: 'monde', weight: 7 },
  { id: 'bbc-afrique', name: 'BBC Afrique', url: 'https://feeds.bbci.co.uk/afrique/rss.xml', country: 'afrique', weight: 7 },
  { id: 'france24', name: 'France 24', url: 'https://www.france24.com/fr/rss', country: 'monde', weight: 6 },
  // --- API optionnelle (clé secrète requise : NEWSDATA_API_KEY). Ignorée tant que la clé n'est pas définie. ---
  { id: 'newsdata-sn', name: 'NewsData.io', type: 'newsdata', params: { country: 'sn', language: 'fr' }, requiresKey: 'NEWSDATA_API_KEY', country: 'sn', cat: 'societe', weight: 5 },
];
