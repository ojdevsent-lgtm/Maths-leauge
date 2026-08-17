import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdYsOfSibP0OF_r2zYuHnJokwijfjnivU",
  authDomain: "maths-league.firebaseapp.com",
  projectId: "maths-league",
  storageBucket: "maths-league.firebasestorage.app",
  messagingSenderId: "847559537753",
  appId: "1:847559537753:web:6dc7dfdead207428deed48",
  measurementId: "G-2Z467KX0SQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
