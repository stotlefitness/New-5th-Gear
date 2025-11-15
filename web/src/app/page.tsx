import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0a2e] to-[#16213e] relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "4s" }}></div>
      </div>

      <Navigation />

      <main className="relative z-10 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center animate-fade-in">
            <div className="inline-block mb-6">
              <span className="text-6xl animate-float">⚾</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 font-[var(--font-space-grotesk)]">
              <span className="gradient-text">Elevate Your</span>
              <br />
              <span className="text-white">Pitching Game</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Transform your performance with world-class coaching. 
              <span className="text-purple-400"> Personalized lessons</span> designed to unlock your potential.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/signup"
                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
              >
                <span className="relative z-10">Get Started Free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
              <Link
                href="/book"
                className="px-8 py-4 glass rounded-full text-white font-semibold text-lg border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105"
              >
                Book a Lesson
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            {[
              {
                icon: "🎯",
                title: "Personalized Coaching",
                description: "One-on-one sessions tailored to your unique style and goals",
                gradient: "from-purple-500/20 to-pink-500/20",
              },
              {
                icon: "📊",
                title: "Performance Analytics",
                description: "Track your progress with detailed insights and metrics",
                gradient: "from-indigo-500/20 to-blue-500/20",
              },
              {
                icon: "🏆",
                title: "Elite Training",
                description: "Learn from coaches who've trained champions",
                gradient: "from-pink-500/20 to-red-500/20",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="card rounded-2xl p-8 hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`text-5xl mb-4 bg-gradient-to-br ${feature.gradient} w-16 h-16 rounded-xl flex items-center justify-center`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats Section */}
          <div className="mt-32 grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {[
              { number: "10K+", label: "Lessons Completed" },
              { number: "500+", label: "Active Coaches" },
              { number: "98%", label: "Satisfaction Rate" },
              { number: "24/7", label: "Support Available" },
            ].map((stat, index) => (
              <div
                key={index}
                className="text-center glass rounded-xl p-6 hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl font-bold gradient-text mb-2">{stat.number}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-32 text-center animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="glass-strong rounded-3xl p-12 max-w-4xl mx-auto">
              <h2 className="text-4xl sm:text-5xl font-bold mb-6 gradient-text font-[var(--font-space-grotesk)]">
                Ready to Transform Your Game?
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                Join thousands of athletes who've elevated their performance with PitchPerfect
              </p>
              <Link
                href="/signup"
                className="inline-block px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full text-white font-semibold text-lg hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50"
              >
                Start Your Journey Today
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
