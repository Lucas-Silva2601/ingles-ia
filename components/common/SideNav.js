'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const NAV_ITEMS = [
    { href: '/text-to-speech', label: 'Text to Speech' },
    { href: '/estudar-frases', label: 'Estudar Frases' },
    { href: '/roleplay', label: 'Roleplay' },
    { href: '/anti-frase', label: 'Anti-Frase' },
    { href: '/hacks', label: 'Hacks Proibidos' },
];
export function SideNav() {
    const pathname = usePathname();
    return (<aside className="flex flex-col gap-6 rounded-3xl bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.24),transparent_55%),rgba(15,23,42,0.95)] px-5 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.9)] max-[900px]:flex-row max-[900px]:items-center max-[900px]:justify-between max-[900px]:px-4 max-[900px]:py-[1.1rem]">
      <div className="flex items-center gap-2.5">
        <span className="h-[18px] w-[18px] rounded-full bg-[conic-gradient(from_160deg,#22c55e,#38bdf8,#a855f7,#22c55e)] shadow-[0_0_22px_rgba(56,189,248,0.65)]"/>
        <span className="text-[0.78rem] font-bold uppercase tracking-[0.08em] text-slate-200">
          LinguasIA
        </span>
      </div>

      <nav className="mt-2 flex flex-col gap-[0.3rem] max-[900px]:flex-row">
        {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (<Link key={item.href} href={item.href} className={`flex items-center rounded-xl border px-[0.8rem] py-[0.55rem] text-[0.9rem] transition-[background-color,border-color,transform] duration-[120ms] ease-out max-[900px]:px-3 max-[900px]:py-[0.45rem] ${isActive
                    ? 'border-sky-400/65 bg-[linear-gradient(120deg,rgba(56,189,248,0.15),rgba(88,28,135,0.4))]'
                    : 'border-transparent text-[#cbd5f5] hover:border-slate-400/60 hover:bg-slate-900/80'}`}>
              <span className="flex-1">{item.label}</span>
            </Link>);
        })}
      </nav>
    </aside>);
}
