import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15)_0%,_transparent_50%)] animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass mb-8 animate-slide-in">
            <span className="text-2xl">⚡</span>
            <span className="text-sm font-medium text-white/90">Transform Your Pitching Game</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Master the Art</span>
            <br />
            <span className="text-white">of Pitching</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed">
            Elevate your performance with world-class coaching. Personalized lessons designed to unlock your potential and take your skills to the next level.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/book"
              className="btn-primary text-lg px-8 py-4 group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center space-x-2">
                <span>Book Your First Lesson</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </Link>
            <Link
              href="/signup"
              className="btn-secondary text-lg px-8 py-4"
            >
              Get Started Free
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="card-premium text-center">
              <div className="text-4xl font-bold gradient-text mb-2">10K+</div>
              <div className="text-white/60">Lessons Completed</div>
            </div>
            <div className="card-premium text-center">
              <div className="text-4xl font-bold gradient-text mb-2">98%</div>
              <div className="text-white/60">Success Rate</div>
            </div>
            <div className="card-premium text-center">
              <div className="text-4xl font-bold gradient-text mb-2">4.9★</div>
              <div className="text-white/60">Average Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="gradient-text">Why Choose Elevate?</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🎯",
                title: "Personalized Coaching",
                description: "Tailored lessons that adapt to your unique style and goals",
              },
              {
                icon: "📊",
                title: "Progress Tracking",
                description: "Monitor your improvement with detailed analytics and insights",
              },
              {
                icon: "🏆",
                title: "Expert Coaches",
                description: "Learn from the best in the industry with years of experience",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="card-premium text-center group cursor-pointer"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/50">
            © 2024 Elevate. Transform your pitching game.
          </p>
        </div>
      </footer>
    </div>
  );
}

