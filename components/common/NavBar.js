export function NavBar() {
    return (<header className="flex items-center justify-between rounded-full bg-slate-900/90 px-6 py-4 shadow-[0_20px_45px_rgba(15,23,42,0.7)] backdrop-blur-lg max-[900px]:flex-col max-[900px]:items-start max-[900px]:gap-2.5">
      <div className="flex flex-col items-start gap-1">
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500">
          Painel de estudo
        </span>
        <span className="text-base font-semibold text-slate-200">
          Experiência com IA
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/60 bg-slate-900/85 px-3 py-1 text-[0.76rem]">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)]"/>
          <span className="text-sky-100">IA pronta</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-400/45 bg-slate-900/[0.92] px-3 py-1">
          <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_0,#38bdf8,#4f46e5)] text-[0.7rem] font-semibold text-gray-200">
            JP
          </span>
          <div className="flex flex-col gap-[0.05rem]">
            <span className="text-[0.8rem] font-medium">Você</span>
            <span className="text-[0.7rem] text-gray-400">
              Aprendiz de idiomas
            </span>
          </div>
        </div>
      </div>
    </header>);
}
