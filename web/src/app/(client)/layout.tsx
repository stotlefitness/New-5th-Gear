import Navigation from "@/components/Navigation";
import { AuthGate } from "@/components/AuthGate";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <Navigation />
      <main className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)', marginTop: '64px' }}>
        <div className="w-full max-w-3xl px-6 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>
    </AuthGate>
  );
}


