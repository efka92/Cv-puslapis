import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate configuration
if (!firebaseConfig.projectId) {
  throw new Error('Firebase Project ID is missing. Check your environment variables.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Storage with region and custom domain
const db = getFirestore(app);
const storage = getStorage(app);

// Note: CORS for Firebase Storage must be configured at the bucket level
// via Google Cloud Console or gcloud/gsutil, not in client-side code.

// Log successful initialization
console.log('Firebase initialized successfully with project:', firebaseConfig.projectId);

export { db, storage };