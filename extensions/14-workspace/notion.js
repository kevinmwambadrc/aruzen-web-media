// Envoi des tâches vers une base Notion (intégration interne : jeton collé par l'utilisateur dans les réglages).
const API = "https://api.notion.com/v1/";

async function call(token, path, body, method = body ? "POST" : "GET") {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: "Bearer " + token, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Notion : erreur " + res.status);
  return data;
}

export async function listDatabases(token) {
  const r = await call(token, "search", { filter: { property: "object", value: "database" }, page_size: 50 });
  return r.results.map((d) => ({ id: d.id, title: (d.title || []).map((t) => t.plain_text).join("") || "Sans titre" }));
}

// Propriétés de la base, avec une correspondance devinée d'après les noms.
export async function schema(token, dbId) {
  const db = await call(token, "databases/" + dbId);
  const props = Object.entries(db.properties).map(([name, p]) => ({ name, type: p.type }));
  const find = (types, re) => props.find((p) => types.includes(p.type) && re.test(p.name))?.name || "";
  return {
    props,
    guess: {
      title: props.find((p) => p.type === "title")?.name || "",
      client: find(["select", "multi_select", "rich_text"], /client|projet|compte|marque/i),
      due: find(["date"], /éch|ech|due|date|délai|deadline/i),
      url: find(["url"], /url|lien|source|link/i),
    },
  };
}

function value(type, v) {
  switch (type) {
    case "title": return { title: [{ text: { content: v.slice(0, 2000) } }] };
    case "rich_text": return { rich_text: [{ text: { content: v.slice(0, 2000) } }] };
    case "select": return { select: { name: v.slice(0, 100) } };
    case "multi_select": return { multi_select: [{ name: v.slice(0, 100) }] };
    case "date": return { date: { start: v } };
    case "url": return { url: v };
    default: return null;
  }
}

export async function createTask(cfg, task) {
  const types = Object.fromEntries(cfg.props.map((p) => [p.name, p.type]));
  const properties = {};
  const put = (field, v) => {
    const name = cfg.map[field];
    if (name && v && types[name]) { const val = value(types[name], v); if (val) properties[name] = val; }
  };
  put("title", task.title);
  put("client", task.client);
  put("due", task.due);
  put("url", task.url);
  const children = [];
  if (task.quote) children.push({ object: "block", type: "quote", quote: { rich_text: [{ text: { content: task.quote.slice(0, 2000) } }] } });
  if (task.notes) children.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: task.notes.slice(0, 2000) } }] } });
  if (task.url) children.push({ object: "block", type: "bookmark", bookmark: { url: task.url } });
  const page = await call(cfg.token, "pages", { parent: { database_id: cfg.dbId }, properties, children });
  return { id: page.id, url: page.url };
}
