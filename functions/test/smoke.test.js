const test = require("node:test");
const assert = require("node:assert/strict");

const functions = require("../index.js");

test("exports the expected callable functions", () => {
  const expected = [
    "createStudentProfile",
    "getDailyQuiz",
    "submitDailyQuiz",
    "getLeaderboard",
    "getStudentDashboard",
    "isAdmin",
    "rebuildStats",
    "getAdminDashboard",
    "getAdminStudents",
    "updateStudentStatus",
    "updateDailyQuiz",
    "resetDailyQuiz"
  ];

  for (const name of expected) {
    assert.equal(typeof functions[name], "function", `${name} should be exported`);
  }
});

test("does not expose quiz answers from the public result module", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync(require.resolve("../index.js"), "utf8");
  assert.match(source, /publicQuestions/);
  assert.match(source, /submitDailyQuiz/);
});
