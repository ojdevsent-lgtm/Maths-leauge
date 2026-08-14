import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs,
    query,
    orderBy
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
   LOAD PROGRESS
========================================= */

async function loadProgress(user) {

    const attemptsRef = collection(
        db,
        "quizAttempts",
        user.uid,
        "attempts"
    );

    try {

        const attemptsQuery = query(
            attemptsRef,
            orderBy("completedAt", "desc")
        );

        const snapshot =
            await getDocs(attemptsQuery);

        let totalPoints = 0;
        let totalScore = 0;
        let totalQuestions = 0;
        let bestScore = 0;

        const attempts = [];

        snapshot.forEach(docSnapshot => {

            const data =
                docSnapshot.data();

            const score =
                Number(data.score || 0);

            const questions =
                Number(data.totalQuestions || 0);

            const points =
                Number(data.points || 0);

            totalPoints += points;

            totalScore += score;

            totalQuestions += questions;

            if (score > bestScore) {
                bestScore = score;
            }

            attempts.push({
                id: docSnapshot.id,
                ...data
            });

        });


        /* =====================================
           CALCULATIONS
        ===================================== */

        const quizzesTaken =
            attempts.length;

        const averageAccuracy =
            totalQuestions > 0
                ? Math.round(
                    (totalScore /
                    totalQuestions) * 100
                )
                : 0;


        /* =====================================
           DISPLAY SUMMARY
        ===================================== */

        setText(
            "totalPoints",
            totalPoints
        );

        setText(
            "quizzesTaken",
            quizzesTaken
        );

        setText(
            "averageScore",
            `${averageAccuracy}%`
        );

        setText(
            "bestScore",
            `${bestScore}/${attempts.length > 0
                ? attempts[0].totalQuestions || 10
                : 10}`
        );


        /* =====================================
           DISPLAY HISTORY
        ===================================== */

        renderHistory(attempts);

    } catch (error) {

        console.error(
            "Progress loading error:",
            error
        );

    }

}


/* =========================================
   TEXT HELPER
========================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }

}


/* =========================================
   QUIZ HISTORY
========================================= */

function renderHistory(attempts) {

    const history =
        document.getElementById(
            "quizHistory"
        );

    if (!history) return;


    history.innerHTML = "";


    if (attempts.length === 0) {

        history.innerHTML = `
            <div class="empty-progress">
                <i class="ri-bar-chart-box-line"></i>

                <p>
                    You haven't completed
                    any quizzes yet.
                </p>
            </div>
        `;

        return;

    }


    attempts.forEach(attempt => {

        const score =
            Number(attempt.score || 0);

        const total =
            Number(attempt.totalQuestions || 0);

        const points =
            Number(attempt.points || 0);


        let dateText =
            "Completed";


        if (attempt.completedAt) {

            const date =
                attempt.completedAt.toDate();

            dateText =
                date.toLocaleDateString(
                    "en-NG",
                    {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    }
                );

        }


        const item =
            document.createElement("div");

        item.className =
            "progress-history-item";


        item.innerHTML = `

            <div class="history-icon">
                <i class="ri-check-line"></i>
            </div>

            <div class="history-info">

                <strong>
                    ${
                        attempt.type === "daily"
                            ? "Daily Quiz"
                            : "Quiz"
                    }
                </strong>

                <span>
                    ${dateText}
                </span>

            </div>

            <div class="history-score">

                <strong>
                    ${score}/${total}
                </strong>

                <span>
                    ${points} pts
                </span>

            </div>

        `;


        history.appendChild(item);

    });

}


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "auth.html";

            return;

        }

        loadProgress(user);

    }
);