import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Navbar from "../components/Navbar";
import api from "../services/api";
import type { AnalyticsOverview } from "../types";

const SCORE_MAX = 10;

function scoreColor(score: number) {
  if (score >= 7) return "text-emerald-600";
  if (score >= 4) return "text-amber-600";
  return "text-rose-600";
}

function scoreBarColor(score: number) {
  if (score >= 7) return "#059669";
  if (score >= 4) return "#d97706";
  return "#e11d48";
}

function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get<Partial<AnalyticsOverview>>("/analytics/overview");
        setData({
          success: true,
          totalInterviews: res.data.totalInterviews ?? 0,
          averageScore: res.data.averageScore ?? 0,
          byTopic: res.data.byTopic ?? [],
          byDifficulty: res.data.byDifficulty ?? [],
          questionsByTopic: res.data.questionsByTopic ?? [],
          consistency: {
            currentStreakDays: res.data.consistency?.currentStreakDays ?? 0,
            activeDaysLast30: res.data.consistency?.activeDaysLast30 ?? [],
          },
        });
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
            "Unable to load analytics. Complete an interview first."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const topicChartData =
    data?.byTopic?.map((t) => ({ name: t.topic, score: t.averageScore })) ?? [];

  const difficultyChartData =
    data?.byDifficulty?.map((d) => ({ name: d.difficulty, score: d.averageScore })) ?? [];

  const strongestTopic = data?.byTopic?.[0];
  const weakestTopic =
    data?.byTopic && data.byTopic.length > 1
      ? data.byTopic[data.byTopic.length - 1]
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-violet-50 to-sky-50">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-200 sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">📊 Your Analytics</h1>
          <p className="mt-1 text-indigo-100">
            Track your progress across topics and difficulty levels.
          </p>
        </div>

        {loading && (
          <p className="rounded-xl border-2 border-dashed border-indigo-200 bg-white/60 p-8 text-center text-sm text-slate-400">
            Loading analytics…
          </p>
        )}

        {!loading && error && (
          <p className="rounded-xl border-2 border-dashed border-indigo-200 bg-white/60 p-8 text-center text-sm text-slate-400">
            {error}
          </p>
        )}

        {!loading && data && (
          <>
            {/* Top stat cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-md shadow-indigo-100/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Interviews Completed
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.totalInterviews}</p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-md shadow-indigo-100/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Average Score
                </p>
                <p className={`mt-2 text-3xl font-bold ${scoreColor(data.averageScore)}`}>
                  {data.averageScore}
                  <span className="text-base font-medium text-slate-400">/{SCORE_MAX}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-md shadow-indigo-100/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Current Streak
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {data.consistency.currentStreakDays}
                  <span className="text-base font-medium text-slate-400"> days</span>
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-md shadow-indigo-100/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Strongest Topic
                </p>
                <p className="mt-2 truncate text-xl font-bold text-emerald-600">
                  {strongestTopic ? strongestTopic.topic : "—"}
                </p>
                {weakestTopic && (
                  <p className="mt-1 truncate text-xs text-slate-400">
                    Weakest: <span className="font-medium text-rose-500">{weakestTopic.topic}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Practice consistency heatmap */}
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50">
              <h2 className="mb-4 text-base font-bold text-slate-900">Last 30 Days</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.consistency.activeDaysLast30.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count} interview${day.count === 1 ? "" : "s"}`}
                    className={`h-5 w-5 rounded ${
                      day.count > 0 ? "bg-indigo-500" : "bg-slate-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Topic breakdown */}
            {topicChartData.length > 0 && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50">
                <h2 className="mb-4 text-base font-bold text-slate-900">
                  Average Score by Topic
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <BarChart data={topicChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis domain={[0, SCORE_MAX]} tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {topicChartData.map((entry) => (
                          <Cell key={entry.name} fill={scoreBarColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Difficulty breakdown */}
            {difficultyChartData.length > 0 && (
              <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50">
                <h2 className="mb-4 text-base font-bold text-slate-900">
                  Average Score by Difficulty
                </h2>
                <div className="h-56 w-full">
                  <ResponsiveContainer>
                    <BarChart data={difficultyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis domain={[0, SCORE_MAX]} tick={{ fontSize: 12, fill: "#64748b" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {difficultyChartData.map((entry) => (
                          <Cell key={entry.name} fill={scoreBarColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Per-topic question breakdown, full ranked list */}
            <div className="mt-6 rounded-2xl border border-indigo-100 bg-white p-6 shadow-md shadow-indigo-100/50">
              <h2 className="mb-1 text-base font-bold text-slate-900">Questions by Topic</h2>
              <p className="mb-4 text-xs text-slate-400">
                Every question you've been asked in that topic, ranked lowest to highest score.
              </p>

              {data.questionsByTopic.length === 0 && (
                <p className="text-sm text-slate-400">No questions recorded yet.</p>
              )}

              <div className="space-y-3">
                {data.questionsByTopic.map((topicGroup) => {
                  const isOpen = expandedTopic === topicGroup.topic;
                  const avg =
                    topicGroup.questions.reduce((sum, q) => sum + q.score, 0) /
                    topicGroup.questions.length;

                  return (
                    <div
                      key={topicGroup.topic}
                      className="overflow-hidden rounded-xl border border-indigo-100"
                    >
                      <button
                        onClick={() => setExpandedTopic(isOpen ? null : topicGroup.topic)}
                        className="flex w-full items-center justify-between bg-indigo-50/60 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-semibold text-slate-800">
                          {topicGroup.topic}{" "}
                          <span className="font-normal text-slate-400">
                            ({topicGroup.questions.length} question
                            {topicGroup.questions.length === 1 ? "" : "s"})
                          </span>
                        </span>
                        <span className={`text-sm font-bold ${scoreColor(avg)}`}>
                          avg {avg.toFixed(1)} {isOpen ? "▲" : "▼"}
                        </span>
                      </button>

                      {isOpen && (
                        <ul className="divide-y divide-slate-100">
                          {topicGroup.questions.map((q, idx) => (
                            <li
                              key={`${q.question}-${idx}`}
                              className="flex items-start justify-between gap-4 px-4 py-3"
                            >
                              <span className="text-sm text-slate-700">{q.question}</span>
                              <span
                                className={`shrink-0 text-sm font-bold ${scoreColor(q.score)}`}
                              >
                                {q.score}/{SCORE_MAX}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Analytics;
