import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

export type CommissionStatus = 
  | "Новый" 
  | "В работе"
  | "Думает" 
  | "Встреча назначена" 
  | "Авто на комиссии" 
  | "Отказ";

export interface Commission {
  id?: string;
  clientName: string;
  phone: string;
  carDetails: string;
  status: CommissionStatus;
  nextContactDate: Date | null;
  notes: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

const COLLECTION_NAME = "commissions";

export const commissionService = {
  async getCommissions(): Promise<Commission[]> {
    if (!db) return [];
    
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        nextContactDate: data.nextContactDate?.toDate() || null,
      } as Commission;
    });
  },

  async addCommission(commission: Omit<Commission, "id" | "createdAt" | "updatedAt">): Promise<string> {
    if (!db) throw new Error("Database not initialized");
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...commission,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      nextContactDate: commission.nextContactDate ? Timestamp.fromDate(commission.nextContactDate) : null,
    });
    
    return docRef.id;
  },

  async updateCommission(id: string, updates: Partial<Omit<Commission, "id" | "createdAt" | "updatedAt">>): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    if (updates.nextContactDate !== undefined) {
      updateData.nextContactDate = updates.nextContactDate ? Timestamp.fromDate(updates.nextContactDate) : null;
    }
    
    await updateDoc(docRef, updateData);
  },

  async deleteCommission(id: string): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }
};
