import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Lead } from "@/types/lead";

const COLLECTION_NAME = "leads";

export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {
  if (!db) return () => {};

  const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lead[];
    callback(leads);
  }, (error) => {
    console.error("Error fetching leads:", error);
  });
};

export const addLead = async (
  leadData: Omit<Lead, "id" | "createdAt" | "updatedAt">
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...leadData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateLead = async (
  id: string,
  leadData: Partial<Omit<Lead, "id" | "createdAt" | "updatedAt">>
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...leadData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteLead = async (id: string) => {
  if (!db) throw new Error("Firestore is not initialized");

  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
};
