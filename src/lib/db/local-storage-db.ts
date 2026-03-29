/**
 * localStorage-based database adapter for web/PWA mode.
 * On native iOS/Android, the real Capacitor SQLite plugin is used instead.
 * This ensures the app loads instantly in the browser without any WASM dependencies.
 */

const KEYS = {
  lots: 'khatupati_lots',
  assignments: 'khatupati_assignments',
  directory: 'khatupati_directory',
};

function getStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export const localDB = {
  getLots: () => getStore<any>(KEYS.lots),
  saveLots: (data: any[]) => setStore(KEYS.lots, data),

  getAssignments: () => getStore<any>(KEYS.assignments),
  saveAssignments: (data: any[]) => setStore(KEYS.assignments, data),

  getDirectory: () => getStore<any>(KEYS.directory),
  saveDirectory: (data: any[]) => setStore(KEYS.directory, data),

  // Unified run() to mimic SQLite interface
  runLots: (action: 'insert' | 'update' | 'delete', row: any) => {
    const lots = getStore<any>(KEYS.lots);
    if (action === 'insert') {
      lots.push(row);
    } else if (action === 'update') {
      const idx = lots.findIndex((l: any) => l.id === row.id);
      if (idx !== -1) lots[idx] = { ...lots[idx], ...row };
    } else if (action === 'delete') {
      const filtered = lots.filter((l: any) => l.id !== row.id);
      setStore(KEYS.lots, filtered);
      return;
    }
    setStore(KEYS.lots, lots);
  },

  runAssignments: (action: 'insert' | 'update' | 'delete', row: any) => {
    const items = getStore<any>(KEYS.assignments);
    if (action === 'insert') {
      items.push(row);
    } else if (action === 'update') {
      const idx = items.findIndex((i: any) => i.id === row.id);
      if (idx !== -1) items[idx] = { ...items[idx], ...row };
    } else if (action === 'delete') {
      setStore(KEYS.assignments, items.filter((i: any) => i.id !== row.id));
      return;
    }
    setStore(KEYS.assignments, items);
  },

  runDirectory: (action: 'insert' | 'update' | 'delete', row: any) => {
    const items = getStore<any>(KEYS.directory);
    if (action === 'insert') {
      items.push(row);
    } else if (action === 'update') {
      const idx = items.findIndex((i: any) => i.id === row.id);
      if (idx !== -1) items[idx] = { ...items[idx], ...row };
    } else if (action === 'delete') {
      setStore(KEYS.directory, items.filter((i: any) => i.id !== row.id));
      return;
    }
    setStore(KEYS.directory, items);
  },
};
