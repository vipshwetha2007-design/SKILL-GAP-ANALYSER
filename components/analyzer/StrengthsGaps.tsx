import type { GapEntry, StrengthEntry } from "@/lib/scoring";

export function StrengthsGaps({ strengths, gaps, total }: { strengths: StrengthEntry[]; gaps: GapEntry[]; total: number }) {
  return (
    <div className="two-col">
      <div className="card list-card card-pad">
        <h3 style={{ color: "var(--good)" }}>
          ✓ Strengths
          <span className="count" style={{ background: "var(--good-soft)", color: "var(--good)" }}>
            {strengths.length}/{total}
          </span>
        </h3>
        {strengths.length === 0 ? (
          <div className="empty-note">No skills meet the bar yet — the gap list has your starting point.</div>
        ) : (
          <ul className="chip-list">
            {strengths.map((s) => (
              <li className="chip" style={{ background: "var(--good-soft)" }} key={s.label}>
                <span className="dot" style={{ background: "var(--good)" }} />
                <span className="t">{s.label}</span>
                <span className="m">
                  {s.student}/{s.required}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card list-card card-pad">
        <h3 style={{ color: "var(--critical)" }}>
          △ Needs work
          <span className="count" style={{ background: "var(--critical-soft)", color: "var(--critical)" }}>
            {gaps.length}/{total}
          </span>
        </h3>
        {gaps.length === 0 ? (
          <div className="empty-note">None — every requirement is met. Excellent profile!</div>
        ) : (
          <ul className="chip-list">
            {gaps.map((g) => (
              <li className="chip" style={{ background: "var(--critical-soft)" }} key={g.label}>
                <span className="dot" style={{ background: "var(--critical)" }} />
                <span className="t">{g.label}</span>
                <span className="m">
                  need {g.required} · have {g.student} · gap {g.gap}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
