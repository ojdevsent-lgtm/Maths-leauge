/* =========================================
   ML TRIVIA — QUIZ ENGINE
========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
doc,
getDoc,
setDoc,
collection,
addDoc,
getDocs,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================
   FIREBASE CONFIG
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


/* =========================================
   INITIALIZE FIREBASE
========================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* =========================================
   QUESTIONS
========================================= */

const questions = [

    {
        question: "What is the name of Maths League's founder?",
        answers: [
            "Akande Great",
            "Umukoro Efe",
            "Umukoro Valerie",
            "None of the above"
        ],
        correct: 1
    },

    {
        question: "What is the status of Maths League founder?",
        answers: [
            "A graduate",
            "A student",
            "A married man",
            "None of the above"
        ],
        correct: 1
    },

    {
        question: "When was Maths League created?",
        answers: [
            "19th Aug, 2026",
            "19th Aug, 2024",
            "19th Aug, 2025",
            "19th Aug, 2023"
        ],
        correct: 1
    },

    {
        question: "Who is the pioneer president of Maths League?",
        answers: [
            "Ezeh Chris",
            "Umukoro Efe",
            "Uwayinor Joan",
            "Akande Great"
        ],
        correct: 0
    },

    {
        question: "Who is Akande Great in Maths League?",
        answers: [
            "She's the VIP",
            "She's the President",
            "She's the PRO",
            "She's the Admin"
        ],
        correct: 0
    },

    {
        question: "What was one of Maths League's goals toward a 2-year anniversary?",
        answers: [
            "Over 100 members on all platforms",
            "Organising daily challenges",
            "Organising competitions",
            "Having maths seminars"
        ],
        correct: 0
    },

    {
        question: "What position do you think got initiated into Maths League recently?",
        answers: [
            "Director of Technology",
            "Admin of the League",
            "Pioneer President",
            "Vice President"
        ],
        correct: 0
    },

    {
        question: "Which individual won Mathematician of the Year Award (2025)?",
        answers: [
            "Onoride Merit",
            "Favour Anita",
            "Uwayinor Joan",
            "Ezeh Chris"
        ],
        correct: 2
    },

    {
        question: "By 19th August 2030, Maths League would be ____ years old.",
        answers: [
            "5 years",
            "6 years",
            "4 years",
            "2 years"
        ],
        correct: 1
    },

    {
        question: "What topic was the last quiz organised on in Maths League?",
        answers: [
            "Probability",
            "Matrix",
            "Sequences & Series",
            "Simultaneous Equations"
        ],
        correct: 3
    }

];


/* =========================================
   QUIZ VARIABLES
========================================= */
const QUIZ_ID = "ml-trivia-001";
let currentQuestion = 0;

let score = 0;

let selectedAnswer = null;

let answered = false;

let timeRemaining = 60;

let timerInterval = null;

let currentUser = null;


/* =========================================
   ELEMENTS
========================================= */

const questionText =
    document.getElementById("questionText");

const answersContainer =
    document.getElementById("answers");

const questionNumber =
    document.getElementById("questionNumber");

const totalQuestions =
    document.getElementById("totalQuestions");

const timeDisplay =
    document.getElementById("timeRemaining");

const nextButton =
    document.getElementById("nextQuestion");

const feedback =
    document.getElementById("answerFeedback");

const quizContent =
    document.querySelector(".quiz-content");

const quizResult =
    document.getElementById("quizResult");

const finalScore =
    document.getElementById("finalScore");

const correctAnswers =
    document.getElementById("correctAnswers");

const earnedPoints =
    document.getElementById("earnedPoints");

const finalPercentage =
    document.getElementById("finalPercentage");


/* =========================================
   AUTH CHECK
========================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "auth.html";

            return;
        }

        currentUser = user;

        startQuiz();

    }
);


/* =========================================
   START QUIZ
========================================= */

async function startQuiz() {

    if (!currentUser) return;

    try {

        const resultsRef = collection(
            db,
            "mlTriviaStudents",
            currentUser.uid,
            "quizResults"
        );

        const resultsSnapshot =
            await getDocs(resultsRef);

        const alreadyCompleted =
            resultsSnapshot.docs.some(
                docSnapshot =>
                    docSnapshot.data().quizId === QUIZ_ID
            );

        if (alreadyCompleted) {

            showAlreadyCompleted();

            return;
        }

        currentQuestion = 0;
        score = 0;
        selectedAnswer = null;
        answered = false;

        quizContent.style.display = "block";

        quizResult.classList.remove("active");

        totalQuestions.textContent =
            questions.length;

        loadQuestion();

    } catch (error) {

        console.error(
            "Could not check quiz status:",
            error
        );

        alert(
            "Unable to check your quiz status. Please try again."
        );

    }

}

function showAlreadyCompleted() {

    quizContent.style.display = "none";

    quizResult.classList.add("active");

    const resultDescription =
        quizResult.querySelector(
            ".result-description"
        );

    if (resultDescription) {

        resultDescription.textContent =
            "You have already completed this quiz. Your result has been recorded in your Maths League progress.";

    }

    finalScore.textContent = "Completed";

    correctAnswers.textContent = "—";

    earnedPoints.textContent = "—";

    finalPercentage.textContent = "—";

    const retryButton =
        document.getElementById("retryButton");

    if (retryButton) {

        retryButton.style.display = "none";

    }

}


/* =========================================
   LOAD QUESTION
========================================= */

function loadQuestion() {

    clearInterval(timerInterval);

    selectedAnswer = null;

    answered = false;

    nextButton.disabled = true;

    feedback.className =
        "answer-feedback";

    feedback.textContent = "";


    const question =
        questions[currentQuestion];


    questionNumber.textContent =
        currentQuestion + 1;


    questionText.textContent =
        question.question;


    answersContainer.innerHTML = "";


    question.answers.forEach(
        (answer, index) => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "answer-option";


            button.innerHTML = `

                <span class="answer-letter">
                    ${String.fromCharCode(65 + index)}
                </span>

                <span class="answer-text">
                    ${answer}
                </span>

            `;


            button.addEventListener(
                "click",
                () => selectAnswer(
                    index,
                    button
                )
            );


            answersContainer.appendChild(
                button
            );

        }
    );


    startTimer();

}


/* =========================================
   SELECT ANSWER
========================================= */

function selectAnswer(
    answerIndex,
    selectedButton
) {

    if (answered) return;

    answered = true;

    selectedAnswer = answerIndex;

    clearInterval(timerInterval);


    const question =
        questions[currentQuestion];


    const answerButtons =
        document.querySelectorAll(
            ".answer-option"
        );


    answerButtons.forEach(
        (button, index) => {

            button.classList.add(
                "disabled"
            );

            button.disabled = true;


            if (
                index ===
                question.correct
            ) {

                button.classList.add(
                    "correct"
                );

            }

        }
    );


    if (
        answerIndex ===
        question.correct
    ) {

        score++;

        selectedButton.classList.add(
            "correct"
        );

        feedback.textContent =
            "Correct! Well done.";

        feedback.className =
            "answer-feedback correct";

    } else {

        selectedButton.classList.add(
            "wrong"
        );

        feedback.textContent =
            `Incorrect. The correct answer is "${question.answers[question.correct]}".`;

        feedback.className =
            "answer-feedback wrong";

    }


    nextButton.disabled = false;


    if (
        currentQuestion ===
        questions.length - 1
    ) {

        nextButton.querySelector(
            "span"
        ).textContent =
            "Finish Quiz";

    }

}


/* =========================================
   TIMER
========================================= */

function startTimer() {

    timeRemaining = 60;

    updateTimer();


    timerInterval =
        setInterval(() => {

            timeRemaining--;

            updateTimer();


            if (timeRemaining <= 0) {

                clearInterval(
                    timerInterval
                );

                handleTimeUp();

            }

        }, 1000);

}


/* =========================================
   UPDATE TIMER
========================================= */

function updateTimer() {

    timeDisplay.textContent =
        timeRemaining;

}


/* =========================================
   TIME UP
========================================= */

function handleTimeUp() {

    if (answered) return;

    answered = true;


    const question =
        questions[currentQuestion];


    const answerButtons =
        document.querySelectorAll(
            ".answer-option"
        );


    answerButtons.forEach(
        (button, index) => {

            button.disabled = true;

            button.classList.add(
                "disabled"
            );


            if (
                index ===
                question.correct
            ) {

                button.classList.add(
                    "correct"
                );

            }

        }
    );


    feedback.textContent =
        `Time's up. The correct answer is "${question.answers[question.correct]}".`;

    feedback.className =
        "answer-feedback wrong";


    nextButton.disabled = false;

}


/* =========================================
   NEXT QUESTION
========================================= */

nextButton.addEventListener(
    "click",
    () => {

        if (!answered) return;


        if (
            currentQuestion <
            questions.length - 1
        ) {

            currentQuestion++;

            loadQuestion();

        } else {

            finishQuiz();

        }

    }
);


/* =========================================
   FINISH QUIZ
========================================= */

async function finishQuiz() {

    clearInterval(timerInterval);


    const total =
        questions.length;


    const percentage =
        Math.round(
            (score / total) * 100
        );


    /*
       Each correct answer = 10 points.
       Maximum = 100 points.
    */

    const points =
        score * 10;


    quizContent.style.display =
        "none";


    quizResult.classList.add(
        "active"
    );


    finalScore.textContent =
        `${score}/${total}`;


    correctAnswers.textContent =
        score;


    earnedPoints.textContent =
        points;


    finalPercentage.textContent =
        `${percentage}%`;


    await saveQuizResult(
        score,
        total,
        percentage,
        points
    );

}


/* =========================================
   SAVE RESULT TO FIRESTORE
========================================= */

async function saveQuizResult(
    correct,
    total,
    percentage,
    points
) {

    if (!currentUser) return;


    try {

        const studentRef =
            doc(
                db,
                "mlTriviaStudents",
                currentUser.uid
            );


        const studentSnapshot =
            await getDoc(studentRef);


        if (!studentSnapshot.exists()) {

            console.error(
                "Student profile not found."
            );

            return;
        }


        const student =
            studentSnapshot.data();


        const oldPoints =
            Number(
                student.totalPoints || 0
            );


        const oldQuizzes =
            Number(
                student.quizzesCompleted || 0
            );


        const oldAverage =
            Number(
                student.averageScore || 0
            );


        const newQuizzes =
            oldQuizzes + 1;


        const newAverage =
            Math.round(
                (
                    (
                        oldAverage *
                        oldQuizzes
                    ) +
                    percentage
                ) /
                newQuizzes
            );


        const newPoints =
            oldPoints + points;


        /* ================================
           UPDATE STUDENT
        ================================= */

        await setDoc(
            studentRef,
            {

                totalPoints:
                    newPoints,

                quizzesCompleted:
                    newQuizzes,

                averageScore:
                    newAverage,

                updatedAt:
                    serverTimestamp()

            },
            {
                merge: true
            }
        );


        /* ================================
           SAVE QUIZ HISTORY
        ================================= */

        await addDoc(
            collection(
                db,
                "mlTriviaStudents",
                currentUser.uid,
                "quizResults"
            ),
            {
                
                quizId: QUIZ_ID,

                correctAnswers:
                    correct,

                totalQuestions:
                    total,

                percentage:
                    percentage,

                points:
                    points,

                completedAt:
                    serverTimestamp()

            }
        );


        console.log(
            "Quiz result saved successfully."
        );


    } catch (error) {

        console.error(
            "Could not save quiz result:",
            error
        );

    }

}


/* =========================================
   DASHBOARD BUTTON
========================================= */

document
    .getElementById("dashboardButton")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );


/* =========================================
   RETRY
========================================= */

document
    .getElementById("retryButton")
    ?.addEventListener(
        "click",
        () => {

            startQuiz();

        }
    );


/* =========================================
   BACK BUTTON
========================================= */

document
    .getElementById("quizBack")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );


/* =========================================
   BOTTOM NAVIGATION
========================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const page =
                    item.dataset.page;


                if (page === "home") {

                    window.location.href =
                        "dashboard.html";

                }


                if (page === "progress") {

                    window.location.href =
                        "progress.html";

                }


                if (page === "profile") {

                    window.location.href =
                        "profile.html";

                }

            }
        );

    });