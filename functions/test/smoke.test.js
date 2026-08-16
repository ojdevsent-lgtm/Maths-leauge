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
    "getAdminQuiz",
    "saveAdminQuiz",
    "updateStudentStatus",
    "createAnnouncement",
    "toggleAnnouncement"
  ];

  for (const name of expected) {
    assert.equal(typeof functions[name], "function", `${name} should be exported`);
  }
});

test("keeps quiz answers behind the callable function boundary", () => {
  const fs = require("node:fs");
  const source = fs.readFileSync(require.resolve("../index.js"), "utf8");
  assert.match(source, /publicQuestions/);
  assert.match(source, /submitDailyQuiz/);
});
