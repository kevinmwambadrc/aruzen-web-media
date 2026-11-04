// Exécuté dans la page : insère au curseur (champs classiques et éditeurs riches des assistants IA).
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
