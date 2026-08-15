const resultData = localStorage.getItem("mlTriviaLastResult");
if (!resultData) location.href = "quiz.html";
else {
  try {
    const result = JSON.parse(resultData);
    const score = Number(result.score || 0);
    const total = Number(result.totalQuestions || result.total || 0);
    const points = Number(result.points || 0);
    document.getElementById("score").textContent = `${score} / ${total}`;
    document.getElementById("points").textContent = `${points} Points`;
    document.getElementById("correct").textContent = score;
    document.getElementById("total").textContent = total;
    document.getElementById("accuracy").textContent = `${total ? Math.round(score / total * 100) : 0}%`;
  } catch { location.href = "quiz.html"; }
}
