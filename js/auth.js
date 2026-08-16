import { supabase, friendlyError } from "./supabase.js";

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
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName,phone,school,state}}});
      if(error)throw error;
      if(!data.user)throw new Error("Account creation did not return a user.");
      if(!data.session){message("signupMessage","Account created. Check your email to verify your account, then log in.","success");return;}
      const {error:profileError}=await supabase.rpc("register_student",{p_full_name:fullName,p_phone:phone,p_school:school,p_state:state});
      if(profileError) throw profileError;
      message("signupMessage","Account created. Redirecting…","success"); window.location.replace("dashboard.html");
    } catch(error){console.error("Signup failed",error);message("signupMessage",friendlyError(error));}
    finally{setSubmitting(form,false);}
  });

  $("loginForm")?.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,email=$("loginEmail")?.value.trim().toLowerCase(),password=$("loginPassword")?.value||"";if(!email||!password)return message("loginMessage","Enter your email and password.");setSubmitting(form,true);try{const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;window.location.replace("dashboard.html");}catch(error){console.error(error);message("loginMessage",friendlyError(error));}finally{setSubmitting(form,false);}});
  $("forgotPassword")?.addEventListener("click",async event=>{event.preventDefault();const email=$("loginEmail")?.value.trim().toLowerCase();if(!email)return message("loginMessage","Enter your email first, then choose Forgot password.");try{const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/auth.html`});if(error)throw error;message("loginMessage","Password reset instructions have been sent if the account exists.","success");}catch(error){message("loginMessage",friendlyError(error));}});
});
