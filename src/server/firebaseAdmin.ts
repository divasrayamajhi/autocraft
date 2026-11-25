import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  firebaseConfig.projectId;

// Initialize once using Application Default Credentials (no JSON key file needed on Cloud Run)
const adminApp = getApps().length
  ? getApp()
  : initializeApp(projectId ? { projectId } : undefined);

export const adminAuth = getAuth(adminApp);

/**
 * Verifies a Firebase Bearer ID token without requiring IAM permissions.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  return adminAuth.verifyIdToken(idToken);
}
