import { auth, db } from "../firebase/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { MATHS_LEAGUE_TRIVIA } from "../data/quiz-bank.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const quizId = params.get("id") || MATHS_LEAGUE_TRIVIA.id;
let questions = [];
let answers = {};
let current = 0;
let startedAt = null;
let timerId = null;
let secondsLeft = MATHS_LEAGUE_TRIVIA.durationMinutes * 60;
let currentUser = null;

function setState(text) { $("quizState").textContent = text; $("quizState").hidden = false; $("quizArena").hidden = true; }
function renderQuestion() {
  const q = questions[current];
  $("questionCounter").textContent = `Question ${current + 1} of ${questions.length}`;
  $("progressBar").style.width = `${((current + 1) / questions.length) * 100}%`;
  $("questionText").textContent = q.text;
  $("options").innerHTML = q.options.map((option, index) => `<button type="button" class="option${answers[q.id] === index ? " selected" : ""}" data-index="${index}"><span class="option-index">${String.fromCharCode(65 + index)}</span><span>${option}</span></button>`).join("");
  document.querySelectorAll(".option").forEach((button) => button.addEventListener("click", () => { answers[q.id] = Number(button.dataset.index); renderQuestion(); }));
  $("previousButton").disabled = current === 0;
  $("nextButton").textContent = current === questions.length - 1 ? "Submit quiz" : "Next";
}
function renderTimer() {
  const m = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const s = (secondsLeft % 60).toString().padStart(2, "0");
  $("timer").textContent = `${m}:${s}`;
  $("timer").classList.toggle("warning", secondsLeft <= 60);
}
async function loadQuestions() {
  try {
    const snap = await getDoc(doc(db, "quizzes", quizId));
    if (!snap.exists()) throw new Error("quiz-not-found");
    const data = snap.data();
    if (data.status !== "live") throw new Error("quiz-not-live");
    $("quizTitle").textContent = data.title || MATHS_LEAGUE_TRIVIA.title;
    const qSnap = await getDocs(query(collection(db, "quizzes", quizId, "questions"), orderBy("order", "asc")));
    questions = qSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
    if (!questions.length) throw new Error("no-questions");
    secondsLeft = Number(data.durationMinutes || 10) * 60;
  } catch (error) {
    if (quizId === MATHS_LEAGUE_TRIVIA.id) {
      questions = MATHS_LEAGUE_TRIVIA.questions;
      $("quizTitle").textContent = MATHS_LEAGUE_TRIVIA.title;
    } else throw error;
  }
}
async function submitQuiz(autoSubmitted = false) {
  clearInterval(timerId);
  const answered = Object.keys(answers).length;
  const payload = {
    studentId: currentUser.uid,
    quizId,
    quizTitle: $("quizTitle").textContent,
    status: "submitted",
    answers,
    totalQuestions: questions.length,
    answeredQuestions: answered,
    startedAt,
    submittedAt: serverTimestamp(),
    autoSubmitted
  };
  try {
    await addDoc(collection(db, "attempts"), payload);
    $("quizArena").hidden = true;
    $("quizState").hidden = true;
    $("quizComplete").hidden = false;
    $("completeMessage").textContent = autoSubmitted ? "Time expired. Your answers were submitted." : "Your answers have been recorded.";
  } catch (error) {
    console.error(error);
    setState("We couldn't submit your quiz. Check your connection and try again.");
  }
}
$("previousButton").addEventListener("click", () => { if (current > 0) { current -= 1; renderQuestion(); } });
$("nextButton").addEventListener("click", () => { if (current < questions.length - 1) { current += 1; renderQuestion(); } else submitQuiz(false); });
$("quitButton").addEventListener("click", () => { if (confirm("Exit this quiz? Your current answers will not be submitted.")) location.href = "dashboard.html"; });
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.replace("../login.html"); return; }
  currentUser = user;
  try {
    await loadQuestions();
    startedAt = new Date().toISOString();
    $("quizState").hidden = true;
    $("quizArena").hidden = false;
    renderQuestion(); renderTimer();
    timerId = setInterval(() => { secondsLeft -= 1; renderTimer(); if (secondsLeft <= 0) submitQuiz(true); }, 1000);
  } catch (error) {
    console.error(error);
    setState(error.message === "quiz-not-live" ? "This quiz is not currently live." : "We couldn't load this quiz. Please try again later.");
  }
});
