import { auth, db } from "../firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { MATHS_LEAGUE_TRIVIA } from "../data/quiz-bank.js";

const ANSWER_KEY = [1,1,1,0,0,0,0,2,1,3];
const message = document.getElementById("message");
const button = document.getElementById("seedButton");
let admin = false;

onAuthStateChanged(auth, async (user) => {
  if (!user) { message.textContent = "Sign in with the administrator account first."; button.disabled = true; return; }
  try {
    const adminSnap = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js").then(({ getDoc }) => getDoc(doc(db, "admin_users", user.uid)));
    admin = adminSnap.exists();
    if (!admin) { message.textContent = "This account is not registered as an admin."; button.disabled = true; }
  } catch { message.textContent = "Could not verify administrator access."; button.disabled = true; }
});

button.addEventListener("click", async () => {
  if (!admin) return;
  button.disabled = true;
  message.textContent = "Creating quiz…";
  try {
    const quizRef = doc(db, "quizzes", MATHS_LEAGUE_TRIVIA.id);
    await setDoc(quizRef, {
      title: MATHS_LEAGUE_TRIVIA.title,
      description: MATHS_LEAGUE_TRIVIA.description,
      category: MATHS_LEAGUE_TRIVIA.category,
      difficulty: MATHS_LEAGUE_TRIVIA.difficulty,
      durationMinutes: MATHS_LEAGUE_TRIVIA.durationMinutes,
      totalPoints: MATHS_LEAGUE_TRIVIA.totalPoints,
      questionCount: MATHS_LEAGUE_TRIVIA.questions.length,
      status: "live",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    const batch = writeBatch(db);
    MATHS_LEAGUE_TRIVIA.questions.forEach((question) => {
      batch.set(doc(db, "quizzes", MATHS_LEAGUE_TRIVIA.id, "questions", question.id), question);
    });
    batch.set(doc(db, "quizAnswerKeys", MATHS_LEAGUE_TRIVIA.id), { answers: ANSWER_KEY, updatedAt: serverTimestamp() });
    await batch.commit();
    message.textContent = "Quiz created successfully. You can now open the Quiz Arena.";
  } catch (error) {
    console.error(error);
    message.textContent = "Quiz setup failed. Make sure this account is in admin_users and the Firestore rules are deployed.";
    button.disabled = false;
  }
});
