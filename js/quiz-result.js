const resultData = localStorage.getItem("mlTriviaLastResult");

if (!resultData) {
  location.href = "quiz.html";
} else {
  try {
    const result = JSON.parse(resultData);
    const score = Number(result.score);
    const total = Number(result.totalQuestions);
    const points = Number(result.points);

    if (![score, total, points].every(Number.isFinite) || total <= 0 || score < 0 || score > total || points < 0) {
      throw new Error("Invalid quiz result.");
    }

    const scoreEl = document.getElementById("score");
    const pointsEl = document.getElementById("points");
    const correctEl = document.getElementById("correct");
    const totalEl = document.getElementById("total");
    const accuracyEl = document.getElementById("accuracy");

    if (!scoreEl || !pointsEl || !correctEl || !totalEl || !accuracyEl) {
      throw new Error("Quiz result page is incomplete.");
    }

    scoreEl.textContent = `${score} / ${total}`;
    pointsEl.textContent = `${points} Points`;
    correctEl.textContent = String(score);
    totalEl.textContent = String(total);
    accuracyEl.textContent = `${Math.round(score / total * 100)}%`;

    // Results are single-use UI state. Prevent an old result from appearing later.
    localStorage.removeItem("mlTriviaLastResult");
  } catch (error) {
    console.error(error);
    localStorage.removeItem("mlTriviaLastResult");
    location.href = "quiz.html";
  }
}
