import { requireUser, onSignedOut } from "./core/session.js";
import { getDailyQuiz } from "./services/quiz.service.js";

const dailyQuiz = document.getElementById("dailyQuiz");
const dailyStatus = document.getElementById("dailyStatus");
const quizMessage = document.getElementById("quizMessage");

function message(text) {
  if (!quizMessage) return;
  quizMessage.textContent = text;
  quizMessage.classList.add("show");
}

async function loadQuizStatus() {
  try {
    const user = await requireUser();
    if (!user) return;
    const data = await getDailyQuiz();
    const available = Array.isArray(data.questions) && data.questions.length > 0;
    dailyQuiz?.setAttribute("data-completed", data.completed ? "true" : "false");
    dailyQuiz?.setAttribute("data-active", available ? "true" : "false");
    if (dailyStatus) {
      dailyStatus.textContent = !available ? "Unavailable" : data.completed ? "Already Taken" : "Available";
      dailyStatus.classList.toggle("available", available && !data.completed);
    }
  } catch (error) {
    console.error("Quiz status failed:", error);
    message(error.message || "We couldn't check your quiz status. Please try again.");
  }
}

loadQuizStatus();
onSignedOut();

dailyQuiz?.addEventListener("click", () => {
  if (dailyQuiz.dataset.active === "false") return message("Today's Daily Quiz is currently unavailable.");
  if (dailyQuiz.dataset.completed === "true") return message("Quiz already taken. You have already completed today's Daily Quiz.");
  location.href = "take-quiz.html";
});
