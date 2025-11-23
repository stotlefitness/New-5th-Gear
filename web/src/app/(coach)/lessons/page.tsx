import CoachPageContainer from "@/components/CoachPageContainer";

export default function LessonsLanding() {
  return (
    <CoachPageContainer>
      <header className="text-center space-y-8 mb-8">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Lesson library</h1>
        <p className="text-sm sm:text-base text-white/60">Review past sessions, jump into detailed notes, and keep clients aligned.</p>
      </header>

      <section className="auth-panel" style={{ maxWidth: 860, width: "100%", textAlign: "center" }}>
        <div style={{ padding: "40px 0" }}>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40" style={{ marginBottom: 12 }}>
            Coming soon
          </p>
          <h2 className="auth-title" style={{ fontSize: 24, marginBottom: 8 }}>
            Lesson overview
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.6)" }}>
            This view will surface your recent sessions, quick links to notes, and client progress snapshots. Select an individual
            lesson from any schedule or request card to continue using the detailed view.
          </p>
        </div>
      </section>
    </CoachPageContainer>
  );
}
