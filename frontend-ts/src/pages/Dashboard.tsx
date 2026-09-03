import { type ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import ScoreChart from "../components/ScoreChart";
import api from "../services/api";
import type { Attempt, Interview, InterviewForm, LearningQuestion } from "../types";

interface CreateInterviewResponse {
  success: boolean;
  interviewId: string;
}

interface GenerateQuestionsResponse {
  success: boolean;
  questions?: string[];
  learningData?: LearningQuestion[];
}

interface HistoryResponse {
  success: boolean;
  interviews: Interview[];
}

interface InterviewLocationState {
  interviewId: string;
  questions: string[];
  learningData: LearningQuestion[];
  form: InterviewForm;
}

const TOPICS = [
  "General",
  "DSA",
  "OOPS",
  "DBMS",
  "OS",
  "CN",
  "HR",
  "Leadership Principles",
  "System Design",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-rose-100 text-rose-700",
};

function Dashboard() {
  const navigate = useNavigate();

  const [form, setForm] = useState<InterviewForm>({
    role: "",
    company: "",
    experience: "",
    topic: "General",
    difficulty: "Medium",
    count: 5,
    purpose: "Interview",
  });

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Interview[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleResumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setResumeFile(e.target.files?.[0] || null);
  };

  const startInterview = async () => {
    try {
      setLoading(true);

      if (!form.role || !form.company) {
        alert("Role and Company required");
        return;
      }

      // 1. CREATE INTERVIEW
      const createRes = await api.post<CreateInterviewResponse>(
        "/interview/create",
        form
      );

      const interviewId = createRes.data.interviewId;

      // 2. UPLOAD + INDEX RESUME (RAG)
      if (resumeFile) {
        const resumeData = new FormData();
        resumeData.append("interviewId", interviewId);
        resumeData.append("resume", resumeFile);

        try {
          await api.post("/interview/upload-resume", resumeData);
        } catch (err: any) {
          console.log(err);
          alert(
            err.response?.data?.message ||
              "Unable to process resume, continuing without personalization"
          );
        }
      }

      // 3. GENERATE QUESTIONS
      const genRes = await api.post<GenerateQuestionsResponse>(
        "/interview/generate",
        { ...form, interviewId }
      );

      let questions: string[] = [];
      let learningData: LearningQuestion[] = [];

      if (form.purpose === "Learning") {
        learningData = genRes.data.learningData || [];
        questions = learningData.map((item) => item.question);
      } else {
        questions = genRes.data.questions || [];
      }

      if (!questions || questions.length === 0) {
        alert("No questions generated");
        return;
      }

      // 4. MOVE TO INTERVIEW PAGE
      const state: InterviewLocationState = {
        interviewId,
        questions,
        learningData,
        form,
      };

      navigate("/interview", { state });
    } catch (err) {
      console.log(err);
      alert("Error starting interview");
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageScore = (attempts: Attempt[] = []) => {
    if (attempts.length === 0) return 0;

    const total = attempts.reduce((sum, a) => sum + a.totalScore, 0);

    return Math.round(total / attempts.length);
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get<HistoryResponse>("/interview/history");

      setHistory(res.data.interviews || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatDuration = (seconds = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}m ${secs}s`;
  };

  const deleteInterview = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmDelete) return;

    try {
      await api.delete(`/interview/delete/${id}`);
      fetchHistory();
    } catch (err) {
      console.log(err);
      alert("Unable to delete interview");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
  const labelClass = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-sky-50">
      <Navbar />

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Welcome hero */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">👋 Welcome back</h1>
          <p className="mt-1 text-indigo-100">Practice today. Improve tomorrow 🚀</p>
        </div>

        {/* Start interview form */}
        <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-lg shadow-indigo-100/50 sm:p-8">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
              ✨
            </span>
            Start New Interview
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Role</label>
              <input
                name="role"
                placeholder="e.g. SDE-1"
                value={form.role}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Company</label>
              <input
                name="company"
                placeholder="e.g. Amazon"
                value={form.company}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Experience</label>
              <input
                name="experience"
                placeholder="e.g. Fresher"
                value={form.experience}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Topic</label>
              <select
                name="topic"
                value={form.topic}
                onChange={handleChange}
                className={inputClass}
              >
                {TOPICS.map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Difficulty</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
                className={inputClass}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Number of Questions</label>
              <input
                type="number"
                name="count"
                min={1}
                max={20}
                value={form.count}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>Mode</label>
              <select
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Interview">Interview Mode</option>
                <option value="Learning">Reading / Learning Mode</option>
              </select>
            </div>
          </div>

          {/* Resume upload */}
          <div className="mt-6 rounded-xl border-2 border-dashed border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-indigo-50 p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              📄 Resume <span className="font-normal text-slate-400">(optional, PDF)</span>
            </label>
            <p className="mb-3 text-xs text-slate-500">
              Attach your resume to get questions personalized to your actual projects and experience.
            </p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleResumeChange}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-fuchsia-600 file:to-indigo-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90"
            />
            {resumeFile && (
              <p className="mt-2 text-sm font-medium text-emerald-600">
                ✓ Selected: {resumeFile.name}
              </p>
            )}
          </div>

          <button
            onClick={startInterview}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {loading ? "Generating..." : "Generate Interview"}
          </button>
        </div>

        {/* History */}
        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
              📚
            </span>
            Interview History
          </h2>

          {history.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-indigo-200 bg-white/60 p-8 text-center text-sm text-slate-400">
              No interviews yet. Generate one above to get started.
            </p>
          ) : (
            <div className="space-y-5">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-md shadow-indigo-100/50"
                >
                  <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />

                  <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900">{item.role}</h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        🏢 {item.company}
                      </span>
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                        📘 {item.topic}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          DIFFICULTY_BADGE[item.difficulty] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        🎯 {item.difficulty}
                      </span>
                      <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700">
                        {item.purpose === "Learning" ? "📖 Learning" : "🎤 Interview"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      <span className="font-medium text-slate-700">Experience:</span>{" "}
                      {item.experience}
                    </p>

                    {item.purpose === "Interview" && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-500">
                          <span>
                            <span className="font-medium text-slate-700">Attempts:</span>{" "}
                            {item.attempts.length}
                          </span>
                          {item.attempts.length > 0 && (
                            <>
                              <span>
                                <span className="font-medium text-slate-700">Latest Score:</span>{" "}
                                {item.attempts[item.attempts.length - 1].totalScore}/
                                {item.attempts[item.attempts.length - 1].answers.length * 10}
                              </span>
                              <span>
                                <span className="font-medium text-slate-700">Average:</span>{" "}
                                {calculateAverageScore(item.attempts)}
                              </span>
                            </>
                          )}
                        </div>

                        {item.attempts.length > 0 && <ScoreChart attempts={item.attempts} />}
                      </>
                    )}

                    <p className="mt-3 text-xs text-slate-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>

                    {item.attempts.length > 0 && (
                      <div className="mt-5 space-y-3">
                        {item.attempts.map((attempt) => (
                          <div
                            key={attempt.attemptNumber}
                            className="flex flex-col items-start justify-between gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              {attempt.isLearning ? (
                                <>
                                  <h4 className="font-semibold text-slate-800">
                                    📖 Learning Session
                                  </h4>
                                  <p className="mt-1 text-sm text-emerald-600">
                                    ✅ Completed Successfully
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {new Date(attempt.completedAt).toLocaleString()}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <h4 className="font-semibold text-slate-800">
                                    Attempt #{attempt.attemptNumber}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600">
                                    ⭐ {attempt.totalScore}/{attempt.answers.length * 10} · ⏱{" "}
                                    {formatDuration(attempt.duration)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    {new Date(attempt.completedAt).toLocaleString()}
                                  </p>
                                </>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  navigate("/report", {
                                    state: { interview: item, attempt },
                                  })
                                }
                                className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                              >
                                View Report
                              </button>
                              <button
                                onClick={() => deleteInterview(item._id)}
                                className="rounded-lg bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-200"
                              >
                                🗑 Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
