'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Purchase, MasterEntry, ProductionJob } from './types';
import { initDB } from './db/database';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { sqlite } from './db/database';
import { saveMediaLocally, deleteMediaLocally } from './media-store';

interface KhatupatiStoreContextType {
  purchases: Purchase[];
  allAssignments: ProductionJob[];
  directory: MasterEntry[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'owner'>) => Promise<string>;
  updatePurchase: (updatedPurchase: Partial<Purchase> & { id: string }) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  duplicatePurchase: (id: string) => Promise<string | undefined>;
  addAssignment: (lotId: string, assignment: Omit<ProductionJob, 'id' | 'lotId'>) => Promise<void>;
  updateAssignment: (id: string, assignment: Partial<ProductionJob>) => Promise<void>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  addDirectoryEntry: (entry: Omit<MasterEntry, 'id'>) => Promise<void>;
  updateDirectoryEntry: (entry: Partial<MasterEntry> & { id: string }) => Promise<void>;
  deleteDirectoryEntry: (id: string) => Promise<void>;
  addVendor: (vendor: { name: string, type: 'Embroidery' | 'Value Addition' }) => Promise<void>;
  calculateSuratMath: (purchase: Purchase, assignments: ProductionJob[]) => number;
  isLoaded: boolean;
  vendors: { id: string, name: string, type: 'Embroidery' | 'Value Addition' }[]; 
  qualities: MasterEntry[];
}

const KhatupatiStoreContext = createContext<KhatupatiStoreContextType | undefined>(undefined);

const safeMax = (arr: number[]) => arr.length === 0 ? 0 : Math.max(...arr);

export function KhatupatiProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDBConnection | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allAssignments, setAllAssignments] = useState<ProductionJob[]>([]);
  const [directory, setDirectory] = useState<MasterEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        const database = await initDB();
        setDb(database);
        await refreshData(database);
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to setup database", err);
      }
    };
    setupDatabase();
  }, []);

  const refreshData = async (database: SQLiteDBConnection) => {
    if (!database) return;
    
    // Fetch Lots
    const lotsRes = await database.query('SELECT * FROM lots');
    const lotsData: Purchase[] = (lotsRes.values || []).map(row => ({
      ...row,
      kurta: JSON.parse(row.kurta || '{}'),
      salwar: JSON.parse(row.salwar || '{}'),
      dupatta: JSON.parse(row.dupatta || '{}'),
      lace: JSON.parse(row.lace || '{}'),
      tags: JSON.parse(row.tags || '[]')
    }));
    setPurchases(lotsData);

    // Fetch Assignments
    const assignRes = await database.query('SELECT * FROM assignments');
    const assignData: ProductionJob[] = (assignRes.values || []).map(row => ({
      ...row,
      components: JSON.parse(row.components || '[]'),
      isFinalStep: row.isFinalStep === 1
    }));
    setAllAssignments(assignData);

    // Fetch Directory
    const dirRes = await database.query('SELECT * FROM directory');
    const dirData: MasterEntry[] = dirRes.values || [];
    setDirectory(dirData);
  };

  const executeAndRefresh = useCallback(async (query: string, values: any[]) => {
    if (!db) throw new Error("Database not initialized");
    await db.run(query, values);
    if (Capacitor.getPlatform() === 'web') {
      await sqlite.saveToStore('khatupati_local_db');
    }
    await refreshData(db);
  }, [db]);

  const vendors = useMemo(() => {
    return directory
      .filter(e => e.category === 'Vendor')
      .map(e => ({ id: e.id, name: e.name, type: e.subCategory as 'Embroidery' | 'Value Addition' }));
  }, [directory]);

  const qualities = useMemo(() => directory.filter(e => e.category === 'Fabric'), [directory]);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'owner'>) => {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const owner = 'local_user'; // Removed Firebase Auth

    let mediaUri = purchase.designPhoto || '';
    if (mediaUri && mediaUri.startsWith('data:image')) {
      mediaUri = await saveMediaLocally(mediaUri, `lot_${id}`);
    }

    const query = `
      INSERT INTO lots (id, qualityName, piecesCount, state, purchaseDate, designPhoto, kurta, salwar, dupatta, lace, createdAt, owner, tags, range)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      id, purchase.qualityName, purchase.piecesCount, purchase.state, purchase.purchaseDate, mediaUri,
      JSON.stringify(purchase.kurta), JSON.stringify(purchase.salwar), JSON.stringify(purchase.dupatta), JSON.stringify(purchase.lace),
      createdAt, owner, JSON.stringify(purchase.tags || []), purchase.range || ''
    ];
    
    await executeAndRefresh(query, values);
    return id;
  }, [executeAndRefresh]);

  const updatePurchase = useCallback(async (updatedPurchase: Partial<Purchase> & { id: string }) => {
    if (!db) return;
    const { id, ...data } = updatedPurchase;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'designPhoto' && typeof value === 'string' && value.startsWith('data:image')) {
        const newUri = await saveMediaLocally(value as string, `lot_${id}`);
        updates.push(`${key} = ?`);
        values.push(newUri);
      } else {
        updates.push(`${key} = ?`);
        if (typeof value === 'object') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }
    
    values.push(id);
    const query = `UPDATE lots SET ${updates.join(', ')} WHERE id = ?`;
    await executeAndRefresh(query, values);
  }, [db, executeAndRefresh]);

  const deletePurchase = useCallback(async (lotId: string) => {
    if (!db) return;
    const lot = purchases.find(p => p.id === lotId);
    if (lot && lot.designPhoto) {
      await deleteMediaLocally(lot.designPhoto);
    }
    await db.run('DELETE FROM lots WHERE id = ?', [lotId]);
    await db.run('DELETE FROM assignments WHERE lotId = ?', [lotId]);
    if (Capacitor.getPlatform() === 'web') {
      await sqlite.saveToStore('khatupati_local_db');
    }
    await refreshData(db);
  }, [db, purchases]);

  const duplicatePurchase = useCallback(async (id: string) => {
    const original = purchases.find(p => p.id === id);
    if (!original) return;
    
    const newId = uuidv4();
    const query = `
      INSERT INTO lots (id, qualityName, piecesCount, state, purchaseDate, designPhoto, kurta, salwar, dupatta, lace, createdAt, owner, tags, range)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      newId, original.qualityName, original.piecesCount, 'Purchased', new Date().toISOString().split('T')[0], original.designPhoto || '',
      JSON.stringify(original.kurta), JSON.stringify(original.salwar), JSON.stringify(original.dupatta), JSON.stringify(original.lace),
      new Date().toISOString(), 'local_user', JSON.stringify(original.tags || []), original.range || ''
    ];
    
    await executeAndRefresh(query, values);
    return newId;
  }, [purchases, executeAndRefresh]);

  const addAssignment = useCallback(async (lotId: string, assignment: Omit<ProductionJob, 'id' | 'lotId'>) => {
    const id = uuidv4();
    const query = `
      INSERT INTO assignments (id, lotId, vendorName, vendorId, rate, sentDate, receivedDate, receivedQty, challanPhoto, receivedPhoto, challanNumber, processType, components, isFinalStep)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      id, lotId, assignment.vendorName, assignment.vendorId || '', assignment.rate, assignment.sentDate, 
      assignment.receivedDate || '', assignment.receivedQty || 0, assignment.challanPhoto || '', 
      assignment.receivedPhoto || '', assignment.challanNumber || '', assignment.processType, 
      JSON.stringify(assignment.components), assignment.isFinalStep ? 1 : 0
    ];
    await executeAndRefresh(query, values);
  }, [executeAndRefresh]);

  const updateAssignment = useCallback(async (id: string, data: Partial<ProductionJob>) => {
    if (!db) return;
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue;
      updates.push(`${key} = ?`);
      if (typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }
    
    values.push(id);
    const query = `UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`;
    await executeAndRefresh(query, values);
  }, [db, executeAndRefresh]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    const query = `DELETE FROM assignments WHERE id = ?`;
    await executeAndRefresh(query, [assignmentId]);
  }, [executeAndRefresh]);

  const addDirectoryEntry = useCallback(async (entry: Omit<MasterEntry, 'id'>) => {
    const id = uuidv4();
    const query = `
      INSERT INTO directory (id, name, category, subCategory, supplierName, rate, meters, dying)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      id, entry.name, entry.category, entry.subCategory, 
      entry.supplierName || '', entry.rate || 0, entry.meters || 0, entry.dying || 0
    ];
    await executeAndRefresh(query, values);
  }, [executeAndRefresh]);

  const updateDirectoryEntry = useCallback(async (entry: Partial<MasterEntry> & { id: string }) => {
    if (!db) return;
    const { id, ...data } = entry;
    const updates: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
    
    values.push(id);
    const query = `UPDATE directory SET ${updates.join(', ')} WHERE id = ?`;
    await executeAndRefresh(query, values);
  }, [db, executeAndRefresh]);

  const deleteDirectoryEntry = useCallback(async (id: string) => {
    const query = `DELETE FROM directory WHERE id = ?`;
    await executeAndRefresh(query, [id]);
  }, [executeAndRefresh]);

  const addVendor = useCallback(async (vendor: { name: string, type: 'Embroidery' | 'Value Addition' }) => {
    await addDirectoryEntry({ name: vendor.name, category: 'Vendor', subCategory: vendor.type });
  }, [addDirectoryEntry]);

  const calculateSuratMath = useCallback((purchase: Purchase, assignments: ProductionJob[]) => {
    if (!purchase) return 0;
    const kCost = (purchase.kurta?.ratePerMeter || 0) * (purchase.kurta?.metersPerPiece || 0);
    const sCost = (purchase.salwar?.ratePerMeter || 0) * (purchase.salwar?.metersPerPiece || 0);
    const dCost = ((purchase.dupatta?.ratePerMeter || 0) * (purchase.dupatta?.metersPerPiece || 0)) + (purchase.dupatta?.dyingCharges || 0);
    const lCost = ((purchase.lace?.ratePerMeter || 0) * (purchase.lace?.metersPerPiece || 0)) / (purchase.piecesCount || 1);
    const fabricTotal = kCost + sCost + dCost + lCost;
    
    const totalProcessing = assignments.reduce((sum, job) => {
      const qty = job.receivedQty ?? safeMax(job.components.map(c => c.quantity));
      return sum + (qty * job.rate);
    }, 0);
    
    return fabricTotal + (totalProcessing / (purchase.piecesCount || 1));
  }, []);

  return (
    <KhatupatiStoreContext.Provider value={{ 
      purchases, allAssignments, directory, 
      addPurchase, updatePurchase, deletePurchase, duplicatePurchase, 
      addAssignment, updateAssignment, deleteAssignment, 
      addDirectoryEntry, updateDirectoryEntry, deleteDirectoryEntry, addVendor,
      calculateSuratMath, isLoaded, vendors, qualities 
    }}>
      {children}
    </KhatupatiStoreContext.Provider>
  );
}

export function useKhatupatiStore() {
  const context = useContext(KhatupatiStoreContext);
  if (!context) throw new Error('useKhatupatiStore must be used within a KhatupatiProvider');
  return context;
}
