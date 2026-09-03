import { type ChangeEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import api from "../services/api";
import type { Attempt, Interview as InterviewDoc, InterviewForm } from "../types";

interface InterviewLocationState {
  interviewId: string;
  questions: string[];
  form: InterviewForm;
}

interface SubmitInterviewResponse {
  success: boolean;
  interview: InterviewDoc;
  attempt: Attempt;
}

interface IdealAnswerResponse {
  success: boolean;
  idealAnswer: string;
}

interface ReportLocationState {
  interview: InterviewDoc;
  attempt: Attempt;
}

function Interview() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as Partial<InterviewLocationState>;
  const { interviewId, questions = [], form } = state;

  const isLearningMode = form?.purpose === "Learning";

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState<string[]>(
    Array(questions.length).fill("")
  );

  const [startTime] = useState(Date.now());

  const [idealAnswer, setIdealAnswer] = useState("");
  const [idealAnswers, setIdealAnswers] = useState<string[]>(
    Array(questions.length).fill("")
  );

  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // =============================
  // Safety
  // =============================
  if (!interviewId || questions.length === 0) {
    return (
      <>
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-slate-900">No Interview Found</h2>
          <p className="mt-2 text-slate-500">Start a new interview from the dashboard.</p>
        </div>
      </>
    );
  }

  // =============================
  // Interview Mode
  // =============================
  const handleAnswerChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const updated = [...answers];
    updated[currentQuestion] = e.target.value;
    setAnswers(updated);
  };

  // =============================
  // Learning Mode
  // =============================
  const showIdealAnswer = async () => {
    try {
      setLoadingAnswer(true);

      const res = await api.post<IdealAnswerResponse>(
        "/interview/ideal-answer",
        { question: questions[currentQuestion] }
      );

      setIdealAnswer(res.data.idealAnswer);

      const updated = [...idealAnswers];
      updated[currentQuestion] = res.data.idealAnswer;
      setIdealAnswers(updated);
    } catch (err) {
      console.log(err);
      alert("Unable to fetch answer");
    } finally {
      setLoadingAnswer(false);
    }
  };

  // =============================
  // Next / Previous
  // =============================
  const nextQuestion = () => {
    setIdealAnswer("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const previousQuestion = () => {
    setIdealAnswer("");

    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // =============================
  // Submit Interview
  // =============================
  const submitInterview = async () => {
    try {
      setSubmitting(true);

      const duration = Math.floor((Date.now() - startTime) / 1000);

      const res = await api.post<SubmitInterviewResponse>(
        "/interview/submit",
        { interviewId, questions, answers, duration }
      );

      const reportState: ReportLocationState = {
        interview: res.data.interview,
        attempt: res.data.attempt,
      };

      navigate("/report", { state: reportState });
    } catch (err) {
      console.log(err);
      alert("Error submitting interview");
    } finally {
      setSubmitting(false);
    }
  };

  const finishLearning = async () => {
    try {
      setSubmitting(true);

      const learningAnswers = questions.map((question, index) => ({
        question,
        idealAnswer: idealAnswers[index],
      }));

      const res = await api.post<SubmitInterviewResponse>(
        "/interview/finish-learning",
        { interviewId, answers: learningAnswers }
      );

      const reportState: ReportLocationState = {
        interview: res.data.interview,
        attempt: res.data.attempt,
      };

      navigate("/report", { state: reportState });
    } catch (err) {
      console.log(err);
      alert("Unable to save learning session");
    } finally {
      setSubmitting(false);
    }
  };

  const isLastQuestion = currentQuestion === questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 via-sky-50 to-indigo-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-cyan-100 bg-white shadow-lg shadow-cyan-100/50">
          <div className="bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 px-6 py-4 sm:px-8">
            <div className="flex items-center justify-between text-white">
              <h2 className="text-sm font-semibold">
                Question {currentQuestion + 1} of {questions.length}
              </h2>
              <span className="text-xs font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="rounded-xl border-l-4 border-indigo-500 bg-gradient-to-r from-indigo-50 to-sky-50 p-5 text-base font-medium text-slate-800">
              {questions[currentQuestion]}
            </div>

            {/* Interview mode */}
            {!isLearningMode && (
              <textarea
                placeholder="Write your answer..."
                value={answers[currentQuestion]}
                onChange={handleAnswerChange}
                className="mt-5 h-44 w-full resize-none rounded-xl border border-slate-300 p-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            )}

            {/* Learning mode */}
            {isLearningMode && (
              <div className="mt-5">
                <button
                  onClick={showIdealAnswer}
                  disabled={loadingAnswer}
                  className="rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-200 transition hover:opacity-90 disabled:opacity-60"
                >
                  {loadingAnswer ? "Loading..." : "Show Ideal Answer"}
                </button>

                {idealAnswer && (
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                    <h3 className="mb-2 text-sm font-bold text-emerald-700">Ideal Answer</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {idealAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {isLastQuestion ? (
                isLearningMode ? (
                  <button
                    onClick={finishLearning}
                    disabled={submitting}
                    className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Saving..." : "Finish Learning"}
                  </button>
                ) : (
                  <button
                    onClick={submitInterview}
                    disabled={submitting}
                    className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:opacity-90 disabled:opacity-60"
                  >
                    {submitting ? "Scoring your answers..." : "Submit Interview"}
                  </button>
                )
              ) : (
                <button
                  onClick={nextQuestion}
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:opacity-90"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Interview;
