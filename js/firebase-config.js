// js/firebase-config.js
// Single shared place for Firebase setup. Every other file imports from here
// instead of re-typing the config (that duplication was causing the
// "app already declared" crash in the old auth.js).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2NADIO_38zC6TadCHPZpilaOacTFiJ4A",
  authDomain: "webenrollapp.firebaseapp.com",
  projectId: "webenrollapp",
  storageBucket: "webenrollapp.firebasestorage.app",
  messagingSenderId: "563093291937",
  appId: "1:563093291937:web:cefe2c21e185f9fcf501e0",
  measurementId: "G-YK6ED35JMS"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
