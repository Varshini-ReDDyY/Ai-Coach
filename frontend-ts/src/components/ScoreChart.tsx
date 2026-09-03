import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Attempt } from "../types";

function ScoreChart({ attempts }: { attempts: Attempt[] }) {
  const data = attempts.map((attempt) => ({
    attempt: `Attempt ${attempt.attemptNumber}`,
    score: attempt.totalScore,
    time: attempt.duration,
  }));

  return (
    <div className="mt-4 h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis dataKey="attempt" tick={{ fontSize: 12, fill: "#64748b" }} />

          <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />

          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
            formatter={(value, name) => [
              value,
              name === "score" ? "Score" : name,
            ]}
          />

          <Line
            type="monotone"
            dataKey="score"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 3, fill: "#4f46e5" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ScoreChart;
