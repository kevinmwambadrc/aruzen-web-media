// Moodboard : tableaux et images stockés dans IndexedDB (sur le Mac, rien en ligne).
let opening = null;

function open() {
  return (opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open("aruzen-moodboard", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore("boards", { keyPath: "id" });
      d.createObjectStore("items", { keyPath: "id" }).createIndex("board", "board");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function run(store, mode, fn) {
  const d = await open();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req && "result" in req ? req.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const listBoards = async () => (await run("boards", "readonly", (s) => s.getAll())).sort((a, b) => a.created - b.created);
export const saveBoard = (b) => run("boards", "readwrite", (s) => s.put(b));
export const listItems = async (board) =>
  (await run("items", "readonly", (s) => s.index("board").getAll(board))).sort((a, b) => b.added - a.added);
export const addItem = (item) => run("items", "readwrite", (s) => s.put({ id: crypto.randomUUID(), added: Date.now(), ...item }));
export const deleteItem = (id) => run("items", "readwrite", (s) => s.delete(id));

export async function createBoard(name) {
  const b = { id: crypto.randomUUID(), name: name || "Nouveau tableau", created: Date.now() };
  await saveBoard(b);
  await chrome.storage.local.set({ activeBoard: b.id });
  return b;
}

export async function deleteBoard(id) {
  for (const it of await listItems(id)) await deleteItem(it.id);
  await run("boards", "readwrite", (s) => s.delete(id));
}

// Tableau actif, créé au premier usage.
export async function activeBoard() {
  const boards = await listBoards();
  const { activeBoard: id } = await chrome.storage.local.get("activeBoard");
  return boards.find((b) => b.id === id) || boards[0] || createBoard("Inspiration");
}
