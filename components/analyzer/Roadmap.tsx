import type { RoadmapStep } from "@/lib/scoring";

export function Roadmap({ steps }: { steps: RoadmapStep[] }) {
  return (
    <div className="card" style={{ padding: "20px 22px" }}>
      <h3 style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", marginBottom: 16 }}>
        🗺 Learning roadmap
      </h3>
      <div className="timeline">
        {steps.map((step, idx) => (
          <div className={`tstep${step.final ? " final" : ""}`} key={idx}>
            <div className="rail">
              <div className="num">{step.month}</div>
            </div>
            <div className="body">
              <div className="m-label">
                Month {step.month}
                {step.tag ? ` · ${step.tag}` : ""}
              </div>
              <div className="m-text">{step.text}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
