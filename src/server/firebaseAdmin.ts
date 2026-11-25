import fs from 'fs';
import path from 'path';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

function readConfigProjectId(): string | undefined {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
      return parsed.projectId;
    }
  } catch {
    // Fallback to environment variables
  }
  return undefined;
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.VITE_FIREBASE_PROJECT_ID ||
  readConfigProjectId();

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
