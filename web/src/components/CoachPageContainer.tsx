export default function CoachPageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-16 ${className}`}>
      {children}
    </div>
  );
}

