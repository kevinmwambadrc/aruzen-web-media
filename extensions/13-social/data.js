// Réseaux, marques et modèles de départ (tout est modifiable dans le studio › Réglages).

// fold = caractères visibles avant « voir plus » (≈, varie selon l'écran) ; tags = nombre conseillé de hashtags.
// look = maquette d'aperçu (les réseaux ajoutés à la main utilisent la maquette générique) ; utm = [source, support].
// Ce ne sont que les valeurs de départ : tout se modifie dans le studio › Réglages.
export const DEFAULT_NETWORKS = {
  linkedin: { name: "LinkedIn", look: "linkedin", limit: 3000, fold: 210, tags: [3, 5], def: "1:1", utm: ["linkedin", "social"],
    ratios: { "1.91:1": [1200, 627], "1:1": [1080, 1080], "4:5": [1080, 1350] } },
  facebook: { name: "Facebook", look: "facebook", limit: 63206, fold: 250, tags: [1, 3], def: "4:5", utm: ["facebook", "social"],
    ratios: { "1.91:1": [1200, 630], "1:1": [1080, 1080], "4:5": [1080, 1350] } },
  instagram: { name: "Instagram", look: "instagram", limit: 2200, fold: 125, tags: [3, 15], maxTags: 30, def: "4:5", utm: ["instagram", "social"],
    ratios: { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] } },
  x: { name: "X", look: "x", limit: 280, fold: 0, tags: [1, 2], def: "16:9", weighted: true, utm: ["x", "social"],
    ratios: { "16:9": [1600, 900], "1:1": [1080, 1080] } },
  whatsapp: { name: "WhatsApp", look: "whatsapp", limit: 700, fold: 0, tags: [0, 3], def: "9:16", utm: ["whatsapp", "messaging"],
    ratios: { "9:16": [1080, 1920], "1:1": [1080, 1080] } },
  tiktok: { name: "TikTok", look: "generic", limit: 4000, fold: 100, tags: [3, 5], def: "9:16", utm: ["tiktok", "social"],
    ratios: { "9:16": [1080, 1920], "1:1": [1080, 1080] } },
  youtube: { name: "YouTube", look: "generic", limit: 5000, fold: 150, tags: [1, 3], def: "16:9", utm: ["youtube", "video"],
    ratios: { "16:9": [1280, 720], "9:16": [1080, 1920] } },
  threads: { name: "Threads", look: "generic", limit: 500, fold: 0, tags: [0, 1], def: "4:5", utm: ["threads", "social"],
    ratios: { "1:1": [1080, 1080], "4:5": [1080, 1350] } },
};

// Canaux UTM qui ne sont pas des réseaux sociaux.
export const UTM_EXTRA = { email: ["E-mail", "email", "email"], print: ["Imprimé", "print", "offline"] };

export const DEFAULT_BRANDS = [
  { name: "Nova Telecom", initials: "NT", color: "#2B4C9B", networks: ["linkedin", "facebook", "x"] },
  { name: "Nova Home", initials: "NH", color: "#E8A33D", networks: ["facebook", "instagram", "whatsapp", "x"] },
  { name: "Mon Studio", initials: "MS", color: "#111827", networks: ["linkedin", "instagram", "facebook"] },
  { name: "Boutique Démo", initials: "BD", color: "#16A34A", networks: ["instagram", "facebook", "whatsapp"] },
];

const id = () => crypto.randomUUID();
// Points de départ génériques : à adapter à ton ton et à tes campagnes.
export const DEFAULT_SNIPPETS = () => [
  { id: id(), brand: "Nova Telecom", kind: "hashtags", title: "Marque", text: "#NovaTelecom #Connectivité #Afrique" },
  { id: id(), brand: "Nova Telecom", kind: "hashtags", title: "Expertises", text: "#Connectivité #Cloud #Cybersécurité #TransformationDigitale" },
  { id: id(), brand: "Nova Telecom", kind: "légende", title: "Annonce + lien", text: "{titre}\n\n{message}\n\n👉 En savoir plus : {lien}" },
  { id: id(), brand: "Nova Telecom", kind: "légende", title: "Événement", text: "📅 {date}\n📍 {lieu}\n\n{message}\n\nInscription : {lien}" },
  { id: id(), brand: "Nova Home", kind: "hashtags", title: "Marque", text: "#NovaHome #FibreOptique #Maison" },
  { id: id(), brand: "Nova Home", kind: "légende", title: "Offre", text: "🏠 {titre}\n\n✅ {avantage 1}\n✅ {avantage 2}\n✅ {avantage 3}\n\n📲 Contacte-nous sur WhatsApp : {lien}" },
  { id: id(), brand: "Mon Studio", kind: "hashtags", title: "Studio", text: "#MonStudio #Branding #DesignGraphique" },
  { id: id(), brand: "Mon Studio", kind: "légende", title: "Projet livré", text: "Nouveau projet livré pour {client} ✨\n\n{ce que nous avons fait}\n\nUn projet en tête ? Écris-nous : {lien}" },
  { id: id(), brand: "*", kind: "légende", title: "Appel à l'action", text: "💬 Dis-nous en commentaire ce que tu en penses !" },
];

export async function getLibrary() {
  let { brands, snippets, networks } = await chrome.storage.local.get(["brands", "snippets", "networks"]);
  if (!brands || !snippets || !networks) {
    brands ||= DEFAULT_BRANDS;
    snippets ||= DEFAULT_SNIPPETS();
    networks ||= DEFAULT_NETWORKS;
    await chrome.storage.local.set({ brands, snippets, networks });
  }
  return { brands, snippets, networks };
}

// Sauvegarde complète des réglages (fichier JSON réimportable sur un autre navigateur).
export const SETTINGS_KEYS = ["brands", "snippets", "networks", "campaigns"];

// {date} et {lien} se remplissent tout seuls ; les autres {champs} restent à compléter.
export async function fill(text) {
  const { lastLink = "" } = await chrome.storage.local.get("lastLink");
  return text.replace(/\{date\}/g, new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }))
    .replace(/\{lien\}/g, lastLink || "{lien}");
}
