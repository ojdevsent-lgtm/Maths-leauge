import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

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

const loading =
    document.getElementById(
        "profileLoading"
    );

const content =
    document.getElementById(
        "profileContent"
    );

const errorBox =
    document.getElementById(
        "profileError"
    );

const fullName =
    document.getElementById(
        "fullName"
    );

const registrationNumber =
    document.getElementById(
        "registrationNumber"
    );

const email =
    document.getElementById(
        "email"
    );

const phone =
    document.getElementById(
        "phone"
    );

const school =
    document.getElementById(
        "school"
    );

const state =
    document.getElementById(
        "state"
    );


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "auth.html";

            return;

        }

        await loadProfile(user);

    }
);


/* =========================================
   LOAD PROFILE
========================================= */

async function loadProfile(user) {

    try {

        const studentRef =
            doc(
                db,
                "mlTriviaStudents",
                user.uid
            );

        const snapshot =
            await getDoc(studentRef);


        if (!snapshot.exists()) {

            throw new Error(
                "Student profile not found."
            );

        }


        const student =
            snapshot.data();


        fullName.textContent =
            student.fullName ||
            "Student";


        registrationNumber.textContent =
            student.registrationNumber ||
            "MLTP00001";


        email.textContent =
            student.email ||
            user.email ||
            "—";


        phone.textContent =
            student.phone ||
            "—";


        school.textContent =
            student.school ||
            "—";


        state.textContent =
            student.state ||
            "—";


        loading.style.display =
            "none";

        content.classList.add(
            "active"
        );


    } catch (error) {

        console.error(
            "Profile error:",
            error
        );

        loading.style.display =
            "none";

        errorBox.style.display =
            "block";

        errorBox.textContent =
            "Unable to load your profile.";

    }

}


/* =========================================
   LOGOUT
========================================= */

document
    .getElementById("logoutButton")
    ?.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                window.location.href =
                    "auth.html";

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

                alert(
                    "Unable to log out. Please try again."
                );

            }

        }
    );


/* =========================================
   BACK
========================================= */

document
    .getElementById("backButton")
    ?.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );


/* =========================================
   NAVIGATION
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

            }
        );

    });