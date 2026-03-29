import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export const sqlite = new SQLiteConnection(CapacitorSQLite);

const dbName = 'khatupati_local_db';

export const initDB = async (): Promise<SQLiteDBConnection> => {
  try {
    if (Capacitor.getPlatform() === 'web') {
      // Inject jeep-sqlite if it hasn't been defined yet
      if (!customElements.get('jeep-sqlite')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/jeep-sqlite/dist/jeep-sqlite/jeep-sqlite.esm.js';
        document.head.appendChild(script);
      }
      
      const jeepEl = document.createElement('jeep-sqlite');
      document.body.appendChild(jeepEl);
      await customElements.whenDefined('jeep-sqlite');
      await sqlite.initWebStore();
    }

    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(dbName, false)).result;
    
    let db: SQLiteDBConnection;
    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection(dbName, false);
    } else {
      db = await sqlite.createConnection(dbName, false, 'no-encryption', 1, false);
    }

    await db.open();

    const schema = `
      CREATE TABLE IF NOT EXISTS lots (
        id TEXT PRIMARY KEY NOT NULL,
        qualityName TEXT NOT NULL,
        piecesCount INTEGER,
        state TEXT,
        purchaseDate TEXT,
        designPhoto TEXT,
        kurta TEXT,
        salwar TEXT,
        dupatta TEXT,
        lace TEXT,
        createdAt TEXT,
        owner TEXT,
        tags TEXT,
        range TEXT
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id TEXT PRIMARY KEY NOT NULL,
        lotId TEXT,
        vendorName TEXT,
        vendorId TEXT,
        rate REAL,
        sentDate TEXT,
        receivedDate TEXT,
        receivedQty INTEGER,
        challanPhoto TEXT,
        receivedPhoto TEXT,
        challanNumber TEXT,
        processType TEXT,
        components TEXT,
        isFinalStep INTEGER
      );

      CREATE TABLE IF NOT EXISTS directory (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        subCategory TEXT,
        supplierName TEXT,
        rate REAL,
        meters REAL,
        dying REAL
      );
    `;

    await db.execute(schema);
    
    if (Capacitor.getPlatform() === 'web') {
        await sqlite.saveToStore(dbName);
    }

    return db;
  } catch (error) {
    console.error('Error initializing SQLite database', error);
    throw error;
  }
};
