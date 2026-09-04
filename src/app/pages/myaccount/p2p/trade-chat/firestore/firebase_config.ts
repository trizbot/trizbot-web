// src/app/core/firebase/firebase.ts

import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Firestore,
  getFirestore,
} from 'firebase/firestore';
import {
  Auth,
  getAuth,
} from 'firebase/auth';

import { environment } from '../../../../../../environments/environment';

const firebaseConfig = {
  apiKey: environment.FIREBASE_API_KEY,
  authDomain: environment.FIREBASE_AUTH_DOMAIN,
  projectId: environment.FIREBASE_PROJECT_ID,
  storageBucket: environment.FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    environment.FIREBASE_MESSAGING_SENDER_ID,
  appId: environment.FIREBASE_APP_ID,
};

// console.log(
//   '[Firebase] Project:',
//   firebaseConfig.projectId
// );

export const firebaseApp: FirebaseApp =
  initializeApp(firebaseConfig);

export const firebaseDb: Firestore =
  getFirestore(firebaseApp);

export const firebaseAuth: Auth =
  getAuth(firebaseApp);