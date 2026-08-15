import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getDailyQuiz = httpsCallable(functions, "getDailyQuiz");
const submitDailyQuiz = httpsCallable(functions, "submitDailyQuiz");

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

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.innerHTML = `<span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(answer)}</span>`;
    if (answers[currentQuestion] === index) button.classList.add("selected");
    button.addEventListener("click", () => {
      answers[currentQuestion] = index;
      document.querySelectorAll(".answer-button").forEach(b => b.classList.remove("selected"));
      button.classList.add("selected");
      nextButton.disabled = false;
    });
    answersContainer.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char]));
}

async function start() {
  const user = await new Promise(resolve => onAuthStateChanged(auth, resolve));
  if (!user) return (window.location.href = "auth.html");

  try {
    const result = await getDailyQuiz();
    const data = result.data;
    if (data.completed) {
      showMessage("You have already completed today's Daily Quiz.");
      nextButton.disabled = true;
      return;
    }
    questions = data.questions || [];
    answers = new Array(questions.length).fill(null);
    if (!questions.length) throw new Error("No quiz is available.");
    displayQuestion();
  } catch (error) {
    console.error(error);
    showMessage(error?.message || "Unable to load today's quiz.");
    nextButton.disabled = true;
  }
}

nextButton?.addEventListener("click", async () => {
  if (submitting || answers[currentQuestion] == null) return;
  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    displayQuestion();
    return;
  }

  submitting = true;
  nextButton.disabled = true;
  showMessage("Submitting your answers…");
  try {
    const result = await submitDailyQuiz({ answers });
    localStorage.setItem("mlTriviaLastResult", JSON.stringify(result.data));
    window.location.href = "quiz-result.html";
  } catch (error) {
    console.error(error);
    submitting = false;
    nextButton.disabled = false;
    showMessage(error?.message || "Your quiz could not be submitted. Please try again.");
  }
});

$("exitQuiz")?.addEventListener("click", () => {
  if (!submitting) window.location.href = "quiz.html";
});

start();
