import { requireUser, onSignedOut } from "./core/session.js";
import { getDailyQuiz, submitDailyQuiz } from "./services/quiz.service.js";

const $ = id => document.getElementById(id);
const questionText = $("questionText");
const answersContainer = $("answers");
const questionNumber = $("questionNumber");
const questionCounter = $("questionCounter");
const progressBar = $("quizProgress");
const nextButton = $("nextButton");
const quizMessage = $("quizMessage");

let questions = [];
let currentQuestion = 0;
let answers = [];
let submitting = false;

function showMessage(text) {
  if (!quizMessage) return;
  quizMessage.textContent = text;
  quizMessage.classList.add("show");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}

function displayQuestion() {
  const question = questions[currentQuestion];
  if (!question) return;
  answersContainer.innerHTML = "";
  questionText.textContent = question.question;
  questionNumber.textContent = String(currentQuestion + 1).padStart(2, "0");
  questionCounter.textContent = `${currentQuestion + 1} / ${questions.length}`;
  progressBar.style.width = `${((currentQuestion + 1) / questions.length) * 100}%`;
  nextButton.disabled = answers[currentQuestion] == null;
  nextButton.innerHTML = currentQuestion === questions.length - 1
    ? 'Submit Quiz <i class="ri-check-line"></i>'
    : 'Next Question <i class="ri-arrow-right-line"></i>';

  const options = Array.isArray(question.options) ? question.options : [];
  options.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.innerHTML = `<span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(answer)}</span>`;
    if (answers[currentQuestion] === index) button.classList.add("selected");
    button.addEventListener("click", () => {
      answers[currentQuestion] = index;
      document.querySelectorAll(".answer-button").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      nextButton.disabled = false;
    });
    answersContainer.appendChild(button);
  });
}

async function start() {
  try {
    const user = await requireUser();
    if (!user) return;
    const data = await getDailyQuiz();
    if (data.completed) {
      showMessage("You have already completed today's Daily Quiz.");
      nextButton.disabled = true;
      return;
    }
    questions = Array.isArray(data.questions) ? data.questions : [];
    answers = new Array(questions.length).fill(null);
    if (!questions.length) throw new Error("No quiz is available today.");
    displayQuestion();
  } catch (error) {
    console.error("Quiz start failed:", error);
    showMessage(error.message || "Unable to load today's quiz.");
    if (nextButton) nextButton.disabled = true;
  }
}

nextButton?.addEventListener("click", async () => {
  if (submitting || answers[currentQuestion] == null) return;
  if (currentQuestion < questions.length - 1) {
    currentQuestion += 1;
    displayQuestion();
    return;
  }

  submitting = true;
  nextButton.disabled = true;
  showMessage("Submitting your answers…");
  try {
    const payload = questions.map((question, index) => ({
      questionId: question.id,
      answer: answers[index]
    }));
    const result = await submitDailyQuiz(payload);
    localStorage.setItem("mlTriviaLastResult", JSON.stringify(result));
    location.href = "quiz-result.html";
  } catch (error) {
    console.error("Quiz submission failed:", error);
    submitting = false;
    nextButton.disabled = false;
    showMessage(error.message || "Your quiz could not be submitted. Please try again.");
  }
});

$("exitQuiz")?.addEventListener("click", event => {
  if (submitting) event.preventDefault();
});

start();
onSignedOut();
