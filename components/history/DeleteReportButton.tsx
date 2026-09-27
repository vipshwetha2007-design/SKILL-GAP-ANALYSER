"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this saved report? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard/history");
      router.refresh();
    } else {
      alert("Couldn't delete this report.");
    }
  }

  return (
    <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={busy}>
      {busy ? "Deleting…" : "Delete report"}
    </button>
  );
}
