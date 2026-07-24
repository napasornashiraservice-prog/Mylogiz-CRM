import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// Config from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCyREXzLVsm58HPO8X2OxKShD8ta_3Gao8",
  authDomain: "zinc-brook-zmjvc.firebaseapp.com",
  projectId: "zinc-brook-zmjvc",
  storageBucket: "zinc-brook-zmjvc.firebasestorage.app",
  messagingSenderId: "292826474351",
  appId: "1:292826474351:web:82e8d86b95d2ea8996aa9a"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID provided by AI Studio
const databaseId = "ai-studio-mylogizsalescrm-af80fbab-c71c-4207-ae87-dcd1d8388c60";
export const db = databaseId 
  ? initializeFirestore(app, {}, databaseId)
  : getFirestore(app);
