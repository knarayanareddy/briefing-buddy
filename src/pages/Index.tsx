import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Play,
  Rss,
  CalendarDays,
  Github,
  Cloud,
  Mail,
  ArrowRight,
  Zap,
  Volume2,
  LayoutDashboard,
  Shield,
  ChevronDown,
} from "lucide-react";
import heroImg from "@/assets/landing-hero.jpg";

/* ── tiny scroll-reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("revealed");
          io.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`opacity-0 translate-y-5 blur-[4px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] [&.revealed]:opacity-100 [&.revealed]:translate-y-0 [&.revealed]:blur-0 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── data ── */
const CONNECTORS = [
  { icon: Rss, label: "RSS & News", desc: "Headlines from any feed" },
  { icon: CalendarDays, label: "Google Calendar", desc: "Today's agenda at a glance" },
  { icon: Github, label: "GitHub", desc: "PRs, issues & commits" },
  { icon: Cloud, label: "Weather", desc: "Local forecast woven in" },
  { icon: Mail, label: "Gmail", desc: "Priority inbox digest" },
];

const STEPS = [
  { num: "01", title: "Connect your sources", desc: "Plug in RSS, calendar, GitHub, Slack and more — takes under a minute." },
  { num: "02", title: "AI writes your script", desc: "A language model distills overnight intel into a concise, narrated briefing." },
  { num: "03", title: "Watch & act", desc: "Play your video brief with TTS narration, b-roll visuals and interactive action cards." },
];

export default function Index() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-x-hidden font-sans">
      {/* ─── NAV ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading text-base font-bold tracking-tight">MY Morning Brief</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-xs font-semibold">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="sa-button-primary rounded-xl text-xs font-bold px-5 active:scale-95">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-36 px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary/[0.06] blur-[140px]" />
        </div>

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <div className="space-y-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80">
                AI-powered daily intelligence
              </p>
              <h1
                className="font-heading text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.08] tracking-tight text-foreground"
                style={{ textWrap: "balance" } as any}
              >
                Your morning briefing,
                <br />
                narrated by AI
              </h1>
              <p
                className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-lg"
                style={{ textWrap: "pretty" } as any}
              >
                Connect your news feeds, calendar, GitHub, weather and email — then sit back while an AI narrator delivers a personalised video briefing every morning.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/auth">
                  <Button className="sa-button-primary h-12 rounded-2xl px-7 text-sm font-bold shadow-[0_12px_32px_hsl(var(--primary)/0.25)] group active:scale-[0.97]">
                    Start free
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" className="h-12 rounded-2xl px-7 text-sm font-medium border-border/60 active:scale-[0.97]">
                    <Play className="w-4 h-4 mr-1.5" />
                    See how it works
                  </Button>
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal className="delay-150">
            <div className="relative rounded-2xl overflow-hidden border border-border/30 shadow-2xl shadow-black/40">
              <img
                src={heroImg}
                alt="MY Morning Brief dashboard showing news, calendar and weather cards"
                className="w-full h-auto"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </Reveal>
        </div>

        <a
          href="#connectors"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </section>

      {/* ─── CONNECTORS ─── */}
      <section id="connectors" className="py-24 px-6">
        <div className="max-w-5xl mx-auto space-y-14">
          <Reveal>
            <div className="text-center space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80">Connectors</p>
              <h2
                className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight"
                style={{ textWrap: "balance" } as any}
              >
                All your intel in one place
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CONNECTORS.map((c, i) => (
              <Reveal key={c.label} className={`delay-[${i * 80}ms]`}>
                <div className="sa-card p-5 rounded-2xl space-y-3 hover:border-primary/20 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold">{c.label}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-border/20">
        <div className="max-w-4xl mx-auto space-y-16">
          <Reveal>
            <div className="text-center space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80">How it works</p>
              <h2
                className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight"
                style={{ textWrap: "balance" } as any}
              >
                From chaos to clarity in 3 steps
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} className={`delay-[${i * 100}ms]`}>
                <div className="space-y-4">
                  <span className="text-5xl font-heading font-extrabold text-primary/15">{s.num}</span>
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-6 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary/80">Features</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight">
                Built for your morning routine
              </h2>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Volume2, title: "TTS narration", desc: "Natural voice reads your brief while you get ready." },
              { icon: LayoutDashboard, title: "Action cards", desc: "Interactive cards let you act on items mid-briefing." },
              { icon: Zap, title: "AI script engine", desc: "LLM distils raw data into a polished narrative." },
              { icon: Shield, title: "Private by default", desc: "Your data stays yours — no third-party training." },
            ].map((f, i) => (
              <Reveal key={f.title} className={`delay-[${i * 80}ms]`}>
                <div className="sa-card p-6 rounded-2xl space-y-3 h-full">
                  <f.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 px-6">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <h2
              className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ textWrap: "balance" } as any}
            >
              Ready to reclaim your mornings?
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
              Sign up in seconds — no credit card required. Connect a feed and get your first briefing today.
            </p>
            <Link to="/auth">
              <Button className="sa-button-primary h-13 rounded-2xl px-10 text-sm font-bold shadow-[0_12px_32px_hsl(var(--primary)/0.25)] group active:scale-[0.97]">
                Create your brief
                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/20 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-foreground/80">MY Morning Brief</span>
          </div>
          <p>© {new Date().getFullYear()} MY Morning Brief. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
