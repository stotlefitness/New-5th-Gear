import CoachNavigation from "@/components/CoachNavigation";
import { AuthGate } from "@/components/AuthGate";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="relative min-h-screen bg-gradient-to-br from-black via-[#05060c] to-black text-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,68,255,0.25),_transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(199,62,42,0.18),_transparent_55%)]" />
        </div>

        <CoachNavigation />

        <main className="relative z-10 flex items-center justify-center min-h-screen py-20">
          <div className="w-full max-w-4xl px-6 sm:px-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
