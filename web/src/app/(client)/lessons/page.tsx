"use client";

export default function ClientLessonsPage() {
  return (
    <div className="client-page-inner">
      <div className="client-header">
        <div className="client-header-label">Your training</div>
        <h1 className="client-header-title">Lesson history</h1>
        <p className="client-header-subtitle">
          Review past sessions, see notes, and track your progress over time.
        </p>
      </div>

      <section
        className="client-card"
        style={{ maxWidth: 720, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            opacity: 0.7,
            marginBottom: 6,
          }}
        >
          No lessons yet
        </div>
        <div style={{ fontSize: 18, marginBottom: 4 }}>Your first session</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          Once you complete a lesson, you'll see recap notes and key metrics here.
        </div>
      </section>
    </div>
  );
}
