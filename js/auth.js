import {
  auth,
  db,
  friendlyError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "./firebase.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
function message(id, text, type = "error") { const el=$(id); if(!el)return; el.textContent=text; el.className=`auth-message show ${type}`; }
function setSubmitting(form, disabled) { const button=form?.querySelector("button[type=submit]"); if(button){button.disabled=disabled;button.setAttribute("aria-busy",String(disabled));} }

document.addEventListener("DOMContentLoaded", () => {
  const signupPanel=$("signupPanel"), loginPanel=$("loginPanel");
  $("showLogin")?.addEventListener("click",()=>{signupPanel?.classList.remove("active");loginPanel?.classList.add("active");});
  $("showSignup")?.addEventListener("click",()=>{loginPanel?.classList.remove("active");signupPanel?.classList.add("active");});
  document.querySelectorAll(".password-toggle").forEach(button=>button.addEventListener("click",()=>{const input=$(button.dataset.target);if(!input)return;input.type=input.type==="password"?"text":"password";}));

  $("signupForm")?.addEventListener("submit", async event=>{
    event.preventDefault(); const form=event.currentTarget;
    const fullName=$("fullName")?.value.trim(),email=$("signupEmail")?.value.trim().toLowerCase(),phone=$("phone")?.value.trim(),school=$("school")?.value.trim(),state=$("state")?.value.trim();
    const password=$("signupPassword")?.value||"",confirmPassword=$("confirmPassword")?.value||"";
    if(!fullName||!email||!school||!state)return message("signupMessage","Complete all required fields.");
    if(password.length<6)return message("signupMessage","Password must be at least 6 characters.");
    if(password!==confirmPassword)return message("signupMessage","Passwords do not match.");
    if(!$("terms")?.checked)return message("signupMessage","Accept the terms to continue.");
    setSubmitting(form,true); message("signupMessage","Creating your account…","success");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      await setDoc(doc(db, "students", user.uid), {
        full_name: fullName,
        email: user.email,
        phone,
        school,
        state,
        points: 0,
        quizzes_taken: 0,
        status: "active",
        created_at: serverTimestamp()
      });
      // Email verification is intentionally not required. Firebase signs the new
      // account in immediately, so registration goes straight to the dashboard.
      message("signupMessage","Account created. Redirecting…","success");
      window.location.replace("dashboard.html");
    } catch(error){console.error("Signup failed",error);message("signupMessage",friendlyError(error));}
    finally{setSubmitting(form,false);}
  });

  $("loginForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,email=$("loginEmail")?.value.trim().toLowerCase(),password=$("loginPassword")?.value||"";if(!email||!password)return message("loginMessage","Enter your email and password.");setSubmitting(form,true);try{await signInWithEmailAndPassword(auth,email,password);window.location.replace("dashboard.html");}catch(error){console.error(error);message("loginMessage",friendlyError(error));}finally{setSubmitting(form,false);}});
  $("forgotPassword")?.addEventListener("click",async event=>{event.preventDefault();const email=$("loginEmail")?.value.trim().toLowerCase();if(!email)return message("loginMessage","Enter your email first, then choose Forgot password.");try{await sendPasswordResetEmail(auth,email,{url:`${location.origin}/auth.html`});message("loginMessage","Password reset instructions have been sent if the account exists.","success");}catch(error){message("loginMessage",friendlyError(error));}});
});
