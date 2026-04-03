import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Lead, LeadStatus, StatusHistoryEntry } from "./types";

const LEADS_COLLECTION = "leads";

export const getLeads = async (): Promise<Lead[]> => {
  if (!db) return [];
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
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

  // We need to fetch the current history to append to it
  // But a better way in a real app is arrayUnion if we just append,
  // however arrayUnion doesn't work well with complex objects without exact match.
  // Instead we can use a subcollection for history, but for simplicity we keep it in document.

  // Actually, since we don't want to do a read-then-write if we can avoid it,
  // and we don't have atomic array operations for complex appending easily without full object,
  // let's fetch it:

  const { getDoc } = await import("firebase/firestore");
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
