"use client";

export function ReportPanel({
  reportText,
  meta,
  onToast,
}: {
  reportText: string;
  meta: string;
  onToast: (msg: string) => void;
}) {
  async function copy() {
    if (!reportText) {
      onToast("Generate the report first");
      return;
    }
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = reportText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        onToast("Copied to clipboard");
      } catch {
        onToast("Couldn't copy — select the text manually");
      }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(reportText);
        onToast("Copied to clipboard");
      } catch {
        fallback();
      }
    } else {
      fallback();
    }
  }

  function print() {
    if (!reportText) {
      onToast("Generate the report first");
      return;
    }
    window.print();
  }

  return (
    <div className="card" id="reportSection" style={{ padding: 0, overflow: "hidden" }}>
      <div className="report-head">
        <div>
          <h3>Full report</h3>
          <p>{meta}</p>
        </div>
        <div className="no-print" style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="12" height="12" rx="1.5" />
              <path d="M5 15V4a1 1 0 0 1 1-1h11" />
            </svg>
            Copy
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={print}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7H6z" />
            </svg>
            Print / Save PDF
          </button>
        </div>
      </div>
      <div style={{ padding: 4 }}>
        <pre id="reportText" className="mono">
          {reportText || "Not generated yet — fill in your profile and click Generate report."}
        </pre>
      </div>
    </div>
  );
}
