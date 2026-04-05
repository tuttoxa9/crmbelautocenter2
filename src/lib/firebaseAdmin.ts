import * as admin from 'firebase-admin';

let adminInitError: Error | null = null;

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Missing FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, or FIREBASE_PROJECT_ID environment variables');
    }

    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    adminInitError = error instanceof Error ? error : new Error(String(error));
  }
}

export { adminInitError };

// Ensure we don't crash the entire app if admin isn't initialized on the client side
export const adminDb = admin.apps.length ? admin.firestore() : null;
