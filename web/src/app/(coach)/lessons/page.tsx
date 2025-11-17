import CoachPageContainer from "@/components/CoachPageContainer";

export default function LessonsLanding() {
  return (
    <CoachPageContainer>
      <header className="text-center space-y-6">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coach tools</p>
        <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white">Lesson library</h1>
        <p className="text-sm sm:text-base text-white/60">Review past sessions, jump into detailed notes, and keep athletes aligned.</p>
      </header>

      <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur-2xl p-12 lg:p-16 text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-white/40">Coming soon</p>
        <h2 className="text-2xl font-light text-white">Lesson overview</h2>
        <p className="text-white/60 text-sm">
          This view will surface your recent sessions, quick links to notes, and athlete progress snapshots. Select an individual
          lesson from any schedule or request card to continue using the detailed view.
        </p>
      </section>
    </CoachPageContainer>
  );
}
