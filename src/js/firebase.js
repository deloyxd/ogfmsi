import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: 'fitworx-gym-30e4a.firebaseapp.com',
  projectId: 'fitworx-gym-30e4a',
  storageBucket: 'fitworx-gym-30e4a.firebasestorage.app',
  messagingSenderId: '689931809128',
  appId: '1:689931809128:web:1008deb6fb6bde5448a6dd',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
