import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Bot, Wrench, Package, Gamepad2, Shield, Zap, Layers } from 'lucide-react';
import { api } from '../lib/api';
import { ProductGrid, ProductSkeleton } from '../components/ProductCard';

const CATS = [
  { key: 'apps', label: 'AI Apps', blurb: 'Applications shipped with intelligence built-in.', Icon: Cpu, path: '/apps' },
  { key: 'agents', label: 'AI Agents', blurb: 'Autonomous systems for complex work.', Icon: Bot, path: '/agents' },
  { key: 'tools', label: 'Tools', blurb: 'Developer-grade utilities and CLIs.', Icon: Wrench, path: '/tools' },
  { key: 'software', label: 'Software', blurb: 'Professional-grade software.', Icon: Package, path: '/software' },
  { key: 'games', label: 'Games', blurb: 'Playable systems and interactive fiction.', Icon: Gamepad2, path: '/games' },
];

export default function Home() {
  const [featured, setFeatured] = useState(null);

  useEffect(() => {
    api.get('/products', { params: { featured: true, limit: 6 } }).then(r => setFeatured(r.data)).catch(() => setFeatured([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-[0.25] mask-fade-b" aria-hidden />
        <div className="container-x pt-24 md:pt-32 pb-20 md:pb-32 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs text-muted-foreground" data-testid="hero-badge">
            <span className="badge-dot" />
            <span>In active development · Aotearoa NZ</span>
          </div>
          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tightest leading-[0.95] mt-6 max-w-5xl text-balance" data-testid="hero-title">
            Building the future<br />
            of <span className="text-primary">AI</span> & interactive<br />
            technology.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mt-8 leading-relaxed">
            An independent studio shipping AI-native applications, autonomous agents, developer tools, professional software and games — from Aotearoa New Zealand.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-10">
            <Link to="/products" className="btn-primary" data-testid="hero-cta-primary">
              Explore products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/about" className="btn-ghost" data-testid="hero-cta-secondary">Our vision</Link>
          </div>

          {/* stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 divide-x divide-border border-y border-border">
            {[
              ['10+', 'Products in catalogue'],
              ['5', 'Categories'],
              ['24/7', 'Systems monitoring'],
              ['NZ', 'Sovereign-first'],
            ].map(([k, v]) => (
              <div key={v} className="p-5 md:p-6">
                <div className="font-display font-bold text-2xl md:text-3xl tracking-tight">{k}</div>
                <div className="text-xs text-muted-foreground mt-1 tracking-wide">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-x py-20 md:py-28">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="overline mb-3">What we build</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight max-w-2xl text-balance">
              A growing catalogue across five disciplines.
            </h2>
          </div>
          <Link to="/products" className="btn-ghost" data-testid="see-all-products">See all products</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border">
          {CATS.map(({ key, label, blurb, Icon, path }) => (
            <Link key={key} to={path} className="card-flat p-6 group" data-testid={`category-tile-${key}`}>
              <Icon className="w-6 h-6 text-primary" />
              <div className="font-display font-bold text-xl mt-6">{label}</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{blurb}</p>
              <span className="text-xs mt-6 inline-flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                Browse <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-x pb-20 md:pb-28">
        <div className="flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="overline mb-3">Featured</div>
            <h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight max-w-2xl text-balance">
              Recently released & in-development.
            </h2>
          </div>
        </div>
        {featured === null ? <ProductSkeleton count={6} /> : <ProductGrid items={featured} />}
      </section>

      {/* Trust */}
      <section className="border-t border-border">
        <div className="container-x py-20 md:py-28 grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {[
            { Icon: Shield, title: 'Security first', body: 'Built on secure authentication, encrypted transit, server-side authorization and audit logging from day one.' },
            { Icon: Zap, title: 'Built for scale', body: 'A data-driven catalogue that scales from ten to a thousand products without redesigning the platform.' },
            { Icon: Layers, title: 'Made to extend', body: 'Clean extension points for payments, entitlements, developer portals, analytics and future AI systems.' },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="card-flat p-8">
              <Icon className="w-6 h-6 text-primary" />
              <h3 className="font-display font-bold text-xl mt-6 tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-24 md:py-32">
        <div className="border border-border p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="overline">Get notified</div>
            <h3 className="font-display font-bold text-3xl md:text-4xl tracking-tight mt-4 text-balance">
              New products drop regularly. Be the first to try them.
            </h3>
          </div>
          <div className="flex gap-3">
            <Link to="/coming-soon" className="btn-primary" data-testid="home-cta-coming-soon">Coming soon</Link>
            <Link to="/register" className="btn-ghost" data-testid="home-cta-signup">Create account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
