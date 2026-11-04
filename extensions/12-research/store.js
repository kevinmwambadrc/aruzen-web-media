// Accès communs au carnet (popup, panneau, service worker).
export const COLORS = { jaune: "#ffe066", vert: "#b2f2bb", bleu: "#a5d8ff", rose: "#fcc2d7" };

// Même normalisation que content.js : sans ancre ni paramètres de suivi.
export function norm(u) {
  try {
    const x = new URL(u);
    x.hash = "";
    for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid|gclid|mc_|igsh)/.test(k)) x.searchParams.delete(k);
    return x.href;
  } catch (_) {
    return u;
  }
}

export async function allPages() {
  const all = await chrome.storage.local.get(null);
  const meta = all.pages || {};
  return Object.keys(all).filter((k) => k.startsWith("hl:") && all[k].length).map((k) => {
    const url = k.slice(3);
    return { url, key: k, title: meta[url]?.title || url, updated: meta[url]?.updated || 0, highlights: all[k] };
  }).sort((a, b) => b.updated - a.updated);
}

export async function projects() {
  const { projects: list = ["Général"], project = "Général" } = await chrome.storage.local.get(["projects", "project"]);
  return { list: list.includes(project) ? list : [...list, project], active: project };
}

export async function addProject(name) {
  const { list } = await projects();
  await chrome.storage.local.set({ projects: [...new Set([...list, name])], project: name });
}

const fmtDate = (t) => new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
export const siteOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (_) { return u; } };

// Markdown propre : se colle tel quel dans Notion, Obsidian ou un document.
export function toMarkdown(pages, project) {
  const out = [`# Recherche${project ? " — " + project : ""}`, `_Exporté le ${fmtDate(Date.now())} · Aruzen Research_`, ""];
  for (const p of pages) {
    out.push(`## [${p.title.replace(/[[\]]/g, "")}](${p.url})`, `${siteOf(p.url)} · consulté le ${fmtDate(p.highlights[0]?.created || p.updated)}`, "");
    for (const h of p.highlights) {
      out.push("> " + h.quote.replace(/\s+/g, " ").trim());
      if (h.note) out.push("", "**Note :** " + h.note);
      out.push("");
    }
  }
  return out.join("\n");
}

export function download(text, filename, type = "text/markdown") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  chrome.downloads.download({ url, filename, conflictAction: "uniquify" });
}
