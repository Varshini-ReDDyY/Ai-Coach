import { useLocation, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Navbar from "../components/Navbar";
import api from "../services/api";
import type { Attempt, Interview } from "../types";

interface ReportLocationState {
  interview: Interview;
  attempt: Attempt;
}

interface CreateInterviewResponse {
  success: boolean;
  interviewId: string;
}

interface GenerateQuestionsResponse {
  success: boolean;
  questions?: string[];
}

function Report() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = (location.state || {}) as Partial<ReportLocationState>;
  const { interview, attempt } = state;

  if (!interview || !attempt) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-slate-900">No Report Found</h2>
        </div>
      </>
    );
  }

  const isLearning = interview.purpose === "Learning";

  const retakeSameQuestions = async () => {
    try {
      const res = await api.post<CreateInterviewResponse>(
        "/interview/create",
        {
          role: interview.role,
          company: interview.company,
          experience: interview.experience,
          topic: interview.topic,
          difficulty: interview.difficulty,
          purpose: interview.purpose,
        }
      );

      navigate("/interview", {
        state: {
          interviewId: res.data.interviewId,
          questions: interview.questions,
          form: { purpose: interview.purpose },
        },
      });
    } catch (err) {
      console.log(err);
      alert("Unable to retake interview");
    }
  };

  const retakeNewQuestions = async () => {
    try {
      const createRes = await api.post<CreateInterviewResponse>(
        "/interview/create",
        {
          role: interview.role,
          company: interview.company,
          experience: interview.experience,
          topic: interview.topic,
          difficulty: interview.difficulty,
          purpose: interview.purpose,
        }
      );

      const genRes = await api.post<GenerateQuestionsResponse>(
        "/interview/generate",
        {
          role: interview.role,
          company: interview.company,
          experience: interview.experience,
          topic: interview.topic,
          difficulty: interview.difficulty,
          purpose: interview.purpose,
          count: interview.questions.length,
        }
      );

      navigate("/interview", {
        state: {
          interviewId: createRes.data.interviewId,
          questions: genRes.data.questions,
          form: { purpose: interview.purpose },
        },
      });
    } catch (err) {
      console.log(err);
      alert("Unable to generate new interview");
    }
  };

  const chartData = attempt.answers.map((item, index) => ({
    question: `Q${index + 1}`,
    score: item.score,
  }));

  const percentage = (attempt.totalScore / (attempt.answers.length * 10)) * 100;

  const scoreTheme =
    percentage >= 80
      ? { gradient: "from-emerald-500 to-teal-500", text: "text-emerald-600", verdict: "🏆 Excellent" }
      : percentage >= 60
      ? { gradient: "from-indigo-500 to-sky-500", text: "text-indigo-600", verdict: "👍 Good" }
      : percentage >= 40
      ? { gradient: "from-amber-400 to-orange-500", text: "text-amber-600", verdict: "🙂 Average" }
      : { gradient: "from-rose-500 to-pink-500", text: "text-rose-600", verdict: "📚 Needs Improvement" };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-sky-50 to-emerald-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-center shadow-lg shadow-indigo-200">
          <h1 className="text-3xl font-extrabold text-white">
            {isLearning ? "📖 Learning Report" : "📄 AI Interview Evaluation"}
          </h1>
        </div>

        {!isLearning && (
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50 sm:grid-cols-4">
            {[
              ["💼 Role", interview.role, "bg-sky-50"],
              ["🏢 Company", interview.company, "bg-violet-50"],
              ["📚 Topic", interview.topic, "bg-fuchsia-50"],
              ["🎯 Difficulty", interview.difficulty, "bg-amber-50"],
            ].map(([label, value, bg]) => (
              <div key={label} className={`rounded-xl ${bg} p-3`}>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        <h2 className="mt-8 mb-4 text-lg font-bold text-slate-900">
          {isLearning ? "📖 Learning Session Completed" : `Attempt #${attempt.attemptNumber}`}
        </h2>

        {!isLearning && (
          <div className={`overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br ${scoreTheme.gradient} p-1 shadow-lg`}>
            <div className="rounded-xl bg-white p-8 text-center">
              <h3 className="text-sm font-semibold text-slate-500">Your Performance</h3>
              <p className={`mt-2 text-6xl font-extrabold ${scoreTheme.text}`}>
                ⭐ {attempt.totalScore}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Out of {attempt.answers.length * 10}
              </p>
              <p className="mt-3 text-lg font-semibold text-slate-800">{scoreTheme.verdict}</p>
            </div>
          </div>
        )}

        {!isLearning && (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50">
            <h2 className="mb-4 text-base font-bold text-slate-900">📊 Score Analysis</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="question" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Bar dataKey="score" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <h2 className="mt-8 mb-4 text-lg font-bold text-slate-900">📋 Questions & Answers</h2>

        <div className="space-y-5">
          {attempt.answers.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-md shadow-indigo-100/50"
            >
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
              <div className="p-6">
                <h3 className="mb-4 text-base font-bold text-indigo-600">
                  ❓ Question {index + 1}
                </h3>

                <p className="text-sm font-semibold text-slate-500">📝 Question</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{item.question}</p>

                {!isLearning && (
                  <>
                    <hr className="my-4 border-slate-100" />

                    <p className="text-sm font-semibold text-slate-500">💬 Your Answer</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-800">
                      {item.answer || "No Answer"}
                    </p>

                    <hr className="my-4 border-slate-100" />

                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-500">⭐ Score</p>
                      <span
                        className={`rounded-full px-4 py-1 text-sm font-bold text-white ${
                          item.score >= 8
                            ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                            : item.score >= 5
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : "bg-gradient-to-r from-rose-500 to-pink-500"
                        }`}
                      >
                        {item.score}/10
                      </span>
                    </div>

                    <hr className="my-4 border-slate-100" />

                    <p className="text-sm font-semibold text-indigo-600">🤖 AI Feedback</p>
                    <div className="mt-2 rounded-xl bg-gradient-to-br from-indigo-50 to-sky-50 p-4 text-sm leading-relaxed text-slate-700">
                      {item.feedback}
                    </div>
                  </>
                )}

                <hr className="my-4 border-slate-100" />

                <p className="text-sm font-semibold text-emerald-600">✅ Ideal Answer</p>
                <div className="mt-2 whitespace-pre-wrap rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-sm leading-relaxed text-slate-700">
                  {item.idealAnswer}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          {!isLearning && (
            <>
              <button
                onClick={retakeSameQuestions}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:opacity-90"
              >
                Retake Same Questions
              </button>
              <button
                onClick={retakeNewQuestions}
                className="rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-200 transition hover:opacity-90"
              >
                Retake New Questions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Report;
