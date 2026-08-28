import {
  collection, addDoc, updateDoc, doc, getDocs, query, orderBy, deleteDoc,
  onSnapshot, limit, startAfter, getCountFromServer, DocumentData,
  QueryDocumentSnapshot, where, getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead, LeadStatus, StatusHistoryEntry } from "./types";
import { ACTIVE_STATUSES } from "./leads/match";

const LEADS_COLLECTION = "leads";

export const subscribeToLeads = (callback: (leads: Lead[]) => void, statuses?: LeadStatus[]) => {
  if (!db) {
    console.error("Firestore is not initialized");
    callback([]);
    return () => {};
  }

  const leadsRef = collection(db, LEADS_COLLECTION);
  let q = query(leadsRef, orderBy("createdAt", "desc"));
  if (statuses && statuses.length > 0) {
    q = query(leadsRef, where("status", "in", statuses));
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    let leads = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as Lead[];

    if (statuses && statuses.length > 0) {
      leads = leads.sort((a, b) => b.createdAt - a.createdAt);
    }

    callback(leads);
  }, (error) => {
    console.error("Error listening to leads:", error);
  });

  return unsubscribe;
};

export const subscribeToActiveLeads = (callback: (leads: Lead[]) => void) =>
  subscribeToLeads(callback, ACTIVE_STATUSES);

export const getLeads = async (): Promise<Lead[]> => {
  if (!db) return [];
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  })) as Lead[];
};

export const createLead = async (
  leadData: Omit<Lead, "id" | "createdAt" | "updatedAt" | "history">,
  userEmail: string
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const now = Date.now();
  const initialHistory: StatusHistoryEntry = {
    status: leadData.status,
    changedAt: now,
    changedBy: userEmail,
    comment: "Создание лида",
  };

  const newLead = {
    ...leadData,
    carIds: leadData.carIds || [],
    primaryCarId: leadData.primaryCarId || null,
    createdAt: now,
    updatedAt: now,
    history: [initialHistory],
  };

  const docRef = await addDoc(collection(db, LEADS_COLLECTION), newLead);
  return { id: docRef.id, ...newLead };
};

export const updateLeadStatus = async (
  leadId: string,
  newStatus: LeadStatus,
  userEmail: string,
  comment?: string,
  nextActionDate?: number | null
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) throw new Error("Lead not found");

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

  if (newStatus === "success" && currentData.status !== "success") {
    try {
      fetch('/api/webhook/zapier-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: leadSnap.id,
          source: currentData.source,
          payload: currentData.payload
        })
      }).catch(err => console.error("Failed to trigger Zapier CAPI webhook:", err));
    } catch (e) {
      console.error("Error sending CAPI request", e);
    }
  }
};

export const updateLeadDetails = async (
  leadId: string,
  updates: Partial<Omit<Lead, "id" | "history" | "createdAt">>
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  await updateDoc(leadRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteLead = async (leadId: string) => {
  if (!db) throw new Error("Firestore is not initialized");
  const leadRef = doc(db, LEADS_COLLECTION, leadId);
  await deleteDoc(leadRef);
};

export const getLeadsByCarId = async (carId: string): Promise<Lead[]> => {
  if (!db || !carId) return [];
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, where("carIds", "array-contains", carId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));
};

export const getPaginatedLeads = async (
  limitCount: number,
  lastDocSnap?: QueryDocumentSnapshot<DocumentData, DocumentData> | null,
  statuses?: LeadStatus[]
) => {
  if (!db) return { leads: [], lastDoc: null };
  const leadsRef = collection(db, LEADS_COLLECTION);

  const qArgs: unknown[] = [leadsRef];

  if (statuses && statuses.length > 0) {
    qArgs.push(where("status", "in", statuses));
  }

  qArgs.push(orderBy("createdAt", "desc"));

  if (lastDocSnap) {
    qArgs.push(startAfter(lastDocSnap));
  }

  qArgs.push(limit(limitCount));

  // eslint-disable-next-line prefer-spread, @typescript-eslint/no-explicit-any
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

export const deleteLeadsByStatusAndDateRange = async (
  status: LeadStatus,
  dateFrom: number,
  dateTo: number
): Promise<number> => {
  if (!db) throw new Error("Firestore is not initialized");

  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, where("status", "==", status));

  const snapshot = await getDocs(q);
  const matchingDocs = snapshot.docs.filter(d => {
    const createdAt = d.data().createdAt as number;
    return createdAt >= dateFrom && createdAt <= dateTo;
  });

  const total = matchingDocs.length;

  const batchSize = 10;
  for (let i = 0; i < matchingDocs.length; i += batchSize) {
    const batch = matchingDocs.slice(i, i + batchSize);
    await Promise.all(batch.map(d => deleteDoc(d.ref)));
  }

  return total;
};

export const getLeadsCount = async (statuses?: LeadStatus[]) => {
  if (!db) return 0;
  const leadsRef = collection(db, LEADS_COLLECTION);
  let q = query(leadsRef);

  if (statuses && statuses.length > 0) {
    q = query(leadsRef, where("status", "in", statuses));
  }

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};
