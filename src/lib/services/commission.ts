import {
  collection, addDoc, updateDoc, doc, getDocs, query, orderBy, deleteDoc,
  onSnapshot, limit, startAfter, getCountFromServer, DocumentData,
  QueryDocumentSnapshot, where, getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { Lead, LeadStatus, StatusHistoryEntry } from "../types";

const COMMISSIONS_COLLECTION = "commissions";

export const subscribeToCommissions = (callback: (leads: Lead[]) => void, statuses?: LeadStatus[]) => {
  if (!db) {
    console.error("Firestore is not initialized");
    callback([]);
    return () => {};
  }

  const leadsRef = collection(db, COMMISSIONS_COLLECTION);
  let q = query(leadsRef, orderBy("createdAt", "desc"));
  if (statuses && statuses.length > 0) {
    q = query(leadsRef, where("status", "in", statuses));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Lead[];

    if (statuses && statuses.length > 0) {
      leads = leads.sort((a, b) => b.createdAt - a.createdAt);
    }

    callback(leads);
  }, (error) => {
    console.error("Error listening to commissions:", error);
  });

  return unsubscribe;
};

export const getCommissions = async (): Promise<Lead[]> => {
  if (!db) return [];
  const leadsRef = collection(db, COMMISSIONS_COLLECTION);
  const q = query(leadsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Lead[];
};

export const createCommission = async (
  leadData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "history">,
  userEmail: string
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const now = Date.now();
  const initialHistory: StatusHistoryEntry = {
    status: leadData.status,
    changedAt: now,
    changedBy: userEmail,
    comment: "Создание комиссии",
  };

  const newLead = {
    ...leadData,
    createdAt: now,
    updatedAt: now,
    history: [initialHistory],
  };

  const docRef = await addDoc(collection(db, COMMISSIONS_COLLECTION), newLead);
  return { id: docRef.id, ...newLead };
};

export const updateCommissionStatus = async (
  leadId: string,
  newStatus: LeadStatus,
  userEmail: string,
  comment?: string,
  nextActionDate?: number | null
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const leadRef = doc(db, COMMISSIONS_COLLECTION, leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) throw new Error("Commission not found");

  const currentData = leadSnap.data() as Lead;
  const history = currentData.history || [];

  const newHistoryEntry: StatusHistoryEntry = {
    status: newStatus,
    changedAt: Date.now(),
    changedBy: userEmail,
    comment: comment || "",
  };

  const updateData: Partial<Lead> = {
    status: newStatus,
    updatedAt: Date.now(),
    history: [...history, newHistoryEntry],
  };

  if (nextActionDate !== undefined) {
    updateData.nextActionDate = nextActionDate;
  }

  await updateDoc(leadRef, updateData);
};

export const updateCommissionDetails = async (
  leadId: string,
  updates: Partial<Omit<Lead, "id" | "history" | "createdAt">>
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const leadRef = doc(db, COMMISSIONS_COLLECTION, leadId);
  await updateDoc(leadRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteCommission = async (leadId: string) => {
  if (!db) throw new Error("Firestore is not initialized");
  const leadRef = doc(db, COMMISSIONS_COLLECTION, leadId);
  await deleteDoc(leadRef);
};

export const getPaginatedCommissions = async (
  limitCount: number,
  lastDocSnap?: QueryDocumentSnapshot<DocumentData, DocumentData> | null,
  statuses?: LeadStatus[]
) => {
  if (!db) return { leads: [], lastDoc: null };
  const leadsRef = collection(db, COMMISSIONS_COLLECTION);

  const qArgs: unknown[] = [leadsRef];

  if (statuses && statuses.length > 0) {
    qArgs.push(where("status", "in", statuses));
  }

  qArgs.push(orderBy("createdAt", "desc"));

  if (lastDocSnap) {
    qArgs.push(startAfter(lastDocSnap));
  }

  qArgs.push(limit(limitCount));

  const q = query.apply(null, qArgs as any);
  const snapshot = await getDocs(q);

  const leads = snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...(typeof data === 'object' && data !== null ? data : {})
    } as Lead;
  });

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { leads, lastDoc: lastVisible };
};

export const getCommissionsCount = async (statuses?: LeadStatus[]) => {
  if (!db) return 0;
  const leadsRef = collection(db, COMMISSIONS_COLLECTION);
  let q = query(leadsRef);

  if (statuses && statuses.length > 0) {
    q = query(leadsRef, where("status", "in", statuses));
  }

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};
