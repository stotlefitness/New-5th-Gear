"use client";

export default function SchedulePage() {
  return (
    <div className="client-page-inner">
      <div className="client-header">
        <div className="client-header-label">Your training</div>
        <h1 className="client-header-title">Schedule</h1>
        <p className="client-header-subtitle">
          See your confirmed sessions and grab open spots with your coach.
        </p>
      </div>

      <section className="client-card" style={{ maxWidth: 720, width: "100%" }}>
        {/* Next session */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 8,
          }}
        >
          Next session
        </div>
        <div className="client-list-row">
          <span>None scheduled</span>
          <button className="client-btn-outline">Request time</button>
        </div>

        {/* Upcoming */}
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginTop: 18,
            marginBottom: 6,
          }}
        >
          Upcoming
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          When your coach confirms a request, it will appear here.
        </div>
      </section>
    </div>
  );
}
