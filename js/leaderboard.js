import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    getDocs
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


const app =
    initializeApp(firebaseConfig);


const auth =
    getAuth(app);


const db =
    getFirestore(app);


/* =========================================
   ELEMENTS
========================================= */

const rankingList =
    document.getElementById("rankingList");

const topThree =
    document.getElementById("topThree");

const rankingStatus =
    document.getElementById("rankingStatus");

const message =
    document.getElementById(
        "leaderboardMessage"
    );


/* =========================================
   LOAD LEADERBOARD
========================================= */

async function loadLeaderboard() {

    if (!rankingList) return;


    rankingList.innerHTML = `
        <div class="leaderboard-loading">
            Loading rankings...
        </div>
    `;


    try {

        const leaderboardRef =
            collection(
                db,
                "leaderboard"
            );


        const snapshot =
            await getDocs(
                leaderboardRef
            );


        const students = [];


        snapshot.forEach(documentSnapshot => {

            const data =
                documentSnapshot.data();


            students.push({

                id:
                    documentSnapshot.id,

                fullName:
                    data.fullName ||
                    "Maths League Student",

                registrationNumber:
                    data.registrationNumber ||
                    "—",

                totalPoints:
                    Number(
                        data.totalPoints || 0
                    ),

                quizzesTaken:
                    Number(
                        data.quizzesTaken || 0
                    ),

                bestScore:
                    Number(
                        data.bestScore || 0
                    )

            });

        });


        /* =====================================
           SORT
        ===================================== */

        students.sort(
            (a, b) =>
                b.totalPoints -
                a.totalPoints
        );


        if (students.length === 0) {

            rankingList.innerHTML = `
                <div class="leaderboard-empty">

                    No rankings yet.

                    <br>

                    Complete a quiz to
                    appear here.

                </div>
            `;

            if (topThree) {
                topThree.innerHTML = "";
            }

            return;

        }


        /* =====================================
           TOP THREE
        ===================================== */

        renderTopThree(
            students.slice(0, 3)
        );


        /* =====================================
           FULL LIST
        ===================================== */

        renderRankingList(
            students
        );


    } catch (error) {

        console.error(
            "Leaderboard error:",
            error
        );


        rankingList.innerHTML = `
            <div class="leaderboard-empty">

                Unable to load leaderboard.

                <br>

                Please try again.

            </div>
        `;

    }

}


/* =========================================
   TOP THREE
========================================= */

function renderTopThree(students) {

    if (!topThree) return;


    topThree.innerHTML = "";


    const labels = [
        "2ND",
        "1ST",
        "3RD"
    ];


    const classes = [
        "",
        "first",
        ""
    ];


    const ordered = [];


    if (students[1]) {
        ordered.push({
            student: students[1],
            label: labels[0],
            className: classes[0]
        });
    }


    if (students[0]) {
        ordered.push({
            student: students[0],
            label: labels[1],
            className: classes[1]
        });
    }


    if (students[2]) {
        ordered.push({
            student: students[2],
            label: labels[2],
            className: classes[2]
        });
    }


    ordered.forEach(item => {

        const student =
            item.student;


        const card =
            document.createElement("div");


        card.className =
            `top-card ${item.className}`;


        card.innerHTML = `

            <span class="top-rank">
                ${item.label}
            </span>

            <strong class="top-name">
                ${escapeHTML(
                    student.fullName
                )}
            </strong>

            <span class="top-points">
                ${student.totalPoints} pts
            </span>

        `;


        topThree.appendChild(card);

    });

}


/* =========================================
   FULL RANKINGS
========================================= */

function renderRankingList(students) {

    rankingList.innerHTML = "";


    students.forEach(
        (student, index) => {

            const rank =
                index + 1;


            const item =
                document.createElement("div");


            item.className =
                "ranking-item";


            item.innerHTML = `

                <div class="ranking-number">
                    #${rank}
                </div>


                <div>

                    <strong class="ranking-name">
                        ${escapeHTML(
                            student.fullName
                        )}
                    </strong>

                    <span class="ranking-id">
                        ${escapeHTML(
                            student.registrationNumber
                        )}
                    </span>

                </div>


                <div class="ranking-points">

                    <strong>
                        ${student.totalPoints}
                    </strong>

                    <span>
                        points
                    </span>

                </div>

            `;


            rankingList.appendChild(
                item
            );

        }
    );

}


/* =========================================
   HTML SAFETY
========================================= */

function escapeHTML(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/* =========================================
   TABS
========================================= */

const tabs =
    document.querySelectorAll(
        ".leaderboard-tab"
    );


tabs.forEach(tab => {

    tab.addEventListener(
        "click",
        () => {

            tabs.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });


            tab.classList.add(
                "active"
            );


            const ranking =
                tab.dataset.ranking;


            if (rankingStatus) {

                rankingStatus.textContent =
                    ranking.charAt(0)
                    .toUpperCase()
                    + ranking.slice(1);

            }


            /*
             * Overall is currently
             * the live ranking.
             *
             * Daily and Monthly
             * filtering will be added
             * after the base leaderboard
             * is confirmed working.
             */

            loadLeaderboard();

        }
    );

});


/* =========================================
   AUTHENTICATION
========================================= */

onAuthStateChanged(
    auth,
    user => {

        if (!user) {

            window.location.href =
                "auth.html";

            return;

        }


        loadLeaderboard();

    }
);