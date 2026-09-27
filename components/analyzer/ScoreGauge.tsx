const CIRC = 2 * Math.PI * 52;

function scoreColor(score: number) {
  if (score >= 70) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--critical)";
}
function pillColors(score: number) {
  if (score >= 70) return { bg: "var(--good-soft)", fg: "var(--good)" };
  if (score >= 50) return { bg: "var(--warn-soft)", fg: "var(--warn)" };
  return { bg: "var(--critical-soft)", fg: "var(--critical)" };
}

export function ScoreGauge({
  score,
  status,
  statusEmoji,
  companyName,
}: {
  score: number;
  status: string;
  statusEmoji: string;
  companyName: string;
}) {
  const offset = CIRC - (score / 100) * CIRC;
  const color = scoreColor(score);
  const pill = pillColors(score);

  return (
    <div className="card gauge-card">
      <div className="gauge-wrap">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-3)" strokeWidth="11" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={CIRC.toFixed(1)}
            strokeDashoffset={offset.toFixed(1)}
            style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div className="gauge-center">
          <div className="score">
            {score.toFixed(1)}
            <span className="pct">%</span>
          </div>
        </div>
      </div>
      <div className="status-pill" style={{ background: pill.bg, color: pill.fg }}>
        {statusEmoji} {status}
      </div>
      <div className="gauge-caption">
        Weighted across your technical skills, projects, and certifications against {companyName}&rsquo;s requirements.
      </div>
    </div>
  );
}
