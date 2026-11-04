// Clic sur l'icône : atelier vide. Clic droit sur une image : l'atelier l'ouvre directement.
const open = (tab) => chrome.tabs.create({ url: "editor.html", index: tab ? tab.index + 1 : undefined });
chrome.action.onClicked.addListener(open);
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "retouche", title: "Retoucher cette image (Aruzen)", contexts: ["image"] });
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "retouche" || !info.srcUrl) return;
  await chrome.storage.session.set({ pending: { url: info.srcUrl, page: info.pageUrl } });
  open(tab);
});
