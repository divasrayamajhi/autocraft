import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'divasrayamajhi2@gmail.com';

const envMeta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const resolvedFirebaseConfig = {
  ...firebaseAppletConfig,
  apiKey: envMeta.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: envMeta.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: envMeta.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
};

const isCustomProjectOverride =
  Boolean(envMeta.VITE_FIREBASE_PROJECT_ID) &&
  envMeta.VITE_FIREBASE_PROJECT_ID !== firebaseAppletConfig.projectId;

const resolvedDatabaseId = isCustomProjectOverride
  ? envMeta.VITE_FIREBASE_DATABASE_ID || undefined
  : firebaseAppletConfig.firestoreDatabaseId;

const app = initializeApp(resolvedFirebaseConfig);

// CRITICAL: Pass firebaseAppletConfig.firestoreDatabaseId when targeting the provisioned database
export const db = resolvedDatabaseId ? getFirestore(app, resolvedDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getFirebaseUpgradeLink(): string {
  return `https://console.firebase.google.com/project/${resolvedFirebaseConfig.projectId}/firestore/databases/${firebaseAppletConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
