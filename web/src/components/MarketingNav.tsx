import Link from "next/link";

type MarketingNavProps = {
  active?: "home" | "resources";
};

export default function MarketingNav({ active }: MarketingNavProps) {
  return (
    <header className="nav">
      <div className="nav-left">
        <Link href="/">
          <span className="logo-text">5TH GEAR</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <Link
            href="/resources"
            className={`nav-text-link${active === "resources" ? " nav-text-link-active" : ""}`}
          >
            Resources
          </Link>
        </nav>
      </div>
      <div className="nav-right">
        <Link href="/login" className="btn btn-ghost">
          Sign In
        </Link>
        <Link href="/signup" className="btn btn-outline">
          Join Now
        </Link>
      </div>
    </header>
  );
}
