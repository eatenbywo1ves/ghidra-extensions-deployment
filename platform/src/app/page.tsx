import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-700">
            AuthorVault
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Your story, your rights,{" "}
            <span className="text-indigo-600">visualized</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Upload your manuscript and watch AI bring your world to life — cover
            art, character portraits, scene illustrations — while you keep every
            legal right to your work.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white hover:bg-indigo-500 shadow-sm transition-colors"
            >
              Start for free
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg border border-gray-300 px-8 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="bg-gray-50 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Everything an author needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rights section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Your copyright, always protected
            </h2>
            <ul className="space-y-3 text-sm text-gray-600">
              {RIGHTS_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">✓</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
            <p className="text-4xl font-bold text-indigo-700 mb-2">100%</p>
            <p className="text-gray-700 font-medium mb-4">Your rights retained</p>
            <p className="text-sm text-gray-600">
              We never claim ownership of your work. Choose from All Rights
              Reserved, Creative Commons variants, or Public Domain — always
              your choice, always changeable.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to visualize your story?
          </h2>
          <p className="text-indigo-200 mb-8">
            Free for up to 3 works. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-lg bg-white px-8 py-3 text-base font-semibold text-indigo-700 hover:bg-indigo-50 shadow-sm transition-colors"
          >
            Create your free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} AuthorVault. Authors retain all rights to their works.</p>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    icon: "✍️",
    title: "Upload any format",
    description:
      "Upload .txt, .pdf, or .docx manuscripts. We handle the rest — no formatting required.",
  },
  {
    icon: "🎨",
    title: "AI-powered visuals",
    description:
      "Claude analyzes your work to extract characters, scenes, and themes, then generates cover art, portraits, and illustrations.",
  },
  {
    icon: "🔒",
    title: "Rights management",
    description:
      "Choose your license, enable DRM-protected previews, track who reads your work, and download a timestamped provenance certificate.",
  },
];

const RIGHTS_POINTS = [
  "Timestamped SHA-256 provenance certificate for every upload",
  "Server-side DRM: content truncation enforced on our servers, not client-side",
  "Copyright watermarks embedded in all generated visuals",
  "Invisible Unicode steganographic markers in preview text",
  "Full access log: see who previewed your work and how much they read",
  "License choices from All Rights Reserved to Creative Commons and Public Domain",
];
