// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA_ViQGmkjOykyqNal6dLY2QQbjMfCibdE",
  authDomain: "padel-pro-bd0bb.firebaseapp.com",
  projectId: "padel-pro-bd0bb",
  storageBucket: "padel-pro-bd0bb.appspot.com",
  messagingSenderId: "782278858503",
  appId: "1:782278858503:web:ac2286e96c1507136b57a2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;