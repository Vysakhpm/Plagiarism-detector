import PlagiarismChecker from "@/components/plagiarism-checker"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="bg-[linear-gradient(120deg,#0B1F33_0%,#123E5C_55%,#0E6B6B_100%)] text-white">
        <div className="container mx-auto px-6 py-10 md:py-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.2em]">
              Academic Integrity Suite
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-display font-semibold">
              PlagiarismDetect
            </h1>
            <p className="mt-3 text-base md:text-lg text-white/80">
              A modern academic integrity verification tool with secure workflows, precise reporting, and confident oversight.
            </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Login
              </a>
              <a
                href="/register"
                className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Register
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-6 py-10 md:py-12">
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Secure</p>
            <p className="mt-2 text-lg font-semibold">Confidential analysis pipeline</p>
            <p className="mt-2 text-sm text-slate-600">
              Upload assignments safely and keep results private for trusted reviewers.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Insightful</p>
            <p className="mt-2 text-lg font-semibold">Clear match attribution</p>
            <p className="mt-2 text-sm text-slate-600">
              Drill into matched sources and compare similarity at a glance.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Actionable</p>
            <p className="mt-2 text-lg font-semibold">Teacher-ready dashboards</p>
            <p className="mt-2 text-sm text-slate-600">
              Manage students, assignments, and results from one unified workspace.
            </p>
          </div>
        </div>

        <PlagiarismChecker />
      </div>

      <footer className="border-t border-slate-200/70 bg-white/80 p-4 text-center text-slate-500 text-sm">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} PlagiarismDetect - All rights reserved
        </div>
      </footer>
    </main>
  )
}
