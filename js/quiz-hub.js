import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBjjAVhUzy9HKuaXfmpKmNsoABd1ZEQ0zk",
  authDomain: "mltp-9f154.firebaseapp.com",
  projectId: "mltp-9f154",
  storageBucket: "mltp-9f154.firebasestorage.app",
  messagingSenderId: "787010966941",
  appId: "1:787010966941:web:1d4e4553cc502a6a27cb74",
  measurementId: "G-68NNYR62Z2"
};


/* Initialize */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================
   ELEMENTS
========================================= */

const dailyQuiz =
  document.getElementById("dailyQuiz");

const dailyStatus =
  document.getElementById("dailyStatus");

const quizMessage =
  document.getElementById("quizMessage");


/* =========================================
   TODAY'S QUIZ ID
========================================= */

function getDailyQuizId() {
  
  const today =
    new Date();
  
  const year =
    today.getFullYear();
  
  const month =
    String(today.getMonth() + 1)
    .padStart(2, "0");
  
  const day =
    String(today.getDate())
    .padStart(2, "0");
  
  return `daily_${year}_${month}_${day}`;
}


/* =========================================
   MESSAGE
========================================= */

function showMessage(message) {
  
  if (!quizMessage) return;
  
  quizMessage.textContent =
    message;
  
  quizMessage.classList.add("show");
  
}


/* =========================================
   CHECK DAILY QUIZ
========================================= */

async function checkDailyQuiz(user) {
  
  if (!user) {
    
    if (dailyStatus) {
      
      dailyStatus.textContent =
        "Login required";
      
    }
    
    return;
    
  }
  
  
  const quizId =
    getDailyQuizId();
  
  
  /*
      Each student's quiz attempt
      is stored here:

      quizAttempts
          ↓
      student UID
          ↓
      daily_YYYY_MM_DD
  */
  
  const attemptRef =
    doc(
      db,
      "quizAttempts",
      user.uid,
      "attempts",
      quizId
    );
  
  
  try {
    
    const attemptSnapshot =
      await getDoc(attemptRef);
    
    
    if (attemptSnapshot.exists()) {
      
      /* Already completed */
      
      dailyQuiz.dataset.completed =
        "true";
      
      dailyStatus.textContent =
        "Already Taken";
      
      dailyStatus.classList.remove(
        "available"
      );
      
    } else {
      
      /* Available */
      
      dailyQuiz.dataset.completed =
        "false";
      
      dailyStatus.textContent =
        "Available";
      
      dailyStatus.classList.add(
        "available"
      );
      
    }
    
  } catch (error) {
    
    console.error(
      "Quiz check failed:",
      error
    );
    
    showMessage(
      "We couldn't check your quiz status. Please try again."
    );
    
  }
  
}


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(
  auth,
  user => {
    
    if (user) {
      
      checkDailyQuiz(user);
      
    } else {
      
      if (dailyStatus) {
        
        dailyStatus.textContent =
          "Login Required";
        
        dailyStatus.classList.remove(
          "available"
        );
        
      }
      
    }
    
  }
);


/* =========================================
   DAILY QUIZ CLICK
========================================= */

dailyQuiz?.addEventListener(
  "click",
  async () => {
    
    const user =
      auth.currentUser;
    
    
    /* Not logged in */
    
    if (!user) {
      
      window.location.href =
        "auth.html";
      
      return;
      
    }
    
    
    /* Already completed */
    
    if (
      dailyQuiz.dataset.completed ===
      "true"
    ) {
      
      showMessage(
        "Quiz already taken. You have already completed today's Daily Quiz."
      );
      
      return;
      
    }
    
    
    /*
        Quiz is available.

        We will connect this to
        take-quiz.html next.
    */
    
    window.location.href =
      "take-quiz.html";
    
  }
);