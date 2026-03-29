'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Purchase, MasterEntry, ProductionJob } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Capacitor } from '@capacitor/core';
import { saveMediaLocally, deleteMediaLocally } from './media-store';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── localStorage helpers ────────────────────────────────────────────────────

const LS_LOTS = 'khatupati_lots';
const LS_ASSIGN = 'khatupati_assignments';
const LS_DIR = 'khatupati_directory';

function lsGet<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function lsSet<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function KhatupatiProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allAssignments, setAllAssignments] = useState<ProductionJob[]>([]);
  const [directory, setDirectory] = useState<MasterEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const lots = lsGet<any>(LS_LOTS).map((row: any) => ({
          ...row,
          kurta: typeof row.kurta === 'string' ? JSON.parse(row.kurta || '{}') : (row.kurta || {}),
          salwar: typeof row.salwar === 'string' ? JSON.parse(row.salwar || '{}') : (row.salwar || {}),
          dupatta: typeof row.dupatta === 'string' ? JSON.parse(row.dupatta || '{}') : (row.dupatta || {}),
          lace: typeof row.lace === 'string' ? JSON.parse(row.lace || '{}') : (row.lace || {}),
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : (row.tags || []),
        }));
        setPurchases(lots);

        const assigns = lsGet<any>(LS_ASSIGN).map((row: any) => ({
          ...row,
          components: typeof row.components === 'string' ? JSON.parse(row.components || '[]') : (row.components || []),
          isFinalStep: row.isFinalStep === true || row.isFinalStep === 1,
        }));
        setAllAssignments(assigns);

        setDirectory(lsGet<MasterEntry>(LS_DIR));
        setIsLoaded(true);
      } catch (err) {
        console.error('Failed to load data from localStorage', err);
        setIsLoaded(true); // Still mark as loaded to avoid infinite spinner
      }
    };

    loadData();
  }, []);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const syncLots = useCallback((updated: Purchase[]) => {
    const serialised = updated.map(p => ({
      ...p,
      kurta: JSON.stringify(p.kurta),
      salwar: JSON.stringify(p.salwar),
      dupatta: JSON.stringify(p.dupatta),
      lace: JSON.stringify(p.lace),
      tags: JSON.stringify(p.tags || []),
    }));
    lsSet(LS_LOTS, serialised);
    setPurchases(updated);
  }, []);

  const syncAssignments = useCallback((updated: ProductionJob[]) => {
    const serialised = updated.map(a => ({
      ...a,
      components: JSON.stringify(a.components),
      isFinalStep: a.isFinalStep ? 1 : 0,
    }));
    lsSet(LS_ASSIGN, serialised);
    setAllAssignments(updated);
  }, []);

  const syncDirectory = useCallback((updated: MasterEntry[]) => {
    lsSet(LS_DIR, updated);
    setDirectory(updated);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const vendors = useMemo(() =>
    directory.filter(e => e.category === 'Vendor')
      .map(e => ({ id: e.id, name: e.name, type: e.subCategory as 'Embroidery' | 'Value Addition' })),
    [directory]
  );

  const qualities = useMemo(() => directory.filter(e => e.category === 'Fabric'), [directory]);

  // ── Purchases / Lots ─────────────────────────────────────────────────────────

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id' | 'createdAt' | 'owner'>) => {
    const id = uuidv4();
    let mediaUri = purchase.designPhoto || '';
    if (mediaUri && mediaUri.startsWith('data:image') && Capacitor.isNativePlatform()) {
      mediaUri = await saveMediaLocally(mediaUri, `lot_${id}`);
    }
    const newLot: Purchase = {
      ...purchase,
      id,
      createdAt: new Date().toISOString(),
      owner: 'local_user',
      designPhoto: mediaUri,
    };
    syncLots([newLot, ...purchases]);
    return id;
  }, [purchases, syncLots]);

  const updatePurchase = useCallback(async (updatedPurchase: Partial<Purchase> & { id: string }) => {
    const { id, ...data } = updatedPurchase;

    let mediaUri = data.designPhoto;
    if (mediaUri && mediaUri.startsWith('data:image') && Capacitor.isNativePlatform()) {
      mediaUri = await saveMediaLocally(mediaUri, `lot_${id}`);
      data.designPhoto = mediaUri;
    }

    const updated = purchases.map(p => p.id === id ? { ...p, ...data } : p);
    syncLots(updated);
  }, [purchases, syncLots]);

  const deletePurchase = useCallback(async (lotId: string) => {
    const lot = purchases.find(p => p.id === lotId);
    if (lot?.designPhoto && Capacitor.isNativePlatform()) {
      await deleteMediaLocally(lot.designPhoto);
    }
    syncLots(purchases.filter(p => p.id !== lotId));
    syncAssignments(allAssignments.filter(a => a.lotId !== lotId));
  }, [purchases, allAssignments, syncLots, syncAssignments]);

  const duplicatePurchase = useCallback(async (id: string) => {
    const original = purchases.find(p => p.id === id);
    if (!original) return;
    const newId = uuidv4();
    const dup: Purchase = {
      ...original,
      id: newId,
      state: 'Purchased',
      purchaseDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    syncLots([dup, ...purchases]);
    return newId;
  }, [purchases, syncLots]);

  // ── Assignments ───────────────────────────────────────────────────────────────

  const addAssignment = useCallback(async (lotId: string, assignment: Omit<ProductionJob, 'id' | 'lotId'>) => {
    const newJob: ProductionJob = { ...assignment, id: uuidv4(), lotId };
    syncAssignments([...allAssignments, newJob]);
  }, [allAssignments, syncAssignments]);

  const updateAssignment = useCallback(async (id: string, data: Partial<ProductionJob>) => {
    syncAssignments(allAssignments.map(a => a.id === id ? { ...a, ...data } : a));
  }, [allAssignments, syncAssignments]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    syncAssignments(allAssignments.filter(a => a.id !== assignmentId));
  }, [allAssignments, syncAssignments]);

  // ── Directory ─────────────────────────────────────────────────────────────────

  const addDirectoryEntry = useCallback(async (entry: Omit<MasterEntry, 'id'>) => {
    const newEntry: MasterEntry = { ...entry, id: uuidv4() };
    syncDirectory([...directory, newEntry]);
  }, [directory, syncDirectory]);

  const updateDirectoryEntry = useCallback(async (entry: Partial<MasterEntry> & { id: string }) => {
    syncDirectory(directory.map(e => e.id === entry.id ? { ...e, ...entry } : e));
  }, [directory, syncDirectory]);

  const deleteDirectoryEntry = useCallback(async (id: string) => {
    syncDirectory(directory.filter(e => e.id !== id));
  }, [directory, syncDirectory]);

  const addVendor = useCallback(async (vendor: { name: string, type: 'Embroidery' | 'Value Addition' }) => {
    await addDirectoryEntry({ name: vendor.name, category: 'Vendor', subCategory: vendor.type });
  }, [addDirectoryEntry]);

  // ── Math ───────────────────────────────────────────────────────────────────────

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
