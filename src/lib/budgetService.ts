import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BudgetPlan } from "@/lib/budgetTypes";

const COLLECTION = "budgetPlans";

export async function createBudgetPlan(plan: Omit<BudgetPlan, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), plan);
  return ref.id;
}

export async function updateBudgetPlan(id: string, plan: Partial<BudgetPlan>): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...plan, updatedAt: Date.now() });
}

export async function deleteBudgetPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getBudgetPlans(): Promise<BudgetPlan[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BudgetPlan));
}

export function subscribeToBudgetPlans(callback: (plans: BudgetPlan[]) => void) {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const plans = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BudgetPlan));
    callback(plans);
  });
}
