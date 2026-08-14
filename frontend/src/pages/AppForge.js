import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatApiError, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Sparkles, Download, ArrowRight, Check, Zap, Loader2, Package, Code2, Layers, Eye, Save, Wand2, FileCode2 } from 'lucide-react';
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

  const openFromHistory = async (gen_id) => {
    try {
      const { data } = await api.get(`/appforge/generations/${gen_id}`);
      setResult({ ...data, download_url: `/api/appforge/download/${gen_id}`, file_count: data.files.length });
      window.scrollTo({ top: document.getElementById('builder').offsetTop - 80, behavior: 'smooth' });
    } catch (e) { toast.error(formatApiError(e)); }
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
              AppForge is our AI-native scaffolding engine. Tell it what to build — get downloadable, runnable code in seconds. Then refine, edit and preview it right here.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-10">
              <a href="#builder" className="btn-primary" data-testid="appforge-try">Try the builder <ArrowRight className="w-4 h-4" /></a>
              <a href="#pricing" className="btn-ghost">See pricing</a>
            </div>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border max-w-3xl">
              {[['6','Project kinds'],['<60s','Time to zip'],['7 days','Free trial'],['0','Cards to try (as admin)']].map(([k, v]) => (
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

            {result && <ProjectWorkbench result={result} setResult={setResult} />}
          </div>

          <aside>
            <div className="overline">Your generations</div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">Nothing yet. Your generations will appear here.</p>
            ) : (
              <ul className="mt-4 space-y-3" data-testid="appforge-history">
                {history.slice(0, 12).map(g => (
                  <li key={g.gen_id} className="border border-border p-3 hover:border-primary transition-colors cursor-pointer" onClick={() => openFromHistory(g.gen_id)}>
                    <div className="text-sm font-semibold truncate">{g.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{g.kind} · {g.file_count} files</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(g.created_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-y border-border">
        <div className="container-x py-16 md:py-24">
          <div className="overline">Capabilities</div>
          <h2 className="font-display font-bold text-3xl md:text-5xl mt-3 tracking-tight max-w-3xl text-balance">Not a demo. Real, runnable projects.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-12">
            {[
              { Icon: Zap, t: 'Fast', b: 'From prompt to zip in under a minute. No build servers required.' },
              { Icon: Code2, t: 'Editable', b: 'Every file is inspectable and editable inside the browser.' },
              { Icon: Package, t: 'Portable', b: 'Downloadable zip you own. Deploy anywhere.' },
              { Icon: Layers, t: 'Multi-kind', b: 'Webapps, landing pages, APIs, games, CLIs, agents.' },
              { Icon: Wand2, t: 'Refinable', b: 'Ask the AI to change something — iterate as many times as you like.' },
              { Icon: Eye, t: 'Previewable', b: 'Landing pages, games, and single-file webapps render live in-browser.' },
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


/* ==================== WORKBENCH ==================== */
function ProjectWorkbench({ result, setResult }) {
  const [tab, setTab] = useState('files'); // files | preview | refine
  const [activeFile, setActiveFile] = useState(result.files?.[0]?.path || null);
  const [drafts, setDrafts] = useState({}); // path -> draft content
  const [saving, setSaving] = useState(null);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);

  const files = result.files || [];
  const active = files.find(f => f.path === activeFile);
  const draftedContent = drafts[activeFile] !== undefined ? drafts[activeFile] : (active?.content || '');
  const isDirty = active && drafts[activeFile] !== undefined && drafts[activeFile] !== active.content;

  const download = () => {
    const a = document.createElement('a');
    a.href = `${API_BASE}${result.download_url}`;
    a.download = `${result.name}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
  };

  const saveFile = async () => {
    if (!active || !isDirty) return;
    setSaving(activeFile);
    try {
      await api.put(`/appforge/generations/${result.gen_id}/files`, { path: activeFile, content: drafts[activeFile] });
      // Update result state
      setResult(r => ({
        ...r,
        files: r.files.map(f => f.path === activeFile ? { ...f, content: drafts[activeFile] } : f),
      }));
      setDrafts(d => { const c = { ...d }; delete c[activeFile]; return c; });
      toast.success('Saved');
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(null); }
  };

  const refine = async () => {
    if (refineText.trim().length < 4) { toast.error('Describe the change in at least a few words.'); return; }
    setRefining(true);
    try {
      const { data } = await api.post('/appforge/refine', { gen_id: result.gen_id, instructions: refineText.trim() });
      setResult(data);
      setActiveFile(data.files?.[0]?.path || null);
      setDrafts({});
      setRefineText('');
      setTab('files');
      toast.success(`Refined into ${data.name}`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setRefining(false); }
  };

  return (
    <div className="mt-8 border border-primary animate-fade-up" data-testid="appforge-result">
      <div className="flex items-start justify-between gap-4 flex-wrap p-6 border-b border-border">
        <div>
          <div className="overline">Generated</div>
          <h3 className="font-display font-bold text-3xl mt-2">{result.name}</h3>
          <p className="text-muted-foreground mt-2 text-sm">{result.summary}</p>
          <div className="text-xs text-muted-foreground mt-2 font-mono">{result.stack} · {result.file_count || files.length} files</div>
        </div>
        <button onClick={download} className="btn-primary" data-testid="appforge-download">
          <Download className="w-4 h-4" /> Download ZIP
        </button>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-4 py-2 overflow-x-auto">
        {[
          { key: 'files', label: 'Files', Icon: FileCode2 },
          { key: 'preview', label: 'Preview', Icon: Eye, disabled: !result.preview_available },
          { key: 'refine', label: 'Refine with AI', Icon: Wand2 },
        ].map(t => (
          <button key={t.key} onClick={() => !t.disabled && setTab(t.key)} disabled={t.disabled}
            className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition-colors ${tab === t.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'} ${t.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={t.disabled ? 'Preview unavailable for this project kind' : ''}
            data-testid={`workbench-tab-${t.key}`}>
            <t.Icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'files' && (
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[420px]">
          <ul className="border-r border-border max-h-[600px] overflow-auto" data-testid="workbench-file-list">
            {files.map(f => (
              <li key={f.path}>
                <button onClick={() => setActiveFile(f.path)}
                  className={`w-full text-left px-4 py-2 text-xs font-mono truncate border-b border-border ${activeFile === f.path ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'} ${drafts[f.path] !== undefined ? 'italic' : ''}`}
                  data-testid={`workbench-file-${f.path.replace(/[^a-z0-9]/gi, '-')}`}>
                  {f.path}{drafts[f.path] !== undefined ? ' •' : ''}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col">
            {active ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border text-xs">
                  <span className="font-mono text-muted-foreground">{active.path}</span>
                  <button onClick={saveFile} disabled={!isDirty || saving === active.path}
                    className={`text-xs px-3 py-1 rounded-full border ${isDirty ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}
                    data-testid="workbench-save">
                    <Save className="w-3 h-3 inline mr-1" />{saving === active.path ? 'Saving…' : (isDirty ? 'Save changes' : 'Saved')}
                  </button>
                </div>
                <textarea
                  value={draftedContent}
                  onChange={e => setDrafts(d => ({ ...d, [active.path]: e.target.value }))}
                  className="flex-1 min-h-[400px] w-full bg-secondary/30 border-0 p-4 font-mono text-xs text-foreground outline-none resize-none"
                  spellCheck={false}
                  data-testid="workbench-editor"
                />
              </>
            ) : (
              <div className="p-8 text-muted-foreground text-sm">Select a file to view or edit.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="p-4">
          {result.preview_available ? (
            <iframe
              key={`${result.gen_id}-${Object.keys(drafts).length}`}
              src={`${API_BASE}/api/appforge/preview/${result.gen_id}`}
              title="Preview"
              sandbox="allow-scripts allow-forms"
              className="w-full h-[600px] border border-border rounded-md bg-white"
              data-testid="workbench-preview"
            />
          ) : (
            <div className="p-8 text-muted-foreground text-sm">Live preview isn't available for this project kind. Download and run locally.</div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">Preview reflects the last saved version — save file edits above before reloading.</p>
        </div>
      )}

      {tab === 'refine' && (
        <div className="p-6">
          <div className="overline flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> Refine with AI</div>
          <p className="text-sm text-muted-foreground mt-2">Tell AppForge what to change. It will regenerate the project keeping unchanged files intact.</p>
          <textarea rows={4} maxLength={1000} value={refineText} onChange={e => setRefineText(e.target.value)}
            placeholder="e.g. Add a dark-mode toggle in the header and a settings modal to change the timer duration."
            className="w-full mt-4 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary text-sm"
            data-testid="workbench-refine-input" />
          <button onClick={refine} disabled={refining} className="btn-primary mt-3" data-testid="workbench-refine-submit">
            {refining ? <><Loader2 className="w-4 h-4 animate-spin" /> Refining…</> : <><Sparkles className="w-4 h-4" /> Refine project</>}
          </button>
          <p className="text-[10px] text-muted-foreground mt-3">Each refinement is saved as a new generation linked to the parent.</p>
        </div>
      )}

      {result.run_instructions && (
        <details className="p-4 border-t border-border">
          <summary className="text-sm cursor-pointer text-primary">Run instructions</summary>
          <pre className="text-xs mt-2 whitespace-pre-wrap text-muted-foreground">{result.run_instructions}</pre>
        </details>
      )}
    </div>
  );
}
