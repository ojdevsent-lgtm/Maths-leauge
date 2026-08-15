import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjjAVhUzy9HKuaXfmpKmNsoABd1ZEQ0zk",
  authDomain: "mltp-9f154.firebaseapp.com",
  projectId: "mltp-9f154",
  storageBucket: "mltp-9f154.firebasestorage.app",
  messagingSenderId: "787010966941",
  appId: "1:787010966941:web:1d4e4553cc502a6a27cb74"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
