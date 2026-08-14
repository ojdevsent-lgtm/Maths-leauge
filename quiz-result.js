const resultData =
  localStorage.getItem(
    "mlTriviaLastResult"
  );


if (!resultData) {
  
  window.location.href =
    "quiz.html";
  
} else {
  
  const result =
    JSON.parse(resultData);
  
  
  const score =
    document.getElementById("score");
  
  const points =
    document.getElementById("points");
  
  const correct =
    document.getElementById("correct");
  
  const total =
    document.getElementById("total");
  
  const accuracy =
    document.getElementById("accuracy");
  
  
  const percentage =
    Math.round(
      (result.score / result.total) * 100
    );
  
  
  score.textContent =
    `${result.score} / ${result.total}`;
  
  
  points.textContent =
    `${result.points} Points`;
  
  
  correct.textContent =
    result.score;
  
  
  total.textContent =
    result.total;
  
  
  accuracy.textContent =
    `${percentage}%`;
  
}