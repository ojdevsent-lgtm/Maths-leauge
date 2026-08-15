import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getDailyQuiz = httpsCallable(functions, "getDailyQuiz");
const dailyQuiz = document.getElementById("dailyQuiz");
const dailyStatus = document.getElementById("dailyStatus");
const quizMessage = document.getElementById("quizMessage");

function message(text) {
  if (!quizMessage) return;
  quizMessage.textContent = text;
  quizMessage.classList.add("show");
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    dailyStatus.textContent = "Login Required";
    dailyQuiz?.setAttribute("aria-disabled", "true");
    return;
  }
  try {
    const result = await getDailyQuiz();
    const data = result.data;
    dailyQuiz.dataset.completed = data.completed ? "true" : "false";
    dailyStatus.textContent = data.completed ? "Already Taken" : "Available";
    dailyStatus.classList.toggle("available", !data.completed);
  } catch (error) {
    console.error(error);
    message("We couldn't check your quiz status. Please try again.");
  }
});

dailyQuiz?.addEventListener("click", () => {
  if (!auth.currentUser) return (window.location.href = "auth.html");
  if (dailyQuiz.dataset.completed === "true") {
    message("Quiz already taken. You have already completed today's Daily Quiz.");
    return;
  }
  window.location.href = "take-quiz.html";
});
