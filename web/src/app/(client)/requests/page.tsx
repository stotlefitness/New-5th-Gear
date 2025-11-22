"use client";

export default function ClientRequestsPage() {
  return (
    <div className="client-page-inner">
      <div className="client-header">
        <div className="client-header-label">Your training</div>
        <h1 className="client-header-title">Session requests</h1>
        <p className="client-header-subtitle">
          Track what you've requested and see what your coach has confirmed.
        </p>
      </div>

      <section
        className="client-card"
        style={{ maxWidth: 600, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 8,
          }}
        >
          No open requests
        </div>
        <div style={{ fontSize: 18, marginBottom: 4 }}>You're all set</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          When you request a new session, it will show up here until your coach responds.
        </div>
      </section>
    </div>
  );
}
