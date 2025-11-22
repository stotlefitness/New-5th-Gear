import CoachNavigation from "@/components/CoachNavigation";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="coach-shell">
      <CoachNavigation />

      <main className="coach-main">
        {children}
      </main>
    </div>
  );
}
