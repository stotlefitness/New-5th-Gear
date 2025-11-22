import ClientNavigation from "@/components/ClientNavigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="client-shell">
      <ClientNavigation />

      <main className="client-main">
        {children}
      </main>
    </div>
  );
}


