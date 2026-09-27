import type { SkillDimension } from "@/lib/scoring";

export function SkillBars({ dims }: { dims: SkillDimension[] }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div className="section-label">Skill comparison</div>
        <div className="legend">
          <div className="item">
            <span className="swatch" style={{ background: "var(--accent2)" }} />
            Required
          </div>
          <div className="item">
            <span className="swatch" style={{ background: "var(--accent)" }} />
            Your level
          </div>
        </div>
      </div>
      <div style={{ maxHeight: "320px", overflowY: "auto", paddingRight: "8px", margin: "0 -4px" }}>
        <div style={{ padding: "0 4px" }}>
          {dims.map((d) => {
            const reqPct = (Math.min(d.required, 10) / 10) * 100;
            const youPct = (Math.min(d.student, 10) / 10) * 100;
            const tag = d.count !== undefined ? `${d.student}/10 · n=${d.count}` : `${d.student}/${d.required}`;
            return (
              <div className="bar-row" key={d.key}>
                <div className="blabel" title={d.label}>{d.label.replace(" (Data Structures & Algorithms)", "")}</div>
                <div className="bar-tracks">
                  <div className="bar-track">
                    <div className="bar-fill req" style={{ width: `${reqPct}%` }} />
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill you" style={{ width: `${youPct}%` }}>
                      <span className="tag">{tag}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
