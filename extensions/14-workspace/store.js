// Données du Workspace : tâches, clients, chronomètre, temps passés, prompts (tout reste sur le Mac).
const get = (k) => chrome.storage.local.get(k);
const set = (o) => chrome.storage.local.set(o);

const DEFAULT_CLIENTS = [
  { name: "Client Démo A", rate: 0, currency: "USD" },
  { name: "Client Démo B", rate: 0, currency: "USD" },
  { name: "Interne", rate: 0, currency: "USD" },
];

const id = () => crypto.randomUUID();
const DEFAULT_PROMPTS = () => [
  { id: id(), category: "Design", title: "Brief créatif", text: "Tu es directeur artistique. Rédige un brief créatif pour {projet} destiné à {cible}. Objectif : {objectif}. Ton : {ton}. Donne : message clé, 3 pistes visuelles, palette, typographies, formats à livrer et contraintes." },
  { id: id(), category: "Image IA", title: "Prompt d'image produit", text: "Photo publicitaire de {produit}, {décor}, lumière {lumière}, cadrage {cadrage}, personnes africaines, style éditorial haut de gamme, couleurs {couleurs}, haute définition, sans texte." },
  { id: id(), category: "Social", title: "Publication LinkedIn", text: "Écris une publication LinkedIn pour {marque} sur {sujet}. Accroche forte dans les 2 premières lignes, 3 points clés, appel à l'action vers {lien}, 3 à 5 hashtags. Ton professionnel et chaleureux, en français." },
  { id: id(), category: "Social", title: "Déclinaison 5 réseaux", text: "Adapte ce texte pour LinkedIn, Facebook, Instagram, X (280 caractères) et un statut WhatsApp, en gardant le message : {texte}" },
  { id: id(), category: "Recherche", title: "Synthèse de sources", text: "Fais une synthèse structurée des sources suivantes sur {sujet} : points d'accord, désaccords, chiffres clés avec la source, et ce qui reste à vérifier.\n\n{sources}" },
  { id: id(), category: "Code", title: "Revue de code", text: "Relis ce code {langage}. Signale les bugs, les failles de sécurité et les lenteurs, du plus grave au moins grave, avec la correction proposée.\n\n{code}" },
  { id: id(), category: "Gestion", title: "Compte rendu de réunion", text: "À partir de ces notes de réunion avec {client}, rédige un compte rendu : décisions, actions (qui, quoi, quand), points en suspens.\n\n{notes}" },
];

export async function clients() {
  const { clients: c } = await get("clients");
  if (c) return c;
  await set({ clients: DEFAULT_CLIENTS });
  return DEFAULT_CLIENTS;
}

export async function prompts() {
  const { prompts: p } = await get("prompts");
  if (p) return p;
  const seeded = DEFAULT_PROMPTS();
  await set({ prompts: seeded });
  return seeded;
}

export const tasks = async () => (await get("tasks")).tasks || [];
export async function saveTask(task) {
  const list = await tasks();
  const i = list.findIndex((t) => t.id === task.id);
  if (i >= 0) list[i] = task; else list.unshift(task);
  await set({ tasks: list });
  return task;
}
export async function deleteTask(taskId) {
  await set({ tasks: (await tasks()).filter((t) => t.id !== taskId) });
}

export const entries = async () => (await get("entries")).entries || [];
export async function addEntry(e) {
  const list = await entries();
  list.unshift({ id: id(), ...e });
  await set({ entries: list });
}
export async function deleteEntry(entryId) {
  await set({ entries: (await entries()).filter((e) => e.id !== entryId) });
}

export const timer = async () => (await get("timer")).timer || null;
export async function startTimer({ client, project, note }) {
  const t = { client, project, note, start: Date.now() };
  await set({ timer: t });
  return t;
}
// Arrête le chrono et enregistre la séance (les séances de moins d'une minute sont ignorées).
export async function stopTimer(at = Date.now()) {
  const t = await timer();
  if (!t) return null;
  await set({ timer: null });
  if (at - t.start >= 60000) await addEntry({ client: t.client, project: t.project, note: t.note, start: t.start, end: at });
  return t;
}

export function fmtDur(ms, short = false) {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  if (short) return h ? `${h}:${String(m % 60).padStart(2, "0")}` : `${m}m`;
  return h ? `${h} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

// Date locale aaaa-mm-jj (toISOString seul donnerait la date UTC).
export const iso = (x) => new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const today = () => iso(new Date());
export function dueChips() {
  const d = new Date();
  const plus = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); return iso(x); };
  const friday = plus((5 - d.getDay() + 7) % 7 || 7);
  return [["Aujourd'hui", iso(d)], ["Demain", plus(1)], ["Vendredi", friday], ["Dans 1 sem.", plus(7)]];
}

// {variables} d'un prompt, dans l'ordre d'apparition.
export const variables = (text) => [...new Set([...text.matchAll(/\{([^{}\n]{1,40})\}/g)].map((m) => m[1]))];
