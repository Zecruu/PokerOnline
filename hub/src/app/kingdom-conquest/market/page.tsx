"use client";

export default function Page() {
  const title = window.location.pathname.split("/").pop()?.replace(/-/g, " ") || "Page";
  return (
    <div>
      <h1 className="kc-section-title" style={{ textTransform: "capitalize" }}>{title}</h1>
      <div className="kc-card">
        <div className="kc-card-desc">Coming soon — this feature is under construction.</div>
      </div>
    </div>
  );
}
