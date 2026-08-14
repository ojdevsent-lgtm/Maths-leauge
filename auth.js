/* =========================================
   ML TRIVIA — AUTHENTICATION
   Firebase Project: mltp-9f154
========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================
   FIREBASE CONFIGURATION
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
   WAIT FOR PAGE
========================================= */

document.addEventListener("DOMContentLoaded", () => {


    /* =====================================
       ELEMENTS
    ===================================== */

    const signupPanel =
        document.getElementById("signupPanel");

    const loginPanel =
        document.getElementById("loginPanel");

    const showLogin =
        document.getElementById("showLogin");

    const showSignup =
        document.getElementById("showSignup");

    const signupForm =
        document.getElementById("signupForm");

    const loginForm =
        document.getElementById("loginForm");


    /* =====================================
       SWITCH TO LOGIN
    ===================================== */

    function openLogin() {

        if (!signupPanel || !loginPanel) return;

        signupPanel.classList.remove("active");

        loginPanel.classList.add("active");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================
       SWITCH TO SIGNUP
    ===================================== */

    function openSignup() {

        if (!signupPanel || !loginPanel) return;

        loginPanel.classList.remove("active");

        signupPanel.classList.add("active");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    showLogin?.addEventListener(
        "click",
        openLogin
    );

    showSignup?.addEventListener(
        "click",
        openSignup
    );


    /* =====================================
       PASSWORD SHOW / HIDE
    ===================================== */

    document
        .querySelectorAll(".password-toggle")
        .forEach(button => {

            button.addEventListener("click", () => {

                const targetId =
                    button.getAttribute("data-target");

                const input =
                    document.getElementById(targetId);

                if (!input) return;

                const icon =
                    button.querySelector("i");


                if (input.type === "password") {

                    input.type = "text";

                    icon?.classList.remove(
                        "ri-eye-line"
                    );

                    icon?.classList.add(
                        "ri-eye-off-line"
                    );

                } else {

                    input.type = "password";

                    icon?.classList.remove(
                        "ri-eye-off-line"
                    );

                    icon?.classList.add(
                        "ri-eye-line"
                    );
                }

            });

        });


    /* =====================================
       MESSAGE
    ===================================== */

    function showMessage(
        element,
        text,
        type = "error"
    ) {

        if (!element) return;

        element.textContent = text;

        element.className =
            `auth-message show ${type}`;
    }


    /* =====================================
       GENERATE MLTP NUMBER
       
       MLTP00001
       MLTP00002
       MLTP00003
       ...
    ===================================== */

    async function generateRegistrationNumber() {

        const counterRef =
            doc(
                db,
                "counters",
                "studentRegistration"
            );


        return await runTransaction(
            db,
            async transaction => {

                const counterSnapshot =
                    await transaction.get(
                        counterRef
                    );


                let nextNumber = 1;


                if (counterSnapshot.exists()) {

                    const data =
                        counterSnapshot.data();

                    nextNumber =
                        Number(data.nextNumber) || 1;
                }


                transaction.set(
                    counterRef,
                    {
                        nextNumber:
                            nextNumber + 1
                    },
                    {
                        merge: true
                    }
                );


                return (
                    "MLTP" +
                    String(nextNumber)
                        .padStart(5, "0")
                );

            }
        );
    }


    /* =====================================
       SIGN UP
    ===================================== */

    signupForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const message =
                document.getElementById(
                    "signupMessage"
                );


            const submitButton =
                signupForm.querySelector(
                    ".auth-submit"
                );


            /* ================================
               GET FORM VALUES
            ================================= */

            const fullName =
                document
                    .getElementById("fullName")
                    .value
                    .trim();


            const email =
                document
                    .getElementById("signupEmail")
                    .value
                    .trim();


            const phone =
                document
                    .getElementById("phone")
                    .value
                    .trim();


            const school =
                document
                    .getElementById("school")
                    .value
                    .trim();


            const state =
                document
                    .getElementById("state")
                    .value;


            const password =
                document
                    .getElementById("signupPassword")
                    .value;


            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;


            const terms =
                document
                    .getElementById("terms")
                    .checked;


            /* ================================
               VALIDATION
            ================================= */

            if (!fullName) {

                showMessage(
                    message,
                    "Please enter your full name."
                );

                return;
            }


            if (!email) {

                showMessage(
                    message,
                    "Please enter your email address."
                );

                return;
            }


            if (!phone) {

                showMessage(
                    message,
                    "Please enter your phone number."
                );

                return;
            }


            if (!school) {

                showMessage(
                    message,
                    "Please enter your school."
                );

                return;
            }


            if (!state) {

                showMessage(
                    message,
                    "Please select your state."
                );

                return;
            }


            if (password.length < 8) {

                showMessage(
                    message,
                    "Password must contain at least 8 characters."
                );

                return;
            }


            if (password !== confirmPassword) {

                showMessage(
                    message,
                    "Passwords do not match."
                );

                return;
            }


            if (!terms) {

                showMessage(
                    message,
                    "Please agree to the ML Trivia student guidelines."
                );

                return;
            }


            /* ================================
               LOADING
            ================================= */

            submitButton.disabled = true;

            submitButton.innerHTML =
                `
                Creating account...
                `;


            try {

                /* ============================
                   CREATE AUTH ACCOUNT
                ============================ */

                const userCredential =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                /* ============================
                   GENERATE MLTP NUMBER
                ============================ */

                const registrationNumber =
                    await generateRegistrationNumber();


                /* ============================
                   CREATE STUDENT PROFILE
                ============================ */

                await setDoc(
                    doc(
                        db,
                        "mlTriviaStudents",
                        user.uid
                    ),
                    {

                        uid:
                            user.uid,

                        registrationNumber:
                            registrationNumber,

                        fullName:
                            fullName,

                        email:
                            email,

                        phone:
                            phone,

                        school:
                            school,

                        state:
                            state,

                        totalPoints:
                            0,

                        quizzesCompleted:
                            0,

                        averageScore:
                            0,

                        createdAt:
                            serverTimestamp()

                    }
                );


                /* ============================
                   SUCCESS
                ============================ */

                showMessage(
                    message,

                    `Account created successfully! Your Maths League registration number is ${registrationNumber}.`,

                    "success"
                );


                signupForm.reset();


                /* ============================
                   DASHBOARD
                ================================= */

                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 2500);


            } catch (error) {

                console.error(
                    "SIGNUP ERROR:",
                    error
                );


                let errorMessage =
                    "Something went wrong. Please try again.";


                if (
                    error.code ===
                    "auth/email-already-in-use"
                ) {

                    errorMessage =
                        "An account with this email already exists.";

                }

                else if (
                    error.code ===
                    "auth/invalid-email"
                ) {

                    errorMessage =
                        "Please enter a valid email address.";

                }

                else if (
                    error.code ===
                    "auth/weak-password"
                ) {

                    errorMessage =
                        "Your password must contain at least 8 characters.";

                }

                else if (
                    error.code ===
                    "permission-denied"
                ) {

                    errorMessage =
                        "Firestore permission denied.";

                }


                showMessage(
                    message,
                    errorMessage
                );


            } finally {

                submitButton.disabled =
                    false;

                submitButton.innerHTML =
                    `
                    Create Account
                    <i class="ri-arrow-right-line"></i>
                    `;

            }

        }
    );


    /* =====================================
       LOGIN
    ===================================== */

    loginForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const message =
                document.getElementById(
                    "loginMessage"
                );


            const submitButton =
                loginForm.querySelector(
                    ".auth-submit"
                );


            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();


            const password =
                document
                    .getElementById("loginPassword")
                    .value;


            if (!email) {

                showMessage(
                    message,
                    "Please enter your email address."
                );

                return;
            }


            if (!password) {

                showMessage(
                    message,
                    "Please enter your password."
                );

                return;
            }


            submitButton.disabled = true;

            submitButton.innerHTML =
                `
                Logging in...
                `;


            try {

                /* ============================
                   FIREBASE LOGIN
                ============================ */

                const userCredential =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );


                const user =
                    userCredential.user;


                /* ============================
                   FIND STUDENT PROFILE
                ============================ */

                const studentRef =
                    doc(
                        db,
                        "mlTriviaStudents",
                        user.uid
                    );


                const studentSnapshot =
                    await getDoc(
                        studentRef
                    );


                if (!studentSnapshot.exists()) {

                    showMessage(
                        message,
                        "Your account exists, but your Maths League profile was not found."
                    );

                    return;
                }


                /* ============================
                   SUCCESS
                ============================ */

                showMessage(
                    message,
                    "Login successful. Opening your dashboard...",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 1000);


            } catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                let errorMessage =
                    "Unable to log in. Please check your email and password.";


                if (
                    error.code ===
                    "auth/invalid-credential"
                ) {

                    errorMessage =
                        "Incorrect email or password.";

                }

                else if (
                    error.code ===
                    "auth/user-not-found"
                ) {

                    errorMessage =
                        "No account was found with this email.";

                }

                else if (
                    error.code ===
                    "auth/wrong-password"
                ) {

                    errorMessage =
                        "Incorrect email or password.";

                }


                showMessage(
                    message,
                    errorMessage
                );


            } finally {

                submitButton.disabled =
                    false;

                submitButton.innerHTML =
                    `
                    Log In
                    <i class="ri-login-box-line"></i>
                    `;

            }

        }
    );


    /* =====================================
       FORGOT PASSWORD
    ===================================== */

    const forgotPassword =
        document.getElementById(
            "forgotPassword"
        );


    forgotPassword?.addEventListener(
        "click",
        event => {

            event.preventDefault();

            alert(
                "Password recovery will be added next."
            );

        }
    );

});