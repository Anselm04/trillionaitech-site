import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatApiError, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Sparkles, Download, ArrowRight, Check, Zap, Loader2, Package, Code2, Layers } from 'lucide-react';
import { track } from '../lib/analytics';

const TIERS = [
  { slug: 'appforge-starter', label: 'Starter', price: 49, features: ['20 generations / month', 'React + FastAPI + game scaffolds', 'Downloadable zip', 'Community support'], accent: false },
  { slug: 'appforge-builder', label: 'Builder', price: 149, features: ['Unlimited generations', 'Larger scaffolds (up to 40 files)', 'Priority queue', '3 team seats', 'Email support'], accent: true },
  { slug: 'appforge-studio', label: 'Studio', price: 399, features: ['Everything in Builder', 'Fine-tuned models', 'Private generations', 'Unlimited seats', 'White-label export'], accent: false },
];

const KINDS = [
  { key: 'webapp', label: 'Web app', hint: 'React + Tailwind' },
  { key: 'landing', label: 'Landing page', hint: 'Single-file HTML' },
  { key: 'api', label: 'API', hint: 'FastAPI' },
  { key: 'game', label: 'Game', hint: 'Canvas + JS' },
  { key: 'cli', label: 'CLI', hint: 'Node/Python' },
  { key: 'agent', label: 'Agent', hint: 'Structured LLM' },
];

export default function AppForge() {
  const { user } = useAuth();
  const [access, setAccess] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState('webapp');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { api.get('/appforge/access').then(r => setAccess(r.data)).catch(() => setAccess({ has_access: false })); }, [user]);
  useEffect(() => {
    if (user?.id) api.get('/appforge/generations').then(r => setHistory(r.data)).catch(() => {});
  }, [user, result]);

  const buy = async (slug) => {
    try {
      track('checkout_start', { slug, source: 'appforge_page' });
      const { data } = await api.post('/payments/checkout', { product_slug: slug, origin_url: window.location.origin });
      window.location.href = data.checkout_url;
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const generate = async (e) => {
    e.preventDefault();
    if (prompt.trim().length < 8) { toast.error('Describe your project in at least a sentence.'); return; }
    setGenerating(true); setResult(null);
    try {
      const { data } = await api.post('/appforge/generate', { prompt: prompt.trim(), kind });
      setResult(data);
      toast.success(`Generated ${data.name}`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setGenerating(false); }
  };

  const download = (url, name) => {
    const a = document.createElement('a');
    a.href = `${API_BASE}${url}`;
    a.download = `${name}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const isAdmin = user?.role === 'admin';
  const hasAccess = access?.has_access;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="container-x pt-20 md:pt-28 pb-16 md:pb-20 relative overflow-hidden">
          <div className="absolute inset-0 grid-lines opacity-[0.18] mask-fade-b" aria-hidden />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>AppForge · Our first product</span>
            </div>
            <h1 className="font-display font-black text-5xl sm:text-6xl md:text-8xl tracking-tightest leading-[0.95] mt-6 max-w-4xl text-balance">
              Describe an app.<br /><span className="text-primary">Get a real one back.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mt-8 leading-relaxed">
              AppForge is our AI-native scaffolding engine. Tell it what you want to build — an app, a game, an API, an agent, a landing page — and get downloadable, runnable code in seconds.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-10">
              <a href="#builder" className="btn-primary" data-testid="appforge-try">Try the builder <ArrowRight className="w-4 h-4" /></a>
              <a href="#pricing" className="btn-ghost">See pricing</a>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border max-w-3xl">
              {[['6','Project kinds'],['<60s','Time to zip'],['7 days','Free trial'],['0','Cards to try (as admin)']].map(([k,v]) => (
                <div key={v} className="card-flat p-4"><div className="font-display font-bold text-xl">{k}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{v}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Builder */}
      <section id="builder" className="container-x py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="overline">Builder</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl mt-3 tracking-tight text-balance">Describe your idea.</h2>

            {!user ? (
              <div className="mt-8 border border-border p-8">
                <p className="text-muted-foreground">Sign in to try the builder — you'll get free access to trial the flow.</p>
                <div className="mt-5 flex gap-3">
                  <Link to="/login" className="btn-primary">Sign in</Link>
                  <Link to="/register" className="btn-ghost">Create account</Link>
                </div>
              </div>
            ) : !hasAccess ? (
              <div className="mt-8 border border-border p-8" data-testid="appforge-locked">
                <div className="overline">Locked</div>
                <h3 className="font-display font-bold text-2xl mt-2">Subscribe to unlock the builder.</h3>
                <p className="text-muted-foreground mt-3">Pick a tier below to start your 7-day free trial. Or redeem an access code on your <Link to="/account" className="text-primary hover:underline">account page</Link>.</p>
                <a href="#pricing" className="btn-primary mt-6 inline-flex">See pricing</a>
              </div>
            ) : (
              <form onSubmit={generate} className="mt-8 border border-border p-6 md:p-8 space-y-5" data-testid="appforge-form">
                {isAdmin && <div className="text-[11px] uppercase tracking-wider text-primary font-bold">Master admin · unlimited</div>}
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Project kind</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {KINDS.map(k => (
                      <button type="button" key={k.key} onClick={() => setKind(k.key)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${kind === k.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                        data-testid={`appforge-kind-${k.key}`}>
                        {k.label} <span className="opacity-60 ml-1">· {k.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Describe what you want to build</label>
                  <textarea rows={5} required minLength={8} maxLength={1000} value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. A minimalist Pomodoro timer webapp with dark mode, keyboard shortcuts, and a session log stored locally."
                    className="w-full mt-2 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary text-sm"
                    data-testid="appforge-prompt" />
                  <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                    <span>Real code — no placeholders. Generated by Claude Sonnet 4.6.</span>
                    <span>{prompt.length}/1000</span>
                  </div>
                </div>
                <button disabled={generating} className="btn-primary w-full justify-center" data-testid="appforge-generate">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating your project…</> : <><Sparkles className="w-4 h-4" /> Generate</>}
                </button>
              </form>
            )}

            {result && (
              <div className="mt-8 border border-primary p-6 md:p-8 animate-fade-up" data-testid="appforge-result">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="overline">Generated</div>
                    <h3 className="font-display font-bold text-3xl mt-2">{result.name}</h3>
                    <p className="text-muted-foreground mt-2">{result.summary}</p>
                    <div className="text-xs text-muted-foreground mt-2 font-mono">{result.stack} · {result.file_count} files</div>
                  </div>
                  <button onClick={() => download(result.download_url, result.name)} className="btn-primary" data-testid="appforge-download">
                    <Download className="w-4 h-4" /> Download ZIP
                  </button>
                </div>
                <div className="mt-6 border border-border bg-secondary/40 p-4 max-h-56 overflow-auto">
                  <div className="text-xs font-mono space-y-1">
                    {result.files.map(f => (
                      <div key={f.path} className="flex justify-between text-muted-foreground">
                        <span>{f.path}</span><span className="opacity-60">{f.size.toLocaleString()} b</span>
                      </div>
                    ))}
                  </div>
                </div>
                {result.run_instructions && (
                  <details className="mt-4">
                    <summary className="text-sm cursor-pointer text-primary">Run instructions</summary>
                    <pre className="text-xs mt-2 whitespace-pre-wrap text-muted-foreground">{result.run_instructions}</pre>
                  </details>
                )}
              </div>
            )}
          </div>

          <aside>
            <div className="overline">Your generations</div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">Nothing yet. Your generations will appear here.</p>
            ) : (
              <ul className="mt-4 space-y-3" data-testid="appforge-history">
                {history.slice(0, 8).map(g => (
                  <li key={g.gen_id} className="border border-border p-3">
                    <div className="text-sm font-semibold truncate">{g.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{g.kind} · {g.file_count} files</div>
                    <button onClick={() => download(g.download_url, g.name)} className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>

      {/* What it builds */}
      <section className="border-y border-border">
        <div className="container-x py-16 md:py-24">
          <div className="overline">Capabilities</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl mt-3 tracking-tight max-w-3xl text-balance">Not a demo. Real, runnable projects.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-12">
            {[
              { Icon: Zap, t: 'Fast', b: 'From prompt to zip in under a minute. No build servers required.' },
              { Icon: Code2, t: 'Opinionated', b: 'Elegant, production-shaped code — not TODO stubs.' },
              { Icon: Package, t: 'Portable', b: 'Downloadable zip you own. Deploy anywhere.' },
              { Icon: Layers, t: 'Multi-kind', b: 'Webapps, landing pages, APIs, games, CLIs, agents.' },
              { Icon: Sparkles, t: 'AI-native', b: 'Powered by Claude Sonnet 4.6, prompt-tuned for real code.' },
              { Icon: Check, t: 'Iterable', b: 'Every generation is saved to your account. Refine and re-run.' },
            ].map(({ Icon, t, b }) => (
              <div key={t} className="card-flat p-6"><Icon className="w-5 h-5 text-primary" /><h3 className="font-display font-bold text-xl mt-4">{t}</h3><p className="text-sm text-muted-foreground mt-2">{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container-x py-20 md:py-28">
        <div className="overline">Pricing</div>
        <h2 className="font-display font-bold text-3xl md:text-5xl mt-3 tracking-tight max-w-3xl text-balance">Start free for 7 days. Cancel anytime.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-12">
          {TIERS.map(t => (
            <div key={t.slug} className={`card-flat p-8 flex flex-col ${t.accent ? 'md:scale-[1.02] md:shadow-2xl md:shadow-primary/10 md:z-10 relative' : ''}`}>
              {t.accent && <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] uppercase tracking-wider font-bold px-3 py-1">Most popular</div>}
              <div className="overline">AppForge</div>
              <h3 className="font-display font-black text-3xl mt-2 tracking-tight">{t.label}</h3>
              <div className="mt-6">
                <div className="font-display font-black text-5xl tracking-tightest">${t.price}</div>
                <div className="text-xs text-muted-foreground mt-1">/ month · 7-day free trial</div>
              </div>
              <ul className="mt-6 space-y-2 flex-1">
                {t.features.map(f => (
                  <li key={f} className="text-sm flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> <span>{f}</span></li>
                ))}
              </ul>
              <button onClick={() => buy(t.slug)} className={`mt-8 ${t.accent ? 'btn-primary' : 'btn-ghost'} w-full justify-center`} data-testid={`appforge-buy-${t.slug}`}>
                Start 7-day trial
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Payments are handled by Stripe. Prices in USD (plus tax where applicable). Cancel anytime from your account.
        </p>
      </section>
    </div>
  );
}
