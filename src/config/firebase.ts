import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCfMh-tghkkH2d5MR2ROyNt3XIEwp_sNcA",
  authDomain: "laser-erp-c9706.firebaseapp.com",
  projectId: "laser-erp-c9706",
  storageBucket: "laser-erp-c9706.firebasestorage.app",
  messagingSenderId: "634075955542",
  appId: "1:634075955542:web:d42b0d9f60ef08183656f7",
  measurementId: "G-6DFWXC8M1E",
  databaseURL: "https://laser-erp-c9706-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
