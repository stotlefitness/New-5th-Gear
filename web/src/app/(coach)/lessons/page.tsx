export default function LessonsLanding() {
  return (
    <div className="coach-page-inner">
      <div className="coach-header">
        <div className="coach-header-label">Coach tools</div>
        <h1 className="coach-header-title">Lesson library</h1>
        <p className="coach-header-subtitle">
          Review past sessions, jump into detailed notes, and keep athletes aligned.
        </p>
      </div>

      <section
        className="coach-card"
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
          Coming soon
        </div>
        <div style={{ fontSize: 18, marginBottom: 4 }}>Lesson overview</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          This view will surface your recent sessions, quick links to notes, and athlete
          progress snapshots. Select any lesson from your schedule or requests to dive
          deeper.
        </div>
      </section>
    </div>
  );
}
