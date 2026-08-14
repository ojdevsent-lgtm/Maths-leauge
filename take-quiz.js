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
    serverTimestamp
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
   ELEMENTS
========================================= */

const questionText =
    document.getElementById("questionText");

const answersContainer =
    document.getElementById("answers");

const questionNumber =
    document.getElementById("questionNumber");

const questionCounter =
    document.getElementById("questionCounter");

const progressBar =
    document.getElementById("quizProgress");

const nextButton =
    document.getElementById("nextButton");

const quizMessage =
    document.getElementById("quizMessage");


/* =========================================
   STATE
========================================= */

let currentQuestion = 0;

let score = 0;

let selectedAnswer = null;

let currentUser = null;

let quizSubmitted = false;


/* =========================================
   DAILY QUIZ ID
========================================= */

function getDailyQuizId() {

    const today = new Date();

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
   DATE HELPERS
========================================= */

function getTodayKey() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function getMonthKey() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    return `${year}-${month}`;
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
   HIDE MESSAGE
========================================= */

function hideMessage() {

    if (!quizMessage) return;

    quizMessage.textContent = "";

    quizMessage.classList.remove("show");
}


/* =========================================
   CHECK EXISTING ATTEMPT
========================================= */

async function checkExistingAttempt(user) {

    const quizId =
        getDailyQuizId();

    const attemptRef =
        doc(
            db,
            "quizAttempts",
            user.uid,
            "attempts",
            quizId
        );

    try {

        const snapshot =
            await getDoc(attemptRef);

        if (snapshot.exists()) {

            showMessage(
                "You have already completed today's Daily Quiz."
            );

            nextButton.disabled = true;

            return true;
        }

        return false;

    } catch (error) {

        console.error(
            "Attempt check error:",
            error
        );

        showMessage(
            "Unable to verify your quiz status. Please try again."
        );

        return true;
    }
}


/* =========================================
   DISPLAY QUESTION
========================================= */

function displayQuestion() {

    hideMessage();

    selectedAnswer = null;

    nextButton.disabled = true;


    const question =
        questions[currentQuestion];


    questionText.textContent =
        question.question;


    questionNumber.textContent =
        String(currentQuestion + 1)
            .padStart(2, "0");


    questionCounter.textContent =
        `${currentQuestion + 1} / ${questions.length}`;


    const progress =
        ((currentQuestion + 1) /
            questions.length) * 100;


    progressBar.style.width =
        `${progress}%`;


    answersContainer.innerHTML = "";


    question.answers.forEach(
        (answer, index) => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "answer-button";


            button.innerHTML = `
                <span class="answer-letter">
                    ${String.fromCharCode(65 + index)}
                </span>

                <span>
                    ${answer}
                </span>
            `;


            button.addEventListener(
                "click",
                () => {

                    selectAnswer(
                        index,
                        button
                    );

                }
            );


            answersContainer.appendChild(
                button
            );

        }
    );


    if (
        currentQuestion ===
        questions.length - 1
    ) {

        nextButton.innerHTML = `
            Submit Quiz
            <i class="ri-check-line"></i>
        `;

    } else {

        nextButton.innerHTML = `
            Next Question
            <i class="ri-arrow-right-line"></i>
        `;
    }
}


/* =========================================
   SELECT ANSWER
========================================= */

function selectAnswer(
    answerIndex,
    selectedButton
) {

    selectedAnswer =
        answerIndex;


    document
        .querySelectorAll(".answer-button")
        .forEach(button => {

            button.classList.remove(
                "selected"
            );

        });


    selectedButton.classList.add(
        "selected"
    );


    nextButton.disabled = false;
}


/* =========================================
   NEXT / SUBMIT
========================================= */

nextButton.addEventListener(
    "click",
    async () => {

        if (selectedAnswer === null) {
            return;
        }


        const question =
            questions[currentQuestion];


        if (
            selectedAnswer ===
            question.correct
        ) {

            score++;

        }


        if (
            currentQuestion <
            questions.length - 1
        ) {

            currentQuestion++;

            displayQuestion();

            return;
        }


        await submitQuiz();

    }
);


/* =========================================
   SUBMIT QUIZ
========================================= */

async function submitQuiz() {

    if (quizSubmitted) return;

    quizSubmitted = true;

    nextButton.disabled = true;


    if (!currentUser) {

        showMessage(
            "You must be logged in to submit this quiz."
        );

        quizSubmitted = false;

        nextButton.disabled = false;

        return;
    }


    const quizId =
        getDailyQuizId();


    const todayKey =
        getTodayKey();


    const monthKey =
        getMonthKey();


    const attemptRef =
        doc(
            db,
            "quizAttempts",
            currentUser.uid,
            "attempts",
            quizId
        );


    try {

        /* =====================================
           PREVENT DUPLICATE SUBMISSION
        ===================================== */

        const existingAttempt =
            await getDoc(attemptRef);


        if (existingAttempt.exists()) {

            showMessage(
                "You have already completed today's Daily Quiz."
            );

            quizSubmitted = false;

            return;
        }


        /* =====================================
           SAVE QUIZ ATTEMPT
        ===================================== */

        await setDoc(
            attemptRef,
            {

                quizId:
                    quizId,

                type:
                    "daily",

                score:
                    score,

                totalQuestions:
                    questions.length,

                points:
                    score,

                completedAt:
                    serverTimestamp()

            }
        );


        /* =====================================
           GET STUDENT PROFILE
        ===================================== */

        const profileRef =
            doc(
                db,
                "mlTriviaStudents",
                currentUser.uid
            );


        const profileSnapshot =
            await getDoc(profileRef);


        let fullName =
            currentUser.displayName ||
            "Maths League Student";


        let registrationNumber =
            "";


        if (profileSnapshot.exists()) {

            const profile =
                profileSnapshot.data();


            fullName =
                profile.fullName ||
                profile.name ||
                fullName;


            registrationNumber =
                profile.registrationNumber ||
                "";
        }


        /* =====================================
           LEADERBOARD
        ===================================== */

        const leaderboardRef =
            doc(
                db,
                "leaderboard",
                currentUser.uid
            );


        const leaderboardSnapshot =
            await getDoc(
                leaderboardRef
            );


        let totalPoints =
            score;


        let quizzesTaken =
            1;


        let bestScore =
            score;


        let dailyPoints =
            score;


        let monthlyPoints =
            score;


        if (leaderboardSnapshot.exists()) {

            const previous =
                leaderboardSnapshot.data();


            totalPoints =
                Number(
                    previous.totalPoints || 0
                ) + score;


            quizzesTaken =
                Number(
                    previous.quizzesTaken || 0
                ) + 1;


            bestScore =
                Math.max(
                    Number(
                        previous.bestScore || 0
                    ),
                    score
                );


            /* ================================
               DAILY POINTS
            ================================= */

            if (
                previous.lastQuizDate ===
                todayKey
            ) {

                dailyPoints =
                    Number(
                        previous.dailyPoints || 0
                    ) + score;

            } else {

                dailyPoints =
                    score;
            }


            /* ================================
               MONTHLY POINTS
            ================================= */

            if (
                previous.lastQuizMonth ===
                monthKey
            ) {

                monthlyPoints =
                    Number(
                        previous.monthlyPoints || 0
                    ) + score;

            } else {

                monthlyPoints =
                    score;
            }

        }


        /* =====================================
           UPDATE LEADERBOARD
        ===================================== */

        await setDoc(
            leaderboardRef,
            {

                userId:
                    currentUser.uid,

                fullName:
                    fullName,

                registrationNumber:
                    registrationNumber,

                totalPoints:
                    totalPoints,

                quizzesTaken:
                    quizzesTaken,

                bestScore:
                    bestScore,

                dailyPoints:
                    dailyPoints,

                monthlyPoints:
                    monthlyPoints,

                lastQuizDate:
                    todayKey,

                lastQuizMonth:
                    monthKey,

                updatedAt:
                    serverTimestamp()

            },
            {
                merge: true
            }
        );


        /* =====================================
           SAVE RESULT LOCALLY
        ===================================== */

        localStorage.setItem(
            "mlTriviaLastResult",
            JSON.stringify({

                score:
                    score,

                total:
                    questions.length,

                points:
                    score,

                quizId:
                    quizId

            })
        );


        /* =====================================
           RESULT PAGE
        ===================================== */

        window.location.href =
            "quiz-result.html";

    } catch (error) {

        console.error(
            "Quiz submission failed:",
            error
        );


        showMessage(
            "Your quiz could not be submitted. Please try again."
        );


        quizSubmitted = false;

        nextButton.disabled = false;
    }
}


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "auth.html";

            return;
        }


        currentUser =
            user;


        const alreadyTaken =
            await checkExistingAttempt(
                user
            );


        if (alreadyTaken) {
            return;
        }


        displayQuestion();

    }
);