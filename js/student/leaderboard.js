import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const root=document.getElementById("leaderboard");
onAuthStateChanged(auth,async user=>{if(!user){location.replace("../login.html");return;}try{const snap=await getDocs(query(collection(db,"students"),where("status","==","active"),orderBy("leaguePoints","desc"),limit(100)));if(snap.empty){root.innerHTML='<p class="muted">No rankings yet.</p>';return;}root.innerHTML=snap.docs.map((d,i)=>{const s=d.data();return `<div class="result-item"><strong>#${i+1} ${s.fullName||"Student"}</strong><span>${Number(s.leaguePoints||0).toLocaleString()} pts</span></div>`}).join("");}catch(error){console.error("Leaderboard load failed",error);root.innerHTML='<p class="muted">Leaderboard is not available yet.</p>';}});
