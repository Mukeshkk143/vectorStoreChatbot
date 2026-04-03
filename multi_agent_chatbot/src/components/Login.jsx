export default function Login({ auth, setAuth, handleLogin }) {
  return (
    <section className="relative w-full max-w-[420px] rounded-2xl border border-[#2a2a2a] bg-[#171717] p-10 shadow-2xl z-10 mx-4">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#10a37f]/10 border border-[#10a37f]/20 mb-5">
          <svg className="w-7 h-7 text-[#10a37f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <h3 className="text-[20px] font-semibold tracking-tight text-white">
          Welcome to NexusAI
        </h3>
        <p className="mt-2.5 text-[15px] leading-relaxed text-[#8e8ea0]">
          Sign in to start your conversation
        </p>
      </div>

      <form onSubmit={handleLogin} className="grid gap-5">
        <div className="grid gap-2">
          <label htmlFor="login-email" className="text-[13px] font-medium text-[#c5c5d2] text-left">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={auth.email}
            onChange={(event) =>
              setAuth((current) => ({
                ...current,
                email: event.target.value,
                error: "",
              }))
            }
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-4 py-3 text-[15px] text-white outline-none transition-all placeholder:text-[#6e6e80] focus:border-[#10a37f] focus:ring-1 focus:ring-[#10a37f]/50"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="login-password" className="text-left text-[13px] font-medium text-[#c5c5d2]">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={auth.password}
            onChange={(event) =>
              setAuth((current) => ({
                ...current,
                password: event.target.value,
                error: "",
              }))
            }
            placeholder="Enter your password"
            className="w-full rounded-lg border border-[#3a3a3a] bg-[#0a0a0a] px-4 py-3 text-[15px] text-white outline-none transition-all placeholder:text-[#6e6e80] focus:border-[#10a37f] focus:ring-1 focus:ring-[#10a37f]/50"
          />
        </div>

        {auth.error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-[14px] text-[#ef4444] flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {auth.error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={auth.loading}
          className="mt-1 w-full rounded-lg bg-[#10a37f] px-5 py-3 text-[15px] font-medium text-white transition-all hover:bg-[#1a7f64] active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait"
        >
          {auth.loading ? "Signing in..." : "Continue"}
        </button>
      </form>

      <p className="mt-8 text-center text-[13px] text-[#6e6e80]">
        Powered by NexusAI — Intelligent Tool Orchestration
      </p>
    </section>
  );
}
