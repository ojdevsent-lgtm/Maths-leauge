import { auth, db, functions, httpsCallable } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, orderBy, query, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const quizId = params.get("id");
let questions = [], answers = {}, current = 0, startedAt = null, timerId = null, secondsLeft = 0, currentUser = null, attemptId = null;

function setState(text) { $("quizState").textContent = text; $("quizState").hidden = false; $("quizArena").hidden = true; }
function renderQuestion() {
  const q = questions[current];
  $("questionCounter").textContent = `Question ${current + 1} of ${questions.length}`;
  $("progressBar").style.width = `${((current + 1) / questions.length) * 100}%`;
  $("questionText").textContent = q.text;
  $("options").innerHTML = q.options.map((option,index)=>`<button type="button" class="option${answers[q.id] === index ? " selected" : ""}" data-index="${index}"><span class="option-index">${String.fromCharCode(65+index)}</span><span>${option}</span></button>`).join("");
  document.querySelectorAll(".option").forEach(button=>button.addEventListener("click",()=>{answers[q.id]=Number(button.dataset.index);renderQuestion();}));
  $("previousButton").disabled=current===0;
  $("nextButton").textContent=current===questions.length-1?"Submit quiz":"Next";
}
function renderTimer(){const m=Math.floor(secondsLeft/60).toString().padStart(2,"0"),s=(secondsLeft%60).toString().padStart(2,"0");$("timer").textContent=`${m}:${s}`;$("timer").classList.toggle("warning",secondsLeft<=60);}
async function loadQuestions(){
  if(!quizId) throw new Error("quiz-not-selected");
  const snap=await getDoc(doc(db,"quizzes",quizId));
  if(!snap.exists()) throw new Error("quiz-not-found");
  const data=snap.data();
  if(data.status!=="live") throw new Error("quiz-not-live");
  $("quizTitle").textContent=data.title||"Maths League Quiz";
  const qSnap=await getDocs(query(collection(db,"quizzes",quizId,"questions"),orderBy("order","asc")));
  questions=qSnap.docs.map(item=>({id:item.id,...item.data()}));
  if(!questions.length) throw new Error("no-questions");
  secondsLeft=Number(data.durationSeconds||Number(data.durationMinutes||10)*60);
}
async function createAttempt(){
  const started = new Date().toISOString();
  const ref = await addDoc(collection(db,"attempts"),{
    studentId: currentUser.uid,
    quizId,
    status: "in_progress",
    startedAt: started,
    answers: {},
    createdAt: serverTimestamp()
  });
  attemptId = ref.id;
  startedAt = started;
}
async function submitQuiz(autoSubmitted=false){
  clearInterval(timerId);
  if(!attemptId) { setState("We couldn't start your quiz attempt. Please return to the dashboard and try again."); return; }
  try{
    const submit = httpsCallable(functions,"submitQuiz");
    const result = await submit({quizId,attemptId,answers,autoSubmitted});
    $("quizArena").hidden=true;$("quizState").hidden=true;$("quizComplete").hidden=false;
    $("completeMessage").textContent=autoSubmitted?`Time expired. Score: ${result.data.score}/${result.data.possiblePoints}.`:`Quiz submitted. Score: ${result.data.score}/${result.data.possiblePoints}.`;
  }catch(error){
    console.error("Quiz submission failed",{code:error?.code,message:error?.message});
    setState(error?.message||"We couldn't submit your quiz. Please try again.");
  }
}
$("previousButton")?.addEventListener("click",()=>{if(current>0){current--;renderQuestion();}});
$("nextButton")?.addEventListener("click",()=>{if(current<questions.length-1){current++;renderQuestion();}else submitQuiz(false);});
$("quitButton")?.addEventListener("click",()=>{if(confirm("Exit this quiz? Your current answers will not be submitted."))location.href="dashboard.html";});
onAuthStateChanged(auth,async user=>{
  if(!user){location.replace("../auth.html");return;}
  currentUser=user;
  try{await loadQuestions();await createAttempt();$("quizState").hidden=true;$("quizArena").hidden=false;renderQuestion();renderTimer();timerId=setInterval(()=>{secondsLeft--;renderTimer();if(secondsLeft<=0)submitQuiz(true);},1000);}
  catch(error){console.error(error);setState(error.message==="quiz-not-live"?"This quiz is not currently live.":error.message==="quiz-not-selected"?"Choose a quiz from the dashboard first.":"We couldn't load this quiz. Please try again later.");}
});
