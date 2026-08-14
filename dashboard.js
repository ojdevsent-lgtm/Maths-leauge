/* =========================================
   ML TRIVIA — STUDENT DASHBOARD
========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc
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
   ELEMENTS
========================================= */

const studentName =
    document.getElementById("studentName");

const registrationNumber =
    document.getElementById("registrationNumber");

const totals =
    document.getElementById("totalPoints");

const quizzesCompleted =
    document.getElementById("quizzesCompleted");

const averageScore =
    document.getElementById("averageScore");

const leagueRank =
    document.getElementById("leagueRank");

const activityEmpty =
    document.getElementById("activityEmpty");

const activityList =
    document.getElementById("activityList");


/* =========================================
   LOAD STUDENT
========================================= */

onAuthStateChanged(
    auth,
    async user => {

        /* ================================
           NO USER
        ================================= */

        if (!user) {

            window.location.href =
                "auth.html";

            return;
        }


        /* ================================
           GET STUDENT DOCUMENT
        ================================= */

        try {

            const studentRef =
                doc(
                    db,
                    "mlTriviaStudents",
                    user.uid
                );


            const studentSnapshot =
                await getDoc(studentRef);


            if (!studentSnapshot.exists()) {

                console.error(
                    "Student profile not found."
                );

                window.location.href =
                    "auth.html";

                return;
            }


            const student =
                studentSnapshot.data();


            /* ================================
               DISPLAY STUDENT
            ================================= */

            if (studentName) {

                const firstName =
                    student.fullName
                        ?.trim()
                        .split(" ")[0];

                studentName.textContent =
                    firstName || "Student";
            }


            if (registrationNumber) {

                registrationNumber.textContent =
                    student.registrationNumber ||
                    "Not assigned";
            }


            if (totalPoints) {

                totalPoints.textContent =
                    student.totalPoints ?? 0;
            }


            if (quizzesCompleted) {

                quizzesCompleted.textContent =
                    student.quizzesCompleted ?? 0;
            }


            if (averageScore) {

                averageScore.textContent =
                    `${student.averageScore ?? 0}%`;
            }


            if (leagueRank) {

                leagueRank.textContent =
                    student.leagueRank || "—";
            }


            /* ================================
               ACTIVITY
            ================================= */

            loadActivity(student);


        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );

        }

    }
);


/* =========================================
   ACTIVITY
========================================= */

function loadActivity(student) {

    /*
       Quiz history will be connected
       when we build the quiz system.

       For now, show the empty state.
    */

    const hasActivity =
        student.quizzesCompleted &&
        student.quizzesCompleted > 0;


    if (hasActivity) {

        if (activityEmpty) {

            activityEmpty.style.display =
                "none";
        }

        if (activityList) {

            activityList.innerHTML = `
                <div class="activity-item">

                    <div class="activity-item-left">

                        <div class="activity-item-icon">

                            <i class="ri-brain-line"></i>

                        </div>

                        <div>

                            <strong>
                                Maths League Quiz
                            </strong>

                            <span>
                                Quiz history will appear here.
                            </span>

                        </div>

                    </div>

                </div>
            `;

        }

    } else {

        if (activityEmpty) {

            activityEmpty.style.display =
                "block";
        }

        if (activityList) {

            activityList.innerHTML = "";
        }

    }

}


/* =========================================
   NAVIGATION
========================================= */

const navItems =
    document.querySelectorAll(".nav-item");


navItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            navItems.forEach(nav => {

                nav.classList.remove(
                    "active"
                );

            });


            item.classList.add("active");


            const page =
                item.dataset.page;


            handleNavigation(page);

        }
    );

});


/* =========================================
   NAVIGATION HANDLER
========================================= */

function handleNavigation(page) {

    switch (page) {

        case "home":

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

            break;


        case "quiz":

            window.location.href =
                "quiz.html";

            break;


        case "progress":

            window.location.href =
                "progress.html";

            break;


        case "profile":

            window.location.href =
                "profile.html";

            break;

    }

}


/* =========================================
   QUICK ACTIONS
========================================= */

document
    .getElementById("quizAction")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "quiz.html";

        }
    );


document
    .getElementById("progressAction")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "progress.html";

        }
    );


document
    .getElementById("startFirstQuiz")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "quiz.html";

        }
    );


/* =========================================
   VIEW ALL ACTIVITY
========================================= */

document
    .getElementById("viewAllActivity")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "progress.html";

        }
    );