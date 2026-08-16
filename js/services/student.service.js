import { supabase } from "../supabase.js";

const DATA_TIMEOUT_MS = 12000;

function withTimeout(promise, ms = DATA_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The server took too long to respond.")), ms))
  ]);
}

function normalizeStudent(row, fallbackUser) {
  return {
    id: row?.id ?? fallbackUser?.id ?? null,
    fullName: row?.full_name ?? "",
    registrationNumber: row?.registration_number ?? "",
    email: row?.email ?? fallbackUser?.email ?? "",
    phone: row?.phone ?? "",
    school: row?.school ?? "",
    state: row?.state ?? "",
    points: Number(row?.points ?? 0),
    quizzesTaken: Number(row?.quizzes_taken ?? 0),
    status: row?.status ?? "active"
  };
}

export async function getStudent(user) {
  const { data, error } = await withTimeout(
    supabase.from("students").select("id,registration_number,full_name,email,phone,school,state,points,quizzes_taken,status").eq("id", user.id).maybeSingle()
  );
  if (error) throw error;
  if (!data) throw new Error("Your student profile has not been created yet.");
  return normalizeStudent(data, user);
}

export async function getAttempts(user) {
  const { data, error } = await withTimeout(
    supabase.from("quiz_attempts").select("id,quiz_id,score,total_questions,answers,started_at,completed_at").eq("student_id", user.id).order("completed_at", { ascending: false }).limit(50)
  );
  if (error) throw error;
  const attempts = data ?? [];
  if (!attempts.length) return [];

  const quizIds = [...new Set(attempts.map(a => a.quiz_id).filter(Boolean))];
  const { data: quizzes, error: quizError } = await withTimeout(
    supabase.from("quiz_configs").select("id,title,quiz_date").in("id", quizIds)
  );
  if (quizError) throw quizError;
  const titles = new Map((quizzes ?? []).map(q => [q.id, q.title]));

  return attempts.map(a => ({
    ...a,
    quizTitle: titles.get(a.quiz_id) || "Daily Quiz",
    totalQuestions: Number(a.total_questions ?? 0),
    points: Number(a.score ?? 0)
  }));
}

export async function getRank(student) {
  try {
    const { data, error } = await withTimeout(supabase.rpc("get_student_rank", { p_student_id: student.id }));
    if (error) return null;
    const value = typeof data === "number" ? data : data?.rank;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  } catch {
    return null;
  }
}

export async function getAnnouncements() {
  const { data, error } = await withTimeout(
    supabase.from("announcements").select("id,title,body,created_at").eq("active", true).order("created_at", { ascending: false }).limit(10)
  );
  if (error) throw error;
  return data ?? [];
}

function calculateStats(student, attempts) {
  const scored = attempts.filter(a => a.totalQuestions > 0);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / scored.length)
    : 0;
  return {
    totalPoints: student.points,
    quizzesCompleted: student.quizzesTaken || attempts.length,
    averageScore
  };
}

export async function getStudentProgress(user) {
  const [student, attempts] = await Promise.all([
    getStudent(user),
    getAttempts(user)
  ]);
  return { student, attempts, stats: calculateStats(student, attempts) };
}

export async function getStudentOverview(user) {
  const [progress, announcements] = await Promise.all([
    getStudentProgress(user),
    getAnnouncements()
  ]);
  return { ...progress, announcements };
}
