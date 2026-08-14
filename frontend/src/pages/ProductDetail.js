import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, ExternalLink, Play, Check, Sparkles, ChevronLeft } from 'lucide-react';
import { api, formatApiError } from '../lib/api';
import { CATEGORY_META, STATUS_META, formatPrice } from '../lib/utils';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState(null);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setP(null); setErr(null); setJoined(false);
    api.get(`/products/${slug}`).then(r => setP(r.data)).catch(e => setErr(e?.response?.status === 404 ? '404' : 'Failed to load product'));
  }, [slug]);

  useEffect(() => {
    if (p?.name) document.title = `${p.name} · Trillion AI Tech`;
  }, [p]);

  if (err === '404') {
    return (
      <div className="container-x py-32 text-center">
        <div className="overline">404</div>
        <h1 className="font-display font-black text-5xl mt-4">Product not found</h1>
        <p className="text-muted-foreground mt-4">This product may have been renamed or retired.</p>
        <Link to="/products" className="btn-primary mt-8 inline-flex">Browse catalogue</Link>
      </div>
    );
  }
  if (err) return <div className="container-x py-24 text-muted-foreground">{err}</div>;
  if (!p) return <div className="container-x py-24"><div className="animate-pulse h-8 w-64 bg-secondary rounded" /></div>;

  const cat = CATEGORY_META[p.category];
  const st = STATUS_META[p.status] || { label: p.status };
  const price = formatPrice(p);

  const joinWaitlist = async (e) => {
    e.preventDefault();
    try {
      await api.post('/waitlist', { email, product_slug: p.slug, source: 'product_page' });
      setJoined(true);
      setEmail('');
      toast.success("You're on the list. We'll email you when it's ready.");
    } catch (er) {
      toast.error(formatApiError(er));
    }
  };

  return (
    <div>
      <div className="container-x pt-10">
        <Link to={cat?.path || '/products'} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1" data-testid="back-to-category">
          <ChevronLeft className="w-4 h-4" /> Back to {cat?.label || 'catalogue'}
        </Link>
      </div>

      {/* Hero */}
      <section className="container-x py-12 md:py-16 border-b border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 text-xs">
              <span className="overline">{cat?.label || p.category}</span>
              <span className="text-muted-foreground">/</span>
              <span className={`font-medium ${st.tone || ''}`}>{st.label}</span>
              {p.version && <><span className="text-muted-foreground">/</span><span className="font-mono text-xs text-muted-foreground">v{p.version}</span></>}
            </div>
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tightest mt-5" data-testid="product-name">{p.name}</h1>
            <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">{p.short_description}</p>

            <div className="flex flex-wrap gap-3 mt-8">
              {p.status === 'active' && p.external_url && (
                <a href={p.external_url} target="_blank" rel="noreferrer" className="btn-primary" data-testid="product-launch">
                  Launch <ArrowUpRight className="w-4 h-4" />
                </a>
              )}
              {p.demo_url && (
                <a href={p.demo_url} target="_blank" rel="noreferrer" className="btn-ghost" data-testid="product-demo">
                  <Play className="w-4 h-4" /> Live demo
                </a>
              )}
              {p.documentation_url && (
                <a href={p.documentation_url} target="_blank" rel="noreferrer" className="btn-ghost" data-testid="product-docs">
                  <ExternalLink className="w-4 h-4" /> Docs
                </a>
              )}
              {p.status !== 'coming-soon' && p.billing_type !== 'free' && !p.external_url && (
                <button className="btn-primary" disabled data-testid="product-purchase">
                  {p.billing_type === 'one-time' ? 'Buy' : 'Subscribe'} · payments coming soon
                </button>
              )}
            </div>
          </div>

          <aside className="border border-border p-6 h-fit" data-testid="product-summary">
            <div className="overline">Pricing</div>
            <div className="font-display font-bold text-3xl mt-2">{price || 'TBA'}</div>
            <div className="text-xs text-muted-foreground mt-1 capitalize">{p.billing_type} · {p.currency || 'USD'}</div>
            <div className="h-px bg-border my-5" />
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><div className="text-muted-foreground">Status</div><div className={`mt-1 ${st.tone || ''}`}>{st.label}</div></div>
              <div><div className="text-muted-foreground">Category</div><div className="mt-1">{cat?.label}</div></div>
              {p.version && <div><div className="text-muted-foreground">Version</div><div className="mt-1 font-mono">v{p.version}</div></div>}
              {p.release_date && <div><div className="text-muted-foreground">Released</div><div className="mt-1">{p.release_date}</div></div>}
            </div>
          </aside>
        </div>
      </section>

      {/* Body */}
      <section className="container-x py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          <div className="overline">About</div>
          <h2 className="font-display font-bold text-3xl mt-3 mb-6 tracking-tight">What it does</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{p.description || p.short_description}</p>

          {p.features?.length > 0 && (
            <>
              <h3 className="font-display font-bold text-2xl mt-14 mb-6 tracking-tight">Features</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {p.features.map(f => (
                  <li key={f} className="flex gap-3 border border-border p-4 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {p.tags?.length > 0 && (
            <div className="mt-14">
              <div className="overline mb-3">Tags</div>
              <div className="flex flex-wrap gap-2">
                {p.tags.map(t => <span key={t} className="text-xs px-3 py-1 border border-border rounded-full text-muted-foreground">{t}</span>)}
              </div>
            </div>
          )}
        </div>

        {p.status === 'coming-soon' && (
          <aside className="border border-border p-6 h-fit" data-testid="product-waitlist">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-xl mt-4 tracking-tight">Get notified at launch</h3>
            <p className="text-sm text-muted-foreground mt-2">One email when {p.name} is ready. No spam.</p>
            {joined ? (
              <div className="mt-5 text-sm text-primary" data-testid="waitlist-success">Added — thank you.</div>
            ) : (
              <form onSubmit={joinWaitlist} className="mt-5 space-y-3">
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" data-testid="waitlist-email" />
                <button className="btn-primary w-full justify-center" data-testid="waitlist-submit">Notify me</button>
              </form>
            )}
          </aside>
        )}
      </section>
    </div>
  );
}
