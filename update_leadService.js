const fs = require('fs');
const content = fs.readFileSync('src/lib/leadService.ts', 'utf8');

// We need to add getPaginatedLeads and getLeadsCount, and modify subscribeToLeads
let updated = content.replace(
  'export const subscribeToLeads = (callback: (leads: Lead[]) => void) => {',
  'export const subscribeToLeads = (callback: (leads: Lead[]) => void, statuses?: LeadStatus[]) => {'
);

updated = updated.replace(
  'const q = query(leadsRef, orderBy("createdAt", "desc"));',
  `let q = query(leadsRef, orderBy("createdAt", "desc"));
  if (statuses && statuses.length > 0) {
    const { where } = require("firebase/firestore");
    // Firestore "in" query allows up to 10 items
    q = query(leadsRef, where("status", "in", statuses), orderBy("createdAt", "desc"));
  }`
);

// We need to add getPaginatedLeads and getLeadsCount at the end
const additions = `
import { limit, startAfter, getCountFromServer, DocumentData, QueryDocumentSnapshot, where } from "firebase/firestore";

export const getPaginatedLeads = async (
  limitCount: number,
  lastDocSnap?: QueryDocumentSnapshot<DocumentData>,
  statuses?: LeadStatus[]
) => {
  if (!db) return { leads: [], lastDoc: null };
  const leadsRef = collection(db, LEADS_COLLECTION);

  let qArgs: any[] = [leadsRef];

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

  const leads = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Lead[];

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];

  return { leads, lastDoc: lastVisible };
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
`;

fs.writeFileSync('src/lib/leadService.ts', updated + additions);
