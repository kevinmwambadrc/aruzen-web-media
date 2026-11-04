// Exécuté dans la page : insère au curseur (fonctionne aussi dans les éditeurs de LinkedIn, Facebook…).
export function insertAtCursor(text) {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  if (document.execCommand("insertText", false, text)) return true;
  if ("value" in el) {
    const s = el.selectionStart ?? el.value.length;
    el.setRangeText(text, s, el.selectionEnd ?? s, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
}
