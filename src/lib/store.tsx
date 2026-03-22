'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { Purchase, MasterEntry, ProductionJob } from './types';
import { useFirestore, useFirebase } from '@/firebase'; 
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface KhatupatiStoreContextType {
  purchases: Purchase[];
  allAssignments: ProductionJob[];
  directory: MasterEntry[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => Promise<string>;
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
  const db = useFirestore();
  const { user } = useFirebase();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [allAssignments, setAllAssignments] = useState<ProductionJob[]>([]);
  const [directory, setDirectory] = useState<MasterEntry[]>([]);
  const [loadedCollections, setLoadedCollections] = useState<string[]>([]);

  const isLoaded = loadedCollections.length === 3;

  useEffect(() => {
    if (!db || !user) return;

    // Listener for 'lots' collection
    const unsubLots = onSnapshot(collection(db, 'lots'), snapshot => {
      const lotsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Purchase[];
      setPurchases(lotsData);
      if (!loadedCollections.includes('lots')) {
        setLoadedCollections(prev => [...new Set([...prev, 'lots'])]);
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'lots', operation: 'list' }));
      }
    });

    // Listener for 'assignments' collection
    const unsubAssignments = onSnapshot(collection(db, 'assignments'), snapshot => {
      const assignmentsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ProductionJob[];
      setAllAssignments(assignmentsData);
      if (!loadedCollections.includes('assignments')) {
        setLoadedCollections(prev => [...new Set([...prev, 'assignments'])]);
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'assignments', operation: 'list' }));
      }
    });

    // Listener for 'directory' collection
    const unsubDirectory = onSnapshot(collection(db, 'directory'), snapshot => {
      const directoryData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as MasterEntry[];
      setDirectory(directoryData);
      if (!loadedCollections.includes('directory')) {
        setLoadedCollections(prev => [...new Set([...prev, 'directory'])]);
      }
    }, (err) => {
      if (err.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'directory', operation: 'list' }));
      }
    });

    return () => {
      unsubLots();
      unsubAssignments();
      unsubDirectory();
    };
  }, [db, user]);

  const vendors = useMemo(() => {
    return directory
      .filter(e => e.category === 'Vendor')
      .map(e => ({ id: e.id, name: e.name, type: e.subCategory as 'Embroidery' | 'Value Addition' }));
  }, [directory]);

  const qualities = useMemo(() => directory.filter(e => e.category === 'Fabric'), [directory]);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id' | 'createdAt'>) => {
    if (!user) throw new Error("User not authenticated");
    const docRef = doc(collection(db, 'lots'));
    const data = { ...purchase, createdAt: serverTimestamp(), owner: user.uid };
    await setDoc(docRef, data);
    return docRef.id;
  }, [db, user]);

  const updatePurchase = useCallback(async (updatedPurchase: Partial<Purchase> & { id: string }) => {
    const { id, ...data } = updatedPurchase;
    const docRef = doc(db, 'lots', id);
    await updateDoc(docRef, data);
  }, [db]);

  const deletePurchase = useCallback(async (lotId: string) => {
    if (!user) throw new Error("Authentication required.");
  
    const lotRef = doc(db, 'lots', lotId);
    const lotSnapshot = await getDoc(lotRef);
  
    if (!lotSnapshot.exists()) {
      throw new Error("Lot not found.");
    }
  
    const lotData = lotSnapshot.data() as Purchase;
  
    if (lotData.owner !== user.uid) {
        throw new Error("You do not have permission to delete this lot.");
    }

    const relatedAssignments = allAssignments.filter(a => a.lotId === lotId);
    if (relatedAssignments.length > 0) {
        console.warn(`Deleting lot with ${relatedAssignments.length} associated assignments.`);
    }
    
    const batch = writeBatch(db);
    batch.delete(lotRef);
    relatedAssignments.forEach(a => batch.delete(doc(db, 'assignments', a.id)));

    const auditRef = doc(collection(db, "audit_logs"));
    batch.set(auditRef, {
        action: "delete_lot",
        userId: user.uid,
        lotId: lotId,
        deletedAt: serverTimestamp(),
        details: {
            lotName: lotData.qualityName,
            assignmentCount: relatedAssignments.length
        }
    });
  
    await batch.commit();
  }, [db, user, allAssignments]);

  const duplicatePurchase = useCallback(async (id: string) => {
    if (!user) throw new Error("User not authenticated");
    const originalDoc = await getDoc(doc(db, 'lots', id));
    if (!originalDoc.exists()) return;
    const original = originalDoc.data() as Purchase;
    const newDocRef = doc(collection(db, 'lots'));
    const data = { 
      ...original, 
      state: 'Purchased' as const, 
      purchaseDate: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
      owner: user.uid
    };
    await setDoc(newDocRef, data);
    return newDocRef.id;
  }, [db, user]);

  const addAssignment = useCallback(async (lotId: string, assignment: Omit<ProductionJob, 'id' | 'lotId'>) => {
    const data = { ...assignment, lotId };
    await addDoc(collection(db, 'assignments'), data);
  }, [db]);

  const updateAssignment = useCallback(async (id: string, data: Partial<ProductionJob>) => {
    const docRef = doc(db, 'assignments', id);
    await updateDoc(docRef, data);
  }, [db]);

  const deleteAssignment = useCallback(async (assignmentId: string) => {
    const docRef = doc(db, 'assignments', assignmentId);
    await deleteDoc(docRef);
  }, [db]);

  const addDirectoryEntry = useCallback(async (entry: Omit<MasterEntry, 'id'>) => {
    await addDoc(collection(db, 'directory'), entry);
  }, [db]);

  const updateDirectoryEntry = useCallback(async (entry: Partial<MasterEntry> & { id: string }) => {
    const { id, ...data } = entry;
    const docRef = doc(db, 'directory', id);
    await updateDoc(docRef, data);
  }, [db]);

  const deleteDirectoryEntry = useCallback(async (id: string) => {
    const docRef = doc(db, 'directory', id);
    await deleteDoc(docRef);
  }, [db]);

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
