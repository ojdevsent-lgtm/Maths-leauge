import { supabase } from "./supabase.js";

const $ = id => document.getElementById(id);
function message(id, text, type = "error") { const el = $(id); if (!el) return; el.textContent = text; el.className = `auth-message show ${type}`; }
function errorText(error) { const m = {"Invalid login credentials":"Incorrect email or password.","User already registered":"An account with this email already exists. Try logging in instead.","Password should be at least 6 characters":"Password must be at least 8 characters."}; return m[error?.message] || error?.message || "Something went wrong. Please try again."; }
function busy(form, value) { const b=form?.querySelector("button[type=submit]"); if(b){b.disabled=value;b.setAttribute("aria-busy",String(value));} }

document.addEventListener("DOMContentLoaded", () => {
  const signupPanel=$("signupPanel"), loginPanel=$("loginPanel");
  $("showLogin")?.addEventListener("click",()=>{signupPanel?.classList.remove("active");loginPanel?.classList.add("active");});
  $("showSignup")?.addEventListener("click",()=>{loginPanel?.classList.remove("active");signupPanel?.classList.add("active");});
  document.querySelectorAll(".password-toggle").forEach(b=>b.addEventListener("click",()=>{const i=$(b.dataset.target);if(!i)return;i.type=i.type==="password"?"text":"password";}));

  $("signupForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); const form=e.currentTarget;
    const fullName=$("fullName")?.value.trim(), email=$("signupEmail")?.value.trim().toLowerCase(), phone=$("phone")?.value.trim(), school=$("school")?.value.trim(), state=$("state")?.value.trim(), password=$("signupPassword")?.value||"", confirm=$("confirmPassword")?.value||"";
    if(!fullName||!email||!phone||!school||!state)return message("signupMessage","Complete all registration fields.");
    if(password.length<8)return message("signupMessage","Password must be at least 8 characters.");
    if(password!==confirm)return message("signupMessage","Passwords do not match.");
    if(!$("terms")?.checked)return message("signupMessage","Accept the student guidelines to continue.");
    busy(form,true); message("signupMessage","Creating your account…","success");
    try {
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName,school,state}}});
      if(error)throw error;
      if(!data.user)throw new Error("Account could not be created.");
      const {error:profileError}=await supabase.rpc("register_student",{p_full_name:fullName,p_phone:phone,p_school:school,p_state:state});
      if(profileError)throw profileError;
      message("signupMessage","Account created. Redirecting…","success"); window.location.replace("dashboard.html");
    } catch(error){console.error("Signup failed:",error);message("signupMessage",errorText(error));}
    finally{busy(form,false);}
  });

  $("loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,email=$("loginEmail")?.value.trim().toLowerCase(),password=$("loginPassword")?.value||"";if(!email||!password)return message("loginMessage","Enter your email and password.");busy(form,true);try{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;window.location.replace("dashboard.html");}catch(error){console.error(error);message("loginMessage",errorText(error));}finally{busy(form,false);}});
  $("forgotPassword")?.addEventListener("click",async e=>{e.preventDefault();const email=$("loginEmail")?.value.trim().toLowerCase();if(!email)return message("loginMessage","Enter your email first.");try{const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth.html`});if(error)throw error;message("loginMessage","Password reset instructions have been sent if the account exists.","success");}catch(error){message("loginMessage",errorText(error));}});
});
