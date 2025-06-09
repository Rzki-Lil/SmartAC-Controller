import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider} from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBA6_9N-MpkZ_kI6qC9L7tEC4EAZQRIrVo",
    authDomain: "latihan1-firebase-a0dfa.firebaseapp.com",
    databaseURL: "https://latihan1-firebase-a0dfa-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "latihan1-firebase-a0dfa",
    storageBucket: "latihan1-firebase-a0dfa.firebasestorage.app",
    messagingSenderId: "891995696037",
    appId: "1:891995696037:web:e88d1fdf1bad33f6be964c"
  };
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app); 
export const googleProvider = new GoogleAuthProvider(); 