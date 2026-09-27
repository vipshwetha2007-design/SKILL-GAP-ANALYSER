import type { Recommendation } from "@/lib/scoring";

const TAG_COLOR: Record<Recommendation["tag"], { bg: string; fg: string }> = {
  DSA: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  JAVA: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  PYTHON: { bg: "var(--accent2-soft)", fg: "var(--accent2)" },
  SQL: { bg: "var(--accent3-soft)", fg: "var(--accent3)" },
  COMM: { bg: "var(--good-soft)", fg: "var(--good)" },
  PROJECTS: { bg: "var(--ink)", fg: "var(--surface)" },
  CERTS: { bg: "var(--surface-3)", fg: "var(--ink)" },
  READY: { bg: "var(--good-soft)", fg: "var(--good)" },
  "LIVE JOBS": { bg: "var(--critical-soft)", fg: "var(--critical)" },
};

export function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <div className="card card-pad">
      <h3 style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 13 }}>
        💡 Personalised recommendations
      </h3>
      <ul className="reco-list">
        {items.map((r, i) => {
          const c = TAG_COLOR[r.tag];
          
          let prioBg = "";
          let prioFg = "";
          if (r.priority === "Critical") { prioBg = "var(--critical-soft)"; prioFg = "var(--critical)"; }
          else if (r.priority === "Needs Improvement") { prioBg = "var(--warn-soft)"; prioFg = "var(--warn)"; }
          else if (r.priority === "Minor") { prioBg = "var(--good-soft)"; prioFg = "var(--good)"; }

          return (
            <li className="reco-item" key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="reco-tag" style={{ background: c.bg, color: c.fg }}>
                    {r.tag}
                  </span>
                  {r.priority && (
                    <span className="reco-tag" style={{ background: prioBg, color: prioFg }}>
                      {r.priority}
                    </span>
                  )}
                </div>
                <span className="reco-text">{r.text}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
