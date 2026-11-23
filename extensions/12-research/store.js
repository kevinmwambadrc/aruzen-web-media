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

// ---------- v2 : export au format choisi ----------
export const EXPORT_FORMATS = [
  { v: "md", l: "Markdown (.md)" }, { v: "html", l: "Page web (.html)" }, { v: "txt", l: "Texte (.txt)" },
  { v: "csv", l: "Tableur (.csv)" }, { v: "json", l: "Données (.json)" },
];
const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function exportAs(fmt, pages, project) {
  const title = `Recherche${project ? " — " + project : ""}`;
  if (fmt === "json") {
    const data = { projet: project || null, exporte: new Date().toISOString(), pages: pages.map((p) => ({
      titre: p.title, adresse: p.url, site: siteOf(p.url),
      citations: p.highlights.map((h) => ({ texte: h.quote, note: h.note || "", couleur: h.color || "", date: h.created ? new Date(h.created).toISOString() : null })),
    })) };
    return { text: JSON.stringify(data, null, 2), ext: "json", type: "application/json" };
  }
  if (fmt === "csv") {
    const q = (v) => '"' + String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ") + '"';
    const rows = [["Page", "Site", "Adresse", "Citation", "Note", "Date"]];
    for (const p of pages) for (const h of p.highlights) rows.push([p.title, siteOf(p.url), p.url, h.quote, h.note, h.created ? fmtDate(h.created) : ""]);
    return { text: "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n"), ext: "csv", type: "text/csv" };
  }
  if (fmt === "txt") {
    const out = [title, "Exporté le " + fmtDate(Date.now()), ""];
    for (const p of pages) {
      out.push(p.title, p.url, "");
      for (const h of p.highlights) { out.push("« " + h.quote.replace(/\s+/g, " ").trim() + " »"); if (h.note) out.push("Note : " + h.note); out.push(""); }
      out.push("—", "");
    }
    return { text: out.join("\n"), ext: "txt", type: "text/plain" };
  }
  if (fmt === "html") {
    const body = pages.map((p) => `<section><h2><a href="${escHtml(p.url)}">${escHtml(p.title)}</a></h2><p class="m">${escHtml(siteOf(p.url))}</p>${
      p.highlights.map((h) => `<blockquote style="border-color:${escHtml(COLORS[h.color] || "#ffe066")}">${escHtml(h.quote)}</blockquote>${h.note ? `<p class="n"><b>Note :</b> ${escHtml(h.note)}</p>` : ""}`).join("")}</section>`).join("");
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><title>${escHtml(title)}</title><style>
body{font:16px/1.55 -apple-system,system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1d1d1f}
h1{font-size:28px}h2{font-size:18px;margin:32px 0 2px}a{color:#6a3de8}.m{color:#888;font-size:13px;margin:0 0 10px}
blockquote{margin:10px 0;padding:6px 14px;border-left:4px solid;background:#fafafa}.n{margin:4px 0 12px 18px;color:#444}</style>
<h1>${escHtml(title)}</h1><p class="m">Exporté le ${fmtDate(Date.now())} · Aruzen Research</p>${body}</html>`;
    return { text: html, ext: "html", type: "text/html" };
  }
  return { text: toMarkdown(pages, project), ext: "md", type: "text/markdown" };
}
