import RegisterForm from "@/components/auth/register-form"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[linear-gradient(120deg,#0B1F33_0%,#123E5C_55%,#0E6B6B_100%)] text-white">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-2xl font-display font-semibold">PlagiarismDetect</h1>
          <p className="text-sm text-white/80">Academic integrity verification tool</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <RegisterForm />
      </main>

      <footer className="border-t border-slate-200/70 bg-white/80 p-4 text-center text-slate-500 text-sm">
        <div className="container mx-auto">
          &copy; {new Date().getFullYear()} PlagiarismDetect - All rights reserved
        </div>
      </footer>
    </div>
  )
}
