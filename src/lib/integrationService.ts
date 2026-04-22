import {
  collection, addDoc, updateDoc, doc, getDocs, query, orderBy, deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import { Integration } from "./types";

const INTEGRATIONS_COLLECTION = "integrations";

export const subscribeToIntegrations = (callback: (integrations: Integration[]) => void) => {
  if (!db) {
    console.error("Firestore is not initialized");
    callback([]);
    return () => {};
  }

  const integrationsRef = collection(db, INTEGRATIONS_COLLECTION);
  const q = query(integrationsRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const integrations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Integration[];

    callback(integrations);
  }, (error) => {
    console.error("Error listening to integrations:", error);
  });

  return unsubscribe;
};

export const getIntegrations = async (): Promise<Integration[]> => {
  if (!db) return [];
  const integrationsRef = collection(db, INTEGRATIONS_COLLECTION);
  const q = query(integrationsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Integration[];
};

export const createIntegration = async (
  integrationData: Omit<Integration, "id" | "createdAt" | "updatedAt">
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const now = Date.now();
  const newIntegration = {
    ...integrationData,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, INTEGRATIONS_COLLECTION), newIntegration);
  return { id: docRef.id, ...newIntegration };
};

export const updateIntegration = async (
  integrationId: string,
  updates: Partial<Omit<Integration, "id" | "createdAt">>
) => {
  if (!db) throw new Error("Firestore is not initialized");

  const integrationRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(integrationRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteIntegration = async (integrationId: string) => {
  if (!db) throw new Error("Firestore is not initialized");
  const integrationRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await deleteDoc(integrationRef);
};
